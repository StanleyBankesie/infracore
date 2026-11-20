/**
 * @file chat.routes.js
 * @description WhatsApp-like Chat Messaging routes powered by Neon PostgreSQL storage.
 * User identity, authentication, permissions, and offline notifications use MySQL.
 * All chat conversations, participants, messages, and presence are stored in Neon PostgreSQL.
 */

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { query as mysqlQuery } from "../db/pool.js";
import { neonQuery } from "../db/neonPool.js";
import {
  requireAuth,
  requireCompanyScope,
  requireBranchScope,
} from "../middleware/auth.js";
import { httpError } from "../utils/httpError.js";
import { io as ioInstance } from "../index.js";
import { isUserOnline } from "../utils/socket.js";
import { sendPushToUser } from "./push.routes.js";
import { uploadBufferToCloudinary } from "../controllers/upload.controller.js";
import { syncProjectGroupChat } from "../services/projectChat.service.js";

const router = express.Router();

// Middleware: authentication & multi-company security
router.use(requireAuth, requireCompanyScope, requireBranchScope);

// ============================================
// 👥 USERS FOR RECIPIENT SELECTION
// ============================================

/**
 * GET /users
 * Fetch available users to start a chat with, including live online presence from Neon PostgreSQL.
 */
router.get("/users", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    const q = String(req.query?.q || "").trim();
    const params = { me };
    let where = "id <> :me";
    if (q) {
      where += " AND (username LIKE :q OR full_name LIKE :q)";
      params.q = `%${q}%`;
    }

    // Retrieve active users from authoritative MySQL database
    const users =
      (await mysqlQuery(
        `
        SELECT adm_users.id, adm_users.username, adm_users.full_name,
          IF(adm_users.profile_picture IS NULL, NULL,
             IF(LEFT(adm_users.profile_picture, 4) = 'http' OR LEFT(adm_users.profile_picture, 5) = 'data:',
                CONVERT(adm_users.profile_picture USING utf8),
                CONCAT('data:image/jpeg;base64,', REPLACE(TO_BASE64(adm_users.profile_picture), '\\n', '')))) AS profile_picture_url,
          adm_users.created_at
        FROM adm_users
        WHERE ${where}
        ORDER BY adm_users.username ASC
        `,
        params,
      ).catch(() => [])) || [];

    const userIds = users.map((u) => Number(u.id)).filter((n) => Number.isFinite(n));

    // Hydrate presence records from Neon PostgreSQL
    let presenceMap = new Map();
    if (userIds.length > 0) {
      try {
        const presRows = await neonQuery(
          `SELECT user_id, is_online, last_seen FROM chat_presence WHERE user_id = ANY($1::bigint[])`,
          [userIds],
        );
        presenceMap = new Map(presRows.map((r) => [Number(r.user_id), r]));
      } catch (e) {
        console.warn("[Chat:Neon] Could not fetch presence:", e.message);
      }
    }

    res.json({
      items: users.map((u) => {
        const pr = presenceMap.get(Number(u.id));
        return {
          id: u.id,
          username: u.username,
          full_name: u.full_name,
          is_online: pr ? Boolean(pr.is_online) : false,
          last_seen: pr?.last_seen || null,
          profile_picture_url: u.profile_picture_url || null,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

// ============================================
// 💬 CONVERSATION & GROUP MANAGEMENT (NEON POSTGRESQL)
// ============================================

let chatGroupSchemaEnsured = false;
async function ensureChatGroupSchema() {
  if (chatGroupSchemaEnsured) return;
  try {
    await neonQuery(`
      ALTER TABLE chat_conversations 
      ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS project_id BIGINT NULL,
      ADD COLUMN IF NOT EXISTS description TEXT NULL,
      ADD COLUMN IF NOT EXISTS avatar_url TEXT NULL;
    `);
    await neonQuery(`
      ALTER TABLE chat_conversation_participants 
      ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'member';
    `);
    chatGroupSchemaEnsured = true;
  } catch (err) {
    console.warn("[Chat:Neon] Failed to ensure group schema:", err.message);
  }
}

/**
 * GET /projects
 * Fetch active company projects for group chat association.
 */
router.get("/projects", async (req, res, next) => {
  try {
    const companyId = Number(req.scope.companyId);
    const projects = await mysqlQuery(
      `SELECT id, project_name, project_code, status 
       FROM pm_projects 
       WHERE (company_id = :companyId OR :companyId IS NULL)
       ORDER BY project_name ASC`,
      { companyId }
    );
    res.json({ items: projects || [] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /conversations
 * Fetch a list of active conversations (direct & group) for the current user within their company scope.
 * Access Control: Strictly queries conversations where user is a participant.
 * "you cant see the group if you are not added".
 */
router.get("/conversations", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    const companyId = Number(req.scope?.companyId || req.user?.company_id || 1) || 1;

    // Fast-path: query MySQL immediately for sub-millisecond response
    const mysqlRows = await mysqlQuery(
      `SELECT c.id, c.title, c.is_group, c.project_id, c.description, c.avatar_url, c.created_by,
              COALESCE(cp.role, 'member') AS my_role,
              (SELECT COUNT(*) FROM chat_conversation_participants p_cnt WHERE p_cnt.conversation_id = c.id) AS member_count,
              (SELECT m.content FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_preview,
              (SELECT m.sent_at FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_time,
              p_proj.project_name, p_proj.project_code
       FROM chat_conversations c
       JOIN chat_conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = :me
       LEFT JOIN pm_projects p_proj ON p_proj.id = c.project_id
       WHERE (c.company_id = :companyId OR c.company_id IS NULL OR :companyId = 1)
       ORDER BY (CASE WHEN (SELECT m.sent_at FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) IS NULL THEN 1 ELSE 0 END),
                (SELECT m.sent_at FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) DESC,
                c.id DESC`,
      { me, companyId }
    ).catch(() => []);

    const items = (mysqlRows || []).map((r) => ({
      id: Number(r.id),
      title: r.title || (r.project_name ? r.project_name : `Chat #${r.id}`),
      is_group: Boolean(r.is_group),
      project_id: r.project_id ? Number(r.project_id) : null,
      project_name: r.project_name || null,
      project_code: r.project_code || null,
      description: r.description || null,
      avatar_url: r.avatar_url || null,
      created_by: Number(r.created_by),
      member_count: Number(r.member_count || 1),
      my_role: r.my_role || "member",
      last_preview: r.last_preview || null,
      last_time: r.last_time || null,
      unread_count: 0,
      otherUser: null,
    }));

    return res.json({ items });
  } catch (err) {
    console.error("[Chat:Conversations Error]", err.message);
    res.json({ items: [] });
  }
});

/**
 * POST /conversations/direct
 * Create or retrieve an existing direct conversation with another user in the company.
 */
router.post("/conversations/direct", async (req, res, next) => {
  try {
    await ensureChatGroupSchema();
    const me = Number(req.user?.sub || req.user?.id);
    const companyId = Number(req.scope.companyId);
    const otherId = Number(req.body?.user_id);

    if (!Number.isFinite(otherId) || otherId <= 0) {
      throw httpError(400, "VALIDATION_ERROR", "Invalid user_id");
    }

    // Reuse existing direct conversation if one already exists in Neon PostgreSQL
    const existing = await neonQuery(
      `
      SELECT c.id
      FROM chat_conversations c
      JOIN chat_conversation_participants p1 ON p1.conversation_id = c.id AND p1.user_id = $1
      JOIN chat_conversation_participants p2 ON p2.conversation_id = c.id AND p2.user_id = $2
      WHERE c.company_id = $3 AND c.is_group = FALSE
      LIMIT 1
      `,
      [me, otherId, companyId],
    );

    if (existing && existing.length > 0) {
      return res.json({ id: existing[0].id });
    }

    // Insert new conversation in Neon PostgreSQL
    const convRows = await neonQuery(
      `
      INSERT INTO chat_conversations (company_id, title, is_group, created_by, created_at)
      VALUES ($1, NULL, FALSE, $2, NOW())
      RETURNING id
      `,
      [companyId, me],
    );

    const cid = convRows[0]?.id;

    // Insert both participants
    await neonQuery(
      `
      INSERT INTO chat_conversation_participants (conversation_id, user_id, role, joined_at, created_by)
      VALUES ($1, $2, 'member', NOW(), $4), ($1, $3, 'member', NOW(), $4)
      ON CONFLICT (conversation_id, user_id) DO NOTHING
      `,
      [cid, me, otherId, me],
    );

    res.status(201).json({ id: cid });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /groups
 * Create a new WhatsApp-style project group chat with invited members.
 * Strictly grants access only to added participants.
 */
router.post("/groups", async (req, res, next) => {
  try {
    await ensureChatGroupSchema();
    const me = Number(req.user?.sub || req.user?.id);
    const companyId = Number(req.scope.companyId);
    const {
      title,
      project_id = null,
      member_ids = [],
      description = null,
      avatar_url = null,
    } = req.body || {};

    const cleanTitle = String(title || "").trim();
    if (!cleanTitle) {
      throw httpError(400, "VALIDATION_ERROR", "Group title is required");
    }

    const projId = Number.isFinite(Number(project_id)) && Number(project_id) > 0 ? Number(project_id) : null;

    // Insert group conversation in Neon PostgreSQL
    const convRows = await neonQuery(
      `
      INSERT INTO chat_conversations (company_id, title, is_group, project_id, description, avatar_url, created_by, created_at)
      VALUES ($1, $2, TRUE, $3, $4, $5, $6, NOW())
      RETURNING id, created_at
      `,
      [companyId, cleanTitle, projId, description ? String(description).trim() : null, avatar_url || null, me]
    );

    const cid = Number(convRows[0]?.id);

    // Insert creator as 'owner'
    await neonQuery(
      `
      INSERT INTO chat_conversation_participants (conversation_id, user_id, role, joined_at, created_by)
      VALUES ($1, $2, 'owner', NOW(), $2)
      ON CONFLICT (conversation_id, user_id) DO UPDATE SET role = 'owner'
      `,
      [cid, me]
    );

    // Insert selected members
    const cleanMemberIds = Array.from(
      new Set(
        (Array.isArray(member_ids) ? member_ids : [])
          .map(Number)
          .filter((n) => Number.isFinite(n) && n > 0 && n !== me)
      )
    );

    for (const uid of cleanMemberIds) {
      await neonQuery(
        `
        INSERT INTO chat_conversation_participants (conversation_id, user_id, role, joined_at, created_by)
        VALUES ($1, $2, 'member', NOW(), $3)
        ON CONFLICT (conversation_id, user_id) DO NOTHING
        `,
        [cid, uid, me]
      );
    }

    // Resolve creator name and project name for system welcome message
    const creatorUser = await mysqlQuery(
      `SELECT full_name, username FROM adm_users WHERE id = :id LIMIT 1`,
      { id: me }
    ).catch(() => []);
    const creatorName = creatorUser?.[0]?.full_name || creatorUser?.[0]?.username || "User";

    let projName = "";
    let projCode = "";
    if (projId) {
      const proj = await mysqlQuery(
        `SELECT project_name, project_code FROM pm_projects WHERE id = :id LIMIT 1`,
        { id: projId }
      ).catch(() => []);
      projName = proj?.[0]?.project_name || "";
      projCode = proj?.[0]?.project_code || "";
    }

    const welcomeText = `${creatorName} created group "${cleanTitle}"${projName ? ` for project: ${projName}` : ""}`;

    const msgRows = await neonQuery(
      `
      INSERT INTO chat_messages (conversation_id, sender_id, receiver_id, message_type, content, status, sent_at, created_by)
      VALUES ($1, $2, NULL, 'text', $3, 'sent', NOW(), $2)
      RETURNING id, sent_at
      `,
      [cid, me, welcomeText]
    );

    const allMembers = [me, ...cleanMemberIds];
    const io = ioInstance;
    if (io) {
      const newGroupPayload = {
        id: cid,
        title: cleanTitle,
        is_group: true,
        project_id: projId,
        project_name: projName || null,
        project_code: projCode || null,
        description,
        avatar_url,
        member_count: allMembers.length,
        created_by: me,
        last_preview: welcomeText,
        last_time: msgRows[0]?.sent_at || new Date().toISOString(),
        unread_count: 0,
      };

      for (const uid of allMembers) {
        io.to(`user_${uid}`).emit("group_created", newGroupPayload);
        io.to(`user_${uid}`).emit("receive_message", {
          id: msgRows[0]?.id,
          conversation_id: cid,
          sender_id: me,
          sender_name: creatorName,
          content: welcomeText,
          message_type: "text",
          sent_at: msgRows[0]?.sent_at,
        });
      }
    }

    res.status(201).json({ id: cid, title: cleanTitle });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /project-task-update
 * Automatically post comments, notes, or delay logs from Task Execution page
 * to the project group chat. Automatically creates or joins the project group chat if needed.
 */
router.post("/project-task-update", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    const companyId = Number(req.scope?.companyId || 1);
    const {
      project_id,
      task_id = null,
      task_title = "",
      category = "CHECKLIST_COMMENT", // "CHECKLIST_COMMENT" | "TASK_NOTE" | "DELAY_LOG"
      item_number = null,
      item_text = "",
      content = "",
    } = req.body || {};

    const projId = Number(project_id);
    if (!Number.isFinite(projId) || projId <= 0) {
      throw httpError(400, "VALIDATION_ERROR", "Valid project_id is required");
    }

    const cleanContent = String(content || "").trim();
    if (!cleanContent) {
      return res.json({ ok: false, message: "Empty content, not posted" });
    }

    // 1. Fetch sender profile details from MySQL
    const senderRows = await mysqlQuery(
      `SELECT id, username, full_name,
         IF(profile_picture IS NULL, NULL,
            IF(LEFT(profile_picture, 4) = 'http' OR LEFT(profile_picture, 5) = 'data:',
               CONVERT(profile_picture USING utf8),
               CONCAT('data:image/jpeg;base64,', REPLACE(TO_BASE64(profile_picture), '\\n', '')))) AS profile_picture_url
       FROM adm_users
       WHERE id = :id LIMIT 1`,
      { id: me }
    ).catch(() => []);
    const sender = senderRows?.[0] || {};
    const senderName = sender.full_name || sender.username || "User";

    // 2. Fetch project details from MySQL
    const projRows = await mysqlQuery(
      `SELECT id, project_name, project_code FROM pm_projects WHERE id = :id LIMIT 1`,
      { id: projId }
    ).catch(() => []);
    const project = projRows?.[0] || {};
    const projectName = project.project_name || `Project #${projId}`;

    // 3. Find or sync group chat for this project in MySQL & ensure participants
    const syncRes = await syncProjectGroupChat(projId, { currentUserId: me, io });
    const cid = Number(syncRes?.conversationId);
    if (!cid) {
      throw httpError(500, "GROUP_SYNC_FAILED", "Failed to resolve or create project group chat");
    }

    // Ensure the sender is also a participant in the conversation
    await mysqlQuery(
      `INSERT IGNORE INTO chat_conversation_participants (conversation_id, user_id, role, joined_at, created_by) VALUES (:cid, :me, 'member', NOW(), :me)`,
      { cid, me }
    ).catch(() => {});

    // 4. Format message with clear caption/subject
    let caption = "";
    let formattedMessage = "";
    const taskPrefix = task_title ? `Task: ${task_title}` : "Task Execution";

    if (category === "CHECKLIST_COMMENT") {
      caption = `📌 [CHECKLIST COMMENT] ${taskPrefix}`;
      formattedMessage = `${caption}
${item_text ? `Deliverable Item #${item_number || 1}: ${item_text}
` : ""}Comment:
${cleanContent}`;
    } else if (category === "TASK_NOTE") {
      caption = `📝 [TASK NOTE] ${taskPrefix}`;
      formattedMessage = `${caption}
Note:
${cleanContent}`;
    } else if (category === "DELAY_LOG") {
      caption = `⚠️ [DELAY & OBSTACLE LOG] ${taskPrefix}`;
      formattedMessage = `${caption}
Obstacle / Reason for Delay:
${cleanContent}`;
    } else {
      caption = `💬 [TASK UPDATE] ${taskPrefix}`;
      formattedMessage = `${caption}
${cleanContent}`;
    }

    // 5. Insert message into MySQL
    const msgRes = await mysqlQuery(
      `INSERT INTO chat_messages (conversation_id, sender_id, receiver_id, message_type, content, status, sent_at, created_by)
       VALUES (:cid, :me, NULL, 'text', :formattedMessage, 'sent', NOW(), :me)`,
      { cid, me, formattedMessage }
    );
    const mid = Number(msgRes?.insertId || Date.now());
    const sentAt = new Date().toISOString();

    // 6. Broadcast real-time Socket.IO notification
    const io = ioInstance;
    if (io) {
      const msgPayload = {
        id: mid,
        conversation_id: cid,
        sender_id: me,
        sender_name: senderName,
        sender_picture: sender.profile_picture_url || null,
        content: formattedMessage,
        message_type: "text",
        status: "sent",
        sent_at: sentAt,
      };

      io.to(`conv_${cid}`).emit("receive_message", msgPayload);

      // Fetch participants for notification
      const participants = await mysqlQuery(
        `SELECT user_id FROM chat_conversation_participants WHERE conversation_id = :cid`,
        { cid }
      ).catch(() => []);

      for (const p of participants || []) {
        const uid = Number(p.user_id);
        if (isNewlyCreated) {
          io.to(`user_${uid}`).emit("group_created", {
            id: cid,
            title: `${projectName} Group`,
            is_group: true,
            project_id: projId,
            project_name: projectName,
            last_preview: formattedMessage.substring(0, 80),
            last_time: sentAt,
            unread_count: uid === me ? 0 : 1,
          });
        }
        if (uid !== me) {
          io.to(`user_${uid}`).emit("new_message_notification", {
            conversation_id: cid,
            sender_name: senderName,
            preview: formattedMessage.substring(0, 80),
          });
        }
      }
    }

    // 7. Also attempt Neon asynchronously in background if available
    (async () => {
      try {
        await ensureChatGroupSchema();
        let convRows = await neonQuery(
          `SELECT id FROM chat_conversations WHERE project_id = $1 AND is_group = TRUE LIMIT 1`,
          [projId]
        );
        let neonCid = convRows?.[0]?.id;
        if (!neonCid) {
          const newConv = await neonQuery(
            `INSERT INTO chat_conversations (company_id, title, is_group, project_id, description, created_by, created_at)
             VALUES ($1, $2, TRUE, $3, $4, $5, NOW()) RETURNING id`,
            [companyId, `${projectName} Group`, projId, `Group for ${projectName}`, me]
          );
          neonCid = newConv?.[0]?.id;
        }
        if (neonCid) {
          await neonQuery(
            `INSERT INTO chat_conversation_participants (conversation_id, user_id, role, joined_at, created_by)
             VALUES ($1, $2, 'member', NOW(), $2) ON CONFLICT DO NOTHING`,
            [neonCid, me]
          );
          await neonQuery(
            `INSERT INTO chat_messages (conversation_id, sender_id, receiver_id, message_type, content, status, sent_at, created_by)
             VALUES ($1, $2, NULL, 'text', $3, 'sent', NOW(), $2)`,
            [neonCid, me, formattedMessage]
          );
        }
      } catch {}
    })();

    res.status(201).json({
      ok: true,
      conversation_id: cid,
      message_id: mid,
      sender_name: senderName,
      caption,
      content: formattedMessage,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /groups/:id/members
 * List participants of a group conversation with roles and online presence.
 */
router.get("/groups/:id/members", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    const cid = Number(req.params.id);

    // Verify caller is a member (Check MySQL first, fallback to Neon)
    let isPart = await mysqlQuery(
      `SELECT role FROM chat_conversation_participants WHERE conversation_id = :cid AND user_id = :me LIMIT 1`,
      { cid, me }
    ).catch(() => []);

    if (!isPart || isPart.length === 0) {
      isPart = await neonQuery(
        `SELECT role FROM chat_conversation_participants WHERE conversation_id = $1 AND user_id = $2 LIMIT 1`,
        [cid, me]
      ).catch(() => []);
    }

    if (!isPart || isPart.length === 0) {
      throw httpError(403, "FORBIDDEN", "You are not a member of this group");
    }

    let participants = await mysqlQuery(
      `SELECT user_id, role, joined_at 
       FROM chat_conversation_participants 
       WHERE conversation_id = :cid 
       ORDER BY (CASE WHEN role = 'owner' THEN 1 WHEN role = 'admin' THEN 2 ELSE 3 END), joined_at ASC`,
      { cid }
    ).catch(() => []);

    if (!participants || participants.length === 0) {
      participants = await neonQuery(
        `SELECT user_id, role, joined_at 
         FROM chat_conversation_participants 
         WHERE conversation_id = $1 
         ORDER BY (CASE WHEN role = 'owner' THEN 1 WHEN role = 'admin' THEN 2 ELSE 3 END), joined_at ASC`,
        [cid]
      ).catch(() => []);
    }

    const userIds = (participants || []).map((p) => Number(p.user_id)).filter((n) => Number.isFinite(n));

    let userMap = new Map();
    if (userIds.length > 0) {
      const users = await mysqlQuery(
        `SELECT id, username, full_name,
           IF(profile_picture IS NULL, NULL,
              IF(LEFT(profile_picture, 4) = 'http' OR LEFT(profile_picture, 5) = 'data:',
                 CONVERT(profile_picture USING utf8),
                 CONCAT('data:image/jpeg;base64,', REPLACE(TO_BASE64(profile_picture), '\\n', '')))) AS profile_picture_url
         FROM adm_users
         WHERE id IN (${userIds.map(() => "?").join(",")})`,
        userIds
      ).catch(() => []);
      userMap = new Map((users || []).map((u) => [Number(u.id), u]));
    }

    // Hydrate presence
    let presenceMap = new Map();
    if (userIds.length > 0) {
      try {
        const presRows = await neonQuery(
          `SELECT user_id, is_online, last_seen FROM chat_presence WHERE user_id = ANY($1::bigint[])`,
          [userIds]
        );
        presenceMap = new Map((presRows || []).map((r) => [Number(r.user_id), r]));
      } catch {}
    }

    const members = (participants || []).map((p) => {
      const u = userMap.get(Number(p.user_id)) || {};
      const pr = presenceMap.get(Number(p.user_id));
      return {
        id: Number(p.user_id),
        username: u.username || `User #${p.user_id}`,
        full_name: u.full_name || u.username || `User #${p.user_id}`,
        profile_picture_url: u.profile_picture_url || null,
        role: p.role || "member",
        joined_at: p.joined_at,
        is_online: pr ? Boolean(pr.is_online) : false,
        last_seen: pr?.last_seen || null,
      };
    });

    res.json({ items: members });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /groups/:id/members
 * Add new members to an existing project group chat.
 */
router.post("/groups/:id/members", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    const cid = Number(req.params.id);
    const { user_ids = [] } = req.body || {};

    const isPart = await neonQuery(
      `SELECT role FROM chat_conversation_participants WHERE conversation_id = $1 AND user_id = $2 LIMIT 1`,
      [cid, me]
    );
    if (!isPart || isPart.length === 0) {
      throw httpError(403, "FORBIDDEN", "You are not a member of this group");
    }

    const cleanUserIds = Array.from(
      new Set(
        (Array.isArray(user_ids) ? user_ids : [])
          .map(Number)
          .filter((n) => Number.isFinite(n) && n > 0)
      )
    );

    if (cleanUserIds.length === 0) {
      throw httpError(400, "VALIDATION_ERROR", "No valid user_ids provided");
    }

    for (const uid of cleanUserIds) {
      await neonQuery(
        `
        INSERT INTO chat_conversation_participants (conversation_id, user_id, role, joined_at, created_by)
        VALUES ($1, $2, 'member', NOW(), $3)
        ON CONFLICT (conversation_id, user_id) DO NOTHING
        `,
        [cid, uid, me]
      );
    }

    // System message
    const actorUser = await mysqlQuery(
      `SELECT full_name, username FROM adm_users WHERE id = :id LIMIT 1`,
      { id: me }
    ).catch(() => []);
    const actorName = actorUser?.[0]?.full_name || actorUser?.[0]?.username || "A member";

    const addedUsers = await mysqlQuery(
      `SELECT full_name, username FROM adm_users WHERE id IN (${cleanUserIds.map(() => "?").join(",")})`,
      cleanUserIds
    ).catch(() => []);
    const addedNames = (addedUsers || []).map((u) => u.full_name || u.username).join(", ");

    const sysText = `${actorName} added ${addedNames || `${cleanUserIds.length} members`} to the group`;
    const insRows = await neonQuery(
      `
      INSERT INTO chat_messages (conversation_id, sender_id, receiver_id, message_type, content, status, sent_at, created_by)
      VALUES ($1, $2, NULL, 'text', $3, 'sent', NOW(), $2)
      RETURNING id, sent_at
      `,
      [cid, me, sysText]
    );

    const io = ioInstance;
    if (io) {
      io.to(`conv_${cid}`).emit("receive_message", {
        id: insRows[0]?.id,
        conversation_id: cid,
        sender_id: me,
        sender_name: actorName,
        content: sysText,
        message_type: "text",
        sent_at: insRows[0]?.sent_at,
      });
      io.to(`conv_${cid}`).emit("group_members_updated", { conversation_id: cid });
      for (const uid of cleanUserIds) {
        io.to(`user_${uid}`).emit("group_members_updated", { conversation_id: cid });
      }
    }

    res.json({ ok: true, added_count: cleanUserIds.length });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /groups/:id/members/:userId
 * Leave a group or remove a member.
 */
router.delete("/groups/:id/members/:userId", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    const cid = Number(req.params.id);
    const targetUserId = Number(req.params.userId);

    const isPart = await neonQuery(
      `SELECT role FROM chat_conversation_participants WHERE conversation_id = $1 AND user_id = $2 LIMIT 1`,
      [cid, me]
    );
    if (!isPart || isPart.length === 0) {
      throw httpError(403, "FORBIDDEN", "You are not a member of this group");
    }

    const myRole = isPart[0]?.role || "member";
    const isSelf = targetUserId === me;

    if (!isSelf && myRole !== "owner" && myRole !== "admin") {
      throw httpError(403, "FORBIDDEN", "Only group admins can remove other members");
    }

    await neonQuery(
      `DELETE FROM chat_conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [cid, targetUserId]
    );

    // System message
    const actorUser = await mysqlQuery(
      `SELECT full_name, username FROM adm_users WHERE id = :id LIMIT 1`,
      { id: me }
    ).catch(() => []);
    const actorName = actorUser?.[0]?.full_name || actorUser?.[0]?.username || "A member";

    let targetName = "A member";
    if (!isSelf) {
      const tgt = await mysqlQuery(
        `SELECT full_name, username FROM adm_users WHERE id = :id LIMIT 1`,
        { id: targetUserId }
      ).catch(() => []);
      targetName = tgt?.[0]?.full_name || tgt?.[0]?.username || `User #${targetUserId}`;
    }

    const sysText = isSelf ? `${actorName} left the group` : `${targetName} was removed from the group by ${actorName}`;

    await neonQuery(
      `
      INSERT INTO chat_messages (conversation_id, sender_id, receiver_id, message_type, content, status, sent_at, created_by)
      VALUES ($1, $2, NULL, 'text', $3, 'sent', NOW(), $2)
      `,
      [cid, me, sysText]
    );

    const io = ioInstance;
    if (io) {
      io.to(`conv_${cid}`).emit("receive_message", {
        conversation_id: cid,
        sender_id: me,
        content: sysText,
        message_type: "text",
      });
      io.to(`conv_${cid}`).emit("group_members_updated", { conversation_id: cid });
      io.to(`user_${targetUserId}`).emit("group_left", { conversation_id: cid });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ============================================
// 📩 MESSAGE MANAGEMENT (NEON POSTGRESQL)
// ============================================

/**
 * GET /conversations/:id/messages
 * Fetch all messages within a specific conversation from Neon PostgreSQL,
 * hydrated with sender display name, username, and profile picture for group chat.
 */
router.get("/conversations/:id/messages", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      throw httpError(400, "VALIDATION_ERROR", "Invalid id");
    }

    const mysqlRows = await mysqlQuery(
      `SELECT m.id, m.conversation_id, m.sender_id, m.receiver_id, m.message_type,
              m.content, m.file_name, m.file_size, m.status, m.sent_at, m.created_by,
              u.full_name AS sender_name, u.username AS sender_username,
              IF(u.profile_picture IS NULL, NULL,
                 IF(LEFT(u.profile_picture, 4) = 'http' OR LEFT(u.profile_picture, 5) = 'data:',
                    CONVERT(u.profile_picture USING utf8),
                    CONCAT('data:image/jpeg;base64,', REPLACE(TO_BASE64(u.profile_picture), '\\n', '')))) AS profile_picture_url
       FROM chat_messages m
       LEFT JOIN adm_users u ON u.id = m.sender_id
       WHERE m.conversation_id = :id
       ORDER BY m.id ASC`,
      { id }
    ).catch(() => []);

    const items = (mysqlRows || []).map((m) => ({
      ...m,
      id: Number(m.id),
      conversation_id: Number(m.conversation_id),
      sender_id: Number(m.sender_id),
      sender_name: m.sender_name || m.sender_username || `User #${m.sender_id}`,
      sender_username: m.sender_username || "",
      sender_avatar: m.profile_picture_url || null,
    }));

    res.json({ items });
  } catch (err) {
    console.warn("[Chat:Messages Error]", err.message);
    res.json({ items: [] });
  }
});

/**
 * POST /messages
 * Send a text or media message to a conversation. Persists permanently to Neon PostgreSQL
 * before emitting real-time WebSocket events or dispatching push notifications.
 */
router.post("/messages", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    const {
      conversation_id,
      content,
      message_type = "text",
      file_name = null,
      file_size = null,
    } = req.body || {};

    const cid = Number(conversation_id);
    const type = String(message_type || "text").toLowerCase();
    const isMedia = type !== "text";

    if (!Number.isFinite(cid)) {
      throw httpError(400, "VALIDATION_ERROR", "Invalid conversation_id");
    }
    if (!isMedia && !String(content || "").trim()) {
      throw httpError(400, "VALIDATION_ERROR", "content required for text");
    }

    // Verify participation in Neon PostgreSQL
    const auth = await neonQuery(
      `SELECT 1 FROM chat_conversation_participants WHERE conversation_id = $1 AND user_id = $2 LIMIT 1`,
      [cid, me],
    );
    if (!auth || auth.length === 0) {
      throw httpError(403, "FORBIDDEN", "Not a participant");
    }

    // Resolve receiver for direct chat from Neon PostgreSQL
    const others = await neonQuery(
      `SELECT user_id FROM chat_conversation_participants WHERE conversation_id = $1 AND user_id <> $2 LIMIT 2`,
      [cid, me],
    );
    const receiverId = Number(others?.[0]?.user_id || 0) || null;

    // Fetch sender profile details from MySQL
    const senderRows = await mysqlQuery(
      `SELECT id, username, full_name,
         IF(profile_picture IS NULL, NULL,
            IF(LEFT(profile_picture, 4) = 'http' OR LEFT(profile_picture, 5) = 'data:',
               CONVERT(profile_picture USING utf8),
               CONCAT('data:image/jpeg;base64,', REPLACE(TO_BASE64(profile_picture), '\\n', '')))) AS profile_picture_url
       FROM adm_users
       WHERE id = :id LIMIT 1`,
      { id: me },
    ).catch(() => []);
    const sender = senderRows?.[0] || {};
    const senderName = sender.full_name || sender.username || "User";

    // Permanently persist message to Neon PostgreSQL
    const insRows = await neonQuery(
      `
      INSERT INTO chat_messages (conversation_id, sender_id, receiver_id, message_type, content, file_name, file_size, status, sent_at, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'sent', NOW(), $8)
      RETURNING id, sent_at
      `,
      [
        cid,
        me,
        receiverId,
        type,
        isMedia ? String(content || "") : String(content).trim(),
        file_name || null,
        file_size == null ? null : Number(file_size),
        me,
      ],
    );

    const mid = insRows[0]?.id;
    const sentAt = insRows[0]?.sent_at || new Date().toISOString();

    // Check delivery status & fetch other participants
    const participants = await neonQuery(
      `SELECT user_id FROM chat_conversation_participants WHERE conversation_id = $1 AND user_id <> $2`,
      [cid, me],
    );
    const otherIds = (participants || []).map((r) => Number(r.user_id)).filter((n) => Number.isFinite(n));

    // Broadcast message via Socket.IO with sender details
    const io = ioInstance;
    if (io) {
      const msgPayload = {
        id: mid,
        conversation_id: cid,
        sender_id: me,
        sender_name: senderName,
        sender_username: sender.username || "",
        sender_avatar: sender.profile_picture_url || null,
        receiver_id: receiverId,
        message_type: type,
        content: String(content || ""),
        file_name: file_name || null,
        file_size: file_size == null ? null : Number(file_size),
        status: "sent",
        sent_at: sentAt,
      };
      // Emit to active conversation room
      io.to(`conv_${cid}`).emit("receive_message", msgPayload);
      // Also emit directly to recipient user room(s) and sender user room
      for (const uid of otherIds) {
        io.to(`user_${uid}`).emit("receive_message", msgPayload);
      }
      io.to(`user_${me}`).emit("receive_message", msgPayload);
    }

    let delivered = false;
    if (receiverId && isUserOnline && (await isUserOnline(receiverId))) {
      await neonQuery(
        `UPDATE chat_messages SET status = 'delivered', delivered_at = NOW() WHERE id = $1`,
        [mid],
      );
      delivered = true;
      if (io) {
        io.to(`conv_${cid}`).emit("message_delivered", { message_id: mid });
      }
    }

    // If offline, queue notification in MySQL adm_notifications and send push
    if (!delivered) {
      const senderRows = await mysqlQuery(
        `SELECT full_name AS name, username FROM adm_users WHERE id = :id LIMIT 1`,
        { id: me },
      ).catch(() => []);
      const title = senderRows?.[0]?.name || senderRows?.[0]?.username || "New message";
      const preview = String(content || "").slice(0, 140);

      for (const uid of otherIds) {
        try {
          await mysqlQuery(
            `
            INSERT INTO adm_notifications (company_id, user_id, title, message, link, is_read)
            VALUES (:companyId, :userId, :title, :message, :link, 0)
            `,
            {
              companyId: req.scope.companyId,
              userId: uid,
              title: `${title}`,
              message: preview,
              link: `/chat?cid=${cid}`,
            },
          ).catch(() => null);

          await sendPushToUser(uid, {
            title: `${title}`,
            body: preview || "New message",
            icon: "/logo.png",
            badge: "/badge.png",
            tag: "chat-message",
            data: { url: `/chat?cid=${cid}`, type: "chat", cid },
          });
        } catch {}
      }
    }

    res.status(201).json({ id: mid, sent_at: sentAt });
  } catch (err) {
    next(err);
  }
});

// ============================================
// 📦 MESSAGE STATUS UPDATES (DELIVERED & READ)
// ============================================

/**
 * POST /messages/:id/delivered
 * Mark a specific message as delivered in Neon PostgreSQL.
 */
router.post("/messages/:id/delivered", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw httpError(400, "VALIDATION_ERROR");

    await neonQuery(
      `UPDATE chat_messages SET status = 'delivered', delivered_at = NOW() WHERE id = $1 AND status = 'sent'`,
      [id],
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /conversations/:id/read
 * Mark all unread messages in a conversation as read up to the latest message.
 */
router.post("/conversations/:id/read", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw httpError(400, "VALIDATION_ERROR");

    // Fast-path: Update read status in authoritative MySQL immediately
    let lastId = null;
    const mRows = await mysqlQuery(
      `SELECT id FROM chat_messages WHERE conversation_id = :id ORDER BY id DESC LIMIT 1`,
      { id }
    ).catch(() => []);
    lastId = Number(mRows?.[0]?.id || 0) || null;

    if (lastId) {
      await mysqlQuery(
        `UPDATE chat_conversation_participants SET last_read_message_id = :lastId WHERE conversation_id = :id AND user_id = :me`,
        { lastId, id, me }
      ).catch(() => {});

      await mysqlQuery(
        `UPDATE chat_messages 
         SET status = 'read', read_at = NOW() 
         WHERE conversation_id = :id 
           AND id <= :lastId 
           AND (receiver_id = :me OR receiver_id IS NULL) 
           AND status <> 'read'`,
        { id, lastId, me }
      ).catch(() => {});

      const io = ioInstance;
      if (io) {
        io.to(`conv_${id}`).emit("message_read", {
          conversation_id: id,
          user_id: me,
          last_read_id: lastId,
        });
      }
    }

    // Non-blocking Neon PostgreSQL background sync
    (async () => {
      try {
        let neonLastId = lastId;
        if (!neonLastId) {
          const rows = await neonQuery(
            `SELECT id FROM chat_messages WHERE conversation_id = $1 ORDER BY id DESC LIMIT 1`,
            [id]
          ).catch(() => []);
          neonLastId = Number(rows?.[0]?.id || 0) || null;
        }
        if (neonLastId) {
          await neonQuery(
            `UPDATE chat_conversation_participants SET last_read_message_id = $1 WHERE conversation_id = $2 AND user_id = $3`,
            [neonLastId, id, me]
          ).catch(() => {});

          await neonQuery(
            `UPDATE chat_messages 
             SET status = 'read', read_at = NOW() 
             WHERE conversation_id = $1 
               AND id <= $2 
               AND (receiver_id = $3 OR receiver_id IS NULL)
               AND status <> 'read'`,
            [id, neonLastId, me]
          ).catch(() => {});
        }
      } catch {}
    })();

    res.json({ ok: true, last_read_id: lastId });
  } catch (err) {
    next(err);
  }
});

// ============================================
// 📊 UNREAD COUNTS (NEON POSTGRESQL)
// ============================================

/**
 * GET /unread-count
 * Get total aggregate unread message count for current user across all conversations.
 */
router.get("/unread-count", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);

    const rows = await neonQuery(
      `
      SELECT COALESCE(SUM(unread), 0)::int AS total FROM (
        SELECT COUNT(*) AS unread
        FROM chat_conversations c
        JOIN chat_conversation_participants p
          ON p.conversation_id = c.id AND p.user_id = $1
        JOIN chat_messages m
          ON m.conversation_id = c.id
        WHERE m.id > COALESCE(p.last_read_message_id, 0)
          AND m.sender_id <> $1
      ) t
      `,
      [me],
    );

    res.json({ unread: Number(rows?.[0]?.total || 0) });
  } catch (err) {
    console.warn("[Chat:Neon] Could not fetch unread count:", err.message);
    res.json({ unread: 0 });
  }
});

/**
 * GET /unread-by-user
 * Get unread message breakdown grouped by sender user id from Neon PostgreSQL.
 */
router.get("/unread-by-user", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);

    const rows = await neonQuery(
      `
      SELECT m.sender_id AS user_id, COUNT(*)::int AS unread
      FROM chat_conversations c
      JOIN chat_conversation_participants p
        ON p.conversation_id = c.id AND p.user_id = $1
      JOIN chat_messages m
        ON m.conversation_id = c.id
      WHERE m.id > COALESCE(p.last_read_message_id, 0)
        AND m.sender_id <> $1
      GROUP BY m.sender_id
      `,
      [me],
    );

    res.json({
      items: rows.map((r) => ({
        user_id: Number(r.user_id),
        unread: Number(r.unread || 0),
      })),
    });
  } catch (err) {
    console.warn("[Chat:Neon] Could not fetch unread by user:", err.message);
    res.json({ items: [] });
  }
});

// ============================================
// 📎 MEDIA UPLOAD (CLOUDINARY / LOCAL FALLBACK)
// ============================================

const chatUploadDir = path.join(process.cwd(), "uploads");
try {
  if (!fs.existsSync(chatUploadDir)) {
    fs.mkdirSync(chatUploadDir, { recursive: true });
  }
} catch {}

const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, chatUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `chat-${unique}${ext}`);
  },
});

const blockedExtensions = new Set([".exe", ".bat", ".cmd", ".sh", ".vbs", ".msi", ".com", ".scr"]);

function chatFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (blockedExtensions.has(ext)) {
    return cb(new Error("Executable and script files are not allowed for security reasons"), false);
  }
  cb(null, true);
}

const chatUpload = multer({
  storage: chatStorage,
  fileFilter: chatFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.post("/upload", chatUpload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // 1. Attempt upload to Cloudinary
    try {
      const buffer = fs.readFileSync(req.file.path);
      const companyId = req.user?.company_id || req.user?.companyId || req.scope?.companyId || null;
      const branchId = req.user?.branch_id || req.user?.branchId || req.scope?.branchId || null;

      const cloudResult = await uploadBufferToCloudinary({
        buffer,
        mimetype: req.file.mimetype,
        filename: req.file.originalname || req.file.filename,
        folder: "omnisuite/chat",
        scope: { companyId, branchId },
      });

      if (cloudResult?.url) {
        // Clean up temporary local disk file
        try {
          fs.unlinkSync(req.file.path);
        } catch {}

        return res.json({
          path: cloudResult.url,
          url: cloudResult.url,
          file_name: req.file.originalname || req.file.filename,
          file_size: req.file.size,
          mime: req.file.mimetype,
          public_id: cloudResult.public_id,
          resource_type: cloudResult.resource_type,
          storage: "cloudinary",
        });
      }
    } catch (cloudErr) {
      console.warn("Chat Cloudinary upload warning, falling back to local file storage:", cloudErr.message);
    }

    // 2. Fallback to local server file storage
    const filePath = `/uploads/${req.file.filename}`;
    const origin = `${req.protocol}://${req.get("host")}`;

    res.json({
      path: filePath,
      url: `${origin}${filePath}`,
      file_name: req.file.originalname || req.file.filename,
      file_size: req.file.size,
      mime: req.file.mimetype,
      storage: "local",
    });
  } catch (e) {
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
    }
    next(e);
  }
});

// ============================================
// ⚙️ CHAT USER SETTINGS (WALLPAPER & PREFERENCES)
// ============================================

let userSettingsTableEnsured = false;
async function ensureChatUserSettingsTable() {
  if (userSettingsTableEnsured) return;
  try {
    await neonQuery(`
      CREATE TABLE IF NOT EXISTS chat_user_settings (
        user_id BIGINT PRIMARY KEY,
        background_url TEXT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    userSettingsTableEnsured = true;
  } catch (err) {
    console.error("[Chat:Neon] Failed to ensure chat_user_settings table:", err.message);
  }
}

/**
 * GET /settings
 * Retrieve personal chat settings for the authenticated user.
 */
router.get("/settings", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    await ensureChatUserSettingsTable();
    const rows = await neonQuery(
      `SELECT background_url FROM chat_user_settings WHERE user_id = $1 LIMIT 1`,
      [me],
    );
    res.json({
      background_url: rows?.[0]?.background_url || null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /settings
 * Save personal chat settings (e.g. background wallpaper) exclusive to this user.
 */
router.post("/settings", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    const { background_url } = req.body || {};
    await ensureChatUserSettingsTable();
    await neonQuery(
      `
      INSERT INTO chat_user_settings (user_id, background_url, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET background_url = EXCLUDED.background_url, updated_at = NOW()
      `,
      [me, background_url ? String(background_url).trim() : null],
    );
    res.json({
      ok: true,
      background_url: background_url || null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /settings/background
 * Remove custom wallpaper and restore to default for the authenticated user.
 */
router.delete("/settings/background", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    await ensureChatUserSettingsTable();
    await neonQuery(
      `UPDATE chat_user_settings SET background_url = NULL, updated_at = NOW() WHERE user_id = $1`,
      [me],
    );
    res.json({ ok: true, background_url: null });
  } catch (err) {
    next(err);
  }
});

export default router;
