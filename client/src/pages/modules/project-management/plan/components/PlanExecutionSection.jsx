import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Compass,
  GitMerge,
  Users,
  Truck,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Wrench,
  Boxes,
  Briefcase,
  Sliders,
} from "lucide-react";

export default function PlanExecutionSection({
  project,
  plan,
  onChangePlan,
  readOnly = false,
  planReturnState,
}) {
  const [subTab, setSubTab] = useState("methodology"); // "methodology" | "phases" | "raci" | "resourceStrategy"

  // Phases state
  const phases = plan?.phases || [];
  const [editingPhase, setEditingPhase] = useState(null);
  const [showPhaseModal, setShowPhaseModal] = useState(false);

  const [phaseName, setPhaseName] = useState("");
  const [phaseDesc, setPhaseDesc] = useState("");
  const [phaseStart, setPhaseStart] = useState("");
  const [phaseEnd, setPhaseEnd] = useState("");
  const [phaseLead, setPhaseLead] = useState("");
  const [phaseDeliverables, setPhaseDeliverables] = useState("");
  const [phaseStatus, setPhaseStatus] = useState("PLANNED");

  const handleOpenAddPhase = () => {
    setEditingPhase(null);
    setPhaseName("");
    setPhaseDesc("");
    setPhaseStart(project?.start_date || "");
    setPhaseEnd(project?.end_date || "");
    setPhaseLead(project?.manager_name || "");
    setPhaseDeliverables("");
    setPhaseStatus("PLANNED");
    setShowPhaseModal(true);
  };

  const handleOpenEditPhase = (p) => {
    setEditingPhase(p);
    setPhaseName(p.phase_name || "");
    setPhaseDesc(p.description || "");
    setPhaseStart(p.planned_start || "");
    setPhaseEnd(p.planned_end || "");
    setPhaseLead(p.responsible_person || "");
    setPhaseDeliverables(p.deliverables || "");
    setPhaseStatus(p.status || "PLANNED");
    setShowPhaseModal(true);
  };

  const handleSavePhase = (e) => {
    e.preventDefault();
    if (!phaseName.trim()) return;

    let updated = [];
    if (editingPhase) {
      updated = phases.map((p) =>
        p.id === editingPhase.id
          ? {
              ...p,
              phase_name: phaseName.trim(),
              description: phaseDesc.trim(),
              planned_start: phaseStart || null,
              planned_end: phaseEnd || null,
              responsible_person: phaseLead.trim(),
              deliverables: phaseDeliverables.trim(),
              status: phaseStatus,
            }
          : p
      );
    } else {
      const newP = {
        id: Date.now(),
        phase_name: phaseName.trim(),
        description: phaseDesc.trim(),
        planned_start: phaseStart || null,
        planned_end: phaseEnd || null,
        responsible_person: phaseLead.trim() || project?.manager_name || "Lead",
        deliverables: phaseDeliverables.trim(),
        status: phaseStatus,
      };
      updated = [...phases, newP];
    }

    onChangePlan({ phases: updated });
    setShowPhaseModal(false);
  };

  const handleDeletePhase = (id) => {
    const updated = phases.filter((p) => p.id !== id);
    onChangePlan({ phases: updated });
  };

  // RACI Matrix configuration
  const raciRoles = [
    { key: "sponsor", label: "Sponsor / Client" },
    { key: "pm", label: "Project Manager" },
    { key: "techLead", label: "Technical Lead" },
    { key: "siteSuper", label: "Site Supervisor" },
    { key: "subcontractor", label: "Subcontractor" },
    { key: "qaOfficer", label: "QA/QC Lead" },
  ];

  // RACI activities derived from phases & deliverables
  const raciActivities = (phases.length > 0 ? phases : [
    { phase_name: "Phase 1: Project Setup & Baseline Approval" },
    { phase_name: "Phase 2: Substructure & Foundation Delivery" },
    { phase_name: "Phase 3: Core Construction & MEP Works" },
    { phase_name: "Phase 4: Inspection, Commissioning & Handover" },
  ]).map((p, idx) => ({ id: p.id || idx + 1, name: p.phase_name }));

  const currentRaci = plan?.raci_matrix || [];

  const handleToggleRaci = (activityId, roleKey) => {
    if (readOnly) return;
    const mapping = ["R", "A", "C", "I", ""];
    const existingEntry = currentRaci.find((r) => r.activityId === activityId && r.roleKey === roleKey);
    const currentVal = existingEntry ? existingEntry.val : "";
    const nextIdx = (mapping.indexOf(currentVal) + 1) % mapping.length;
    const nextVal = mapping[nextIdx];

    let updated = currentRaci.filter((r) => !(r.activityId === activityId && r.roleKey === roleKey));
    if (nextVal) {
      updated.push({ activityId, roleKey, val: nextVal });
    }
    onChangePlan({ raci_matrix: updated });
  };

  const getRaciValue = (activityId, roleKey) => {
    const found = currentRaci.find((r) => r.activityId === activityId && r.roleKey === roleKey);
    return found ? found.val : "";
  };

  return (
    <div className="space-y-6">
      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-smoky">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
            <Compass size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Section 3: Project Execution Strategy
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Defines delivery methodology, major project stage phases, RACI responsibility matrix, and resource strategy.
            </p>
          </div>
        </div>

        {/* Subtab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setSubTab("methodology")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === "methodology"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Methodology
          </button>
          <button
            type="button"
            onClick={() => setSubTab("phases")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === "phases"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Project Phases ({phases.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("raci")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === "raci"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            RACI Matrix
          </button>
          <button
            type="button"
            onClick={() => setSubTab("resourceStrategy")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              subTab === "resourceStrategy"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Resource Strategy
          </button>
        </div>
      </div>

      {/* ── SUBTAB 1: DELIVERY METHODOLOGY ── */}
      {subTab === "methodology" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-smoky p-5 sm:p-6 space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders size={16} className="text-purple-600" />
              <span>Project Delivery Methodology</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select the governing execution framework and delivery cadence:
            </p>

            {/* Methodology Radio Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-3">
              {[
                { val: "HYBRID", label: "Hybrid", desc: "CPM + Agile" },
                { val: "WATERFALL", label: "Waterfall", desc: "Stage Gates" },
                { val: "AGILE", label: "Agile", desc: "Sprints / Scrum" },
                { val: "PHASED", label: "Phased", desc: "Fast-Track" },
                { val: "ITERATIVE", label: "Iterative", desc: "Design-Build" },
                { val: "TURNKEY", label: "Turnkey EPC", desc: "Eng-Proc-Const" },
              ].map((m) => {
                const isSelected = (plan?.methodology || "HYBRID") === m.val;
                return (
                  <label
                    key={m.val}
                    className={`flex items-start gap-2 p-2.5 rounded-2xl border text-xs cursor-pointer transition select-none ${
                      isSelected
                        ? "bg-purple-50 dark:bg-purple-950/50 border-purple-400 dark:border-purple-600 text-purple-900 dark:text-purple-200 ring-1 ring-purple-400"
                        : "bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    } ${readOnly ? "opacity-60 pointer-events-none" : ""}`}
                  >
                    <input
                      type="radio"
                      name="delivery_methodology"
                      value={m.val}
                      checked={isSelected}
                      disabled={readOnly}
                      onChange={() => onChangePlan({ methodology: m.val })}
                      className="mt-0.5 accent-purple-600 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="font-bold block truncate">{m.label}</span>
                      <span className="text-[10px] text-slate-400 block truncate">{m.desc}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">
                Methodology Description &amp; Approach
              </label>
              <textarea
                rows={4}
                disabled={readOnly}
                placeholder="Describe how this delivery methodology will be implemented on this project..."
                value={plan?.methodology_description || ""}
                onChange={(e) => onChangePlan({ methodology_description: e.target.value })}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">
                Methodology Justification
              </label>
              <textarea
                rows={4}
                disabled={readOnly}
                placeholder="Why is this chosen methodology optimal for this project's constraints and complexity?"
                value={plan?.methodology_justification || ""}
                onChange={(e) => onChangePlan({ methodology_justification: e.target.value })}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">
                Overall Delivery &amp; Coordination Approach
              </label>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Site management hierarchy, progress tracking cadence, and vendor coordination..."
                value={plan?.delivery_approach || ""}
                onChange={(e) => onChangePlan({ delivery_approach: e.target.value })}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 block">
                Key Execution Considerations &amp; Interface Risks
              </label>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Specialist contractor handovers, material lead times, and environmental constraints..."
                value={plan?.key_execution_considerations || ""}
                onChange={(e) => onChangePlan({ key_execution_considerations: e.target.value })}
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── SUBTAB 2: MAJOR PROJECT PHASES ── */}
      {subTab === "phases" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-smoky p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GitMerge size={16} className="text-purple-600" />
                <span>Major Project Phases &amp; Stage Gates ({phases.length})</span>
              </h3>
              <p className="text-xs text-slate-500">
                High-level delivery phases linking WBS packages, stage gates, and deliverables.
              </p>
            </div>

            {!readOnly && (
              <button
                type="button"
                onClick={handleOpenAddPhase}
                className="px-3.5 py-1.5 rounded-xl bg-[#0E3646] hover:bg-[#164356] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs self-start sm:self-auto cursor-pointer"
              >
                <Plus size={13} />
                <span>+ Add Phase</span>
              </button>
            )}
          </div>

          {phases.length > 0 ? (
            <div className="space-y-3">
              {phases.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {p.phase_name}
                        </h4>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            p.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200"
                              : p.status === "IN_PROGRESS"
                              ? "bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {p.description || "Project phase"}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2 flex-wrap">
                        <span>Lead: <strong className="text-slate-700 dark:text-slate-300">{p.responsible_person || "Unassigned"}</strong></span>
                        <span>•</span>
                        <span>Window: <strong className="text-slate-700 dark:text-slate-300">{p.planned_start || "Start"} → {p.planned_end || "Finish"}</strong></span>
                        {p.deliverables && (
                          <>
                            <span>•</span>
                            <span>Deliverables: <strong className="text-brand-700 dark:text-brand-300">{p.deliverables}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {!readOnly && (
                    <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditPhase(p)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-white dark:hover:bg-slate-700 transition"
                        title="Edit phase"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePhase(p.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-700 transition"
                        title="Delete phase"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs space-y-2">
              <GitMerge size={24} className="mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600 dark:text-slate-400">No project phases defined yet</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Define the major sequence of delivery phases (e.g. Initiation, Planning, Execution, Handover).
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── SUBTAB 3: ROLES & RESPONSIBILITIES (RACI MATRIX) ── */}
      {subTab === "raci" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-smoky p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users size={16} className="text-purple-600" />
                <span>Roles and Responsibilities (RACI Matrix)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Maps work activities to roles. Click any cell to cycle through <strong>R</strong> (Responsible), <strong>A</strong> (Accountable), <strong>C</strong> (Consulted), <strong>I</strong> (Informed).
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">R: Responsible</span>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">A: Accountable</span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800">C: Consulted</span>
              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800">I: Informed</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 min-w-[240px]">Project Work Activity / Phase</th>
                  {raciRoles.map((role) => (
                    <th key={role.key} className="py-2.5 px-2 text-center whitespace-nowrap">
                      {role.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {raciActivities.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition">
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                      {act.name}
                    </td>
                    {raciRoles.map((role) => {
                      const val = getRaciValue(act.id, role.key);
                      return (
                        <td key={role.key} className="py-2 px-2 text-center">
                          <button
                            type="button"
                            disabled={readOnly}
                            onClick={() => handleToggleRaci(act.id, role.key)}
                            className={`w-8 h-8 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center mx-auto ${
                              val === "R"
                                ? "bg-emerald-500 text-white shadow-2xs"
                                : val === "A"
                                ? "bg-blue-600 text-white shadow-2xs"
                                : val === "C"
                                ? "bg-amber-500 text-white shadow-2xs"
                                : val === "I"
                                ? "bg-purple-600 text-white shadow-2xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-300 hover:text-slate-600 hover:bg-slate-200"
                            }`}
                            title="Click to change RACI code"
                          >
                            {val || "—"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUBTAB 4: RESOURCE STRATEGY ── */}
      {subTab === "resourceStrategy" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-smoky p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck size={16} className="text-purple-600" />
                <span>Overall Resource Strategy</span>
              </h3>
              <p className="text-xs text-slate-500">
                High-level strategy governing labor, plant equipment, materials, and specialist subcontractors.
              </p>
            </div>

            <Link
              to={`/project-management/resources?project_id=${project?.id}&from=plan`}
              state={planReturnState || { from: `/project-management/plan?projectId=${project?.id}` }}
              className="text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline flex items-center gap-1"
            >
              <span>Manage Detailed Resources</span>
              <ExternalLink size={11} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-850/50 border border-slate-200/70 dark:border-slate-800 space-y-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Users size={14} className="text-brand-600" />
                <span>Human Resources &amp; Labor Strategy</span>
              </label>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Staffing model, internal leads vs outsourced trade labor, shifts, and competencies..."
                value={plan?.resource_strategy?.laborApproach || ""}
                onChange={(e) =>
                  onChangePlan({
                    resource_strategy: {
                      ...plan?.resource_strategy,
                      laborApproach: e.target.value,
                    },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-850/50 border border-slate-200/70 dark:border-slate-800 space-y-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Wrench size={14} className="text-amber-600" />
                <span>Plant, Machinery &amp; Equipment Strategy</span>
              </label>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Owned fleet vs rental machinery, maintenance routines, and mobilization plan..."
                value={plan?.resource_strategy?.equipmentApproach || ""}
                onChange={(e) =>
                  onChangePlan({
                    resource_strategy: {
                      ...plan?.resource_strategy,
                      equipmentApproach: e.target.value,
                    },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-850/50 border border-slate-200/70 dark:border-slate-800 space-y-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Boxes size={14} className="text-blue-600" />
                <span>Materials Management &amp; Staging Strategy</span>
              </label>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Bulk purchasing, temporal on-site storage warehouses, and wastage control..."
                value={plan?.resource_strategy?.materialsApproach || ""}
                onChange={(e) =>
                  onChangePlan({
                    resource_strategy: {
                      ...plan?.resource_strategy,
                      materialsApproach: e.target.value,
                    },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-850/50 border border-slate-200/70 dark:border-slate-800 space-y-2">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Briefcase size={14} className="text-emerald-600" />
                <span>Specialist Trade Subcontractors Strategy</span>
              </label>
              <textarea
                rows={3}
                disabled={readOnly}
                placeholder="Outsourced specialist scopes, back-to-back contract covenants, and payment retentions..."
                value={plan?.resource_strategy?.subcontractorApproach || ""}
                onChange={(e) =>
                  onChangePlan({
                    resource_strategy: {
                      ...plan?.resource_strategy,
                      subcontractorApproach: e.target.value,
                    },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Phase Modal ── */}
      {showPhaseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GitMerge size={18} className="text-purple-600" />
                <span>{editingPhase ? "Edit Project Phase" : "Add Project Phase"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPhaseModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePhase} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Phase Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Phase 2: Foundation & Substructure Works"
                  value={phaseName}
                  onChange={(e) => setPhaseName(e.target.value)}
                  className="w-full text-xs h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Phase scope and key deliverables..."
                  value={phaseDesc}
                  onChange={(e) => setPhaseDesc(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Planned Start Date
                  </label>
                  <input
                    type="date"
                    value={phaseStart}
                    onChange={(e) => setPhaseStart(e.target.value)}
                    className="w-full text-xs h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Planned Finish Date
                  </label>
                  <input
                    type="date"
                    value={phaseEnd}
                    onChange={(e) => setPhaseEnd(e.target.value)}
                    className="w-full text-xs h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Responsible Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Project Manager"
                    value={phaseLead}
                    onChange={(e) => setPhaseLead(e.target.value)}
                    className="w-full text-xs h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Phase Status
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { val: "PLANNED", label: "Planned" },
                      { val: "IN_PROGRESS", label: "In Progress" },
                      { val: "COMPLETED", label: "Completed" },
                    ].map((s) => (
                      <label
                        key={s.val}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                          phaseStatus === s.val
                            ? "bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-600 text-purple-900 dark:text-purple-200 font-bold"
                            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <input
                          type="radio"
                          name="phase_status"
                          value={s.val}
                          checked={phaseStatus === s.val}
                          onChange={(e) => setPhaseStatus(e.target.value)}
                          className="w-3.5 h-3.5 accent-purple-600"
                        />
                        <span>{s.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Associated Deliverables
                </label>
                <input
                  type="text"
                  placeholder="e.g. Submittals, Inspection Pass Certificate"
                  value={phaseDeliverables}
                  onChange={(e) => setPhaseDeliverables(e.target.value)}
                  className="w-full text-xs h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPhaseModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0E3646] text-white text-xs font-bold hover:bg-[#164356] transition shadow-sm"
                >
                  {editingPhase ? "Save Phase" : "Add Phase"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
