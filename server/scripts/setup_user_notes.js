import { query } from "../db/pool.js";

async function setup() {
  const [db] = await query("SELECT DATABASE() as db");
  console.log("Current DB in pool.js:", db);

  await query(`
    CREATE TABLE IF NOT EXISTS adm_user_notes (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      title VARCHAR(255) NOT NULL DEFAULT 'Untitled Note',
      content MEDIUMTEXT,
      canvas_data LONGTEXT,
      bytes_size INT UNSIGNED NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_notes_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("adm_user_notes table created/verified in pool DB");

  await query(`
    CREATE TABLE IF NOT EXISTS adm_user_note_quotas (
      user_id BIGINT UNSIGNED PRIMARY KEY,
      max_bytes BIGINT UNSIGNED NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("adm_user_note_quotas table created/verified in pool DB");

  const existing = await query(`
    SELECT id, setting_value FROM adm_system_settings WHERE setting_key = 'USER_NOTES_DEFAULT_MAX_BYTES' LIMIT 1
  `);
  if (!existing || existing.length === 0) {
    await query(`
      INSERT INTO adm_system_settings (company_id, setting_key, setting_value)
      VALUES (1, 'USER_NOTES_DEFAULT_MAX_BYTES', '1048576')
    `);
    console.log("Default USER_NOTES_DEFAULT_MAX_BYTES inserted: 1048576 (1 MB)");
  } else {
    console.log("Existing USER_NOTES_DEFAULT_MAX_BYTES:", existing[0].setting_value);
  }

  process.exit(0);
}

setup().catch(e => {
  console.error("Setup error:", e);
  process.exit(1);
});
