/**
 * @file projectChat.service.js
 * @description Automatic Project Group Chat & Participant Lifecycle Service.
 *
 * Rules:
 * 1. When a project is created, automatically create a group chat with the name of the project.
 * 2. The username selected as Project Manager serves as the Group Admin (role = 'admin').
 * 3. If a user is assigned to any active task in the project, they are automatically added to the group chat (role = 'member').
 * 4. When all tasks are retrieved from the user (reassigned, completed, unassigned, or deleted),
 *    the user is automatically removed from the group chat (unless they are the Project Manager).
 */

import { query as mysqlQuery } from "../db/pool.js";
import { neonQuery } from "../db/neonPool.js";
import { getIO } from "../utils/socket.js";

let schemaEnsured = false;

/**
 * Ensures required columns exist in MySQL and Neon for group chat and participant roles.
 */
export async function ensureProjectChatSchema() {
  if (schemaEnsured) return;
  try {
    // 1. MySQL chat_conversations columns
    const convCols = await mysqlQuery("DESCRIBE chat_conversations").catch(() => []);
    const convColNames = (convCols || []).map((c) => c.Field);
    if (!convColNames.includes("is_group")) {
      await mysqlQuery("ALTER TABLE chat_conversations ADD COLUMN is_group BOOLEAN NOT NULL DEFAULT FALSE").catch(() => {});
    }
    if (!convColNames.includes("project_id")) {
      await mysqlQuery("ALTER TABLE chat_conversations ADD COLUMN project_id INT NULL").catch(() => {});
    }
    if (!convColNames.includes("description")) {
      await mysqlQuery("ALTER TABLE chat_conversations ADD COLUMN description TEXT NULL").catch(() => {});
    }
    if (!convColNames.includes("avatar_url")) {
      await mysqlQuery("ALTER TABLE chat_conversations ADD COLUMN avatar_url TEXT NULL").catch(() => {});
    }

    // 2. MySQL chat_conversation_participants columns
    const partCols = await mysqlQuery("DESCRIBE chat_conversation_participants").catch(() => []);
    const partColNames = (partCols || []).map((c) => c.Field);
    if (!partColNames.includes("role")) {
      await mysqlQuery("ALTER TABLE chat_conversation_participants ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT 'member'").catch(() => {});
    }

    // 3. Neon PostgreSQL background migration (non-blocking)
    (async () => {
      try {
        await neonQuery(`
          ALTER TABLE chat_conversations 
          ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS project_id BIGINT NULL,
          ADD COLUMN IF NOT EXISTS description TEXT NULL,
          ADD COLUMN IF NOT EXISTS avatar_url TEXT NULL;
        `).catch(() => {});
        await neonQuery(`
          ALTER TABLE chat_conversation_participants 
          ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'member';
        `).catch(() => {});
      } catch {}
    })();

    schemaEnsured = true;
  } catch (err) {
    console.warn("[ProjectChatService] Schema check warning:", err.message);
  }
}

/**
 * Resolves the Project Manager's adm_users record.
 * @param {Object} project - The pm_projects row.
 * @param {Object} [options] - Additional context.
 * @returns {Promise<{ id: number, username: string, full_name: string }>}
 */
async function resolveProjectManager(project, options = {}) {
  // 1. Check manager_id as direct user id
  if (project.manager_id && Number(project.manager_id) > 0) {
    const uRows = await mysqlQuery(
      `SELECT id, username, full_name FROM adm_users WHERE id = :mid LIMIT 1`,
      { mid: Number(project.manager_id) }
    ).catch(() => []);
    if (uRows && uRows[0]) {
      return {
        id: Number(uRows[0].id),
        username: uRows[0].username || "admin",
        full_name: uRows[0].full_name || uRows[0].username || "Project Manager",
      };
    }
  }

  // 2. Check manager_name against adm_users username or full_name
  if (project.manager_name && String(project.manager_name).trim()) {
    const mName = String(project.manager_name).trim();
    const uRows = await mysqlQuery(
      `SELECT id, username, full_name FROM adm_users WHERE username = :mName OR full_name = :mName LIMIT 1`,
      { mName }
    ).catch(() => []);
    if (uRows && uRows[0]) {
      return {
        id: Number(uRows[0].id),
        username: uRows[0].username || mName,
        full_name: uRows[0].full_name || uRows[0].username || mName,
      };
    }
  }

  // 3. Fallback to context current user or system admin
  const fallbackId = Number(options.currentUserId || 1);
  const uRows = await mysqlQuery(
    `SELECT id, username, full_name FROM adm_users WHERE id = :uid LIMIT 1`,
    { uid: fallbackId }
  ).catch(() => []);
  if (uRows && uRows[0]) {
    return {
      id: Number(uRows[0].id),
      username: uRows[0].username || "admin",
      full_name: uRows[0].full_name || uRows[0].username || "Project Manager",
    };
  }

  return { id: 1, username: "admin", full_name: "System Admin" };
}

