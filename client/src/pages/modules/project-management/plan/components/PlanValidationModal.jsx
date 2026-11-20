import React from "react";
import { formatPlanDate } from "../ProjectPlanPage.jsx";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Send,
  ArrowRight,
  Info,
} from "lucide-react";

export default function PlanValidationModal({
  project,
  plan,
  summaries = {},
  indicators = {},
  planCompletionPercent = 0,
  onSubmitForReview,
  onClose,
  submitting = false,
}) {
  const { scheduleSummary = {}, budgetSummary = {} } = summaries;

  const checks = [
    {
      title: "1. Project Objectives Defined",
      desc: "At least one strategic objective with measurable success criteria and target outcome.",
      pass: (plan?.objectives || []).length > 0,
      warn: (plan?.objectives || []).length === 0,
      detail: `${(plan?.objectives || []).length} objectives established.`,
    },
    {
      title: "2. Project Scope Statement Established",
      desc: "Clear scope boundaries, in-scope activities, and out-of-scope exclusions.",
      pass: Boolean(plan?.scope_statement && plan.scope_statement.trim().length >= 15),
      warn: !plan?.scope_statement || plan.scope_statement.trim().length < 15,
      detail: plan?.scope_statement ? "Scope boundaries specified." : "Scope statement missing or too short.",
    },
    {
      title: "3. Key Deliverables Register",
      desc: "Documented deliverables with acceptance criteria and target delivery dates.",
      pass: (plan?.deliverables || []).length > 0,
      warn: (plan?.deliverables || []).length === 0,
      detail: `${(plan?.deliverables || []).length} contractual deliverables registered.`,
    },
    {
      title: "4. Work Breakdown Structure (WBS)",
      desc: "Hierarchical scopes and scheduled activities under project work plan.",
      pass: (project?.project_scopes || []).length > 0 || (scheduleSummary.totalTasks || 0) > 0,
      warn: (project?.project_scopes || []).length === 0 && (scheduleSummary.totalTasks || 0) === 0,
      detail: `${(project?.project_scopes || []).length} scope levels and ${scheduleSummary.totalTasks || 0} scheduled tasks.`,
    },
    {
      title: "5. Execution Strategy & Methodology",
      desc: "Selected delivery methodology and defined project stage phases.",
      pass: Boolean(plan?.methodology) && (plan?.phases || []).length > 0,
      warn: !plan?.methodology || (plan?.phases || []).length === 0,
      detail: `Methodology: ${plan?.methodology || "Not set"}, ${(plan?.phases || []).length} phases defined.`,
    },
    {
      title: "6. Project Schedule & CPM Dates",
      desc: "Valid planned start and completion dates with scheduled task durations.",
      pass: Boolean(project?.start_date && project?.end_date && (scheduleSummary.totalTasks || 0) > 0),
      warn: !project?.start_date || !project?.end_date || (scheduleSummary.totalTasks || 0) === 0,
      detail: `Window: ${formatPlanDate(project?.start_date, "None")} → ${formatPlanDate(project?.end_date, "None")} (${scheduleSummary.totalTasks || 0} tasks).`,
    },
    {
      title: "7. Approved Budget Baseline",
      desc: "Established budget ceiling from Project Setup or Costing BOQ.",
      pass: Number(budgetSummary.budgetBaseline || project?.budget || 0) > 0,
      warn: Number(budgetSummary.budgetBaseline || project?.budget || 0) <= 0,
      detail: `Baseline Budget: ${budgetSummary.currency || "GHS"} ${Number(budgetSummary.budgetBaseline || project?.budget || 0).toLocaleString()}`,
    },
    {
      title: "8. Supporting Management Plans",
      desc: "Addressed risk governance, quality control, procurement, communications, and HSE.",
      pass: Boolean(
        plan?.management_plans?.risk?.approach &&
        plan?.management_plans?.quality?.objectives &&
        plan?.management_plans?.hse?.objectives
      ),
      warn: !plan?.management_plans?.risk?.approach,
      detail: "Risk, Quality, and HSE strategies outlined.",
    },
  ];

  const allPassed = checks.every((c) => c.pass);
  const passCount = checks.filter((c) => c.pass).length;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0E3646] text-white flex items-center justify-center shadow-md">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Project Plan Baseline Readiness Validation
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pre-submission audit verifying readiness across objectives, scope, WBS, schedule, and budget.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* Readiness Score Bar */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                Planning Completeness Score
              </span>
              <span className="font-mono font-black text-sm text-[#0E3646] dark:text-brand-300">
                {planCompletionPercent}% ({passCount}/{checks.length} criteria met)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  planCompletionPercent >= 80 ? "bg-emerald-500" : "bg-amber-500"
                }`}
                style={{ width: `${planCompletionPercent}%` }}
              />
            </div>
          </div>

          {/* Validation Checklist items */}
          <div className="space-y-2.5">
            {checks.map((c, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border transition flex items-start gap-3 ${
                  c.pass
                    ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/60"
                    : "bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60"
                }`}
              >
                {c.pass ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                      {c.title}
                    </h4>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        c.pass
                          ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200"
                          : "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200"
                      }`}
                    >
                      {c.pass ? "Ready" : "Incomplete"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {c.desc}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-1">
                    {c.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Info size={13} className="shrink-0" />
            <span>
              {allPassed
                ? "All criteria verified. This project plan is fully prepared for formal baseline review."
                : "You may submit with justified exceptions if certain sections are not applicable to this project classification."}
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 transition"
            >
              Back to Editing
            </button>

            {plan?.plan_status !== "READY_FOR_REVIEW" && plan?.plan_status !== "APPROVED" && (
              <button
                type="button"
                disabled={submitting}
                onClick={onSubmitForReview}
                className="px-4 py-2 rounded-xl bg-[#0E3646] hover:bg-[#164356] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Send size={13} />
                <span>Submit Plan for Review</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
