/**
 * @fileoverview TaskExecution component.
 * Concise, enterprise-grade task execution workspace for OmniSuite ERP.
 * Features:
 * - High-density master-detail task execution workspace.
 * - Concise command header with Project, Scope & WBS breadcrumbs, priority, and overdue indicators.
 * - Modern executive radial progress ring replacing the automotive gauge.
 * - Interactive deliverables checklist with inline verification notes, fast toggle, and add/delete actions.
 * - Streamlined 2-column execution split for Task Notes and Reason for Delay Log (no excessive scrolling).
 * - Direct status update controls and exceptional-permission task reassignment.
 */

import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";
import { useAuth } from "@/auth/AuthContext.jsx";
import { usePermission } from "@/auth/PermissionContext.jsx";
import DocumentAttachmentsModal from "@/components/attachments/DocumentAttachmentsModal.jsx";
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Save,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  Loader2,
  ListTodo,
  Paperclip,
  Lock,
  UserCheck,
  X,
  ChevronRight,
  MousePointerClick,
  ArrowLeft,
  MessageSquare,
  ChevronDown,
  Brain,
  Search,
  Layers,
  FolderGit2,
  Check,
  PlayCircle,
  Sparkles,
  ExternalLink,
  Flag,
  ShieldCheck,
  CheckSquare,
} from "lucide-react";
import ProjectModal from "../components/ProjectModal.jsx";
import CarOdometerGauge from "@/components/CarOdometerGauge.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// Milestone Constants & Date Helpers
// ─────────────────────────────────────────────────────────────────────────────
const MILESTONE_TYPES = [
  { value: "TASK_COMPLETION", label: "Task completion" },
  { value: "PHASE_COMPLETION", label: "Phase Completion Gate" },
  { value: "PRACTICAL_COMPLETION", label: "Practical Handover" },
  { value: "QUALITY_INSPECTION", label: "Quality / Inspection Sign-off" },
  { value: "CONTRACTUAL", label: "Contractual Commitment" },
  { value: "PAYMENT_GATE", label: "Commercial / Billing Gate" },
  { value: "LIFECYCLE", label: "Project Lifecycle Gate" },
];

const toDateTimeLocal = (dateVal, defaultTime = "08:00") => {
  if (!dateVal) return "";
  const s = String(dateVal).trim();
  if (s.includes("T")) {
    return s.slice(0, 16);
  }
  if (s.length === 10) {
    return `${s}T${defaultTime}`;
  }
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  } catch {}
  return s.slice(0, 16);
};

