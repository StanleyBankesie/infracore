import { query } from '../server/db/pool.js';

async function run() {
  await query("UPDATE pm_tasks SET scope_name = 'Substructure & Foundation' WHERE id = 2");
  await query("INSERT IGNORE INTO pm_milestone_tasks (company_id, milestone_id, task_id, is_mandatory, is_inspection_task) VALUES (1, 6, 2, 1, 0)");
  console.log("Successfully linked task 2 to milestone 6");
  process.exit(0);
}
run();