/**
 * Synchronizes a project's group chat and its members according to current task assignments.
 *
 * Requirements met:
 * 1. Creates group chat with the exact name of the project if it doesn't already exist.
 * 2. The Project Manager is assigned as the Group Admin (role = 'admin').
 * 3. Any user assigned to any active task in the project is automatically added to the group chat (role = 'member').
 * 4. Any user who has zero active tasks remaining in the project is automatically removed from the group chat (unless they are the Project Manager).
 *
 * @param {number|string} projectId - The ID of the project to sync.
 * @param {Object} [options] - Optional settings (e.g. currentUserId, io).
 * @returns {Promise<{ conversationId: number, added: number[], removed: number[] }|null>}
 */
export async function syncProjectGroupChat(projectId, options = {}) {
  const pid = Number(projectId);
  if (!Number.isFinite(pid) || pid <= 0) return null;

  await ensureProjectChatSchema();

  // 1. Fetch project details
  const projectRows = await mysqlQuery(
    `SELECT id, company_id, branch_id, project_name, project_code, manager_id, manager_name
     FROM pm_projects
     WHERE id = :pid LIMIT 1`,
    { pid }
  ).catch((e) => {
    console.error("[SyncDebug] project error:", e);
    return [];
  });

  if (!projectRows || projectRows.length === 0) {
    return null;
  }

  const proj = projectRows[0];
  const companyId = Number(proj.company_id || 1);
  const projectName = String(proj.project_name || "").trim() || `Project #${proj.id}`;

  // 2. Resolve Project Manager (Group Admin)
  const pmUser = await resolveProjectManager(proj, options);
  const pmUserId = pmUser.id;

  // 3. Find or Create Group Chat with the name of the project
  let convRows = await mysqlQuery(
    `SELECT id, title, project_id, is_group FROM chat_conversations WHERE project_id = :pid AND is_group = 1 LIMIT 1`,
    { pid }
  ).catch(() => []);

  let conversationId = convRows?.[0]?.id ? Number(convRows[0].id) : null;
  let isNewlyCreated = false;

  if (!conversationId) {
    // Automatically create a group chat with the name of the project
    const insRes = await mysqlQuery(
      `INSERT INTO chat_conversations (company_id, title, is_group, project_id, description, created_by, created_at)
       VALUES (:companyId, :title, 1, :pid, :description, :pmUserId, NOW())`,
      {
        companyId,
        title: projectName,
        pid,
        description: `Project group chat for ${projectName}`,
        pmUserId,
      }
    );
    conversationId = Number(insRes.insertId);
    isNewlyCreated = true;

    // Post initial group chat creation announcement
    const welcomeText = `Project group chat created for "${projectName}". Project Manager ${pmUser.full_name || pmUser.username} is the Group Admin.`;
    await mysqlQuery(
      `INSERT INTO chat_messages (conversation_id, sender_id, message_type, content, status, sent_at, created_by)
       VALUES (:conversationId, :pmUserId, 'text', :content, 'sent', NOW(), :pmUserId)`,
      {
        conversationId,
        pmUserId,
        content: welcomeText,
      }
    ).catch(() => {});
  } else {
    // Update group chat title if project title was modified
    if (convRows[0].title !== projectName) {
      await mysqlQuery(
        `UPDATE chat_conversations SET title = :title WHERE id = :cid`,
        { title: projectName, cid: conversationId }
      ).catch(() => {});
    }
  }

  // 4. Ensure Project Manager is Group Admin (role = 'admin')
  await mysqlQuery(
    `INSERT INTO chat_conversation_participants (conversation_id, user_id, role, joined_at, created_by)
     VALUES (:conversationId, :pmUserId, 'admin', NOW(), :pmUserId)
     ON DUPLICATE KEY UPDATE role = 'admin'`,
    { conversationId, pmUserId }
  );

  // 5. Query all users assigned to active tasks in this project
  const taskAssigneeRows = await mysqlQuery(
    `SELECT DISTINCT assigned_to_id, assigned_to_name
     FROM pm_tasks
     WHERE project_id = :pid
       AND (is_active IS NULL OR is_active = 'Y')
       AND ((assigned_to_id IS NOT NULL AND assigned_to_id > 0) OR (assigned_to_name IS NOT NULL AND assigned_to_name != ''))`,
    { pid }
  ).catch(() => []);

  const activeTaskUserIds = new Set();

  for (const t of taskAssigneeRows) {
    let uid = Number(t.assigned_to_id);
    if (Number.isFinite(uid) && uid > 0) {
      activeTaskUserIds.add(uid);
    } else if (t.assigned_to_name && String(t.assigned_to_name).trim()) {
      const tName = String(t.assigned_to_name).trim();
      const uRows = await mysqlQuery(
        `SELECT id FROM adm_users WHERE username = :tName OR full_name = :tName LIMIT 1`,
        { tName }
      ).catch(() => []);
      if (uRows && uRows[0]?.id) {
        activeTaskUserIds.add(Number(uRows[0].id));
      }
    }
  }

  // 6. Automatically add task assignees to the group chat
  const addedUserIds = [];
  for (const uid of activeTaskUserIds) {
    if (uid === pmUserId) continue; // PM is already admin

    const existing = await mysqlQuery(
      `SELECT role FROM chat_conversation_participants WHERE conversation_id = :conversationId AND user_id = :uid LIMIT 1`,
      { conversationId, uid }
    ).catch(() => []);

    if (!existing || existing.length === 0) {
      await mysqlQuery(
        `INSERT INTO chat_conversation_participants (conversation_id, user_id, role, joined_at, created_by)
         VALUES (:conversationId, :uid, 'member', NOW(), :pmUserId)`,
        { conversationId, uid, pmUserId }
      ).catch(() => {});
      addedUserIds.push(uid);

      // Post notification message
      const u = await mysqlQuery(`SELECT username, full_name FROM adm_users WHERE id = :uid`, { uid }).catch(() => []);
      const name = u?.[0]?.full_name || u?.[0]?.username || `User #${uid}`;
      await mysqlQuery(
        `INSERT INTO chat_messages (conversation_id, sender_id, message_type, content, status, sent_at, created_by)
         VALUES (:conversationId, :pmUserId, 'text', :content, 'sent', NOW(), :pmUserId)`,
        {
          conversationId,
          pmUserId,
          content: `📌 [TEAM UPDATE] ${name} was assigned to task(s) and automatically added to the project group chat.`,
        }
      ).catch(() => {});
    }
  }

  // 7. Automatically remove users who have zero tasks remaining (unless they are the Project Manager)
  const currentParticipants = await mysqlQuery(
    `SELECT user_id, role FROM chat_conversation_participants WHERE conversation_id = :conversationId`,
    { conversationId }
  ).catch(() => []);

  const removedUserIds = [];
  for (const p of currentParticipants) {
    const pUid = Number(p.user_id);
    // Never remove the Project Manager
    if (pUid === pmUserId) continue;

    // If user has no active tasks in this project, auto-remove them
    if (!activeTaskUserIds.has(pUid)) {
      await mysqlQuery(
        `DELETE FROM chat_conversation_participants WHERE conversation_id = :conversationId AND user_id = :pUid`,
        { conversationId, pUid }
      ).catch(() => {});
      removedUserIds.push(pUid);

      // Post notification message
      const u = await mysqlQuery(`SELECT username, full_name FROM adm_users WHERE id = :pUid`, { pUid }).catch(() => []);
      const name = u?.[0]?.full_name || u?.[0]?.username || `User #${pUid}`;
      await mysqlQuery(
        `INSERT INTO chat_messages (conversation_id, sender_id, message_type, content, status, sent_at, created_by)
         VALUES (:conversationId, :pmUserId, 'text', :content, 'sent', NOW(), :pmUserId)`,
        {
          conversationId,
          pmUserId,
          content: `📌 [TEAM UPDATE] ${name} has no remaining active tasks in this project and was automatically removed from the group chat.`,
        }
      ).catch(() => {});
    }
  }

  // 8. Real-time Socket.IO emission
  const io = options.io || getIO();
  if (io) {
    try {
      io.to(`conv_${conversationId}`).emit("group_members_updated", {
        conversation_id: conversationId,
        project_id: pid,
        added: addedUserIds,
        removed: removedUserIds,
      });

      for (const uid of addedUserIds) {
        io.to(`user_${uid}`).emit("group_created", {
          id: conversationId,
          title: projectName,
          is_group: true,
          project_id: pid,
          project_name: projectName,
        });
      }

      for (const uid of removedUserIds) {
        io.to(`user_${uid}`).emit("group_left", {
          conversation_id: conversationId,
          project_id: pid,
        });
      }
    } catch (e) {
      console.warn("[ProjectChatService] Socket.io emission warning:", e.message);
    }
  }

  // 9. Asynchronous Neon PostgreSQL mirror sync (non-blocking)
  (async () => {
    try {
      let neonCid = null;
      const nConv = await neonQuery(
        `SELECT id FROM chat_conversations WHERE project_id = $1 AND is_group = TRUE LIMIT 1`,
        [pid]
      ).catch(() => []);

      if (nConv && nConv.length > 0) {
        neonCid = Number(nConv[0].id);
        await neonQuery(
          `UPDATE chat_conversations SET title = $1, description = $2 WHERE id = $3`,
          [projectName, `Project group chat for ${projectName}`, neonCid]
        ).catch(() => {});
      } else {
        const nIns = await neonQuery(
          `INSERT INTO chat_conversations (company_id, title, is_group, project_id, description, created_by, created_at)
           VALUES ($1, $2, TRUE, $3, $4, $5, NOW()) RETURNING id`,
          [companyId, projectName, pid, `Project group chat for ${projectName}`, pmUserId]
        ).catch(() => []);
        neonCid = Number(nIns?.[0]?.id);
      }

      if (neonCid) {
        // PM as admin
        await neonQuery(
          `INSERT INTO chat_conversation_participants (conversation_id, user_id, role, joined_at, created_by)
           VALUES ($1, $2, 'admin', NOW(), $2)
           ON CONFLICT (conversation_id, user_id) DO UPDATE SET role = 'admin'`,
          [neonCid, pmUserId]
        ).catch(() => {});

        // Add assignees
        for (const uid of activeTaskUserIds) {
          if (uid === pmUserId) continue;
          await neonQuery(
            `INSERT INTO chat_conversation_participants (conversation_id, user_id, role, joined_at, created_by)
             VALUES ($1, $2, 'member', NOW(), $3)
             ON CONFLICT (conversation_id, user_id) DO UPDATE SET role = 'member'`,
            [neonCid, uid, pmUserId]
          ).catch(() => {});
        }

        // Remove unassigned users
        for (const uid of removedUserIds) {
          await neonQuery(
            `DELETE FROM chat_conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
            [neonCid, uid]
          ).catch(() => {});
        }
      }
    } catch {}
  })();

  return { conversationId, added: addedUserIds, removed: removedUserIds };
}

/**
 * Syncs all existing projects' group chats (used for initial backfill and verification).
 */
export async function syncAllProjectGroupChats() {
  try {
    const projects = await mysqlQuery(`SELECT id FROM pm_projects WHERE (is_active IS NULL OR is_active = 'Y')`).catch(() => []);
    for (const p of projects || []) {
      await syncProjectGroupChat(p.id);
    }
  } catch (err) {
    console.warn("[ProjectChatService] syncAllProjectGroupChats warning:", err.message);
  }
}
