const { query } = require('../server/db/pool.js');

async function test() {
  const me = 1;
  const companyId = 1;
  try {
    const rows = await query(
      `SELECT c.id, c.title, c.is_group, c.project_id, c.description, c.avatar_url, c.created_by,
              (SELECT m.content FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_preview,
              (SELECT m.sent_at FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_time,
              p_proj.project_name, p_proj.project_code
       FROM chat_conversations c
       JOIN chat_conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = :me
       LEFT JOIN pm_projects p_proj ON p_proj.id = c.project_id
       WHERE (c.company_id = :companyId OR :companyId IS NULL)
       ORDER BY c.id DESC`,
      { me, companyId }
    );
    console.log("Direct MySQL Query Rows:", rows);
  } catch (e) {
    console.error("Direct MySQL Error:", e.message);
  }
}
test();
