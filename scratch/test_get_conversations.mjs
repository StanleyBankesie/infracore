import { signAccessToken } from "../server/services/token.service.js";

async function test() {
  const token = signAccessToken({
    sub: 1,
    id: 1,
    company_id: 1,
    username: "admin",
    full_name: "System Admin",
  });

  const res = await fetch("http://127.0.0.1:4002/api/chat/conversations", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log("Conversations response:", JSON.stringify(data, null, 2));
}
test().catch(e => console.error(e));
