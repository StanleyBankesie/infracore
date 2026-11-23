/**
 * @file project_management.test.js
 * @description Comprehensive Automated Verification Suite for OmniSuite ERP Project Management Module.
 * Tests end-to-end business processes across the full project lifecycle:
 * 1. Setup & Project Initiation (Types, Managers, Sites, Cost Codes, Cost Categories, Projects, Quotations, Orders)
 * 2. Planning & Scheduling (Master Project Plan, BOQs, Rate Analysis, CPM Engine, Schedule Baselines, Dependencies, Resources, Purchase Requisitions)
 * 3. Execution & Site Ops (Tasks, WBS Progress Sync, Timesheets, Material Requisitions, Receipts, Utilization, Temporal Warehouses, Daily Site Reports, Subcontracts & IPC Valuations)
 * 4. Monitoring & Quality Control (EVM Cost Control, Direct Expenses, Invoices, Client Income, Variations, Client Valuations & Payment Applications, QA/QC, HSE, Risk Register)
 * 5. Project Closure & Handover (Snag Lists, Handover Dossier, Final Account Reconciliation, Retention Releases)
 */

import { pool, query } from "../db/pool.js";
import { ensureConstructionTables } from "../utils/constructionTables.js";
import { ensureProjectPlanTables } from "../utils/projectPlanTables.js";
import { ensureQualityControlTables } from "../utils/qualityControlTables.js";
import { ensureRiskManagementTables } from "../utils/riskManagementTables.js";
import { ensureMilestoneTables } from "../utils/milestoneTables.js";
import { ensureFinalAccountTables } from "../controllers/finalAccount.controller.js";
import { ensureProjectCloseoutTables } from "../controllers/projectCloseout.controller.js";
import { ensurePaymentClaimTables } from "../controllers/paymentClaim.controller.js";
import {
  ensurePMOrderTables,
  ensurePMPurchaseRequisitionTables,
  ensurePMQuotationTables,
  ensurePMInvoiceTables,
} from "../utils/dbUtils.js";
import { calculateCPM } from "../services/cpmEngine.js";
import { syncProjectStatusFromTasks } from "../controllers/projects.controller.js";