const formatDisplayDate = (dateVal) => {
  if (!dateVal) return "Not set";
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    }
  } catch {}
  return String(dateVal).slice(0, 10);
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component: TaskExecution
// ─────────────────────────────────────────────────────────────────────────────
export default function TaskExecution() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasExceptional } = usePermission();
  const [searchParams] = useSearchParams();
  const queryTaskId = searchParams.get("taskId");
  const isSingleTaskMode = Boolean(queryTaskId);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(() =>
    queryTaskId ? Number(queryTaskId) : null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [showAttach, setShowAttach] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Reassignment state
  const [usersList, setUsersList] = useState([]);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignUserId, setReassignUserId] = useState("");
  const [reassigning, setReassigning] = useState(false);

  // Scope Checklist & Deliverables state
  const [checklistItems, setChecklistItems] = useState([]);
  const [delayReasons, setDelayReasons] = useState([""]);
  const [taskCompletionPercent, setTaskCompletionPercent] = useState(0);
  const [taskNotes, setTaskNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [expandedNoteIdx, setExpandedNoteIdx] = useState(null);
  const [wbsNameMap, setWbsNameMap] = useState({});

  // Inline add deliverable state
  const [showAddDeliverable, setShowAddDeliverable] = useState(false);
  const [newDeliverableText, setNewDeliverableText] = useState("");

  // Exceptional Permission check for task reassignment
  const canReassignTask = Boolean(
    user?.is_super_admin ||
      user?.role === "ADMIN" ||
      user?.role === "SUPER_ADMIN" ||
      user?.id === 1 ||
      hasExceptional("TASK.REASSIGN") ||
      hasExceptional("PM.TASK.REASSIGN") ||
      hasExceptional("TASK.REASSIGN_TASK")
  );

  // Load users for reassignment dropdown
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await api.get("/admin/users");
        const u = res?.data?.data?.items || res?.data?.items || res?.data?.users || [];
        setUsersList(u);
      } catch {}
    }
    loadUsers();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/projects/tasks");
      const items = res.data?.items || [];

      const currentUserId = user?.id || user?.sub;
      const currentUsername = String(user?.username || "").toLowerCase();
      const isAdmin = Boolean(
        user?.is_super_admin ||
          user?.role === "ADMIN" ||
          user?.role === "SUPER_ADMIN" ||
          user?.id === 1
      );

      // Strict Assignee Filtering: Tasks assigned to current user (unless admin)
      let assignedTasks = isAdmin
        ? items
        : items.filter((t) => {
            const matchId = currentUserId && String(t.assigned_to_id) === String(currentUserId);
            const matchName =
              currentUsername && String(t.assigned_to_name || "").toLowerCase() === currentUsername;
            return matchId || matchName;
          });

      // If queryTaskId is specified, ensure that task is included
      if (queryTaskId) {
        const targetId = Number(queryTaskId);
        const alreadyIn = assignedTasks.find((t) => t.id === targetId);
        if (!alreadyIn) {
          const fromAll = items.find((t) => t.id === targetId);
          if (fromAll) {
            assignedTasks = [fromAll, ...assignedTasks];
          } else {
            try {
              const singleRes = await api.get(`/projects/tasks/${targetId}`);
              const singleItem = singleRes.data?.item || singleRes.data;
              if (singleItem && singleItem.id) {
                assignedTasks = [singleItem, ...assignedTasks];
              }
            } catch {}
          }
        }
      }

      setTasks(assignedTasks);

      // Prepopulate WBS Names immediately from project_scopes & scope_names
      const initialWbsMap = {};
      items.forEach((t) => {
        if (t.project_id && t.wbs_code) {
          const key = `${t.project_id}_${t.wbs_code}`;
          if (!initialWbsMap[key]) {
            let resolved = t.wbs_name || t.work_package_name || t.package_name || "";
            if (!resolved && t.project_scopes) {
              let scList = t.project_scopes;
              if (typeof scList === "string") {
                try {
                  scList = JSON.parse(scList);
                } catch {
                  scList = [];
                }
              }
              if (Array.isArray(scList)) {
                const target = String(t.wbs_code).trim();
                for (const sc of scList) {
                  const scWbs = String(sc.wbs || sc.wbs_code || "").trim();
                  if (scWbs && (scWbs === target || target.startsWith(scWbs) || scWbs.startsWith(target))) {
                    resolved = sc.name || sc.title || sc.scope_name || "";
                    if (resolved) break;
                  }
                  if (Array.isArray(sc.wbs_list)) {
                    const matched = sc.wbs_list.find(
                      (w) => String(w.wbs || w.wbs_code || "").trim() === target
                    );
                    if (matched) {
                      resolved = matched.name || matched.title || matched.wbs_name || "";
                      if (resolved) break;
                    }
                  }
                }
              }
            }
            if (!resolved && t.scope_name) {
              resolved = t.scope_name;
            }
            if (resolved) {
              initialWbsMap[key] = resolved;
            }
          }
        }
      });
      if (Object.keys(initialWbsMap).length > 0) {
        setWbsNameMap((prev) => ({ ...initialWbsMap, ...prev }));
      }
    } catch {
      toast.error("Failed to load tasks for execution");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user?.id, user?.username, queryTaskId]);

  const selectedTask = useMemo(() => {
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  // Auto-select task when navigated with ?taskId=... or default to first available
  useEffect(() => {
    if (tasks.length > 0 && !selectedTaskId) {
      if (queryTaskId) {
        const targetId = Number(queryTaskId);
        const found = tasks.find((t) => t.id === targetId);
        if (found) {
          setSelectedTaskId(targetId);
          const st = String(found.status || "").toUpperCase();
          if (st === "COMPLETED" || st === "DONE" || Number(found.completion_percent || 0) >= 100) {
            setStatusFilter("COMPLETED");
          } else if (st === "IN_PROGRESS" || st === "IN PROGRESS") {
            setStatusFilter("IN_PROGRESS");
          } else if (st === "BLOCKED") {
            setStatusFilter("BLOCKED");
          } else {
            setStatusFilter("PENDING");
          }
          return;
        }
      }
      // Default: select first available task so workbench is active
      setSelectedTaskId(tasks[0].id);
      const firstSt = String(tasks[0].status || "").toUpperCase();
      if (firstSt === "IN_PROGRESS" || firstSt === "IN PROGRESS") setStatusFilter("IN_PROGRESS");
      else if (firstSt === "COMPLETED" || firstSt === "DONE") setStatusFilter("COMPLETED");
      else if (firstSt === "BLOCKED") setStatusFilter("BLOCKED");
      else setStatusFilter("PENDING");
    }
  }, [queryTaskId, tasks, selectedTaskId]);

  // Resolve WBS Name from project scopes or work packages if not already present
  useEffect(() => {
    if (!selectedTask?.project_id || !selectedTask?.wbs_code) return;
    const wbsKey = `${selectedTask.project_id}_${selectedTask.wbs_code}`;
    if (wbsNameMap[wbsKey] !== undefined) return;

    let isMounted = true;
    const targetCode = String(selectedTask.wbs_code).trim();
    const fallbackName =
      selectedTask.wbs_name ||
      selectedTask.work_package_name ||
      selectedTask.package_name ||
      selectedTask.scope_name ||
      "";

    const fetchWbsDetail = async () => {
      try {
        let foundName = fallbackName;

        // 1. Fetch project scopes
        const res = await api.get(`/projects/projects/${selectedTask.project_id}`);
        const project = res.data?.item || res.data?.project || res.data;
        let scopes = project?.project_scopes;
        if (typeof scopes === "string") {
          try {
            scopes = JSON.parse(scopes);
          } catch {
            scopes = [];
          }
        }
        if (Array.isArray(scopes)) {
          for (const s of scopes) {
            const sWbs = String(s.wbs || s.wbs_code || s.code || "").trim();
            if (sWbs && (sWbs === targetCode || targetCode.startsWith(sWbs) || sWbs.startsWith(targetCode))) {
              foundName = s.name || s.title || s.scope_name || s.package_name || "";
              if (foundName) break;
            }
            if (Array.isArray(s.wbs_list)) {
              const matched = s.wbs_list.find((w) => {
                const code = String(w.wbs || w.wbs_code || "").trim();
                return code === targetCode || code.startsWith(targetCode);
              });
              if (matched) {
                foundName = matched.name || matched.title || matched.wbs_name || matched.package_name || "";
                if (!foundName && matched.wbs && String(matched.wbs).trim() !== targetCode) {
                  foundName = String(matched.wbs)
                    .replace(new RegExp(`^${targetCode}\\s*[-:.]?\\s*`, "i"), "")
                    .trim();
                }
                if (foundName) break;
              }
            }
          }
        }

        // 2. Fetch work packages if still not found
        if (!foundName) {
          try {
            const wpRes = await api.get(`/construction/work-packages?project_id=${selectedTask.project_id}`);
            const wps = wpRes.data?.items || [];
            const wpMatch = wps.find((w) => {
              const code = String(w.wbs_code || w.code || "").trim();
              return code === targetCode || (selectedTask.work_package_id && w.id === selectedTask.work_package_id);
            });
            if (wpMatch) {
              foundName = wpMatch.package_name || wpMatch.name || "";
            }
          } catch {}
        }

        if (!foundName && selectedTask.scope_name) {
          foundName = selectedTask.scope_name;
        }

        if (isMounted) {
          setWbsNameMap((prev) => ({ ...prev, [wbsKey]: foundName }));
        }
      } catch {
        if (isMounted) {
          setWbsNameMap((prev) => ({ ...prev, [wbsKey]: fallbackName }));
        }
      }
    };

    fetchWbsDetail();

    return () => {
      isMounted = false;
    };
  }, [selectedTask?.project_id, selectedTask?.wbs_code, selectedTask?.scope_name, selectedTask?.work_package_name, wbsNameMap]);

  // Derived resolved real name of WBS for currently selected task
  const resolvedWbsName = useMemo(() => {
    if (!selectedTask) return "";
    const key = `${selectedTask.project_id}_${selectedTask.wbs_code}`;
    return (
      wbsNameMap[key] ||
      selectedTask.wbs_name ||
      selectedTask.work_package_name ||
      selectedTask.package_name ||
      selectedTask.scope_name ||
      ""
    );
  }, [selectedTask, wbsNameMap]);
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleTabClick = (newStatus) => {
    if (statusFilter === newStatus && isDropdownOpen) {
      setIsDropdownOpen(false);
    } else {
      setStatusFilter(newStatus);
      setIsDropdownOpen(true);
    }
  };

  // Overall task stats for summary pills
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === "PENDING").length;
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const completed = tasks.filter(
      (t) => Number(t.completion_percent || 0) >= 100 || t.status === "COMPLETED"
    ).length;
    const blocked = tasks.filter((t) => t.status === "BLOCKED").length;
    return { total, pending, inProgress, completed, blocked };
  }, [tasks]);

  // Filtered tasks list
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        (t.task_title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.project_name || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchTerm, statusFilter]);

  const handleStatusFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
    setSelectedTaskId(null);
  };



  // Check if Reason for Delay Log is required (Overdue or Due tasks)
  const isDelayReasonRequired = useMemo(() => {
    if (!selectedTask) return false;
    const dueStatus = String(selectedTask.due_status || "").toUpperCase();
    const dueLabel = String(selectedTask.due_label || "").toUpperCase();
    const status = String(selectedTask.status || "").toUpperCase();

    if (
      dueStatus.includes("OVERDUE") ||
      dueStatus.includes("DUE_TODAY") ||
      dueLabel.includes("OVERDUE") ||
      dueLabel.includes("DUE TODAY") ||
      dueLabel.includes("DUE") ||
      status.includes("OVERDUE")
    ) {
      return true;
    }

    if (selectedTask.end_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(selectedTask.end_date.split("T")[0]);
      if (dueDate <= today) {
        return true;
      }
    }

    return false;
  }, [selectedTask]);

  // Initialize Scope Checklist/Deliverables Items & delay reasons for selectedTask
  useEffect(() => {
    if (!selectedTask) {
      setChecklistItems([]);
      setDelayReasons([""]);
      setTaskCompletionPercent(0);
      return;
    }

    let parsedChecklist = [];
    if (selectedTask.task_description) {
      try {
        const raw = String(selectedTask.task_description).trim();
        if (raw.startsWith("[") && raw.endsWith("]")) {
          const jsonArr = JSON.parse(raw);
          if (Array.isArray(jsonArr)) {
            parsedChecklist = jsonArr.map((item, idx) => {
              if (typeof item === "object" && item !== null) {
                return {
                  id: item.id || idx + 1,
                  text: item.text || item.label || "",
                  completed: Boolean(item.completed),
                  note: item.note || "",
                };
              }
              return { id: idx + 1, text: String(item), completed: false, note: "" };
            });
          }
        } else if (raw) {
          parsedChecklist = raw
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s, idx) => ({ id: idx + 1, text: s, completed: false, note: "" }));
        }
      } catch {
        parsedChecklist = [{ id: 1, text: selectedTask.task_description, completed: false, note: "" }];
      }
    }

    setChecklistItems(parsedChecklist);

    const completedCount = parsedChecklist.filter((i) => Boolean(i.completed)).length;
    const totalCount = parsedChecklist.length;
    const calcPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const dbPct = Number(selectedTask.completion_percent || 0);
    const finalPct = totalCount > 0 ? calcPct : dbPct;

    setTaskCompletionPercent(finalPct);

    let parsedDelays = [""];
    if (selectedTask.reason_for_delay) {
      try {
        const raw = String(selectedTask.reason_for_delay).trim();
        if (raw.startsWith("[") && raw.endsWith("]")) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr) && arr.length > 0) {
            parsedDelays = arr.map(String);
          }
        } else if (raw) {
          parsedDelays = raw.split("\n").map((s) => s.trim()).filter(Boolean);
        }
      } catch {
        parsedDelays = [selectedTask.reason_for_delay];
      }
    }
    if (parsedDelays.length === 0) parsedDelays = [""];
    setDelayReasons(parsedDelays);

    setTaskNotes(selectedTask.notes || selectedTask.task_notes || "");
    setExpandedNoteIdx(null);
    setShowAddDeliverable(false);
    setNewDeliverableText("");
  }, [selectedTask]);

  // Toggle item completion in checklist
  const handleToggleChecklist = async (index) => {
    if (!selectedTask) return;

    const updatedChecklist = checklistItems.map((item, i) =>
      i === index ? { ...item, completed: !item.completed } : item
    );

    setChecklistItems(updatedChecklist);

    const completedCount = updatedChecklist.filter((i) => Boolean(i.completed)).length;
    const totalCount = updatedChecklist.length;
    const newPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    setTaskCompletionPercent(newPercent);
    const newStatus = newPercent >= 100 ? "COMPLETED" : newPercent > 0 ? "IN_PROGRESS" : "PENDING";
    const jsonDescription = JSON.stringify(updatedChecklist);

    setTasks((prev) =>
      prev.map((t) =>
        t.id === selectedTask.id
          ? {
              ...t,
              completion_percent: newPercent,
              status: newStatus,
              task_description: jsonDescription,
            }
          : t
      )
    );

    try {
      await api.put(`/projects/tasks/${selectedTask.id}`, {
        task_description: jsonDescription,
        completion_percent: newPercent,
        status: newStatus,
      });
      toast.success(
        `Deliverable updated (${completedCount}/${totalCount} - ${newPercent}%)`
      );

      // Automatically display milestone form page/modal when checklist is marked until completed
      if (completedCount === totalCount && totalCount > 0) {
        openMilestoneFormForTask({
          ...selectedTask,
          status: newStatus,
          completion_percent: newPercent,
          task_description: jsonDescription,
        }, updatedChecklist);
      }
    } catch {
      toast.error("Failed to save deliverable update");
    }
  };

  // Add new deliverable item inline
  const handleAddChecklistItem = async () => {
    if (!newDeliverableText.trim() || !selectedTask) return;
    const newItem = {
      id: Date.now(),
      text: newDeliverableText.trim(),
      completed: false,
      note: "",
    };
    const updated = [...checklistItems, newItem];
    setChecklistItems(updated);
    setNewDeliverableText("");
    setShowAddDeliverable(false);

    const completedCount = updated.filter((i) => Boolean(i.completed)).length;
    const totalCount = updated.length;
    const newPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    setTaskCompletionPercent(newPercent);
    const jsonDescription = JSON.stringify(updated);

    try {
      await api.put(`/projects/tasks/${selectedTask.id}`, {
        task_description: jsonDescription,
        completion_percent: newPercent,
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTask.id
            ? { ...t, task_description: jsonDescription, completion_percent: newPercent }
            : t
        )
      );
      toast.success("New deliverable item added");
    } catch {
      toast.error("Failed to add deliverable");
    }
  };

  // Delete a deliverable item
  const handleDeleteChecklistItem = async (index, e) => {
    e?.stopPropagation?.();
    if (!selectedTask) return;
    const updated = checklistItems.filter((_, i) => i !== index);
    setChecklistItems(updated);

    const completedCount = updated.filter((i) => Boolean(i.completed)).length;
    const totalCount = updated.length;
    const newPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    setTaskCompletionPercent(newPercent);
    const jsonDescription = JSON.stringify(updated);

    try {
      await api.put(`/projects/tasks/${selectedTask.id}`, {
        task_description: jsonDescription,
        completion_percent: newPercent,
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTask.id
            ? { ...t, task_description: jsonDescription, completion_percent: newPercent }
            : t
        )
      );
      toast.success("Deliverable removed");
    } catch {
      toast.error("Failed to remove deliverable");
    }
  };

  // Update deliverable item note
  const handleNoteChange = (index, value) => {
    const updated = checklistItems.map((item, i) =>
      i === index ? { ...item, note: value } : item
    );
    setChecklistItems(updated);
  };

  const handleSaveChecklistNote = async (index) => {
    if (!selectedTask) return;
    const updated = checklistItems.map((item, i) =>
      i === index ? { ...item } : item
    );
    const targetItem = updated[index];
    const jsonDescription = JSON.stringify(updated);
    try {
      await api.put(`/projects/tasks/${selectedTask.id}`, {
        task_description: jsonDescription,
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTask.id ? { ...t, task_description: jsonDescription } : t
        )
      );
      toast.success("Checklist comment saved");

      // Automatically post to project group chat if note is not empty
      if (targetItem?.note && targetItem.note.trim() && selectedTask.project_id) {
        api.post("/chat/project-task-update", {
          project_id: selectedTask.project_id,
          task_id: selectedTask.id,
          task_title: selectedTask.task_title,
          category: "CHECKLIST_COMMENT",
          item_number: index + 1,
          item_text: targetItem.text,
          content: targetItem.note.trim(),
        }).catch((err) => console.warn("Failed to post comment to project group chat:", err));
      }
    } catch {
      toast.error("Failed to save note");
    }
  };

  // Save general task notes
  const handleSaveNotes = async () => {
    if (!selectedTask) return;
    setSavingNotes(true);
    try {
      await api.put(`/projects/tasks/${selectedTask.id}`, {
        notes: taskNotes,
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTask.id ? { ...t, notes: taskNotes } : t
        )
      );
      toast.success("Task execution notes saved");

      // Automatically post to project group chat if notes not empty
      if (taskNotes && taskNotes.trim() && selectedTask.project_id) {
        api.post("/chat/project-task-update", {
          project_id: selectedTask.project_id,
          task_id: selectedTask.id,
          task_title: selectedTask.task_title,
          category: "TASK_NOTE",
          content: taskNotes.trim(),
        }).catch((err) => console.warn("Failed to post task note to project group chat:", err));
      }
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  // Dates edit modal state
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [datesForm, setDatesForm] = useState({
    start_date: "",
    end_date: "",
    actual_start_date: "",
    actual_end_date: "",
  });

  const handleOpenDatesModal = () => {
    if (!selectedTask) return;
    setDatesForm({
      start_date: selectedTask.start_date ? String(selectedTask.start_date).split("T")[0] : "",
      end_date: selectedTask.end_date ? String(selectedTask.end_date).split("T")[0] : "",
      actual_start_date: selectedTask.actual_start_date ? String(selectedTask.actual_start_date).slice(0, 16) : "",
      actual_end_date: selectedTask.actual_end_date ? String(selectedTask.actual_end_date).slice(0, 16) : "",
    });
    setShowDatesModal(true);
  };

  const handleSaveDates = async (e) => {
    if (e) e.preventDefault();
    if (!selectedTask) return;
    try {
      const payload = {
        start_date: datesForm.start_date || null,
        end_date: datesForm.end_date || null,
        actual_start_date: datesForm.actual_start_date || null,
        actual_end_date: datesForm.actual_end_date || null,
      };
      await api.put(`/projects/tasks/${selectedTask.id}`, payload);
      setTasks((prev) =>
        prev.map((t) => (t.id === selectedTask.id ? { ...t, ...payload } : t))
      );
      setSelectedTask((prev) => ({ ...prev, ...payload }));
      setShowDatesModal(false);
      toast.success("Target & actual dates updated successfully!");
    } catch {
      toast.error("Failed to update dates");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Milestone Completion Form Modal State & Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [savingMilestone, setSavingMilestone] = useState(false);
  const [activeMilestoneId, setActiveMilestoneId] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({
    title: "",
    description: "",
    milestone_type: "TASK_COMPLETION",
    target_date: "",
    system_start_date: "",
    system_end_date: "",
    actual_start_date: "",
    actual_end_date: "",
    status: "ACHIEVED",
    work_plan_element: "",
    responsible_owner_id: "",
    responsible_owner_name: "",
    requires_inspection: false,
    inspection_notes: "",
    remarks: "",
  });

  const openMilestoneFormForTask = async (task, currentChecklist = checklistItems) => {
    if (!task) return;

    const nowIso = new Date().toISOString();
    // System captured start date: task actual start, or task planned start, or now
    const sysStartRaw = task.actual_start_date || task.start_date || nowIso;
    const sysStart = toDateTimeLocal(sysStartRaw, "08:00");

    // System captured end date: task actual end, or task planned end / now
    const sysEndRaw = task.actual_end_date || nowIso;
    const sysEnd = toDateTimeLocal(sysEndRaw, "17:00");

    // Target completion date set when task was created
    const targetCompletionDate = task.end_date
      ? String(task.end_date).split("T")[0]
      : String(nowIso).split("T")[0];

    const taskTitle = task.task_title || task.title || "Task";
    const defaultTitle = `${taskTitle} sign-off`;

    let milestoneId = null;
    let linkedM = null;
    // Milestone title MUST be "${taskTitle} sign-off" even if it's the last task in the project, NOT project completion and handover!
    const title = defaultTitle;
    let desc = `Deliverable verification and milestone sign-off for task: ${taskTitle}.`;
    const mType = "TASK_COMPLETION";
    let actualStart = sysStart;
    let actualEnd = sysEnd;
    let requiresInspection = false;
    let inspectionNotes = "";
    let remarks = `All checklist deliverables completed (100%). System captured start date: ${formatDisplayDate(sysStartRaw)}, end date: ${formatDisplayDate(sysEndRaw)}.`;

    try {
      if (task.project_id) {
        const res = await api.get(`/construction/projects/${task.project_id}/milestones`);
        const items = res.data?.items || [];
        // Only link to an existing milestone if it is specifically for THIS task sign-off
        // (Do NOT hijack project-wide milestones like "Project Practical Completion & Handover"!)
        linkedM = items.find((m) =>
          String(m.title || "").toLowerCase().trim() === defaultTitle.toLowerCase().trim() ||
          String(m.title || "").toLowerCase().includes(`${taskTitle.toLowerCase()} sign-off`)
        ) || items.find((m) =>
          m.milestone_type === "TASK_COMPLETION" &&
          (m.linked_tasks || []).length === 1 &&
          (m.linked_tasks || []).some((lt) => Number(lt.task_id || lt.id) === Number(task.id))
        );

        if (linkedM) {
          milestoneId = linkedM.id;
          if (linkedM.actual_start_date) {
            actualStart = toDateTimeLocal(linkedM.actual_start_date, "08:00");
          }
          if (linkedM.actual_end_date) {
            actualEnd = toDateTimeLocal(linkedM.actual_end_date, "17:00");
          }
          requiresInspection = Boolean(linkedM.requires_inspection);
          inspectionNotes = linkedM.inspection_notes || "";
          if (linkedM.remarks) remarks = linkedM.remarks;
        }
      }
    } catch (err) {
      console.warn("Could not query existing milestones for task:", err);
    }

    const linkedIds = linkedM && Array.isArray(linkedM.linked_tasks) ? linkedM.linked_tasks.map((lt) => lt.task_id || lt.id) : [];

    // Resolve the full WBS name (e.g. "Substructure & Foundation", NOT just code "1.3")
    const fullWbsName =
      task.scope_name ||
      (task.project_id && task.wbs_code && wbsNameMap[`${task.project_id}_${task.wbs_code}`]) ||
      task.wbs_name ||
      task.work_package_name ||
      task.package_name ||
      task.work_plan_element ||
      (task.wbs_code ? `WBS: ${task.wbs_code}` : "");

    setActiveMilestoneId(milestoneId);
    setMilestoneForm({
      title,
      description: desc,
      milestone_type: mType,
      target_date: targetCompletionDate,
      system_start_date: formatDisplayDate(sysStartRaw),
      system_end_date: formatDisplayDate(sysEndRaw),
      actual_start_date: actualStart,
      actual_end_date: actualEnd,
      status: "ACHIEVED",
      work_plan_element: fullWbsName,
      responsible_owner_id: String(task.assigned_to_id || task.assigned_to || ""),
      responsible_owner_name: task.assigned_to_name || task.assigned_user_name || "",
      requires_inspection: requiresInspection,
      inspection_notes: inspectionNotes,
      remarks,
      linkedTaskIds: Array.from(new Set([...linkedIds, task.id])),
    });
    setShowMilestoneModal(true);
  };

  const handleSaveMilestoneFromExecution = async (e) => {
    if (e) e.preventDefault();
    if (!selectedTask) return;
    if (!milestoneForm.title.trim()) {
      toast.warning("Milestone title is required");
      return;
    }

    setSavingMilestone(true);
    try {
      const payload = {
        project_id: selectedTask.project_id,
        title: milestoneForm.title,
        description: milestoneForm.description,
        milestone_type: milestoneForm.milestone_type || "TASK_COMPLETION",
        target_date: milestoneForm.target_date || String(milestoneForm.actual_end_date).split("T")[0],
        actual_start_date: milestoneForm.actual_start_date || null,
        actual_end_date: milestoneForm.actual_end_date || null,
        completion_date: milestoneForm.actual_end_date ? String(milestoneForm.actual_end_date).split("T")[0] : null,
        status: milestoneForm.requires_inspection ? "IN_PROGRESS" : "ACHIEVED",
        work_plan_element: milestoneForm.work_plan_element,
        responsible_owner_id: milestoneForm.responsible_owner_id || null,
        responsible_owner_name: milestoneForm.responsible_owner_name || null,
        requires_inspection: milestoneForm.requires_inspection ? 1 : 0,
        inspection_notes: milestoneForm.inspection_notes || null,
        remarks: milestoneForm.remarks,
        linkedTaskIds: milestoneForm.linkedTaskIds && milestoneForm.linkedTaskIds.length ? milestoneForm.linkedTaskIds : [selectedTask.id],
      };

      if (activeMilestoneId) {
        await api.put(`/construction/milestones/${activeMilestoneId}`, payload);
      } else {
        const res = await api.post(`/construction/milestones`, payload);
        if (res.data?.id) setActiveMilestoneId(res.data.id);
      }

      // Ensure task in pm_tasks is marked COMPLETED with these actual dates
      const taskUpdatePayload = {
        status: "COMPLETED",
        completion_percent: 100,
        actual_start_date: milestoneForm.actual_start_date || null,
        actual_end_date: milestoneForm.actual_end_date || null,
      };
      await api.put(`/projects/tasks/${selectedTask.id}`, taskUpdatePayload);

      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTask.id
            ? { ...t, ...taskUpdatePayload }
            : t
        )
      );
      setSelectedTask((prev) =>
        prev ? { ...prev, ...taskUpdatePayload } : prev
      );

      toast.success(`Milestone "${milestoneForm.title}" recorded with actual dates!`);
      setShowMilestoneModal(false);
    } catch (err) {
      console.error("Save milestone error:", err);
      toast.error(err?.response?.data?.message || "Failed to record milestone");
    } finally {
      setSavingMilestone(false);
    }
  };

  // Direct status update with auto-timestamping
  const handleUpdateStatus = async (newStatus) => {
    if (!selectedTask) return;
    try {
      const nowIso = new Date().toISOString();
      const computedStart =
        selectedTask.actual_start_date ||
        (newStatus === "IN_PROGRESS" || newStatus === "COMPLETED" ? nowIso : null);
      const computedEnd =
        newStatus === "COMPLETED"
          ? nowIso
          : newStatus === "PENDING"
          ? null
          : selectedTask.actual_end_date;

      const payload = {
        status: newStatus,
        actual_start_date: computedStart,
        actual_end_date: computedEnd,
      };
      if (newStatus === "COMPLETED") {
        payload.completion_percent = 100;
        setTaskCompletionPercent(100);
        const allDone = checklistItems.map((i) => ({ ...i, completed: true }));
        setChecklistItems(allDone);
        payload.task_description = JSON.stringify(allDone);
      }
      await api.put(`/projects/tasks/${selectedTask.id}`, payload);

      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTask.id
            ? {
                ...t,
                ...payload,
                actual_start_date: computedStart,
                actual_end_date: computedEnd,
              }
            : t
        )
      );
      setSelectedTask((prev) => ({
        ...prev,
        ...payload,
        actual_start_date: computedStart,
        actual_end_date: computedEnd,
      }));
      toast.success(`Task status updated to ${newStatus}`);
      if (newStatus === "COMPLETED") {
        openMilestoneFormForTask({
          ...selectedTask,
          ...payload,
          actual_start_date: computedStart,
          actual_end_date: computedEnd,
        });
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Delay reasons
  const handleDelayChange = (index, value) => {
    const updated = [...delayReasons];
    updated[index] = value;
    setDelayReasons(updated);
  };

  const handleAddDelayReason = () => {
    setDelayReasons((prev) => [...prev, ""]);
  };

  const handleRemoveDelayReason = (index) => {
    if (delayReasons.length <= 1) {
      setDelayReasons([""]);
    } else {
      setDelayReasons((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSaveDelays = async () => {
    if (!selectedTask) return;
    const cleanDelays = delayReasons.map((d) => d.trim()).filter(Boolean);

    if (isDelayReasonRequired && cleanDelays.length === 0) {
      toast.error("Reason for Delay Log is required for overdue/due tasks.");
      return;
    }

    setSaving(true);
    try {
      const jsonDelays = cleanDelays.length > 0 ? JSON.stringify(cleanDelays) : null;
      await api.put(`/projects/tasks/${selectedTask.id}`, {
        reason_for_delay: jsonDelays,
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTask.id ? { ...t, reason_for_delay: jsonDelays } : t
        )
      );
      toast.success("Reason for delay updated successfully");

      // Automatically post to project group chat if delay reasons exist
      if (cleanDelays.length > 0 && selectedTask.project_id) {
        const formattedDelays = cleanDelays.map((r, i) => `${i + 1}. ${r}`).join("\n");
        api.post("/chat/project-task-update", {
          project_id: selectedTask.project_id,
          task_id: selectedTask.id,
          task_title: selectedTask.task_title,
          category: "DELAY_LOG",
          content: formattedDelays,
        }).catch((err) => console.warn("Failed to post delay log to project group chat:", err));
      }
    } catch {
      toast.error("Failed to save reason for delay");
    } finally {
      setSaving(false);
    }
  };

  // Task reassignment
  const handleReassignTask = async (e) => {
    e?.preventDefault?.();
    if (!canReassignTask) {
      toast.error("Exceptional Permission (TASK.REASSIGN) is required to reassign tasks.");
      return;
    }
    if (!selectedTask || !reassignUserId) {
      toast.error("Please select a target user for task reassignment.");
      return;
    }

    const selectedUser = usersList.find((u) => String(u.id) === String(reassignUserId));
    const newAssignedName =
      selectedUser?.username ||
      selectedUser?.full_name ||
      selectedUser?.name ||
      `User #${reassignUserId}`;

    setReassigning(true);
    try {
      await api.put(`/projects/tasks/${selectedTask.id}`, {
        assigned_to_id: reassignUserId,
        assigned_to_name: newAssignedName,
      });

      toast.success(`Task reassigned to ${newAssignedName}`);
      setShowReassignModal(false);
      setReassignUserId("");
      fetchTasks();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to reassign task");
    } finally {
      setReassigning(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-2 sm:px-4 pb-12">
      {/* ── Task Execution Command & Filter Bar ── */}
      <div className="relative w-full" ref={dropdownRef}>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-smoky p-3 sm:p-3.5">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            {/* Left: Back button, Icon, Title & Task / Total Badge (Moved from upper section) */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={handleBack}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-2xs shrink-0 cursor-pointer"
                title="Go back to previous page"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="w-9 h-9 rounded-xl bg-[#0E3646] text-white flex items-center justify-center shrink-0 shadow-sm">
                <ListTodo size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none whitespace-nowrap">
                    Task Execution
                  </h1>
                </div>
              </div>
            </div>

            {/* Right: Status Filter Tabs, All Tasks, Calendar, Mindmap & Task Master */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
                {[
                  { id: "PENDING", label: "Pending", count: taskStats.pending },
                  { id: "IN_PROGRESS", label: "In Prog", count: taskStats.inProgress },
                  { id: "COMPLETED", label: "Done", count: taskStats.completed },
                  { id: "BLOCKED", label: "Blocked", count: taskStats.blocked },
                  { id: "ALL", label: "All", count: taskStats.total },
                ].map((tab) => {
                  const isActive = statusFilter === tab.id;
                  const isOpen = isDropdownOpen && isActive;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabClick(tab.id)}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? "bg-white dark:bg-slate-900 text-brand-900 dark:text-brand-200 shadow-2xs ring-1 ring-slate-200/80 dark:ring-slate-700"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                      title={`Click to view ${tab.label} tasks dropdown`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                          isActive
                            ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60"
                            : "bg-slate-200/60 dark:bg-slate-700/50 text-slate-500"
                        }`}
                      >
                        {tab.count}
                      </span>
                      <ChevronDown
                        size={12}
                        className={`transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-brand-600" : "text-slate-400"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {isSingleTaskMode && (
                <Link
                  to="/project-management/tasks/execution"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition shadow-smoky-card flex items-center gap-1.5 shrink-0"
                  title="View all tasks queue"
                >
                  <Layers size={13} />
                  <span>All Tasks</span>
                </Link>
              )}

              {/* Task Master Button at the Far Right */}
              <Link
                to="/project-management/tasks"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0E3646] hover:bg-[#164356] text-white transition shadow-smoky-card flex items-center gap-1.5 shrink-0"
                title="Task Master"
              >
                <Layers size={13} />
                <span>Task Master</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Section B: Dropdown Menu (Only shown when user clicks on any tab in Section A) ── */}
        {isDropdownOpen && (
          <div className="absolute left-0 right-0 top-full mt-2 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Relocated Search Field at the top of the dropdown */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder={`Search ${statusFilter.toLowerCase().replace("_", " ")} tasks by title or project...`}
                  className="w-full pl-9 pr-8 text-xs h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                title="Close dropdown"
              >
                <X size={15} />
              </button>
            </div>

            {/* Task List inside Dropdown */}
            <div className="p-2.5 max-h-[380px] overflow-y-auto space-y-1.5">
              {filteredTasks.length > 0 ? (
                filteredTasks.map((t) => {
                  const isSel = t.id === selectedTaskId;
                  const pct = Number(t.completion_percent || 0);
                  const isComplete = pct >= 100 || t.status === "COMPLETED";

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTaskId(t.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                        isSel
                          ? "bg-brand-50/50 dark:bg-brand-950/30 border-brand-500 shadow-sm ring-1 ring-brand-500/30"
                          : "bg-white dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-brand-600 transition-colors">
                              {t.task_title}
                            </h4>
                            {isSel && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-brand-600 text-white shrink-0">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{t.project_name || "—"}</span>
                            {t.scope_name && <span>• Scope: {t.scope_name}</span>}
                            {t.wbs_code && (
                              <span>
                                • WBS: {t.wbs_code}
                                {wbsNameMap[`${t.project_id}_${t.wbs_code}`] || t.wbs_name || t.work_package_name || t.scope_name
                                  ? ` - ${wbsNameMap[`${t.project_id}_${t.wbs_code}`] || t.wbs_name || t.work_package_name || t.scope_name}`
                                  : ""}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isComplete
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                : pct > 0
                                ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800"
                                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                            }`}
                          >
                            {pct}%
                          </span>
                          <span
                            className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                              String(t.priority || "").toUpperCase() === "URGENT" ||
                              String(t.priority || "").toUpperCase() === "HIGH"
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold"
                                : "text-slate-500"
                            }`}
                          >
                            {t.priority || "Normal"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No {statusFilter.toLowerCase().replace("_", " ")} tasks found.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Main Execution Workbench (Full Width Spanning Both Ends of Page) ── */}
      <div className="w-full space-y-4">
        {selectedTask ? (
          <>
            {/* ── Task Command Center Banner ── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-smoky p-5 space-y-4">
              {/* Meta Breadcrumb Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-50 text-brand-900 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/50 inline-flex items-center gap-1.5">
                    <FolderGit2 size={13} className="text-brand-600 dark:text-brand-400 shrink-0" />
                    <span className="truncate max-w-[220px]">
                      {selectedTask.project_name || "Project Task"}
                    </span>
                  </span>
                  {selectedTask.scope_name && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 truncate max-w-[180px]">
                      Scope: {selectedTask.scope_name}
                    </span>
                  )}
                  {selectedTask.wbs_code && (
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 inline-flex items-center gap-1.5 max-w-[340px]"
                      title={`WBS: ${selectedTask.wbs_code}${resolvedWbsName ? ` - ${resolvedWbsName}` : ""}`}
                    >
                      <span className="shrink-0">WBS: {selectedTask.wbs_code}</span>
                      {resolvedWbsName && (
                        <span className="font-semibold text-slate-600 dark:text-slate-300 truncate">
                          - {resolvedWbsName}
                        </span>
                      )}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${
                      String(selectedTask.priority || "").toUpperCase() === "URGENT" ||
                      String(selectedTask.priority || "").toUpperCase() === "HIGH"
                        ? "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                        : String(selectedTask.priority || "").toUpperCase() === "MEDIUM"
                        ? "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                        : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {selectedTask.priority || "Normal"}
                  </span>
                  {isDelayReasonRequired && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 flex items-center gap-1 animate-pulse">
                      <AlertTriangle size={12} /> Overdue / Due
                    </span>
                  )}
                </div>
              </div>

              {/* Main Task Title & Progress Gauge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0 space-y-2 flex-1">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-snug">
                    {selectedTask.task_title}
                  </h2>

                  {/* Target & Actual Dates & Status Row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
                    {/* Target Schedule Window */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">
                      <Calendar size={13} className="text-sky-500" />
                      <span className="font-semibold text-slate-500">Target:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {selectedTask.start_date ? new Date(String(selectedTask.start_date).split("T")[0]).toLocaleDateString() : "—"} → {selectedTask.end_date ? new Date(String(selectedTask.end_date).split("T")[0]).toLocaleDateString() : "—"}
                      </span>
                    </div>

                    {/* Actual Execution Window */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
                      selectedTask.actual_end_date
                        ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300"
                        : selectedTask.actual_start_date
                        ? "bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300"
                        : "bg-slate-50 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-400"
                    }`}>
                      <PlayCircle size={13} className={
                        selectedTask.actual_end_date ? "text-emerald-500" : selectedTask.actual_start_date ? "text-blue-500" : "text-slate-400"
                      } />
                      <span className="font-semibold">Actual:</span>
                      <span className="font-medium">
                        {selectedTask.actual_start_date ? new Date(selectedTask.actual_start_date).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                        {" → "}
                        {selectedTask.actual_end_date
                          ? new Date(selectedTask.actual_end_date).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                          : selectedTask.actual_start_date
                          ? "In Progress"
                          : "Not Started"}
                      </span>
                    </div>

                    {/* Quick Milestone Form Button */}
                    <button
                      type="button"
                      onClick={() => openMilestoneFormForTask(selectedTask, checklistItems)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-medium text-xs transition cursor-pointer border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs"
                      title="Open Milestone Sign-Off Form with system captured dates"
                    >
                      <Flag size={12} className="text-emerald-600 dark:text-emerald-400" />
                      <span>Milestone Form</span>
                    </button>

                    {/* Quick Status Dropdown */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-slate-400 font-medium">Status:</span>
                      <select
                        value={selectedTask.status || "PENDING"}
                        onChange={(e) => handleUpdateStatus(e.target.value)}
                        className="text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-1 cursor-pointer focus:ring-1 focus:ring-brand-500"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="BLOCKED">BLOCKED</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Visual Car Odometer Gauge with framed container */}
                <div className="shrink-0 bg-gradient-to-b from-slate-900 to-slate-950 p-3 sm:p-3.5 rounded-2xl border border-slate-800 shadow-xl flex flex-col items-center w-full md:w-auto">
                  <CarOdometerGauge
                    value={taskCompletionPercent}
                    label="TASK COMPLETION GAUGE"
                    size="md"
                  />
                </div>
              </div>

              {/* Indicators row: Item Addition Indicator & Checklist Comments Indicator */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* Indicator 1: Item Addition Indicator */}
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${
                    checklistItems.length > 0
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800/60"
                      : "bg-slate-50 text-slate-500 border-slate-200/80 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700"
                  }`}
                >
                  <CheckCircle2
                    size={13}
                    className={
                      checklistItems.length > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-400"
                    }
                  />
                  <span>
                    {checklistItems.length > 0
                      ? `${checklistItems.length} Deliverable Item${checklistItems.length > 1 ? "s" : ""} Added (${checklistItems.filter((i) => i.completed).length} completed)`
                      : "No deliverable items added"}
                  </span>
                </div>

                {/* Indicator 2: Checklist Comments Indicator */}
                {(() => {
                  const commentsCount = checklistItems.filter(
                    (i) => i.note && i.note.trim()
                  ).length;
                  return (
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${
                        commentsCount > 0
                          ? "bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800/60"
                          : "bg-slate-50 text-slate-500 border-slate-200/80 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700"
                      }`}
                    >
                      <MessageSquare
                        size={13}
                        className={
                          commentsCount > 0
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-slate-400"
                        }
                      />
                      <span>
                        {commentsCount > 0
                          ? `${commentsCount} Checklist Comment${commentsCount > 1 ? "s" : ""} Entered`
                          : "No comments entered on checklist"}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowAttach(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all flex items-center gap-1.5 shadow-smoky-card cursor-pointer"
                >
                  <Paperclip size={13} /> Add Attachment
                </button>
                <Link
                  to={`/project-management/mindmap?taskId=${selectedTask.id}&projectId=${selectedTask.project_id || ""}`}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all flex items-center gap-1.5 shadow-smoky-card"
                >
                  <Brain size={13} /> Open Mindmap
                </Link>
                <Link
                  to={`/project-management/calendar?assignedTo=${user?.id || ""}&mode=MY_CALENDAR&projectId=${selectedTask.project_id || ""}`}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-all flex items-center gap-1.5 shadow-smoky-card"
                >
                  <Calendar size={13} /> View in Calendar
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("omni.chat.open", { detail: { projectId: selectedTask.project_id } }));
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all flex items-center gap-1.5 shadow-smoky-card cursor-pointer"
                  title="Open Project Team Group Chat"
                >
                  <MessageSquare size={13} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Project Chat</span>
                </button>
              </div>
            </div>

            {/* ── Scope Checklist & Deliverables Card ── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-smoky p-5 space-y-3.5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-none">
                      Scope Checklist & Deliverables
                    </h3>
                  </div>
                </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                      {checklistItems.filter((i) => i.completed).length} / {checklistItems.length} Done ({taskCompletionPercent}%)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddDeliverable(!showAddDeliverable)}
                      className="px-2.5 py-1 rounded-xl text-xs font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/50 hover:bg-brand-100 border border-brand-200/60 dark:border-brand-800/60 flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus size={13} /> Add Item
                    </button>
                  </div>
                </div>

                {/* Inline Add Deliverable Input */}
                {showAddDeliverable && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-2 animate-in fade-in duration-200">
                    <input
                      type="text"
                      placeholder="Enter new deliverable or checklist item..."
                      className="input flex-1 h-8 text-xs rounded-lg border-slate-200 dark:border-slate-700"
                      value={newDeliverableText}
                      onChange={(e) => setNewDeliverableText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddChecklistItem();
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddChecklistItem}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0E3646] text-white hover:bg-[#164356] transition shrink-0 cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddDeliverable(false);
                        setNewDeliverableText("");
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Checklist items list */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {checklistItems.length > 0 ? (
                    checklistItems.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className={`p-3 rounded-xl border transition-all ${
                          item.completed
                            ? "bg-emerald-50/40 border-emerald-200/80 dark:bg-emerald-950/20 dark:border-emerald-800/50"
                            : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div
                            onClick={() => handleToggleChecklist(idx)}
                            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                          >
                            <button
                              type="button"
                              className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                                item.completed
                                  ? "bg-emerald-500 text-white shadow-2xs"
                                  : "border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500 text-transparent"
                              }`}
                            >
                              ✓
                            </button>
                            <span className="text-[11px] font-bold text-slate-400 shrink-0">
                              #{idx + 1}
                            </span>
                            <span
                              className={`text-xs sm:text-sm font-medium truncate ${
                                item.completed
                                  ? "line-through text-slate-400 dark:text-slate-500"
                                  : "text-slate-800 dark:text-slate-100"
                              }`}
                            >
                              {item.text}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.note && item.note.trim() && (
                              <span
                                onClick={() =>
                                  setExpandedNoteIdx(expandedNoteIdx === idx ? null : idx)
                                }
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 flex items-center gap-1 cursor-pointer shrink-0"
                                title={`Comment: ${item.note}`}
                              >
                                <MessageSquare size={10} className="text-blue-600 dark:text-blue-400" />
                                <span>Comment entered</span>
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 border ${
                                item.completed
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800"
                                  : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                              }`}
                            >
                              {item.completed ? "COMPLETED" : "PENDING"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedNoteIdx(expandedNoteIdx === idx ? null : idx)
                              }
                              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                                item.note || expandedNoteIdx === idx
                                  ? "text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50"
                                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              }`}
                              title={item.note ? `Note: ${item.note}` : "Add item note"}
                            >
                              <MessageSquare size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Expanded Item Note Field */}
                        {expandedNoteIdx === idx && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 animate-in fade-in duration-150">
                            <input
                              type="text"
                              placeholder="Item specification or verification note..."
                              value={item.note || ""}
                              onChange={(e) => handleNoteChange(idx, e.target.value)}
                              onBlur={() => handleSaveChecklistNote(idx)}
                              className="input flex-1 h-7 text-xs rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveChecklistNote(idx)}
                              className="px-2 py-1 rounded text-[11px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-brand-600 hover:text-white transition cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs italic">
                      No scope checklist items defined. Click "+ Add Item" above to add deliverables.
                    </div>
                  )}
                </div>
              </div>

              {/* ── 3. Bottom Execution Records Split (Side-by-Side 2 Columns) ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {/* Column 1: Task Execution Notes */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-smoky p-4 sm:p-5 flex flex-col justify-between h-full">
                  <div className="space-y-3 flex flex-col flex-1">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-200/50">
                          <MessageSquare size={14} />
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-none">
                            Task Notes
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            General observations & progress updates
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                        className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-brand-600 hover:text-white dark:bg-slate-800 dark:hover:bg-brand-600 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        {savingNotes ? (
                          <>
                            <Loader2 size={12} className="animate-spin" /> Saving...
                          </>
                        ) : (
                          <>
                            <Save size={12} /> Save Notes
                          </>
                        )}
                      </button>
                    </div>

                    <textarea
                      rows={4}
                      className="input w-full text-xs sm:text-sm resize-none rounded-xl border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-brand-500 bg-slate-50/50 dark:bg-slate-800/30 flex-1 min-h-[105px]"
                      placeholder="Add general notes, handover comments, or progress log..."
                      value={taskNotes}
                      onChange={(e) => setTaskNotes(e.target.value)}
                    />
                  </div>
                </div>

                {/* Column 2: Reason for Delay Log */}
                <div
                  className={`bg-white dark:bg-slate-900 border rounded-2xl shadow-smoky p-4 sm:p-5 flex flex-col justify-between h-full ${
                    isDelayReasonRequired
                      ? "border-rose-300 dark:border-rose-800/80 ring-1 ring-rose-300/40"
                      : "border-slate-200/90 dark:border-slate-800"
                  }`}
                >
                  <div className="space-y-3 flex flex-col flex-1">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                            isDelayReasonRequired
                              ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200"
                              : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200"
                          }`}
                        >
                          <AlertTriangle size={14} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-none">
                              Delay & Obstacle Log
                            </h3>
                            {isDelayReasonRequired && (
                              <span className="text-[9px] font-extrabold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-200/80">
                                * Required
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {isDelayReasonRequired
                              ? "Task is overdue/due: explain reason"
                              : "Record blockers or schedule variance"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleAddDelayReason}
                          className="p-1 rounded-lg text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition cursor-pointer"
                          title="Add another reason field"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveDelays}
                          disabled={saving}
                          className="px-3 py-1 rounded-xl text-xs font-semibold bg-[#0E3646] hover:bg-[#164356] text-white transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          {saving ? (
                            <>
                              <Loader2 size={12} className="animate-spin" /> Saving...
                            </>
                          ) : (
                            <>
                              <Save size={12} /> Save Log
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Delay Reasons Inputs */}
                    <div className="space-y-2 flex-1 min-h-[105px] overflow-y-auto pr-1 flex flex-col justify-start">
                      {delayReasons.map((reason, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-400 w-4 text-right shrink-0">
                            {idx + 1}.
                          </span>
                          <input
                            type="text"
                            className={`input w-full text-xs h-9 rounded-lg ${
                              isDelayReasonRequired && !reason.trim()
                                ? "border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-200 bg-rose-50/20"
                                : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30"
                            }`}
                            placeholder={
                              isDelayReasonRequired
                                ? "State reason for delay (Required)..."
                                : "Reason for delay..."
                            }
                            value={reason}
                            onChange={(e) => handleDelayChange(idx, e.target.value)}
                          />
                          {delayReasons.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDelayReason(idx)}
                              className="p-1 text-slate-300 hover:text-rose-600 transition shrink-0 cursor-pointer"
                              title="Remove reason"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Empty Selection State */
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-8 sm:p-14 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 border border-brand-200/60 dark:border-brand-800/60 flex items-center justify-center mx-auto shadow-sm ring-8 ring-brand-50/50 dark:ring-brand-900/10">
                <ListTodo className="w-7 h-7 stroke-[2.2]" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                  Select a Task to View Execution Workspace
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {filteredTasks.length > 0
                    ? `There are ${filteredTasks.length} ${statusFilter.toLowerCase().replace("_", " ")} task(s) available. Click any task from the left queue to inspect deliverables, record notes, and track progress.`
                    : `No ${statusFilter.toLowerCase().replace("_", " ")} tasks assigned to your user account.`}
                </p>
              </div>

              {filteredTasks.length > 0 && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTaskId(filteredTasks[0].id)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0E3646] hover:bg-[#164356] text-white inline-flex items-center gap-2 shadow-sm transition-all"
                  >
                    <MousePointerClick size={14} />
                    <span>Select &ldquo;{filteredTasks[0].task_title}&rdquo;</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      {/* Reassign Task Modal (Exceptional Permission Gated) */}
      <ProjectModal
        open={showReassignModal && Boolean(selectedTask)}
        onClose={() => setShowReassignModal(false)}
        title="Reassign Task"
        subtitle="Update task assignment to another team member"
        icon={UserCheck}
        onSubmit={handleReassignTask}
        submitLabel={reassigning ? "Reassigning..." : "Confirm Reassignment"}
        submitting={reassigning}
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-2 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Task Title:</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                {selectedTask?.task_title}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Current Assignee:</span>
              <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                {selectedTask?.assigned_to_name || "Unassigned"}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Select New Assignee <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={reassignUserId}
              onChange={(e) => setReassignUserId(e.target.value)}
              required
            >
              <option value="">Select Assignee User...</option>
              {usersList.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.username || u.full_name || u.name || `User #${u.id}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </ProjectModal>

      {/* Target & Actual Dates Edit Modal */}
      <ProjectModal
        isOpen={showDatesModal}
        onClose={() => setShowDatesModal(false)}
        title="Edit Target & Actual Schedule"
        subtitle={selectedTask?.task_title || "Task Execution Schedule"}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowDatesModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveDates}
              className="px-4 py-2 rounded-xl bg-[#0E3646] hover:bg-[#164356] text-white font-bold text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5"
            >
              <Save size={13} />
              <span>Save Schedule</span>
            </button>
          </div>
        }
      >
        <div className="space-y-4 p-1">
          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-750 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Target dates set the planned baseline schedule. Actual dates track real operational start and completion timestamps, automatically recorded when status moves to <strong>IN_PROGRESS</strong> or <strong>COMPLETED</strong>, or adjusted manually below.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Target Start Date
              </label>
              <input
                type="date"
                value={datesForm.start_date}
                onChange={(e) => setDatesForm((prev) => ({ ...prev, start_date: e.target.value }))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Target Due Date
              </label>
              <input
                type="date"
                value={datesForm.end_date}
                onChange={(e) => setDatesForm((prev) => ({ ...prev, end_date: e.target.value }))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Actual Start Date &amp; Time
              </label>
              <input
                type="datetime-local"
                value={datesForm.actual_start_date}
                onChange={(e) => setDatesForm((prev) => ({ ...prev, actual_start_date: e.target.value }))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Actual End Date &amp; Time
              </label>
              <input
                type="datetime-local"
                value={datesForm.actual_end_date}
                onChange={(e) => setDatesForm((prev) => ({ ...prev, actual_end_date: e.target.value }))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>
      </ProjectModal>

      {/* Attachments Modal */}
      {showAttach && selectedTask && (
        <DocumentAttachmentsModal
          open={showAttach}
          docType="task"
          docId={selectedTask.id}
          onClose={() => setShowAttach(false)}
        />
      )}

      {/* ── Auto & Manual Milestone Form Modal ── */}
      <ProjectModal
        open={showMilestoneModal}
        isOpen={showMilestoneModal}
        onClose={() => setShowMilestoneModal(false)}
        title="Project Milestone Sign-Off & Completion Form"
        subtitle={
          selectedTask
            ? `Deliverables 100% Completed • ${selectedTask.task_title}`
            : "Review Milestone Actual Dates & Sign-Off"
        }
        icon={Flag}
        maxWidth="max-w-2xl lg:max-w-3xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <Link
              to={selectedTask?.project_id ? `/projects/milestones?project_id=${selectedTask.project_id}&taskId=${selectedTask.id}` : "/projects/milestones"}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={13} />
              <span>Open Full Milestone Hub</span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMilestoneModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-xs transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={savingMilestone}
                onClick={handleSaveMilestoneFromExecution}
                className="px-4 py-2 rounded-xl bg-[#0E3646] hover:bg-[#164356] text-white font-medium text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingMilestone ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={13} />
                )}
                <span>Confirm &amp; Record Milestone</span>
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 p-1 text-xs">
          {/* Milestone Title */}
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
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Category & Target Completion Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                Milestone Category / Type
              </label>
              <select
                value={milestoneForm.milestone_type}
                onChange={(e) => setMilestoneForm((prev) => ({ ...prev, milestone_type: e.target.value }))}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-normal text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-normal text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-normal text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-normal text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Responsible Owner & Work Plan Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                Responsible Owner (Assigned to Task)
              </label>
              <select
                value={String(milestoneForm.responsible_owner_id || "")}
                onChange={(e) => {
                  const id = e.target.value;
                  const u = usersList.find((x) => String(x.id) === String(id));
                  setMilestoneForm((prev) => ({
                    ...prev,
                    responsible_owner_id: id,
                    responsible_owner_name: u?.full_name || u?.username || u?.name || "",
                  }));
                }}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-normal text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="" className="font-normal">-- Assign Owner --</option>
                {milestoneForm.responsible_owner_id && !usersList.some(u => String(u.id) === String(milestoneForm.responsible_owner_id)) && (
                  <option value={String(milestoneForm.responsible_owner_id)} className="font-normal">
                    {milestoneForm.responsible_owner_name || `User #${milestoneForm.responsible_owner_id}`} (Assigned to Task)
                  </option>
                )}
                {usersList.map((u) => (
                  <option key={u.id} value={String(u.id)} className="font-normal">
                    {u.full_name || u.username || u.name || `User #${u.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                Associated Work Plan Scope (Task WBS)
              </label>
              <input
                type="text"
                placeholder="e.g. Substructure & Foundation"
                value={milestoneForm.work_plan_element || ""}
                onChange={(e) => setMilestoneForm((prev) => ({ ...prev, work_plan_element: e.target.value }))}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-normal text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Description & Acceptance Conditions */}
          <div>
            <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
              Description &amp; Acceptance Conditions
            </label>
            <textarea
              rows={2}
              placeholder="Describe verification deliverables or conditions for completion..."
              value={milestoneForm.description}
              onChange={(e) => setMilestoneForm((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-normal text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Requires Inspection Checkbox */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
                Requires Quality / Inspection Sign-off
              </span>
              <span className="text-[10px] text-slate-400 font-normal block">
                Requires formal QA inspection verification before closing out this milestone.
              </span>
            </div>
            <input
              type="checkbox"
              checked={milestoneForm.requires_inspection}
              onChange={(e) => setMilestoneForm((prev) => ({ ...prev, requires_inspection: e.target.checked }))}
              className="w-4 h-4 rounded text-brand-600 cursor-pointer"
            />
          </div>

          {milestoneForm.requires_inspection && (
            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                Inspection Sign-off Notes / Condition Details
              </label>
              <textarea
                rows={2}
                placeholder="Enter QA verification checklist items or structural engineer sign-off reference..."
                value={milestoneForm.inspection_notes}
                onChange={(e) => setMilestoneForm((prev) => ({ ...prev, inspection_notes: e.target.value }))}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-normal text-slate-700 dark:text-slate-200"
              />
            </div>
          )}

          {/* Completed Task Deliverables Checklist Field (Auto-linked from task) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <CheckSquare size={13} className="text-emerald-600" />
                <span>Completed Task Deliverables &amp; Checklist ({checklistItems.length})</span>
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 font-normal flex items-center gap-1">
                <CheckCircle2 size={11} className="text-emerald-500" />
                <span>100% Completed</span>
              </span>
            </div>

            <div className="max-h-40 overflow-y-auto p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1.5">
              {checklistItems.length > 0 ? (
                checklistItems.map((item, idx) => (
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
        </div>
      </ProjectModal>
    </div>
  );
}
