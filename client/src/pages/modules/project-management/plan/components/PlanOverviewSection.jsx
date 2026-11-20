import React, { useState } from "react";
import { Link } from "react-router-dom";
import { formatPlanDate } from "../ProjectPlanPage.jsx";
import {
  Target,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  Building2,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  FileText,
  User,
  Shield,
  Briefcase,
  AlertCircle,
} from "lucide-react";

export default function PlanOverviewSection({
  project,
  plan,
  onChangePlan,
  readOnly = false,
  planReturnState,
}) {
  const [editingObjective, setEditingObjective] = useState(null);
  const [showObjModal, setShowObjModal] = useState(false);

  // Form state for Add/Edit Objective
  const [objTitle, setObjTitle] = useState("");
  const [objDesc, setObjDesc] = useState("");
  const [objCriteria, setObjCriteria] = useState("");
  const [objTargetOutcome, setObjTargetOutcome] = useState("");
  const [objDeliverables, setObjDeliverables] = useState("");

  const objectives = plan?.objectives || [];

  const handleOpenAddObj = () => {
    setEditingObjective(null);
    setObjTitle("");
    setObjDesc("");
    setObjCriteria("");
    setObjTargetOutcome("");
    setObjDeliverables("");
    setShowObjModal(true);
  };

  const handleOpenEditObj = (obj) => {
    setEditingObjective(obj);
    setObjTitle(obj.title || "");
    setObjDesc(obj.description || "");
    setObjCriteria(obj.criteria || "");
    setObjTargetOutcome(obj.targetOutcome || "");
    setObjDeliverables(obj.deliverables || "");
    setShowObjModal(true);
  };

  const handleSaveObj = (e) => {
    e.preventDefault();
    if (!objTitle.trim()) return;

    let updated = [];
    if (editingObjective) {
      updated = objectives.map((o) =>
        o.id === editingObjective.id
          ? {
              ...o,
              title: objTitle.trim(),
              description: objDesc.trim(),
              criteria: objCriteria.trim(),
              targetOutcome: objTargetOutcome.trim(),
              deliverables: objDeliverables.trim(),
            }
          : o
      );
    } else {
      const newObj = {
        id: Date.now(),
        title: objTitle.trim(),
        description: objDesc.trim(),
        criteria: objCriteria.trim(),
        targetOutcome: objTargetOutcome.trim(),
        deliverables: objDeliverables.trim(),
      };
      updated = [...objectives, newObj];
    }

    onChangePlan({ objectives: updated });
    setShowObjModal(false);
  };

  const handleDeleteObj = (id) => {
    const updated = objectives.filter((o) => o.id !== id);
    onChangePlan({ objectives: updated });
  };

  // Compute duration in days
  const startDate = project?.start_date;
  const endDate = project?.end_date;
  let durationDays = "TBD";
  if (startDate && endDate) {
    const d1 = new Date(startDate);
    const d2 = new Date(endDate);
    if (!isNaN(d1) && !isNaN(d2)) {
      const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      durationDays = diff > 0 ? `${diff} Days` : "0 Days";
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Section Header & Charter Link ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-smoky">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand flex items-center justify-center font-bold">
            <Target size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Section 1: Project Overview &amp; Objectives
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Defines the project purpose, delivery expectations, strategic justification, and measurable success criteria.
            </p>
          </div>
        </div>

        <Link
          to={`/project-management/projects/${project?.id}?from=plan`}
          state={planReturnState || { from: `/project-management/plan?projectId=${project?.id}` }}
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto shrink-0"
          title="Open Project Master Definition in Project Setup"
        >
          <span>Source: Project Charter</span>
          <ExternalLink size={12} />
        </Link>
      </div>

      {/* ── Project Master Overview Grid ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-smoky p-5 sm:p-6 space-y-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Briefcase size={16} className="text-brand-600" />
          <span>Project Master Parameters</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Project Name */}
          <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Project Name &amp; Code
            </span>
            <span className="font-bold text-slate-900 dark:text-white block text-sm">
              {project?.project_name || "Untitled Project"}
            </span>
            <span className="font-mono text-[11px] font-bold text-brand-700 dark:text-brand-300 mt-0.5 block">
              {project?.project_code || `PRJ-${project?.id}`}
            </span>
          </div>

          {/* Project Sponsor & Client */}
          <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Client &amp; Project Sponsor
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs truncate">
              {project?.client_name || "General Client / Internal"}
            </span>
            <div className="mt-1">
              <input
                type="text"
                disabled={readOnly}
                placeholder="Enter Sponsor Name..."
                value={plan?.project_sponsor || ""}
                onChange={(e) => onChangePlan({ project_sponsor: e.target.value })}
                className="w-full text-[11px] px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Project Manager */}
          <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Project Manager
            </span>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-7 h-7 rounded-full bg-[#0E3646] text-white flex items-center justify-center text-xs font-bold shrink-0">
                {(project?.manager_name || "PM").charAt(0)}
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 dark:text-white block truncate">
                  {project?.manager_name || "Unassigned Lead"}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  Authorized Delivery Lead
                </span>
              </div>
            </div>
          </div>

          {/* Classification & Priority */}
          <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Priority &amp; Classification
            </span>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200">
                {project?.project_priority || "MEDIUM"}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Status: {project?.project_status || "PLANNING"}
              </span>
            </div>
            <select
              disabled={readOnly}
              value={plan?.project_classification || "CAPITAL_INFRASTRUCTURE"}
              onChange={(e) => onChangePlan({ project_classification: e.target.value })}
              className="w-full text-[11px] px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="CAPITAL_INFRASTRUCTURE">Capital Infrastructure</option>
              <option value="COMMERCIAL_BUILDING">Commercial Building</option>
              <option value="RESIDENTIAL_DEVELOPMENT">Residential Development</option>
              <option value="CIVIL_WORKS">Civil Works &amp; Utilities</option>
              <option value="IT_SYSTEMS">IT &amp; Enterprise Systems</option>
              <option value="INDUSTRIAL_PLANT">Industrial Plant &amp; MEP</option>
            </select>
          </div>
        </div>

        {/* Schedule & Location Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
          <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
            <Calendar size={18} className="text-emerald-500 shrink-0" />
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Planned Start Date</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {formatPlanDate(project?.start_date, "Not set in Project Setup")}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
            <Clock size={18} className="text-blue-500 shrink-0" />
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Target Completion Date</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {formatPlanDate(project?.end_date, "Not set in Project Setup")}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
            <MapPin size={18} className="text-rose-500 shrink-0" />
            <div className="w-full">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Project Site / Location</span>
              <input
                type="text"
                disabled={readOnly}
                placeholder="Site location / GPS..."
                value={plan?.project_location || ""}
                onChange={(e) => onChangePlan({ project_location: e.target.value })}
                className="w-full text-xs font-semibold px-2 py-0.5 rounded bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none text-slate-800 dark:text-slate-200 p-0"
              />
            </div>
          </div>
        </div>

        {/* Strategic Business Justification & Expected Outcomes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileText size={13} className="text-brand-600" />
              <span>Business Justification &amp; Strategic Case</span>
            </label>
            <textarea
              rows={3}
              disabled={readOnly}
              placeholder="Why is this project being undertaken? What business problem or strategic opportunity does it address?"
              value={plan?.business_justification || ""}
              onChange={(e) => onChangePlan({ business_justification: e.target.value })}
              className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-600" />
              <span>Expected Project Outcomes &amp; Value Realization</span>
            </label>
            <textarea
              rows={3}
              disabled={readOnly}
              placeholder="What are the quantifiable operational, commercial, or structural outcomes once delivered?"
              value={plan?.expected_outcomes || ""}
              onChange={(e) => onChangePlan({ expected_outcomes: e.target.value })}
              className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* ── Project Objectives Register ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-smoky p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Target size={16} className="text-brand-600" />
              <span>Project Objectives Register ({objectives.length})</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Measurable project objectives defining specific targets, success criteria, and linked deliverables.
            </p>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={handleOpenAddObj}
              className="px-3.5 py-1.5 rounded-xl bg-[#0E3646] hover:bg-[#164356] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              <Plus size={13} />
              <span>+ Add Objective</span>
            </button>
          )}
        </div>

        {objectives.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {objectives.map((obj, idx) => (
              <div
                key={obj.id || idx}
                className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition space-y-2.5 relative group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-brand-50 dark:bg-brand-950/60 border border-brand-200/60 text-brand-800 dark:text-brand-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                      {obj.title}
                    </h4>
                  </div>

                  {!readOnly && (
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => handleOpenEditObj(obj)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-white dark:hover:bg-slate-700 transition"
                        title="Edit objective"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteObj(obj.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-700 transition"
                        title="Delete objective"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {obj.description || "No detailed description provided."}
                </p>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5 text-[11px]">
                  <div>
                    <span className="text-slate-400 font-bold block">Measurable Success Criteria:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      {obj.criteria || "Zero defect threshold & client sign-off"}
                    </span>
                  </div>

                  {obj.targetOutcome && (
                    <div>
                      <span className="text-slate-400 font-bold block">Target Outcome:</span>
                      <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                        {obj.targetOutcome}
                      </span>
                    </div>
                  )}

                  {obj.deliverables && (
                    <div>
                      <span className="text-slate-400 font-bold block">Related Deliverables:</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {obj.deliverables}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs space-y-2">
            <AlertCircle size={24} className="mx-auto text-slate-300" />
            <p className="font-semibold text-slate-600 dark:text-slate-400">
              No project objectives defined yet
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Add multiple measurable project objectives to establish the planning framework before baseline approval.
            </p>
          </div>
        )}
      </div>

      {/* ── Add / Edit Objective Modal ── */}
      {showObjModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Target size={18} className="text-brand-600" />
                <span>{editingObjective ? "Edit Objective" : "Add Project Objective"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowObjModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveObj} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Objective Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete Substructure and Foundation Works"
                  value={objTitle}
                  onChange={(e) => setObjTitle(e.target.value)}
                  className="w-full text-xs h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Detailed Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Elaborate on the scope and intent of this objective..."
                  value={objDesc}
                  onChange={(e) => setObjDesc(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Measurable Success Criteria *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 100% concrete cube tests achieve specified 30MPa strength"
                  value={objCriteria}
                  onChange={(e) => setObjCriteria(e.target.value)}
                  className="w-full text-xs h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Target Outcome
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Foundation Handover Sign-off"
                    value={objTargetOutcome}
                    onChange={(e) => setObjTargetOutcome(e.target.value)}
                    className="w-full text-xs h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Related Deliverables
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Scope #1, Core Lab Reports"
                    value={objDeliverables}
                    onChange={(e) => setObjDeliverables(e.target.value)}
                    className="w-full text-xs h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowObjModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0E3646] text-white text-xs font-bold hover:bg-[#164356] transition shadow-sm"
                >
                  {editingObjective ? "Save Changes" : "Create Objective"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
