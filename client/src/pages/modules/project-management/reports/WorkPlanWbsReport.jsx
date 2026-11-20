/**
 * @file WorkPlanWbsReport.jsx
 * @description Enterprise Work Plan & WBS Breakdown Report for OmniSuite ERP.
 * Provides hierarchical scope grouping, work plan packages, target vs actual dates, and completion status.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Layers,
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
  Users,
  CheckSquare,
  BarChart3,
  ChevronRight,
  FolderTree,
} from "lucide-react";
import { format } from "date-fns";
import { api } from "../../../../api/client.js";

export default function WorkPlanWbsReport() {
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
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedScopeFilter, setSelectedScopeFilter] = useState("ALL");

  // Load Projects List
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

  // Load Tasks & WBS elements for selected project
  const fetchTasks = async (projId) => {
    if (!projId) return;
    try {
      setLoadingTasks(true);
      const res = await api.get(`/projects/${projId}/tasks`);
      const tList = res.data?.tasks || res.data?.items || (Array.isArray(res.data) ? res.data : []);
      setTasks(tList);
      if (tList.length > 0) {
        setSelectedTask(tList[0]);
      } else {
        setSelectedTask(null);
      }
    } catch (err) {
      console.error("Failed to load tasks for Work Plan report", err);
      setTasks([]);
      setSelectedTask(null);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchTasks(selectedProjectId);
    }
  }, [selectedProjectId]);

  // Group tasks by Scope & WBS Code
  const scopeGroups = useMemo(() => {
    const map = {};
    const filteredTasks = tasks.filter((t) => {
      if (statusFilter !== "ALL" && (t.status || "PENDING") !== statusFilter) return false;
      if (selectedScopeFilter !== "ALL" && (t.scope_name || "General Scope") !== selectedScopeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (t.task_title || "").toLowerCase().includes(q) ||
          (t.wbs_code || "").toLowerCase().includes(q) ||
          (t.assigned_to_name || "").toLowerCase().includes(q) ||
          (t.scope_name || "").toLowerCase().includes(q)
        );
      }
      return true;
    });

    filteredTasks.forEach((t) => {
      const scopeKey = t.scope_name || "Primary Project Scope";
      if (!map[scopeKey]) {
        map[scopeKey] = {
          name: scopeKey,
          wbs_code: t.wbs_code ? t.wbs_code.split(".")[0] + ".0" : "1.0",
          tasks: [],
        };
      }
      map[scopeKey].tasks.push(t);
    });

    return Object.values(map);
  }, [tasks, statusFilter, selectedScopeFilter, searchQuery]);

  // Unique Scopes List for filter dropdown
  const allScopes = useMemo(() => {
    const set = new Set();
    tasks.forEach((t) => {
      if (t.scope_name) set.add(t.scope_name);
    });
    return Array.from(set);
  }, [tasks]);

  // Overall KPIs
  const kpis = useMemo(() => {
    const total = tasks.length;
    let completed = 0;
    let inProgress = 0;
    let pending = 0;

    tasks.forEach((t) => {
      if (t.status === "COMPLETED" || t.progress_percentage === 100) completed++;
      else if (t.status === "IN_PROGRESS" || (t.progress_percentage || 0) > 0) inProgress++;
      else pending++;
    });

    const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, pending, completionPct, totalScopes: allScopes.length || 1 };
  }, [tasks, allScopes]);

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
            <Layers size={20} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                Work Plan &amp; WBS Breakdown Report
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200">
                Official Report
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive operational work breakdown structure, task execution windows, deliverables, and scope progress.
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
              className="w-full text-xs font-semibold h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-2xs cursor-pointer"
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
            to={`/project-management/gantt?projectId=${selectedProjectId}`}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Open Interactive Gantt & CPM Schedule"
          >
            <Calendar size={13} className="text-emerald-600" />
            <span>Gantt Chart</span>
            <ExternalLink size={11} className="text-slate-400" />
          </Link>

          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shadow-2xs cursor-pointer"
            title="Print Official WBS Report"
          >
            <Printer size={15} />
          </button>
        </div>
      </div>

      {!selectedProjectId ? (
        <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-smoky space-y-3">
          <Layers size={32} className="mx-auto text-slate-400" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Please Select a Project</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Choose a project from the selector dropdown above to generate its official Work Plan and WBS breakdown report.
          </p>
        </div>
      ) : (
        <>
          {/* ── Project Metadata Banner ── */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-smoky grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Project Code & Name</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                {selectedProject?.project_code || "PRJ-00"} • {selectedProject?.project_name || "Active Project"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Project Manager</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block mt-0.5">
                {selectedProject?.manager_name || "Unassigned"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Work Scopes Count</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block mt-0.5">
                {kpis.totalScopes} active scope packages
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Overall Execution Progress</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {kpis.completed} / {kpis.total} ({kpis.completionPct}%)
                </span>
                <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${kpis.completionPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── KPI Metrics Strip ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-smoky flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Work Plan Tasks</span>
                <CheckSquare size={14} className="text-slate-400" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{kpis.total}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Across {kpis.totalScopes} scope areas</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-smoky flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Completed Work</span>
                <CheckCircle2 size={14} className="text-emerald-500" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{kpis.completed}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{kpis.completionPct}% Completed</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-smoky flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">In Progress</span>
                <Clock size={14} className="text-sky-500" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">{kpis.inProgress}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Currently active tasks</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-smoky flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Work</span>
                <Calendar size={14} className="text-slate-400" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black text-slate-700 dark:text-slate-300 font-mono">{kpis.pending}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Scheduled to start</span>
              </div>
            </div>
          </div>

          {/* ── Filter & Search Toolbar ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-smoky print:hidden">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              {[
                { id: "ALL", label: `All Tasks (${kpis.total})` },
                { id: "COMPLETED", label: `Completed (${kpis.completed})` },
                { id: "IN_PROGRESS", label: `In Progress (${kpis.inProgress})` },
                { id: "PENDING", label: `Pending (${kpis.pending})` },
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setStatusFilter(btn.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
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
                  placeholder="Search task or WBS code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {allScopes.length > 0 && (
                <select
                  value={selectedScopeFilter}
                  onChange={(e) => setSelectedScopeFilter(e.target.value)}
                  className="text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer max-w-[180px] truncate"
                >
                  <option value="ALL">All Scopes</option>
                  {allScopes.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* ── Main Breakdown Grid & Detail Panel ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Scopes & Tasks Hierarchical Groups */}
            <div className="lg:col-span-2 space-y-6">
              {loadingTasks ? (
                <div className="p-16 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800">
                  <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-brand-600" />
                  Loading Work Plan and WBS task packages...
                </div>
              ) : scopeGroups.length > 0 ? (
                scopeGroups.map((group, gIdx) => {
                  const compCount = group.tasks.filter((t) => t.status === "COMPLETED" || t.progress_percentage === 100).length;
                  const groupPct = group.tasks.length ? Math.round((compCount / group.tasks.length) * 100) : 0;

                  return (
                    <div
                      key={gIdx}
                      className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-smoky space-y-4"
                    >
                      {/* Scope Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#0E3646] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {gIdx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                                {group.name}
                              </h3>
                              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                WBS: {group.wbs_code}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {group.tasks.length} {group.tasks.length === 1 ? "work package" : "work packages"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <div className="text-right">
                            <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">
                              {compCount} / {group.tasks.length} ({groupPct}%)
                            </span>
                            <div className="w-28 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${groupPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tasks Cards Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                        {group.tasks.map((t) => {
                          const isSel = selectedTask?.id === t.id;
                          const isComp = t.status === "COMPLETED";
                          const isInP = t.status === "IN_PROGRESS";

                          return (
                            <div
                              key={t.id}
                              onClick={() => setSelectedTask(t)}
                              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                                isSel
                                  ? "border-brand-500 bg-brand-50/20 dark:bg-brand-950/20 shadow-md ring-2 ring-brand-500/20"
                                  : "border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/60 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm"
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                    WBS: {t.wbs_code || "1.1"}
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                      isComp
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                                        : isInP
                                        ? "bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300"
                                        : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                                    }`}
                                  >
                                    {t.status || "PENDING"}
                                  </span>
                                </div>

                                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug line-clamp-2">
                                  {t.task_title}
                                </h4>
                              </div>

                              <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-750 text-[11px] space-y-1.5">
                                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <Calendar size={11} className="text-sky-500" />
                                    <span>Target:</span>
                                  </span>
                                  <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {t.start_date ? String(t.start_date).split("T")[0] : "—"} → {t.end_date ? String(t.end_date).split("T")[0] : "—"}
                                  </span>
                                </div>

                                {(t.actual_start_date || t.actual_end_date) && (
                                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                                    <span className="flex items-center gap-1">
                                      <Clock size={11} className={t.actual_end_date ? "text-emerald-500" : "text-blue-500"} />
                                      <span>Actual:</span>
                                    </span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                      {t.actual_start_date ? new Date(t.actual_start_date).toLocaleDateString(undefined, { month: "numeric", day: "numeric" }) : "—"} → {t.actual_end_date ? new Date(t.actual_end_date).toLocaleDateString(undefined, { month: "numeric", day: "numeric" }) : "In Prog"}
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-1 text-slate-400">
                                  <span className="truncate max-w-[140px] text-slate-600 dark:text-slate-400">
                                    👤 {t.assigned_to_name || "Unassigned"}
                                  </span>
                                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                    {t.progress_percentage || 0}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 space-y-2">
                  <Layers size={28} className="mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">No work packages match your filter</p>
                  <p>Try resetting the search query or scope filter.</p>
                </div>
              )}
            </div>

            {/* Task Detail Inspector Side Panel */}
            <div className="lg:col-span-1 print:hidden">
              {selectedTask ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-smoky p-5 sticky top-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Work Package Inspector</span>
                    <span className="font-mono text-xs font-bold text-brand-600">
                      WBS: {selectedTask.wbs_code || "1.0"}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                      {selectedTask.task_title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Scope: {selectedTask.scope_name || "General Scope"}
                    </p>
                  </div>

                  {/* Schedule Details */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-750 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Status:</span>
                      <span className="font-bold uppercase text-slate-800 dark:text-slate-200">
                        {selectedTask.status || "PENDING"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Target Schedule:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {selectedTask.start_date ? String(selectedTask.start_date).split("T")[0] : "—"} → {selectedTask.end_date ? String(selectedTask.end_date).split("T")[0] : "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Actual Execution:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {selectedTask.actual_start_date ? new Date(selectedTask.actual_start_date).toLocaleDateString() : "—"} → {selectedTask.actual_end_date ? new Date(selectedTask.actual_end_date).toLocaleDateString() : (selectedTask.actual_start_date ? "In Progress" : "Not Started")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Assignee:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedTask.assigned_to_name || "Unassigned"}
                      </span>
                    </div>
                  </div>

                  {/* Progress Gauge */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-600 dark:text-slate-300">Completion</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {selectedTask.progress_percentage || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${selectedTask.progress_percentage || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Quick Execution Link */}
                  <div className="pt-2">
                    <Link
                      to={`/project-management/tasks/execution?taskId=${selectedTask.id}&projectId=${selectedProjectId}`}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#0E3646] hover:bg-[#164356] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <span>Open Task Execution</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-400 space-y-2">
                  <FolderTree size={28} className="mx-auto text-slate-300" />
                  <p>Click any work package card to inspect full scope and execution details.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
