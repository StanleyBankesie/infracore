import React, { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { toast } from "react-toastify";
import {
  MessageSquare,
  Eye,
  EyeOff,
  Loader2,
  Check,
} from "lucide-react";

/**
 * FloatingChatControlSection component.
 * Allows toggling the floating chat widget on and off across the application from the frontend.
 * Features an explicit Action Button, an Apple HIG high-contrast toggle switch,
 * and clickable mode cards so users can effortlessly find and change the setting.
 */
export default function FloatingChatControlSection() {
  const [enabled, setEnabled] = useState(() => {
    try {
      if (typeof localStorage !== "undefined") {
        const v = localStorage.getItem("omnisuite.floating_chat_enabled");
        if (v !== null) return v === "true";
      }
    } catch {}
    return true;
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadSetting() {
      try {
        setLoading(true);
        const res = await api.get("/admin/settings/floating-chat");
        if (!mounted) return;
        if (res.data?.enabled !== undefined) {
          const isEn = Boolean(res.data.enabled);
          setEnabled(isEn);
          try {
            if (typeof localStorage !== "undefined") {
              localStorage.setItem("omnisuite.floating_chat_enabled", String(isEn));
            }
          } catch {}
        }
      } catch (err) {
        console.error("Failed to load floating chat setting:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadSetting();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleToggle(checked) {
    if (saving) return;
    setSaving(true);
    setEnabled(checked);

    // 1. Instantly update localStorage
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("omnisuite.floating_chat_enabled", String(checked));
      }
    } catch {}

    // 2. Dispatch live event so floating chat widget updates without reload
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("omni.floating_chat.visibility", {
          detail: { enabled: checked },
        })
      );
    }

    // 3. Persist to backend
    try {
      await api.post("/admin/settings/floating-chat", { enabled: checked });
      toast.success(
        checked
          ? "Floating chat widget is now enabled and visible across the app."
          : "Floating chat widget is now disabled and hidden."
      );
    } catch (err) {
      console.error("Failed to persist floating chat setting to backend:", err);
      toast.info(
        checked
          ? "Floating chat widget enabled in local browser."
          : "Floating chat widget disabled in local browser."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden rounded-2xl">
      {/* Header Bar */}
      <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-950/40">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#12543B] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/70 dark:border-emerald-800/70 shadow-xs">
            <MessageSquare className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Floating Chat Widget
              </h2>
              {enabled ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                  Currently ON (Visible)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  Currently OFF (Hidden)
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Turn on or turn off the floating real-time messaging chat bubble displayed at the bottom right of all pages.
            </p>
          </div>
        </div>

        {/* Action Controls: Explicit Button + Apple HIG Toggle Switch */}
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
          {saving && (
            <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
              Saving...
            </span>
          )}

          {/* Primary Action Button */}
          {enabled ? (
            <button
              type="button"
              onClick={() => handleToggle(false)}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-xs transition-all cursor-pointer active:scale-95"
              title="Click to turn off and hide the floating chat button"
            >
              <EyeOff className="w-4 h-4" />
              <span>Turn OFF Widget</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleToggle(true)}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 shadow-xs transition-all cursor-pointer active:scale-95"
              title="Click to turn on and show the floating chat button"
            >
              <Eye className="w-4 h-4" />
              <span>Turn ON Widget</span>
            </button>
          )}

          {/* High-Contrast Apple HIG iOS Toggle Switch (Inline Styles for Bulletproof Rendering) */}
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={enabled ? "Turn off floating chat widget" : "Turn on floating chat widget"}
            onClick={() => handleToggle(!enabled)}
            disabled={loading || saving}
            style={{
              width: "52px",
              height: "28px",
              borderRadius: "9999px",
              backgroundColor: enabled ? "#059669" : "#cbd5e1",
              transition: "background-color 0.2s ease",
              position: "relative",
              padding: "2px",
              display: "inline-flex",
              alignItems: "center",
              cursor: "pointer",
              border: "1px solid rgba(0,0,0,0.08)",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "9999px",
                backgroundColor: "#ffffff",
                boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
                transform: enabled ? "translateX(24px)" : "translateX(0px)",
                transition: "transform 0.2s ease",
                display: "inline-block",
                pointerEvents: "none",
              }}
            />
          </button>
        </div>
      </div>

      {/* Interactive Selection Cards */}
      <div className="p-5 sm:p-6 space-y-3.5">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Widget Display Preference
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Card: Enabled (Visible) */}
          <button
            type="button"
            onClick={() => handleToggle(true)}
            disabled={saving}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
              enabled
                ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-600 shadow-xs ring-2 ring-emerald-500/20"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    enabled
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Turn ON: Show Floating Chat
                  </h3>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                    Recommended for active collaboration
                  </span>
                </div>
              </div>
              {enabled && (
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              The circular chat icon is visible at the bottom-right corner across all ERP modules and pages, enabling team messaging and real-time alerts.
            </p>
          </button>

          {/* Card: Disabled (Hidden) */}
          <button
            type="button"
            onClick={() => handleToggle(false)}
            disabled={saving}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
              !enabled
                ? "bg-slate-100 dark:bg-slate-850 border-slate-400 dark:border-slate-600 shadow-xs ring-2 ring-slate-400/20"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    !enabled
                      ? "bg-slate-700 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  <EyeOff className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Turn OFF: Hide Floating Chat
                  </h3>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    Clean, distraction-free view
                  </span>
                </div>
              </div>
              {!enabled && (
                <div className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              The floating button is completely removed from all screens to provide an unobstructed workspace for data entry and reporting.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