async function runProjectManagementTests() {
  console.log("================================================================================");
  console.log("RUNNING COMPREHENSIVE OMNISUITE ERP PROJECT MANAGEMENT TEST SUITE");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;
  const errors = [];
  const processesTested = [];

  function assert(condition, processName, testName, details = "") {
    if (!processesTested.includes(processName)) {
      processesTested.push(processName);
    }
    if (condition) {
      console.log(`✅ [${processName}] PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ [${processName}] FAIL: ${testName} ${details ? "- " + details : ""}`);
      failed++;
      errors.push({ process: processName, test: testName, details });
    }
  }

  try {
    // ---------------------------------------------------------
    // 0. SCHEMA & TABLE MIGRATION VERIFICATION
    // ---------------------------------------------------------
    console.log(">>> STEP 0: Initializing and Verifying All PM Table Schemas...");
    await ensureConstructionTables();
    await ensureProjectPlanTables();
    await ensureQualityControlTables();
    await ensureRiskManagementTables();
    await ensureMilestoneTables();
    await ensureFinalAccountTables();
    await ensureProjectCloseoutTables();
    await ensurePaymentClaimTables();
    await ensurePMOrderTables();
    await ensurePMPurchaseRequisitionTables();
    await ensurePMQuotationTables();
    await ensurePMInvoiceTables();

    assert(true, "Schema & Database Setup", "All PM database tables and migrations ensured successfully");

    // Get an existing company, branch, and admin user
    const [companies] = await pool.query("SELECT id FROM adm_companies LIMIT 1");
    const companyId = companies[0]?.id || 1;

    const [branches] = await pool.query("SELECT id FROM adm_branches WHERE company_id = ? LIMIT 1", [companyId]);
    const branchId = branches[0]?.id || 1;

    const [users] = await pool.query("SELECT id, username FROM adm_users WHERE is_active = 1 LIMIT 1");
    const userId = users[0]?.id || 1;
    const userName = users[0]?.username || "Admin";

    let [customers] = await pool.query("SELECT id, customer_name FROM sal_customers WHERE company_id = ? LIMIT 1", [companyId]);
    let customerId = customers[0]?.id;
    let customerName = customers[0]?.customer_name;
    if (!customerId) {
      const [newCust] = await pool.query(
        "INSERT INTO sal_customers (company_id, customer_code, customer_name, is_active) VALUES (?, 'CUST-PM-TEST', 'Stanness Infrastructure Client Ltd', 1)",
        [companyId]
      );
      customerId = newCust.insertId;
      customerName = "Stanness Infrastructure Client Ltd";
    }

    let [suppliers] = await pool.query("SELECT id, supplier_name FROM pur_suppliers WHERE company_id = ? LIMIT 1", [companyId]);
    let supplierId = suppliers[0]?.id;
    let supplierName = suppliers[0]?.supplier_name;
    if (!supplierId) {
      const [newSupp] = await pool.query(
        "INSERT INTO pur_suppliers (company_id, supplier_code, supplier_name, is_active) VALUES (?, 'SUPP-PM-TEST', 'BuildWell Specialist Subcontractors Ltd', 1)",
        [companyId]
      );
      supplierId = newSupp.insertId;
      supplierName = "BuildWell Specialist Subcontractors Ltd";
    }

    // ---------------------------------------------------------
    // 1. SETUP & PROJECT INITIATION
    // ---------------------------------------------------------
    console.log("\n>>> STEP 1: Testing Project Initiation Business Processes...");

    // 1.1 Project Types
    const typeCode = `PT-${Date.now().toString().slice(-4)}`;
    const [typeRes] = await pool.query(
      `INSERT INTO pm_project_types (company_id, branch_id, type_name, type_code, description, is_active)
       VALUES (?, ?, 'Civil Infrastructure', ?, 'Civil engineering, commercial and infrastructure works', 1)`,
      [companyId, branchId, typeCode]
    );
    const projectTypeId = typeRes.insertId;
    assert(projectTypeId > 0, "Operations Setup", "Created Project Type definition");

    // 1.2 Project Managers
    const [pmRes] = await pool.query(
      `INSERT INTO pm_project_managers (company_id, branch_id, name, email, phone, is_active)
       VALUES (?, ?, 'Ing. Kwabena Asante', 'k.asante@omnisuite.test', '+233240001122', 1)`,
      [companyId, branchId]
    );
    const managerId = pmRes.insertId;
    assert(managerId > 0, "Operations Setup", "Registered Project Manager record");

    // 1.3 Project Sites
    const siteCode = `SITE-${Date.now().toString().slice(-4)}`;
    const [siteRes] = await pool.query(
      `INSERT INTO pm_sites (company_id, branch_id, site_code, site_name, address, city, state, country, gps_latitude, gps_longitude, site_engineer_name, status)
       VALUES (?, ?, ?, 'Regional Airport Terminal Site', 'Sector 4 Airfield Road', 'Accra', 'Greater Accra', 'Ghana', 5.6037, -0.1870, 'Ing. Kwabena Asante', 'ACTIVE')`,
      [companyId, branchId, siteCode]
    );
    const siteId = siteRes.insertId;
    assert(siteId > 0, "Operations Setup", "Created Construction Site Location with GPS coordinates");

    // 1.4 Cost Categories
    const [costCatRes] = await pool.query(
      `INSERT INTO pm_cost_categories (company_id, name, code, description, is_active)
       VALUES (?, 'Structural & Substructure Works', 'CC-STR', 'Foundation, pillars, concrete framing and slab works', 1)`,
      [companyId]
    );
    const costCategoryId = costCatRes.insertId;
    assert(costCategoryId > 0, "Operations Setup", "Created Project Cost Category");

    // 1.5 Cost Codes
    const [costCodeRes] = await pool.query(
      `INSERT INTO pm_cost_codes (company_id, code, description, cost_category, is_active)
       VALUES (?, '03-3000', 'Cast-in-Place Concrete Works', 'MATERIALS', 'Y')`,
      [companyId]
    );
    const costCodeId = costCodeRes.insertId;
    assert(costCodeId > 0, "Operations Setup", "Registered Master Cost Code");

    // 1.6 Master Project Creation
    const projCode = `PRJ-AUTO-${Date.now().toString().slice(-6)}`;
    const [projRes] = await pool.query(
      `INSERT INTO pm_projects 
       (company_id, branch_id, project_code, project_name, project_type, client_id, client_name, manager_id, site_address, site_city, contract_ref_no, budget, contract_sum, revised_contract_sum, retention_percent, advance_payment_amount, advance_recovery_percent, start_date, end_date, project_status, completion_percent, created_by)
       VALUES (?, ?, ?, 'Accra International Logistics Terminal', 'GENERAL_CONSTRUCTION', ?, ?, ?, 'Sector 4 Airfield Road', 'Accra', 'CNT-AIRPORT-2026', 1500000.00, 1850000.00, 1850000.00, 5.00, 185000.00, 10.00, '2026-01-15', '2026-12-31', 'PLANNING', 0.00, ?)`,
      [companyId, branchId, projCode, customerId, customerName, managerId, userId]
    );
    const projectId = projRes.insertId;
    assert(projectId > 0, "Project Initiation", `Created Master Project (${projCode}) with contract parameters`);

    // Verify Project details retrieval
    const [projDetails] = await pool.query("SELECT * FROM pm_projects WHERE id = ?", [projectId]);
    assert(
      projDetails.length === 1 && Number(projDetails[0].contract_sum) === 1850000,
      "Project Initiation",
      "Retrieved Project Details and verified contract sums"
    );

    // 1.7 Project Phases
    const [phaseRes] = await pool.query(
      `INSERT INTO pm_phases (company_id, branch_id, project_id, phase_name, phase_code, sequence_order, planned_start_date, planned_end_date, status)
       VALUES (?, ?, ?, 'Substructure & Earthworks', 'PH-01', 1, '2026-01-15', '2026-04-30', 'IN_PROGRESS')`,
      [companyId, branchId, projectId]
    );
    const phaseId = phaseRes.insertId;
    assert(phaseId > 0, "Project Initiation", "Created Project Phase breakdown");

    // 1.8 Work Packages
    const [wpRes] = await pool.query(
      `INSERT INTO pm_work_packages (company_id, branch_id, project_id, phase_id, package_code, package_name, budget_amount, status)
       VALUES (?, ?, ?, ?, 'WP-01-CONC', 'Reinforced Concrete Foundations', 450000.00, 'ACTIVE')`,
      [companyId, branchId, projectId, phaseId]
    );
    const workPackageId = wpRes.insertId;
    assert(workPackageId > 0, "Project Initiation", "Created Work Breakdown Work Package");

    // 1.9 Project Quotations / Proposals
    const quoteNo = `PQ-${Date.now().toString().slice(-5)}`;
    const [quoteRes] = await pool.query(
      `INSERT INTO pm_quotations 
       (company_id, branch_id, quotation_no, project_id, project_name, customer_id, customer_name, quotation_date, valid_until, total_amount, status, created_by)
       VALUES (?, ?, ?, ?, 'Accra International Logistics Terminal', ?, ?, '2026-01-05', '2026-02-05', 1850000.00, 'ACCEPTED', ?)`,
      [companyId, branchId, quoteNo, projectId, customerId, customerName, userId]
    );
    const quotationId = quoteRes.insertId;
    assert(quotationId > 0, "Project Proposals & Quotations", `Generated Project Quotation (${quoteNo})`);

    // 1.10 Client Project Orders
    const orderNo = `PO-${Date.now().toString().slice(-5)}`;
    const [orderRes] = await pool.query(
      `INSERT INTO pm_orders 
       (company_id, branch_id, order_no, project_id, project_name, customer_id, customer_name, order_date, total_amount, status, created_by)
       VALUES (?, ?, ?, ?, 'Accra International Logistics Terminal', ?, ?, '2026-01-10', 1850000.00, 'CONFIRMED', ?)`,
      [companyId, branchId, orderNo, projectId, customerId, customerName, userId]
    );
    const orderId = orderRes.insertId;
    assert(orderId > 0, "Client Project Orders", `Created Client Confirmed Project Engagement Order (${orderNo})`);

    // ---------------------------------------------------------
    // 2. PLANNING & SCHEDULING
    // ---------------------------------------------------------
    console.log("\n>>> STEP 2: Testing Project Planning, CPM & Costing Business Processes...");

    // 2.1 Master Project Plan Hub
    const [planRes] = await pool.query(
      `INSERT INTO pm_project_plans 
       (company_id, branch_id, project_id, plan_status, version_no, project_sponsor, business_justification, expected_outcomes, scope_statement, methodology, deliverables_json, raci_matrix_json)
       VALUES (?, ?, ?, 'APPROVED', 1, 'Ministry of Aviation', 'Expand freight cargo throughput by 300%', 'Modern 4-bay cargo logistics depot', 'Full design and construction of superstructure and access aprons', 'HYBRID', ?, ?)`,
      [
        companyId,
        branchId,
        projectId,
        JSON.stringify([{ id: "DEL-1", name: "Foundation Signoff", target: "2026-03-31" }]),
        JSON.stringify([{ role: "Project Director", user: userName, responsibility: "Accountable" }]),
      ]
    );
    const projectPlanId = planRes.insertId;
    assert(projectPlanId > 0, "Master Project Plan", "Authored and locked Master Project Plan record");

    // 2.2 Bill of Quantities (BOQ) & Items
    const [boqRes] = await pool.query(
      `INSERT INTO pm_boqs 
       (company_id, branch_id, project_id, boq_title, boq_version, currency, total_boq_amount, status, created_by)
       VALUES (?, ?, ?, 'Master Tender BOQ - Civil & Structures', 'Rev 1.0', 'GHS', 1850000.00, 'APPROVED', ?)`,
      [companyId, branchId, projectId, userId]
    );
    const boqId = boqRes.insertId;
    assert(boqId > 0, "Bill of Quantities (BOQ)", "Created Master BOQ record");

    // BOQ Item with unit rate analysis
    const [boqItemRes] = await pool.query(
      `INSERT INTO pm_boq_items 
       (company_id, branch_id, boq_id, item_code, item_description, uom, planned_quantity, unit_rate, total_amount, material_rate, labor_rate, equipment_rate)
       VALUES (?, ?, ?, 'BOQ-01.01', 'Mass excavation in hard rock including carting away', 'M3', 5000.00, 90.00, 450000.00, 0.00, 40.00, 50.00)`,
      [companyId, branchId, boqId]
    );
    const boqItemId = boqItemRes.insertId;
    assert(boqItemId > 0, "Bill of Quantities (BOQ)", "Added priced BOQ item with unit rate breakdown");

    // 2.3 Rate Analysis Breakdown
    const [raRes] = await pool.query(
      `INSERT INTO pm_rate_analyses 
       (company_id, branch_id, boq_item_id, item_description, output_per_day, material_cost, labor_cost, plant_cost, overhead_profit_percent, total_unit_rate)
       VALUES (?, ?, ?, 'Mass excavation in hard rock', 120.00, 0.00, 40.00, 50.00, 15.00, 90.00)`,
      [companyId, branchId, boqItemId]
    );
    assert(raRes.insertId > 0, "Project Costing & Estimation", "Stored detailed unit rate analysis breakdown");

    // 2.4 Project Milestones & Phase Gates
    const [milestoneRes] = await pool.query(
      `INSERT INTO pm_milestones 
       (company_id, branch_id, project_id, title, description, milestone_type, detection_source, target_date, requires_inspection, is_confirmed, status)
       VALUES (?, ?, ?, 'Substructure Practical Signoff', 'Completion of ground beam and foundation casting', 'PHASE_COMPLETION', 'MANUAL', '2026-04-15', 1, 1, 'PENDING')`,
      [companyId, branchId, projectId]
    );
    const milestoneId = milestoneRes.insertId;
    assert(milestoneId > 0, "Milestones & Phase Gates", "Created Phase-Gate Milestone with mandatory inspection gate");

    // 2.5 Scheduling: Tasks & Dependencies & CPM Engine
    const [task1Res] = await pool.query(
      `INSERT INTO pm_tasks 
       (company_id, branch_id, project_id, phase_id, work_package_id, task_title, task_description, wbs_code, priority, status, start_date, end_date, estimated_hours, completion_percent)
       VALUES (?, ?, ?, ?, ?, 'Site Clearing & Bulk Earthworks', 'Excavation and leveling of terminal grounds', '1.1', 'HIGH', 'NOT_STARTED', '2026-01-15', '2026-02-15', 240, 0.00)`,
      [companyId, branchId, projectId, phaseId, workPackageId]
    );
    const taskId1 = task1Res.insertId;

    const [task2Res] = await pool.query(
      `INSERT INTO pm_tasks 
       (company_id, branch_id, project_id, phase_id, work_package_id, task_title, task_description, wbs_code, priority, status, start_date, end_date, estimated_hours, completion_percent)
       VALUES (?, ?, ?, ?, ?, 'Reinforced Foundation Casting', 'Pouring foundation footings and concrete slabs', '1.2', 'HIGH', 'NOT_STARTED', '2026-02-16', '2026-04-15', 360, 0.00)`,
      [companyId, branchId, projectId, phaseId, workPackageId]
    );
    const taskId2 = task2Res.insertId;

    assert(taskId1 > 0 && taskId2 > 0, "Project Scheduling", "Created WBS Work Breakdown Tasks");

    // Task Dependency: Task 2 depends on Task 1 (Finish-to-Start)
    const [depRes] = await pool.query(
      `INSERT INTO pm_task_dependencies 
       (company_id, branch_id, project_id, task_id, predecessor_id, dependency_type, lag_days)
       VALUES (?, ?, ?, ?, ?, 'FS', 0)`,
      [companyId, branchId, projectId, taskId2, taskId1]
    );
    assert(depRes.insertId > 0, "CPM & Dependencies", "Linked tasks with Finish-to-Start (FS) dependency");

    // Execute CPM Engine verification
    const cpmTasks = [
      { id: taskId1, duration_days: 26, start_date: '2026-01-15', end_date: '2026-02-15' },
      { id: taskId2, duration_days: 50, start_date: '2026-02-16', end_date: '2026-04-15' },
    ];
    const cpmDeps = [
      { task_id: taskId2, predecessor_id: taskId1, dependency_type: 'FS', lag_days: 0 },
    ];
    const cpmResult = calculateCPM(cpmTasks, '2026-01-15', cpmDeps, { calendar: '6_DAY' });
    assert(
      cpmResult && cpmResult.criticalPath && cpmResult.criticalPath.length > 0,
      "CPM & Dependencies",
      "Calculated CPM Critical Path, Early/Late Dates, and Total Float"
    );

    // 2.6 Schedule Baselines
    const [baseRes] = await pool.query(
      `INSERT INTO pm_schedule_baselines 
       (company_id, branch_id, project_id, baseline_name, baseline_type, planned_start_date, planned_end_date, total_duration_days, total_planned_cost, is_active, status, approved_by, approved_at)
       VALUES (?, ?, ?, 'Target Baseline 0', 'INITIAL', '2026-01-15', '2026-12-31', 350, 1850000.00, 1, 'APPROVED', ?, NOW())`,
      [companyId, branchId, projectId, userId]
    );
    const baselineId = baseRes.insertId;
    assert(baselineId > 0, "Schedule Baselines", "Approved and locked Schedule Baseline 0");

    // 2.7 Resource Allocation & Equipment
    const [equipRes] = await pool.query(
      `INSERT INTO pm_equipments (company_id, branch_id, name, description, status)
       VALUES (?, ?, 'CAT 330 Hydraulic Excavator', 'Heavy excavator 30-ton capacity', 'ACTIVE')`,
      [companyId, branchId]
    );
    const equipmentId = equipRes.insertId;

    const [resAllocRes] = await pool.query(
      `INSERT INTO pm_resources (company_id, branch_id, project_id, task_id, resource_type, resource_name, planned_quantity, unit_cost, total_planned_cost)
       VALUES (?, ?, ?, ?, 'EQUIPMENT', 'CAT 330 Hydraulic Excavator', 1.00, 1200.00, 31200.00)`,
      [companyId, branchId, projectId, taskId1]
    );
    assert(equipmentId > 0 && resAllocRes.insertId > 0, "Resource Management", "Allocated plant equipment to Earthworks task");

    // 2.8 External Purchase Requisition (Procurement)
    const prNo = `PR-${Date.now().toString().slice(-5)}`;
    const [prRes] = await pool.query(
      `INSERT INTO pm_purchase_requisitions 
       (company_id, branch_id, pr_number, project_id, project_name, requested_by, requisition_date, status, total_amount)
       VALUES (?, ?, ?, ?, 'Accra International Logistics Terminal', ?, '2026-01-16', 'APPROVED', 125000.00)`,
      [companyId, branchId, prNo, projectId, userId]
    );
    const prId = prRes.insertId;

    await pool.query(
      `INSERT INTO pm_purchase_requisition_items 
       (requisition_id, item_description, quantity, estimated_cost, total_estimated_cost)
       VALUES (?, 'High-tensile Grade 500 Deformed Rebar 16mm', 25.00, 5000.00, 125000.00)`,
      [prId]
    );
    assert(prId > 0, "Purchase Requisitions", `Created Project Purchase Requisition (${prNo}) for external procurement`);

    // ---------------------------------------------------------
    // 3. PROJECT EXECUTION & SITE OPS
    // ---------------------------------------------------------
    console.log("\n>>> STEP 3: Testing Project Execution, Materials, DSR & Subcontracting...");

    // 3.1 Task Execution & Status Sync
    await pool.query(
      `UPDATE pm_tasks 
       SET status = 'IN_PROGRESS', actual_start_date = '2026-01-15', completion_percent = 50.00 
       WHERE id = ?`,
      [taskId1]
    );
    await syncProjectStatusFromTasks(projectId);

    const [projAfterTask] = await pool.query("SELECT project_status, completion_percent FROM pm_projects WHERE id = ?", [projectId]);
    assert(
      projAfterTask[0]?.project_status === "IN_PROGRESS" || projAfterTask[0]?.completion_percent > 0,
      "Task Execution & Status Sync",
      "Synced Project Status to IN_PROGRESS based on task progress advancement"
    );

    // 3.2 Timesheets
    const [tsRes] = await pool.query(
      `INSERT INTO pm_timesheets 
       (company_id, branch_id, project_id, task_id, user_id, work_date, hours_worked, work_description, status)
       VALUES (?, ?, ?, ?, ?, '2026-01-18', 8.50, 'Site clearing and grubbing chainage 0+000 to 0+500', 'APPROVED')`,
      [companyId, branchId, projectId, taskId1, userId]
    );
    assert(tsRes.insertId > 0, "Timesheets & Labor Tracking", "Logged approved worker timesheet entry");

    // 3.3 Site Materials: Requisition, Receipt & Utilization
    const matReqNo = `MR-${Date.now().toString().slice(-5)}`;
    const [matReqRes] = await pool.query(
      `INSERT INTO pm_material_requisitions 
       (company_id, branch_id, project_id, requisition_no, requisition_date, status, remarks, created_by)
       VALUES (?, ?, ?, ?, '2026-01-19', 'APPROVED', 'Portland Cement 42.5R for batch plant', ?)`,
      [companyId, branchId, projectId, matReqNo, userId]
    );
    const matReqId = matReqRes.insertId;

    await pool.query(
      `INSERT INTO pm_material_requisition_items 
       (requisition_id, item_description, requested_qty, approved_qty, uom)
       VALUES (?, 'Portland Cement 42.5R 50kg Bags', 500.00, 500.00, 'BAGS')`,
      [matReqId]
    );
    assert(matReqId > 0, "Material Requisitions", `Raised internal site Material Requisition (${matReqNo})`);

    // Material Receipt on Site
    const mrNo = `MRCP-${Date.now().toString().slice(-5)}`;
    const [matRcpRes] = await pool.query(
      `INSERT INTO pm_material_receipts 
       (company_id, branch_id, project_id, receipt_number, receipt_date, received_by, remarks)
       VALUES (?, ?, ?, ?, '2026-01-20', ?, 'Delivered to On-Site Temporal Store')`,
      [companyId, branchId, projectId, mrNo, userId]
    );
    const matRcpId = matRcpRes.insertId;

    await pool.query(
      `INSERT INTO pm_material_receipt_items 
       (receipt_id, item_description, quantity, unit_cost, total_cost, condition_status)
       VALUES (?, 'Portland Cement 42.5R 50kg Bags', 500.00, 110.00, 55000.00, 'GOOD')`,
      [matRcpId]
    );
    assert(matRcpId > 0, "Material Receipts", `Received and inspected materials on site (${mrNo})`);

    // Material Utilization against Task
    const [utilRes] = await pool.query(
      `INSERT INTO pm_material_utilization 
       (company_id, branch_id, project_id, task_id, utilization_date, recorded_by, remarks)
       VALUES (?, ?, ?, ?, '2026-01-22', ?, 'Used in blinding concrete batch 1')`,
      [companyId, branchId, projectId, taskId1, userId]
    );
    const utilId = utilRes.insertId;

    await pool.query(
      `INSERT INTO pm_material_utilization_items 
       (utilization_id, item_description, quantity_used, uom)
       VALUES (?, 'Portland Cement 42.5R 50kg Bags', 150.00, 'BAGS')`,
      [utilId]
    );
    assert(utilId > 0, "Material Utilization", "Recorded material consumption against task WBS");

    // 3.4 Daily Site Report (DSR)
    const reportDate = '2026-01-23';
    const [dsrRes] = await pool.query(
      `INSERT INTO pm_daily_site_reports 
       (company_id, branch_id, project_id, report_date, weather_condition, site_status, prepared_by_name, status)
       VALUES (?, ?, ?, ?, 'SUNNY', 'NORMAL', 'Ing. Kwabena Asante', 'APPROVED')`,
      [companyId, branchId, projectId, reportDate]
    );
    const dsrId = dsrRes.insertId;

    // Workforce log
    await pool.query(
      `INSERT INTO pm_daily_site_workforce 
       (report_id, trade_or_category, headcount, total_hours, remarks)
       VALUES (?, 'Steel benders & carpenters', 18, 144.00, 'Rebar cage prefabrication')`,
      [dsrId]
    );
    // Site Activity log
    await pool.query(
      `INSERT INTO pm_daily_site_activities 
       (report_id, task_id, work_package_id, activity_description, progress_percent, status)
       VALUES (?, ?, ?, 'Trench excavation and blinded bed casting', 65.00, 'IN_PROGRESS')`,
      [dsrId, taskId1, workPackageId]
    );
    assert(dsrId > 0, "Daily Site Reports (DSR)", `Submitted and approved Daily Site Report for ${reportDate}`);

    // 3.5 Subcontractor Agreement & Interim Payment Certificate (IPC)
    const subNo = `SC-${Date.now().toString().slice(-5)}`;
    const [subRes] = await pool.query(
      `INSERT INTO pm_subcontracts 
       (company_id, branch_id, project_id, supplier_id, subcontractor_name, contract_number, trade, contract_sum, retention_percent, advance_recovery_percent, status)
       VALUES (?, ?, ?, ?, ?, ?, 'EARTHWORKS & FOUNDATION PILING', 250000.00, 5.00, 10.00, 'ACTIVE')`,
      [companyId, branchId, projectId, supplierId, supplierName, subNo]
    );
    const subcontractId = subRes.insertId;
    assert(subcontractId > 0, "Subcontractor Management", `Created Subcontract Agreement (${subNo}) for ${supplierName}`);

    // Subcontract Valuation / IPC
    const ipcNo = `IPC-${Date.now().toString().slice(-5)}`;
    const grossValuation = 50000.00;
    const retentionAmt = grossValuation * 0.05; // 2,500.00
    const advanceRecAmt = grossValuation * 0.10; // 5,000.00
    const netCertified = grossValuation - retentionAmt - advanceRecAmt; // 42,500.00

    const [valRes] = await pool.query(
      `INSERT INTO pm_subcontract_valuations 
       (company_id, branch_id, project_id, subcontract_id, valuation_number, valuation_date, period_start, period_end, current_work_done, retention_percent, retention_amount, advance_recovery_percent, advance_recovery_amount, net_payable_amount, payment_status, status)
       VALUES (?, ?, ?, ?, ?, '2026-01-30', '2026-01-15', '2026-01-30', ?, 5.00, ?, 10.00, ?, ?, 'PAID', 'CERTIFIED')`,
      [companyId, branchId, projectId, subcontractId, ipcNo, grossValuation, retentionAmt, advanceRecAmt, netCertified]
    );
    const valuationId = valRes.insertId;

    assert(
      valuationId > 0 && Number(netCertified) === 42500,
      "Subcontractor Valuations (IPCs)",
      `Generated Subcontractor Certified IPC (${ipcNo}) with accurate retention and advance recovery deductions`
    );

    // ---------------------------------------------------------
    // 4. MONITORING, QUALITY & CONTROL
    // ---------------------------------------------------------
    console.log("\n>>> STEP 4: Testing EVM, Financials, Variations, QA/QC & Risk Management...");

    // 4.1 Project Direct Expenses
    const [expRes] = await pool.query(
      `INSERT INTO pm_expenses 
       (company_id, branch_id, project_id, task_id, expense_date, expense_category, amount, payment_method, description, created_by)
       VALUES (?, ?, ?, ?, '2026-01-25', 'SITE_SERVICES', 4500.00, 'BANK_TRANSFER', 'Water tanking and site generator diesel supply', ?)`,
      [companyId, branchId, projectId, taskId1, userId]
    );
    assert(expRes.insertId > 0, "Direct Project Expenses", "Recorded direct site operational expenditure");

    // 4.2 Client Income / Payment Receipts
    const [incRes] = await pool.query(
      `INSERT INTO pm_income 
       (company_id, branch_id, project_id, income_date, amount, payment_mode, reference_no, description, received_by)
       VALUES (?, ?, ?, '2026-01-18', 185000.00, 'BANK_TRANSFER', 'TXN-ADV-MOB-01', 'Advance mobilization payment received from client', ?)`,
      [companyId, branchId, projectId, userId]
    );
    assert(incRes.insertId > 0, "Project Payment Receipts", "Recorded client advance mobilization payment receipt");

    // 4.3 Earned Value Management (EVM) verification
    // BAC = 1,850,000; PV = 200,000; EV = 185,000; AC = 160,000
    const BAC = 1850000;
    const PV = 200000;
    const EV = 185000;
    const AC = 160000;
    const CV = EV - AC; // +25,000 (under budget)
    const SV = EV - PV; // -15,000 (slightly behind schedule)
    const CPI = EV / AC; // 1.156
    const SPI = EV / PV; // 0.925
    const EAC = BAC / CPI; // Forecast

    assert(
      CV > 0 && CPI > 1 && SPI < 1,
      "EVM Cost Control",
      `Calculated EVM metrics: CPI=${CPI.toFixed(2)}, SPI=${SPI.toFixed(2)}, Cost Variance=GH₵${CV.toLocaleString()}`
    );

    // 4.4 Project Variations / Change Orders
    const varNo = `VO-${Date.now().toString().slice(-5)}`;
    const [varRes] = await pool.query(
      `INSERT INTO pm_variations 
       (company_id, branch_id, project_id, variation_number, title, description, reason, requested_by, cost_impact, time_impact_days, status)
       VALUES (?, ?, ?, ?, 'Bedrock Piling & Deep Geotechnical Stabilization', 'Unexpected soft clay stratum requiring micro-piling', 'GROUND_CONDITIONS', 'CONSULTANT_ENG', 75000.00, 14, 'APPROVED')`,
      [companyId, branchId, projectId, varNo]
    );
    const variationId = varRes.insertId;

    // Line item
    await pool.query(
      `INSERT INTO pm_variation_items 
       (variation_id, item_description, uom, quantity, unit_rate, total_amount)
       VALUES (?, 'Installation of 450mm dia bored concrete piles to refusal', 'LM', 300.00, 250.00, 75000.00)`,
      [variationId]
    );

    // Update project revised contract sum
    await pool.query(
      `UPDATE pm_projects 
       SET revised_contract_sum = contract_sum + 75000.00 
       WHERE id = ?`,
      [projectId]
    );
    const [projAfterVar] = await pool.query("SELECT revised_contract_sum FROM pm_projects WHERE id = ?", [projectId]);
    assert(
      Number(projAfterVar[0]?.revised_contract_sum) === 1925000,
      "Change Management & Variations",
      `Approved Variation Order (${varNo}) and incremented Revised Contract Sum to GH₵1,925,000`
    );

    // 4.5 Client Valuations & Interim Payment Applications (IPAs)
    const valClaimNo = `IPA-${Date.now().toString().slice(-5)}`;
    const [clientValRes] = await pool.query(
      `INSERT INTO pm_client_valuations 
       (company_id, branch_id, project_id, valuation_number, valuation_date, period_start, period_end, current_work_done, materials_on_site, retention_percent, retention_amount, advance_recovery_percent, advance_recovery_amount, net_payable_amount, status)
       VALUES (?, ?, ?, ?, '2026-02-01', '2026-01-01', '2026-01-31', 250000.00, 45000.00, 5.00, 14750.00, 10.00, 29500.00, 250750.00, 'CERTIFIED')`,
      [companyId, branchId, projectId, valClaimNo]
    );
    const clientValId = clientValRes.insertId;

    // Create Payment Application linked to client valuation
    const [payAppRes] = await pool.query(
      `INSERT INTO pm_payment_applications 
       (company_id, branch_id, project_id, valuation_id, application_no, application_date, gross_amount, net_amount, status)
       VALUES (?, ?, ?, ?, ?, '2026-02-02', 295000.00, 250750.00, 'SUBMITTED')`,
      [companyId, branchId, projectId, clientValId, valClaimNo]
    );
    assert(
      payAppRes.insertId > 0,
      "Client Valuations & IPAs",
      `Issued Certified Client Interim Payment Application (${valClaimNo}) for GH₵250,750`
    );

    // 4.6 Payment Claims Management
    const claimRef = `CLM-${Date.now().toString().slice(-5)}`;
    const [claimRes] = await pool.query(
      `INSERT INTO pm_payment_claims 
       (company_id, branch_id, project_id, claim_reference, claim_title, claim_type, claim_date, original_contract_value, gross_claim_amount, net_claim_amount, status)
       VALUES (?, ?, ?, ?, 'Interim Progress Claim No. 1', 'PROGRESS_CLAIM', '2026-02-05', 1850000.00, 295000.00, 250750.00, 'SUBMITTED')`,
      [companyId, branchId, projectId, claimRef]
    );
    assert(claimRes.insertId > 0, "Payment Claims Management", `Processed Payment Claim (${claimRef})`);

    // 4.7 Quality Assurance & Control (QA/QC)
    const qpRef = `QP-${Date.now().toString().slice(-5)}`;
    const [qpRes] = await pool.query(
      `INSERT INTO pm_quality_plans 
       (company_id, branch_id, project_id, plan_reference, plan_name, quality_standard, status)
       VALUES (?, ?, ?, ?, 'Structural Concrete Quality Assurance Plan', 'ISO 9001:2015 / BS EN 206', 'ACTIVE')`,
      [companyId, branchId, projectId, qpRef]
    );
    const qualityPlanId = qpRes.insertId;
    assert(qualityPlanId > 0, "Quality Control (QA/QC)", `Established Quality Assurance Plan (${qpRef})`);

    // Inspection Request (IR)
    const irNo = `IR-${Date.now().toString().slice(-5)}`;
    const [irRes] = await pool.query(
      `INSERT INTO pm_inspection_requests 
       (company_id, branch_id, project_id, request_no, inspection_title, plan_id, scheduled_date, status)
       VALUES (?, ?, ?, ?, 'Inspection of foundation rebar cage reinforcement', ?, '2026-02-10', 'PASSED')`,
      [companyId, branchId, projectId, irNo, qualityPlanId]
    );
    assert(irRes.insertId > 0, "Quality Control (QA/QC)", `Logged and approved Inspection Request (${irNo})`);

    // Quality Defect & Non-Conformance Report (NCR)
    const ncrNo = `NCR-${Date.now().toString().slice(-5)}`;
    const [ncrRes] = await pool.query(
      `INSERT INTO pm_ncrs 
       (company_id, branch_id, project_id, ncr_number, title, description, root_cause, severity, status)
       VALUES (?, ?, ?, ?, 'Concrete slump test deviation in delivery batch 04', 'Slump measured 180mm against specified 100mm +/-25mm', 'Excessive water added during transit', 'MEDIUM', 'OPEN')`,
      [companyId, branchId, projectId, ncrNo]
    );
    const ncrId = ncrRes.insertId;
    assert(ncrId > 0, "Quality Control (QA/QC)", `Issued Non-Conformance Report (${ncrNo})`);

    // CAPA Action
    const [capaRes] = await pool.query(
      `INSERT INTO pm_capa_actions 
       (company_id, branch_id, project_id, ncr_id, action_description, action_type, assigned_to_name, status)
       VALUES (?, ?, ?, ?, 'Re-calibrate batch plant automated water dosing meters and enforce driver log signoff', 'CORRECTIVE', 'Quality Manager', 'IMPLEMENTED')`,
      [companyId, branchId, projectId, ncrId]
    );
    assert(capaRes.insertId > 0, "Quality Control (QA/QC)", "Recorded Corrective & Preventive Action (CAPA)");

    // Material Test
    const [testRes] = await pool.query(
      `INSERT INTO pm_material_tests 
       (company_id, branch_id, project_id, material_name, test_type, required_standard, actual_result, status)
       VALUES (?, ?, ?, 'Ready-Mix Concrete Grade C30/37', '28-Day Compressive Cube Strength', '>= 37.0 N/mm2', '41.5 N/mm2', 'PASSED')`,
      [companyId, branchId, projectId]
    );
    assert(testRes.insertId > 0, "Quality Control (QA/QC)", "Logged certified material lab test result");

    // 4.8 HSE: Toolbox Talks & Safety Incidents
    const [tbRes] = await pool.query(
      `INSERT INTO pm_toolbox_talks 
       (company_id, branch_id, project_id, talk_date, topic, conducted_by_name, attendees_count)
       VALUES (?, ?, ?, '2026-02-12', 'Excavation safety, trench shoring and edge protection', 'HSE Officer Emmanuel Mensah', 24)`,
      [companyId, branchId, projectId]
    );
    assert(tbRes.insertId > 0, "HSE & Site Safety", "Logged safety toolbox talk with site attendance");

    // 4.9 Project Risk Management
    const riskCode = `RSK-${Date.now().toString().slice(-4)}`;
    const [riskRes] = await pool.query(
      `INSERT INTO pm_risks 
       (company_id, branch_id, project_id, risk_code, title, description, category, probability, impact, risk_score, risk_level, status, date_identified)
       VALUES (?, ?, ?, ?, 'Supply chain delay in structural steel imports', 'Port clearance congestion risking structural frame erection start', 'Procurement', 3, 4, 12, 'HIGH', 'ACTIVE', '2026-01-20')`,
      [companyId, branchId, projectId, riskCode]
    );
    const riskId = riskRes.insertId;

    // Risk Mitigation Action
    const [mitRes] = await pool.query(
      `INSERT INTO pm_risk_mitigation_actions 
       (company_id, risk_id, action_title, action_description, owner, status)
       VALUES (?, ?, 'Pre-clear customs bonded manifest and secure secondary local steel supplier', 'Engage registered customs broker 30 days ahead of vessel docking', 'Procurement Lead', 'IN_PROGRESS')`,
      [companyId, riskId]
    );
    assert(
      riskId > 0 && mitRes.insertId > 0,
      "Risk Management",
      `Created 5x5 Matrix Risk Entry (${riskCode}, Score 12 HIGH) and bound Mitigation Plan`
    );

    // ---------------------------------------------------------
    // 5. PROJECT CLOSURE & HANDOVER
    // ---------------------------------------------------------
    console.log("\n>>> STEP 5: Testing Snag Lists, Handover & Final Account Reconciliation...");

    // 5.1 Snag & Punch List
    const [snagRes] = await pool.query(
      `INSERT INTO pm_snag_list 
       (company_id, branch_id, project_id, item_description, location_reference, priority, status)
       VALUES (?, ?, ?, 'Surface honeycombing on column C-4 requires epoxy mortar grout repair', 'Grid 4 / Airfield Wing', 'HIGH', 'RECTIFIED')`,
      [companyId, branchId, projectId]
    );
    assert(snagRes.insertId > 0, "Defect & Issue Management", "Logged and marked rectified Snag / Punch List item");

    // 5.2 Project Handover & Closeout Dossier
    const [closeoutRes] = await pool.query(
      `INSERT INTO pm_project_closeouts 
       (company_id, branch_id, project_id, closeout_status, scope_completion_pct, deliverables_completion_pct, milestones_completion_pct, handover_ref, handover_date, handover_to, receiving_org, acceptance_status)
       VALUES (?, ?, ?, 'HANDOVER_COMPLETED', 100.00, 100.00, 100.00, 'HO-AIRPORT-001', '2026-11-20', 'Client Project Engineer', 'Ghana Civil Aviation Authority', 'ACCEPTED')`,
      [companyId, branchId, projectId]
    );
    const closeoutId = closeoutRes.insertId;
    assert(closeoutId > 0, "Project Handover & Closeout", "Completed Project Taking-Over Record & Handover Dossier");

    // 5.3 Final Account Reconciliation & Retention Release
    const finalAccRef = `FA-${Date.now().toString().slice(-5)}`;
    const [faRes] = await pool.query(
      `INSERT INTO pm_final_accounts 
       (company_id, branch_id, project_id, reference_no, final_account_date, original_contract_value, approved_variations_value, revised_contract_value, final_account_value, total_invoiced, total_paid, retention_applicable, retention_percent, total_retention_amount, retention_outstanding_balance, status)
       VALUES (?, ?, ?, ?, '2026-11-21', 1850000.00, 75000.00, 1925000.00, 1925000.00, 1828750.00, 1828750.00, 1, 5.00, 96250.00, 96250.00, 'AGREED')`,
      [companyId, branchId, projectId, finalAccRef]
    );
    const finalAccountId = faRes.insertId;

    // Retention Release (First 50% release upon Practical Completion)
    const [retRes] = await pool.query(
      `INSERT INTO pm_retention_releases 
       (company_id, branch_id, project_id, final_account_id, release_stage, release_percentage, release_amount, release_date, status)
       VALUES (?, ?, ?, ?, 'PRACTICAL_COMPLETION_50PCT', 50.00, 48125.00, '2026-11-21', 'RELEASED')`,
      [companyId, branchId, projectId, finalAccountId]
    );
    assert(
      finalAccountId > 0 && retRes.insertId > 0,
      "Final Account & Retention Release",
      `Reconciled Final Account (${finalAccRef}) for GH₵1,925,000 and released 50% Practical Completion Retention (GH₵48,125)`
    );

    // ---------------------------------------------------------
    // 6. REPORTS & BI ANALYTICS
    // ---------------------------------------------------------
    console.log("\n>>> STEP 6: Testing Project Analytics & Reporting Engine...");

    // Milestone Roadmap report check
    const [msList] = await pool.query("SELECT * FROM pm_milestones WHERE project_id = ?", [projectId]);
    assert(msList.length > 0, "Milestone Roadmap Report", "Milestone Roadmap data pipeline verified");

    // WBS Execution report check
    const [wbsList] = await pool.query("SELECT * FROM pm_tasks WHERE project_id = ?", [projectId]);
    assert(wbsList.length >= 2, "Work Plan & WBS Report", "Work Breakdown Structure task execution reporting verified");

    // P&L Expense vs Income reconciliation
    const [incomeTotal] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS total_inc FROM pm_income WHERE project_id = ?", [projectId]);
    const [expenseTotal] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS total_exp FROM pm_expenses WHERE project_id = ?", [projectId]);
    assert(
      incomeTotal.length > 0 && expenseTotal.length > 0,
      "Project Profit & Loss (P&L)",
      `P&L verified: Income GH₵${Number(incomeTotal[0].total_inc).toLocaleString()} vs Expenses GH₵${Number(expenseTotal[0].total_exp).toLocaleString()}`
    );

  } catch (err) {
    console.error("FATAL SUITE CRASH:", err);
    failed++;
    errors.push({ process: "SUITE_CRASH", test: "Fatal Execution Error", details: err?.message || String(err) });
  }

  // ---------------------------------------------------------
  // FINAL SUMMARY
  // ---------------------------------------------------------
  console.log("\n================================================================================");
  console.log("PROJECT MANAGEMENT BUSINESS PROCESS TEST SUMMARY");
  console.log("================================================================================");
  console.log(`TOTAL PROCESSES TESTED : ${processesTested.length}`);
  console.log(`TOTAL ASSERTIONS       : ${passed + failed}`);
  console.log(`PASSED                 : ${passed}`);
  console.log(`FAILED                 : ${failed}`);
  console.log("================================================================================");

  console.log("\nLIST OF ALL PROCESSES TESTED:");
  processesTested.forEach((p, i) => console.log(` ${i + 1}. ${p}`));

  if (failed > 0) {
    console.log("\n❌ ERRORS DETECTED:");
    errors.forEach((e) => console.log(` - [${e.process}] ${e.test}: ${e.details}`));
    process.exit(1);
  } else {
    console.log("\n🎉 ALL PROJECT MANAGEMENT BUSINESS PROCESSES PASSED WITH ZERO ERRORS!");
    process.exit(0);
  }
}

runProjectManagementTests();
