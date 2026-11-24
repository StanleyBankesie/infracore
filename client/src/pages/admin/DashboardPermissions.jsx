/**
 * @fileoverview DashboardPermissions component.
 * Allows administrators to manage user permissions for viewing specific dashboards, cards, and tickers.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { api } from "../../api/client.js";
import { MODULES_REGISTRY } from "../../data/modulesRegistry.js";
import { DASHBOARD_CARDS, getAllCardAliases, HOMEPAGE_PROJECT_CHARTS } from "../../data/dashboardCards.js";
import { useAuth } from "../../auth/AuthContext.jsx";
import { usePermission } from "../../auth/PermissionContext.jsx";

/**
 * Helper to generate a unique key for a permission combination.
 * 
 * @param {string} module_key 
 * @param {string} dashboard_key 
 * @param {string} card_key 
 * @param {string} ticker_key 
 * @returns {string} The formatted permission key.
 */
function permKey(module_key, dashboard_key, card_key, ticker_key) {
  return `${module_key}|${dashboard_key || ""}|${card_key || ""}|${ticker_key || ""}`;
}

/**
 * DashboardPermissions component
 * Main interface for configuring dashboard visibility per user.
 * 
 * @returns {JSX.Element} The dashboard permissions view.
 */
export default function DashboardPermissions({ embedded = false, defaultCompanyId = null, onBack = null }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshPermissions } = usePermission();
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [perms, setPerms] = useState([]);
  const [userToggles, setUserToggles] = useState({});
  const [togglesInitialized, setTogglesInitialized] = useState(false);
  const [licensedModules, setLicensedModules] = useState(null);
  const [assignedModules, setAssignedModules] = useState(null);
  const [loadingAccess, setLoadingAccess] = useState(false);

  const CANONICAL_ALIASES = useMemo(() => ({
    "human-resources": ["hr"],
    "project-management": ["projects", "pm"],
    "service-management": ["service", "sm"],
    "business-intelligence": ["bi"],
    "executive-overview": ["executive"],
    "administration": ["admin"],
  }), []);

  const SHORT_TO_CANONICAL = useMemo(() => ({
    hr: "human-resources",
    projects: "project-management",
    pm: "project-management",
    service: "service-management",
    sm: "service-management",
    bi: "business-intelligence",
    executive: "executive-overview",
    admin: "administration",
  }), []);

  const isModuleLicensed = (modKey) => {
    if (!licensedModules) return false;
    if (!Array.isArray(licensedModules) || licensedModules.length === 0) return false;

    const keyLower = String(modKey || "").toLowerCase().trim();
    if (!keyLower) return false;
    if (licensedModules.includes("*")) return true;

    const canonical = (SHORT_TO_CANONICAL[keyLower] || keyLower).toLowerCase();
    const aliases = new Set([
      keyLower,
      canonical,
      ...(CANONICAL_ALIASES[canonical] || []),
      ...(CANONICAL_ALIASES[keyLower] || []),
    ]);

    for (const lic of licensedModules) {
      const licLower = String(lic || "").toLowerCase().trim();
      if (licLower === "*") return true;
      for (const a of aliases) {
        if (licLower === a) return true;
        if (licLower.startsWith(`page:${a}:`)) return true;
        if (licLower.startsWith(`card:${a}`)) return true;
      }
    }
    return false;
  };

  const isModuleAssigned = (modKey) => {
    if (!assignedModules) return false;
    if (!Array.isArray(assignedModules) || assignedModules.length === 0) return false;

    const keyLower = String(modKey || "").toLowerCase().trim();
    if (!keyLower) return false;
    if (assignedModules.includes("*")) return true;

    const canonical = (SHORT_TO_CANONICAL[keyLower] || keyLower).toLowerCase();
    const aliases = new Set([
      keyLower,
      canonical,
      ...(CANONICAL_ALIASES[canonical] || []),
      ...(CANONICAL_ALIASES[keyLower] || []),
    ]);

    for (const ass of assignedModules) {
      const assLower = String(ass || "").toLowerCase().trim();
      if (assLower === "*") return true;
      for (const a of aliases) {
        if (assLower === a) return true;
        if (assLower.startsWith(`${a}:`)) return true;
      }
    }
    return false;
  };

  const isModuleAllowed = (modKey) => {
    return isModuleLicensed(modKey) && isModuleAssigned(modKey);
  };

  useEffect(() => {
    if (users.length > 0 && !selectedUserId) {
      const match =
        (user?.id ? users.find((u) => String(u.id) === String(user.id)) : null) ||
        (defaultCompanyId ? users.find((u) => String(u.company_id) === String(defaultCompanyId)) : null) ||
        users[0];
      if (match) setSelectedUserId(String(match.id));
    }
  }, [defaultCompanyId, users, selectedUserId, user]);

  useEffect(() => {
    setUserToggles({});
    setTogglesInitialized(false);
  }, [selectedUserId]);

  useEffect(() => {
    if (togglesInitialized || perms.length === 0) return;
    const map = {};
    for (const p of perms) {
      const key = permKey(p.module_key, p.dashboard_key, p.card_key, p.ticker_key);
      map[key] = Number(p.can_view) === 1;
    }
    setUserToggles(map);
    setTogglesInitialized(true);
  }, [perms, togglesInitialized]);

  useEffect(() => {
    let isMounted = true;
    async function fetchUserAccess() {
      if (!selectedUserId || users.length === 0) {
        setLicensedModules(null);
        setAssignedModules(null);
        return;
      }
      const selectedUser = users.find((u) => String(u.id) === String(selectedUserId));
      const companyId = selectedUser?.company_id || defaultCompanyId || 1;

      setLoadingAccess(true);
      try {
        let licMods = [];
        let assMods = [];

        // 1. Fetch user permissions (returns assigned modules & licensed tokens)
        try {
          const permRes = await api.get(`/admin/user-permissions?user_id=${selectedUserId}`);
          if (Array.isArray(permRes.data?.modules)) {
            assMods = permRes.data.modules;
          }
          if (Array.isArray(permRes.data?.licensed_modules) && permRes.data.licensed_modules.length > 0) {
            licMods = permRes.data.licensed_modules;
          }
        } catch (err) {
          console.warn("[DashboardPermissions] Error loading user permissions:", err);
        }

        // 2. Fetch company license directly if licMods is empty
        if (!licMods || licMods.length === 0) {
          try {
            const licRes = await api.get(`/licenses/company/${companyId}`);
            if (Array.isArray(licRes.data?.modules)) {
              licMods = licRes.data.modules;
            }
          } catch (err) {
            console.warn("[DashboardPermissions] Error loading company license:", err);
          }
        }

        // 3. Fallback for assigned modules if empty: check roles
        if (!assMods || assMods.length === 0) {
          try {
            const rolesRes = await api.get(`/admin/users/${selectedUserId}/roles`);
            const roleItems = Array.isArray(rolesRes.data?.data?.items)
              ? rolesRes.data.data.items
              : Array.isArray(rolesRes.data?.items)
                ? rolesRes.data.items
                : [];
            if (roleItems.length > 0) {
              const modPromises = roleItems.map((r) =>
                api.get(`/admin/role-modules/${r.id}`).catch(() => ({ data: [] }))
              );
              const modResults = await Promise.all(modPromises);
              const collected = new Set();
              modResults.forEach((res) => {
                const list = Array.isArray(res.data) ? res.data : [];
                list.forEach((m) => {
                  if (m.module_key) collected.add(m.module_key);
                });
              });
              assMods = Array.from(collected);
            }
          } catch (err) {
            console.warn("[DashboardPermissions] Error loading fallback roles:", err);
          }
        }

        if (isMounted) {
          setLicensedModules(licMods || []);
          setAssignedModules(assMods || []);
        }
      } finally {
        if (isMounted) {
          setLoadingAccess(false);
        }
      }
    }

    fetchUserAccess();
    return () => {
      isMounted = false;
    };
  }, [selectedUserId, users, defaultCompanyId]);

  const modules = useMemo(() => {
    const base = Object.entries(MODULES_REGISTRY).map(([key, val]) => {
      const fromRegistry = Array.isArray(val.dashboards) ? val.dashboards : [];
      const existing = new Set(fromRegistry.map((d) => String(d.key || "")));
      const modulesWithDashboard = new Set([
        "sales",
        "purchase",
        "inventory",
        "finance",
        "human-resources",
        "maintenance",
        "pos",
        "project-management",
        "service-management",
        "business-intelligence",
        "executive-overview",
        "transport"
      ]);
      const extras = modulesWithDashboard.has(key) ? [{ key: "dashboard", name: "Dashboard" }] : [];
      if (key === "business-intelligence") {
        extras.unshift({ key: "dashboards", name: "Dashboards" });
      }
      const excludeDashboards = new Set([
        "System Overview Dashboard",
        "User Activity Dashboard",
        "Sales Overview Dashboard",
        "Revenue Analytics Dashboard",
        "Customer Analytics Dashboard",
        "Procurement Overview Dashboard",
        "Supplier Analytics Dashboard",
        "Inventory Overview Dashboard",
        "Stock Analytics Dashboard",
        "Financial Overview Dashboard",
        "Cash Flow Dashboard",
        "Budget Analysis Dashboard",
        "Maintenance Overview Dashboard",
        "Asset Analytics Dashboard",
        "Production Overview Dashboard",
        "Efficiency Analytics Dashboard",
        "Project Overview Dashboard",
        "Resource Utilization Dashboard",
        "Service Overview Dashboard",
        "Billing Analytics Dashboard",
        "BI Overview Dashboard",
        "Executive Dashboard",
        "HR Overview Dashboard",
        "Attendance Dashboard",
        "Payroll Dashboard",
      ]);
      const dashboards = [
        ...extras.filter((d) => !existing.has(String(d.key || ""))),
        ...fromRegistry,
      ].filter((d) => {
        const name = d.name || d.label || "";
        return !excludeDashboards.has(name);
      });
      return {
        key,
        name: val.name,
        icon: val.icon,
        dashboards,
      };
    });
    base.unshift({ key: "home", name: "Home", icon: "🏠", dashboards: [] });
    return base;
  }, []);

  const KNOWN_CARDS = useMemo(() => {
    const aliasMap = {
      "human-resources": "hr",
      "project-management": "projects",
      "service-management": "service",
      "business-intelligence": "bi",
      "executive-overview": "executive",
      "administration": "admin",
    };

    const cardsMap = {
      home: Object.entries(DASHBOARD_CARDS).flatMap(([modKey, list]) =>
        (list || []).map((c) => ({
          ...c,
          moduleGroup: aliasMap[modKey] || modKey,
        }))
      ),
    };

    for (const [modKey, list] of Object.entries(DASHBOARD_CARDS)) {
      cardsMap[modKey] = list || [];
      for (const [canonical, short] of Object.entries(aliasMap)) {
        if (short === modKey) {
          cardsMap[canonical] = list || [];
        }
      }
    }
    return cardsMap;
  }, []);

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await api.get("/admin/users");
        const items =
          (res.data && res.data.data && Array.isArray(res.data.data.items)
            ? res.data.data.items
            : Array.isArray(res.data?.items)
              ? res.data.items
              : []) || [];
        setUsers(items);
      } catch {
        setUsers([]);
      }
    }
    loadUsers();
  }, []);

  useEffect(() => {
    async function loadPerms() {
      if (!selectedUserId) {
        setPerms([]);
        return;
      }
      try {
        const res = await api.get(
          `/access/dashboard-permissions?user_id=${selectedUserId}`,
        );
        const items =
          (res.data && res.data.data && Array.isArray(res.data.data.items)
            ? res.data.data.items
            : Array.isArray(res.data?.items)
              ? res.data.items
              : []) || [];
        setPerms(items);
      } catch {
        setPerms([]);
      }
    }
    loadPerms();
  }, [selectedUserId]);

  function makeToggleHandler(module_key, dashboard_key, card_key, ticker_key, onChange) {
    return (e) => {
      const key = permKey(module_key, dashboard_key, card_key, ticker_key);
      setUserToggles((prev) => ({ ...prev, [key]: e.target.checked }));
      onChange(e.target.checked);
    };
  }

  const getView = (
    module_key,
    dashboard_key,
    card_key = null,
    ticker_key = null,
  ) => {
    const key = permKey(module_key, dashboard_key, card_key, ticker_key);
    if (key in userToggles) return Boolean(userToggles[key]);
    if (card_key) {
      const aliases = getAllCardAliases(card_key);
      for (const a of aliases) {
        const ak = permKey(module_key, dashboard_key, a, ticker_key);
        if (ak in userToggles) return Boolean(userToggles[ak]);
      }
    }
    const match = perms.filter(
      (p) =>
        String(p.module_key) === String(module_key) &&
        String(p.dashboard_key || "") === String(dashboard_key || "") &&
        String(p.card_key || "") === String(card_key || "") &&
        String(p.ticker_key || "") === String(ticker_key || ""),
    );
    if (match.length === 0) {
      if (card_key) {
        const aliases = getAllCardAliases(card_key);
        const aliasMatch = perms.filter(
          (p) =>
            String(p.module_key) === String(module_key) &&
            aliases.includes(String(p.card_key || "")),
        );
        if (aliasMatch.length > 0) {
          const latest = aliasMatch[aliasMatch.length - 1];
          return Number(latest?.can_view) === 1;
        }

        if (module_key === "home") {
          return false;
        }

        // For module homes: if the user already has custom card permissions in perms for this module,
        // unmentioned cards are unchecked (false)
        const hasModuleCardConfig = perms.some(
          (p) => String(p.module_key) === String(module_key) && p.card_key
        );
        if (hasModuleCardConfig) {
          return false;
        }

        // Default for module homes with no custom config yet: first 4 cards checked
        const modCards = KNOWN_CARDS[module_key] || [];
        const cardIndex = modCards.findIndex(
          (c) => c.key === card_key || aliases.includes(c.key)
        );
        if (cardIndex >= 0 && cardIndex < 4) {
          return true;
        }
        return false;
      }

      // Default dashboard permissions to unchecked (false) when not explicitly granted
      if (dashboard_key) {
        return false;
      }

      return true;
    }
    const latest = match[match.length - 1];
    return Number(latest?.can_view) === 1;
  };
  const setView = (module_key, dashboard_key, card_key, ticker_key, value) => {
    setPerms((prev) => {
      const matched = prev.filter(
        (p) =>
          String(p.module_key) === String(module_key) &&
          String(p.dashboard_key || "") === String(dashboard_key || "") &&
          String(p.card_key || "") === String(card_key || "") &&
          String(p.ticker_key || "") === String(ticker_key || ""),
      );
      if (matched.length > 0) {
        // Update ALL matching records (handles duplicates)
        return prev.map((p) =>
          String(p.module_key) === String(module_key) &&
          String(p.dashboard_key || "") === String(dashboard_key || "") &&
          String(p.card_key || "") === String(card_key || "") &&
          String(p.ticker_key || "") === String(ticker_key || "")
            ? { ...p, can_view: value ? 1 : 0 }
            : p,
        );
      }
      return [
        ...prev,
        {
          user_id: Number(selectedUserId),
          module_key,
          dashboard_key: dashboard_key || null,
          card_key: card_key || null,
          ticker_key: ticker_key || null,
          can_view: value ? 1 : 0,
        },
      ];
    });
  };

  const persistPermission = async (module_key, type, key, allow) => {
    if (!selectedUserId) return;
    const dashboard_key = type === "dashboard" ? key : null;
    const card_key = type === "card" ? key : null;
    const ticker_key = type === "ticker" ? key : null;
    setView(module_key, dashboard_key, card_key, ticker_key, allow);

    const permissionsToSave = [
      {
        module_key,
        dashboard_key,
        card_key,
        ticker_key,
        can_view: allow ? 1 : 0,
      },
    ];

    // If card has recognized aliases, sync them as well
    if (type === "card" && card_key) {
      const aliases = getAllCardAliases(card_key);
      for (const alias of aliases) {
        if (alias !== card_key) {
          setView(module_key, null, alias, null, allow);
          permissionsToSave.push({
            module_key,
            dashboard_key: null,
            card_key: alias,
            ticker_key: null,
            can_view: allow ? 1 : 0,
          });
        }
      }
    }

    try {
      await api.put("/access/dashboard-permissions", {
        user_id: Number(selectedUserId),
        permissions: permissionsToSave,
      });
      await refreshPermissions();
      try {
        localStorage.setItem("rbac:bump", String(Date.now()));
        window.dispatchEvent(new Event("rbac:changed"));
      } catch {}
      toast.success(
        `${allow ? "✅" : "🚫"} ${String(type === "dashboard" ? key : type === "card" ? key : key)
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())} ${
          type === "dashboard" ? "dashboard" : type === "card" ? "card" : "ticker"
        } ${allow ? "enabled" : "disabled"}`,
        { autoClose: 2000 }
      );
    } catch (err) {
      // Revert optimistic update on failure
      setView(module_key, dashboard_key, card_key, ticker_key, !allow);
      toast.error(err.response?.data?.message || "Failed to save");
    }
  };

  const handleRemoveCard = async (moduleKey, cardKey) => {
    if (!selectedUserId) return;
    const aliases = getAllCardAliases(cardKey);
    const updates = {};
    const permsToSave = [];
    aliases.forEach((a) => {
      const k = permKey(moduleKey, null, a, null);
      updates[k] = false;
      setView(moduleKey, null, a, null, false);
      permsToSave.push({
        module_key: moduleKey,
        dashboard_key: null,
        card_key: a,
        ticker_key: null,
        can_view: 0,
      });
    });
    setUserToggles((prev) => ({ ...prev, ...updates }));
    try {
      await api.put("/access/dashboard-permissions", {
        user_id: Number(selectedUserId),
        permissions: permsToSave,
      });
      await refreshPermissions();
      try {
        window.dispatchEvent(new Event("rbac:changed"));
      } catch {}
      toast.success("Card removed");
    } catch {
      toast.error("Failed to remove card");
    }
  };

  const handleClearAllCards = async (moduleKey, activeCards) => {
    if (!selectedUserId || !activeCards.length) return;
    const updates = {};
    const permsToSave = [];
    activeCards.forEach((c) => {
      const aliases = getAllCardAliases(c.key);
      aliases.forEach((a) => {
        const k = permKey(moduleKey, null, a, null);
        updates[k] = false;
        setView(moduleKey, null, a, null, false);
        permsToSave.push({
          module_key: moduleKey,
          dashboard_key: null,
          card_key: a,
          ticker_key: null,
          can_view: 0,
        });
      });
    });
    setUserToggles((prev) => ({ ...prev, ...updates }));
    try {
      await api.put("/access/dashboard-permissions", {
        user_id: Number(selectedUserId),
        permissions: permsToSave,
      });
      await refreshPermissions();
      try {
        window.dispatchEvent(new Event("rbac:changed"));
      } catch {}
      toast.success("All cards cleared");
    } catch {
      toast.error("Failed to clear cards");
    }
  };

  const handleRemoveHomeCard = (cardKey) => handleRemoveCard("home", cardKey);
  const handleClearAllHomeCards = (activeCards) => handleClearAllCards("home", activeCards);

  return (
    <div className={embedded ? "p-4 sm:p-6 space-y-6" : "p-6 space-y-6"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Dashboard Permissions</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure dashboard, card, and chart access per user
          </p>
        </div>
        {!embedded && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              if (onBack) onBack();
              else navigate("/administration");
            }}
          >
            Back to Admin
          </button>
        )}
      </div>
      <div className="card">
        <div className="card-body space-y-4">
          <div className="max-w-md">
            <label className="label">User</label>
            <select
              className="input w-full"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Choose a user…</option>
              {users.map((u) => {
                const isCompanyUser = defaultCompanyId && String(u.company_id) === String(defaultCompanyId);
                return (
                  <option key={u.id} value={u.id}>
                    {u.username || u.full_name || `User #${u.id}`}
                    {u.company_name ? ` — ${u.company_name}` : ""}
                    {isCompanyUser ? " ★ (Current Company)" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {selectedUserId && (
            <div className="space-y-6">
              {loadingAccess ? (
                <div className="card p-8 text-center text-slate-500 rounded-xl">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-500 border-t-transparent mb-2"></div>
                  <p className="text-sm font-medium">Loading user module permissions and licenses...</p>
                </div>
              ) : (() => {
                const visibleModules = modules.filter((m) => {
                  if (m.key === "home") {
                    const homeCards = (KNOWN_CARDS["home"] || []).filter((c) =>
                      isModuleAllowed(c.moduleGroup)
                    );
                    return homeCards.length > 0;
                  }
                  if (!isModuleAllowed(m.key)) return false;
                  const cards = (KNOWN_CARDS[m.key] || []).filter(
                    (c) => !HOMEPAGE_PROJECT_CHARTS.has(c.key) && !c.isHomepageChart
                  );
                  const hasDashboards = m.dashboards.length > 0;
                  const hasCards = cards.length > 0;
                  return hasDashboards || hasCards;
                });

                if (visibleModules.length === 0) {
                  return (
                    <div className="p-6 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        No assigned or licensed modules found for this user
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Only modules licensed and assigned to the user can be configured.
                      </p>
                    </div>
                  );
                }

                return visibleModules.map((m) => {
                  let cards = KNOWN_CARDS[m.key] || [];
                  if (m.key === "home") {
                    cards = cards.filter((c) => isModuleAllowed(c.moduleGroup));
                  } else {
                    // Do not display Homepage Charts in module sections - only in Homepage!
                    cards = cards.filter((c) => !HOMEPAGE_PROJECT_CHARTS.has(c.key) && !c.isHomepageChart);
                  }
                  const hasDashboards = m.dashboards.length > 0;
                  const hasCards = cards.length > 0;
                  if (!hasDashboards && !hasCards && m.key !== "home")
                    return null;

                  return (
                    <div key={m.key} className="border border-amber-300/80 dark:border-amber-500/30 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                    <div className="px-4 py-3 bg-[#FBBE23] dark:bg-[#d49e1a] text-slate-950 border-b border-[#e5a812] dark:border-[#b88714] flex items-center justify-between">
                      <div className="font-bold text-sm sm:text-base text-slate-950 flex items-center gap-2">
                        <span className="text-base">{m.icon}</span> <span>{m.name}</span>
                      </div>
                      {(hasDashboards || hasCards) && m.key !== "home" && (
                        <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-950 hover:text-black cursor-pointer select-none font-bold">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm border-slate-800/80 bg-white/70 checked:bg-slate-950 checked:border-slate-950"
                            checked={
                              (hasDashboards || hasCards) &&
                              (!hasDashboards ||
                                m.dashboards.every((d) =>
                                  getView(m.key, d.key),
                                )) &&
                              (!hasCards ||
                                cards.every((c) =>
                                  getView(m.key, null, c.key, null),
                                ))
                            }
                            onChange={async (e) => {
                              const val = e.target.checked;
                              const updates = {};
                              const permsList = [];
                              m.dashboards.forEach((d) => {
                                const k = permKey(m.key, d.key, null, null);
                                updates[k] = val;
                                setView(m.key, d.key, null, null, val);
                                permsList.push({
                                  module_key: m.key,
                                  dashboard_key: d.key,
                                  card_key: null,
                                  ticker_key: null,
                                  can_view: val ? 1 : 0,
                                });
                              });

                              if (hasDashboards && m.key !== "home") {
                                const k1 = permKey(m.key, "dashboard", null, null);
                                const k2 = permKey(m.key, "dashboards", null, null);
                                updates[k1] = val;
                                updates[k2] = val;
                                setView(m.key, "dashboard", null, null, val);
                                setView(m.key, "dashboards", null, null, val);
                                permsList.push({
                                  module_key: m.key,
                                  dashboard_key: "dashboard",
                                  card_key: null,
                                  ticker_key: null,
                                  can_view: val ? 1 : 0,
                                });
                                permsList.push({
                                  module_key: m.key,
                                  dashboard_key: "dashboards",
                                  card_key: null,
                                  ticker_key: null,
                                  can_view: val ? 1 : 0,
                                });
                              }

                              cards.forEach((c, idx) => {
                                const cardVal = val ? (idx < 4) : false;
                                const k = permKey(m.key, null, c.key, null);
                                updates[k] = cardVal;
                                setView(m.key, null, c.key, null, cardVal);
                                permsList.push({
                                  module_key: m.key,
                                  dashboard_key: null,
                                  card_key: c.key,
                                  ticker_key: null,
                                  can_view: cardVal ? 1 : 0,
                                });
                              });
                              setUserToggles((prev) => ({ ...prev, ...updates }));
                              if (permsList.length > 0 && selectedUserId) {
                                try {
                                  await api.put("/access/dashboard-permissions", {
                                    user_id: Number(selectedUserId),
                                    permissions: permsList,
                                  });
                                  await refreshPermissions();
                                  try {
                                    window.dispatchEvent(new Event("rbac:changed"));
                                  } catch {}
                                  const label =
                                    m.name ||
                                    String(m.key || "")
                                      .replace(/-/g, " ")
                                      .replace(/\b\w/g, (c) => c.toUpperCase());
                                  toast.success(
                                    `${val ? "✅" : "🚫"} ${label} — ${
                                      val && cards.length > 4 ? "first 4 cards enabled (4-card cap)" : val ? "all cards enabled" : "all cards disabled"
                                    }`,
                                    { autoClose: 2000 }
                                  );
                                } catch {
                                  toast.error("Failed to save permissions");
                                }
                              }
                            }}
                          />
                          <span className="text-slate-950 font-bold">Select All</span>
                        </label>
                      )}
                    </div>
                    <div className="p-4 space-y-4">
                      {hasDashboards && m.key !== "home" && (
                        <div className="mb-2">
                          <label className="flex items-center gap-2 font-medium">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm"
                              checked={getView(m.key, "dashboard") || getView(m.key, "dashboards")}
                              onChange={(e) => {
                                const val = e.target.checked;
                                const k1 = permKey(m.key, "dashboard", null, null);
                                const k2 = permKey(m.key, "dashboards", null, null);
                                setUserToggles((prev) => ({ ...prev, [k1]: val, [k2]: val }));
                                setView(m.key, "dashboard", null, null, val);
                                setView(m.key, "dashboards", null, null, val);
                                persistPermission(m.key, "dashboard", "dashboard", val);
                                persistPermission(m.key, "dashboard", "dashboards", val);
                              }}
                            />
                            <span>📊 Dashboard</span>
                          </label>
                        </div>
                      )}
                      {cards.length > 0 && (
                        <div className="">
                          {m.key === "home" ? (
                            <div className="space-y-4">
                              {/* Active Home Cards Summary Bar */}
                              {(() => {
                                const activeHomeCards = cards.filter((c) => getView("home", null, c.key, null));
                                const activeHomeKpis = activeHomeCards.filter((c) => c.type !== "chart");
                                const activeHomeCharts = activeHomeCards.filter((c) => c.type === "chart");
                                return (
                                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                          <span>🏠</span> Active on Homepage
                                        </span>
                                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                                          activeHomeKpis.length >= 4
                                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                            : "bg-brand-500/10 text-brand-700 dark:text-brand-300 border-brand-500/20"
                                        }`}>
                                          {activeHomeKpis.length}/4 Metrics
                                        </span>
                                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                          {activeHomeCharts.length} Charts
                                        </span>
                                      </div>
                                      {activeHomeCards.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => handleClearAllHomeCards(activeHomeCards)}
                                          className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline"
                                        >
                                          Clear All
                                        </button>
                                      )}
                                    </div>
                                    {activeHomeCards.length > 0 ? (
                                      <div className="flex flex-wrap gap-1.5">
                                        {activeHomeKpis.map((c) => (
                                          <span
                                            key={c.key}
                                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs"
                                          >
                                            <span>📋 {c.label}</span>
                                            <button
                                              type="button"
                                              title={`Remove ${c.label}`}
                                              onClick={() => handleRemoveHomeCard(c.key)}
                                              className="hover:text-rose-600 font-bold ml-0.5"
                                            >
                                              ✕
                                            </button>
                                          </span>
                                        ))}
                                        {activeHomeCharts.map((c) => (
                                          <span
                                            key={c.key}
                                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs"
                                          >
                                            <span>📈 {c.label}</span>
                                            <button
                                              type="button"
                                              title={`Remove ${c.label}`}
                                              onClick={() => handleRemoveHomeCard(c.key)}
                                              className="hover:text-rose-600 font-bold ml-0.5"
                                            >
                                              ✕
                                            </button>
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-slate-400 italic">No cards selected for Homepage</p>
                                    )}
                                  </div>
                                );
                              })()}

                              {Array.from(new Set(cards.map((c) => c.moduleGroup))).map((modGroup) => {
                                const groupCards = cards.filter((c) => c.moduleGroup === modGroup);
                                if (groupCards.length === 0) return null;
                                const kpiCards = groupCards.filter((c) => c.type !== "chart");
                                const chartCards = groupCards.filter((c) => c.type === "chart");
                                const isProjectGroup = modGroup.toLowerCase() === "projects" || modGroup.toLowerCase() === "project-management";
                                const groupLabel = isProjectGroup ? "Projects" : modGroup;
                                return (
                                  <div key={modGroup} className="border-b border-slate-200/80 dark:border-slate-800 pb-4 last:border-0 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <h5 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <span>📁</span> {groupLabel}
                                      </h5>
                                      {kpiCards.length > 0 && (
                                        <span className="text-[11px] text-slate-400">
                                          {kpiCards.filter((c) => getView("home", null, c.key, null)).length}/{kpiCards.length} active
                                        </span>
                                      )}
                                    </div>

                                    {/* Metric Cards */}
                                    {kpiCards.length > 0 && (
                                      <div className="space-y-1.5">
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                          <span>📋</span> Metric Cards ({kpiCards.length})
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                                          {kpiCards.map((c) => (
                                            <label key={c.key} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer">
                                              <input
                                                type="checkbox"
                                                className="checkbox checkbox-sm"
                                                checked={getView(m.key, null, c.key, null)}
                                                onChange={(e) => {
                                                  const val = e.target.checked;
                                                  if (val) {
                                                    let checkedKpiCount = 0;
                                                    cards.forEach((hc) => {
                                                      if (hc.type !== "chart" && getView("home", null, hc.key, null)) {
                                                        checkedKpiCount++;
                                                      }
                                                    });
                                                    if (checkedKpiCount >= 4) {
                                                      toast.error("You can only select up to 4 metric cards for the Homepage.");
                                                      return;
                                                    }
                                                  }
                                                  const handler = makeToggleHandler(m.key, null, c.key, null, (newVal) => {
                                                    setView(m.key, null, c.key, null, newVal);
                                                    persistPermission(m.key, "card", c.key, newVal);
                                                  });
                                                  handler(e);
                                                }}
                                              />
                                              <span className="text-xs text-slate-800 dark:text-slate-200">
                                                {c.label}
                                              </span>
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Homepage Charts */}
                                    {chartCards.length > 0 && (
                                      <div className="space-y-1.5 pt-2">
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                                          <span>📈</span> Homepage Charts ({chartCards.length})
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                                          {chartCards.map((c) => {
                                            const isChecked = getView(m.key, null, c.key, null);
                                            return (
                                              <label
                                                key={c.key}
                                                className={`flex items-start gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                                                  isChecked
                                                    ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 shadow-smoky-card"
                                                    : "bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:shadow-smoky-card"
                                                }`}
                                              >
                                                <input
                                                  type="checkbox"
                                                  className="checkbox checkbox-sm checkbox-primary mt-0.5 shrink-0"
                                                  checked={isChecked}
                                                  onChange={makeToggleHandler(m.key, null, c.key, null, (newVal) => {
                                                    setView(m.key, null, c.key, null, newVal);
                                                    persistPermission(m.key, "card", c.key, newVal);
                                                  })}
                                                />
                                                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug">
                                                  {c.label}
                                                </span>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {(() => {
                                const activeModuleCards = cards.filter((c) => getView(m.key, null, c.key, null));
                                const kpiCards = cards.filter((c) => c.type !== "chart");
                                const chartCards = cards.filter((c) => c.type === "chart");
                                const activeModuleKpis = kpiCards.filter((c) => getView(m.key, null, c.key, null));
                                const activeModuleCharts = chartCards.filter((c) => getView(m.key, null, c.key, null));
                                const moduleName = m.name || m.label || "Module";
                                return (
                                  <>
                                    {/* Active Module Cards Summary Bar */}
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                            <span>📋</span> Active Cards
                                          </span>
                                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                                            activeModuleKpis.length >= 4
                                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                              : "bg-brand-500/10 text-brand-700 dark:text-brand-300 border-brand-500/20"
                                          }`}>
                                            {activeModuleKpis.length}/4 Stat Cards
                                          </span>
                                          {chartCards.length > 0 && (
                                            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                              {activeModuleCharts.length} Charts
                                            </span>
                                          )}
                                        </div>
                                        {activeModuleCards.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => handleClearAllCards(m.key, activeModuleCards)}
                                            className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline"
                                          >
                                            Clear All
                                          </button>
                                        )}
                                      </div>
                                      {activeModuleCards.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                          {activeModuleKpis.map((c) => (
                                            <span
                                              key={c.key}
                                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs"
                                            >
                                              <span>📋 {c.label}</span>
                                              <button
                                                type="button"
                                                title={`Remove ${c.label}`}
                                                onClick={() => handleRemoveCard(m.key, c.key)}
                                                className="hover:text-rose-600 font-bold ml-0.5"
                                              >
                                                ✕
                                              </button>
                                            </span>
                                          ))}
                                          {activeModuleCharts.map((c) => (
                                            <span
                                              key={c.key}
                                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs"
                                            >
                                              <span>📈 {c.label}</span>
                                              <button
                                                type="button"
                                                title={`Remove ${c.label}`}
                                                onClick={() => handleRemoveCard(m.key, c.key)}
                                                className="hover:text-rose-600 font-bold ml-0.5"
                                              >
                                                ✕
                                              </button>
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-slate-400 italic">No cards selected (defaults to first 4)</p>
                                      )}
                                    </div>

                                    {kpiCards.length > 0 && (
                                      <div>
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                          KPI & Stat Cards ({kpiCards.length})
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                                          {kpiCards.map((c) => (
                                            <label
                                              key={c.key}
                                              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                                            >
                                              <input
                                                type="checkbox"
                                                className="checkbox checkbox-sm"
                                                checked={getView(m.key, null, c.key, null)}
                                                onChange={(e) => {
                                                  const val = e.target.checked;
                                                  if (val) {
                                                    let checkedCount = 0;
                                                    kpiCards.forEach((mc) => {
                                                      if (getView(m.key, null, mc.key, null)) checkedCount++;
                                                    });
                                                    if (checkedCount >= 4) {
                                                      toast.error(`You can only select up to 4 stat cards for ${moduleName}.`);
                                                      return;
                                                    }
                                                  }
                                                  const handler = makeToggleHandler(m.key, null, c.key, null, (newVal) => {
                                                    setView(m.key, null, c.key, null, newVal);
                                                    persistPermission(m.key, "card", c.key, newVal);
                                                  });
                                                  handler(e);
                                                }}
                                              />
                                              <span className="text-xs text-slate-800 dark:text-slate-200">
                                                {c.label}
                                              </span>
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {chartCards.length > 0 && (
                                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                          Module Charts ({chartCards.length})
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                                          {chartCards.map((c) => {
                                            const isChecked = getView(m.key, null, c.key, null);
                                            return (
                                              <label
                                                key={c.key}
                                                className={`flex items-start gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                                                  isChecked
                                                    ? "bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 shadow-2xs"
                                                    : "bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                                                }`}
                                              >
                                                <input
                                                  type="checkbox"
                                                  className="checkbox checkbox-sm mt-0.5 shrink-0"
                                                  checked={isChecked}
                                                  onChange={makeToggleHandler(m.key, null, c.key, null, (newVal) => {
                                                    setView(m.key, null, c.key, null, newVal);
                                                    persistPermission(m.key, "card", c.key, newVal);
                                                  })}
                                                />
                                                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug">
                                                  {c.label}
                                                </span>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function CardTickerEditor({ entries = [], onChange }) {
  const [value, setValue] = useState("");
  const list = entries
    .filter((e) => e.can_view)
    .map((e) => e.card_key || e.ticker_key)
    .filter(Boolean);
  const remove = (k) => {
    const next = list.filter((x) => String(x) !== String(k));
    onChange(next);
  };
  const add = () => {
    const k = value.trim();
    if (!k) return;
    if (!list.includes(k)) onChange([...list, k]);
    setValue("");
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Enter key (e.g., total-sales)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="button" className="btn" onClick={add}>
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {list.map((k) => (
          <span
            key={k}
            className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs flex items-center gap-2"
          >
            {k}
            <button
              type="button"
              className="text-slate-500 hover:text-slate-700"
              onClick={() => remove(k)}
              title="Remove"
            >
              ✕
            </button>
          </span>
        ))}
        {!list.length && (
          <span className="text-xs text-slate-500">
            No entries. Add keys to allow viewing.
          </span>
        )}
      </div>
    </div>
  );
}
