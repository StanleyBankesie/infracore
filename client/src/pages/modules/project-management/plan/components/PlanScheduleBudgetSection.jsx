import React, { useState } from "react";
import { Link } from "react-router-dom";
import { formatPlanDate } from "../ProjectPlanPage.jsx";
import {
  Calendar as CalendarIcon,
  DollarSign,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  BarChart3,
  GitBranch,
  Flag,
  CheckSquare,
  Truck,
  Wrench,
  Boxes,
  PieChart,
  Activity,
  Layers,
} from "lucide-react";

export default function PlanScheduleBudgetSection({
  project,
  summaries = {},
  planReturnState,
}) {
  const [subTab, setSubTab] = useState("schedule"); // "schedule" | "budget" | "resources"

  const {
    scheduleSummary = {},
    budgetSummary = {},
    resources = [],
    milestones = [],
    tasks = [],
  } = summaries;

  const currency = budgetSummary.currency || project?.currency || "GHS";

  // Compute duration
  const start = scheduleSummary.plannedStartDate || project?.start_date;
  const finish = scheduleSummary.plannedCompletionDate || project?.end_date;
  let plannedDurationDays = "TBD";
  if (start && finish) {
    const d1 = new Date(start);
    const d2 = new Date(finish);
    if (!isNaN(d1) && !isNaN(d2)) {
      const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      plannedDurationDays = diff > 0 ? `${diff} Days` : "0 Days";
    }
  }

  // Budget Variance calculation
  const baselineBudget = Number(budgetSummary.budgetBaseline || project?.budget || 0);
  const estimatedCost = Number(budgetSummary.estimatedTotalCost || 0);
  const costVariance = estimatedCost - baselineBudget;
  const isOverBudget = costVariance > 0 && baselineBudget > 0;

  return (
    <div className="space-y-6">
      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-smoky">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
            <Clock size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Section 4: Schedule, Budget &amp; Resource Commitments
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Consolidated planning commitments retrieved from Scheduling, Costing BOQ, and Resource Allocation.
            </p>
          </div>
        </div>

        {/* Subtab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setSubTab("schedule")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === "schedule"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Schedule Summary
          </button>
          <button
            type="button"
            onClick={() => setSubTab("budget")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === "budget"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Budget Summary
          </button>
          <button
            type="button"
            onClick={() => setSubTab("resources")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === "resources"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Resource Summary ({resources.length})
          </button>
        </div>
      </div>

      {/* ── SUBTAB 1: SCHEDULE SUMMARY ── */}
      {subTab === "schedule" && (
        <div className="space-y-5">
          {/* Schedule KPI Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-smoky">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Planned Duration
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                {plannedDurationDays}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                {start || "TBD"} → {finish || "TBD"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-smoky">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Total Tasks
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                {scheduleSummary.totalTasks || 0}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                {scheduleSummary.completedTasks || 0} completed
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-smoky">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Critical Path Tasks
              </span>
              <span className="text-lg font-black text-rose-600 font-mono">
                {scheduleSummary.criticalPathCount || 0}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Zero float activities
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-smoky">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Overdue Tasks
              </span>
              <span
                className={`text-lg font-black font-mono ${
                  scheduleSummary.overdueTasks > 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {scheduleSummary.overdueTasks || 0}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Past planned deadline
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-smoky">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Milestones Total
              </span>
              <span className="text-lg font-black text-amber-600 font-mono">
                {milestones.length}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Key stage gates
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-smoky">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Total Work Hours
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                {Number(scheduleSummary.totalEstHours || 0).toFixed(0)}h
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {Number(scheduleSummary.totalActHours || 0).toFixed(0)}h logged
              </span>
            </div>
          </div>

          {/* Quick Scheduling Portals Navigation Strip */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-smoky p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity size={16} className="text-emerald-600" />
                  <span>Authoritative Scheduling Pages &amp; Tools</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Direct navigation to detailed CPM calculations, Gantt visualizer, task calendars, and dependencies.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Link
                to={`/project-management/gantt?projectId=${project?.id}&from=plan`}
                state={planReturnState || { from: `/project-management/plan?projectId=${project?.id}` }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 dark:bg-slate-850 dark:hover:bg-emerald-950/30 border border-slate-200/80 dark:border-slate-800 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <CalendarIcon size={16} className="text-emerald-600" />
                    <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Gantt Schedule &amp; CPM
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Critical Path Engine &amp; date constraints
                  </p>
                </div>
              </Link>

              <Link
                to={`/project-management/calendar?projectId=${project?.id}&from=plan`}
                state={planReturnState || { from: `/project-management/plan?projectId=${project?.id}` }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/50 dark:bg-slate-850 dark:hover:bg-blue-950/30 border border-slate-200/80 dark:border-slate-800 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Clock size={16} className="text-blue-600" />
                    <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Task Calendar View
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Monthly &amp; weekly site activity schedule
                  </p>
                </div>
              </Link>

              <Link
                to={`/project-management/dependencies?projectId=${project?.id}&from=plan`}
                state={planReturnState || { from: `/project-management/plan?projectId=${project?.id}` }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-purple-50/50 dark:bg-slate-850 dark:hover:bg-purple-950/30 border border-slate-200/80 dark:border-slate-800 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <GitBranch size={16} className="text-purple-600" />
                    <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Task Dependencies (FS/SS/FF)
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Predecessors, successors, and lag days
                  </p>
                </div>
              </Link>

              <Link
                to={`/project-management/tasks?project_id=${project?.id}&from=plan`}
                state={planReturnState || { from: `/project-management/plan?projectId=${project?.id}` }}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-sky-50/50 dark:bg-slate-850 dark:hover:bg-sky-950/30 border border-slate-200/80 dark:border-slate-800 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <CheckSquare size={16} className="text-sky-600" />
                    <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Task Management Register
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Work packages, checklists &amp; assignees
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBTAB 2: BUDGET SUMMARY ── */}
      {subTab === "budget" && (
        <div className="space-y-5">
          {/* Budget Overview Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-smoky p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-600" />
                  <span>Project Costing &amp; Budget Summary</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Authoritative cost estimate totals derived directly from Project Costing BOQ and Master Budget.
                </p>
              </div>

              <Link
                to={`/project-management/costing?projectId=${project?.id}&from=plan`}
                state={planReturnState || { from: `/project-management/plan?projectId=${project?.id}` }}
                className="px-3.5 py-1.5 rounded-xl bg-[#0E3646] hover:bg-[#164356] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs self-start sm:self-auto shrink-0"
              >
                <span>Open Project Costing &amp; BOQ</span>
                <ExternalLink size={12} />
              </Link>
            </div>

            {/* Total Budget vs Estimated Cost Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Approved Project Budget Baseline
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                  {currency} {baselineBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Contractual ceiling from Project Setup
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Total Estimated Delivery Cost (BOQ)
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                  {currency} {estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {budgetSummary.hasBOQ ? `BOQ Reference: ${budgetSummary.boqNumber}` : "No BOQ created yet"}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Budget Variance / Margin
                </span>
                <span
                  className={`text-xl font-black font-mono ${
                    isOverBudget ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {isOverBudget ? "+" : ""}{currency}{" "}
                  {costVariance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {isOverBudget ? "Requires budget overrun approval" : "Within approved budget ceiling"}
                </span>
              </div>
            </div>

            {/* Cost Categories Breakdown Strip */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                Cost Element Breakdown (Direct &amp; Indirect)
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60">
                  <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block mb-0.5">
                    Direct Labour
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                    {currency} {Number(budgetSummary.laborCost || 0).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/60">
                  <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400 block mb-0.5">
                    Materials &amp; Supplies
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                    {currency} {Number(budgetSummary.materialCost || 0).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/60">
                  <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-400 block mb-0.5">
                    Plant &amp; Equipment
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                    {currency} {Number(budgetSummary.equipmentCost || 0).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">
                    Subcontractors
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                    {currency} {Number(budgetSummary.subcontractorCost || 0).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-orange-50/50 dark:bg-orange-950/30 border border-orange-200/60 dark:border-orange-800/60">
                  <span className="text-[10px] uppercase font-bold text-orange-700 dark:text-orange-400 block mb-0.5">
                    Site Overheads
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                    {currency} {Number(budgetSummary.overheadCost || 0).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                    Contingency (Reserve)
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                    {currency} {Number(budgetSummary.contingencyCost || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBTAB 3: RESOURCE SUMMARY ── */}
      {subTab === "resources" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-smoky p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users size={16} className="text-purple-600" />
                <span>Resource Allocation &amp; Requirements ({resources.length})</span>
              </h3>
              <p className="text-xs text-slate-500">
                Personnel, heavy equipment, tools, and materials assigned to this project.
              </p>
            </div>

            <Link
              to={`/project-management/resources?project_id=${project?.id}&from=plan`}
              state={planReturnState || { from: `/project-management/plan?projectId=${project?.id}` }}
              className="px-3.5 py-1.5 rounded-xl bg-[#0E3646] hover:bg-[#164356] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs self-start sm:self-auto shrink-0"
            >
              <span>Manage Allocations</span>
              <ExternalLink size={12} />
            </Link>
          </div>

          {resources.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Resource Name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3">Accountable Person</th>
                    <th className="py-2.5 px-3">Allocation Window</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {resources.map((r, idx) => (
                    <tr key={r.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                        {r.resource_name}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {r.resource_type || "EQUIPMENT"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {Number(r.allocated_qty || 1).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        {r.accountable_user_name || "Unassigned"}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {formatPlanDate(r.start_date, "Start")} → {formatPlanDate(r.end_date, "Finish")}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            r.status === "ALLOCATED" || r.status === "IN_USE"
                              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {r.status || "ALLOCATED"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs space-y-2">
              <Users size={24} className="mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600 dark:text-slate-400">No resources assigned to project</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Allocate personnel, tools, machinery, and equipment in the Resource Management module to establish resource commitments.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
