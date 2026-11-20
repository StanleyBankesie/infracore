/**
 * @file MilestoneRoadmapReport.jsx
 * @description Enterprise Milestone Roadmap & Phase-Gate Delivery Sequence Report for OmniSuite ERP.
 * Provides a dedicated, printable, full-lifecycle chronological phase-gate milestone roadmap across projects.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Flag,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Search,
  Filter,
  Check,
  Building2,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Layers,
  ChevronRight,
  ListTree,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { api } from "../../../../api/client.js";

const MILESTONE_TYPES = {
  PAYMENT_CLAIM: { label: "Payment Claim Gate", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200" },
  CLIENT_APPROVAL: { label: "Client Approval Gate", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200" },
  STAGE_COMPLETION: { label: "Stage Completion", color: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200" },
  REGULATORY_INSPECTION: { label: "Regulatory Inspection", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200" },
  CONTRACTUAL_DEADLINE: { label: "Contractual Deadline", color: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200" },
  CRITICAL_PATH_JUNCTION: { label: "CPM Junction", color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200" },
};

function getMilestoneTypeMeta(type) {
  return MILESTONE_TYPES[type] || { label: "Phase Gate", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200" };
}

export default function MilestoneRoadmapReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
      return;
    }
    const fromParam = searchParams.get("from");
    if (fromParam) {
      if (fromParam.startsWith("/")) {
        navigate(fromParam);
        return;
      }
      if (fromParam === "milestones") {
        const pId = searchParams.get("projectId") || searchParams.get("project_id") || selectedProjectId;
        navigate(pId ? `/project-management/milestones?project_id=${pId}` : "/project-management/milestones");
        return;
      }
    }
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
      return;
    }
    navigate("/project-management/reports");
  };

  const initialProjectId = searchParams.get("projectId") || searchParams.get("project_id") || "";
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [selectedProject, setSelectedProject] = useState(null);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [milestones, setMilestones] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Load projects list
  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoadingProjects(true);
        const res = await api.get("/projects/projects", { params: { active: "all" } })
          .catch(() => api.get("/projects?active=all"));
        const list = res.data?.items || res.data?.projects || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setProjects(list);
        if (!selectedProjectId && list.length > 0) {
          setSelectedProjectId(String(list[0].id));
        }
      } catch (err) {
        console.error("Failed to load projects", err);
      } finally {
        setLoadingProjects(false);
      }
    }
    fetchProjects();
  }, []);

  // Update selected project object
  useEffect(() => {
    if (selectedProjectId && projects.length) {
      const match = projects.find((p) => String(p.id) === String(selectedProjectId));
      setSelectedProject(match || null);
    } else {
      setSelectedProject(null);
    }
  }, [selectedProjectId, projects]);

  // Load project milestones
  const fetchMilestones = async (projId) => {
    if (!projId) return;
    try {
      setLoadingData(true);
      const res = await api.get(`/construction/projects/${projId}/milestones`);
      const confirmed = res.data?.confirmed || [];
      setMilestones(confirmed);
    } catch (err) {
      console.error("Failed to load milestones for roadmap", err);
      setMilestones([]);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchMilestones(selectedProjectId);
    }
  }, [selectedProjectId]);

  // Sorted and filtered roadmap items
  const getMilestoneStatus = useCallback((m) => {
    const isAchieved = m.live_status === "ACHIEVED" || m.status === "ACHIEVED" || m.status === "COMPLETED";
    if (isAchieved) return "ACHIEVED";

    const targetDate = m.target_date || m.due_date;
    const isPast = targetDate ? differenceInDays(new Date(targetDate), new Date()) < 0 : false;
    if (m.live_status === "OVERDUE" || m.status === "OVERDUE" || isPast) return "OVERDUE";

    const hasStartedTasks = (m.linked_tasks || []).some(
      (t) => Number(t.completion_percent || 0) > 0 || ["IN_PROGRESS", "COMPLETED", "DONE"].includes(String(t.status || "").toUpperCase())
    );
    if (m.live_status === "IN_PROGRESS" || m.status === "IN_PROGRESS" || Number(m.progress_percent || 0) > 0 || hasStartedTasks) {
      return "IN_PROGRESS";
    }

    return "PENDING";
  }, []);

  const sortedMilestones = useMemo(() => {
    return milestones
      .slice()
      .sort((a, b) => new Date(a.target_date || a.due_date || 0) - new Date(b.target_date || b.due_date || 0))
      .filter((m) => {
        const st = getMilestoneStatus(m);

        if (statusFilter !== "ALL" && st !== statusFilter) return false;
        if (typeFilter !== "ALL" && m.milestone_type !== typeFilter) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            (m.title || "").toLowerCase().includes(q) ||
            (m.description || "").toLowerCase().includes(q) ||
            (m.work_plan_element || "").toLowerCase().includes(q)
          );
        }
        return true;
      });
  }, [milestones, statusFilter, typeFilter, searchQuery, getMilestoneStatus]);

  // KPI calculations
  const kpis = useMemo(() => {
    const total = milestones.length;
    let achieved = 0;
    let inProgress = 0;
    let overdue = 0;
    let pending = 0;

    milestones.forEach((m) => {
      const st = getMilestoneStatus(m);
      if (st === "ACHIEVED") achieved++;
      else if (st === "OVERDUE") overdue++;
      else if (st === "IN_PROGRESS") inProgress++;
      else pending++;
    });

    const progressPct = total > 0 ? Math.round((achieved / total) * 100) : 0;
    return { total, achieved, inProgress, overdue, pending, progressPct };
  }, [milestones, getMilestoneStatus]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 print:p-2 print:space-y-4">
      {/* ── Header Bar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 print:border-none">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1.5 text-xs font-semibold shadow-2xs print:hidden cursor-pointer"
            title="Return to previous page"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>

          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0E3646] to-[#1a4a5e] text-white flex items-center justify-center font-bold shadow-sm shrink-0">
            <ListTree size={20} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                Project Milestone Roadmap Report
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Chronological phase-gate roadmap of scheduled checkpoints, stage gates, target completion dates, and execution windows.
            </p>
          </div>
        </div>

        {/* Project Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0 print:hidden">
          <div className="min-w-[220px]">
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSearchParams({ projectId: e.target.value });
              }}
              className="w-full text-xs font-normal h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-2xs cursor-pointer"
            >
              <option value="">-- Select Project --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_code ? `[${p.project_code}] ` : ""}{p.project_name || p.name}
                </option>
              ))}
            </select>
          </div>

          <Link
            to={`/project-management/milestones?project_id=${selectedProjectId}`}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-normal transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Open Interactive Milestone Register"
          >
            <Flag size={13} className="text-brand-600" />
            <span>Milestone Register</span>
            <ExternalLink size={11} className="text-slate-400" />
          </Link>

          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shadow-2xs cursor-pointer"
            title="Print Official Roadmap Report"
          >
            <Printer size={15} />
          </button>
        </div>
      </div>

      {!selectedProjectId ? (
        <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-smoky space-y-3">
          <Flag size={32} className="mx-auto text-slate-400" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Please Select a Project</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Choose a project from the selector dropdown above to generate its official milestone delivery roadmap report.
          </p>
        </div>
      ) : (
        <>
          {/* ── Project Metadata Banner ── */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-smoky grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-medium text-slate-400 block">Project Code & Name</span>
              <span className="font-normal text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                {selectedProject?.project_code || "PRJ-00"} • {selectedProject?.project_name || "Active Project"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-medium text-slate-400 block">Client</span>
              <span className="font-normal text-slate-700 dark:text-slate-300 truncate block mt-0.5">
                {selectedProject?.client_name || "General Client"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-medium text-slate-400 block">Contract Schedule</span>
              <span className="font-normal text-slate-700 dark:text-slate-300 truncate block mt-0.5">
                {selectedProject?.start_date ? new Date(selectedProject.start_date).toLocaleDateString() : "TBD"} → {selectedProject?.end_date ? new Date(selectedProject.end_date).toLocaleDateString() : "TBD"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-medium text-slate-400 block">Overall Gate Completion</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {kpis.achieved} / {kpis.total} ({kpis.progressPct}%)
                </span>
                <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${kpis.progressPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── KPI Metric Strip ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-smoky flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Phase Gates</span>
                <Flag size={14} className="text-slate-400" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{kpis.total}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Scheduled checkpoints</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-smoky flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Achieved &amp; Verified</span>
                <CheckCircle2 size={14} className="text-emerald-500" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{kpis.achieved}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{kpis.progressPct}% Gate Progress</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-smoky flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">Currently Executing</span>
                <Clock size={14} className="text-sky-500" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">{kpis.inProgress}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Active stage gates</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-smoky flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Requires Attention</span>
                <AlertTriangle size={14} className="text-rose-500" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">{kpis.overdue}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Overdue checkpoints</span>
              </div>
            </div>
          </div>

          {/* ── Filter & Search Bar ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-smoky print:hidden">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              {[
                { id: "ALL", label: `All (${kpis.total})` },
                { id: "ACHIEVED", label: `Achieved (${kpis.achieved})` },
                { id: "IN_PROGRESS", label: `In Progress (${kpis.inProgress})` },
                { id: "PENDING", label: `Pending (${kpis.pending})` },
                { id: "OVERDUE", label: `Overdue (${kpis.overdue})` },
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setStatusFilter(btn.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-normal transition whitespace-nowrap cursor-pointer ${
                    statusFilter === btn.id
                      ? "bg-[#0E3646] text-white shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search roadmap gates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs font-normal py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Types</option>
                {Object.entries(MILESTONE_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Chronological Roadmap Flow ── */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-smoky p-5 sm:p-7 space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <ListTree size={18} className="text-brand-600" />
                  <span>Sequential Phase Gate Execution Timeline</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Ordered by planned baseline delivery sequence with linked task metrics and verification conditions.
                </p>
              </div>
              <span className="text-xs font-mono font-normal text-slate-400">
                {sortedMilestones.length} Stage Gates
              </span>
            </div>

            {loadingData ? (
              <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                <RefreshCw size={24} className="animate-spin mx-auto text-brand-600" />
                <span>Loading chronological roadmap data...</span>
              </div>
            ) : sortedMilestones.length > 0 ? (
              <div className="relative pl-7 sm:pl-9 space-y-7 before:absolute before:left-3.5 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {sortedMilestones.map((m, idx) => {
                  const mStatus = getMilestoneStatus(m);
                  const isAchieved = mStatus === "ACHIEVED";
                  const isOverdue = mStatus === "OVERDUE";
                  const isInProgress = mStatus === "IN_PROGRESS";
                  const typeMeta = getMilestoneTypeMeta(m.milestone_type);

                  let dueBadgeText = "No target date";
                  if (m.target_date || m.due_date) {
                    const d = new Date(m.target_date || m.due_date);
                    const diff = differenceInDays(d, new Date());
                    if (isAchieved) {
                      dueBadgeText = `Achieved on ${m.completion_date ? format(new Date(m.completion_date), "MMM d, yyyy") : format(d, "MMM d, yyyy")}`;
                    } else if (diff < 0) {
                      dueBadgeText = `Overdue by ${Math.abs(diff)} day(s)`;
                    } else if (diff === 0) {
                      dueBadgeText = "Due Today";
                    } else {
                      dueBadgeText = `Due in ${diff} day(s) (${format(d, "MMM d, yyyy")})`;
                    }
                  }

                  return (
                    <div key={m.id} className="relative group">
                      {/* Step Node */}
                      <div
                        className={`absolute -left-7 sm:-left-9 top-1.5 w-7 h-7 rounded-full border-2 flex items-center justify-center transition shadow-2xs font-bold text-xs ${
                          isAchieved
                            ? "bg-emerald-500 border-white text-white shadow-emerald-500/30"
                            : isOverdue
                            ? "bg-rose-500 border-white text-white shadow-rose-500/30"
                            : isInProgress
                            ? "bg-sky-500 border-white text-white shadow-sky-500/30 animate-pulse"
                            : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500"
                        }`}
                      >
                        {isAchieved ? <Check size={14} className="stroke-[3]" /> : idx + 1}
                      </div>

                      {/* Content Card */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-smoky hover:border-slate-300 dark:hover:border-slate-700 transition space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                {m.title}
                              </h3>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeMeta.color}`}>
                                {typeMeta.label}
                              </span>
                              {m.work_plan_element && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  WBS: {m.work_plan_element}
                                </span>
                              )}
                            </div>
                            {m.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                                {m.description}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 flex items-center gap-2 self-start sm:self-auto">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                isAchieved
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                                  : isInProgress
                                  ? "bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300"
                                  : isOverdue
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {isInProgress ? "IN PROGRESS" : mStatus}
                            </span>
                          </div>
                        </div>

                        {/* Schedule Comparison Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                          <div className="flex items-center gap-2">
                            <Calendar size={13} className="text-sky-500 shrink-0" />
                            <div>
                              <span className="text-[10px] uppercase font-medium text-slate-400 block">Target Gate Date</span>
                              <span className="font-normal text-slate-800 dark:text-slate-200">
                                {dueBadgeText}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock size={13} className={m.actual_end_date ? "text-emerald-500 shrink-0" : "text-blue-500 shrink-0"} />
                            <div>
                              <span className="text-[10px] uppercase font-medium text-slate-400 block">Actual Execution</span>
                              <span className="font-normal text-slate-800 dark:text-slate-200">
                                {m.actual_start_date
                                  ? `${format(new Date(m.actual_start_date), "MMM d")}${
                                      m.actual_end_date
                                        ? ` → ${format(new Date(m.actual_end_date), "MMM d, yyyy")}`
                                        : " (In Progress)"
                                    }`
                                  : "Not Started"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2 text-right">
                            <div>
                              <span className="text-[10px] uppercase font-medium text-slate-400 block">Contributing Tasks</span>
                              <span className="font-normal text-slate-700 dark:text-slate-300">
                                {m.linked_tasks?.length || 0} tasks linked
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <Flag size={28} className="mx-auto text-slate-300" />
                <p className="font-bold text-slate-700 dark:text-slate-300">No milestones match your filter</p>
                <p>Adjust your search criteria or add new milestone phase gates.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
