import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  Filter,
  DollarSign,
  CreditCard,
  Wallet,
  RefreshCw,
  FolderGit2,
  FileSpreadsheet,
  Activity,
  Layers,
  Target,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  Calendar,
  Flag,
  AlertTriangle,
} from "lucide-react";
import { api } from "../../../api/client.js";
import {
  SectionCard,
  formatCurrency,
  formatNumber,
} from "../../../components/dashboard/ModuleDashboardWidgets.jsx";
import {
  CostBarChart,
} from "../../modules/project-management/ProjectManagementDashboardPage.jsx";

// ─────────────────────────────────────────────────────────────
// 1. PORTFOLIO DELIVERY HEALTH & RISK STATUS (DONUT CHART)
// ─────────────────────────────────────────────────────────────
export function PortfolioDeliveryHealthDonutChart({ projects = [], tasks = [], isAll = true }) {
  const [hoveredSlice, setHoveredSlice] = useState(null);

  const healthData = useMemo(() => {
    let healthy = 0;
    let inProgress = 0;
    let warning = 0;
    let critical = 0;
    let completed = 0;

    const today = new Date();

    if (isAll) {
      projects.forEach((p) => {
        const comp = Number(p.completion_percent || 0);
        const budget = Number(p.budget || 0);
        const spent = Number(p.total_spent || p.total_expense || 0);
        const isPastDue = p.end_date && new Date(p.end_date) < today && comp < 100;
        const isOverBudget = spent > budget && budget > 0;

        if (comp >= 100 || (p.project_status || "").toUpperCase() === "COMPLETED") {
          completed++;
        } else if (isPastDue || isOverBudget) {
          critical++;
        } else if (budget > 0 && (spent / budget) * 100 > comp + 20) {
          warning++;
        } else if (comp >= 50) {
          healthy++;
        } else {
          inProgress++;
        }
      });
    } else {
      tasks.forEach((t) => {
        const st = String(t.status || "").toUpperCase();
        const isPastDue = t.end_date && new Date(t.end_date) < today && !st.includes("COMPLET");

        if (st.includes("COMPLET")) {
          completed++;
        } else if (st.includes("BLOCK") || isPastDue) {
          critical++;
        } else if (st.includes("PROGRESS") || st.includes("ACTIVE")) {
          healthy++;
        } else if (t.priority === "HIGH" || t.priority === "URGENT") {
          warning++;
        } else {
          inProgress++;
        }
      });
    }

    const raw = [
      { key: "ON_TRACK", label: "On Track / Healthy", count: healthy, color: "#10b981", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
      { key: "IN_PROGRESS", label: "In Progress / Active", count: inProgress, color: "#3b82f6", badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
      { key: "WARNING", label: "At Risk / Attention", count: warning, color: "#f59e0b", badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
      { key: "CRITICAL", label: "Critical / Overdue", count: critical, color: "#ef4444", badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" },
      { key: "COMPLETED", label: "Completed / Delivered", count: completed, color: "#8b5cf6", badge: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" },
    ].filter((s) => s.count > 0);

    const totalEvaluated = (healthy + inProgress + warning + critical + completed) || 1;
    let accumulatedAngle = 0;

    const segments = raw.map((seg) => {
      const pct = (seg.count / totalEvaluated) * 100;
      const angle = (seg.count / totalEvaluated) * 360;
      const startAngle = accumulatedAngle;
      accumulatedAngle += angle;
      return {
        ...seg,
        pct: pct.toFixed(1),
        startAngle,
        endAngle: accumulatedAngle,
      };
    });

    const onTrackPct = totalEvaluated > 0
      ? Math.round(((healthy + completed) / totalEvaluated) * 100)
      : 100;

    return {
      segments,
      totalCount: totalEvaluated,
      healthyCount: healthy + completed,
      onTrackPct,
    };
  }, [projects, tasks, isAll]);

  // SVG Geometry Constants
  const size = 220;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let strokeOffset = 0;

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-2">
      {/* SVG Donut Circle */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg width={size} height={size} className="overflow-visible transform -rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100 dark:text-slate-800"
          />

          {healthData.segments.map((seg) => {
            const dashLength = (Number(seg.pct) / 100) * circumference;
            const currentOffset = strokeOffset;
            strokeOffset -= dashLength;
            const isHovered = hoveredSlice === seg.key;

            return (
              <circle
                key={seg.key}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={currentOffset}
                onMouseEnter={() => setHoveredSlice(seg.key)}
                onMouseLeave={() => setHoveredSlice(null)}
                className="transition-all duration-300 cursor-pointer"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Center Text KPI */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {healthData.onTrackPct}%
          </span>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            Health Rating
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            {healthData.healthyCount} on track
          </span>
        </div>
      </div>

      {/* Legend & Breakdown Pills */}
      <div className="flex-1 w-full space-y-2">
        {healthData.segments.map((seg) => {
          const isHovered = hoveredSlice === seg.key;
          return (
            <div
              key={seg.key}
              onMouseEnter={() => setHoveredSlice(seg.key)}
              onMouseLeave={() => setHoveredSlice(null)}
              className={`p-2 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                isHovered
                  ? "bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 shadow-xs"
                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }}></span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {seg.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {seg.count}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">({seg.pct}%)</span>
              </div>
            </div>
          );
        })}

        {healthData.segments.length === 0 && (
          <div className="text-xs text-slate-400 text-center py-6">
            No projects or tasks to evaluate.
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. PROJECT EXECUTION & WORK VELOCITY (HORIZONTAL BAR CHART)
// ─────────────────────────────────────────────────────────────
export function ProjectExecutionHorizontalBarChart({ projects = [], tasks = [], isAll = true }) {
  const executionData = useMemo(() => {
    if (isAll) {
      return projects.map((p) => {
        const pTasks = tasks.filter((t) => Number(t.project_id) === Number(p.id));
        let done = 0;
        let inProgress = 0;
        let pending = 0;
        let blocked = 0;

        if (pTasks.length > 0) {
          pTasks.forEach((t) => {
            const st = String(t.status || "").toUpperCase();
            if (st.includes("COMPLET")) done++;
            else if (st.includes("PROGRESS") || st.includes("ACTIVE")) inProgress++;
            else if (st.includes("BLOCK") || st.includes("HOLD")) blocked++;
            else pending++;
          });
        } else {
          const comp = Number(p.completion_percent || 0);
          done = Math.round((comp / 100) * 10);
          pending = Math.max(0, 10 - done);
        }

        const total = (done + inProgress + pending + blocked) || 1;
        const compPct = Number(p.completion_percent || (done / total) * 100);

        return {
          id: p.id,
          name: p.project_name,
          code: p.project_code || `PRJ-${p.id}`,
          status: p.project_status || "ACTIVE",
          total: pTasks.length > 0 ? pTasks.length : 10,
          done,
          inProgress,
          pending,
          blocked,
          compPct,
        };
      });
    } else {
      const groups = [
        { key: "HIGH", label: "High / Urgent Priority", match: (t) => t.priority === "HIGH" || t.priority === "URGENT" },
        { key: "MEDIUM", label: "Medium Priority", match: (t) => t.priority === "MEDIUM" || !t.priority },
        { key: "LOW", label: "Low Priority", match: (t) => t.priority === "LOW" },
      ];

      return groups
        .map((g, idx) => {
          const gTasks = tasks.filter(g.match);
          let done = 0;
          let inProgress = 0;
          let pending = 0;
          let blocked = 0;

          gTasks.forEach((t) => {
            const st = String(t.status || "").toUpperCase();
            if (st.includes("COMPLET")) done++;
            else if (st.includes("PROGRESS") || st.includes("ACTIVE")) inProgress++;
            else if (st.includes("BLOCK") || st.includes("HOLD")) blocked++;
            else pending++;
          });

          const total = gTasks.length;
          const compPct = total > 0 ? (done / total) * 100 : 0;

          return {
            id: idx,
            name: g.label,
            code: g.key,
            status: `${total} tasks`,
            total,
            done,
            inProgress,
            pending,
            blocked,
            compPct,
          };
        })
        .filter((g) => g.total > 0);
    }
  }, [projects, tasks, isAll]);

  const maxTotal = Math.max(...executionData.map((d) => d.total), 1);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
        <span className="text-slate-500 font-medium">Work Delivery by Project</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] text-slate-500">Done</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span className="text-[11px] text-slate-500">In Progress</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span className="text-[11px] text-slate-500">Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span className="text-[11px] text-slate-500">Blocked</span>
          </div>
        </div>
      </div>

      {/* Horizontal Bar List */}
      <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
        {executionData.map((item) => {
          const totalUnits = (item.done + item.inProgress + item.pending + item.blocked) || 1;
          const donePct = (item.done / totalUnits) * 100;
          const inProgressPct = (item.inProgress / totalUnits) * 100;
          const pendingPct = (item.pending / totalUnits) * 100;
          const blockedPct = (item.blocked / totalUnits) * 100;

          const barWidthPct = Math.max(30, (item.total / maxTotal) * 100);

          return (
            <div
              key={item.id}
              className="space-y-1.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-brand-50 dark:bg-brand-950/60 border border-brand-200/50 dark:border-brand-800/50 flex items-center justify-center text-[10px] font-bold text-brand-700 dark:text-brand-300 shrink-0">
                    {item.code ? item.code.slice(0, 3) : "PRJ"}
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-500 font-mono">
                    {item.done}/{item.total} Done
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {item.compPct.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Segmented Horizontal Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                <div style={{ width: `${barWidthPct}%` }} className="h-full flex rounded-full overflow-hidden">
                  {donePct > 0 && (
                    <div
                      style={{ width: `${donePct}%` }}
                      className="bg-emerald-500 h-full"
                      title={`Completed: ${item.done}`}
                    />
                  )}
                  {inProgressPct > 0 && (
                    <div
                      style={{ width: `${inProgressPct}%` }}
                      className="bg-blue-500 h-full"
                      title={`In Progress: ${item.inProgress}`}
                    />
                  )}
                  {pendingPct > 0 && (
                    <div
                      style={{ width: `${pendingPct}%` }}
                      className="bg-amber-400 h-full"
                      title={`Pending: ${item.pending}`}
                    />
                  )}
                  {blockedPct > 0 && (
                    <div
                      style={{ width: `${blockedPct}%` }}
                      className="bg-rose-500 h-full"
                      title={`Blocked: ${item.blocked}`}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {executionData.length === 0 && (
          <div className="text-xs text-slate-400 text-center py-6">No project execution data available.</div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. EARNED VALUE EFFICIENCY MATRIX (CPI vs. SPI 2D BUBBLE CHART)
// ─────────────────────────────────────────────────────────────
export function EarnedValueEfficiencyBubbleChart({ projects = [], height = 320 }) {
  const [hoveredBubble, setHoveredBubble] = useState(null);

  const svgWidth = 650;
  const svgHeight = height;
  const padding = { top: 25, right: 35, bottom: 45, left: 55 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  const maxAxis = 2.0;

  const bubbles = useMemo(() => {
    const today = new Date();

    return (projects || []).map((p) => {
      const budget = Number(p.budget || 0);
      const spent = Number(p.total_spent || p.total_expense || 0);
      const compPct = Math.min(100, Math.max(0, Number(p.completion_percent || 0)));

      // Earned Value (EV)
      const ev = budget * (compPct / 100);
      // Actual Cost (AC)
      const ac = spent;

      // CPI = EV / AC (Cost Performance Index)
      let cpi = 1.0;
      if (ac > 0 && ev > 0) {
        cpi = ev / ac;
      } else if (ac > 0 && ev === 0) {
        cpi = 0.5;
      } else if (ac === 0 && ev > 0) {
        cpi = 1.5;
      }
      cpi = Math.min(maxAxis, Math.max(0.2, cpi));

      // Planned Value (PV) & SPI
      let plannedPct = 50;
      if (p.start_date && p.end_date) {
        const start = new Date(p.start_date);
        const end = new Date(p.end_date);
        const totalDuration = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
        const elapsed = Math.max(0, (today - start) / (1000 * 60 * 60 * 24));
        plannedPct = Math.min(100, Math.max(5, (elapsed / totalDuration) * 100));
      }
      const pv = budget * (plannedPct / 100);

      // SPI = EV / PV (Schedule Performance Index)
      let spi = 1.0;
      if (pv > 0 && ev > 0) {
        spi = ev / pv;
      } else if (compPct > 0) {
        spi = compPct / plannedPct;
      } else {
        spi = 0.6;
      }
      spi = Math.min(maxAxis, Math.max(0.2, spi));

      // Radius scaled smoothly by budget
      const r = Math.max(14, Math.min(32, 14 + (budget / 500000) * 16));

      // Map SPI to X coordinate, CPI to Y coordinate
      const cx = padding.left + (spi / maxAxis) * plotWidth;
      const cy = padding.top + plotHeight - (cpi / maxAxis) * plotHeight;

      let health = "BALANCED";
      let color = "#3b82f6";
      let label = "On Target";

      if (spi >= 1.0 && cpi >= 1.0) {
        health = "STAR";
        color = "#10b981";
        label = "Ahead of Schedule • Under Budget";
      } else if (spi < 1.0 && cpi >= 1.0) {
        health = "SCHEDULE_LAG";
        color = "#3b82f6";
        label = "Behind Schedule • Under Budget";
      } else if (spi >= 1.0 && cpi < 1.0) {
        health = "OVER_BUDGET";
        color = "#f59e0b";
        label = "Ahead of Schedule • Over Budget";
      } else {
        health = "CRITICAL";
        color = "#f43f5e";
        label = "Behind Schedule • Over Budget";
      }

      return {
        id: p.id,
        name: p.project_name || p.project_code,
        code: p.project_code,
        spi,
        cpi,
        budget,
        spent,
        ev,
        cx,
        cy,
        r,
        health,
        color,
        label,
      };
    });
  }, [projects, plotWidth, plotHeight]);

  return (
    <div className="space-y-4">
      {/* Legend & Baseline Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600 dark:text-slate-400 font-medium">Efficient (Ahead / Under)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-slate-600 dark:text-slate-400 font-medium">Cost Strain (CPI &lt; 1.0)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span className="text-slate-600 dark:text-slate-400 font-medium">Critical (CPI &amp; SPI &lt; 1.0)</span>
          </div>
        </div>
        <span className="text-[11px] font-mono text-slate-400">Baseline Target = 1.0</span>
      </div>

      {/* SVG Canvas */}
      <div className="relative overflow-x-auto pb-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
          style={{ minHeight: `${height}px` }}
        >
          {/* Top-Right Quadrant: Star Performers */}
          <rect
            x={padding.left + plotWidth / 2}
            y={padding.top}
            width={plotWidth / 2}
            height={plotHeight / 2}
            className="fill-emerald-500/5 dark:fill-emerald-500/10"
          />

          {/* Bottom-Left Quadrant: Critical */}
          <rect
            x={padding.left}
            y={padding.top + plotHeight / 2}
            width={plotWidth / 2}
            height={plotHeight / 2}
            className="fill-rose-500/5 dark:fill-rose-500/10"
          />

          {/* Major Baseline Lines (CPI = 1.0 and SPI = 1.0) */}
          <line
            x1={padding.left}
            y1={padding.top + plotHeight / 2}
            x2={padding.left + plotWidth}
            y2={padding.top + plotHeight / 2}
            stroke="#94a3b8"
            strokeDasharray="4"
            strokeWidth="1.5"
            className="opacity-60"
          />
          <line
            x1={padding.left + plotWidth / 2}
            y1={padding.top}
            x2={padding.left + plotWidth / 2}
            y2={padding.top + plotHeight}
            stroke="#94a3b8"
            strokeDasharray="4"
            strokeWidth="1.5"
            className="opacity-60"
          />

          {/* Y Axis Ticks (CPI) */}
          {[0.5, 1.0, 1.5, 2.0].map((val) => {
            const y = padding.top + plotHeight - (val / maxAxis) * plotHeight;
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + plotWidth}
                  y2={y}
                  className="stroke-slate-100 dark:stroke-slate-800"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className={`text-[9px] font-mono ${val === 1.0 ? "fill-brand-600 dark:fill-brand-400 font-bold" : "fill-slate-400"}`}
                >
                  {val.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* X Axis Ticks (SPI) */}
          {[0.5, 1.0, 1.5, 2.0].map((val) => {
            const x = padding.left + (val / maxAxis) * plotWidth;
            return (
              <g key={val}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + plotHeight}
                  className="stroke-slate-100 dark:stroke-slate-800"
                />
                <text
                  x={x}
                  y={padding.top + plotHeight + 16}
                  textAnchor="middle"
                  className={`text-[9px] font-mono ${val === 1.0 ? "fill-brand-600 dark:fill-brand-400 font-bold" : "fill-slate-400"}`}
                >
                  {val.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Axis Labels */}
          <text
            x={padding.left + plotWidth / 2}
            y={padding.top + plotHeight + 36}
            textAnchor="middle"
            className="text-[10px] font-bold fill-slate-500 uppercase tracking-wider"
          >
            Schedule Performance Index (SPI) →
          </text>

          <text
            x={-padding.top - plotHeight / 2}
            y={16}
            textAnchor="middle"
            transform="rotate(-90)"
            className="text-[10px] font-bold fill-slate-500 uppercase tracking-wider"
          >
            Cost Performance Index (CPI) →
          </text>

          {/* Bubbles */}
          {bubbles.map((b) => {
            const isHovered = hoveredBubble?.id === b.id;
            return (
              <g
                key={b.id}
                className="cursor-pointer transition-transform duration-200"
                onMouseEnter={() => setHoveredBubble(b)}
                onMouseLeave={() => setHoveredBubble(null)}
              >
                {/* Glow ring on hover */}
                {isHovered && (
                  <circle
                    cx={b.cx}
                    cy={b.cy}
                    r={b.r + 7}
                    fill="none"
                    stroke={b.color}
                    strokeWidth="3"
                    className="animate-pulse opacity-50"
                  />
                )}

                {/* Primary Bubble */}
                <circle
                  cx={b.cx}
                  cy={b.cy}
                  r={b.r}
                  fill={b.color}
                  fillOpacity={isHovered ? 0.9 : 0.75}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-all hover:scale-105"
                />

                {/* Bubble Label */}
                <text
                  x={b.cx}
                  y={b.cy + 3}
                  textAnchor="middle"
                  className="text-[9px] font-black fill-white pointer-events-none drop-shadow-sm select-none"
                >
                  {b.code ? b.code.slice(0, 4) : `P${b.id}`}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Popover Tooltip */}
        {hoveredBubble && (
          <div className="absolute top-2 right-4 bg-slate-900 text-white rounded-xl shadow-xl p-3 text-xs pointer-events-none z-10 border border-slate-700/60 max-w-xs animate-in fade-in">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="font-bold text-sm text-slate-100 line-clamp-1">{hoveredBubble.name}</span>
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: hoveredBubble.color }}
              >
                {hoveredBubble.health}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mb-2">{hoveredBubble.code}</p>

            <div className="space-y-1.5 pt-1.5 border-t border-slate-800">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">CPI (Cost Efficiency):</span>
                <span className={`font-bold ${hoveredBubble.cpi >= 1.0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {hoveredBubble.cpi.toFixed(2)} {hoveredBubble.cpi >= 1.0 ? "(Under Budget)" : "(Over Budget)"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">SPI (Schedule Efficiency):</span>
                <span className={`font-bold ${hoveredBubble.spi >= 1.0 ? "text-emerald-400" : "text-amber-400"}`}>
                  {hoveredBubble.spi.toFixed(2)} {hoveredBubble.spi >= 1.0 ? "(Ahead)" : "(Behind)"}
                </span>
              </div>
              <div className="flex justify-between gap-4 pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">Approved Budget:</span>
                <span className="font-medium text-slate-200">{formatCurrency(hoveredBubble.budget)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Actual Spent:</span>
                <span className="font-medium text-slate-200">{formatCurrency(hoveredBubble.spent)}</span>
              </div>
              <div className="pt-1 text-[10px] text-slate-400 italic">
                {hoveredBubble.label}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. PROJECT PROFITABILITY & P&L CHART (EXPENSE, INCOME, PROFIT)
// ─────────────────────────────────────────────────────────────
export function ProjectProfitabilityChart({ data = [], height = 290 }) {
  const [hovered, setHovered] = useState(null);

  const summary = useMemo(() => {
    const totalIncome = data.reduce((s, d) => s + Number(d.income || 0), 0);
    const totalExpense = data.reduce((s, d) => s + Number(d.expense || 0), 0);
    const totalProfit = totalIncome - totalExpense;
    const margin = totalIncome > 0 ? (totalProfit / totalIncome) * 100 : 0;
    return { totalIncome, totalExpense, totalProfit, margin };
  }, [data]);

  // Dimensions
  const svgWidth = 650;
  const svgHeight = height;
  const padding = { top: 20, right: 30, bottom: 45, left: 60 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  const maxVal = Math.max(
    ...data.flatMap((d) => [d.income, d.expense, Math.abs(d.profit)]),
    1000
  );

  const barGroupWidth = Math.max(70, Math.min(130, plotWidth / Math.max(1, data.length)));
  const barWidth = 14;

  return (
    <div className="space-y-4">
      {/* Financial KPI Summary Bar */}
      <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <TrendingUp size={13} className="shrink-0" />
            <span className="truncate">Total Income</span>
          </div>
          <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
            {formatCurrency(summary.totalIncome)}
          </div>
        </div>

        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
            <CreditCard size={13} className="shrink-0" />
            <span className="truncate">Total Expense</span>
          </div>
          <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
            {formatCurrency(summary.totalExpense)}
          </div>
        </div>

        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400">
            <Wallet size={13} className="shrink-0" />
            <span className="truncate">Net Profit</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-sm font-extrabold truncate ${
                summary.totalProfit >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formatCurrency(summary.totalProfit)}
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                summary.totalProfit >= 0
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
              }`}
            >
              {summary.margin.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
        <span className="text-slate-500 font-medium">Income, Expense & Profit Comparison</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
            <span className="text-slate-600 dark:text-slate-400 text-[11px] font-medium">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
            <span className="text-slate-600 dark:text-slate-400 text-[11px] font-medium">Expense</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500"></span>
            <span className="text-slate-600 dark:text-slate-400 text-[11px] font-medium">Net Profit</span>
          </div>
        </div>
      </div>

      {/* Interactive SVG Chart */}
      <div className="relative overflow-x-auto pb-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
          style={{ minHeight: `${height}px` }}
        >
          {/* Y-Axis Gridlines & Ticks */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((pct, idx) => {
            const y = padding.top + plotHeight - pct * plotHeight;
            const valLabel = Math.round(maxVal * pct);
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + plotWidth}
                  y2={y}
                  className="stroke-slate-100 dark:stroke-slate-800"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] font-mono fill-slate-400"
                >
                  {valLabel >= 1000000
                    ? `${(valLabel / 1000000).toFixed(1)}M`
                    : valLabel >= 1000
                    ? `${(valLabel / 1000).toFixed(0)}k`
                    : valLabel}
                </text>
              </g>
            );
          })}

          {/* Bar Groups */}
          {data.map((item, idx) => {
            const groupX = padding.left + 15 + idx * barGroupWidth;
            const incH = Math.max(3, (Number(item.income || 0) / maxVal) * plotHeight);
            const expH = Math.max(3, (Number(item.expense || 0) / maxVal) * plotHeight);
            const profH = Math.max(3, (Math.abs(Number(item.profit || 0)) / maxVal) * plotHeight);

            const incY = padding.top + plotHeight - incH;
            const expY = padding.top + plotHeight - expH;
            const profY = padding.top + plotHeight - profH;

            const isHovered = hovered?.id === item.id;
            const isProfit = Number(item.profit || 0) >= 0;

            return (
              <g
                key={item.id || idx}
                onMouseEnter={() => setHovered(item)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer transition-opacity duration-150"
                opacity={hovered && !isHovered ? 0.45 : 1}
              >
                {/* Income Bar (Emerald) */}
                <rect
                  x={groupX}
                  y={incY}
                  width={barWidth}
                  height={incH}
                  rx="3"
                  className="fill-emerald-500 transition-all hover:brightness-110"
                />

                {/* Expense Bar (Rose) */}
                <rect
                  x={groupX + barWidth + 3}
                  y={expY}
                  width={barWidth}
                  height={expH}
                  rx="3"
                  className="fill-rose-500 transition-all hover:brightness-110"
                />

                {/* Net Profit Bar (Indigo if profit, Deep Red if deficit) */}
                <rect
                  x={groupX + (barWidth + 3) * 2}
                  y={profY}
                  width={barWidth}
                  height={profH}
                  rx="3"
                  className={`${
                    isProfit ? "fill-indigo-500 dark:fill-indigo-400" : "fill-red-700"
                  } transition-all hover:brightness-110`}
                />

                {/* Project Short Name on X-Axis */}
                <text
                  x={groupX + (barWidth + 3) * 1.5 - 1.5}
                  y={padding.top + plotHeight + 16}
                  textAnchor="middle"
                  className="text-[10px] font-bold fill-slate-700 dark:fill-slate-300"
                >
                  {item.shortName}
                </text>

                {/* Margin Badge / Subtext on X-Axis */}
                <text
                  x={groupX + (barWidth + 3) * 1.5 - 1.5}
                  y={padding.top + plotHeight + 28}
                  textAnchor="middle"
                  className={`text-[9px] font-mono font-bold ${
                    isProfit ? "fill-emerald-600 dark:fill-emerald-400" : "fill-rose-600 dark:fill-rose-400"
                  }`}
                >
                  {isProfit ? `+${item.margin.toFixed(0)}%` : `${item.margin.toFixed(0)}%`}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Floating Tooltip Card */}
        {hovered && (
          <div className="absolute top-2 right-4 bg-slate-900 text-white rounded-xl shadow-xl p-3 text-xs pointer-events-none z-10 border border-slate-700/60 max-w-xs animate-in fade-in">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="font-bold text-sm text-slate-100 line-clamp-1">{hovered.name}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold text-white shrink-0 ${
                  hovered.isProfitable ? "bg-emerald-600" : "bg-rose-600"
                }`}
              >
                {hovered.isProfitable ? "PROFITABLE" : "DEFICIT"}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mb-2">{hovered.code}</div>

            <div className="space-y-1.5 pt-1.5 border-t border-slate-800">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Total Income:</span>
                <span className="font-bold text-emerald-400">{formatCurrency(hovered.income)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Total Expense:</span>
                <span className="font-bold text-rose-400">{formatCurrency(hovered.expense)}</span>
              </div>
              <div className="flex justify-between gap-4 pt-1 border-t border-slate-800">
                <span className="text-slate-400">Net Profit / Margin:</span>
                <span
                  className={`font-black ${
                    hovered.isProfitable ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {hovered.profit >= 0 ? "+" : ""}
                  {formatCurrency(hovered.profit)} ({hovered.margin.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {data.length === 0 && (
        <div className="text-xs text-slate-400 text-center py-6">
          No project financial data available.
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. MILESTONE ACHIEVEMENT MATRIX (MASTER DONUT & PER-PROJECT MINI-DONUTS)
// ─────────────────────────────────────────────────────────────
export function MilestoneAchievementDashboard({ milestoneData }) {
  const [hoveredProject, setHoveredProject] = useState(null);

  const { overallPct = 0, totalAchieved = 0, grandTotal = 0, projectMilestones = [] } = milestoneData || {};

  // Master Big Donut constants
  const size = 230;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const achievedDash = (overallPct / 100) * circumference;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
      {/* LEFT: MASTER COMBINED BIG DONUT */}
      <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
        <div className="text-center mb-3">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Portfolio Milestone Progress
          </span>
          <p className="text-[11px] text-slate-500">
            Combined milestone delivery rate across {projectMilestones.length} projects
          </p>
        </div>

        {/* Master Donut SVG */}
        <div className="relative flex items-center justify-center shrink-0 my-2">
          <svg width={size} height={size} className="overflow-visible transform -rotate-90">
            {/* Background Track */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-slate-200 dark:text-slate-700/60"
            />
            {/* Achieved Arc */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="#10b981"
              strokeWidth={strokeWidth + 2}
              strokeDasharray={`${achievedDash} ${circumference - achievedDash}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>

          {/* Center Text KPI */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-4xl font-black text-slate-900 dark:text-slate-100">
              {overallPct}%
            </span>
            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-0.5">
              Achieved
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
              {totalAchieved} of {grandTotal} Milestones
            </span>
          </div>
        </div>

        {/* Status Breakdown Badges */}
        <div className="grid grid-cols-2 gap-2 w-full mt-4 text-xs">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between">
            <span className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
              <CheckCircle2 size={13} /> Achieved
            </span>
            <span className="font-extrabold text-emerald-900 dark:text-emerald-200">
              {totalAchieved}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1.5">
              <Clock size={13} /> Remaining
            </span>
            <span className="font-extrabold text-slate-800 dark:text-slate-200">
              {grandTotal - totalAchieved}
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT: PER-PROJECT MINI-DONUTS LIST */}
      <div className="lg:col-span-7 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Per-Project Milestone Delivery
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {projectMilestones.length} Projects Tracked
          </span>
        </div>

        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {projectMilestones.map((p) => {
            const isHovered = hoveredProject === p.id;
            const miniSize = 64;
            const miniStroke = 7;
            const miniRadius = (miniSize - miniStroke) / 2;
            const miniCircumference = 2 * Math.PI * miniRadius;
            const miniDash = (p.pct / 100) * miniCircumference;

            let toneBadge = "bg-slate-100 text-slate-700 border-slate-200";
            if (p.pct === 100) toneBadge = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300";
            else if (p.pct >= 60) toneBadge = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300";
            else if (p.pct >= 30) toneBadge = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300";
            else toneBadge = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300";

            return (
              <div
                key={p.id}
                onMouseEnter={() => setHoveredProject(p.id)}
                onMouseLeave={() => setHoveredProject(null)}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  isHovered
                    ? "bg-slate-50 dark:bg-slate-800/80 border-brand-300 dark:border-brand-700 shadow-xs"
                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                }`}
              >
                {/* Mini Donut */}
                <div className="relative shrink-0 flex items-center justify-center">
                  <svg width={miniSize} height={miniSize} className="transform -rotate-90">
                    <circle
                      cx={miniSize / 2}
                      cy={miniSize / 2}
                      r={miniRadius}
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth={miniStroke}
                      className="text-slate-200 dark:text-slate-800"
                    />
                    <circle
                      cx={miniSize / 2}
                      cy={miniSize / 2}
                      r={miniRadius}
                      fill="transparent"
                      stroke="#10b981"
                      strokeWidth={miniStroke}
                      strokeDasharray={`${miniDash} ${miniCircumference - miniDash}`}
                      strokeDashoffset={0}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-slate-800 dark:text-slate-200">
                    {p.pct}%
                  </span>
                </div>

                {/* Project Details */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-brand-700 dark:text-brand-300 px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-950/80 border border-brand-200/50 dark:border-brand-800/50 shrink-0">
                      {p.code}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {p.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{p.achieved} of {p.total} Milestones Delivered</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${toneBadge}`}>
                      {p.pct === 100 ? "Completed" : p.pct >= 60 ? "On Track" : p.pct >= 30 ? "In Progress" : "Pending Start"}
                    </span>
                  </div>

                  {/* Visual Milestone Step Indicators */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {Array.from({ length: p.total }).map((_, mIdx) => (
                      <span
                        key={mIdx}
                        className={`h-1.5 flex-1 rounded-full transition-all ${
                          mIdx < p.achieved
                            ? "bg-emerald-500"
                            : "bg-slate-200 dark:bg-slate-700"
                        }`}
                        title={`Milestone ${mIdx + 1}: ${mIdx < p.achieved ? "Achieved" : "Pending"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {projectMilestones.length === 0 && (
            <div className="text-xs text-slate-400 text-center py-6">
              No project milestones available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 6. SCHEDULE FORECAST & PROJECTED END DATE (DOUBLE LINE GRAPHS)
// ─────────────────────────────────────────────────────────────
export function ProjectScheduleForecastSection({ forecasts = [] }) {
  return (
    <div className="space-y-4">
      {/* Header Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
        <span className="text-slate-500 font-medium">
          Planned Baseline vs. Dynamic Velocity Projection (Per Project)
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-indigo-500"></span>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              Planned Schedule (Target)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-1 bg-emerald-500 rounded-full"></span>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              Actual Velocity &amp; Projected End Date
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Each project gets its OWN double line graph card */}
      <div className={`grid grid-cols-1 ${forecasts.length > 1 ? "md:grid-cols-2" : "grid-cols-1"} gap-4`}>
        {forecasts.map((f) => (
          <SingleProjectForecastCard key={f.id} forecast={f} />
        ))}

        {forecasts.length === 0 && (
          <div className="text-xs text-slate-400 text-center py-8">
            No schedule forecasting data available.
          </div>
        )}
      </div>
    </div>
  );
}

function SingleProjectForecastCard({ forecast }) {
  const {
    id,
    name,
    code,
    startDate,
    plannedEndDate,
    projectedEndDate,
    varianceDays,
    isDelayed,
    isComplete,
    dailyVelocity,
    comp,
  } = forecast;

  const today = new Date();

  // SVG Geometry
  const width = 500;
  const height = 150;
  const padding = { top: 25, right: 55, bottom: 35, left: 45 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  // Time domain mapping
  const minTime = startDate.getTime();
  const maxTime = Math.max(
    plannedEndDate.getTime(),
    projectedEndDate.getTime(),
    today.getTime() + 15 * 86400000
  ) + 7 * 86400000;
  const timeSpan = Math.max(1, maxTime - minTime);

  const getX = (time) => padding.left + Math.max(0, Math.min(plotW, ((time - minTime) / timeSpan) * plotW));
  const getY = (pct) => padding.top + plotH - (Math.min(100, Math.max(0, pct)) / 100) * plotH;

  const xStart = getX(minTime);
  const yStart = getY(0);

  const xPlanned = getX(plannedEndDate.getTime());
  const yPlanned = getY(100);

  const xToday = getX(today.getTime());
  const yToday = getY(comp);

  const xProjected = getX(projectedEndDate.getTime());
  const yProjected = getY(100);

  const formatDateStr = (d) => {
    if (!d || isNaN(d.getTime())) return "—";
    return d.toISOString().slice(0, 10);
  };

  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs space-y-3">
      {/* Card Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] font-bold text-brand-700 dark:text-brand-300 px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-950/80 border border-brand-200/50 dark:border-brand-800/50">
              {code}
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
              {name}
            </span>
          </div>
        </div>

        {/* Schedule Variance Pill */}
        <div className="shrink-0">
          {isComplete ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Delivered 100%
            </span>
          ) : isDelayed ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
              <AlertTriangle size={11} /> Delay: +{varianceDays}d
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <CheckCircle2 size={11} /> Ahead by {Math.abs(varianceDays)}d
            </span>
          )}
        </div>
      </div>

      {/* Date Key Figures Banner */}
      <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-[11px] border border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-slate-400 block text-[10px]">Planned End:</span>
          <span className="font-bold text-indigo-700 dark:text-indigo-300 font-mono">
            {formatDateStr(plannedEndDate)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">Projected End:</span>
          <span className={`font-bold font-mono ${isDelayed ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {formatDateStr(projectedEndDate)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">Velocity:</span>
          <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
            {dailyVelocity}%/day
          </span>
        </div>
      </div>

      {/* Dedicated SVG Double Line Graph */}
      <div className="relative overflow-x-auto pb-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none overflow-visible">
          {/* Gridlines for 0%, 50%, 100% */}
          {[0, 50, 100].map((pct) => {
            const y = getY(pct);
            return (
              <g key={pct}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + plotW}
                  y2={y}
                  className="stroke-slate-100 dark:stroke-slate-800"
                />
                <text
                  x={padding.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] font-mono fill-slate-400"
                >
                  {pct}%
                </text>
              </g>
            );
          })}

          {/* Today Indicator Line */}
          <line
            x1={xToday}
            y1={padding.top}
            x2={xToday}
            y2={padding.top + plotH}
            stroke="#94a3b8"
            strokeDasharray="2"
            strokeWidth="1"
            className="opacity-50"
          />
          <text
            x={xToday}
            y={padding.top - 6}
            textAnchor="middle"
            className="text-[8px] font-mono font-bold fill-slate-400 uppercase"
          >
            Today ({comp.toFixed(0)}%)
          </text>

          {/* LINE 1: Planned Schedule Baseline (Dashed Indigo) */}
          <line
            x1={xStart}
            y1={yStart}
            x2={xPlanned}
            y2={yPlanned}
            stroke="#6366f1"
            strokeDasharray="4"
            strokeWidth="2"
            className="opacity-80"
          />
          {/* Planned End Marker Circle */}
          <circle cx={xPlanned} cy={yPlanned} r="4.5" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5" />
          <text
            x={xPlanned}
            y={yPlanned - 8}
            textAnchor="middle"
            className="text-[9px] font-bold fill-indigo-600 dark:fill-indigo-400"
          >
            Planned
          </text>

          {/* LINE 2A: Actual Progress Curve (Solid Emerald) */}
          <line
            x1={xStart}
            y1={yStart}
            x2={xToday}
            y2={yToday}
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx={xToday} cy={yToday} r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />

          {/* LINE 2B: Projected Continuation (Dashed Trend to Projected End Date) */}
          <line
            x1={xToday}
            y1={yToday}
            x2={xProjected}
            y2={yProjected}
            stroke={isDelayed ? "#f43f5e" : "#10b981"}
            strokeDasharray="3"
            strokeWidth="2"
            className="opacity-90"
          />
          {/* Projected End Marker Circle */}
          <circle
            cx={xProjected}
            cy={yProjected}
            r="4.5"
            fill={isDelayed ? "#f43f5e" : "#10b981"}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <text
            x={xProjected}
            y={yProjected - 8}
            textAnchor="middle"
            className={`text-[9px] font-bold ${
              isDelayed ? "fill-rose-600 dark:fill-rose-400" : "fill-emerald-600 dark:fill-emerald-400"
            }`}
          >
            Forecast
          </text>

          {/* X Axis Timeline Labels */}
          <text
            x={xStart}
            y={padding.top + plotH + 16}
            textAnchor="start"
            className="text-[8px] font-mono fill-slate-400"
          >
            {formatDateStr(startDate)}
          </text>
          <text
            x={Math.max(xPlanned, xProjected)}
            y={padding.top + plotH + 16}
            textAnchor="end"
            className="text-[8px] font-mono fill-slate-400"
          >
            {formatDateStr(isDelayed ? projectedEndDate : plannedEndDate)}
          </text>
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SUBCONTRACTOR CONTRACTS COMPARATIVE BAR CHART & SUMMARY
// ─────────────────────────────────────────────────────────────
export function SubcontractorContractsChart({ subcontracts = [], valuations = [], selectedProjectName = null }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Compute financial totals and per-subcontract breakdown
  const processedData = useMemo(() => {
    return subcontracts.map((sc) => {
      const contractSum = Number(sc.contract_sum ?? sc.contract_value ?? 0);
      const advancePaid = Number(sc.advance_paid || 0);

      // Certified/paid valuations for this contract
      const contractValuations = valuations.filter(
        (v) => Number(v.subcontract_id) === Number(sc.id)
      );
      const valuationsTotal = contractValuations.reduce((sum, v) => {
        return sum + Number(v.net_payable ?? v.net_certified_amount ?? 0);
      }, 0);

      const totalPaid = advancePaid + valuationsTotal;
      const balance = Math.max(0, contractSum - totalPaid);
      const paidPct = contractSum > 0 ? Math.min(100, (totalPaid / contractSum) * 100) : 0;

      return {
        id: sc.id,
        number: sc.subcontract_number || sc.contract_no || `SC-${sc.id}`,
        name: sc.supplier_name || sc.subcontractor_name || "Specialist Contractor",
        projectName: sc.project_name || "Project",
        trade: sc.trade || sc.trade_category || "General Works",
        status: sc.status || "ACTIVE",
        contractSum,
        advancePaid,
        valuationsTotal,
        totalPaid,
        balance,
        paidPct,
      };
    });
  }, [subcontracts, valuations]);

  const summary = useMemo(() => {
    const totalContractSum = processedData.reduce((acc, c) => acc + c.contractSum, 0);
    const totalPaid = processedData.reduce((acc, c) => acc + c.totalPaid, 0);
    const totalBalance = processedData.reduce((acc, c) => acc + c.balance, 0);
    const overallPaidPct = totalContractSum > 0 ? (totalPaid / totalContractSum) * 100 : 0;
    return {
      totalContractSum,
      totalPaid,
      totalBalance,
      overallPaidPct,
      count: processedData.length,
    };
  }, [processedData]);

  const chartHeight = 240;
  const maxVal = Math.max(
    ...processedData.map((d) => Math.max(d.contractSum, d.totalPaid, d.balance)),
    1000
  );

  if (processedData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3 shadow-xs">
          <Briefcase size={22} />
        </div>
        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">
          No Subcontractor Agreements Recorded
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
          No subcontractor agreements are registered in the project portfolio yet.
        </p>
        <Link
          to="/project-management/subcontracts"
          className="btn btn-sm btn-primary inline-flex items-center gap-1.5 text-xs font-semibold"
        >
          <FileSpreadsheet size={14} /> Open Subcontractor Manager
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
          <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-400 font-bold mb-1">
            <span className="flex items-center gap-1.5">
              <DollarSign size={14} /> Total Contract Sums
            </span>
            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded font-mono">
              {summary.count} Subs
            </span>
          </div>
          <div className="text-lg font-black text-blue-950 dark:text-blue-100">
            {formatCurrency(summary.totalContractSum)}
          </div>
          <div className="text-[11px] text-blue-600/80 dark:text-blue-300/80 mt-0.5">
            Total contracted value awarded across portfolio
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40">
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-bold mb-1">
            <span className="flex items-center gap-1.5">
              <CreditCard size={14} /> Amount Paid to Subs
            </span>
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded font-mono">
              {summary.overallPaidPct.toFixed(1)}% Disbursed
            </span>
          </div>
          <div className="text-lg font-black text-emerald-950 dark:text-emerald-100">
            {formatCurrency(summary.totalPaid)}
          </div>
          <div className="text-[11px] text-emerald-600/80 dark:text-emerald-300/80 mt-0.5">
            Advances + certified interim payments
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
          <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 font-bold mb-1">
            <span className="flex items-center gap-1.5">
              <Wallet size={14} /> Outstanding Balance
            </span>
            <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-mono">
              {(100 - summary.overallPaidPct).toFixed(1)}% Remaining
            </span>
          </div>
          <div className="text-lg font-black text-amber-950 dark:text-amber-100">
            {formatCurrency(summary.totalBalance)}
          </div>
          <div className="text-[11px] text-amber-600/80 dark:text-amber-300/80 mt-0.5">
            Payable upon milestone completion
          </div>
        </div>
      </div>

      {/* Legend & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-800 dark:bg-slate-300"></span>
            <span className="text-slate-600 dark:text-slate-400 font-medium">Contract Sum</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span>
            <span className="text-slate-600 dark:text-slate-400 font-medium">Amount Paid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-500"></span>
            <span className="text-slate-600 dark:text-slate-400 font-medium">Balance</span>
          </div>
        </div>

        <Link
          to="/project-management/subcontracts"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-900 dark:text-brand-400 hover:underline"
        >
          <span>Open Subcontractor Manager</span>
          <ChevronRight size={13} />
        </Link>
      </div>

      {/* SVG Comparative Grouped Bar Chart */}
      <div className="relative overflow-x-auto pb-2">
        <svg
          className="w-full overflow-visible"
          style={{ minWidth: `${Math.max(480, processedData.length * 105)}px`, height: `${chartHeight}px` }}
        >
          {/* Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const plotH = chartHeight - 50;
            const y = plotH - pct * plotH + 10;
            const valLabel = Math.round(maxVal * pct);
            return (
              <g key={idx}>
                <line
                  x1="55"
                  y1={y}
                  x2="100%"
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800/80 stroke-dasharray-2"
                />
                <text
                  x="48"
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-slate-400 font-mono"
                >
                  {valLabel >= 1000 ? `${(valLabel / 1000).toFixed(0)}k` : valLabel}
                </text>
              </g>
            );
          })}

          {/* Grouped Bars */}
          {processedData.map((d, idx) => {
            const groupWidth = 85;
            const barWidth = 18;
            const gap = 4;
            const plotH = chartHeight - 50;
            const startX = 65 + idx * (groupWidth + 25);

            const sumHeight = maxVal > 0 ? (d.contractSum / maxVal) * plotH : 0;
            const paidHeight = maxVal > 0 ? (d.totalPaid / maxVal) * plotH : 0;
            const balHeight = maxVal > 0 ? (d.balance / maxVal) * plotH : 0;

            const sumY = plotH - sumHeight + 10;
            const paidY = plotH - paidHeight + 10;
            const balY = plotH - balHeight + 10;

            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={d.id}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                {/* Hover Backdrop Pill */}
                {isHovered && (
                  <rect
                    x={startX - 8}
                    y="5"
                    width={groupWidth + 16}
                    height={plotH + 40}
                    rx="10"
                    className="fill-slate-100/60 dark:fill-slate-800/40"
                  />
                )}

                {/* Bar 1: Contract Sum */}
                <rect
                  x={startX}
                  y={sumY}
                  width={barWidth}
                  height={Math.max(2, sumHeight)}
                  rx="3"
                  className="fill-slate-800 dark:fill-slate-300 transition-all duration-300"
                />

                {/* Bar 2: Amount Paid */}
                <rect
                  x={startX + barWidth + gap}
                  y={paidY}
                  width={barWidth}
                  height={Math.max(2, paidHeight)}
                  rx="3"
                  className="fill-emerald-500 transition-all duration-300"
                />

                {/* Bar 3: Balance Remaining */}
                <rect
                  x={startX + (barWidth + gap) * 2}
                  y={balY}
                  width={barWidth}
                  height={Math.max(2, balHeight)}
                  rx="3"
                  className="fill-amber-500 transition-all duration-300"
                />

                {/* Subcontractor Short Label */}
                <text
                  x={startX + (groupWidth / 2) - 10}
                  y={plotH + 26}
                  textAnchor="middle"
                  className="text-[10px] font-semibold fill-slate-700 dark:fill-slate-300"
                >
                  {d.name.length > 11 ? `${d.name.slice(0, 10)}…` : d.name}
                </text>
                <text
                  x={startX + (groupWidth / 2) - 10}
                  y={plotH + 38}
                  textAnchor="middle"
                  className="text-[9px] font-mono fill-slate-400"
                >
                  {d.paidPct.toFixed(0)}% paid
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && processedData[hoveredIndex] && (
          <div className="absolute top-2 right-2 bg-slate-900/95 text-white rounded-xl shadow-xl p-3 text-xs pointer-events-none z-10 border border-slate-700 max-w-xs animate-in fade-in">
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="font-bold text-slate-100 truncate">{processedData[hoveredIndex].name}</span>
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-300">
                {processedData[hoveredIndex].number}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mb-1">
              {processedData[hoveredIndex].trade} • {processedData[hoveredIndex].projectName}
            </div>

            <div className="space-y-1 pt-1 border-t border-slate-800 text-[11px]">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Contract Sum:</span>
                <span className="font-bold text-slate-100">{formatCurrency(processedData[hoveredIndex].contractSum)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-emerald-400">Amount Paid:</span>
                <span className="font-bold text-emerald-400">
                  {formatCurrency(processedData[hoveredIndex].totalPaid)} ({processedData[hoveredIndex].paidPct.toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-amber-400">Balance:</span>
                <span className="font-bold text-amber-400">{formatCurrency(processedData[hoveredIndex].balance)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subcontractor Detailed Breakdown Rows */}
      <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
          Subcontractor Disbursement Status
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {processedData.slice(0, 6).map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="min-w-0 pr-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {item.trade} • {item.projectName}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {item.paidPct.toFixed(0)}% Paid
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${item.paidPct}%` }}
                  title={`Paid: ${formatCurrency(item.totalPaid)}`}
                />
                <div
                  className="h-full bg-amber-400/80 transition-all duration-500"
                  style={{ width: `${100 - item.paidPct}%` }}
                  title={`Balance: ${formatCurrency(item.balance)}`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <span className="text-slate-500 dark:text-slate-400">
                  Sum: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(item.contractSum)}</strong>
                </span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  Paid: <strong>{formatCurrency(item.totalPaid)}</strong>
                </span>
                <span className="text-amber-600 dark:text-amber-400">
                  Bal: <strong>{formatCurrency(item.balance)}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PROJECT PORTFOLIO DASHBOARD FOR HOMEPAGE
// ─────────────────────────────────────────────────────────────
export default function HomeProjectBasicDashboard({
  user,
  selectedScope: propScope,
  onScopeChange,
  hideScopeSelector = false,
}) {
  const [loading, setLoading] = useState(true);
  const [internalScope, setInternalScope] = useState("ALL");
  const selectedScope = propScope !== undefined ? propScope : internalScope;
  const setSelectedScope = onScopeChange || setInternalScope;
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [budgetRows, setBudgetRows] = useState([]);
  const [subcontracts, setSubcontracts] = useState([]);
  const [valuations, setValuations] = useState([]);
  const [financialReports, setFinancialReports] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [milestones, setMilestones] = useState([]);

  useEffect(() => {
    let active = true;
    const fetchInitial = async () => {
      setLoading(true);
      try {
        const [pRes, tRes, bRes, scRes, valRes, repRes, invRes, mRes] = await Promise.allSettled([
          api.get("/projects/projects?active=all"),
          api.get("/projects/tasks"),
          api.get("/projects/budget-vs-actual"),
          api.get("/construction/subcontracts"),
          api.get("/construction/subcontract-valuations"),
          api.get("/projects/reports/project-expense-income"),
          api.get("/projects/project-invoices"),
          api.get("/projects/milestones"),
        ]);

        if (!active) return;

        const prjList = pRes.status === "fulfilled" ? pRes.value.data?.items || pRes.value.data || [] : [];
        const taskList = tRes.status === "fulfilled" ? tRes.value.data?.items || tRes.value.data || [] : [];
        const bList = bRes.status === "fulfilled" ? bRes.value.data?.items || [] : [];
        const scList = scRes.status === "fulfilled" ? scRes.value.data?.items || [] : [];
        const valList = valRes.status === "fulfilled" ? valRes.value.data?.items || [] : [];
        const repData = repRes.status === "fulfilled" ? repRes.value.data || null : null;
        const invList = invRes.status === "fulfilled" ? invRes.value.data?.items || invRes.value.data || [] : [];
        const mList = mRes.status === "fulfilled" ? mRes.value.data?.items || [] : [];

        setProjects(prjList);
        setTasks(taskList);
        setBudgetRows(bList);
        setSubcontracts(scList);
        setValuations(valList);
        setFinancialReports(repData);
        setInvoices(invList);
        setMilestones(mList);
      } catch (err) {
        console.error("Failed to load portfolio metrics:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchInitial();

    return () => {
      active = false;
    };
  }, [user]);

  // Scoped Data
  const scopedData = useMemo(() => {
    const isAll = selectedScope === "ALL";
    const pId = Number(selectedScope);

    const filteredProjects = isAll ? projects : projects.filter((p) => Number(p.id) === pId);
    const filteredTasks = isAll ? tasks : tasks.filter((t) => Number(t.project_id) === pId);
    const filteredBudgetRows = isAll ? budgetRows : budgetRows.filter((b) => Number(b.id) === pId);
    const filteredSubcontracts = isAll ? subcontracts : subcontracts.filter((sc) => Number(sc.project_id) === pId);
    const filteredValuations = isAll
      ? valuations
      : valuations.filter((v) => Number(v.project_id) === pId || filteredSubcontracts.some((sc) => Number(sc.id) === Number(v.subcontract_id)));

    // Task counts
    const taskCounts = { COMPLETED: 0, IN_PROGRESS: 0, PENDING: 0, BLOCKED: 0, CANCELLED: 0 };
    filteredTasks.forEach((t) => {
      const st = (t.status || "PENDING").toUpperCase();
      if (st.includes("COMPLET")) taskCounts.COMPLETED++;
      else if (st.includes("PROGRESS") || st.includes("ACTIVE")) taskCounts.IN_PROGRESS++;
      else if (st.includes("BLOCK") || st.includes("HOLD")) taskCounts.BLOCKED++;
      else if (st.includes("CANCEL")) taskCounts.CANCELLED++;
      else taskCounts.PENDING++;
    });

    // Portfolio average completion
    const totalComp = filteredProjects.reduce((acc, p) => acc + Number(p.completion_percent || 0), 0);
    const portfolioAvg = filteredProjects.length > 0 ? totalComp / filteredProjects.length : 0;

    // Cost series for CostBarChart
    const costSeries = filteredBudgetRows.map((b) => ({
      id: b.id,
      name: b.project_name,
      code: b.project_code,
      shortName: b.project_code || (b.project_name ? b.project_name.slice(0, 10) : `P${b.id}`),
      budget: Number(b.budget || 0),
      spent: Number(b.total_spent || b.total_expense || 0),
    }));

    // Financial Series for ProjectProfitabilityChart (Income, Expense, Profit)
    const projectSummaries = financialReports?.projectSummary || [];
    const invItems = Array.isArray(invoices) ? invoices : [];

    const financialSeries = filteredProjects.map((p) => {
      const bRow = filteredBudgetRows.find((b) => Number(b.id) === Number(p.id));
      const pSum = projectSummaries.find((s) => Number(s.id) === Number(p.id));
      const pInvoices = invItems.filter((inv) => Number(inv.project_id) === Number(p.id));

      // 1. Income
      let invoiceTotal = pInvoices.reduce((sum, inv) => sum + Number(inv.net_amount || inv.total_amount || 0), 0);
      let voucherIncome = Number(pSum?.total_income || 0);
      let recognizedIncome = invoiceTotal > 0 ? invoiceTotal : voucherIncome;
      if (recognizedIncome === 0 && Number(p.budget || 0) > 0) {
        const comp = Number(p.completion_percent || 0);
        recognizedIncome = comp > 0 ? (Number(p.budget) * (comp / 100)) : Number(p.budget);
      }

      // 2. Expense
      let directSpent = Number(bRow?.total_spent || 0);
      let voucherExpense = Number(pSum?.total_expense || 0);
      let subValuations = filteredValuations
        .filter((v) => Number(v.project_id) === Number(p.id))
        .reduce((s, v) => s + Number(v.net_payable ?? v.net_certified_amount ?? 0), 0);
      let totalExpense = Math.max(directSpent + subValuations, voucherExpense);

      // 3. Profit
      let profit = recognizedIncome - totalExpense;
      let margin = recognizedIncome > 0 ? (profit / recognizedIncome) * 100 : (profit < 0 ? -100 : 0);

      return {
        id: p.id,
        name: p.project_name,
        code: p.project_code || `PRJ-${p.id}`,
        shortName: p.project_code || (p.project_name ? p.project_name.slice(0, 10) : `P${p.id}`),
        budget: Number(p.budget || 0),
        income: recognizedIncome,
        expense: totalExpense,
        profit,
        margin,
        isProfitable: profit >= 0,
      };
    });

    // 1. Milestone Achievement Data (Master combined + per-project)
    const projectMilestones = filteredProjects.map((p) => {
      const pReal = (milestones || []).filter((m) => Number(m.project_id) === Number(p.id));
      if (pReal.length > 0) {
        const achieved = pReal.filter(
          (m) =>
            String(m.status || "").toUpperCase() === "ACHIEVED" ||
            String(m.status || "").toUpperCase() === "COMPLETED"
        ).length;
        const total = pReal.length;
        const pct = total > 0 ? Math.round((achieved / total) * 100) : 0;
        return {
          id: p.id,
          name: p.project_name,
          code: p.project_code || `PRJ-${p.id}`,
          achieved,
          total,
          pct,
        };
      }

      // If no explicit pm_milestones records yet, synthesize from standard project stages
      const comp = Number(p.completion_percent || 0);
      const stageThresholds = [20, 40, 60, 80, 100];
      const achieved = stageThresholds.filter((t) => comp >= t).length;
      const total = stageThresholds.length;
      const pct = Math.round((achieved / total) * 100);

      return {
        id: p.id,
        name: p.project_name,
        code: p.project_code || `PRJ-${p.id}`,
        achieved,
        total,
        pct,
      };
    });

    const totalAchieved = projectMilestones.reduce((acc, p) => acc + p.achieved, 0);
    const grandTotal = projectMilestones.reduce((acc, p) => acc + p.total, 0) || 1;
    const overallPct = Math.round((totalAchieved / grandTotal) * 100);

    const milestoneData = {
      overallPct,
      totalAchieved,
      grandTotal,
      projectMilestones,
    };

    // 2. Schedule Forecasting Data (Planned date vs. Projected date per project)
    const today = new Date();
    const forecastData = filteredProjects.map((p) => {
      let startDate = p.start_date ? new Date(p.start_date) : new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
      let plannedEndDate = p.end_date ? new Date(p.end_date) : new Date(today.getTime() + 120 * 24 * 60 * 60 * 1000);

      if (isNaN(startDate.getTime())) startDate = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
      if (isNaN(plannedEndDate.getTime()) || plannedEndDate <= startDate) {
        plannedEndDate = new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000);
      }

      const comp = Math.min(100, Math.max(0, Number(p.completion_percent || 0)));
      const elapsedDays = Math.max(1, Math.round((today - startDate) / (1000 * 60 * 60 * 24)));
      const totalPlannedDays = Math.max(1, Math.round((plannedEndDate - startDate) / (1000 * 60 * 60 * 24)));

      const dailyVelocity = comp > 0 ? comp / elapsedDays : (100 / totalPlannedDays) * 0.7;
      const remainingWork = 100 - comp;
      const daysNeeded = Math.round(remainingWork / Math.max(0.08, dailyVelocity));

      const projectedEndDate = new Date(today.getTime() + daysNeeded * 24 * 60 * 60 * 1000);
      const varianceDays = Math.round((projectedEndDate - plannedEndDate) / (1000 * 60 * 60 * 24));
      const isDelayed = varianceDays > 0;
      const isComplete = comp >= 100;

      return {
        id: p.id,
        name: p.project_name,
        code: p.project_code || `PRJ-${p.id}`,
        startDate,
        plannedEndDate,
        projectedEndDate,
        varianceDays,
        isDelayed,
        isComplete,
        dailyVelocity: dailyVelocity.toFixed(2),
        comp,
      };
    });

    // Active project name label if single selected
    const singleProj = !isAll ? projects.find((p) => Number(p.id) === pId) : null;

    return {
      isAll,
      singleProj,
      projects: filteredProjects,
      tasks: filteredTasks,
      taskCounts,
      budgetRows: filteredBudgetRows,
      subcontracts: filteredSubcontracts,
      valuations: filteredValuations,
      portfolioAvg,
      costSeries,
      financialSeries,
      milestoneData,
      forecastData,
    };
  }, [selectedScope, projects, tasks, budgetRows, subcontracts, valuations, financialReports, invoices, milestones]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <RefreshCw size={24} className="animate-spin text-brand-600 dark:text-brand-400" />
        <span className="text-xs font-semibold text-slate-500">
          Loading project portfolio dashboards…
        </span>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950 flex items-center justify-center text-brand-600 dark:text-brand-400 mx-auto">
          <FolderGit2 size={26} />
        </div>
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
          No Projects Available
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No project records were found. Create a project in Project Management to view operational telemetry.
        </p>
        <Link
          to="/project-management/projects"
          className="btn btn-sm btn-primary inline-flex items-center gap-1.5 text-xs font-semibold"
        >
          Open Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. ELEGANT PORTFOLIO SCOPE SELECTOR */}
      {!hideScopeSelector && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 sm:px-5 sm:py-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200/60 dark:border-brand-800/60 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0 shadow-2xs">
              <Filter size={17} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="relative inline-block w-full sm:w-auto">
                <select
                  id="portfolio-scope-select"
                  value={selectedScope}
                  onChange={(e) => setSelectedScope(e.target.value)}
                  className="w-full sm:w-auto min-w-[260px] md:min-w-[340px] appearance-none bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-900 dark:text-white font-black text-sm sm:text-base border border-slate-300 dark:border-slate-700 rounded-xl pl-3.5 pr-10 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer shadow-2xs transition-colors"
                >
                  <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold">
                    All Projects (Portfolio View)
                  </option>
                  {projects.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold py-1.5"
                    >
                      {p.project_name} {p.project_code ? `(${p.project_code})` : ""}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 dark:text-slate-400">
                  <ChevronDown size={18} />
                </div>
              </div>
            </div>
          </div>

          {/* Portfolio Live Scope Summary Pill */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>
                {scopedData.isAll
                  ? `${projects.length} Projects • ${tasks.length} Tasks`
                  : `${scopedData.singleProj?.project_name || "Project"} • ${scopedData.tasks.length} Tasks`}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* 2. ROW 1: PROJECT PROFITABILITY & PROJECT EXECUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Profitability: Expense, Income & Profit per Project */}
        <SectionCard
          title="Project Profitability & P&L"
          subtitle={
            scopedData.isAll
              ? `Comparative revenue, expenses, and net profit margins across ${projects.length} projects`
              : `Income, expenditure, and net operating margin for ${scopedData.singleProj?.project_name}`
          }
        >
          <ProjectProfitabilityChart
            data={scopedData.financialSeries}
            height={290}
          />
        </SectionCard>

        {/* Project Execution & Work Velocity (Replaces Resource Workload) */}
        <SectionCard
          title="Project Execution & Work Delivery"
          subtitle={
            scopedData.isAll
              ? `Delivery progress & task velocity across ${projects.length} projects`
              : `Delivery breakdown by work package for ${scopedData.singleProj?.project_name}`
          }
        >
          <ProjectExecutionHorizontalBarChart
            projects={scopedData.projects}
            tasks={scopedData.tasks}
            isAll={scopedData.isAll}
          />
        </SectionCard>
      </div>

      {/* 3. ROW 2: PORTFOLIO DELIVERY HEALTH & RISK */}
      <SectionCard
        title="Portfolio Delivery Health & Risk"
        subtitle={
          scopedData.isAll
            ? `Delivery confidence and schedule/budget risk rating across ${projects.length} projects`
            : `Delivery confidence & task risk for ${scopedData.singleProj?.project_name}`
        }
      >
        <PortfolioDeliveryHealthDonutChart
          projects={scopedData.budgetRows}
          tasks={scopedData.tasks}
          isAll={scopedData.isAll}
        />
      </SectionCard>

      {/* 4. ROW 3: MILESTONE ACHIEVEMENT MATRIX (MASTER DONUT & PER-PROJECT MINI-DONUTS) */}
      <SectionCard
        title="Milestone Achievement Matrix"
        subtitle={
          scopedData.isAll
            ? `Portfolio milestone delivery (${scopedData.milestoneData?.totalAchieved || 0} of ${scopedData.milestoneData?.grandTotal || 0} achieved) with per-project breakdown`
            : `Milestone delivery status for ${scopedData.singleProj?.project_name}`
        }
      >
        <MilestoneAchievementDashboard
          milestoneData={scopedData.milestoneData}
          isAll={scopedData.isAll}
        />
      </SectionCard>

      {/* 5. ROW 4: SCHEDULE FORECASTING & PROJECTED COMPLETION (PER-PROJECT DOUBLE LINE GRAPH) */}
      <SectionCard
        title="Schedule Forecast & Completion Projection"
        subtitle={
          scopedData.isAll
            ? "Projected completion dates vs. contract end dates per project based on delivery velocity"
            : `Projected completion date vs. contract end date for ${scopedData.singleProj?.project_name}`
        }
      >
        <ProjectScheduleForecastSection
          forecasts={scopedData.forecastData}
          isAll={scopedData.isAll}
        />
      </SectionCard>

      {/* 6. ROW 5: COST & BUDGET VARIANCE (COMPARATIVE BAR CHART) */}
      <SectionCard
        title="Cost & Budget Variance"
        subtitle={
          scopedData.isAll
            ? "Approved budget vs. actual expenditure across all projects"
            : `Cost variance for ${scopedData.singleProj?.project_name}`
        }
      >
        <CostBarChart data={scopedData.costSeries} height={290} />
      </SectionCard>

      {/* 7. ROW 6: SUBCONTRACTOR CONTRACTS & PAYMENT BALANCES */}
      <SectionCard
        title="Subcontractor Contracts & Payment Balances"
        subtitle={
          scopedData.isAll
            ? "Contract sums, amount paid, and outstanding balances across all subcontractors"
            : `Subcontractor contracts for ${scopedData.singleProj?.project_name}`
        }
      >
        <SubcontractorContractsChart
          subcontracts={scopedData.subcontracts}
          valuations={scopedData.valuations}
          selectedProjectName={scopedData.singleProj?.project_name}
        />
      </SectionCard>

      {/* 8. ROW 7: EARNED VALUE EFFICIENCY MATRIX (CPI vs. SPI) - BOTTOM OF HOMEPAGE */}
      <SectionCard
        title="Earned Value Efficiency Matrix (CPI vs. SPI)"
        subtitle="Cost Performance Index (CPI) vs. Schedule Performance Index (SPI)"
      >
        <EarnedValueEfficiencyBubbleChart
          projects={scopedData.budgetRows}
          height={320}
        />
      </SectionCard>
    </div>
  );
}
