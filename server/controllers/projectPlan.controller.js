/**
 * @file projectPlan.controller.js
 * @description Enterprise Project Plan & Master Coordination Center Controller.
 * Implements the 10-phase project planning specification:
 * - Coordinates Overview, Objectives, Scope Definition, WBS, Deliverables,
 *   Execution Strategy, RACI Matrix, Schedule & Budget Summaries, and Supporting Plans.
 * - Integrates with existing pm_projects, pm_tasks, pm_boqs, pm_resources, pm_risks,
 *   pm_quality_plans, pm_documents, and baseline engines.
 * - Manages approval workflows, immutable historical baselines, and AI intelligence analysis.
 */

import { query } from "../db/pool.js";
import { httpError } from "../utils/httpError.js";
import { ensureProjectPlanTables } from "../utils/projectPlanTables.js";

function toNumber(v, fallback = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseJsonSafe(val, fallback = null) {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

/**
 * 1. GET /projects/projects/:id/plan
 * Retrieves consolidated Master Project Plan data, combining pm_project_plans
 * with live authoritative records across all connected modules.
 */
export const getProjectPlan = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const projectId = toNumber(req.params.id);
    if (!projectId) throw httpError(400, "VALIDATION_ERROR", "Invalid Project ID");

    await ensureProjectPlanTables();

    // 1. Fetch Project Master Record
    const projectRows = await query(
      `SELECT p.*,
              u.full_name AS manager_fullname, u.email AS manager_email
       FROM pm_projects p
       LEFT JOIN adm_users u ON u.id = p.manager_id
       WHERE p.id = :projectId AND (p.company_id = :companyId OR :companyId IS NULL OR p.company_id = 0) LIMIT 1`,
      { projectId, companyId },
    );
    if (!projectRows.length) {
      throw httpError(404, "NOT_FOUND", "Project not found");
    }
    const project = projectRows[0];

    // Parse project JSON fields
    project.project_scopes = parseJsonSafe(project.project_scopes, []);
    project.team_members = parseJsonSafe(project.team_members, []);
    project.attachments = parseJsonSafe(project.attachments, []);

    // 2. Fetch or Initialize Master Plan Record
    let planRows = await query(
      `SELECT * FROM pm_project_plans
       WHERE project_id = :projectId AND company_id = :companyId LIMIT 1`,
      { projectId, companyId },
    );

    let plan = null;
    if (!planRows.length) {
      // Seed default plan structure from project master data
      const defaultObjectives = [
        {
          id: 1,
          title: "Achieve Specified Quality & Operational Readiness",
          description: project.remarks || "Deliver all contracted scope packages in full compliance with drawings and client acceptance standards.",
          criteria: "100% acceptance on final inspection; zero critical non-conformances.",
          targetOutcome: "Formal Client Acceptance Certificate & Handover",
          deliverables: "Core Work Packages",
        },
      ];

      const defaultPhases = [
        {
          id: 1,
          phase_name: "Phase 1: Project Initiation & Setup",
          description: "Establish project charter, stakeholder alignment, site mobilization, and initial baselines.",
          planned_start: project.start_date || null,
          planned_end: null,
          responsible_person: project.manager_name || "Project Manager",
          status: "IN_PROGRESS",
          deliverables: "Approved Charter, Mobilization Report",
        },
        {
          id: 2,
          phase_name: "Phase 2: Detailed Planning & Engineering",
          description: "Finalize technical specifications, Work Plan/WBS hierarchy, procurement schedules, and execution contracts.",
          planned_start: null,
          planned_end: null,
          responsible_person: project.manager_name || "Technical Lead",
          status: "PLANNED",
          deliverables: "Detailed Schedule Baseline, Approved Submittals",
        },
        {
          id: 3,
          phase_name: "Phase 3: Execution & Construction",
          description: "Deliver physical work packages, milestone trade delivery, and daily site operations.",
          planned_start: null,
          planned_end: null,
          responsible_person: project.manager_name || "Site Lead",
          status: "PLANNED",
          deliverables: "Completed Works, Inspection Approvals",
        },
        {
          id: 4,
          phase_name: "Phase 4: Commissioning, Handover & Closeout",
          description: "Execute snagging punchlists, final accounts, statutory approvals, and client handover.",
          planned_start: null,
          planned_end: project.end_date || null,
          responsible_person: project.manager_name || "Project Manager",
          status: "PLANNED",
          deliverables: "Final Completion Certificate, As-Built Records",
        },
      ];

      const defaultManagementPlans = {
        risk: {
          approach: "Continuous proactive identification, qualitative assessment, and milestone reassessments in accordance with enterprise risk matrix.",
          identificationMethod: "Daily site inspections, contractor submittals review, and bi-weekly risk log reviews.",
          assessmentApproach: "5x5 Likelihood and Impact scoring evaluating Cost, Schedule, Safety, and Reputation.",
          responseStrategy: "Mitigation, Avoidance, Transfer through insurance/subcontract terms, and residual risk acceptance.",
          monitoringApproach: "Weekly risk register audit by Project Manager with automatic alerts on critical scores >= 15.",
        },
        quality: {
          objectives: "Deliver zero-defect handover complying with ISO 9001:2015 and approved project specifications.",
          standards: "ISO 9001:2015, National Building Standards, and Contract Architectural/Engineering Specifications.",
          qaApproach: "Pre-qualification of vendors, material approval requests (MAR), and pre-pour/pre-installation hold-point checklists.",
          qcApproach: "On-site inspection requests (IR), third-party laboratory material testing, and NCR resolution workflows.",
          inspectionStrategy: "Mandatory witness points at key milestones before proceeding with subsequent work packages.",
          acceptanceRequirements: "Signed Inspection Requests by supervising consultant with 100% sign-off on punch lists.",
        },
        procurement: {
          strategy: "Direct strategic sourcing for bulk materials; competitive bidding for trade subcontractors.",
          majorRequirements: "Structural materials, high-spec plant equipment, architectural finishes, and specialized trade subcontracting.",
          longLeadItems: "Heavy machinery rentals, structural steel fabrication, custom switchgear, and imported finishes.",
          supplierApproach: "Approved vendor list with rigorous delivery lead-time verification and milestone-linked payment claims.",
        },
        communication: {
          stakeholders: "Project Sponsor, Lead Client Representative, Project Manager, Site Supervisors, Subcontractors, and Regulatory Inspectors.",
          objectives: "Ensure transparent, real-time dissemination of progress, variations, risks, and financial claims.",
          methods: "Weekly formal coordination meetings, automated ERP milestone alerts, daily site logbooks, and monthly executive dashboards.",
          frequency: "Daily site briefings; Weekly contractor reviews; Monthly executive steering board.",
          escalationChannels: "Site Supervisor → Project Manager → Operations Director → Steering Committee.",
        },
        hse: {
          objectives: "Zero Lost Time Injuries (LTI), zero environmental spills, and 100% compliance with OSHA / EPA regulations.",
          environmentalRequirements: "Responsible waste segregation, dust suppression, noise mitigation, and stormwater pollution prevention.",
          regulations: "National Occupational Safety & Health Act, EPA Environmental Quality Standards.",
          emergencyPreparedness: "First aid stations on-site, trained emergency response wardens, certified fire extinguishers, and direct emergency hospital hotline.",
          siteSafetyApproach: "Mandatory daily toolbox talks, 100% PPE enforcement, and incident root-cause investigations.",
        },
      };

      const defaultScopeDefinition = {
        statement: project.remarks || "Comprehensive turnkey project delivery in accordance with approved architectural drawings, structural engineering specifications, and client requirements.",
        includedActivities: "Site preparation, foundation works, structural assembly, MEP installations, architectural finishes, testing, commissioning, and final defect rectification.",
        excludedActivities: "Post-handover facility operation, client-supplied specialized equipment, and statutory municipal zoning fees unless specified.",
        assumptions: "Unrestricted site access during standard working hours; timely client review of engineering submittals within 7 business days; prompt progress claim certifications.",
        constraints: "Strict completion deadline; working within approved baseline budget ceiling; environmental noise restrictions during night hours.",
        boundaries: "Delimited physical site boundaries; contract boundary limits defined in Specification Appendix A.",
        acceptanceCriteria: "Formal inspection sign-off on all work packages, zero unresolved critical punchlist items, and issuance of Practical Completion Certificate.",
      };

      const defaultDeliverables = (project.project_scopes || []).map((sc, idx) => ({
        id: idx + 1,
        name: sc.scope_name || sc.name || `Key Deliverable #${idx + 1}`,
        description: sc.scope_description || sc.description || "Primary project deliverable",
        wbs_code: sc.wbs_code || `${idx + 1}.0`,
        responsible_person: project.manager_name || "Project Lead",
        planned_completion: sc.due_date || sc.end_date || project.end_date || null,
        acceptance_criteria: "100% compliance with quality specifications and signed acceptance sheet.",
        status: sc.status || "PLANNED",
      }));

      // Insert initial plan row
      await query(
        `INSERT INTO pm_project_plans
         (company_id, branch_id, project_id, plan_status, version_no,
          project_sponsor, business_justification, expected_outcomes, project_classification, project_location,
          objectives_json, scope_statement, included_activities, excluded_activities, assumptions, constraints, project_boundaries, acceptance_criteria,
          deliverables_json, methodology, methodology_description, methodology_justification, delivery_approach, key_execution_considerations,
          phases_json, raci_matrix_json, resource_strategy_json,
          risk_plan_json, quality_plan_json, procurement_plan_json, communication_plan_json, hse_plan_json)
         VALUES
         (:companyId, :branchId, :projectId, 'DRAFT', 1,
          :sponsor, :justification, :outcomes, :classification, :location,
          :objectivesJson, :scopeStatement, :included, :excluded, :assumptions, :constraints, :boundaries, :acceptanceCriteria,
          :deliverablesJson, 'HYBRID', :methodologyDesc, :methodologyJust, :deliveryApproach, :executionConsiderations,
          :phasesJson, :raciJson, :resourceStrategyJson,
          :riskJson, :qualityJson, :procurementJson, :commJson, :hseJson)`,
        {
          companyId,
          branchId,
          projectId,
          sponsor: project.client_name || "Enterprise Sponsor",
          justification: "Strategic enterprise initiative providing high operational return and client value.",
          outcomes: "Fully certified and operational facility / system meeting all statutory and performance thresholds.",
          classification: "CAPITAL_INFRASTRUCTURE",
          location: project.site_address || "Standard Project Location",
          objectivesJson: JSON.stringify(defaultObjectives),
          scopeStatement: defaultScopeDefinition.statement,
          included: defaultScopeDefinition.includedActivities,
          excluded: defaultScopeDefinition.excludedActivities,
          assumptions: defaultScopeDefinition.assumptions,
          constraints: defaultScopeDefinition.constraints,
          boundaries: defaultScopeDefinition.boundaries,
          acceptanceCriteria: defaultScopeDefinition.acceptanceCriteria,
          deliverablesJson: JSON.stringify(defaultDeliverables),
          methodologyDesc: "Hybrid waterfall-phased construction delivery combined with agile work-package sprint tracking.",
          methodologyJust: "Provides predictable stage-gate milestones with adaptive site execution.",
          deliveryApproach: "Integrated EPC (Engineering, Procurement, and Construction) management with centralized ERP cost and schedule control.",
          executionConsiderations: "Critical path scheduling, long-lead procurement coordination, and subcontractor interfaces.",
          phasesJson: JSON.stringify(defaultPhases),
          raciJson: JSON.stringify([]),
          resourceStrategyJson: JSON.stringify({
            laborApproach: "Dedicated internal supervisory engineering staff augmented with trade artisan labor.",
            equipmentApproach: "Core company plant supplemented with specialized equipment rentals on dynamic work packages.",
            materialsApproach: "Bulk advance procurement for structural items; JIT delivery for finished trade materials.",
            subcontractorApproach: "Specialist trade subcontractors managed under rigorous milestone quality covenants.",
          }),
          riskJson: JSON.stringify(defaultManagementPlans.risk),
          qualityJson: JSON.stringify(defaultManagementPlans.quality),
          procurementJson: JSON.stringify(defaultManagementPlans.procurement),
          commJson: JSON.stringify(defaultManagementPlans.communication),
          hseJson: JSON.stringify(defaultManagementPlans.hse),
        },
      );

      planRows = await query(
        `SELECT * FROM pm_project_plans
         WHERE project_id = :projectId AND company_id = :companyId LIMIT 1`,
        { projectId, companyId },
      );
    }

    plan = planRows[0];
    plan.objectives = parseJsonSafe(plan.objectives_json, []);
    plan.deliverables = parseJsonSafe(plan.deliverables_json, []);
    plan.phases = parseJsonSafe(plan.phases_json, []);
    plan.raci_matrix = parseJsonSafe(plan.raci_matrix_json, []);
    plan.resource_strategy = parseJsonSafe(plan.resource_strategy_json, {});
    plan.management_plans = {
      risk: parseJsonSafe(plan.risk_plan_json, {}),
      quality: parseJsonSafe(plan.quality_plan_json, {}),
      procurement: parseJsonSafe(plan.procurement_plan_json, {}),
      communication: parseJsonSafe(plan.communication_plan_json, {}),
      hse: parseJsonSafe(plan.hse_plan_json, {}),
    };
    plan.approved_baseline = parseJsonSafe(plan.approved_baseline_json, null);

    // 3. Consolidated Live Module Summaries (Authoritative Source Data)
    const [tasksRows, milestonesRows, boqRows, resourcesRows, risksRows, qualityRows, docsRows, docRevisionsRows, historyRows] =
      await Promise.all([
        // Tasks
        query(
          `SELECT id, task_title, wbs_code, scope_name, scope_id, priority, status, start_date, end_date,
                  estimated_hours, actual_hours, completion_percent, is_critical, assigned_to_name, reason_for_delay
           FROM pm_tasks
           WHERE project_id = :projectId AND company_id = :companyId AND (is_active = 'Y' OR is_active IS NULL)
           ORDER BY wbs_code ASC, id ASC`,
          { projectId, companyId },
        ).catch(() => []),

        // Milestones
        query(
          `SELECT id, title, due_date, completion_date, status, remarks
           FROM pm_milestones
           WHERE project_id = :projectId AND company_id = :companyId
           ORDER BY due_date ASC, id ASC`,
          { projectId, companyId },
        ).catch(() => []),

        // BOQs / Cost Estimates
        query(
          `SELECT b.id, COALESCE(b.boq_reference, b.estimate_number) AS boq_number,
                  COALESCE(b.estimate_title, b.boq_title) AS title, b.status,
                  COALESCE(b.total_amount, b.total_cost_estimate, 0) AS total_estimated_cost, b.currency,
                  COALESCE(b.contingency_amount, 0) AS contingency_cost
           FROM pm_boqs b
           WHERE b.project_id = :projectId AND (b.company_id = :companyId OR :companyId IS NULL OR b.company_id = 0)
           ORDER BY b.id DESC LIMIT 1`,
          { projectId, companyId },
        ).catch(() => []),

        // Resources
        query(
          `SELECT r.id, r.resource_name, r.resource_type, r.allocated_qty, r.status, r.start_date, r.end_date,
                  r.accountable_user_name
           FROM pm_resources r
           WHERE r.project_id = :projectId AND r.company_id = :companyId AND (r.is_active = 1 OR r.is_active IS NULL)
           ORDER BY r.id DESC`,
          { projectId, companyId },
        ).catch(() => []),

        // Risks
        query(
          `SELECT id, risk_code, title, category, inherent_level, inherent_score, residual_level,
                  risk_owner, treatment_strategy AS response_strategy, status
           FROM pm_risks
           WHERE project_id = :projectId AND company_id = :companyId
           ORDER BY inherent_score DESC, id DESC`,
          { projectId, companyId },
        ).catch(() => []),

        // Quality Plans & Inspections
        query(
          `SELECT id, plan_reference, plan_name, quality_standard, status
           FROM pm_quality_plans
           WHERE project_id = :projectId AND company_id = :companyId
           ORDER BY id DESC`,
          { projectId, companyId },
        ).catch(() => []),

        // Documents
        query(
          `SELECT d.id, d.title, d.doc_category, d.category, d.document_number, d.doc_number,
                  d.current_revision, d.file_url, d.created_at, d.updated_at, d.status,
                  d.uploaded_by, d.attachments_json
           FROM pm_documents d
           WHERE d.project_id = :projectId AND d.company_id = :companyId
           ORDER BY d.id DESC LIMIT 50`,
          { projectId, companyId },
        ).catch(() => []),

        // Document Revisions
        query(
          `SELECT r.id, r.document_id, r.revision_no, r.revision_date, r.change_description,
                  r.file_url, r.uploaded_by, r.created_at
           FROM pm_document_revisions r
           JOIN pm_documents d ON d.id = r.document_id
           WHERE d.project_id = :projectId AND d.company_id = :companyId
           ORDER BY r.id DESC`,
          { projectId, companyId },
        ).catch(() => []),

        // Baseline History
        query(
          `SELECT h.id, h.version_no, h.plan_status, h.change_summary, h.approved_by_name, h.approved_at, h.created_at
           FROM pm_project_plan_history h
           WHERE h.project_id = :projectId AND h.company_id = :companyId
           ORDER BY h.version_no DESC, h.id DESC`,
          { projectId, companyId },
        ).catch(() => []),
      ]);

    // Live Metrics Calculations
    const today = new Date().toISOString().split("T")[0];
    const totalTasks = tasksRows.length;
    const completedTasks = tasksRows.filter(
      (t) => t.status === "COMPLETED" || Number(t.completion_percent || 0) >= 100,
    ).length;
    const inProgressTasks = tasksRows.filter(
      (t) => t.status === "IN_PROGRESS" && Number(t.completion_percent || 0) < 100,
    ).length;
    const pendingTasks = tasksRows.filter((t) => t.status === "PENDING").length;
    const overdueTasks = tasksRows.filter((t) => {
      const isDone = t.status === "COMPLETED" || Number(t.completion_percent || 0) >= 100;
      if (isDone) return false;
      const due = t.end_date;
      return due && String(due).split("T")[0] < today;
    }).length;

    let totalEstHours = 0;
    let totalActHours = 0;
    tasksRows.forEach((t) => {
      totalEstHours += Number(t.estimated_hours || 0);
      totalActHours += Number(t.actual_hours || 0);
    });

    const activeBOQ = boqRows[0] || null;

    // Schedule Summary
    const scheduleSummary = {
      plannedStartDate: project.start_date || null,
      plannedCompletionDate: project.end_date || null,
      actualStartDate: project.actual_start_date || null,
      actualCompletionDate: project.actual_end_date || null,
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      overdueTasks,
      criticalPathCount: tasksRows.filter((t) => Boolean(t.is_critical)).length,
      totalEstHours,
      totalActHours,
    };

    // Budget Summary
    const budgetSummary = {
      budgetBaseline: Number(project.budget || 0),
      currency: project.currency || "GHS",
      hasBOQ: Boolean(activeBOQ),
      boqNumber: activeBOQ?.boq_number || null,
      estimatedTotalCost: Number(activeBOQ?.total_estimated_cost || project.budget || 0),
      laborCost: Number(activeBOQ?.labor_cost || 0),
      materialCost: Number(activeBOQ?.material_cost || 0),
      equipmentCost: Number(activeBOQ?.equipment_cost || 0),
      subcontractorCost: Number(activeBOQ?.subcontractor_cost || 0),
      overheadCost: Number(activeBOQ?.overhead_cost || 0),
      contingencyCost: Number(activeBOQ?.contingency_cost || 0),
    };

    // Deliverables Summary
    const deliverablesList = plan.deliverables || [];
    const totalDeliverables = deliverablesList.length;
    const completedDeliverables = deliverablesList.filter(
      (d) => d.status === "COMPLETED" || d.status === "APPROVED",
    ).length;

    // Milestones Summary
    const totalMilestones = milestonesRows.length;
    const completedMilestones = milestonesRows.filter(
      (m) => m.status === "ACHIEVED" || m.status === "COMPLETED" || m.status === "APPROVED",
    ).length;

    // Planning Completion Indicator Scores (Sections 1 through 5)
    const completionIndicators = {
      section1_overview:
        project.project_name &&
        project.start_date &&
        project.end_date &&
        (plan.objectives || []).length > 0
          ? "COMPLETE"
          : (plan.objectives || []).length > 0 || project.description
            ? "IN_PROGRESS"
            : "REQUIRES_ATTENTION",

      section2_scope:
        plan.scope_statement &&
        (plan.deliverables || []).length > 0 &&
        (project.project_scopes || []).length > 0
          ? "COMPLETE"
          : plan.scope_statement || (plan.deliverables || []).length > 0
            ? "IN_PROGRESS"
            : "REQUIRES_ATTENTION",

      section3_execution:
        plan.methodology && (plan.phases || []).length > 0
          ? "COMPLETE"
          : (plan.phases || []).length > 0
            ? "IN_PROGRESS"
            : "NOT_STARTED",

      section4_schedule_budget:
        scheduleSummary.totalTasks > 0 && budgetSummary.budgetBaseline > 0
          ? "COMPLETE"
          : scheduleSummary.totalTasks > 0 || budgetSummary.budgetBaseline > 0
            ? "IN_PROGRESS"
            : "REQUIRES_ATTENTION",

      section5_management_plans:
        plan.management_plans?.risk?.approach &&
        plan.management_plans?.quality?.objectives &&
        plan.management_plans?.hse?.objectives
          ? "COMPLETE"
          : plan.management_plans?.risk?.approach
            ? "IN_PROGRESS"
            : "REQUIRES_ATTENTION",
    };

    // Overall Planning Completion %
    const weights = [
      completionIndicators.section1_overview,
      completionIndicators.section2_scope,
      completionIndicators.section3_execution,
      completionIndicators.section4_schedule_budget,
      completionIndicators.section5_management_plans,
    ];
    const completeCount = weights.filter((w) => w === "COMPLETE").length;
    const inProgCount = weights.filter((w) => w === "IN_PROGRESS").length;
    const planCompletionPercent = Math.round(((completeCount * 1.0 + inProgCount * 0.5) / 5) * 100);

    const documentsWithRevisions = (docsRows || []).map((doc) => {
      const docRevs = (docRevisionsRows || []).filter((r) => String(r.document_id) === String(doc.id));
      let meta = null;
      try {
        meta = doc.attachments_json ? JSON.parse(doc.attachments_json) : null;
      } catch (e) {
        meta = null;
      }
      return {
        ...doc,
        meta,
        current_revision: doc.current_revision || (docRevs[0]?.revision_no || "v1.0"),
        revisions: docRevs,
      };
    });

    res.json({
      ok: true,
      project,
      plan,
      summaries: {
        tasks: tasksRows,
        milestones: milestonesRows,
        resources: resourcesRows,
        risks: risksRows,
        qualityPlans: qualityRows,
        documents: documentsWithRevisions,
        scheduleSummary,
        budgetSummary,
        totalDeliverables,
        completedDeliverables,
        totalMilestones,
        completedMilestones,
      },
      indicators: completionIndicators,
      planCompletionPercent,
      baselineHistory: historyRows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. PUT /projects/projects/:id/plan
 * Saves Draft changes to Master Project Plan details.
 */
export const saveProjectPlanDraft = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const projectId = toNumber(req.params.id);
    if (!projectId) throw httpError(400, "VALIDATION_ERROR", "Invalid Project ID");

    await ensureProjectPlanTables();
    const b = req.body || {};

    // 1. Check if plan row exists
    const existing = await query(
      `SELECT id, plan_status FROM pm_project_plans
       WHERE project_id = :projectId AND company_id = :companyId LIMIT 1`,
      { projectId, companyId },
    );

    if (!existing.length) {
      throw httpError(404, "NOT_FOUND", "Project plan record not initialized");
    }

    // 2. Perform Draft Update
    await query(
      `UPDATE pm_project_plans SET
        project_sponsor = COALESCE(:sponsor, project_sponsor),
        business_justification = COALESCE(:justification, business_justification),
        expected_outcomes = COALESCE(:outcomes, expected_outcomes),
        project_classification = COALESCE(:classification, project_classification),
        project_location = COALESCE(:location, project_location),
        objectives_json = CASE WHEN :hasObjectives = 1 THEN :objectivesJson ELSE objectives_json END,
        
        scope_statement = COALESCE(:scopeStatement, scope_statement),
        included_activities = COALESCE(:included, included_activities),
        excluded_activities = COALESCE(:excluded, excluded_activities),
        assumptions = COALESCE(:assumptions, assumptions),
        constraints = COALESCE(:constraints, constraints),
        project_boundaries = COALESCE(:boundaries, project_boundaries),
        acceptance_criteria = COALESCE(:acceptanceCriteria, acceptance_criteria),
        deliverables_json = CASE WHEN :hasDeliverables = 1 THEN :deliverablesJson ELSE deliverables_json END,
        
        methodology = COALESCE(:methodology, methodology),
        methodology_description = COALESCE(:methodologyDesc, methodology_description),
        methodology_justification = COALESCE(:methodologyJust, methodology_justification),
        delivery_approach = COALESCE(:deliveryApproach, delivery_approach),
        key_execution_considerations = COALESCE(:executionConsiderations, key_execution_considerations),
        phases_json = CASE WHEN :hasPhases = 1 THEN :phasesJson ELSE phases_json END,
        raci_matrix_json = CASE WHEN :hasRaci = 1 THEN :raciJson ELSE raci_matrix_json END,
        resource_strategy_json = CASE WHEN :hasResourceStrategy = 1 THEN :resourceStrategyJson ELSE resource_strategy_json END,
        
        risk_plan_json = CASE WHEN :hasRiskPlan = 1 THEN :riskJson ELSE risk_plan_json END,
        quality_plan_json = CASE WHEN :hasQualityPlan = 1 THEN :qualityJson ELSE quality_plan_json END,
        procurement_plan_json = CASE WHEN :hasProcurementPlan = 1 THEN :procurementJson ELSE procurement_plan_json END,
        communication_plan_json = CASE WHEN :hasCommPlan = 1 THEN :commJson ELSE communication_plan_json END,
        hse_plan_json = CASE WHEN :hasHsePlan = 1 THEN :hseJson ELSE hse_plan_json END
       WHERE project_id = :projectId AND company_id = :companyId`,
      {
        projectId,
        companyId,
        sponsor: b.project_sponsor ?? null,
        justification: b.business_justification ?? null,
        outcomes: b.expected_outcomes ?? null,
        classification: b.project_classification ?? null,
        location: b.project_location ?? null,
        hasObjectives: b.objectives !== undefined ? 1 : 0,
        objectivesJson: b.objectives !== undefined ? JSON.stringify(b.objectives) : null,

        scopeStatement: b.scope_statement ?? null,
        included: b.included_activities ?? null,
        excluded: b.excluded_activities ?? null,
        assumptions: b.assumptions ?? null,
        constraints: b.constraints ?? null,
        boundaries: b.project_boundaries ?? null,
        acceptanceCriteria: b.acceptance_criteria ?? null,
        hasDeliverables: b.deliverables !== undefined ? 1 : 0,
        deliverablesJson: b.deliverables !== undefined ? JSON.stringify(b.deliverables) : null,

        methodology: b.methodology ?? null,
        methodologyDesc: b.methodology_description ?? null,
        methodologyJust: b.methodology_justification ?? null,
        deliveryApproach: b.delivery_approach ?? null,
        executionConsiderations: b.key_execution_considerations ?? null,
        hasPhases: b.phases !== undefined ? 1 : 0,
        phasesJson: b.phases !== undefined ? JSON.stringify(b.phases) : null,
        hasRaci: b.raci_matrix !== undefined ? 1 : 0,
        raciJson: b.raci_matrix !== undefined ? JSON.stringify(b.raci_matrix) : null,
        hasResourceStrategy: b.resource_strategy !== undefined ? 1 : 0,
        resourceStrategyJson: b.resource_strategy !== undefined ? JSON.stringify(b.resource_strategy) : null,

        hasRiskPlan: b.management_plans?.risk !== undefined ? 1 : 0,
        riskJson: b.management_plans?.risk !== undefined ? JSON.stringify(b.management_plans.risk) : null,
        hasQualityPlan: b.management_plans?.quality !== undefined ? 1 : 0,
        qualityJson: b.management_plans?.quality !== undefined ? JSON.stringify(b.management_plans.quality) : null,
        hasProcurementPlan: b.management_plans?.procurement !== undefined ? 1 : 0,
        procurementJson: b.management_plans?.procurement !== undefined ? JSON.stringify(b.management_plans.procurement) : null,
        hasCommPlan: b.management_plans?.communication !== undefined ? 1 : 0,
        commJson: b.management_plans?.communication !== undefined ? JSON.stringify(b.management_plans.communication) : null,
        hasHsePlan: b.management_plans?.hse !== undefined ? 1 : 0,
        hseJson: b.management_plans?.hse !== undefined ? JSON.stringify(b.management_plans.hse) : null,
      },
    );

    // Optional sync to pm_projects if master attributes were updated
    if (b.project_updates) {
      const pu = b.project_updates;
      await query(
        `UPDATE pm_projects SET
          project_priority = COALESCE(:priority, project_priority),
          client_name = COALESCE(:clientName, client_name),
          start_date = COALESCE(:startDate, start_date),
          end_date = COALESCE(:endDate, end_date),
          budget = COALESCE(:budget, budget)
         WHERE id = :projectId AND company_id = :companyId`,
        {
          projectId,
          companyId,
          priority: pu.priority || null,
          clientName: pu.client_name || null,
          startDate: pu.start_date || null,
          endDate: pu.end_date || null,
          budget: pu.budget !== undefined ? Number(pu.budget) : null,
        },
      ).catch(() => {});
    }

    res.json({ ok: true, message: "Project plan draft saved successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. POST /projects/projects/:id/plan/submit
 * Validates and submits the plan for formal review.
 */
export const submitProjectPlanForReview = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const projectId = toNumber(req.params.id);
    if (!projectId) throw httpError(400, "VALIDATION_ERROR", "Invalid Project ID");

    await ensureProjectPlanTables();

    const planRows = await query(
      `SELECT * FROM pm_project_plans
       WHERE project_id = :projectId AND company_id = :companyId LIMIT 1`,
      { projectId, companyId },
    );
    if (!planRows.length) throw httpError(404, "NOT_FOUND", "Plan record not found");

    const plan = planRows[0];
    const objectives = parseJsonSafe(plan.objectives_json, []);

    // Perform validation check
    const validationErrors = [];
    if (!objectives || objectives.length === 0) {
      validationErrors.push("At least one project objective must be defined.");
    }
    if (!plan.scope_statement || plan.scope_statement.trim().length < 20) {
      validationErrors.push("Project scope statement must be established.");
    }
    if (!plan.methodology) {
      validationErrors.push("Project execution methodology must be selected.");
    }

    if (validationErrors.length > 0 && !req.body.force) {
      return res.status(422).json({
        ok: false,
        message: "Plan validation failed before submission",
        errors: validationErrors,
      });
    }

    const userName = req.user?.full_name || req.user?.username || "Authorized User";
    const userId = req.user?.id || null;

    await query(
      `UPDATE pm_project_plans SET
        plan_status = 'READY_FOR_REVIEW',
        submitted_by = :userId,
        submitted_by_name = :userName,
        submitted_at = CURRENT_TIMESTAMP
       WHERE project_id = :projectId AND company_id = :companyId`,
      { projectId, companyId, userId, userName },
    );

    res.json({
      ok: true,
      plan_status: "READY_FOR_REVIEW",
      message: "Project plan successfully submitted for review.",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. POST /projects/projects/:id/plan/approve
 * Formal approval of Project Plan.
 * Captures an immutable snapshot baseline into pm_project_plan_history,
 * updates plan_status = 'APPROVED', and establishes the historical project baseline.
 */
export const approveProjectPlan = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const projectId = toNumber(req.params.id);
    if (!projectId) throw httpError(400, "VALIDATION_ERROR", "Invalid Project ID");

    await ensureProjectPlanTables();

    // 1. Load current plan
    const planRows = await query(
      `SELECT * FROM pm_project_plans
       WHERE project_id = :projectId AND company_id = :companyId LIMIT 1`,
      { projectId, companyId },
    );
    if (!planRows.length) throw httpError(404, "NOT_FOUND", "Project plan record not found");
    const plan = planRows[0];

    // 2. Load current project & task records for snapshot
    const [projectRows, tasksRows, milestonesRows, boqRows, resourcesRows, risksRows] =
      await Promise.all([
        query(`SELECT * FROM pm_projects WHERE id = :projectId AND company_id = :companyId`, {
          projectId,
          companyId,
        }),
        query(
          `SELECT id, task_title, wbs_code, scope_name, start_date, end_date, estimated_hours, priority, status
           FROM pm_tasks WHERE project_id = :projectId AND company_id = :companyId AND (is_active = 'Y' OR is_active IS NULL)`,
          { projectId, companyId },
        ),
        query(
          `SELECT id, title, due_date, status FROM pm_milestones WHERE project_id = :projectId AND company_id = :companyId`,
          { projectId, companyId },
        ),
        query(
          `SELECT id, COALESCE(boq_reference, estimate_number) AS boq_number,
                  COALESCE(total_amount, total_cost_estimate, 0) AS total_estimated_cost
           FROM pm_boqs WHERE project_id = :projectId AND (company_id = :companyId OR :companyId IS NULL OR company_id = 0) ORDER BY id DESC LIMIT 1`,
          { projectId, companyId },
        ).catch(() => []),
        query(
          `SELECT id, resource_name, resource_type, allocated_qty, status
           FROM pm_resources WHERE project_id = :projectId AND company_id = :companyId`,
          { projectId, companyId },
        ).catch(() => []),
        query(
          `SELECT id, risk_code, title, inherent_level, residual_level, treatment_strategy AS response_strategy
           FROM pm_risks WHERE project_id = :projectId AND company_id = :companyId`,
          { projectId, companyId },
        ).catch(() => []),
      ]);

    const project = projectRows[0] || {};
    const currentVersion = Number(plan.version_no || 1);
    const userName = req.user?.full_name || req.user?.username || "Executive Approver";
    const userId = req.user?.id || null;

    // 3. Assemble Immutable Baseline Snapshot
    const baselineSnapshot = {
      version: currentVersion,
      approvedAt: new Date().toISOString(),
      approvedBy: userName,
      project: {
        id: project.id,
        project_code: project.project_code,
        project_name: project.project_name,
        client_name: project.client_name,
        budget: project.budget,
        start_date: project.start_date,
        end_date: project.end_date,
        priority: project.project_priority,
      },
      objectives: parseJsonSafe(plan.objectives_json, []),
      scopeDefinition: {
        statement: plan.scope_statement,
        includedActivities: plan.included_activities,
        excludedActivities: plan.excluded_activities,
        assumptions: plan.assumptions,
        constraints: plan.constraints,
        projectBoundaries: plan.project_boundaries,
        acceptanceCriteria: plan.acceptance_criteria,
      },
      deliverables: parseJsonSafe(plan.deliverables_json, []),
      executionStrategy: {
        methodology: plan.methodology,
        methodologyDescription: plan.methodology_description,
        deliveryApproach: plan.delivery_approach,
        phases: parseJsonSafe(plan.phases_json, []),
        raciMatrix: parseJsonSafe(plan.raci_matrix_json, []),
        resourceStrategy: parseJsonSafe(plan.resource_strategy_json, {}),
      },
      managementPlans: {
        risk: parseJsonSafe(plan.risk_plan_json, {}),
        quality: parseJsonSafe(plan.quality_plan_json, {}),
        procurement: parseJsonSafe(plan.procurement_plan_json, {}),
        communication: parseJsonSafe(plan.communication_plan_json, {}),
        hse: parseJsonSafe(plan.hse_plan_json, {}),
      },
      scheduleCommitment: {
        totalTasks: tasksRows.length,
        tasks: tasksRows,
        milestones: milestonesRows,
      },
      budgetCommitment: {
        projectBudget: Number(project.budget || 0),
        boq: boqRows[0] || null,
      },
      resourceCommitment: resourcesRows,
      riskRegisterCommitment: risksRows,
    };

    const snapshotString = JSON.stringify(baselineSnapshot);

    // 4. Record into pm_project_plan_history
    await query(
      `INSERT INTO pm_project_plan_history
       (company_id, branch_id, project_id, plan_id, version_no, plan_status, baseline_snapshot, change_summary, approved_by, approved_by_name, approved_at)
       VALUES
       (:companyId, :branchId, :projectId, :planId, :versionNo, 'APPROVED', :snapshot, :summary, :userId, :userName, CURRENT_TIMESTAMP)`,
      {
        companyId,
        branchId,
        projectId,
        planId: plan.id,
        versionNo: currentVersion,
        snapshot: snapshotString,
        summary: req.body.change_summary || `Approved Master Baseline v${currentVersion}`,
        userId,
        userName,
      },
    );

    // 5. Update pm_project_plans to APPROVED
    await query(
      `UPDATE pm_project_plans SET
        plan_status = 'APPROVED',
        approved_baseline_json = :snapshot,
        approved_by = :userId,
        approved_by_name = :userName,
        approved_at = CURRENT_TIMESTAMP
       WHERE id = :planId`,
      {
        planId: plan.id,
        snapshot: snapshotString,
        userId,
        userName,
      },
    );

    res.json({
      ok: true,
      plan_status: "APPROVED",
      version_no: currentVersion,
      message: `Project plan v${currentVersion} approved and historical baseline established.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. POST /projects/projects/:id/plan/revise
 * Initiates a new controlled plan revision (e.g. from Approved to Draft v2),
 * preserving all prior historical baselines.
 */
export const reviseProjectPlan = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const projectId = toNumber(req.params.id);
    if (!projectId) throw httpError(400, "VALIDATION_ERROR", "Invalid Project ID");

    await ensureProjectPlanTables();

    const planRows = await query(
      `SELECT * FROM pm_project_plans
       WHERE project_id = :projectId AND company_id = :companyId LIMIT 1`,
      { projectId, companyId },
    );
    if (!planRows.length) throw httpError(404, "NOT_FOUND", "Project plan not found");
    const plan = planRows[0];

    const currentVersion = Number(plan.version_no || 1);
    const nextVersion = currentVersion + 1;
    const reason = req.body.reason || "Change order / scope revision required";

    await query(
      `UPDATE pm_project_plans SET
        plan_status = 'DRAFT',
        version_no = :nextVersion,
        revision_reason = :reason,
        submitted_by = NULL,
        submitted_at = NULL,
        approved_by = NULL,
        approved_at = NULL
       WHERE id = :planId`,
      {
        planId: plan.id,
        nextVersion,
        reason,
      },
    );

    res.json({
      ok: true,
      plan_status: "DRAFT",
      version_no: nextVersion,
      message: `Project plan unlocked for Revision v${nextVersion}. Historical baseline v${currentVersion} preserved.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. GET /projects/projects/:id/plan/baselines
 * Lists historical baselines for comparison and audit trails.
 */
export const listPlanBaselines = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const projectId = toNumber(req.params.id);
    if (!projectId) throw httpError(400, "VALIDATION_ERROR", "Invalid Project ID");

    await ensureProjectPlanTables();

    const rows = await query(
      `SELECT h.id, h.project_id, h.version_no, h.plan_status, h.change_summary,
              h.approved_by_name, h.approved_at, h.created_at, h.baseline_snapshot
       FROM pm_project_plan_history h
       WHERE h.project_id = :projectId AND h.company_id = :companyId
       ORDER BY h.version_no DESC, h.id DESC`,
      { projectId, companyId },
    );

    const items = rows.map((r) => {
      let snapshot = null;
      try {
        snapshot = JSON.parse(r.baseline_snapshot);
      } catch {}
      return {
        ...r,
        baseline_snapshot: snapshot,
      };
    });

    res.json({ ok: true, items });
  } catch (err) {
    next(err);
  }
};

/**
 * 7. POST /projects/projects/:id/plan/ai-intelligence
 * Evaluates live project data (scopes, tasks, durations, budget, milestones, resources)
 * to provide automated intelligent planning assistance, gap analysis, and suggestions.
 */
export const generatePlanIntelligence = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const projectId = toNumber(req.params.id);
    if (!projectId) throw httpError(400, "VALIDATION_ERROR", "Invalid Project ID");

    await ensureProjectPlanTables();

    const [projectRows, tasksRows, milestonesRows, planRows] = await Promise.all([
      query(`SELECT * FROM pm_projects WHERE id = :projectId AND company_id = :companyId`, {
        projectId,
        companyId,
      }),
      query(
        `SELECT id, task_title, wbs_code, start_date, end_date, estimated_hours, priority, status
         FROM pm_tasks WHERE project_id = :projectId AND company_id = :companyId AND (is_active = 'Y' OR is_active IS NULL)`,
        { projectId, companyId },
      ),
      query(
        `SELECT id, title, due_date, status FROM pm_milestones WHERE project_id = :projectId AND company_id = :companyId`,
        { projectId, companyId },
      ),
      query(
        `SELECT * FROM pm_project_plans WHERE project_id = :projectId AND company_id = :companyId LIMIT 1`,
        { projectId, companyId },
      ),
    ]);

    if (!projectRows.length) throw httpError(404, "NOT_FOUND", "Project not found");
    const project = projectRows[0];
    const plan = planRows[0] || {};
    const tasks = tasksRows || [];
    const milestones = milestonesRows || [];

    // Analyze dates & durations
    const projStart = project.start_date ? new Date(project.start_date) : null;
    const projEnd = project.end_date ? new Date(project.end_date) : null;
    let durationDays = 0;
    if (projStart && projEnd) {
      durationDays = Math.max(1, Math.round((projEnd - projStart) / (1000 * 60 * 60 * 24)));
    }

    // 1. Conflict & Gap Checks
    const scheduleConflicts = [];
    tasks.forEach((t) => {
      if (t.start_date && t.end_date && t.start_date > t.end_date) {
        scheduleConflicts.push({
          type: "INVERTED_DATES",
          taskId: t.id,
          taskTitle: t.task_title,
          message: `Task "${t.task_title}" end date (${t.end_date}) precedes start date (${t.start_date}).`,
        });
      }
      if (projStart && t.start_date && String(t.start_date) < String(project.start_date)) {
        scheduleConflicts.push({
          type: "OUTSIDE_PROJECT_WINDOW",
          taskId: t.id,
          taskTitle: t.task_title,
          message: `Task "${t.task_title}" starts on ${t.start_date}, which is before project start (${project.start_date}).`,
        });
      }
      if (projEnd && t.end_date && String(t.end_date) > String(project.end_date)) {
        scheduleConflicts.push({
          type: "OUTSIDE_PROJECT_WINDOW",
          taskId: t.id,
          taskTitle: t.task_title,
          message: `Task "${t.task_title}" finishes on ${t.end_date}, which extends beyond project finish (${project.end_date}).`,
        });
      }
    });

    milestones.forEach((m) => {
      if (projEnd && m.due_date && String(m.due_date) > String(project.end_date)) {
        scheduleConflicts.push({
          type: "MILESTONE_OUT_OF_BOUNDS",
          milestoneId: m.id,
          milestoneTitle: m.title,
          message: `Milestone "${m.title}" due date (${m.due_date}) exceeds project completion date (${project.end_date}).`,
        });
      }
    });

    // 2. Planning Gaps Checklist
    const planningGaps = [];
    if (!project.budget || Number(project.budget) <= 0) {
      planningGaps.push("Approved Budget Baseline has not been established in Project Costing.");
    }
    if (tasks.length === 0) {
      planningGaps.push("No tasks have been scheduled under Work Breakdown Structure (WBS).");
    }
    if (milestones.length === 0) {
      planningGaps.push("No project stage-gate milestones have been established.");
    }
    const currentObjectives = parseJsonSafe(plan.objectives_json, []);
    if (!currentObjectives || currentObjectives.length === 0) {
      planningGaps.push("Project objectives and measurable criteria must be established.");
    }
    const currentDeliverables = parseJsonSafe(plan.deliverables_json, []);
    if (!currentDeliverables || currentDeliverables.length === 0) {
      planningGaps.push("Key deliverables register is empty.");
    }

    // 3. Recommended Project Phases
    const recommendedPhases = [
      {
        phase_name: "Phase 1: Initiation & Site Mobilization",
        description: "Statutory permits, client handover of site, contractor mobilization, and baseline locking.",
        target_offset_pct: 10,
        responsible: project.manager_name || "Project Lead",
        deliverables: "Site Possession Certificate, Mobilization Checklist",
      },
      {
        phase_name: "Phase 2: Substructure & Foundation Engineering",
        description: "Excavation, earthworks, underground utilities, and primary structural foundation.",
        target_offset_pct: 30,
        responsible: "Structural Lead",
        deliverables: "Foundation Inspection Sign-off, Concrete Core Tests",
      },
      {
        phase_name: "Phase 3: Superstructure & Core Construction",
        description: "Primary frame assembly, wall construction, roof installation, and weather enclosure.",
        target_offset_pct: 65,
        responsible: "Construction Superintendent",
        deliverables: "Superstructure Frame Approval, Weatherproof Sign-off",
      },
      {
        phase_name: "Phase 4: MEP Rough-In & Architectural Finishes",
        description: "Mechanical, electrical, plumbing routing, interior partitioning, tiling, and coatings.",
        target_offset_pct: 85,
        responsible: "MEP Engineer / Finish Lead",
        deliverables: "Pressure Test Certificates, Finish Submittals",
      },
      {
        phase_name: "Phase 5: Testing, Commissioning & Client Handover",
        description: "Integrated systems commissioning, defect snagging, final account reconciliation, and handover.",
        target_offset_pct: 100,
        responsible: project.manager_name || "Project Lead",
        deliverables: "Practical Completion Certificate, As-Built Documentation",
      },
    ];

    // 4. Recommended Key Deliverables
    const recommendedDeliverables = [
      {
        name: "Approved Project Charter & Baseline",
        description: "Consolidated project plan with approved scope, schedule, and cost baselines.",
        acceptanceCriteria: "Signed by Client Sponsor and Lead Project Manager.",
      },
      {
        name: "Substructure & Concrete Test Approvals",
        description: "Independent 28-day laboratory concrete test results verifying compressive strength.",
        acceptanceCriteria: "100% test reports meet or exceed engineering design specifications.",
      },
      {
        name: "Integrated MEP Commissioning Dossier",
        description: "Electrical continuity, plumbing pressure tests, and mechanical ventilation balance certificates.",
        acceptanceCriteria: "Zero leaks, compliant voltage drops, and signed commissioning checklists.",
      },
      {
        name: "Final Account & Practical Completion Certificate",
        description: "Audited final valuation, closed punchlist, and formal handover to client representative.",
        acceptanceCriteria: "Zero open critical snags; financial release waivers signed.",
      },
    ];

    // 5. Potential Project Risks
    const potentialRisks = [
      {
        title: "Material Supply Chain & Long-Lead Delivery Delays",
        category: "Procurement / Supply Chain",
        likelihood: 4,
        impact: 4,
        mitigation: "Establish advance buffer inventory and secure early binding purchase orders with dual suppliers.",
      },
      {
        title: "Inclement Weather Disruption to Outdoor Concrete Works",
        category: "Environmental",
        likelihood: 3,
        impact: 3,
        mitigation: "Include float days in CPM calendar and provide protective site covers and dewatering pumps.",
      },
      {
        title: "Scope Creep & Client Architectural Variations",
        category: "Scope & Changes",
        likelihood: 4,
        impact: 3,
        mitigation: "Enforce strict contractual Change Order / Variation approval process before initiating works.",
      },
    ];

    res.json({
      ok: true,
      intelligence: {
        durationDays,
        scheduleConflicts,
        planningGaps,
        recommendedPhases,
        recommendedDeliverables,
        potentialRisks,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 8. GET /projects/projects/:id/plan/documents
 * List all project plan supporting documents and their revisions
 */
export const listProjectPlanDocuments = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const projectId = toNumber(req.params.id);
    if (!projectId) throw httpError(400, "VALIDATION_ERROR", "Invalid Project ID");

    const [docsRows, revsRows] = await Promise.all([
      query(
        `SELECT d.id, d.title, d.doc_category, d.category, d.discipline, d.document_number, d.doc_number,
                d.current_revision, d.file_url, d.created_at, d.updated_at, d.status,
                d.uploaded_by, d.attachments_json
         FROM pm_documents d
         WHERE d.project_id = :projectId AND (d.company_id = :companyId OR :companyId IS NULL OR d.company_id = 0)
         ORDER BY d.id DESC`,
        { projectId, companyId },
      ).catch(() => []),
      query(
        `SELECT r.id, r.document_id, r.revision_no, r.revision_date, r.change_description,
                r.file_url, r.uploaded_by, r.created_at
         FROM pm_document_revisions r
         JOIN pm_documents d ON d.id = r.document_id
         WHERE d.project_id = :projectId AND (d.company_id = :companyId OR :companyId IS NULL OR d.company_id = 0)
         ORDER BY r.id DESC`,
        { projectId, companyId },
      ).catch(() => []),
    ]);

    const documents = (docsRows || []).map((doc) => {
      const docRevs = (revsRows || []).filter((r) => String(r.document_id) === String(doc.id));
      let meta = null;
      try {
        meta = doc.attachments_json ? JSON.parse(doc.attachments_json) : null;
      } catch (e) {
        meta = null;
      }
      return {
        ...doc,
        meta,
        current_revision: doc.current_revision || (docRevs[0]?.revision_no || "v1.0"),
        revisions: docRevs,
      };
    });

    res.json({ ok: true, documents });
  } catch (err) {
    next(err);
  }
};

/**
 * 9. POST /projects/projects/:id/plan/documents
 * Upload and register a new project plan document (creates v1.0 revision)
 */
export const uploadProjectPlanDocument = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const projectId = toNumber(req.params.id);
    if (!projectId) throw httpError(400, "VALIDATION_ERROR", "Invalid Project ID");

    const body = req.body || {};
    const fileUrl = String(body.file_url || "").trim();
    if (!fileUrl) {
      throw httpError(400, "VALIDATION_ERROR", "file_url is required");
    }

    const title = String(body.title || body.original_filename || "Project Plan Document").trim();
    const category = String(body.category || body.doc_category || "Project Plan").trim();
    const discipline = String(body.discipline || "General").trim();
    const revisionNo = String(body.revision_no || "v1.0").trim();
    const changeDescription = String(body.change_description || "Initial document upload").trim();
    const userId = req.user?.id || null;
    const userName = req.user?.full_name || req.user?.username || req.user?.name || "Authorized User";

    // Auto-generate document number
    const countRows = await query(
      `SELECT COUNT(*) AS c FROM pm_documents WHERE project_id = :projectId`,
      { projectId },
    );
    const seq = Number(countRows[0]?.c || 0) + 1;
    const docNumber = `DOC-P${projectId}-${String(seq).padStart(3, "0")}`;

    const metaObj = {
      original_filename: body.original_filename || title,
      file_size: body.file_size || null,
      file_type: body.file_type || null,
      public_id: body.public_id || null,
      uploaded_by_name: userName,
      uploaded_at: new Date().toISOString(),
    };
    const attachmentsJson = JSON.stringify(metaObj);

    let resolvedBranchId = branchId;
    let resolvedCompanyId = companyId;
    const prj = await query(`SELECT branch_id, company_id FROM pm_projects WHERE id = :projectId LIMIT 1`, { projectId });
    if (prj.length) {
      if (!resolvedBranchId) resolvedBranchId = prj[0].branch_id || 1;
      if (!resolvedCompanyId) resolvedCompanyId = prj[0].company_id || 1;
    } else {
      if (!resolvedBranchId) resolvedBranchId = 1;
      if (!resolvedCompanyId) resolvedCompanyId = 1;
    }

    const docInsert = await query(
      `INSERT INTO pm_documents (
        company_id, branch_id, project_id, doc_category, category, discipline,
        doc_number, document_number, title, current_revision, status,
        file_url, attachments_json, uploaded_by, created_at, updated_at
      ) VALUES (
        :companyId, :branchId, :projectId, :category, :category, :discipline,
        :docNumber, :docNumber, :title, :revisionNo, 'ACTIVE',
        :fileUrl, :attachmentsJson, :userId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )`,
      {
        companyId: resolvedCompanyId || 1,
        branchId: resolvedBranchId || 1,
        projectId,
        category,
        discipline,
        docNumber,
        title,
        revisionNo,
        fileUrl,
        attachmentsJson,
        userId,
      },
    );

    const documentId = docInsert.insertId;

    // Create initial revision v1.0 in pm_document_revisions
    await query(
      `INSERT INTO pm_document_revisions (
        document_id, revision_no, revision_date, change_description,
        file_url, uploaded_by, created_at
      ) VALUES (
        :documentId, :revisionNo, CURRENT_DATE, :changeDescription,
        :fileUrl, :userName, CURRENT_TIMESTAMP
      )`,
      {
        documentId,
        revisionNo,
        changeDescription,
        fileUrl,
        userName,
      },
    );

    const createdDoc = {
      id: documentId,
      project_id: projectId,
      title,
      doc_category: category,
      category,
      discipline,
      doc_number: docNumber,
      document_number: docNumber,
      current_revision: revisionNo,
      status: "ACTIVE",
      file_url: fileUrl,
      meta: metaObj,
      revisions: [
        {
          id: 1,
          document_id: documentId,
          revision_no: revisionNo,
          revision_date: new Date().toISOString().split("T")[0],
          change_description: changeDescription,
          file_url: fileUrl,
          uploaded_by: userName,
          created_at: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    res.status(201).json({
      ok: true,
      message: "Document uploaded and registered successfully in project master",
      document: createdDoc,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 10. POST /projects/projects/:id/plan/documents/:documentId/revisions
 * Upload a new version/revision for an existing document (e.g. v1.1, v2.0)
 */
export const uploadDocumentRevision = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const projectId = toNumber(req.params.id);
    const documentId = toNumber(req.params.documentId);
    if (!projectId || !documentId) {
      throw httpError(400, "VALIDATION_ERROR", "Invalid Project ID or Document ID");
    }

    const docRows = await query(
      `SELECT * FROM pm_documents WHERE id = :documentId AND project_id = :projectId LIMIT 1`,
      { documentId, projectId },
    );
    if (!docRows.length) {
      throw httpError(404, "NOT_FOUND", "Project document not found");
    }
    const currentDoc = docRows[0];

    const body = req.body || {};
    const fileUrl = String(body.file_url || "").trim();
    if (!fileUrl) {
      throw httpError(400, "VALIDATION_ERROR", "file_url is required for new revision");
    }

    const revisionNo = String(body.revision_no || "").trim();
    if (!revisionNo) {
      throw httpError(400, "VALIDATION_ERROR", "revision_no is required (e.g. v1.1, v2.0)");
    }

    const changeDescription = String(body.change_description || "Revision update").trim();
    const userName = req.user?.full_name || req.user?.username || req.user?.name || "Authorized User";

    const metaObj = {
      original_filename: body.original_filename || currentDoc.title,
      file_size: body.file_size || null,
      file_type: body.file_type || null,
      public_id: body.public_id || null,
      uploaded_by_name: userName,
      uploaded_at: new Date().toISOString(),
    };
    const attachmentsJson = JSON.stringify(metaObj);

    // Insert new revision
    await query(
      `INSERT INTO pm_document_revisions (
        document_id, revision_no, revision_date, change_description,
        file_url, uploaded_by, created_at
      ) VALUES (
        :documentId, :revisionNo, CURRENT_DATE, :changeDescription,
        :fileUrl, :userName, CURRENT_TIMESTAMP
      )`,
      {
        documentId,
        revisionNo,
        changeDescription,
        fileUrl,
        userName,
      },
    );

    // Update parent document current revision
    await query(
      `UPDATE pm_documents SET
        current_revision = :revisionNo,
        file_url = :fileUrl,
        attachments_json = :attachmentsJson,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = :documentId`,
      {
        documentId,
        revisionNo,
        fileUrl,
        attachmentsJson,
      },
    );

    // Fetch updated revision history
    const allRevs = await query(
      `SELECT id, document_id, revision_no, revision_date, change_description, file_url, uploaded_by, created_at
       FROM pm_document_revisions
       WHERE document_id = :documentId
       ORDER BY id DESC`,
      { documentId },
    );

    res.json({
      ok: true,
      message: `Document upgraded to version ${revisionNo} successfully`,
      current_revision: revisionNo,
      file_url: fileUrl,
      revisions: allRevs,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 11. POST /projects/projects/:id/plan/documents/:documentId/revisions/:revisionId/restore
 * Roll back / restore a historical revision as the current active version
 */
export const restoreDocumentRevision = async (req, res, next) => {
  try {
    const projectId = toNumber(req.params.id);
    const documentId = toNumber(req.params.documentId);
    const revisionId = toNumber(req.params.revisionId);
    if (!projectId || !documentId || !revisionId) {
      throw httpError(400, "VALIDATION_ERROR", "Invalid parameters");
    }

    const revRows = await query(
      `SELECT * FROM pm_document_revisions WHERE id = :revisionId AND document_id = :documentId LIMIT 1`,
      { revisionId, documentId },
    );
    if (!revRows.length) {
      throw httpError(404, "NOT_FOUND", "Revision record not found");
    }
    const targetRev = revRows[0];

    const userName = req.user?.full_name || req.user?.username || req.user?.name || "Authorized User";

    // Update document current version to target revision
    await query(
      `UPDATE pm_documents SET
        current_revision = :revisionNo,
        file_url = :fileUrl,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = :documentId`,
      {
        documentId,
        revisionNo: targetRev.revision_no,
        fileUrl: targetRev.file_url,
      },
    );

    // Record an audit entry in revisions
    await query(
      `INSERT INTO pm_document_revisions (
        document_id, revision_no, revision_date, change_description,
        file_url, uploaded_by, created_at
      ) VALUES (
        :documentId, :revisionNo, CURRENT_DATE, :changeDescription,
        :fileUrl, :userName, CURRENT_TIMESTAMP
      )`,
      {
        documentId,
        revisionNo: `${targetRev.revision_no}-restored`,
        changeDescription: `Restored historical version ${targetRev.revision_no} as active`,
        fileUrl: targetRev.file_url,
        userName,
      },
    );

    const allRevs = await query(
      `SELECT id, document_id, revision_no, revision_date, change_description, file_url, uploaded_by, created_at
       FROM pm_document_revisions
       WHERE document_id = :documentId
       ORDER BY id DESC`,
      { documentId },
    );

    res.json({
      ok: true,
      message: `Version ${targetRev.revision_no} restored as current active document`,
      current_revision: targetRev.revision_no,
      file_url: targetRev.file_url,
      revisions: allRevs,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 12. DELETE /projects/projects/:id/plan/documents/:documentId
 * Delete document and its revisions
 */
export const deleteProjectPlanDocument = async (req, res, next) => {
  try {
    const projectId = toNumber(req.params.id);
    const documentId = toNumber(req.params.documentId);
    if (!projectId || !documentId) {
      throw httpError(400, "VALIDATION_ERROR", "Invalid parameters");
    }

    await query(`DELETE FROM pm_document_revisions WHERE document_id = :documentId`, { documentId });
    await query(`DELETE FROM pm_documents WHERE id = :documentId AND project_id = :projectId`, {
      documentId,
      projectId,
    });

    res.json({
      ok: true,
      message: "Document and its revision history deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};
