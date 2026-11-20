import React, { useState } from "react";
import { Link } from "react-router-dom";
import { formatPlanDate } from "../ProjectPlanPage.jsx";
import {
  Layers,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Circle,
  Clock,
  ChevronDown,
  ChevronRight,
  Calendar,
  User,
  ShieldCheck,
  FileCheck,
  AlertTriangle,
  FolderTree,
  ListTodo,
} from "lucide-react";

export default function PlanScopeSection({
  project,
  plan,
  tasks = [],
  onChangePlan,
  readOnly = false,
  planReturnState,
}) {
  const [subTab, setSubTab] = useState("scopeDef"); // "scopeDef" | "wbs" | "deliverables"

  // Deliverables state
  const deliverables = plan?.deliverables || [];
  const [editingDeliverable, setEditingDeliverable] = useState(null);
  const [showDelivModal, setShowDelivModal] = useState(false);

  const [delivName, setDelivName] = useState("");
  const [delivDesc, setDelivDesc] = useState("");
  const [delivWbs, setDelivWbs] = useState("");
  const [delivResponsible, setDelivResponsible] = useState("");
  const [delivPlannedDate, setDelivPlannedDate] = useState("");
  const [delivCriteria, setDelivCriteria] = useState("");
  const [delivStatus, setDelivStatus] = useState("PLANNED");

  const handleOpenAddDeliv = () => {
    setEditingDeliverable(null);
    setDelivName("");
    setDelivDesc("");
    setDelivWbs("1.0");
    setDelivResponsible(project?.manager_name || "");
    setDelivPlannedDate(project?.end_date || "");
    setDelivCriteria("");
    setDelivStatus("PLANNED");
    setShowDelivModal(true);
  };

  const handleOpenEditDeliv = (d) => {
    setEditingDeliverable(d);
    setDelivName(d.name || "");
    setDelivDesc(d.description || "");
    setDelivWbs(d.wbs_code || "");
    setDelivResponsible(d.responsible_person || "");
    setDelivPlannedDate(d.planned_completion || "");
    setDelivCriteria(d.acceptance_criteria || "");
    setDelivStatus(d.status || "PLANNED");
    setShowDelivModal(true);
  };

  const handleSaveDeliv = (e) => {
    e.preventDefault();
    if (!delivName.trim()) return;

    let updated = [];
    if (editingDeliverable) {
      updated = deliverables.map((d) =>
        d.id === editingDeliverable.id
          ? {
              ...d,
              name: delivName.trim(),
              description: delivDesc.trim(),
              wbs_code: delivWbs.trim(),
              responsible_person: delivResponsible.trim(),
              planned_completion: delivPlannedDate || null,
              acceptance_criteria: delivCriteria.trim(),
              status: delivStatus,
            }
          : d
      );
    } else {
      const newD = {
        id: Date.now(),
        name: delivName.trim(),
        description: delivDesc.trim(),
        wbs_code: delivWbs.trim() || "1.0",
        responsible_person: delivResponsible.trim() || project?.manager_name || "Lead",
        planned_completion: delivPlannedDate || null,
        acceptance_criteria: delivCriteria.trim(),
        status: delivStatus,
      };
      updated = [...deliverables, newD];
    }

    onChangePlan({ deliverables: updated });
    setShowDelivModal(false);
  };

  const handleDeleteDeliv = (id) => {
    const updated = deliverables.filter((d) => d.id !== id);
    onChangePlan({ deliverables: updated });
  };

  const projectScopes = project?.project_scopes || [];

  return (
    <div className="space-y-6">
      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-smoky">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold">
            <Layers size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Section 2: Project Scope &amp; Work Structure
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Establishes what the project will deliver, work breakdown structure hierarchy, and key deliverables register.
            </p>
          </div>
        </div>

        {/* Subtab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setSubTab("scopeDef")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === "scopeDef"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Scope Definition
          </button>
          <button
            type="button"
            onClick={() => setSubTab("wbs")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === "wbs"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            WBS Hierarchy
          </button>
          <button
            type="button"
            onClick={() => setSubTab("deliverables")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === "deliverables"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Deliverables Register ({deliverables.length})
          </button>
        </div>
      </div>

      {/* ── SUBTAB 1: SCOPE DEFINITION ── */}
      {subTab === "scopeDef" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-smoky p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck size={16} className="text-sky-600" />
                <span>Project Scope Statement &amp; Boundaries</span>
              </h3>
              <p className="text-xs text-slate-500">
                Authoritative boundary and scope conditions governing project execution.
              </p>
            </div>
            <Link
              to={`/project-management/projects/${project?.id}?from=plan`}
              state={planReturnState || { from: `/project-management/plan?projectId=${project?.id}` }}
              className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline flex items-center gap-1"
            >
              <span>Project Scope Source</span>
              <ExternalLink size={11} />
            </Link>
          </div>

          <div className="space-y-4 text-xs">
            {/* Primary Scope Statement */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">
                Primary Scope Statement *
              </label>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Comprehensive description of the work to be performed..."
                value={plan?.scope_statement || ""}
                onChange={(e) => onChangePlan({ scope_statement: e.target.value })}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>

            {/* Inclusions vs Exclusions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 size={13} />
                  <span>Included Activities (In-Scope)</span>
                </label>
                <textarea
                  rows={3}
                  disabled={readOnly}
                  placeholder="Key activities, milestones, and systems included in delivery..."
                  value={plan?.included_activities || ""}
                  onChange={(e) => onChangePlan({ included_activities: e.target.value })}
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                  <AlertTriangle size={13} />
                  <span>Excluded Activities (Out-of-Scope)</span>
                </label>
                <textarea
                  rows={3}
                  disabled={readOnly}
                  placeholder="Work items explicitly excluded from this contract..."
                  value={plan?.excluded_activities || ""}
                  onChange={(e) => onChangePlan({ excluded_activities: e.target.value })}
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
                />
              </div>
            </div>

            {/* Assumptions & Constraints */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Project Assumptions
                </label>
                <textarea
                  rows={3}
                  disabled={readOnly}
                  placeholder="Operational, environmental, and commercial assumptions..."
                  value={plan?.assumptions || ""}
                  onChange={(e) => onChangePlan({ assumptions: e.target.value })}
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Project Constraints &amp; Limits
                </label>
                <textarea
                  rows={3}
                  disabled={readOnly}
                  placeholder="Fixed schedule caps, budget limits, site restrictions, or zoning covenants..."
                  value={plan?.constraints || ""}
                  onChange={(e) => onChangePlan({ constraints: e.target.value })}
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
                />
              </div>
            </div>

            {/* Boundaries & Acceptance Criteria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Project Boundaries &amp; Interfaces
                </label>
                <textarea
                  rows={2}
                  disabled={readOnly}
                  placeholder="Physical boundary lines, contractor battery limits, and client handover demarcation..."
                  value={plan?.project_boundaries || ""}
                  onChange={(e) => onChangePlan({ project_boundaries: e.target.value })}
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Overall Acceptance Criteria
                </label>
                <textarea
                  rows={2}
                  disabled={readOnly}
                  placeholder="Conditions required for formal client sign-off and milestone acceptance..."
                  value={plan?.acceptance_criteria || ""}
                  onChange={(e) => onChangePlan({ acceptance_criteria: e.target.value })}
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBTAB 2: WORK BREAKDOWN STRUCTURE (WBS) HIERARCHY ── */}
      {subTab === "wbs" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-smoky">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderTree size={16} className="text-sky-600" />
                <span>Hierarchical Work Breakdown Structure</span>
              </h3>
              <p className="text-xs text-slate-500">
                Displays the 4-tier hierarchy: Project → Scope Levels → Work Packages → Scheduled Tasks.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={`/project-management/tasks/new?project_id=${project?.id}&from=plan`}
                state={planReturnState || { from: `/project-management/plan?projectId=${project?.id}` }}
                className="px-3.5 py-1.5 rounded-xl bg-[#0E3646] hover:bg-[#164356] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              >
                <Plus size={13} />
                <span>+ Schedule Activity</span>
              </Link>
              <Link
                to={`/project-management/gantt?projectId=${project?.id}&from=plan`}
                state={planReturnState || { from: `/project-management/plan?projectId=${project?.id}` }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
              >
                <Calendar size={13} />
                <span>Gantt Timeline</span>
              </Link>
            </div>
          </div>

          {projectScopes.length > 0 ? (
            <div className="space-y-4">
              {projectScopes.map((scope, sIdx) => {
                const scopeTasks = tasks.filter(
                  (t) =>
                    String(t.scope_id) === String(scope.id) ||
                    (t.scope_name && scope.name && t.scope_name.toLowerCase() === scope.name.toLowerCase()) ||
                    (t.wbs_code && scope.wbs_code && t.wbs_code.startsWith(scope.wbs_code))
                );

                const doneCount = scopeTasks.filter(
                  (t) => t.status === "COMPLETED" || Number(t.completion_percent || 0) >= 100
                ).length;
                const progressPct =
                  scopeTasks.length > 0 ? Math.round((doneCount / scopeTasks.length) * 100) : 0;

                return (
                  <div
                    key={scope.id || sIdx}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-smoky overflow-hidden"
                  >
                    {/* Level 1: Scope Package Header */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-[#0E3646] text-white flex items-center justify-center font-mono font-bold text-xs shrink-0 shadow-sm">
                          {scope.wbs_code || `${sIdx + 1}.0`}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {scope.name || scope.title || `Scope Level #${sIdx + 1}`}
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {scope.status || "ACTIVE"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {scope.description || "Primary project scope package"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs shrink-0">
                        <div className="text-right">
                          <span className="text-slate-400 text-[10px] block uppercase">Scheduled Tasks</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {doneCount} / {scopeTasks.length} Completed ({progressPct}%)
                          </span>
                        </div>
                        <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Level 2: Work Packages & Tasks Table */}
                    <div className="p-4 sm:p-5">
                      {scopeTasks.length > 0 ? (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {scopeTasks.map((t) => (
                            <div
                              key={t.id}
                              className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                                  {t.wbs_code || `${sIdx + 1}.${t.id}`}
                                </span>

                                {t.status === "COMPLETED" ? (
                                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                ) : t.status === "IN_PROGRESS" ? (
                                  <Clock size={16} className="text-blue-500 shrink-0" />
                                ) : (
                                  <Circle size={16} className="text-slate-400 shrink-0" />
                                )}

                                <div className="min-w-0">
                                  <span className="font-bold text-slate-900 dark:text-white block truncate">
                                    {t.task_title || t.title}
                                  </span>
                                  <span className="text-[11px] text-slate-400 block truncate">
                                    Assigned: {t.assigned_to_name || "Unassigned"} • Start: {formatPlanDate(t.start_date)} → End: {formatPlanDate(t.end_date)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                                {t.is_critical ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200">
                                    Critical Path
                                  </span>
                                ) : null}

                                <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                                  {t.completion_percent || 0}%
                                </span>

                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    t.status === "COMPLETED"
                                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200"
                                      : t.status === "IN_PROGRESS"
                                      ? "bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200"
                                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                  }`}
                                >
                                  {t.status}
                                </span>

                                <Link
                                  to={`/project-management/tasks/${t.id}/execute?from=plan`}
                                  state={planReturnState || { from: `/project-management/plan?projectId=${project?.id}` }}
                                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700"
                                  title="Open Task Execution"
                                >
                                  <ExternalLink size={13} />
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                          No tasks directly mapped to this scope level yet. Add scheduled activities to expand this branch.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-smoky space-y-2">
              <FolderTree size={28} className="mx-auto text-slate-300" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No Scopes defined in Project Setup
              </h4>
              <p className="text-xs text-slate-500">
                Scopes defined in Project Charter or Task Management will be consolidated here into the master hierarchy.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── SUBTAB 3: KEY DELIVERABLES REGISTER ── */}
      {subTab === "deliverables" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-smoky p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ListTodo size={16} className="text-sky-600" />
                <span>Key Deliverables Register ({deliverables.length})</span>
              </h3>
              <p className="text-xs text-slate-500">
                Contractual milestones and tangible work package products required for client acceptance.
              </p>
            </div>

            {!readOnly && (
              <button
                type="button"
                onClick={handleOpenAddDeliv}
                className="px-3.5 py-1.5 rounded-xl bg-[#0E3646] hover:bg-[#164356] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs self-start sm:self-auto cursor-pointer"
              >
                <Plus size={13} />
                <span>+ Add Deliverable</span>
              </button>
            )}
          </div>

          {deliverables.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">WBS</th>
                    <th className="py-2.5 px-3">Deliverable Name &amp; Description</th>
                    <th className="py-2.5 px-3">Responsible Lead</th>
                    <th className="py-2.5 px-3">Planned Finish</th>
                    <th className="py-2.5 px-3">Acceptance Criteria</th>
                    <th className="py-2.5 px-3">Status</th>
                    {!readOnly && <th className="py-2.5 px-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {deliverables.map((d, idx) => (
                    <tr key={d.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition">
                      <td className="py-3 px-3 font-mono font-bold text-brand-800 dark:text-brand-300">
                        {d.wbs_code || `${idx + 1}.0`}
                      </td>
                      <td className="py-3 px-3 min-w-[200px]">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {d.name}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {d.description || "Tangible project output"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {d.responsible_person || "Unassigned"}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {d.planned_completion || "TBD"}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 min-w-[180px]">
                        {d.acceptance_criteria || "Client sign-off upon inspection"}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            d.status === "COMPLETED" || d.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200"
                              : d.status === "IN_PROGRESS"
                              ? "bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      {!readOnly && (
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenEditDeliv(d)}
                            className="p-1 rounded text-slate-500 hover:text-brand-600 mr-1"
                            title="Edit deliverable"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDeliv(d.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-600"
                            title="Delete deliverable"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs space-y-2">
              <ListTodo size={24} className="mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600 dark:text-slate-400">
                No deliverables recorded in register
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Add tangible work products, inspection hold-points, and contractual deliverables to be verified during project execution.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Add / Edit Deliverable Modal ── */}
      {showDelivModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ListTodo size={18} className="text-sky-600" />
                <span>{editingDeliverable ? "Edit Deliverable" : "Add Key Deliverable"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowDelivModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDeliv} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Deliverable Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Substructure Concrete Core Inspection Dossier"
                  value={delivName}
                  onChange={(e) => setDelivName(e.target.value)}
                  className="w-full text-xs h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Description &amp; Specifications
                </label>
                <textarea
                  rows={2}
                  placeholder="Detailed output requirements..."
                  value={delivDesc}
                  onChange={(e) => setDelivDesc(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    WBS / Work Package Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1.2 or 2.0"
                    value={delivWbs}
                    onChange={(e) => setDelivWbs(e.target.value)}
                    className="w-full text-xs h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Responsible Lead
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Engineer / PM"
                    value={delivResponsible}
                    onChange={(e) => setDelivResponsible(e.target.value)}
                    className="w-full text-xs h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Planned Completion Date
                  </label>
                  <input
                    type="date"
                    value={delivPlannedDate}
                    onChange={(e) => setDelivPlannedDate(e.target.value)}
                    className="w-full text-xs h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Deliverable Status
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { val: "PLANNED", label: "Planned" },
                      { val: "IN_PROGRESS", label: "In Progress" },
                      { val: "COMPLETED", label: "Completed" },
                      { val: "APPROVED", label: "Approved" },
                    ].map((s) => (
                      <label
                        key={s.val}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                          delivStatus === s.val
                            ? "bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-600 text-sky-900 dark:text-sky-200 font-bold"
                            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <input
                          type="radio"
                          name="deliv_status"
                          value={s.val}
                          checked={delivStatus === s.val}
                          onChange={(e) => setDelivStatus(e.target.value)}
                          className="w-3.5 h-3.5 accent-sky-600"
                        />
                        <span>{s.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Acceptance Criteria
                </label>
                <input
                  type="text"
                  placeholder="e.g. Third-party testing sign-off, zero defect tolerance"
                  value={delivCriteria}
                  onChange={(e) => setDelivCriteria(e.target.value)}
                  className="w-full text-xs h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDelivModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0E3646] text-white text-xs font-bold hover:bg-[#164356] transition shadow-sm"
                >
                  {editingDeliverable ? "Save Deliverable" : "Add Deliverable"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
