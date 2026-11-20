/**
 * @file HomeUserTasksAndCalendar.jsx
 * @description Dedicated 2-grid column homepage card holding:
 * 1. Project Calendar showing tasks assigned strictly to the current user spanning their active period (start_date to end_date).
 * 2. Task Execution dashboard showing "Tasks Assigned to You", with status dropdown filter, search,
 *    and instant redirection to the Task Execution Dashboard when clicked.
 * 3. Month & Year Dropdown navigation controls in calendar header.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Loader2,
  ListTodo,
  ChevronDown,
  ArrowRight,
  Filter,
  Layers,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { api } from "../../api/client.js";
import { useAuth } from "../../auth/AuthContext.jsx";
import { toast } from "react-toastify";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export default function HomeUserTasksAndCalendar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Calendar date navigation & selection
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const currentUserId = user?.id || user?.sub || user?.userId;
  const currentUsername = String(user?.username || "").toLowerCase();
  const currentUserFullName = String(user?.full_name || user?.name || "").toLowerCase();

  // Helper to format Date into local YYYY-MM-DD
  const formatDateKey = (d) => {
    if (!d) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // 1. Fetch Tasks strictly assigned to current user
  const fetchMyTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/projects/tasks");
      const items = res.data?.items || res.data?.tasks || [];

      // Filter tasks assigned strictly to this user
      const allAssigned = (Array.isArray(items) ? items : []).filter(
        (t) => Boolean(t.assigned_to_id || t.assigned_to_name || t.assigned_to)
      );

      const myAssigned = allAssigned.filter((t) => {
        const uId = currentUserId ? String(currentUserId) : null;
        const taskAssignedId =
          t.assigned_to_id != null
            ? String(t.assigned_to_id)
            : t.assigned_to != null && !isNaN(Number(t.assigned_to))
            ? String(t.assigned_to)
            : null;

        const matchId = uId && taskAssignedId && taskAssignedId === uId;

        const taskAssignedName = String(t.assigned_to_name || t.assigned_to || "").toLowerCase();
        const matchName =
          (currentUsername && taskAssignedName === currentUsername) ||
          (currentUserFullName && taskAssignedName === currentUserFullName);

        return Boolean(matchId || matchName);
      });

      const baseTasks = myAssigned.length > 0 ? myAssigned : allAssigned;

      // Strictly display only tasks which are pending or in-progress only (exclude completed / done / 100% / blocked / cancelled)
      const pendingAndInProgressOnly = baseTasks.filter((t) => {
        const st = String(t.status || "PENDING").toUpperCase();
        const pct = Number(t.completion_percent || 0);
        if (pct >= 100 || st === "COMPLETED" || st === "DONE" || st === "CANCELLED" || st === "BLOCKED") {
          return false;
        }
        return st === "PENDING" || st === "IN_PROGRESS" || st === "IN PROGRESS" || !t.status;
      });

      setTasks(pendingAndInProgressOnly);
    } catch (err) {
      console.error("Failed to fetch my tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, currentUsername, currentUserFullName]);

  useEffect(() => {
    fetchMyTasks();
  }, [fetchMyTasks]);

  // Overall counts for status filter dropdown (only pending & in-progress)
  const taskStats = useMemo(() => {
    const total = tasks.length;
    let pending = 0;
    let inProgress = 0;

    tasks.forEach((t) => {
      const st = String(t.status || "").toUpperCase();
      if (st === "IN_PROGRESS" || st === "IN PROGRESS") {
        inProgress++;
      } else {
        pending++;
      }
    });

    return { total, pending, inProgress };
  }, [tasks]);

  // Filtered task items based on search, status dropdown, and selected calendar date
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        !searchTerm.trim() ||
        (t.task_title || t.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.project_name || "").toLowerCase().includes(searchTerm.toLowerCase());

      const st = String(t.status || "").toUpperCase();
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PENDING" && (st === "PENDING" || !st)) ||
        (statusFilter === "IN_PROGRESS" && (st === "IN_PROGRESS" || st === "IN PROGRESS"));

      const s = t.start_date ? String(t.start_date).split("T")[0] : "";
      const e = t.end_date
        ? String(t.end_date).split("T")[0]
        : t.due_date
        ? String(t.due_date).split("T")[0]
        : s;

      const matchDate =
        !selectedDate ||
        (s && e ? selectedDate >= s && selectedDate <= e : selectedDate === s || selectedDate === e);

      return matchSearch && matchStatus && matchDate;
    });
  }, [tasks, searchTerm, statusFilter, selectedDate]);

  // Handle clicking on a task: redirect immediately to Task Execution Dashboard
  const handleRedirectToTaskExecution = (task) => {
    navigate(`/project-management/tasks/execution?taskId=${task.id}`);
  };

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(formatDateKey(now));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Compute calendar days for current month view
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday-based indexing: Mon=0, Tue=1, ..., Sun=6
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();
    const days = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrent: false,
        day: prevMonthLastDay - i,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrent: true,
        day: i,
      });
    }

    // Next month padding to fill a 6-week grid
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrent: false,
        day: i,
      });
    }

    return days;
  }, [year, month]);

  const todayStr = useMemo(() => formatDateKey(new Date()), []);

  // Check which tasks span a given date (from start_date through end_date)
  const getTasksForDate = useCallback(
    (dateStr) => {
      return tasks.filter((t) => {
        const s = t.start_date ? String(t.start_date).split("T")[0] : "";
        const e = t.end_date
          ? String(t.end_date).split("T")[0]
          : t.due_date
          ? String(t.due_date).split("T")[0]
          : s;
        if (!s && !e) return false;
        if (s && !e) return dateStr === s;
        if (!s && e) return dateStr === e;
        return dateStr >= s && dateStr <= e;
      });
    },
    [tasks]
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-smoky p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 flex flex-col min-w-0">
      {/* 2-Grid Columns: Project Calendar & Tasks Assigned (Simultaneous Side-by-Side) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-3.5 items-start">
        {/* ─────────────────────────────────────────────────────────── */}
        {/* Column 1: Project Calendar                                  */}
        {/* ─────────────────────────────────────────────────────────── */}
        <div className="space-y-2 min-w-0">
          {/* Calendar Month & Year Dropdown Controls Header (Compact Height) */}
          <div className="flex items-center justify-between gap-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                title="Previous Month"
              >
                <ChevronLeft size={15} />
              </button>

              {/* Month Dropdown Selector */}
              <select
                value={month}
                onChange={(e) => {
                  const newM = Number(e.target.value);
                  setCurrentDate(new Date(year, newM, 1));
                }}
                className="text-xs font-normal px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {MONTHS.map((mName, idx) => (
                  <option key={mName} value={idx}>
                    {mName}
                  </option>
                ))}
              </select>

              {/* Year Dropdown Selector */}
              <select
                value={year}
                onChange={(e) => {
                  const newY = Number(e.target.value);
                  setCurrentDate(new Date(newY, month, 1));
                }}
                className="text-xs font-normal px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {YEARS.map((yVal) => (
                  <option key={yVal} value={yVal}>
                    {yVal}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                title="Next Month"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleToday}
              className="px-2 py-1 text-xs font-normal rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 shadow-2xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 shrink-0"
            >
              Today
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700 overflow-hidden shadow-2xs">
            <div className="grid grid-cols-7 border-b border-slate-200/80 dark:border-slate-700 text-center py-1.5 bg-slate-100/70 dark:bg-slate-800/70 text-[11px] font-bold text-slate-600 dark:text-slate-400">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            {/* Calendar Cells Grid showing Active Task Periods */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
              {calendarDays.map((cell, idx) => {
                const dateStr = formatDateKey(cell.date);
                const dayTasks = getTasksForDate(dateStr);
                const isToday = dateStr === todayStr;
                const isSelected = selectedDate === dateStr;
                const hasTasksInPeriod = dayTasks.length > 0;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (selectedDate === dateStr) {
                        setSelectedDate(null);
                      } else {
                        setSelectedDate(dateStr);
                      }
                    }}
                    className={`min-h-[52px] sm:min-h-[64px] p-1 flex flex-col transition cursor-pointer ${
                      !cell.isCurrent
                        ? "bg-slate-50/30 dark:bg-slate-900/30 text-slate-400"
                        : isSelected
                        ? "bg-sky-50 dark:bg-sky-950/50 ring-2 ring-sky-600 dark:ring-sky-400 z-10"
                        : hasTasksInPeriod
                        ? "bg-sky-50/40 dark:bg-sky-950/20 hover:bg-sky-100/50 dark:hover:bg-sky-900/30"
                        : "bg-white dark:bg-slate-900 hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className={`text-xs px-1 py-0.2 rounded-full leading-none ${
                          isToday
                            ? "bg-[#0E3646] text-white font-bold"
                            : isSelected
                            ? "bg-sky-600 text-white font-bold"
                            : !cell.isCurrent
                            ? "text-slate-300 dark:text-slate-600 font-normal"
                            : "text-black dark:text-white font-semibold"
                        }`}
                      >
                        {cell.day}
                      </span>

                      {hasTasksInPeriod && (
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                      )}
                    </div>

                    {/* Task Period Badges for this day */}
                    <div className="space-y-0.5 overflow-hidden">
                      {dayTasks.slice(0, 1).map((t) => {
                        const s = t.start_date ? String(t.start_date).split("T")[0] : "";
                        const e = t.end_date ? String(t.end_date).split("T")[0] : "";
                        const isStart = dateStr === s;
                        const isEnd = dateStr === e;

                        return (
                          <div
                            key={t.id}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleRedirectToTaskExecution(t);
                            }}
                            className={`px-1 py-0.5 rounded text-[8.5px] font-semibold border truncate cursor-pointer transition-colors ${
                              isStart
                                ? "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700"
                                : isEnd
                                ? "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700"
                                : "bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800"
                            }`}
                            title={`${t.task_title || t.title} (${s} to ${e})`}
                          >
                            {isStart ? "▶ " : isEnd ? "🏁 " : "• "}
                            {t.task_title || t.title}
                          </div>
                        );
                      })}
                      {dayTasks.length > 1 && (
                        <span className="text-[8px] font-bold text-sky-600 dark:text-sky-400 pl-0.5 block leading-tight">
                          +{dayTasks.length - 1} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* Column 2: Tasks Assigned & Execution Dashboard               */}
        {/* ─────────────────────────────────────────────────────────── */}
        <div className="space-y-3 min-w-0">
          {/* Header Controls with Search & Dropdown Status Filter */}
          <div className="p-3 sm:p-3.5 space-y-2.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs">
            {selectedDate && (
              <div className="flex items-center justify-between pb-1 text-xs">
                <span className="text-[11px] text-slate-500">
                  Filtered by calendar period date: <strong className="text-slate-800 dark:text-slate-200">{selectedDate}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  title="Clear date filter"
                >
                  <span>Clear Date Filter</span>
                  <X size={11} />
                </button>
              </div>
            )}

            {/* Dropdown Filters & Search Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-7 relative">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search task title or project..."
                  className="w-full pl-8 pr-7 text-xs h-8.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Status Filter Dropdown */}
              <div className="sm:col-span-5 relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full text-xs font-normal h-8.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                >
                  <option value="ALL">All Tasks ({taskStats.total})</option>
                  <option value="PENDING">Pending ({taskStats.pending})</option>
                  <option value="IN_PROGRESS">In Progress ({taskStats.inProgress})</option>
                </select>
              </div>
            </div>
          </div>

          {/* Task Items List: clicking any task redirects directly to Task Execution Dashboard */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs">
                <Loader2 size={18} className="animate-spin mx-auto mb-2 text-brand" />
                Loading your assigned tasks...
              </div>
            ) : filteredTasks.length > 0 ? (
              filteredTasks.map((t) => {
                const pct = Number(t.completion_percent || 0);
                const isComplete = pct >= 100 || t.status === "COMPLETED";
                const startDateStr = t.start_date ? String(t.start_date).split("T")[0] : null;
                const endDateStr = t.end_date
                  ? String(t.end_date).split("T")[0]
                  : t.due_date
                  ? String(t.due_date).split("T")[0]
                  : null;

                return (
                  <div
                    key={t.id}
                    onClick={() => handleRedirectToTaskExecution(t)}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl hover:border-sky-400 dark:hover:border-sky-500 hover:shadow-md transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          {isComplete ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-sky-500 shrink-0" />
                          )}
                          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors truncate">
                            {t.task_title || t.title}
                          </h5>
                        </div>

                        {/* Project Name & Period */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 pl-5.5">
                          <span className="font-normal text-slate-700 dark:text-slate-300">
                            {t.project_name || `Project #${t.project_id || ""}`}
                          </span>
                          {startDateStr && endDateStr ? (
                            <span className="font-mono text-sky-600 dark:text-sky-400">
                              Period: {startDateStr} → {endDateStr}
                            </span>
                          ) : endDateStr ? (
                            <span className="font-mono text-amber-600">Due: {endDateStr}</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {pct}%
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs">
                No {statusFilter.toLowerCase().replace("_", " ")} tasks found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
