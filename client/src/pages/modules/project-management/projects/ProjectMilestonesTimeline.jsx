/**
 * @file ProjectMilestonesTimeline.jsx
 * @description Standard Enterprise Project Milestone Management & Timeline Hub for OmniSuite ERP.
 * 
 * Features:
 * - Enterprise Milestone Dashboard: Total, Achieved, In Progress, Pending, Overdue KPI metrics & completion rate.
 * - Standard Milestone Register: View, filter (by status/type), search, and manage critical phase gates.
 * - 1-Click Automatic Milestone Detection: Engine discovers phase completions from project tasks & WBS.
 * - Visual Milestone Roadmap: Chronological phase-gate milestone timeline.
 * - Quality Inspection Sign-Off: Formal verification & QA condition tracking with inspection notes.
 * - Manual Milestone Creation & Editing: Full lifecycle management linked to contributing tasks.
 * - Scope & Work Plan / WBS Breakdown: Preserved work packages and task execution views.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import {
  Flag,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Plus,
  Calendar,
  Check,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Users,
  Eye,
  FileCheck,
  Layers,
  ArrowLeft,
  FolderKanban,
  Layout,
  ListTree,
  Loader2,
  RefreshCw,
  RotateCcw,
  AlertCircle,
  CheckSquare,
  Building2,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";
import ProjectModal from "../components/ProjectModal.jsx";

const parseTaskChecklist = (task) => {
  if (!task) return [];
  if (task.checklist && Array.isArray(task.checklist) && task.checklist.length > 0) {
    return task.checklist;
  }
  const raw = task.task_description || task.description;
  if (!raw) {
    return [{ id: 1, text: `${task.task_title || "Task"} Deliverables & Scope`, completed: true }];
  }
  try {
    const s = String(raw).trim();
    if (s.startsWith("[") && s.endsWith("]")) {
      const arr = JSON.parse(s);
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.map((item, idx) => ({
          id: item.id || idx + 1,
          text: typeof item === "string" ? item : item.text || item.title || item.name || `Deliverable Item #${idx + 1}`,
          completed: true,
          note: item.note || "",
        }));
      }
    } else {
      const lines = s.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        return lines.map((l, idx) => ({
          id: idx + 1,
          text: l,
          completed: true,
          note: "",
        }));
      }
    }
  } catch {}
  return [{ id: 1, text: `${task.task_title || "Task"} Deliverables & Scope`, completed: true }];
};

const MILESTONE_TYPES = [
  { value: "TASK_COMPLETION", label: "Task completion", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  { value: "PHASE_COMPLETION", label: "Phase Completion Gate", color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  { value: "PRACTICAL_COMPLETION", label: "Practical Handover", color: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" },
  { value: "QUALITY_INSPECTION", label: "Quality / Inspection Sign-off", color: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  { value: "CONTRACTUAL", label: "Contractual Commitment", color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" },
  { value: "PAYMENT_GATE", label: "Commercial / Billing Gate", color: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  { value: "LIFECYCLE", label: "Project Lifecycle Gate", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
];

function getMilestoneTypeMeta(type) {
  return (
    MILESTONE_TYPES.find((t) => t.value === type) || {
      value: type,
      label: type ? type.replace(/_/g, " ") : "General Milestone",
      color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    }
  );
}

export default function ProjectMilestonesTimeline() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
    } else if (searchParams.get("from") === "plan") {
      const pId = searchParams.get("project_id") || searchParams.get("projectId") || selectedProjectId;
      navigate(pId ? `/project-management/plan?projectId=${pId}` : "/project-management/plan");
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/project-management");
    }
  };

  const initialProjectId = searchParams.get("project_id") || searchParams.get("projectId") || "";
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [selectedProject, setSelectedProject] = useState(null);

  // Core Data States
  const [milestonesData, setMilestonesData] = useState({
    confirmed: [],
    suggested: [],
    counts: { total: 0, achieved: 0, in_progress: 0, pending: 0, overdue: 0, suggested: 0 },
  });
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [fetchingMilestones, setFetchingMilestones] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [viewMode, setViewMode] = useState("REGISTER"); // 'REGISTER' | 'ROADMAP' | 'SCOPE' | 'GANTT'
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, ACHIEVED, IN_PROGRESS, PENDING, OVERDUE
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTasks, setExpandedTasks] = useState({});

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [inspectingMilestone, setInspectingMilestone] = useState(null);
  const [deleteConfirmMilestone, setDeleteConfirmMilestone] = useState(null);

  // Task Dates Edit State (provision to edit tasks from milestone page)
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    start_date: "",
    end_date: "",
    actual_start_date: "",
    actual_end_date: "",
    status: "PENDING",
    completion_percent: 0,
  });

  // Form State for Create/Edit
  const [milestoneForm, setMilestoneForm] = useState({
    title: "",
    description: "",
    milestone_type: "TASK_COMPLETION",
    target_date: new Date().toISOString().split("T")[0],
    actual_start_date: "",
    actual_end_date: "",
    requires_inspection: false,
    responsible_owner_id: "",
    responsible_owner_name: "",
    work_plan_element: "",
    remarks: "",
    linkedTaskIds: [],
  });

  const [activeTaskChecklist, setActiveTaskChecklist] = useState([]);
  const [activeLinkedTask, setActiveLinkedTask] = useState(null);

  // Load Projects & Users
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const [projRes] = await Promise.all([
          api.get("/projects/projects", { params: { active: "all" } }).catch(() => api.get("/projects?active=all")),
        ]);
        const list = projRes.data?.items || projRes.data?.projects || projRes.data?.data || (Array.isArray(projRes.data) ? projRes.data : []);
        setProjects(list);

        let userList = [];
        try {
          const uRes = await api.get("/users");
          userList = uRes.data?.users || uRes.data?.data || (Array.isArray(uRes.data) ? uRes.data : []);
        } catch {
          try {
            const uRes2 = await api.get("/admin/users", { params: { active: 1 } });
            userList = uRes2.data?.users || uRes2.data?.items || uRes2.data?.data || (Array.isArray(uRes2.data) ? uRes2.data : []);
          } catch {}
        }
        setUsers(Array.isArray(userList) ? userList : []);
      } catch (e) {
        toast.error("Failed to load project list");
      } finally {
        setLoading(false);
      }
    }
    init();
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

  // Load Milestones & Tasks for Selected Project
  const fetchProjectData = useCallback(async (projId) => {
    if (!projId) {
      setMilestonesData({ confirmed: [], suggested: [], counts: { total: 0, achieved: 0, in_progress: 0, pending: 0, overdue: 0 } });
      setTasks([]);
      return;
    }
    try {
      setFetchingMilestones(true);
      const [mRes, tRes] = await Promise.all([
        api.get(`/construction/projects/${projId}/milestones`).catch(() => api.get(`/projects/${projId}/milestones`)),
        api.get("/projects/tasks", { params: { project_id: projId } }).catch(() => ({ data: { items: [] } })),
      ]);

      const mData = mRes.data || {};
      setMilestonesData({
        confirmed: mData.confirmed || [],
        suggested: mData.suggested || [],
        counts: mData.counts || { total: 0, achieved: 0, in_progress: 0, pending: 0, overdue: 0 },
      });
      setTasks(tRes.data?.items || []);
    } catch (err) {
      console.error("Error loading milestone data:", err);
      toast.error("Failed to load project milestones");
    } finally {
      setFetchingMilestones(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectData(selectedProjectId);
    }
  }, [selectedProjectId, fetchProjectData]);

  // Handle URL query parameters to auto-launch milestone form for a specific task
  useEffect(() => {
    const qTaskId = searchParams.get("taskId");
    const qOpen = searchParams.get("openCreate");
    if (qTaskId && tasks.length > 0 && !showCreateModal && !editingMilestone) {
      const match = tasks.find((t) => String(t.id) === String(qTaskId));
      if (match) {
        handleOpenCreateModal(match);
      }
    } else if (qOpen && !showCreateModal && !editingMilestone) {
      handleOpenCreateModal();
    }
  }, [searchParams, tasks]);

  // Run Milestone Detection Engine
  const handleRunDetection = async () => {
    if (!selectedProjectId) {
      toast.warning("Please select a project first.");
      return;
    }
    try {
      setDetecting(true);
      const res = await api.post(`/construction/projects/${selectedProjectId}/milestones/detect`);
      const count = res.data?.new_suggestions_count || 0;
      if (count > 0) {
        toast.success(`Milestone Engine completed: ${count} recommendation(s) generated!`);
      } else {
        toast.info("Milestone Detection complete. All critical work plan gates are already established.");
      }
      fetchProjectData(selectedProjectId);
    } catch (err) {
      console.error("Detection error:", err);
      toast.error(err?.response?.data?.message || "Failed to run milestone detection");
    } finally {
      setDetecting(false);
    }
  };

  // Accept a Suggested Milestone
  const handleAcceptSuggestion = async (milestone) => {
    try {
      await api.post(`/construction/milestones/${milestone.id}/accept`);
      toast.success(`Milestone "${milestone.title}" confirmed into active register!`);
      fetchProjectData(selectedProjectId);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to confirm milestone");
    }
  };

  // Reject a Suggested Milestone
  const handleRejectSuggestion = async (milestone) => {
    try {
      await api.post(`/construction/milestones/${milestone.id}/reject`, { reason: "User dismissed recommendation" });
      toast.info(`Recommendation "${milestone.title}" dismissed.`);
      fetchProjectData(selectedProjectId);
    } catch (err) {
      toast.error("Failed to dismiss suggestion");
    }
  };

  // Helper to derive system captured start and end dates from tasks or project
  const getSystemDatesFromTasks = (taskIds = []) => {
    const list = taskIds.length > 0
      ? tasks.filter((t) => taskIds.includes(t.id))
      : tasks;
    if (list.length === 0) {
      const pStart = selectedProject?.start_date ? String(selectedProject.start_date).split("T")[0] : new Date().toISOString().split("T")[0];
      const pEnd = selectedProject?.target_completion_date ? String(selectedProject.target_completion_date).split("T")[0] : new Date().toISOString().split("T")[0];
      return {
        start: `${pStart}T08:00`,
        end: `${pEnd}T17:00`,
        targetDate: pEnd,
      };
    }
    const starts = list.map((t) => t.actual_start_date || t.start_date).filter(Boolean).sort();
    const ends = list.map((t) => t.actual_end_date || t.end_date).filter(Boolean).sort();
    const s = starts[0]
      ? (String(starts[0]).includes("T") ? String(starts[0]).slice(0, 16) : `${String(starts[0]).split("T")[0]}T08:00`)
      : `${new Date().toISOString().split("T")[0]}T08:00`;
    const e = ends[ends.length - 1]
      ? (String(ends[ends.length - 1]).includes("T") ? String(ends[ends.length - 1]).slice(0, 16) : `${String(ends[ends.length - 1]).split("T")[0]}T17:00`)
      : `${new Date().toISOString().split("T")[0]}T17:00`;
    const tgt = ends[ends.length - 1] ? String(ends[ends.length - 1]).split("T")[0] : new Date().toISOString().split("T")[0];
    return { start: s, end: e, targetDate: tgt };
  };

  // Open Create Modal (pre-populating title with "[Task Name] sign-off", category with "Task completion", and target date with task creation date)
  const handleOpenCreateModal = (presetTask = null) => {
    const qTaskId = searchParams.get("taskId");
    const targetTask =
      presetTask ||
      (qTaskId ? tasks.find((t) => String(t.id) === String(qTaskId)) : null) ||
      (tasks.length > 0 ? tasks[0] : null);

    const initialLinkedIds = targetTask ? [targetTask.id] : [];
    const sys = getSystemDatesFromTasks(initialLinkedIds);
    const taskTitle = targetTask?.task_title || targetTask?.title || "";
    const taskSignoffTitle = taskTitle ? `${taskTitle} sign-off` : "";
    const taskTargetDate = targetTask?.end_date
      ? String(targetTask.end_date).split("T")[0]
      : sys.targetDate;

    // 1. Assigned owner should be the user assigned to the task
    const ownerId = targetTask
      ? String(targetTask.assigned_to_id || targetTask.assigned_to || "")
      : "";
    const ownerName = targetTask
      ? (targetTask.assigned_to_name || targetTask.assigned_user_name || "")
      : "";

    // 2. Associated work plan scope should display the full WBS name
    const wbsScope =
      targetTask?.scope_name ||
      targetTask?.wbs_name ||
      targetTask?.work_package_name ||
      targetTask?.package_name ||
      targetTask?.work_plan_element ||
      (targetTask?.wbs_code ? `WBS: ${targetTask.wbs_code}` : "");

    const checklist = parseTaskChecklist(targetTask);
    setActiveTaskChecklist(checklist);
    setActiveLinkedTask(targetTask);

    setMilestoneForm({
      title: taskSignoffTitle,
      description: targetTask ? `Deliverable verification and sign-off for task: ${taskTitle}` : "",
      milestone_type: "TASK_COMPLETION",
      target_date: taskTargetDate,
      actual_start_date: sys.start,
      actual_end_date: sys.end,
      system_captured_start: sys.start,
      system_captured_end: sys.end,
      requires_inspection: false,
      responsible_owner_id: ownerId,
      responsible_owner_name: ownerName,
      work_plan_element: wbsScope,
      remarks: "",
      linkedTaskIds: targetTask ? [targetTask.id] : initialLinkedIds,
    });
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (m) => {
    setEditingMilestone(m);
    const linkedIds = (m.linked_tasks || []).map((t) => t.task_id || t.id);
    const sys = getSystemDatesFromTasks(linkedIds);
    const targetTask =
      (m.linked_tasks && m.linked_tasks.length > 0)
        ? tasks.find((t) => Number(t.id) === Number(m.linked_tasks[0].task_id || m.linked_tasks[0].id)) || m.linked_tasks[0]
        : (tasks.find((t) => linkedIds.includes(t.id)) || (tasks.length > 0 ? tasks[0] : null));

    const ownerId = m.responsible_owner_id
      ? String(m.responsible_owner_id)
      : (targetTask ? String(targetTask.assigned_to_id || targetTask.assigned_to || "") : "");
    const ownerName = m.responsible_owner_name || m.owner_name || targetTask?.assigned_to_name || "";
    const wbsScope = m.work_plan_element || (targetTask?.wbs_code ? `Work Plan/WBS: ${targetTask.wbs_code}` : "");

    const checklist = parseTaskChecklist(targetTask);
    setActiveTaskChecklist(checklist);
    setActiveLinkedTask(targetTask);

    setMilestoneForm({
      title: m.title || "",
      description: m.description || "",
      milestone_type: m.milestone_type || "TASK_COMPLETION",
      target_date: m.target_date ? String(m.target_date).split("T")[0] : sys.targetDate,
      actual_start_date: m.actual_start_date ? String(m.actual_start_date).slice(0, 16) : sys.start,
      actual_end_date: m.actual_end_date ? String(m.actual_end_date).slice(0, 16) : sys.end,
      system_captured_start: sys.start,
      system_captured_end: sys.end,
      requires_inspection: Boolean(m.requires_inspection),
      responsible_owner_id: ownerId,
      responsible_owner_name: ownerName,
      work_plan_element: wbsScope,
      remarks: m.remarks || "",
      linkedTaskIds: linkedIds.length > 0 ? linkedIds : (targetTask ? [targetTask.id] : []),
    });
  };

  // Open Task Dates Edit Modal (provision to edit tasks directly from milestone page)
  const handleOpenTaskEdit = (task) => {
    setEditingTask(task);
    setTaskForm({
      start_date: task.start_date ? String(task.start_date).split("T")[0] : "",
      end_date: task.end_date ? String(task.end_date).split("T")[0] : "",
      actual_start_date: task.actual_start_date ? String(task.actual_start_date).slice(0, 16) : "",
      actual_end_date: task.actual_end_date ? String(task.actual_end_date).slice(0, 16) : "",
      status: task.task_status || task.status || "PENDING",
      completion_percent: task.completion_percent || 0,
    });
  };

  // Save Task Dates from Milestone Page
  const handleSaveTaskDates = async (e) => {
    if (e) e.preventDefault();
    if (!editingTask) return;
    try {
      const taskId = editingTask.task_id || editingTask.id;
      const payload = {
        start_date: taskForm.start_date || null,
        end_date: taskForm.end_date || null,
        actual_start_date: taskForm.actual_start_date || null,
        actual_end_date: taskForm.actual_end_date || null,
        status: taskForm.status,
        completion_percent: Number(taskForm.completion_percent || 0),
      };
      await api.put(`/projects/tasks/${taskId}`, payload);
      toast.success("Task target & actual dates saved successfully!");
      setEditingTask(null);
      if (selectedProjectId) fetchProjectData(selectedProjectId);
    } catch (err) {
      toast.error("Failed to update task dates");
    }
  };

  // Save (Create or Update) Milestone
  const handleSaveMilestone = async (e) => {
    if (e) e.preventDefault();
    if (!milestoneForm.title.trim()) {
      toast.warning("Milestone title is required");
      return;
    }
    if (!selectedProjectId) {
      toast.error("Project ID is required");
      return;
    }

    try {
      const payload = {
        ...milestoneForm,
        project_id: selectedProjectId,
      };

      if (editingMilestone) {
        await api.put(`/construction/milestones/${editingMilestone.id}`, payload);
        toast.success(`Milestone "${milestoneForm.title}" updated successfully!`);
        setEditingMilestone(null);
      } else {
        await api.post(`/construction/milestones`, payload);
        toast.success(`Milestone "${milestoneForm.title}" created successfully!`);
        setShowCreateModal(false);
      }
      fetchProjectData(selectedProjectId);
    } catch (err) {
      console.error("Save milestone error:", err);
      toast.error(err?.response?.data?.message || "Failed to save milestone");
    }
  };

  // Delete Milestone
  const handleDeleteMilestone = async () => {
    if (!deleteConfirmMilestone) return;
    try {
      await api.delete(`/construction/milestones/${deleteConfirmMilestone.id}`);
      toast.info(`Milestone "${deleteConfirmMilestone.title}" removed.`);
      setDeleteConfirmMilestone(null);
      fetchProjectData(selectedProjectId);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete milestone");
    }
  };

  // Toggle Quick Status (Achieve / Reopen)
  const handleToggleAchieveStatus = async (m) => {
    const isCurrentlyAchieved = m.live_status === "ACHIEVED" || m.status === "ACHIEVED" || m.status === "COMPLETED";
    const nextStatus = isCurrentlyAchieved ? "IN_PROGRESS" : "ACHIEVED";
    try {
      await api.put(`/construction/milestones/${m.id}`, {
        ...m,
        status: nextStatus,
        completion_date: nextStatus === "ACHIEVED" ? new Date().toISOString().split("T")[0] : null,
      });
      toast.success(
        nextStatus === "ACHIEVED"
          ? `Milestone "${m.title}" marked as ACHIEVED!`
          : `Milestone "${m.title}" reopened to In Progress.`
      );
      fetchProjectData(selectedProjectId);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  // Inspection Sign-Off
  const handleSaveInspectionSignoff = async (notes) => {
    if (!inspectingMilestone) return;
    try {
      await api.post(`/construction/milestones/${inspectingMilestone.id}/toggle-inspection`, { notes });
      toast.success(`Quality inspection condition signed off for "${inspectingMilestone.title}"!`);
      setInspectingMilestone(null);
      fetchProjectData(selectedProjectId);
    } catch (err) {
      toast.error("Failed to sign off inspection");
    }
  };

  // Format Date and Time clearly for actual execution display (showing start & end times across Achieved, In Progress, Pending, Overdue)
  const formatDateTimeDisplay = (dateVal, fallbackTime = "08:00 AM") => {
    if (!dateVal) return null;
    try {
      const rawStr = String(dateVal).trim();
      let d;
      let hasExplicitTime = false;
      if (rawStr.includes("T")) {
        const timePart = rawStr.split("T")[1];
        if (timePart && !timePart.startsWith("00:00")) {
          hasExplicitTime = true;
        }
        d = new Date(rawStr);
      } else if (rawStr.includes(" ")) {
        const timePart = rawStr.split(" ")[1];
        if (timePart && !timePart.startsWith("00:00")) {
          hasExplicitTime = true;
        }
        d = new Date(rawStr.replace(" ", "T"));
      } else {
        d = new Date(rawStr);
      }

      if (isNaN(d.getTime())) return null;

      if (hasExplicitTime) {
        return format(d, "MMM d, yyyy h:mm a");
      } else {
        return `${format(d, "MMM d, yyyy")}, ${fallbackTime}`;
      }
    } catch {
      return null;
    }
  };

  const getExecutionTimeWindow = (m) => {
    const rawStart = m.actual_start_date || m.system_captured_start || m.start_date || m.target_date || m.created_at;
    const rawEnd = m.actual_end_date || m.completion_date || m.system_captured_end || m.end_date || m.target_date || m.due_date;

    const startText = formatDateTimeDisplay(rawStart, "08:00 AM") || "08:00 AM";
    const endText = formatDateTimeDisplay(rawEnd, "05:00 PM") || "05:00 PM";

    return {
      start: startText,
      end: endText,
    };
  };

  // Robust status helper to ensure overdue, in-progress, achieved, and pending are consistently identified
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

  const dynamicCounts = useMemo(() => {
    const list = milestonesData.confirmed || [];
    let achieved = 0;
    let inProgress = 0;
    let overdue = 0;
    let pending = 0;

    list.forEach((m) => {
      const st = getMilestoneStatus(m);
      if (st === "ACHIEVED") achieved++;
      else if (st === "OVERDUE") overdue++;
      else if (st === "IN_PROGRESS") inProgress++;
      else pending++;
    });

    return {
      total: list.length,
      achieved,
      in_progress: inProgress,
      overdue,
      pending,
    };
  }, [milestonesData.confirmed, getMilestoneStatus]);

  // Filtered Milestones
  const filteredMilestones = useMemo(() => {
    const list = milestonesData.confirmed || [];
    return list.filter((m) => {
      // Status match
      const st = getMilestoneStatus(m);
      let matchStatus = true;
      if (statusFilter !== "ALL") {
        matchStatus = st === statusFilter;
      }

      // Search match
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (m.title || "").toLowerCase().includes(q) ||
        (m.work_plan_element || "").toLowerCase().includes(q) ||
        (m.owner_name || m.responsible_owner_name || "").toLowerCase().includes(q);

      return matchStatus && matchSearch;
    });
  }, [milestonesData.confirmed, statusFilter, searchQuery, getMilestoneStatus]);

  // Overall Milestone Progress Calculation
  const progressPercent = useMemo(() => {
    const total = dynamicCounts.total;
    const achieved = dynamicCounts.achieved;
    if (!total) return 0;
    return Math.round((achieved / total) * 100);
  }, [dynamicCounts]);

  // Gantt Chart Calculations (for retained Gantt view)
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => new Date(a.start_date || a.created_at) - new Date(b.start_date || b.created_at));
  }, [tasks]);

  const { minDate, maxDate } = useMemo(() => {
    if (!sortedTasks.length) return { minDate: null, maxDate: null };
    let min = new Date(sortedTasks[0].start_date || sortedTasks[0].created_at);
    let max = new Date(sortedTasks[0].end_date || sortedTasks[0].created_at);
    sortedTasks.forEach((t) => {
      const s = new Date(t.start_date || t.created_at);
      const e = new Date(t.end_date || t.created_at);
      if (s < min) min = s;
      if (e > max) max = e;
    });
    return { minDate: new Date(min.setDate(min.getDate() - 2)), maxDate: new Date(max.setDate(max.getDate() + 2)) };
  }, [sortedTasks]);

  const [selectedScopeTask, setSelectedScopeTask] = useState(null);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Canonical Standard Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/90 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1.5 text-xs font-semibold shadow-2xs cursor-pointer"
            title="Return to previous page"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#0E3646] text-white flex items-center justify-center shadow-xs">
                <Flag size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Project Milestones
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-normal uppercase bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                Phase Gates &amp; Key Deliverables
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Track, schedule, and verify critical project phase gates, key deliverables, and target milestone completion dates.
            </p>
          </div>
        </div>

        {/* Project Selector & Action Suite */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
          {/* Project Picker Dropdown */}
          <div className="min-w-[220px]">
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSearchParams({ project_id: e.target.value });
              }}
              className="w-full h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-2xs cursor-pointer"
            >
              <option value="">-- Select Project --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_code ? `[${p.project_code}] ` : ""}{p.project_name || p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Create Manual Milestone */}
          <button
            type="button"
            disabled={!selectedProjectId}
            onClick={handleOpenCreateModal}
            className="px-3.5 py-2 rounded-xl bg-[#0E3646] hover:bg-[#164356] text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Plus size={14} />
            <span>New Milestone</span>
          </button>
        </div>
      </div>

      {/* ── Main View Content ── */}
      {fetchingMilestones ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 size={36} className="animate-spin text-brand-600" />
          <span className="text-xs text-slate-400 font-normal">Loading project milestones &amp; schedule...</span>
        </div>
      ) : !selectedProjectId ? (
        <div className="bg-white dark:bg-slate-900 p-12 sm:p-16 text-center rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-smoky space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-[#0E3646] dark:text-brand-400 flex items-center justify-center mx-auto shadow-xs">
            <Flag size={28} />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Select a Project</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Select a project from the dropdown above to view, schedule, and track its milestone phase gates, key deliverables, and target completion dates.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── 4 Full-Width Milestone KPI Metric Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Total Milestones */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-smoky flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total</span>
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 flex items-center justify-center">
                  <Flag size={14} />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {dynamicCounts.total}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5 font-normal">Active Project Gates</span>
              </div>
            </div>

            {/* 2. Achieved */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-smoky flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Achieved</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={14} />
                </div>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                    {dynamicCounts.achieved}
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">({progressPercent}%)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden mt-1.5">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>

            {/* 3. In Progress */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-smoky flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">In Progress</span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <Clock size={14} />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                  {dynamicCounts.in_progress}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5 font-normal">Currently Executing</span>
              </div>
            </div>

            {/* 4. Overdue */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-smoky flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Overdue</span>
                <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                  <AlertTriangle size={14} />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                  {dynamicCounts.overdue}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5 font-normal">Requires Attention</span>
              </div>
            </div>
          </div>

          {/* ── Standard Milestone Register ── */}
          <div className="space-y-4">
              {/* Filter Tabs & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: "ALL", label: `All (${dynamicCounts.total})` },
                    { id: "ACHIEVED", label: `Achieved (${dynamicCounts.achieved})` },
                    { id: "IN_PROGRESS", label: `In Progress (${dynamicCounts.in_progress})` },
                    { id: "PENDING", label: `Pending (${dynamicCounts.pending})` },
                    { id: "OVERDUE", label: `Overdue (${dynamicCounts.overdue})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-3 py-1.5 text-xs font-normal rounded-xl transition cursor-pointer ${
                        statusFilter === tab.id
                          ? "bg-[#0E3646] text-white shadow-2xs"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search milestones..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-3 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 w-full sm:w-56 focus:outline-brand-600"
                  />
                </div>
              </div>

              {/* Milestone Cards Grid */}
              {filteredMilestones.length > 0 ? (
                <div className="grid grid-cols-1 gap-3.5">
                  {filteredMilestones.map((m) => {
                    const typeMeta = getMilestoneTypeMeta(m.milestone_type);
                    const mStatus = getMilestoneStatus(m);
                    const isAchieved = mStatus === "ACHIEVED";
                    const isOverdue = mStatus === "OVERDUE";
                    const isInProgress = mStatus === "IN_PROGRESS";
                    const hasTasks = (m.linked_tasks || []).length > 0;
                    const isExpanded = Boolean(expandedTasks[m.id]);
                    const execTimeWindow = getExecutionTimeWindow(m);

                    // Due countdown text
                    let dueBadgeText = "No target date";
                    let isDueOverdue = false;
                    if (m.target_date || m.due_date) {
                      const d = new Date(m.target_date || m.due_date);
                      const diff = differenceInDays(d, new Date());
                      if (isAchieved) {
                        dueBadgeText = `Achieved on ${m.completion_date ? format(new Date(m.completion_date), "MMM d, yyyy") : format(d, "MMM d, yyyy")}`;
                      } else if (diff < 0) {
                        dueBadgeText = `Overdue by ${Math.abs(diff)} day(s)`;
                        isDueOverdue = true;
                      } else if (diff === 0) {
                        dueBadgeText = "Due Today";
                      } else {
                        dueBadgeText = `Due in ${diff} day(s) (${format(d, "MMM d, yyyy")})`;
                      }
                    }

                    return (
                      <div
                        key={m.id}
                        className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border transition shadow-smoky space-y-3.5 ${
                          isAchieved
                            ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/15"
                            : isOverdue
                            ? "border-rose-200 dark:border-rose-900/60 bg-rose-50/15"
                            : "border-slate-200/90 dark:border-slate-800"
                        }`}
                      >
                        {/* Top Row: Title, Badges & Quick Status */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-normal ${
                                isAchieved
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  : isOverdue
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                  : isInProgress
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {isAchieved ? <CheckCircle2 size={18} /> : <Flag size={18} />}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                                  {m.title}
                                </h3>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-normal ${typeMeta.color}`}>
                                  {typeMeta.label}
                                </span>
                                {m.work_plan_element && (
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-normal bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    Work Plan: {m.work_plan_element}
                                  </span>
                                )}
                              </div>

                              {m.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 font-normal">
                                  {m.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Live Status Badge */}
                          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-normal uppercase ${
                                isAchieved
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : isInProgress
                                  ? "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                                  : isOverdue
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {isInProgress ? "IN PROGRESS" : mStatus}
                            </span>
                          </div>
                        </div>

                        {/* Middle Row: Target Date, Actual Execution, Tasks Progress & Inspection Sign-off */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                          {/* 1. Target Date Pill */}
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-slate-400 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-[10px] text-slate-400 block font-normal">Target Gate Date</span>
                              <span
                                className={`text-xs font-normal truncate block ${
                                  isAchieved
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : isDueOverdue
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-slate-700 dark:text-slate-200"
                                }`}
                              >
                                {dueBadgeText}
                              </span>
                            </div>
                          </div>

                          {/* 2. Actual Execution Window (Actual Start Time & Actual End Time for Achieved, In Progress, Pending, Overdue) */}
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-slate-400 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-[10px] text-slate-400 block font-normal">Actual Execution</span>
                              <span
                                className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block"
                                title={`${execTimeWindow.start} → ${execTimeWindow.end}`}
                              >
                                {execTimeWindow.start} <span className="text-slate-400 font-normal">→</span> {execTimeWindow.end}
                              </span>
                            </div>
                          </div>

                          {/* 2. Contributing Tasks Progress */}
                          <div>
                            <span className="text-[10px] text-slate-400 block font-normal">
                              Contributing Tasks ({(m.linked_tasks && m.linked_tasks.length > 0) ? m.linked_tasks.filter((t) => String(t.status || "").toUpperCase() === "COMPLETED" || Number(t.completion_percent || 0) >= 100).length : (m.completed_tasks || 0)}/{(m.linked_tasks && m.linked_tasks.length > 0) ? m.linked_tasks.length : (m.total_tasks || 0)})
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-brand-500 h-full rounded-full"
                                  style={{ width: `${m.progress_percent || 0}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-normal text-slate-600 dark:text-slate-400">
                                {m.progress_percent || 0}%
                              </span>
                            </div>
                          </div>

                          {/* 3. Formal Inspection Condition */}
                          <div className="flex items-center justify-between sm:justify-end gap-2">
                            {m.requires_inspection ? (
                              m.is_inspection_accepted ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] font-normal border border-emerald-200/80">
                                  <ShieldCheck size={13} />
                                  <span>Inspection Accepted</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setInspectingMilestone(m)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[11px] font-normal border border-amber-200/80 hover:bg-amber-100 cursor-pointer"
                                  title="Sign off formal inspection condition"
                                >
                                  <ShieldCheck size={13} />
                                  <span>Sign-off Inspection</span>
                                </button>
                              )
                            ) : (
                              <span className="text-[11px] text-slate-400 font-normal">
                                Owner: {m.owner_name || m.responsible_owner_name || "Unassigned"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom Actions Toolbar & Accordion */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                          {/* Accordion toggle for linked tasks */}
                          <div>
                            {hasTasks ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedTasks((prev) => ({
                                    ...prev,
                                    [m.id]: !prev[m.id],
                                  }))
                                }
                                className="text-[11px] font-normal text-brand-700 dark:text-brand-300 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                <span>
                                  {isExpanded ? "Hide" : "View"} {m.linked_tasks.length} contributing task(s)
                                </span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-normal">No linked sub-tasks</span>
                            )}
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-1.5">
                            {/* Toggle Achieved Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleAchieveStatus(m)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-normal transition flex items-center gap-1 cursor-pointer ${
                                isAchieved
                                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200"
                              }`}
                            >
                              <Check size={12} />
                              <span>{isAchieved ? "Reopen" : "Mark Achieved"}</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(m)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Edit Milestone"
                            >
                              <Edit2 size={13} />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmMilestone(m)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="Delete Milestone"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Linked Tasks Expanded Drawer */}
                        {isExpanded && hasTasks && (
                          <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 space-y-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                              Contributing Work Packages &amp; Deliverables
                            </span>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                              {m.linked_tasks.map((task) => (
                                <div
                                  key={task.task_id || task.id}
                                  className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                >
                                  <div className="min-w-0 pr-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-[10px] font-normal px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                                        WBS: {task.wbs_code || "1.0"}
                                      </span>
                                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                        {task.task_title}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-1">
                                      <span>Assigned: {task.assigned_to_name || "Unassigned"}</span>
                                      <span>
                                        Target: {task.start_date ? format(new Date(task.start_date), "MMM d") : "—"} →{" "}
                                        {task.end_date ? format(new Date(task.end_date), "MMM d, yyyy") : "—"}
                                      </span>
                                      <span className="font-medium text-slate-600 dark:text-slate-300">
                                        Actual:{" "}
                                        {formatDateTimeDisplay(task.actual_start_date || task.start_date, "08:00 AM") || "—"}{" → "}
                                        {formatDateTimeDisplay(task.actual_end_date || task.end_date, "05:00 PM") || "—"}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                                    <span
                                      className={`text-[10px] font-normal px-2 py-0.5 rounded uppercase ${
                                        task.task_status === "COMPLETED"
                                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                          : task.task_status === "IN_PROGRESS"
                                          ? "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                      }`}
                                    >
                                      {task.task_status || "PENDING"} ({task.completion_percent || 0}%)
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenTaskEdit(task)}
                                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                                      title="Edit Target & Actual Dates"
                                    >
                                      <Edit2 size={11} />
                                      <span>Edit Dates</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-smoky space-y-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <Flag size={20} />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    No Project Milestones Found
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto font-normal">
                    {searchQuery || statusFilter !== "ALL"
                      ? "No milestones matched your current filter criteria."
                      : "Create a new milestone above to track critical phase gates and target completion dates."}
                  </p>
                  {!searchQuery && statusFilter === "ALL" && (
                    <button
                      type="button"
                      onClick={() => handleOpenCreateModal()}
                      className="px-4 py-2 rounded-xl bg-[#0E3646] hover:bg-[#164356] text-white text-xs font-normal transition inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Create Milestone</span>
                    </button>
                  )}
                </div>
              )}
            </div>
        </div>
      )}

      {/* ── MODAL: Create / Edit Milestone (PM Standard Modal Orientation) ── */}
      <ProjectModal
        open={showCreateModal || Boolean(editingMilestone)}
        isOpen={showCreateModal || Boolean(editingMilestone)}
        onClose={() => {
          setShowCreateModal(false);
          setEditingMilestone(null);
        }}
        title={editingMilestone ? "Edit Project Milestone" : "Create New Project Milestone"}
        subtitle="Define critical phase gates, delivery targets, and inspection conditions."
        icon={Flag}
        maxWidth="max-w-2xl lg:max-w-3xl"
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setEditingMilestone(null);
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal hover:bg-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveMilestone}
              className="px-5 py-2 rounded-xl bg-[#0E3646] hover:bg-[#164356] text-white text-xs font-normal shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <Check size={14} />
              <span>{editingMilestone ? "Update Milestone" : "Create Milestone"}</span>
            </button>
          </div>
        }
      >
        <form onSubmit={handleSaveMilestone} className="space-y-4 text-xs">
          <div>
            <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
              Milestone Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Substructure Foundation Sign-Off"
              value={milestoneForm.title}
              onChange={(e) => setMilestoneForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-brand-600 font-normal"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                Milestone Category / Type
              </label>
              <select
                value={milestoneForm.milestone_type}
                onChange={(e) => setMilestoneForm((prev) => ({ ...prev, milestone_type: e.target.value }))}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-normal text-slate-700 dark:text-slate-200"
              >
                {MILESTONE_TYPES.map((t) => (
                  <option key={t.value} value={t.value} className="font-normal">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                Target Completion Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={milestoneForm.target_date}
                onChange={(e) => setMilestoneForm((prev) => ({ ...prev, target_date: e.target.value }))}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-normal text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Actual Execution Dates (Pre-populated from system captured dates) */}
          <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                Actual Execution Dates
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 font-normal">
                Pre-populated with system captured dates
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                  Actual Start Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={milestoneForm.actual_start_date || ""}
                  onChange={(e) => setMilestoneForm((prev) => ({ ...prev, actual_start_date: e.target.value }))}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-normal text-slate-700 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                  Actual End Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={milestoneForm.actual_end_date || ""}
                  onChange={(e) => setMilestoneForm((prev) => ({ ...prev, actual_end_date: e.target.value }))}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-normal text-slate-700 dark:text-slate-200"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                Responsible Owner
              </label>
              <select
                value={String(milestoneForm.responsible_owner_id || "")}
                onChange={(e) => {
                  const id = e.target.value;
                  const u = Array.isArray(users) ? users.find((x) => String(x.id) === String(id)) : null;
                  setMilestoneForm((prev) => ({
                    ...prev,
                    responsible_owner_id: id,
                    responsible_owner_name: u?.full_name || u?.name || "",
                  }));
                }}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-normal text-slate-700 dark:text-slate-200"
              >
                <option value="" className="font-normal">-- Assign Owner --</option>
                {milestoneForm.responsible_owner_id && !users.some(u => String(u.id) === String(milestoneForm.responsible_owner_id)) && (
                  <option value={String(milestoneForm.responsible_owner_id)} className="font-normal">
                    {milestoneForm.responsible_owner_name || `User #${milestoneForm.responsible_owner_id}`} (Assigned to Task)
                  </option>
                )}
                {(Array.isArray(users) ? users : []).map((u) => (
                  <option key={u.id} value={String(u.id)} className="font-normal">
                    {u.full_name || u.name || u.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                Associated Work Plan Scope
              </label>
              <input
                type="text"
                placeholder="e.g. Work Plan/WBS: 1.3"
                value={milestoneForm.work_plan_element || ""}
                onChange={(e) => setMilestoneForm((prev) => ({ ...prev, work_plan_element: e.target.value }))}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-normal text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
              Description &amp; Acceptance Conditions
            </label>
            <textarea
              rows={2}
              placeholder="Describe verification deliverables or conditions for completion..."
              value={milestoneForm.description}
              onChange={(e) => setMilestoneForm((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-normal text-slate-700 dark:text-slate-200"
            />
          </div>

          {/* Inspection Checkbox */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
                Requires Quality / Inspection Sign-off
              </span>
              <span className="text-[10px] text-slate-400 font-normal block">
                Requires formal QA sign-off before marking this milestone as completed.
              </span>
            </div>
            <input
              type="checkbox"
              checked={milestoneForm.requires_inspection}
              onChange={(e) => setMilestoneForm((prev) => ({ ...prev, requires_inspection: e.target.checked }))}
              className="w-4 h-4 rounded text-brand-600 cursor-pointer"
            />
          </div>

          {/* Completed Task Deliverables Checklist Field (Auto-linked from task) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <CheckSquare size={13} className="text-emerald-600" />
                <span>Completed Task Deliverables &amp; Checklist ({activeTaskChecklist.length})</span>
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 font-normal flex items-center gap-1">
                <CheckCircle2 size={11} className="text-emerald-500" />
                <span>100% Completed</span>
              </span>
            </div>

            <div className="max-h-40 overflow-y-auto p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1.5">
              {activeTaskChecklist.length > 0 ? (
                activeTaskChecklist.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex items-start gap-2.5 p-2 rounded-lg bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-750 text-xs shadow-2xs"
                  >
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-normal text-slate-800 dark:text-slate-200 leading-snug block">
                        {item.text}
                      </span>
                      {item.note && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5 italic">
                          Verification note: {item.note}
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-normal text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/50 shrink-0">
                      <Check size={10} /> Completed
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-slate-400 text-xs font-normal">
                  All task scope checklist items have been marked complete and verified.
                </div>
              )}
            </div>
          </div>
        </form>
      </ProjectModal>

      {/* ── MODAL: Inspection Sign-off ── */}
      {inspectingMilestone && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Inspection Verification Sign-Off
                </h4>
                <p className="text-[11px] text-slate-400 font-normal">
                  Target: {inspectingMilestone.title}
                </p>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                Inspection Sign-off Notes / Test Results
              </label>
              <textarea
                id="inspection-notes-input"
                rows={3}
                placeholder="e.g. Geotechnical soil compaction verified. Concrete cylinder 28-day break tests passed standards."
                defaultValue={inspectingMilestone.inspection_notes || ""}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-normal text-slate-800 dark:text-white focus:outline-brand-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setInspectingMilestone(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("inspection-notes-input");
                  handleSaveInspectionSignoff(el?.value || "Inspection condition formally accepted.");
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-normal shadow-sm cursor-pointer"
              >
                Confirm Sign-Off
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Delete Confirmation ── */}
      {deleteConfirmMilestone && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Delete Milestone
                </h4>
                <p className="text-[11px] text-slate-400 font-normal">Irreversible action</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-normal">
              Are you sure you want to delete <span className="font-semibold">"{deleteConfirmMilestone.title}"</span>? This will unbind any linked task gate associations.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmMilestone(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-normal hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMilestone}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-normal shadow-sm cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Edit Task Target & Actual Dates (From Milestone Page) ── */}
      {editingTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="min-w-0 pr-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                  Edit Task Schedule &amp; Actual Dates
                </h3>
                <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                  {editingTask.task_title || "Contributing Sub-task"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveTaskDates} className="space-y-3.5 text-xs">
              {/* Target / Scheduled Dates */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Target / Scheduled Window
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                      Target Start Date
                    </label>
                    <input
                      type="date"
                      value={taskForm.start_date || ""}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, start_date: e.target.value }))}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                      Target Due Date
                    </label>
                    <input
                      type="date"
                      value={taskForm.end_date || ""}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, end_date: e.target.value }))}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Actual Execution Recorded Dates */}
              <div className="p-3 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 block">
                  Actual Execution Dates (Time Started &amp; Ended)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                      Actual Start Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      value={taskForm.actual_start_date || ""}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, actual_start_date: e.target.value }))}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                      Actual End Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      value={taskForm.actual_end_date || ""}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, actual_end_date: e.target.value }))}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Status & Completion Slider */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                    Task Status
                  </label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => {
                      const nextSt = e.target.value;
                      setTaskForm((prev) => ({
                        ...prev,
                        status: nextSt,
                        actual_start_date:
                          nextSt === "IN_PROGRESS" && !prev.actual_start_date
                            ? new Date().toISOString().slice(0, 16)
                            : prev.actual_start_date,
                        actual_end_date:
                          nextSt === "COMPLETED"
                            ? prev.actual_end_date || new Date().toISOString().slice(0, 16)
                            : nextSt === "PENDING"
                            ? ""
                            : prev.actual_end_date,
                        completion_percent: nextSt === "COMPLETED" ? 100 : prev.completion_percent,
                      }));
                    }}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="BLOCKED">BLOCKED</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                    Completion ({taskForm.completion_percent}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={taskForm.completion_percent}
                    onChange={(e) => {
                      const pct = Number(e.target.value);
                      setTaskForm((prev) => ({
                        ...prev,
                        completion_percent: pct,
                        status: pct >= 100 ? "COMPLETED" : pct > 0 ? "IN_PROGRESS" : prev.status,
                        actual_end_date:
                          pct >= 100
                            ? prev.actual_end_date || new Date().toISOString().slice(0, 16)
                            : prev.actual_end_date,
                      }));
                    }}
                    className="w-full mt-2 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0E3646] hover:bg-[#164356] text-white text-xs font-semibold shadow-sm cursor-pointer"
                >
                  Save Task Dates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
