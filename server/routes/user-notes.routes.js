/**
 * @file user-notes.routes.js
 * @description API routes for user project notes, database persistence, and admin storage quota capping.
 */

import express from "express";
import { query, pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

/**
 * Format bytes helper for human-readable error messages
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Get user storage quota and current usage
 */
async function getUserQuotaAndUsage(userId) {
  // 1. Fetch current total used bytes
  const [usageRows] = await query(
    `SELECT COALESCE(SUM(bytes_size), 0) AS used_bytes, COUNT(*) as notes_count 
     FROM adm_user_notes 
     WHERE user_id = ?`,
    [userId]
  );
  const usedBytes = Number(usageRows?.used_bytes || 0);
  const notesCount = Number(usageRows?.notes_count || 0);

  // 2. Fetch user-specific quota if set
  const [quotaRows] = await query(
    `SELECT max_bytes FROM adm_user_note_quotas WHERE user_id = ? LIMIT 1`,
    [userId]
  );

  let maxBytes = null;
  if (quotaRows?.max_bytes != null) {
    maxBytes = Number(quotaRows.max_bytes);
  } else {
    // 3. Fallback to global default
    const [defRows] = await query(
      `SELECT setting_value FROM adm_system_settings WHERE setting_key = 'USER_NOTES_DEFAULT_MAX_BYTES' LIMIT 1`
    );
    maxBytes = defRows?.setting_value ? Number(defRows.setting_value) : 1048576; // Default 1 MB
  }

  const percent = maxBytes > 0 ? Math.min(Math.round((usedBytes / maxBytes) * 1000) / 10, 100) : 0;
  const remainingBytes = Math.max(0, maxBytes - usedBytes);

  return {
    used_bytes: usedBytes,
    max_bytes: maxBytes,
    percent,
    remaining_bytes: remainingBytes,
    notes_count: notesCount,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/user-notes (Fetch all notes for authenticated user)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const notes = await query(
      `SELECT id, user_id, title, content, canvas_data, bytes_size, created_at, updated_at 
       FROM adm_user_notes 
       WHERE user_id = ? 
       ORDER BY updated_at DESC`,
      [userId]
    );

    const usage = await getUserQuotaAndUsage(userId);

    res.json({
      ok: true,
      notes: Array.isArray(notes) ? notes : [],
      usage,
    });
  } catch (error) {
    console.error("Error fetching user notes:", error);
    res.status(500).json({ ok: false, error: error.message || "Failed to fetch notes" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. POST /api/user-notes (Create a new note with quota validation)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const { title = "Untitled Note", content = "", canvas_data = "" } = req.body;

    // Calculate byte size of incoming note
    const titleBytes = Buffer.byteLength(String(title), "utf8");
    const contentBytes = Buffer.byteLength(String(content), "utf8");
    const canvasBytes = Buffer.byteLength(String(canvas_data || ""), "utf8");
    const incomingBytes = titleBytes + contentBytes + canvasBytes;

    const usage = await getUserQuotaAndUsage(userId);

    // Enforce quota limit check
    if (usage.used_bytes + incomingBytes > usage.max_bytes) {
      return res.status(403).json({
        ok: false,
        quota_exceeded: true,
        error: `Storage quota exceeded! Your notes storage limit is ${formatBytes(
          usage.max_bytes
        )} (currently using ${formatBytes(usage.used_bytes)}). Cannot save note of size ${formatBytes(
          incomingBytes
        )}. Please remove older notes or request a quota increase from your administrator.`,
        usage,
      });
    }

    const insertResult = await query(
      `INSERT INTO adm_user_notes (user_id, title, content, canvas_data, bytes_size)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, title, content, canvas_data || null, incomingBytes]
    );

    const newId = insertResult.insertId;
    const [newNote] = await query(
      `SELECT id, user_id, title, content, canvas_data, bytes_size, created_at, updated_at 
       FROM adm_user_notes WHERE id = ?`,
      [newId]
    );

    const updatedUsage = await getUserQuotaAndUsage(userId);

    res.status(201).json({
      ok: true,
      note: newNote,
      usage: updatedUsage,
    });
  } catch (error) {
    console.error("Error creating user note:", error);
    res.status(500).json({ ok: false, error: error.message || "Failed to create note" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. PUT /api/user-notes/:id (Update existing note with quota validation)
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.sub;
    const noteId = Number(req.params.id);

    if (!userId || !noteId) {
      return res.status(400).json({ ok: false, error: "Invalid request parameters" });
    }

    // Verify ownership
    const [existing] = await query(
      `SELECT id, bytes_size FROM adm_user_notes WHERE id = ? AND user_id = ?`,
      [noteId, userId]
    );

    if (!existing) {
      return res.status(404).json({ ok: false, error: "Note not found or access denied" });
    }

    const { title = "Untitled Note", content = "", canvas_data = "" } = req.body;

    const titleBytes = Buffer.byteLength(String(title), "utf8");
    const contentBytes = Buffer.byteLength(String(content), "utf8");
    const canvasBytes = Buffer.byteLength(String(canvas_data || ""), "utf8");
    const newBytes = titleBytes + contentBytes + canvasBytes;
    const oldBytes = Number(existing.bytes_size || 0);

    const usage = await getUserQuotaAndUsage(userId);
    const projectedUsage = usage.used_bytes - oldBytes + newBytes;

    if (projectedUsage > usage.max_bytes) {
      return res.status(403).json({
        ok: false,
        quota_exceeded: true,
        error: `Storage quota exceeded! Your notes storage limit is ${formatBytes(
          usage.max_bytes
        )} (projected: ${formatBytes(projectedUsage)}). Cannot save note updates. Please remove older notes or request a quota increase from your administrator.`,
        usage,
      });
    }

    await query(
      `UPDATE adm_user_notes 
       SET title = ?, content = ?, canvas_data = ?, bytes_size = ?, updated_at = NOW() 
       WHERE id = ? AND user_id = ?`,
      [title, content, canvas_data || null, newBytes, noteId, userId]
    );

    const [updatedNote] = await query(
      `SELECT id, user_id, title, content, canvas_data, bytes_size, created_at, updated_at 
       FROM adm_user_notes WHERE id = ?`,
      [noteId]
    );

    const updatedUsage = await getUserQuotaAndUsage(userId);

    res.json({
      ok: true,
      note: updatedNote,
      usage: updatedUsage,
    });
  } catch (error) {
    console.error("Error updating user note:", error);
    res.status(500).json({ ok: false, error: error.message || "Failed to update note" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. DELETE /api/user-notes/:id (Delete a note and free storage space)
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.sub;
    const noteId = Number(req.params.id);

    if (!userId || !noteId) {
      return res.status(400).json({ ok: false, error: "Invalid request parameters" });
    }

    await query(`DELETE FROM adm_user_notes WHERE id = ? AND user_id = ?`, [noteId, userId]);

    const updatedUsage = await getUserQuotaAndUsage(userId);

    res.json({
      ok: true,
      message: "Note deleted successfully",
      usage: updatedUsage,
    });
  } catch (error) {
    console.error("Error deleting user note:", error);
    res.status(500).json({ ok: false, error: error.message || "Failed to delete note" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. ADMIN: GET /api/user-notes/admin/quota (Fetch global quota & user usage)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/admin/quota", requireAuth, async (req, res) => {
  try {
    const isAdmin = Boolean(
      req.user?.is_super_admin ||
      req.user?.role === "ADMIN" ||
      req.user?.role === "SUPER_ADMIN" ||
      req.user?.role_id === 1 ||
      req.user?.id === 1
    );

    if (!isAdmin) {
      return res.status(403).json({ ok: false, error: "Access denied. Administrator privileges required." });
    }

    // 1. Global default max bytes
    const [defRows] = await query(
      `SELECT setting_value FROM adm_system_settings WHERE setting_key = 'USER_NOTES_DEFAULT_MAX_BYTES' LIMIT 1`
    );
    const defaultMaxBytes = defRows?.setting_value ? Number(defRows.setting_value) : 1048576;

    // 2. Users list with storage stats
    const users = await query(
      `SELECT 
         u.id, u.username, u.full_name, u.email, u.is_active,
         q.max_bytes as custom_max_bytes,
         COALESCE(un.total_bytes, 0) as used_bytes,
         COALESCE(un.notes_count, 0) as notes_count
       FROM adm_users u
       LEFT JOIN adm_user_note_quotas q ON q.user_id = u.id
       LEFT JOIN (
         SELECT user_id, SUM(bytes_size) as total_bytes, COUNT(*) as notes_count
         FROM adm_user_notes
         GROUP BY user_id
       ) un ON un.user_id = u.id
       ORDER BY un.total_bytes DESC, u.username ASC`
    );

    const formattedUsers = (Array.isArray(users) ? users : []).map((u) => {
      const used = Number(u.used_bytes || 0);
      const cap = u.custom_max_bytes != null ? Number(u.custom_max_bytes) : defaultMaxBytes;
      const pct = cap > 0 ? Math.min(Math.round((used / cap) * 1000) / 10, 100) : 0;
      return {
        id: u.id,
        username: u.username,
        full_name: u.full_name,
        email: u.email,
        is_active: u.is_active,
        used_bytes: used,
        custom_max_bytes: u.custom_max_bytes != null ? Number(u.custom_max_bytes) : null,
        effective_max_bytes: cap,
        notes_count: Number(u.notes_count || 0),
        percent_used: pct,
        is_custom: u.custom_max_bytes != null,
      };
    });

    const totalSystemNotes = formattedUsers.reduce((acc, u) => acc + u.notes_count, 0);
    const totalSystemStorage = formattedUsers.reduce((acc, u) => acc + u.used_bytes, 0);

    res.json({
      ok: true,
      default_max_bytes: defaultMaxBytes,
      total_system_notes: totalSystemNotes,
      total_system_storage_bytes: totalSystemStorage,
      users: formattedUsers,
    });
  } catch (error) {
    console.error("Error fetching admin notes quota:", error);
    res.status(500).json({ ok: false, error: error.message || "Failed to load quota settings" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. ADMIN: POST /api/user-notes/admin/quota (Update global default & user caps)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/admin/quota", requireAuth, async (req, res) => {
  try {
    const isAdmin = Boolean(
      req.user?.is_super_admin ||
      req.user?.role === "ADMIN" ||
      req.user?.role === "SUPER_ADMIN" ||
      req.user?.role_id === 1 ||
      req.user?.id === 1
    );

    if (!isAdmin) {
      return res.status(403).json({ ok: false, error: "Access denied. Administrator privileges required." });
    }

    const { default_max_bytes, user_id, custom_max_bytes, remove_custom } = req.body;

    // 1. Update global default if provided
    if (default_max_bytes !== undefined) {
      const parsedDef = Math.max(1024, Number(default_max_bytes)); // minimum 1 KB
      const [existing] = await query(
        `SELECT id FROM adm_system_settings WHERE setting_key = 'USER_NOTES_DEFAULT_MAX_BYTES' LIMIT 1`
      );
      if (existing) {
        await query(
          `UPDATE adm_system_settings SET setting_value = ? WHERE setting_key = 'USER_NOTES_DEFAULT_MAX_BYTES'`,
          [String(parsedDef)]
        );
      } else {
        await query(
          `INSERT INTO adm_system_settings (company_id, setting_key, setting_value) VALUES (1, 'USER_NOTES_DEFAULT_MAX_BYTES', ?)`,
          [String(parsedDef)]
        );
      }
    }

    // 2. Update specific user quota override if provided
    if (user_id) {
      const targetUserId = Number(user_id);
      if (remove_custom) {
        await query(`DELETE FROM adm_user_note_quotas WHERE user_id = ?`, [targetUserId]);
      } else if (custom_max_bytes !== undefined) {
        const parsedCustom = Math.max(0, Number(custom_max_bytes));
        await query(
          `INSERT INTO adm_user_note_quotas (user_id, max_bytes) 
           VALUES (?, ?) 
           ON DUPLICATE KEY UPDATE max_bytes = VALUES(max_bytes)`,
          [targetUserId, parsedCustom]
        );
      }
    }

    res.json({
      ok: true,
      message: "Notes storage quota settings updated successfully",
    });
  } catch (error) {
    console.error("Error saving admin notes quota:", error);
    res.status(500).json({ ok: false, error: error.message || "Failed to save quota settings" });
  }
});

export default router;
