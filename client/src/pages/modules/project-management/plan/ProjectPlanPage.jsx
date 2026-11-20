/**
 * @file ProjectPlanPage.jsx
 * @description Enterprise Master Project Plan & Intelligent Coordination Center for OmniSuite ERP.
 * 
 * Rebuilt according to the 10-Phase Project Plan Rebuild & Integration Specification:
 * - Coordinates Master Overview, Strategic Objectives, Scope Definition, WBS, Deliverables,
 *   Execution Strategy, RACI Matrix, Schedule & Budget Commitments, and Supporting Management Plans.
 * - Deeply integrates with existing Project Management pages: Project Setup, WBS, Task Execution,
 *   Gantt/CPM Scheduler, Milestones, Project Costing & BOQ, Resources, Risk Management, QA/QC,
 *   Procurement, and Central Document Management.
 * - Features Automated Planning Intelligence, Pre-Submission Validation, Controlled Approval Workflows,
 *   Immutable Historical Baselines, and Change Revision Control.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, useSearchParams, useParams, useNavigate } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Layers,
  Flag,
  DollarSign,
  Users,
  FileText,
  ChevronDown,
  Search,
  ArrowLeft,
  ExternalLink,
  Target,
  ShieldAlert,
  BarChart3,
  CheckSquare,
  Printer,
  Building2,
  ArrowRight,
  RefreshCw,
  GitBranch,
  Activity,
  TrendingUp,
  X,
  Briefcase,
  Wrench,
  Truck,
  Sparkles,
  Inbox,
  AlertCircle,
  ShieldCheck,
  Compass,
  FileCheck,
  Send,
  History,
  Save,
  Check,
  Paperclip,
  FolderKanban,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { useAuth } from "../../../../auth/AuthContext.jsx";
import { toast } from "react-toastify";

import CloudinaryDocumentUploader from "../components/CloudinaryDocumentUploader.jsx";
import PlanOverviewSection from "./components/PlanOverviewSection.jsx";
import PlanScopeSection from "./components/PlanScopeSection.jsx";
import PlanExecutionSection from "./components/PlanExecutionSection.jsx";
import PlanScheduleBudgetSection from "./components/PlanScheduleBudgetSection.jsx";
import PlanManagementSection from "./components/PlanManagementSection.jsx";
import PlanDocumentManager from "./components/PlanDocumentManager.jsx";
import PlanIntelligenceModal from "./components/PlanIntelligenceModal.jsx";
import PlanValidationModal from "./components/PlanValidationModal.jsx";
import PlanBaselineHistoryModal from "./components/PlanBaselineHistoryModal.jsx";
import MobileMovingCarousel from "../../../../components/MobileMovingCarousel.jsx";

// Self-contained Plus icon
const Plus = ({ size = 14, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export function formatPlanDate(val, fallback = "TBD") {
  if (!val) return fallback;
  if (typeof val === "string") {
    const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      return isNaN(date.getTime()) ? match[0] : date.toLocaleDateString();
    }
  }
  const date = new Date(val);
  return isNaN(date.getTime()) ? fallback : date.toLocaleDateString();
}

export default function ProjectPlanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projectId: routeProjectId } = useParams();

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Project Selection State
  // Default unselected if no projectId in URL
  // ─────────────────────────────────────────────────────────────────────────
  const initialProjectId = routeProjectId || searchParams.get("projectId") || null;
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);

  // Directory filter & search states (when on default selection directory page)
  const [dirSearch, setDirSearch] = useState("");
  const [dirStatusFilter, setDirStatusFilter] = useState("ALL");

  // Navigation tab within selected project plan:
  // "section1_overview" | "section2_scope" | "section3_execution" | "section4_schedule_budget" | "section5_management" | "documents" | "tasks" | "milestones"
  const [activeTab, setActiveTab] = useState("section1_overview");
  const [modalSection, setModalSection] = useState(null);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Data States
  // ─────────────────────────────────────────────────────────────────────────
  const [projectsList, setProjectsList] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Master Plan Consolidated Data
  const [projectDetail, setProjectDetail] = useState(null);
  const [planDetail, setPlanDetail] = useState(null);
  const [planSummaries, setPlanSummaries] = useState({});
  const [completionIndicators, setCompletionIndicators] = useState({});
  const [planCompletionPercent, setPlanCompletionPercent] = useState(0);
  const [baselineHistory, setBaselineHistory] = useState([]);

  const [loadingPlan, setLoadingPlan] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Modals
  const [showIntelligenceModal, setShowIntelligenceModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Fetch Company Projects List (for Directory & Dropdown)
  // ─────────────────────────────────────────────────────────────────────────
  const fetchProjects = useCallback(async () => {
    try {
      setLoadingProjects(true);
      const res = await api
        .get("/projects/projects", { params: { active: "all" } })
        .catch(() => api.get("/projects?active=all"));
      const items =
        res.data?.items || res.data?.projects || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setProjectsList(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error("Failed to load projects list:", err);
      toast.error("Could not load projects list");
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Sync selectedProjectId with URL changes
  useEffect(() => {
    const pId = routeProjectId || searchParams.get("projectId") || null;
    if (pId !== selectedProjectId) {
      setSelectedProjectId(pId);
    }
  }, [routeProjectId, searchParams]);

  const handleSelectProject = (id) => {
    if (!id) {
      setSelectedProjectId(null);
      setSearchParams({});
      setProjectDetail(null);
      setPlanDetail(null);
      return;
    }
    const strId = String(id);
    setSelectedProjectId(strId);
    setSearchParams({ projectId: strId });
  };

  // State passed to navigated pages so their Back button returns directly to this Project Plan
  const currentPlanReturnState = useMemo(() => ({
    from: selectedProjectId
      ? `/project-management/plan?projectId=${selectedProjectId}`
      : "/project-management/plan",
  }), [selectedProjectId]);

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Fetch Master Project Plan Consolidated Data
  // ─────────────────────────────────────────────────────────────────────────
  const fetchMasterPlanData = useCallback(async (pId) => {
    if (!pId) return;
    setLoadingPlan(true);

    try {
      const res = await api.get(`/projects/projects/${pId}/plan`);
      if (res.data?.ok) {
        setProjectDetail(res.data.project || null);
        setPlanDetail(res.data.plan || null);
        setPlanSummaries(res.data.summaries || {});
        setCompletionIndicators(res.data.indicators || {});
        setPlanCompletionPercent(res.data.planCompletionPercent || 0);
        setBaselineHistory(res.data.baselineHistory || []);
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      console.error("Error fetching master project plan records:", err);
      toast.error("Failed to consolidate project plan data");
    } finally {
      setLoadingPlan(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchMasterPlanData(selectedProjectId);
    } else {
      setProjectDetail(null);
      setPlanDetail(null);
      setPlanSummaries({});
      setCompletionIndicators({});
      setPlanCompletionPercent(0);
      setBaselineHistory([]);
      setHasUnsavedChanges(false);
    }
  }, [selectedProjectId, fetchMasterPlanData]);

  // Plan attribute edit handler
  const handleUpdatePlanLocal = (updates) => {
    setPlanDetail((prev) => ({
      ...prev,
      ...updates,
    }));
    setHasUnsavedChanges(true);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Save Draft Action
  // ─────────────────────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!selectedProjectId || !planDetail) return;
    try {
      setSavingDraft(true);
      const res = await api.put(`/projects/projects/${selectedProjectId}/plan`, planDetail);
      if (res.data?.ok) {
        toast.success("Project plan draft saved successfully");
        setHasUnsavedChanges(false);
        fetchMasterPlanData(selectedProjectId);
      }
    } catch (err) {
      console.error("Failed to save project plan draft:", err);
      toast.error(err.response?.data?.message || "Failed to save plan draft");
    } finally {
      setSavingDraft(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Submit for Review Action
  // ─────────────────────────────────────────────────────────────────────────
  const handleSubmitForReview = async () => {
    if (!selectedProjectId) return;
    try {
      setSubmittingReview(true);
      // Auto-save draft before submitting
      await api.put(`/projects/projects/${selectedProjectId}/plan`, planDetail);
      const res = await api.post(`/projects/projects/${selectedProjectId}/plan/submit`);
      if (res.data?.ok) {
        toast.success("Project plan submitted for review");
        setShowValidationModal(false);
        fetchMasterPlanData(selectedProjectId);
      }
    } catch (err) {
      console.error("Submission failed:", err);
      toast.error(err.response?.data?.message || "Validation failed before submission");
    } finally {
      setSubmittingReview(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Approve Plan Action (Creates historical baseline snapshot)
  // ─────────────────────────────────────────────────────────────────────────
  const handleApprovePlan = async () => {
    if (!selectedProjectId) return;
    const confirmApprove = window.confirm(
      "Approve this Project Plan and establish an immutable historical baseline snapshot? Subsequent changes will require a controlled revision."
    );
    if (!confirmApprove) return;

    try {
      // Auto-save draft first
      await api.put(`/projects/projects/${selectedProjectId}/plan`, planDetail);
      const res = await api.post(`/projects/projects/${selectedProjectId}/plan/approve`, {
        change_summary: `Approved Master Baseline v${planDetail?.version_no || 1}`,
      });
      if (res.data?.ok) {
        toast.success(res.data.message || "Project plan approved and baseline locked!");
        fetchMasterPlanData(selectedProjectId);
      }
    } catch (err) {
      console.error("Approval failed:", err);
      toast.error(err.response?.data?.message || "Approval failed");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 8. Create Revision Action
  // ─────────────────────────────────────────────────────────────────────────
  const handleCreateRevision = async () => {
    if (!selectedProjectId) return;
    const reason = window.prompt(
      "Enter reason for project plan revision (e.g. Scope variation, schedule delay recovery, or budget adjustment):"
    );
    if (!reason || !reason.trim()) return;

    try {
      const res = await api.post(`/projects/projects/${selectedProjectId}/plan/revise`, {
        reason: reason.trim(),
      });
      if (res.data?.ok) {
        toast.info(res.data.message || "Plan unlocked for new revision");
        fetchMasterPlanData(selectedProjectId);
      }
    } catch (err) {
      console.error("Revision initiation failed:", err);
      toast.error("Failed to initiate plan revision");
    }
  };

  // Close modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (modalSection) setModalSection(null);
        if (showIntelligenceModal) setShowIntelligenceModal(false);
        if (showValidationModal) setShowValidationModal(false);
        if (showHistoryModal) setShowHistoryModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalSection, showIntelligenceModal, showValidationModal, showHistoryModal]);

  // Filtered Directory Projects (for default unselected view)
  const filteredDirectoryProjects = useMemo(() => {
    return projectsList.filter((p) => {
      const name = String(p.project_name || p.name || "").toLowerCase();
      const code = String(p.project_code || p.code || "").toLowerCase();
      const client = String(p.client_name || p.customer_name || "").toLowerCase();
      const matchSearch =
        !dirSearch.trim() ||
        name.includes(dirSearch.toLowerCase()) ||
        code.includes(dirSearch.toLowerCase()) ||
        client.includes(dirSearch.toLowerCase());

      const status = String(p.project_status || p.status || "ACTIVE").toUpperCase();
      let matchStatus = true;
      if (dirStatusFilter === "ACTIVE") {
        matchStatus = status === "IN_PROGRESS" || status === "ACTIVE";
      } else if (dirStatusFilter === "PLANNING") {
        matchStatus = status === "PLANNING";
      } else if (dirStatusFilter === "COMPLETED") {
        matchStatus = status === "COMPLETED" || status === "CLOSED";
      } else if (dirStatusFilter === "ON_HOLD") {
        matchStatus = status === "ON_HOLD" || status === "BLOCKED";
      }

      return matchSearch && matchStatus;
    });
  }, [projectsList, dirSearch, dirStatusFilter]);

  // ─────────────────────────────────────────────────────────────────────────
  // SCENARIO 1: DEFAULT APPLICATION PAGE (NO PROJECT SELECTED)
  // Per requirement: do not auto-select project by default, use default directory view
  // ─────────────────────────────────────────────────────────────────────────
  if (!selectedProjectId) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-5 pb-16">
        {/* Header Banner */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-smoky p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <Link
                to="/project-management"
                className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-2xs shrink-0"
                title="Back to Project Management"
              >
                <ArrowLeft size={16} />
              </Link>
              <div className="w-12 h-12 rounded-2xl bg-[#0E3646] text-white flex items-center justify-center text-2xl shrink-0 shadow-md">
                🗺️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
                    Project Plan &amp; Master Coordination Center
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                    Master Planning Hub
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Select a project to inspect and coordinate its master delivery plan, objectives, scope boundaries, WBS hierarchy, execution strategy, schedule, budget, and supporting management plans.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <div className="relative min-w-[200px] sm:min-w-[240px]">
                <select
                  value=""
                  onChange={(e) => handleSelectProject(e.target.value)}
                  className="w-full text-xs font-semibold h-10 px-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none appearance-none cursor-pointer shadow-2xs"
                >
                  <option value="">-- Choose Project Plan --</option>
                  {projectsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_code ? `[${p.project_code}] ` : ""}{p.project_name || p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Directory Search & Filter Controls */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-smoky flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search projects by title, code, or client name..."
              value={dirSearch}
              onChange={(e) => setDirSearch(e.target.value)}
              className="w-full pl-9 pr-8 text-xs h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
            />
            {dirSearch && (
              <button
                type="button"
                onClick={() => setDirSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {[
              { id: "ALL", label: "All Projects" },
              { id: "ACTIVE", label: "Active / In Progress" },
              { id: "PLANNING", label: "Planning" },
              { id: "ON_HOLD", label: "On Hold" },
              { id: "COMPLETED", label: "Completed" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDirStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  dirStatusFilter === tab.id
                    ? "bg-[#0E3646] text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Cards Directory */}
        {loadingProjects ? (
          <div className="p-16 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-smoky">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-brand" />
            Loading project plan directory from company records...
          </div>
        ) : filteredDirectoryProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDirectoryProjects.map((p) => {
              const status = p.project_status || p.status || "PLANNING";
              const priority = p.project_priority || p.priority || "MEDIUM";
              const pct = Number(p.completion_percent || 0);

              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectProject(p.id)}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-smoky hover:shadow-md hover:border-brand-400 dark:hover:border-brand-500 transition-all cursor-pointer p-5 sm:p-6 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                          priority === "HIGH" || priority === "CRITICAL"
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {priority}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                          status === "IN_PROGRESS" || status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200"
                            : status === "PLANNING"
                            ? "bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {status.replace("_", " ")}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1">
                        {p.project_name || p.name}
                      </h3>
                    </div>

                    {/* Execution Progress Gauge */}
                    <div className="pt-1 pb-1 flex flex-col items-center justify-center">
                      <div className="relative w-36 h-20 flex items-center justify-center">
                        <svg viewBox="0 0 130 68" className="w-full h-full overflow-visible">
                          <defs>
                            <linearGradient id={`gauge-grad-${p.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#0E3646" />
                              <stop offset="50%" stopColor="#0284c7" />
                              <stop offset="100%" stopColor="#10b981" />
                            </linearGradient>
                          </defs>

                          {/* Gauge background track */}
                          <path
                            d="M 20 54 A 45 45 0 0 1 110 54"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="9"
                            strokeLinecap="round"
                            className="text-slate-100 dark:text-slate-800"
                          />

                          {/* Gauge active progress arc */}
                          {pct > 0 && (
                            <path
                              d="M 20 54 A 45 45 0 0 1 110 54"
                              fill="none"
                              stroke={pct >= 100 ? "#10b981" : `url(#gauge-grad-${p.id})`}
                              strokeWidth="9"
                              strokeLinecap="round"
                              strokeDasharray="141.37"
                              strokeDashoffset={141.37 * (1 - Math.min(100, Math.max(0, pct)) / 100)}
                              className="transition-all duration-700 ease-out"
                            />
                          )}

                          {/* Min (0%) and Max (100%) tick labels */}
                          <text x="14" y="65" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">0%</text>
                          <text x="116" y="65" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">100%</text>
                        </svg>

                        {/* Center percentage readout */}
                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1 pointer-events-none">
                          <span className="text-xl font-black text-slate-900 dark:text-white font-mono leading-none">
                            {Math.round(pct)}%
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
                        Execution Progress
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-end text-xs">
                      <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-[#0E3646] hover:text-white dark:bg-slate-800 dark:hover:bg-[#0E3646] text-slate-700 dark:text-slate-200 font-bold transition shadow-2xs group-hover:bg-[#0E3646] group-hover:text-white">
                        <span>Open Master Plan</span>
                        <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    {/* Quick Scheduling Provisions */}
                    <div
                      className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/60"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        to={`/project-management/gantt?projectId=${p.id}&from=plan`}
                        state={{ from: `/project-management/plan?projectId=${p.id}` }}
                        className="py-1 px-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800/60 dark:hover:bg-emerald-950/40 border border-slate-200/80 dark:border-slate-700/60 text-[10px] font-semibold text-slate-600 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-300 transition text-center flex items-center justify-center gap-1"
                        title="Schedule dates and timeline in Gantt"
                      >
                        <CalendarIcon size={11} className="text-emerald-500" />
                        <span>Schedule</span>
                      </Link>
                      <Link
                        to={`/project-management/milestones?project_id=${p.id}&from=plan`}
                        state={{ from: `/project-management/plan?projectId=${p.id}` }}
                        className="py-1 px-1.5 rounded-lg bg-slate-50 hover:bg-amber-50 dark:bg-slate-800/60 dark:hover:bg-amber-950/40 border border-slate-200/80 dark:border-slate-700/60 text-[10px] font-semibold text-slate-600 hover:text-amber-700 dark:text-slate-300 dark:hover:text-amber-300 transition text-center flex items-center justify-center gap-1"
                        title="Schedule milestone target dates"
                      >
                        <Flag size={11} className="text-amber-500" />
                        <span>Milestones</span>
                      </Link>
                      <Link
                        to={`/project-management/tasks/new?project_id=${p.id}&from=plan`}
                        state={{ from: `/project-management/plan?projectId=${p.id}` }}
                        className="py-1 px-1.5 rounded-lg bg-slate-50 hover:bg-sky-50 dark:bg-slate-800/60 dark:hover:bg-sky-950/40 border border-slate-200/80 dark:border-slate-700/60 text-[10px] font-semibold text-slate-600 hover:text-sky-700 dark:text-slate-300 dark:hover:text-sky-300 transition text-center flex items-center justify-center gap-1"
                        title="Add and schedule a new task"
                      >
                        <Plus size={11} className="text-sky-500" />
                        <span>Add Task</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-smoky space-y-2">
            <Inbox size={28} className="mx-auto text-slate-300" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No matching projects found</h4>
            <p className="text-xs text-slate-500">Adjust your filter terms or select a project from the dropdown above.</p>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SCENARIO 2: ACTIVE MASTER PROJECT PLAN COORDINATION CENTER
  // ─────────────────────────────────────────────────────────────────────────
  const planStatus = planDetail?.plan_status || "DRAFT";
  const planVersion = planDetail?.version_no || 1;
  const isApproved = planStatus === "APPROVED";

  const stageGateTabs = [
    {
      id: "section1_overview",
      num: "1",
      label: "Overview & Objectives",
      icon: Target,
      status: completionIndicators.section1_overview,
    },
    {
      id: "section2_scope",
      num: "2",
      label: "Scope & WBS",
      icon: Layers,
      status: completionIndicators.section2_scope,
    },
    {
      id: "section3_execution",
      num: "3",
      label: "Execution Strategy",
      icon: Compass,
      status: completionIndicators.section3_execution,
    },
    {
      id: "section4_schedule_budget",
      num: "4",
      label: "Schedule & Budget",
      icon: Clock,
      status: completionIndicators.section4_schedule_budget,
    },
    {
      id: "section5_management",
      num: "5",
      label: "Management Plans",
      icon: ShieldCheck,
      status: completionIndicators.section5_management_plans,
    },
    {
      id: "documents",
      num: "6",
      label: "Supporting Documents",
      icon: Paperclip,
      status: null,
    },
  ];

  const currentModalTabMeta = stageGateTabs.find((t) => t.id === modalSection);
  const currentModalTabIndex = stageGateTabs.findIndex((t) => t.id === modalSection);
  const ModalIcon = currentModalTabMeta?.icon || Layers;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-5 pb-20">
      {/* ── Active Project Plan Master Command Header ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-smoky p-5 sm:p-6 space-y-4">
        {/* Executive Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start sm:items-center gap-3.5">
            <button
              type="button"
              onClick={() => handleSelectProject(null)}
              className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-2xs shrink-0 cursor-pointer"
              title="Return to Directory"
            >
              <ArrowLeft size={16} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0E3646] to-[#1a4a5e] text-white flex items-center justify-center shadow-sm shrink-0">
              <FolderKanban size={22} className="text-white" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {projectDetail?.project_code || `PRJ-${selectedProjectId}`}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight truncate">
                  {projectDetail?.project_name || "Master Project Plan"}
                </h1>
              </div>
            </div>
          </div>

          {/* Quick Actions & Controls */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
            {/* AI Advisor Button */}
            <button
              type="button"
              onClick={() => setShowIntelligenceModal(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Automated Planning Advisor & Gap Analysis"
            >
              <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
              <span>AI Advisor</span>
            </button>

            {/* Baseline History Drawer Button */}
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shadow-2xs cursor-pointer"
              title="View Historical Baselines & Approvals"
            >
              <History size={15} />
            </button>

            {/* Print Master Plan */}
            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shadow-2xs cursor-pointer"
              title="Print Official Master Project Plan"
            >
              <Printer size={15} />
            </button>

            {/* Save Draft Button */}
            {!isApproved && (
              <button
                type="button"
                disabled={savingDraft}
                onClick={handleSaveDraft}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
                  hasUnsavedChanges
                    ? "bg-amber-600 hover:bg-amber-700 text-white animate-pulse"
                    : "bg-[#0E3646] hover:bg-[#164356] text-white"
                }`}
              >
                <Save size={13} />
                <span>{savingDraft ? "Saving..." : hasUnsavedChanges ? "Save Changes *" : "Save Draft"}</span>
              </button>
            )}

            {/* Approval Workflow Buttons */}
            {planStatus === "READY_FOR_REVIEW" && (
              <button
                type="button"
                onClick={handleApprovePlan}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Check size={13} />
                <span>Approve Plan (Lock Baseline)</span>
              </button>
            )}

            {isApproved && (
              <button
                type="button"
                onClick={handleCreateRevision}
                className="px-4 py-2 rounded-xl bg-[#0E3646] hover:bg-[#164356] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Initiate Controlled Revision / Rebaseline"
              >
                <History size={13} />
                <span>Revise Plan (v{planVersion + 1})</span>
              </button>
            )}
          </div>
        </div>

        {/* Executive Project Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <Building2 size={14} className="text-slate-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Client</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block text-[11px]">
                {projectDetail?.client_name || "General Client"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <Users size={14} className="text-slate-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Project Manager</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block text-[11px]">
                {projectDetail?.manager_name || "Unassigned"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <CalendarIcon size={14} className="text-slate-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Schedule Window</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block text-[11px]">
                {formatPlanDate(projectDetail?.start_date)} → {formatPlanDate(projectDetail?.end_date)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <Compass size={14} className="text-slate-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Delivery Methodology</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block text-[11px]">
                {planDetail?.delivery_methodology || "Waterfall / Stage-Gate"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 7 Canonical Master KPI Metrics Cards (Application Standard) ── */}
      <MobileMovingCarousel
        data-page-carousel
        gridColsClass="grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-7"
        gapClass="gap-3.5"
      >
        {[
          {
            label: "Duration",
            val:
              planSummaries.scheduleSummary?.plannedStartDate && planSummaries.scheduleSummary?.plannedCompletionDate
                ? `${Math.max(
                    1,
                    Math.round(
                      (new Date(planSummaries.scheduleSummary.plannedCompletionDate) -
                        new Date(planSummaries.scheduleSummary.plannedStartDate)) /
                        (1000 * 60 * 60 * 24)
                    )
                  )}d`
                : "TBD",
            sub: "Planned calendar",
            icon: Clock,
            iconColor: "text-sky-500",
          },
          {
            label: "Budget Baseline",
            val: `GH₵ ${Number(projectDetail?.budget || 0).toLocaleString()}`,
            sub: "Approved ceiling",
            icon: DollarSign,
            iconColor: "text-emerald-500",
          },
          {
            label: "Scopes",
            val: (projectDetail?.project_scopes || []).length,
            sub: "WBS work areas",
            icon: Layers,
            iconColor: "text-indigo-500",
          },
          {
            label: "Total Tasks",
            val: planSummaries.scheduleSummary?.totalTasks || 0,
            sub: "Scheduled tasks",
            icon: CheckSquare,
            iconColor: "text-amber-500",
          },
          {
            label: "Deliverables",
            val: planSummaries.totalDeliverables || 0,
            sub: "Major outcomes",
            icon: Target,
            iconColor: "text-purple-500",
          },
          {
            label: "Milestones",
            val: planSummaries.totalMilestones || 0,
            sub: "Stage gates",
            icon: Flag,
            iconColor: "text-rose-500",
          },
          {
            label: "Plan Readiness",
            val: `${planCompletionPercent}%`,
            sub: "Score",
            icon: Activity,
            iconColor: "text-teal-600 dark:text-teal-400",
            hasProgress: true,
            progress: planCompletionPercent,
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-3.5 shadow-smoky hover:shadow-md transition-all flex flex-col justify-between min-h-[76px] group"
            >
              <div className="flex items-start justify-between gap-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {card.label}
                </span>
                <Icon size={14} className={`${card.iconColor} shrink-0 stroke-[2]`} />
              </div>
              <div className="mt-1">
                <span className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-white leading-tight block">
                  {card.val}
                </span>
                {card.hasProgress ? (
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, card.progress))}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-semibold text-slate-400 shrink-0">Score</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block leading-tight">
                    {card.sub}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </MobileMovingCarousel>

      {/* ── Schedule Dates, Targets & Authoritative Modules (Executive Command Card) ── */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-[#0B2A37] via-[#0E3646] to-[#15465A] text-white shadow-2xl border border-white/10">
        {/* Subtle decorative glow accents */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="space-y-1 max-w-2xl">
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Schedule Dates, Targets &amp; Authoritative Modules</span>
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Use the dedicated portals below to manage operational execution, CPM constraints, stage-gate milestones, budget items, or workforce allocations for{" "}
              <span className="font-bold text-white underline decoration-emerald-400/50 underline-offset-2">
                {projectDetail?.project_name || "the active project"}
              </span>:
            </p>
          </div>

          <Link
            to={`/project-management/gantt?projectId=${selectedProjectId}&from=plan`}
            state={currentPlanReturnState}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-extrabold transition flex items-center gap-2 shadow-sm shrink-0 hover:shadow-md hover:scale-[1.02] cursor-pointer self-start md:self-auto"
          >
            <CalendarIcon size={14} className="text-emerald-600" />
            <span>Open Gantt Scheduler</span>
            <ArrowRight size={13} className="text-slate-500" />
          </Link>
        </div>

        {/* 8 Portal Action Cards in 2 Rows of 4 */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4">
          {[
            {
              to: `/project-management/gantt?projectId=${selectedProjectId}&from=plan`,
              icon: CalendarIcon,
              iconColor: "text-emerald-400",
              label: "Gantt & Timeline",
              sub: "Schedule dates, constraints & CPM",
            },
            {
              to: `/project-management/milestones?project_id=${selectedProjectId}&from=plan`,
              icon: Flag,
              iconColor: "text-amber-400",
              label: "Schedule Milestones",
              sub: "Target dates & stage gates",
            },
            {
              to: `/project-management/tasks/new?project_id=${selectedProjectId}&from=plan`,
              icon: CheckSquare,
              iconColor: "text-sky-400",
              label: "Schedule New Task",
              sub: "Set start/due dates & hours",
            },
            {
              to: `/project-management/tasks/assignment?project_id=${selectedProjectId}&from=plan`,
              icon: Users,
              iconColor: "text-purple-400",
              label: "Task Assignment",
              sub: "Kanban execution & workload",
            },
            {
              to: `/project-management/projects/${selectedProjectId}?from=plan`,
              icon: Briefcase,
              iconColor: "text-indigo-400",
              label: "Charter & Scope",
              sub: "Contract dates & budget baseline",
            },
            {
              to: `/project-management/costing?projectId=${selectedProjectId}&from=plan`,
              icon: DollarSign,
              iconColor: "text-emerald-400",
              label: "Project Costing & BOQ",
              sub: "CBS items, markup & cost codes",
            },
            {
              to: `/project-management/resources?project_id=${selectedProjectId}&from=plan`,
              icon: Truck,
              iconColor: "text-amber-400",
              label: "Allocate Resources",
              sub: "Equipment, machinery & labor",
            },
            {
              to: `/project-management/risk-management?projectId=${selectedProjectId}&from=plan`,
              icon: ShieldAlert,
              iconColor: "text-rose-400",
              label: "Risk Register",
              sub: "Threats & mitigation deadlines",
            },
          ].map((p, idx) => {
            const Icon = p.icon;
            return (
              <Link
                key={idx}
                to={p.to}
                state={currentPlanReturnState}
                className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg backdrop-blur-xs flex flex-col justify-between group cursor-pointer min-h-[96px]"
              >
                <div className="flex items-center justify-between">
                  <Icon size={18} className={`${p.iconColor} transition-transform group-hover:scale-110`} />
                  <ArrowRight size={13} className="text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="mt-2.5">
                  <span className="text-sm font-extrabold text-white block group-hover:text-emerald-300 transition-colors">
                    {p.label}
                  </span>
                  <span className="text-xs text-white/60 block mt-0.5">
                    {p.sub}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Integrated Enterprise Stage-Gate Navigation Tabs ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-1.5 shadow-smoky">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {stageGateTabs.map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            const isComplete = tab.status === "COMPLETE";
            const isInProgress = tab.status === "IN_PROGRESS";

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setModalSection(tab.id);
                }}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
                  isSel
                    ? "bg-[#0E3646] text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isSel
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {tab.num}
                </span>
                <Icon size={14} className={isSel ? "text-white" : "text-slate-400"} />
                <span>{tab.label}</span>

                {tab.status && (
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isComplete ? "bg-emerald-400" : isInProgress ? "bg-blue-400" : "bg-amber-400"
                    }`}
                    title={`Readiness: ${tab.status}`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading state indicator */}
      {loadingPlan && (
        <div className="p-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-smoky">
          <RefreshCw size={22} className="animate-spin mx-auto mb-2 text-brand" />
          Consolidating master project plan from company records...
        </div>
      )}

      {/* ── Modals & Overlays (Rendered via Portal to break free from layout stacking context) ── */}
      {/* 1. Automated AI Planning Advisor Modal */}
      {showIntelligenceModal &&
        createPortal(
          <PlanIntelligenceModal
            projectId={selectedProjectId}
            plan={planDetail}
            onChangePlan={handleUpdatePlanLocal}
            onClose={() => setShowIntelligenceModal(false)}
          />,
          document.body
        )}

      {/* 2. Baseline Readiness Validation Modal */}
      {showValidationModal &&
        createPortal(
          <PlanValidationModal
            project={projectDetail}
            plan={planDetail}
            summaries={planSummaries}
            indicators={completionIndicators}
            planCompletionPercent={planCompletionPercent}
            onSubmitForReview={handleSubmitForReview}
            onClose={() => setShowValidationModal(false)}
            submitting={submittingReview}
          />,
          document.body
        )}

      {/* 3. Baseline History & Snapshot Viewer Modal */}
      {showHistoryModal &&
        createPortal(
          <PlanBaselineHistoryModal
            history={baselineHistory}
            currentVersion={planVersion}
            onClose={() => setShowHistoryModal(false)}
          />,
          document.body
        )}

      {/* 4. Stage-Gate Section Detail Modal */}
      {modalSection &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) setModalSection(null);
            }}
          >
            <div
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-5xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/80 dark:bg-slate-850 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#0E3646] text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                    <ModalIcon size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">
                        {currentModalTabMeta?.num}. {currentModalTabMeta?.label}
                      </h2>
                      {currentModalTabMeta?.status && (
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            currentModalTabMeta.status === "COMPLETE"
                              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              : "bg-blue-50 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                          }`}
                        >
                          {currentModalTabMeta.status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      Master Project Plan • {projectDetail?.project_name || "Detail View"}
                    </p>
                  </div>
                </div>

                {/* Modal Navigation Tabs Switcher */}
                <div className="hidden lg:flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  {stageGateTabs.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setModalSection(t.id);
                        setActiveTab(t.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        modalSection === t.id
                          ? "bg-[#0E3646] text-white shadow-2xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <span>{t.num}.</span>
                      <span className="truncate max-w-[95px]">{t.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setModalSection(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer shrink-0"
                  title="Close Modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {modalSection === "section1_overview" && (
                  <PlanOverviewSection
                    project={projectDetail}
                    plan={planDetail}
                    onChangePlan={handleUpdatePlanLocal}
                    readOnly={isApproved}
                    planReturnState={currentPlanReturnState}
                  />
                )}
                {modalSection === "section2_scope" && (
                  <PlanScopeSection
                    project={projectDetail}
                    plan={planDetail}
                    tasks={planSummaries.tasks || []}
                    onChangePlan={handleUpdatePlanLocal}
                    readOnly={isApproved}
                    planReturnState={currentPlanReturnState}
                  />
                )}
                {modalSection === "section3_execution" && (
                  <PlanExecutionSection
                    project={projectDetail}
                    plan={planDetail}
                    onChangePlan={handleUpdatePlanLocal}
                    readOnly={isApproved}
                    planReturnState={currentPlanReturnState}
                  />
                )}
                {modalSection === "section4_schedule_budget" && (
                  <PlanScheduleBudgetSection
                    project={projectDetail}
                    summaries={planSummaries}
                    planReturnState={currentPlanReturnState}
                  />
                )}
                {modalSection === "section5_management" && (
                  <PlanManagementSection
                    project={projectDetail}
                    plan={planDetail}
                    summaries={planSummaries}
                    onChangePlan={handleUpdatePlanLocal}
                    readOnly={isApproved}
                    planReturnState={currentPlanReturnState}
                  />
                )}
                {modalSection === "documents" && (
                  <PlanDocumentManager
                    project={projectDetail}
                    documents={planSummaries.documents || []}
                    onRefresh={() => fetchMasterPlanData(selectedProjectId)}
                    planReturnState={currentPlanReturnState}
                    readOnly={isApproved}
                  />
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                <button
                  type="button"
                  disabled={currentModalTabIndex <= 0}
                  onClick={() => {
                    const prevTab = stageGateTabs[currentModalTabIndex - 1];
                    if (prevTab) {
                      setModalSection(prevTab.id);
                      setActiveTab(prevTab.id);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    currentModalTabIndex <= 0
                      ? "opacity-30 cursor-not-allowed text-slate-400"
                      : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                  }`}
                >
                  <ArrowLeft size={13} />
                  <span>Previous Section</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalSection(null)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={currentModalTabIndex >= stageGateTabs.length - 1}
                    onClick={() => {
                      const nextTab = stageGateTabs[currentModalTabIndex + 1];
                      if (nextTab) {
                        setModalSection(nextTab.id);
                        setActiveTab(nextTab.id);
                      }
                    }}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      currentModalTabIndex >= stageGateTabs.length - 1
                        ? "opacity-30 cursor-not-allowed bg-slate-100 text-slate-400"
                        : "bg-[#0E3646] hover:bg-[#164356] text-white cursor-pointer shadow-sm"
                    }`}
                  >
                    <span>Next Section</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
