/**
 * @file UserNotesQuotaSection.jsx
 * @description System Administration Settings section to monitor and cap database storage space
 * permitted for user project notes and whiteboard sketches.
 */

import React, { useState, useEffect, useMemo } from "react";
import { api } from "../../../api/client.js";
import { toast } from "react-toastify";
import {
  Database,
  HardDrive,
  Users,
  FileText,
  Save,
  Search,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sliders,
  X,
  Loader2,
  Lock,
  Sparkles,
  ChevronDown,
} from "lucide-react";

function formatBytes(bytes) {
  if (bytes === 0 || !bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function UserNotesQuotaSection() {
  const [loading, setLoading] = useState(true);
  const [savingDefault, setSavingDefault] = useState(false);
  const [data, setData] = useState({
    default_max_bytes: 1048576,
    total_system_notes: 0,
    total_system_storage_bytes: 0,
    users: [],
  });

  // Default quota form state
  const [quotaVal, setQuotaVal] = useState(1);
  const [quotaUnit, setQuotaUnit] = useState("MB"); // 'Bytes' | 'KB' | 'MB'
  const [showUserTable, setShowUserTable] = useState(false);

  // User search & filter
  const [searchTerm, setSearchTerm] = useState("");

  // Edit custom quota modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [userCustomVal, setUserCustomVal] = useState(1);
  const [userCustomUnit, setUserCustomUnit] = useState("MB");
  const [useDefaultCap, setUseDefaultCap] = useState(true);
  const [savingUserQuota, setSavingUserQuota] = useState(false);

  // Load quota data from backend
  const loadQuotaData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/user-notes/admin/quota");
      if (res.data && res.data.ok) {
        setData(res.data);

        // Parse default bytes to clean unit
        const def = Number(res.data.default_max_bytes || 1048576);
        if (def % (1024 * 1024) === 0) {
          setQuotaVal(def / (1024 * 1024));
          setQuotaUnit("MB");
        } else if (def % 1024 === 0) {
          setQuotaVal(def / 1024);
          setQuotaUnit("KB");
        } else {
          setQuotaVal(def);
          setQuotaUnit("Bytes");
        }
      }
    } catch (err) {
      console.error("Failed to load quota data:", err);
      toast.error(err?.response?.data?.error || "Failed to load user notes quota settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotaData();
  }, []);

  // Compute calculated default bytes
  const calculatedDefaultBytes = useMemo(() => {
    const val = Number(quotaVal) || 1;
    if (quotaUnit === "MB") return val * 1024 * 1024;
    if (quotaUnit === "KB") return val * 1024;
    return val;
  }, [quotaVal, quotaUnit]);

  // Save global default quota
  const handleSaveDefaultQuota = async () => {
    try {
      setSavingDefault(true);
      await api.post("/user-notes/admin/quota", {
        default_max_bytes: calculatedDefaultBytes,
      });
      toast.success(
        `Default user notes storage cap updated to ${formatBytes(calculatedDefaultBytes)}`
      );
      loadQuotaData();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save default quota");
    } finally {
      setSavingDefault(false);
    }
  };

  // Open edit modal for a specific user
  const handleOpenUserModal = (user) => {
    setSelectedUser(user);
    if (user.is_custom && user.custom_max_bytes) {
      setUseDefaultCap(false);
      const customBytes = Number(user.custom_max_bytes);
      if (customBytes % (1024 * 1024) === 0) {
        setUserCustomVal(customBytes / (1024 * 1024));
        setUserCustomUnit("MB");
      } else if (customBytes % 1024 === 0) {
        setUserCustomVal(customBytes / 1024);
        setUserCustomUnit("KB");
      } else {
        setUserCustomVal(customBytes);
        setUserCustomUnit("Bytes");
      }
    } else {
      setUseDefaultCap(true);
      setUserCustomVal(quotaVal);
      setUserCustomUnit(quotaUnit);
    }
  };

  // Save custom user quota
  const handleSaveUserQuota = async () => {
    if (!selectedUser) return;
    try {
      setSavingUserQuota(true);
      if (useDefaultCap) {
        await api.post("/user-notes/admin/quota", {
          user_id: selectedUser.id,
          remove_custom: true,
        });
        toast.success(`Reset storage quota for @${selectedUser.username} to system default`);
      } else {
        const val = Number(userCustomVal) || 1;
        let bytes = val;
        if (userCustomUnit === "MB") bytes = val * 1024 * 1024;
        else if (userCustomUnit === "KB") bytes = val * 1024;

        await api.post("/user-notes/admin/quota", {
          user_id: selectedUser.id,
          custom_max_bytes: bytes,
        });
        toast.success(
          `Updated custom storage quota for @${selectedUser.username} to ${formatBytes(bytes)}`
        );
      }
      setSelectedUser(null);
      loadQuotaData();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to update user quota");
    } finally {
      setSavingUserQuota(false);
    }
  };

  // Filtered users list
  const filteredUsers = useMemo(() => {
    const list = data.users || [];
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      (u) =>
        (u.username || "").toLowerCase().includes(term) ||
        (u.full_name || "").toLowerCase().includes(term) ||
        (u.email || "").toLowerCase().includes(term)
    );
  }, [data.users, searchTerm]);

  return (
    <div className="space-y-6">
      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-smoky flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <HardDrive size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Default User Cap
            </span>
            <div className="text-base font-extrabold text-slate-900 dark:text-white leading-tight mt-0.5">
              {formatBytes(data.default_max_bytes)}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-smoky flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <Database size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              DB Space Used
            </span>
            <div className="text-base font-extrabold text-slate-900 dark:text-white leading-tight mt-0.5">
              {formatBytes(data.total_system_storage_bytes)}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-smoky flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 border border-brand-500/20">
            <FileText size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Total Notes Stored
            </span>
            <div className="text-base font-extrabold text-slate-900 dark:text-white leading-tight mt-0.5">
              {data.total_system_notes} Notes
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-smoky flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
            <Users size={18} />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Active Users
            </span>
            <div className="text-base font-extrabold text-slate-900 dark:text-white leading-tight mt-0.5">
              {(data.users || []).length} Accounts
            </div>
          </div>
        </div>
      </div>

      {/* ── User Notes Storage Quota & Capacity Management Section ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-smoky p-5 sm:p-6 space-y-5">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/80 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0E3646] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Sliders size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Default User Notes Storage Limit (Cap)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cap how many bytes each user is permitted to save into the database. Exceeding this limit blocks saving until older notes are cleared.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setShowUserTable((prev) => !prev)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all shadow-xs flex items-center gap-1.5 border border-slate-200/80 dark:border-slate-700 cursor-pointer"
            >
              <Users size={13} className="text-slate-500 dark:text-slate-400" />
              <span>{showUserTable ? "Collapse User Caps" : "View User Storage & Caps"}</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${showUserTable ? "rotate-180" : ""}`}
              />
            </button>

            <button
              type="button"
              onClick={handleSaveDefaultQuota}
              disabled={savingDefault || loading}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0E3646] hover:bg-[#164356] text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              {savingDefault ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>Save Default Quota</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preset Chips + Custom Input */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Quick Preset Selection
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: "50 KB", bytes: 51200, val: 50, unit: "KB" },
                { label: "100 KB", bytes: 102400, val: 100, unit: "KB" },
                { label: "250 KB", bytes: 256000, val: 250, unit: "KB" },
                { label: "500 KB", bytes: 512000, val: 500, unit: "KB" },
                { label: "1 MB", bytes: 1048576, val: 1, unit: "MB" },
                { label: "2 MB", bytes: 2097152, val: 2, unit: "MB" },
                { label: "5 MB", bytes: 5242880, val: 5, unit: "MB" },
              ].map((preset) => {
                const isSelected = calculatedDefaultBytes === preset.bytes;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setQuotaVal(preset.val);
                      setQuotaUnit(preset.unit);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#0E3646] text-white shadow-sm ring-2 ring-brand-500/30"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Numerical Input + Unit */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Custom Capacity & Unit
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                step="1"
                value={quotaVal}
                onChange={(e) => setQuotaVal(Math.max(1, Number(e.target.value)))}
                className="input flex-1 h-10 text-sm rounded-xl border-slate-200 dark:border-slate-700 font-bold"
              />
              <select
                value={quotaUnit}
                onChange={(e) => setQuotaUnit(e.target.value)}
                className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="Bytes">Bytes</option>
                <option value="KB">KB (Kilobytes)</option>
                <option value="MB">MB (Megabytes)</option>
              </select>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Exact Byte Equivalent:</span>
              <strong className="text-slate-700 dark:text-slate-300">
                {calculatedDefaultBytes.toLocaleString()} Bytes ({formatBytes(calculatedDefaultBytes)})
              </strong>
            </div>
          </div>
        </div>

        {/* Expand / Collapse Toggle Bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Users size={14} className="text-slate-400 shrink-0" />
            <span>
              Per-user storage consumption &amp; custom overrides:{" "}
              <strong className="text-slate-700 dark:text-slate-300 font-bold">
                {(data.users || []).length} registered accounts
              </strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowUserTable((prev) => !prev)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer border border-slate-200/80 dark:border-slate-700"
          >
            <span>{showUserTable ? "Collapse User Storage" : "View User Storage Consumption & Custom Caps"}</span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${showUserTable ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* ── Auto-hidden Collapsible Per-User Quota Management Table ── */}
        {showUserTable && (
          <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/80 gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  User Storage Consumption &amp; Custom Caps
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Inspect each user account&apos;s current notes database space and set custom overrides.
                </p>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search user, name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-7 text-xs h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Notes Count</th>
                    <th className="py-3 px-4">Storage Used</th>
                    <th className="py-3 px-4">Storage Cap (Limit)</th>
                    <th className="py-3 px-4">Quota Consumption</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((u) => {
                      const pct = u.percent_used || 0;
                      const isHigh = pct >= 90;
                      const isMedium = pct >= 70 && pct < 90;

                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* User Info */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 shrink-0">
                                {(u.full_name || u.username || "U")[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 dark:text-white block truncate">
                                  {u.full_name || u.username}
                                </span>
                                <span className="text-[11px] text-slate-400 truncate block">
                                  @{u.username} • {u.email || "No email"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Notes count */}
                          <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            {u.notes_count} {u.notes_count === 1 ? "Note" : "Notes"}
                          </td>

                          {/* Space used */}
                          <td className="py-3 px-4">
                            <span className="font-extrabold text-slate-800 dark:text-slate-200">
                              {formatBytes(u.used_bytes)}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              ({u.used_bytes.toLocaleString()} bytes)
                            </span>
                          </td>

                          {/* Storage Cap */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {formatBytes(u.effective_max_bytes)}
                              </span>
                              {u.is_custom ? (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80">
                                  Custom Cap
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/60">
                                  Default
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Quota Consumption Bar */}
                          <td className="py-3 px-4">
                            <div className="w-36 space-y-1">
                              <div className="flex justify-between text-[10px]">
                                <span
                                  className={`font-bold ${
                                    isHigh
                                      ? "text-rose-600"
                                      : isMedium
                                      ? "text-amber-600"
                                      : "text-emerald-600"
                                  }`}
                                >
                                  {pct}% used
                                </span>
                                <span className="text-slate-400">
                                  {formatBytes(Math.max(0, u.effective_max_bytes - u.used_bytes))} left
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isHigh
                                      ? "bg-rose-500"
                                      : isMedium
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Action */}
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenUserModal(u)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-[#0E3646] hover:text-white dark:bg-slate-800 dark:hover:bg-[#0E3646] text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-2xs"
                            >
                              {u.is_custom ? "Edit Cap" : "Set Custom Cap"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                        No users matching &ldquo;{searchTerm}&rdquo;
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Custom User Quota Modal ── */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex justify-center items-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <Sliders size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Set User Storage Limit
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Cap notes space for @{selectedUser.username}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* User overview info */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target User:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedUser.full_name} (@{selectedUser.username})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Notes:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {selectedUser.notes_count} ({formatBytes(selectedUser.used_bytes)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">System Default Cap:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {formatBytes(data.default_max_bytes)}
                  </span>
                </div>
              </div>

              {/* Mode Toggle: System Default vs Custom */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useDefaultCap}
                    onChange={(e) => setUseDefaultCap(e.target.checked)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>Use System Default Cap ({formatBytes(data.default_max_bytes)})</span>
                </label>
              </div>

              {/* Custom Input (if not default) */}
              {!useDefaultCap && (
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Custom Capacity Limit
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={userCustomVal}
                      onChange={(e) => setUserCustomVal(Math.max(1, Number(e.target.value)))}
                      className="input flex-1 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-700 font-bold"
                    />
                    <select
                      value={userCustomUnit}
                      onChange={(e) => setUserCustomUnit(e.target.value)}
                      className="h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="Bytes">Bytes</option>
                      <option value="KB">KB</option>
                      <option value="MB">MB</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveUserQuota}
                disabled={savingUserQuota}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#0E3646] hover:bg-[#164356] text-white transition flex items-center gap-1.5 shadow-sm"
              >
                {savingUserQuota ? (
                  <>
                    <Loader2 size={12} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={12} /> Save Limit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
