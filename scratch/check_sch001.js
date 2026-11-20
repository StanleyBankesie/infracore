import { query } from '../server/db/pool.js';

async function run() {
  const prjs = await query("SELECT id, project_code, project_name FROM pm_projects WHERE project_code LIKE '%SCH%' OR project_name LIKE '%SCIENCE%'");
  console.log('Project:', prjs);
  if (prjs.length) {
    const pid = prjs[0].id;
    const tasks = await query("SELECT id, task_title, wbs_code, scope_name, status, completion_percent, start_date, end_date FROM pm_tasks WHERE project_id = :pid", { pid });
    console.log('Tasks for pid', pid, tasks);
    const ms = await query("SELECT id, title, status, target_date, progress_percent, is_confirmed FROM pm_milestones WHERE project_id = :pid", { pid });
    console.log('Milestones for pid', pid, ms);
  }
  process.exit(0);
}
run();
