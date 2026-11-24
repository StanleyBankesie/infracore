/**
 * @fileoverview A table header component that supports clickable sorting.
 * Displays interactive up/down arrows indicating the current sort direction.
 */

import React from "react";
import { ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";

/**
 * Determines the justify-content class based on text alignment classes.
 * @param {string} className - The CSS classes.
 * @returns {string} The justify class string.
 */
function getJustifyClass(className) {
  if (className.includes("text-right")) return "justify-end";
  if (className.includes("text-center")) return "justify-center";
  return "justify-start";
}

/**
 * SortableHeader component
 * 
 * @param {Object} props
 * @param {string} props.label - The visible text label for the column header.
 * @param {string} props.sortKey - The underlying data key associated with this column.
 * @param {string} props.currentKey - The key that is currently being sorted by the table.
 * @param {string} props.direction - The current sort direction ('asc' or 'desc').
 * @param {Function} props.onToggle - Callback triggered when the header is clicked, passing the `sortKey`.
 * @param {string} [props.className=""] - Additional CSS classes.
 * @returns {JSX.Element} The rendered table header cell (`<th>`).
 */
export default function SortableHeader({
  label,
  sortKey,
  currentKey,
  direction,
  onToggle,
  className = "",
}) {
  const active = currentKey === sortKey;
  const justifyClass = getJustifyClass(className);
  const ariaSort = active
    ? direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  const renderIcon = () => {
    if (!active) {
      return (
        <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 opacity-70 group-hover:opacity-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-all duration-150 shrink-0 ml-1.5" />
      );
    }
    return direction === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400 opacity-100 font-bold shrink-0 ml-1.5 transition-transform duration-200" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400 opacity-100 font-bold shrink-0 ml-1.5 transition-transform duration-200" />
    );
  };

  const textColorClass = className.includes("text-white") 
    ? (active ? "text-white font-extrabold" : "text-white font-bold group-hover:text-white")
    : (active ? "text-brand-600 dark:text-brand-400 font-bold" : "text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white");

  const hasExplicitBg = className.includes("bg-");
  const bgClass = hasExplicitBg
    ? ""
    : active
      ? "bg-slate-100/90 dark:bg-slate-800 shadow-[inset_0_-1px_0_#cbd5e1] dark:shadow-[inset_0_-1px_0_#475569]"
      : "bg-slate-50/95 dark:bg-slate-900/95 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 shadow-[inset_0_-1px_0_#e2e8f0] dark:shadow-[inset_0_-1px_0_#334155]";

  return (
    <th
      data-sortable-react="true"
      className={`sticky top-0 z-20 select-none font-semibold transition-colors group ${bgClass} ${className}`}
      title={`Sort by ${label}`}
      aria-sort={ariaSort}
    >
      <button
        type="button"
        className={`flex w-full items-center gap-1.5 ${justifyClass} bg-transparent py-3 px-2 outline-none rounded-md`}
        onClick={() => onToggle(sortKey)}
      >
        <span className={textColorClass}>
          {label}
        </span>
        <span className="inline-flex items-center shrink-0" aria-hidden="true">
          {renderIcon()}
        </span>
      </button>
    </th>
  );
}
