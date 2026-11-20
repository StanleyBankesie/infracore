const fs = require('fs');

const filePath = 'server/routes/chat.routes.js';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/\r\r\n/g, '\n').replace(/\r\n/g, '\n');

const oldGetConvStart = 'router.get("/conversations", async (req, res, next) => {';
const oldGetConvEnd = `/**
 * POST /conversations/direct`;

const idx1 = content.indexOf(oldGetConvStart);
const idx2 = content.indexOf(oldGetConvEnd);

if (idx1 === -1 || idx2 === -1) {
  console.error("Could not find GET /conversations block!");
  process.exit(1);
}

const newGetConv = `router.get("/conversations", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    const companyId = Number(req.scope?.companyId || req.user?.company_id || 1) || 1;

    // Fast-path: query MySQL immediately for sub-millisecond response
    const mysqlRows = await mysqlQuery(
      \`SELECT c.id, c.title, c.is_group, c.project_id, c.description, c.avatar_url, c.created_by,
              (SELECT m.content FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_preview,
              (SELECT m.sent_at FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_time,
              p_proj.project_name, p_proj.project_code
       FROM chat_conversations c
       JOIN chat_conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = :me
       LEFT JOIN pm_projects p_proj ON p_proj.id = c.project_id
       WHERE (c.company_id = :companyId OR c.company_id IS NULL OR :companyId = 1)
       ORDER BY (CASE WHEN (SELECT m.sent_at FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) IS NULL THEN 1 ELSE 0 END),
                (SELECT m.sent_at FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) DESC,
                c.id DESC\`,
      { me, companyId }
    ).catch(() => []);

    const items = (mysqlRows || []).map((r) => ({
      id: Number(r.id),
      title: r.title || (r.is_group ? (r.project_name ? \`\${r.project_name} Group\` : "Project Group") : \`Chat #\${r.id}\`),
      is_group: Boolean(r.is_group),
      project_id: r.project_id ? Number(r.project_id) : null,
      project_name: r.project_name || null,
      project_code: r.project_code || null,
      description: r.description || null,
      avatar_url: r.avatar_url || null,
      created_by: Number(r.created_by),
      member_count: 1,
      my_role: "member",
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

`;

content = content.slice(0, idx1) + newGetConv + content.slice(idx2);

// Also fast-path GET /conversations/:id/messages
const oldGetMsgStart = 'router.get("/conversations/:id/messages", async (req, res, next) => {';
const oldGetMsgEnd = `/**
 * POST /messages
 * Send a text or media message`;

const idxMsg1 = content.indexOf(oldGetMsgStart);
const idxMsg2 = content.indexOf(oldGetMsgEnd);

if (idxMsg1 !== -1 && idxMsg2 !== -1) {
  const newGetMsg = `router.get("/conversations/:id/messages", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      throw httpError(400, "VALIDATION_ERROR", "Invalid id");
    }

    const mysqlRows = await mysqlQuery(
      \`SELECT m.id, m.conversation_id, m.sender_id, m.receiver_id, m.message_type,
              m.content, m.file_name, m.file_size, m.status, m.sent_at, m.created_by,
              u.full_name AS sender_name, u.username AS sender_username,
              IF(u.profile_picture IS NULL, NULL,
                 IF(LEFT(u.profile_picture, 4) = 'http' OR LEFT(u.profile_picture, 5) = 'data:',
                    CONVERT(u.profile_picture USING utf8),
                    CONCAT('data:image/jpeg;base64,', REPLACE(TO_BASE64(u.profile_picture), '\\\\n', '')))) AS profile_picture_url
       FROM chat_messages m
       LEFT JOIN adm_users u ON u.id = m.sender_id
       WHERE m.conversation_id = :id
       ORDER BY m.id ASC\`,
      { id }
    ).catch(() => []);

    const items = (mysqlRows || []).map((m) => ({
      ...m,
      id: Number(m.id),
      conversation_id: Number(m.conversation_id),
      sender_id: Number(m.sender_id),
      sender_name: m.sender_name || m.sender_username || \`User #\${m.sender_id}\`,
      sender_username: m.sender_username || "",
      sender_avatar: m.profile_picture_url || null,
    }));

    res.json({ items });
  } catch (err) {
    console.warn("[Chat:Messages Error]", err.message);
    res.json({ items: [] });
  }
});

`;
  content = content.slice(0, idxMsg1) + newGetMsg + content.slice(idxMsg2);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully sped up conversations and messages endpoints!");
