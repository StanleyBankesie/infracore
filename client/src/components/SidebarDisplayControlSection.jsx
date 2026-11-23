import React, { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { toast } from "react-toastify";
import {
  Menu,
  Layers,
  FolderTree,
  FileText,
  CheckCircle2,
  Sparkles,
  Loader2,
  Check,
} from "lucide-react";

export default function SidebarDisplayControlSection() {
  const [mode, setMode] = useState(() => {
    try {
      if (typeof localStorage !== "undefined") {
        const cached = localStorage.getItem("omnisuite.sidebar_display_mode");
        if (cached && ["MODULES", "SECTIONS", "PAGES"].includes(cached.toUpperCase())) {
          return cached.toUpperCase();
        }
      }
    } catch {}
    return "MODULES";
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadMode() {
      try {
        setLoading(true);
        const res = await api.get("/admin/settings/sidebar-display-mode");
        if (!mounted) return;
        const currentMode = String(res.data?.sidebar_display_mode || "MODULES").toUpperCase();
        if (["MODULES", "SECTIONS", "PAGES"].includes(currentMode)) {
          setMode(currentMode);
          try {
            if (typeof localStorage !== "undefined") {
              localStorage.setItem("omnisuite.sidebar_display_mode", currentMode);
            }
          } catch {}
        }
      } catch (err) {
        console.error("Failed to load sidebar display mode:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadMode();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSelectMode(selectedMode) {
    if (saving) return;
    const normalized = String(selectedMode).toUpperCase();
    setMode(normalized);

    // 1. Instantly update localStorage
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("omnisuite.sidebar_display_mode", normalized);
      }
    } catch {}

    // 2. Dispatch real-time global event so AppShell and all tabs update immediately
    window.dispatchEvent(
      new CustomEvent("sidebar-display-mode-changed", { detail: { mode: normalized } })
    );

    // 3. Persist to database
    setSaving(true);
    try {
      await api.post("/admin/settings/sidebar-display-mode", {
        sidebar_display_mode: normalized,
      });
      const modeLabels = {
        MODULES: "Module Names",
        SECTIONS: "Sub-modules / Sections",
        PAGES: "Page Names",
      };
      toast.success(
        `Side menu updated to "${modeLabels[normalized] || normalized}"!`
      );
    } catch (err) {
      console.error("Failed to save sidebar display mode:", err);
      toast.error(err?.response?.data?.message || "Failed to save sidebar display mode");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await api.post("/admin/settings/sidebar-display-mode", {
        sidebar_display_mode: mode,
      });
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("omnisuite.sidebar_display_mode", mode);
        }
        window.dispatchEvent(
          new CustomEvent("sidebar-display-mode-changed", { detail: { mode } })
        );
      } catch {}
      const modeLabels = {
        MODULES: "Module Names",
        SECTIONS: "Sub-modules / Sections",
        PAGES: "Page Names",
      };
      toast.success(
        `Side menu updated to "${modeLabels[mode] || mode}"!`
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save sidebar display mode");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="card-body space-y-5">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
              <Menu className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              Side Menu Bar Navigation Display
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Choose what should be displayed in the side navigation bar across the system: Module Names, Sub-modules / Sections, or Individual Page Names.
            </div>
          </div>
          {loading ? (
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" /> Loading setting...
            </span>
          ) : (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                mode === "MODULES"
                  ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                  : mode === "SECTIONS"
                  ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              }`}
            >
              <CheckCircle2 size={13} />
              Current: {mode === "MODULES" ? "Module Names" : mode === "SECTIONS" ? "Sub-modules / Sections" : "Page Names"}
            </span>
          )}
        </div>

        {/* 3 Selectable Display Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Module Names */}
          <div
            onClick={() => handleSelectMode("MODULES")}
            className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              mode === "MODULES"
                ? "border-blue-600 bg-blue-50/20 dark:bg-blue-950/20 shadow-md ring-1 ring-blue-500/30"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/40"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      mode === "MODULES"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <Layers size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Module Names
                    </h3>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                      Top-Level Navigation
                    </span>
                  </div>
                </div>
                <input
                  type="radio"
                  name="sidebar_display_mode"
                  checked={mode === "MODULES"}
                  onChange={() => handleSelectMode("MODULES")}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Displays top-level module names directly in the menu bar. Clicking a module navigates straight to that module&apos;s home.
              </p>

              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                Sales Management • Asset Management • Finance • Project Management
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Check size={12} className="text-blue-500 font-bold" /> Clean, high-level suite view
                </div>
                <div className="flex items-center gap-1.5">
                  <Check size={12} className="text-blue-500 font-bold" /> Compact single-tier menu
                </div>
                <div className="flex items-center gap-1.5">
                  <Check size={12} className="text-blue-500 font-bold" /> Direct navigation to module homes
                </div>
              </div>
            </div>
          </div>

          {/* 2. Sub-module / Section Names */}
          <div
            onClick={() => handleSelectMode("SECTIONS")}
            className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              mode === "SECTIONS"
                ? "border-amber-600 bg-amber-50/20 dark:bg-amber-950/20 shadow-md ring-1 ring-amber-500/30"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/40"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      mode === "SECTIONS"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <FolderTree size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Sub-modules / Sections
                    </h3>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      Category &amp; Workflows
                    </span>
                  </div>
                </div>
                <input
                  type="radio"
                  name="sidebar_display_mode"
                  checked={mode === "SECTIONS"}
                  onChange={() => handleSelectMode("SECTIONS")}
                  className="h-4 w-4 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Displays only the module sections (subsets of modules) directly in the menu bar. Clicking a section navigates straight to that section.
              </p>

              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                Customer Management • Sales Transactions • Pricing &amp; Discounts
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Check size={12} className="text-amber-500 font-bold" /> Displays only module sections
                </div>
                <div className="flex items-center gap-1.5">
                  <Check size={12} className="text-amber-500 font-bold" /> Grouped by module subsets
                </div>
                <div className="flex items-center gap-1.5">
                  <Check size={12} className="text-amber-500 font-bold" /> Fast jump into specific module sections
                </div>
              </div>
            </div>
          </div>

          {/* 3. Page Names */}
          <div
            onClick={() => handleSelectMode("PAGES")}
            className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              mode === "PAGES"
                ? "border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-md ring-1 ring-emerald-500/30"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/40"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      mode === "PAGES"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Page Names
                    </h3>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Direct Operational Pages
                    </span>
                  </div>
                </div>
                <input
                  type="radio"
                  name="sidebar_display_mode"
                  checked={mode === "PAGES"}
                  onChange={() => handleSelectMode("PAGES")}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Displays only the individual pages directly in the menu bar. Users can access setup and operational pages in a single click.
              </p>

              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                Customer Setup • Item Setup • Price Setup • Quotations • Invoices
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-500 font-bold" /> Displays only operational pages
                </div>
                <div className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-500 font-bold" /> Direct one-click page navigation
                </div>
                <div className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald-500 font-bold" /> Ideal for data entry &amp; power users
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles size={14} className="text-brand-500 shrink-0" />
            Selection updates the side menu navigation instantly across the application.
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white shadow-xs transition"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Saving Settings...
              </>
            ) : (
              "Save Side Menu Setting"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
