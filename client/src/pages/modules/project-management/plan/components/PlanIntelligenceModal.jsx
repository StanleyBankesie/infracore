import React, { useState, useEffect } from "react";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  GitMerge,
  ListTodo,
  ShieldAlert,
  ArrowRight,
  Clock,
  Layers,
  Check,
  RefreshCw,
  Plus,
} from "lucide-react";
import { api } from "../../../../../api/client.js";
import { toast } from "react-toastify";

export default function PlanIntelligenceModal({
  projectId,
  plan,
  onChangePlan,
  onClose,
}) {
  const [loading, setLoading] = useState(true);
  const [intel, setIntel] = useState(null);
  const [appliedPhases, setAppliedPhases] = useState(false);
  const [appliedDeliverables, setAppliedDeliverables] = useState(new Set());

  useEffect(() => {
    async function fetchIntel() {
      if (!projectId) return;
      try {
        setLoading(true);
        const res = await api.post(`/projects/projects/${projectId}/plan/ai-intelligence`);
        setIntel(res.data?.intelligence || null);
      } catch (err) {
        console.error("Failed to load plan intelligence:", err);
        toast.error("Could not generate planning intelligence");
      } finally {
        setLoading(false);
      }
    }
    fetchIntel();
  }, [projectId]);

  const handleApplyPhases = () => {
    if (!intel?.recommendedPhases) return;
    const existing = plan?.phases || [];
    const newPhases = intel.recommendedPhases.map((rp, idx) => ({
      id: Date.now() + idx,
      phase_name: rp.phase_name,
      description: rp.description,
      responsible_person: rp.responsible,
      deliverables: rp.deliverables,
      status: "PLANNED",
    }));

    // Append to existing
    onChangePlan({ phases: [...existing, ...newPhases] });
    setAppliedPhases(true);
    toast.success("Applied recommended phases to Execution Strategy");
  };

  const handleApplyDeliverable = (d, idx) => {
    const existing = plan?.deliverables || [];
    const newD = {
      id: Date.now() + idx,
      name: d.name,
      description: d.description,
      wbs_code: `${existing.length + 1}.0`,
      responsible_person: "Lead Engineer",
      acceptance_criteria: d.acceptanceCriteria,
      status: "PLANNED",
    };
    onChangePlan({ deliverables: [...existing, newD] });
    setAppliedDeliverables((prev) => new Set([...prev, idx]));
    toast.success(`Added deliverable "${d.name}"`);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-brand-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Automated Project Plan Intelligence Advisor
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  AI Planning Assistant
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Intelligent planning assistance based on active scopes, tasks, dates, budget, and durations.
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

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs">
          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <RefreshCw size={24} className="animate-spin mx-auto text-purple-600" />
              <p>Analyzing project data, schedule constraints, and WBS structure...</p>
            </div>
          ) : (
            <>
              {/* 1. Schedule & Date Conflict Warnings */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <AlertTriangle size={15} className="text-rose-500" />
                  <span>Schedule Consistency &amp; Conflict Checks</span>
                </h4>

                {intel?.scheduleConflicts?.length > 0 ? (
                  <div className="space-y-2">
                    {intel.scheduleConflicts.map((conf, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900 text-rose-800 dark:text-rose-300 flex items-start gap-2.5"
                      >
                        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-rose-600" />
                        <div>
                          <span className="font-bold block">{conf.message}</span>
                          <span className="text-[11px] text-rose-600 dark:text-rose-400">
                            Check and correct task start/due dates in Task Management or Gantt Scheduler.
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>Zero date inconsistencies detected between task dates, milestones, and project boundaries.</span>
                  </div>
                )}
              </div>

              {/* 2. Planning Gaps Checklist */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <Layers size={15} className="text-amber-500" />
                  <span>Planning Completeness &amp; Gap Analysis</span>
                </h4>

                {intel?.planningGaps?.length > 0 ? (
                  <div className="space-y-1.5">
                    {intel.planningGaps.map((gap, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 text-amber-800 dark:text-amber-300 flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>{gap}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>All foundational planning elements (budget, tasks, milestones, objectives) are established.</span>
                  </div>
                )}
              </div>

              {/* 3. Recommended Project Phases */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <GitMerge size={15} className="text-purple-600" />
                    <span>Suggested Delivery Phases ({intel?.recommendedPhases?.length || 0})</span>
                  </h4>

                  {!appliedPhases && (
                    <button
                      type="button"
                      onClick={handleApplyPhases}
                      className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <Plus size={11} />
                      <span>+ Apply Phases to Execution Strategy</span>
                    </button>
                  )}
                  {appliedPhases && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <Check size={12} /> Applied to Plan
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(intel?.recommendedPhases || []).map((ph, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/50 space-y-1"
                    >
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {ph.phase_name}
                      </span>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {ph.description}
                      </p>
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block pt-1">
                        Deliverable: {ph.deliverables}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Suggested Key Deliverables */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <ListTodo size={15} className="text-sky-600" />
                  <span>Suggested Deliverables Register Items</span>
                </h4>

                <div className="space-y-2">
                  {(intel?.recommendedDeliverables || []).map((deliv, idx) => {
                    const isAdded = appliedDeliverables.has(idx);
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/50 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {deliv.name}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {deliv.description}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Criteria: {deliv.acceptanceCriteria}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={isAdded}
                          onClick={() => handleApplyDeliverable(deliv, idx)}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition shrink-0 ${
                            isAdded
                              ? "bg-slate-100 text-slate-400"
                              : "bg-[#0E3646] hover:bg-[#164356] text-white shadow-2xs cursor-pointer"
                          }`}
                        >
                          {isAdded ? "Added" : "+ Add Deliverable"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Suggestions are editable recommendations and do not overwrite existing official records.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 transition"
          >
            Close Advisor
          </button>
        </div>
      </div>
    </div>
  );
}
