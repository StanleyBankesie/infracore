/**
 * @file taskNotification.js
 * @description Unified notification dispatcher for task assignments across Email, SMS, WhatsApp, and Web Push.
 * Adheres to permissions configured in Settings and message templates configured in General Settings.
 */
import { query } from "../../db/pool.js";
import { isMailerConfigured, sendMail } from "../../utils/mailer.js";
import { isSMSConfigured, sendSMS } from "../../utils/sms.js";
import { isWhatsAppConfigured, sendWhatsApp } from "../../utils/whatsapp.js";
import { sendPushToUser } from "../../routes/push.routes.js";

function formatDate(val) {
  if (!val) return "Not specified";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(val);
  }
}

/**
 * Formats template placeholders with task and user variables.
 */
function compileMessage(template, vars) {
  let result = template;
  for (const [k, v] of Object.entries(vars)) {
    const reg = new RegExp(`\\{${k}\\}`, "gi");
    result = result.replace(reg, v !== undefined && v !== null ? String(v) : "");
  }
  return result;
}

/**
 * Ensures the notification preferences table exists.
 */
async function ensureNotificationPrefsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS adm_notification_prefs (
        user_id BIGINT UNSIGNED NOT NULL,
        pref_key VARCHAR(100) NOT NULL,
        push_enabled TINYINT(1) NOT NULL DEFAULT 0,
        email_enabled TINYINT(1) NOT NULL DEFAULT 0,
        sms_enabled TINYINT(1) NOT NULL DEFAULT 0,
        whatsapp_enabled TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, pref_key),
        INDEX idx_pref_key (pref_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (err) {
    console.warn("[TaskNotification] Failed to ensure notification prefs table:", err.message);
  }
}

/**
 * Dispatches Email, SMS, WhatsApp, and Push notifications to the assigned user
 * based on permissions configured in Settings and template configured in General Settings.
 */
