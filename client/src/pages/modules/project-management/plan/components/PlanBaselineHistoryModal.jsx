import React, { useState } from "react";
import { formatPlanDate } from "../ProjectPlanPage.jsx";
import {
  History,
  CheckCircle2,
  Calendar,
  User,
  FileText,
  DollarSign,
  Layers,
  ChevronRight,
  Eye,
  Clock,
  ShieldCheck,
} from "lucide-react";

export default function PlanBaselineHistoryModal({
  history = [],
  currentVersion = 1,
  onClose,
}) {
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0E3646] text-white flex items-center justify-center shadow-md">
              <History size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Approved Project Plan Baselines &amp; Revision History
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-brand-50 text-brand-800 border border-brand-200">
                  Current Draft: v{currentVersion}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Immutable historical reference of approved project scope, schedule, budget, and deliverables.
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
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs">
          {selectedSnapshot ? (
            /* Snapshot Detail Viewer */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedSnapshot(null)}
                  className="text-xs font-bold text-brand-700 dark:text-brand-300 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  ← Back to Versions List
                </button>
                <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                  Approved Baseline Snapshot v{selectedSnapshot.version}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Approval Metadata
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Approver: {selectedSnapshot.approvedBy || "Authorized Approver"}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Date: {selectedSnapshot.approvedAt ? new Date(selectedSnapshot.approvedAt).toLocaleString() : "Approved"}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Baseline Budget Commitment
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white block font-mono text-sm">
                    GH₵ {Number(selectedSnapshot.budgetCommitment?.projectBudget || 0).toLocaleString()}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Ceiling cost locked at approval
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Schedule Commitment
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    {selectedSnapshot.scheduleCommitment?.totalTasks || 0} Scheduled Tasks
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {formatPlanDate(selectedSnapshot.project?.start_date)} → {formatPlanDate(selectedSnapshot.project?.end_date)}
                  </span>
                </div>
              </div>

              {/* Scope Snapshot */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <span className="font-bold text-slate-900 dark:text-white block">
                  Approved Scope Statement
                </span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                  {selectedSnapshot.scopeDefinition?.statement || "No scope statement recorded"}
                </p>
              </div>

              {/* Deliverables Snapshot */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <span className="font-bold text-slate-900 dark:text-white block">
                  Approved Deliverables ({(selectedSnapshot.deliverables || []).length})
                </span>
                <div className="divide-y divide-slate-200/60 dark:divide-slate-800 text-[11px]">
                  {(selectedSnapshot.deliverables || []).map((d, i) => (
                    <div key={i} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 mr-2">
                          {d.wbs_code}: {d.name}
                        </span>
                        <span className="text-slate-400">{d.description}</span>
                      </div>
                      <span className="font-mono text-slate-600 dark:text-slate-400 shrink-0">
                        Target: {d.planned_completion || "TBD"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Baselines List */
            <div className="space-y-3">
              {history.length > 0 ? (
                history.map((h, idx) => {
                  let parsedSnap = null;
                  try {
                    parsedSnap = typeof h.baseline_snapshot === "object" ? h.baseline_snapshot : JSON.parse(h.baseline_snapshot || "{}");
                  } catch {}

                  return (
                    <div
                      key={h.id || idx}
                      className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-[#0E3646] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                          v{h.version_no}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                              {h.change_summary || `Master Approved Baseline v${h.version_no}`}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
                              {h.plan_status || "APPROVED"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Approved by: <strong className="text-slate-700 dark:text-slate-300">{h.approved_by_name || "Authorized PM"}</strong> • Approved Date:{" "}
                            {h.approved_at ? new Date(h.approved_at).toLocaleString() : "Approved"}
                          </p>
                        </div>
                      </div>

                      {parsedSnap && (
                        <button
                          type="button"
                          onClick={() => setSelectedSnapshot(parsedSnap)}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 transition flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-2xs cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Inspect Snapshot</span>
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs space-y-2">
                  <History size={26} className="mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-600 dark:text-slate-400">
                    No approved baselines established yet
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    When this project plan is approved, an immutable historical snapshot will be recorded here for audit and change-control variance tracking.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Approved historical baselines are immutable and cannot be deleted or overwritten.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 transition"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
}
