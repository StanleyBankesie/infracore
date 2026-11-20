/**
 * @file projectPlanTables.js
 * @description Database migrations and schema definitions for Master Project Plan Hub.
 * Stores plan-specific extensions (objectives, scope definition, deliverables register,
 * execution strategy, RACI matrix, management plans, and baseline history) without
 * duplicating core project records, tasks, WBS, milestones, budgets, or resources.
 */

import { query } from "../db/pool.js";

export async function ensureProjectPlanTables() {
  try {
    // 1. Master Project Plan Record
    await query(`
      CREATE TABLE IF NOT EXISTS pm_project_plans (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        company_id BIGINT UNSIGNED NOT NULL,
        branch_id BIGINT UNSIGNED NULL,
        project_id INT NOT NULL,
        plan_status ENUM('DRAFT', 'READY_FOR_REVIEW', 'APPROVED', 'REVISION_REQUIRED', 'SUPERSEDED') NOT NULL DEFAULT 'DRAFT',
        version_no INT NOT NULL DEFAULT 1,
        
        -- Section 1: Overview & Objectives extensions
        project_sponsor VARCHAR(200) NULL,
        business_justification TEXT NULL,
        expected_outcomes TEXT NULL,
        project_classification VARCHAR(100) NULL,
        project_location VARCHAR(255) NULL,
        objectives_json LONGTEXT NULL,
        
        -- Section 2: Scope & Work Structure extensions
        scope_statement TEXT NULL,
        included_activities TEXT NULL,
        excluded_activities TEXT NULL,
        assumptions TEXT NULL,
        constraints TEXT NULL,
        project_boundaries TEXT NULL,
        acceptance_criteria TEXT NULL,
        deliverables_json LONGTEXT NULL,
        
        -- Section 3: Execution Strategy extensions
        methodology VARCHAR(50) NOT NULL DEFAULT 'HYBRID',
        methodology_description TEXT NULL,
        methodology_justification TEXT NULL,
        delivery_approach TEXT NULL,
        key_execution_considerations TEXT NULL,
        phases_json LONGTEXT NULL,
        raci_matrix_json LONGTEXT NULL,
        resource_strategy_json LONGTEXT NULL,
        
        -- Section 5: Supporting Management Plans
        risk_plan_json LONGTEXT NULL,
        quality_plan_json LONGTEXT NULL,
        procurement_plan_json LONGTEXT NULL,
        communication_plan_json LONGTEXT NULL,
        hse_plan_json LONGTEXT NULL,
        
        -- Approval & Baseline Snapshot
        approved_baseline_json LONGTEXT NULL,
        submitted_by BIGINT UNSIGNED NULL,
        submitted_by_name VARCHAR(200) NULL,
        submitted_at TIMESTAMP NULL,
        approved_by BIGINT UNSIGNED NULL,
        approved_by_name VARCHAR(200) NULL,
        approved_at TIMESTAMP NULL,
        revision_reason TEXT NULL,
        
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_pm_plan_project (company_id, project_id),
        KEY idx_pm_plan_comp (company_id),
        KEY idx_pm_plan_status (plan_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Project Plan Historical Baselines & Revisions
    await query(`
      CREATE TABLE IF NOT EXISTS pm_project_plan_history (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        company_id BIGINT UNSIGNED NOT NULL,
        branch_id BIGINT UNSIGNED NULL,
        project_id INT NOT NULL,
        plan_id BIGINT UNSIGNED NOT NULL,
        version_no INT NOT NULL,
        plan_status VARCHAR(50) NOT NULL DEFAULT 'APPROVED',
        baseline_snapshot LONGTEXT NOT NULL,
        change_summary TEXT NULL,
        approved_by BIGINT UNSIGNED NULL,
        approved_by_name VARCHAR(200) NULL,
        approved_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_pm_plan_hist_proj (project_id, version_no)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } catch (err) {
    console.error("[ensureProjectPlanTables] Error initializing tables:", err?.message || err);
  }
}