export async function notifyTaskAssigned({
  taskId,
  taskTitle,
  projectId = null,
  assignedToId,
  assignedToName = null,
  priority = "NORMAL",
  startDate = null,
  dueDate = null,
  companyId = null,
  assignedById = null,
  req = null,
}) {
  const targetUserId = Number(assignedToId);
  if (!targetUserId || isNaN(targetUserId)) {
    return;
  }

  try {
    await ensureNotificationPrefsTable();

    // 1. Fetch assigned user details
    const userRows = await query(
      `SELECT id, email, username, full_name, telephone, company_id, is_active
       FROM adm_users
       WHERE id = :targetUserId
       LIMIT 1`,
      { targetUserId }
    );

    if (!userRows || !userRows.length || !userRows[0].is_active) {
      console.log(`[TaskNotification] User ${targetUserId} not found or inactive. Skipping notification.`);
      return;
    }

    const user = userRows[0];
    const targetCompanyId = companyId || user.company_id || 1;
    const recipientName = user.full_name || user.username || assignedToName || "Team Member";

    // 2. Check permissions configured in Settings Page for 'task-assigned'
    const prefRows = await query(
      `SELECT push_enabled, email_enabled, sms_enabled, whatsapp_enabled
       FROM adm_notification_prefs
       WHERE user_id = :targetUserId AND pref_key = 'task-assigned'
       LIMIT 1`,
      { targetUserId }
    );

    if (!prefRows || !prefRows.length) {
      console.log(`[TaskNotification] No 'task-assigned' notification permission configured for user ${targetUserId} in Settings. Skipping.`);
      return;
    }

    const pref = prefRows[0];
    const emailPermitted = Number(pref.email_enabled) === 1;
    const smsPermitted = Number(pref.sms_enabled) === 1;
    const whatsappPermitted = Number(pref.whatsapp_enabled) === 1;
    const pushPermitted = Number(pref.push_enabled) === 1;

    if (!emailPermitted && !smsPermitted && !whatsappPermitted && !pushPermitted) {
      console.log(`[TaskNotification] All notification channels disabled for user ${targetUserId} in Settings.`);
      return;
    }

    // 3. Fetch project details
    let projectName = "General Project";
    let projectCode = "";
    if (projectId) {
      try {
        const projRows = await query(
          `SELECT id, project_name, project_code FROM pm_projects WHERE id = :projectId LIMIT 1`,
          { projectId: Number(projectId) }
        );
        if (projRows && projRows.length) {
          projectName = projRows[0].project_name || projectName;
          projectCode = projRows[0].project_code || "";
        }
      } catch (projErr) {
        console.warn("[TaskNotification] Failed to query project details:", projErr.message);
      }
    }

    // 4. Fetch assigner name if available
    let assignerName = "Project Manager";
    if (assignedById) {
      try {
        const assignerRows = await query(
          `SELECT username, full_name FROM adm_users WHERE id = :assignedById LIMIT 1`,
          { assignedById: Number(assignedById) }
        );
        if (assignerRows && assignerRows.length) {
          assignerName = assignerRows[0].full_name || assignerRows[0].username || assignerName;
        }
      } catch {}
    }

    // 5. Build base variables and URL link
    const cleanDueDate = formatDate(dueDate);
    const cleanStartDate = formatDate(startDate);
    const taskLink = `/project-management/tasks`;

    const templateVars = {
      assigned_to: recipientName,
      task_title: taskTitle || "Untitled Task",
      project_name: projectName,
      project_code: projectCode,
      priority: (priority || "NORMAL").toUpperCase(),
      due_date: cleanDueDate,
      start_date: cleanStartDate,
      assigned_by: assignerName,
      task_url: taskLink,
      link: taskLink,
    };

    // 6. Retrieve message body template configured in General Settings (or fallback default)
    const rawTemplate =
      process.env.TEMPLATE_TASK_ASSIGNED && String(process.env.TEMPLATE_TASK_ASSIGNED).trim()
        ? String(process.env.TEMPLATE_TASK_ASSIGNED).trim()
        : `Hello {assigned_to},\n\nYou have been assigned a new task: "{task_title}" on project "{project_name}".\nPriority: {priority}\nDue Date: {due_date}\nAssigned by: {assigned_by}\n\nPlease check your workspace to get started.\n\nThank you!`;

    const compiledMessage = compileMessage(rawTemplate, templateVars);
    const emailSubject = `Task Assigned: ${taskTitle || "New Task"} [${projectName}]`;

    console.log(`[TaskNotification] Dispatching task assigned notification to ${user.username} (ID ${targetUserId}) channels: email=${emailPermitted}, sms=${smsPermitted}, whatsapp=${whatsappPermitted}, push=${pushPermitted}`);

    // 7. Channel: In-App & Web Push Notification
    if (pushPermitted) {
      try {
        // Record in-app notification in adm_notifications
        await query(
          `INSERT INTO adm_notifications (company_id, user_id, title, message, link, is_read)
           VALUES (:companyId, :userId, :title, :message, :link, 0)`,
          {
            companyId: targetCompanyId,
            userId: targetUserId,
            title: `New Task Assigned: ${taskTitle || "Task"}`,
            message: `You were assigned "${taskTitle}" on ${projectName}. Due: ${cleanDueDate}.`,
            link: taskLink,
          }
        ).catch(() => {});

        // Send browser web push notification
        await sendPushToUser(targetUserId, {
          title: `Task Assigned: ${taskTitle}`,
          body: `Project: ${projectName} • Due: ${cleanDueDate}`,
          data: { url: taskLink },
        });
        console.log(`[TaskNotification] ✓ Push notification sent to user ${targetUserId}`);
      } catch (pushErr) {
        console.warn(`[TaskNotification] Push notification failed for user ${targetUserId}:`, pushErr.message);
      }
    }

    // 8. Channel: Email Notification
    if (emailPermitted && user.email) {
      if (isMailerConfigured()) {
        try {
          const htmlContent = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
              <div style="background: #0E3646; padding: 24px 32px; color: #ffffff;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">Task Assignment Notification</h2>
                <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.85;">OmniSuite Project Management</p>
              </div>
              <div style="padding: 32px;">
                <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin-top: 0;">
                  Hello <strong>${recipientName}</strong>,
                </p>
                <p style="font-size: 14px; color: #334155; line-height: 1.6;">
                  You have been assigned to a task on <strong>${projectName}</strong>.
                </p>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; width: 110px;"><strong>Task Title:</strong></td>
                      <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${taskTitle || "Untitled Task"}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b;"><strong>Project:</strong></td>
                      <td style="padding: 6px 0; color: #0f172a;">${projectName} ${projectCode ? `(${projectCode})` : ""}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b;"><strong>Priority:</strong></td>
                      <td style="padding: 6px 0; color: #0f172a;"><span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; background: #e0f2fe; color: #0369a1;">${(priority || "NORMAL").toUpperCase()}</span></td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b;"><strong>Due Date:</strong></td>
                      <td style="padding: 6px 0; color: #0f172a;">${cleanDueDate}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b;"><strong>Assigned By:</strong></td>
                      <td style="padding: 6px 0; color: #0f172a;">${assignerName}</td>
                    </tr>
                  </table>
                </div>
                <div style="white-space: pre-line; font-size: 13px; color: #475569; line-height: 1.6; margin-bottom: 28px; padding-left: 4px; border-left: 3px solid #0E3646;">
                  ${compiledMessage}
                </div>
                <div style="text-align: center; margin: 28px 0 16px;">
                  <a href="${process.env.APP_URL || "https://omnisuite.app"}${taskLink}" style="display: inline-block; background-color: #0E3646; color: #ffffff; padding: 12px 28px; border-radius: 10px; font-weight: 600; text-decoration: none; font-size: 14px;">Open Task in Workspace</a>
                </div>
              </div>
              <div style="background: #f1f5f9; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                This automated notification was generated by OmniSuite ERP.
              </div>
            </div>
          `;

          await sendMail({
            to: user.email,
            subject: emailSubject,
            text: compiledMessage,
            html: htmlContent,
          });
          console.log(`[TaskNotification] ✓ Email sent to ${user.email}`);
        } catch (mailErr) {
          console.warn(`[TaskNotification] Failed to send email to ${user.email}:`, mailErr.message);
        }
      } else {
        console.log(`[TaskNotification] ✗ Email permitted but SMTP mailer is not configured.`);
      }
    }

    // 9. Channel: SMS Notification
    if (smsPermitted && user.telephone) {
      if (isSMSConfigured()) {
        try {
          const smsText = compiledMessage.length > 320 ? `${compiledMessage.slice(0, 317)}...` : compiledMessage;
          await sendSMS({ to: user.telephone, message: smsText });
          console.log(`[TaskNotification] ✓ SMS sent to ${user.telephone}`);
        } catch (smsErr) {
          console.warn(`[TaskNotification] Failed to send SMS to ${user.telephone}:`, smsErr.message);
        }
      } else {
        console.log(`[TaskNotification] ✗ SMS permitted but Arkesel SMS is not configured.`);
      }
    }

    // 10. Channel: WhatsApp Notification
    if (whatsappPermitted && user.telephone) {
      if (isWhatsAppConfigured()) {
        try {
          await sendWhatsApp({ to: user.telephone, message: compiledMessage });
          console.log(`[TaskNotification] ✓ WhatsApp message sent to ${user.telephone}`);
        } catch (waErr) {
          console.warn(`[TaskNotification] Failed to send WhatsApp to ${user.telephone}:`, waErr.message);
        }
      } else {
        console.log(`[TaskNotification] ✗ WhatsApp permitted but Green API is not configured.`);
      }
    }
  } catch (err) {
    console.error("[TaskNotification] Unhandled error during task assignment notification:", err);
  }
}
