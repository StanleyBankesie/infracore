/**
 * @fileoverview Main AppShell layout component.
 * Responsible for the overall layout, navigation sidebar, header, global state,
 * notification polling, and service worker push integrations.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import Swal from "sweetalert2";

import { useAuth } from "../auth/AuthContext.jsx";
import {
  getLastActivity,
  getInactivityTimeoutMs,
  readStoredAuth,
  writeStoredAuth,
  touchLastActivity,
} from "../auth/authStorage.js";
import { usePermission } from "../auth/PermissionContext.jsx";
import { useTheme } from "../theme/ThemeContext.jsx";
import { resolveBackgroundForTheme } from "../utils/appBackground.js";
import ThemeToggle from "../components/ThemeToggle.jsx";
import ListPageOverview from "../components/ListPageOverview.jsx";

const lazyWithRetry = (componentImport) =>
  React.lazy(async () => {
    const pageHasBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem("omnisuite_chunk_refreshed") || "false",
    );
    try {
      const component = await componentImport();
      window.sessionStorage.setItem("omnisuite_chunk_refreshed", "false");
      return component;
    } catch (error) {
      if (!pageHasBeenForceRefreshed) {
        window.sessionStorage.setItem("omnisuite_chunk_refreshed", "true");
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });

const DashboardPage = React.lazy(
  () => import("../pages/dashboard/DashboardPage.jsx"),
);
const HomePage = React.lazy(() => import("../pages/home/HomePage.jsx"));
const AdministrationHome = lazyWithRetry(
  () => import("../pages/modules/administration/AdministrationHome.jsx"),
);
const SalesHome = React.lazy(
  () => import("../pages/modules/sales/SalesHome.jsx"),
);
const InventoryHome = React.lazy(
  () => import("../pages/modules/inventory/InventoryHome.jsx"),
);
const PurchaseHome = React.lazy(
  () => import("../pages/modules/purchase/PurchaseHome.jsx"),
);
const FinanceRoutes = React.lazy(
  () => import("../pages/modules/finance/FinanceRoutes.jsx"),
);
const HumanResourcesHome = React.lazy(
  () => import("../pages/modules/human-resources/HumanResourcesHome.jsx"),
);
const MaintenanceHome = React.lazy(
  () => import("../pages/modules/maintenance/MaintenanceHome.jsx"),
);
const EnvironmentalHealthSafetyHome = React.lazy(
  () =>
    import("../pages/modules/environmental-health-safety/EnvironmentalHealthSafetyHome.jsx"),
);
const FacilitiesHome = React.lazy(
  () => import("../pages/modules/facilities/FacilitiesHome.jsx"),
);
const AssetManagementHome = React.lazy(
  () => import("../pages/modules/asset-management/AssetManagementHome.jsx"),
);
const ProjectManagementHome = lazyWithRetry(
  () => import("../pages/modules/project-management/ProjectManagementHome.jsx"),
);
const ProductionHome = React.lazy(
  () => import("../pages/modules/production/ProductionHome.jsx"),
);
const PosHome = React.lazy(() => import("../pages/modules/pos/PosHome.jsx"));
const BusinessIntelligenceHome = React.lazy(
  () =>
    import("../pages/modules/business-intelligence/BusinessIntelligenceHome.jsx"),
);
const ServiceManagementHome = React.lazy(
  () => import("../pages/modules/service-management/ServiceManagementHome.jsx"),
);
const TransportLayout = React.lazy(
  () => import("../pages/modules/transport/TransportLayout.jsx"),
);
const ExecutiveOverviewRoutes = React.lazy(
  () =>
    import("../pages/modules/executive-overview/ExecutiveOverviewRoutes.jsx"),
);
const SystemConfigurationHome = React.lazy(
  () =>
    import("../pages/modules/system-configuration/SystemConfigurationHome.jsx"),
);
const NotificationsPage = React.lazy(
  () => import("../pages/NotificationsPage.jsx"),
);
const SocialFeedPage = React.lazy(
  () => import("../pages/social/SocialFeedPage.jsx"),
);
const RoleSetup = React.lazy(() => import("../pages/admin/RoleSetup.jsx"));
const UserPermissions = React.lazy(
  () => import("../pages/admin/UserPermissions.jsx"),
);
const SocialFeedNotification = React.lazy(
  () => import("../components/CompanyFeed/SocialFeedNotification.jsx"),
);
const DashboardPermissions = React.lazy(
  () => import("../pages/admin/DashboardPermissions.jsx"),
);
const ProjectNotesPage = React.lazy(
  () => import("../pages/modules/project-management/notes/ProjectNotesPage.jsx"),
);
const ProjectPlanPage = React.lazy(
  () => import("../pages/modules/project-management/plan/ProjectPlanPage.jsx"),
);
import addNotification from "../utils/addNotification.js";

import logoDark from "../assets/resources/OMNISUITE_WHITE_LOGO.png";
import logoLight from "../assets/resources/OMNISUITE_LOGO_CLEAR.png";
import clearIcon from "../assets/resources/OMNISUITE_ICON_CLEAR.png";
import PaymentPackageModal from "../components/PaymentPackageModal.jsx";
import { api } from "../api/client.js";
import useOfflineQueue from "../offline/useOfflineQueue.js";
import FloatingInstallButton from "../components/FloatingInstallButton.jsx";
import OmniSuiteFavoriteButton from "../components/OmniSuiteFavoriteButton.jsx";
import { recordPageVisit, resolvePageMetadata } from "../utils/favorites.js";
import { toast } from "react-toastify";
import {
  Bell,
  Menu,
  Settings,
  Banknote,
  Archive,
  ShoppingCart,
  Landmark,
  Users,
  Wrench,
  Blocks,
  Factory,
  ShoppingBasket,
  AreaChart,
  Headset,
  Presentation,
  Truck,
  Home,
  Building2,
  Calculator,
  ShieldAlert,
  X,
  Search,
  WifiOff,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Rocket,
  Compass,
  PlayCircle,
  Gauge,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
  BarChart3,
  Receipt,
  Package,
  Layers,
  Folder,
  Calendar,
  Clock,
  CreditCard,
  Tag,
  ClipboardList,
  GitBranch,
  Handshake,
  FileCheck,
  Boxes,
  Database,
  Bug,
  Ticket,
  ArrowLeftRight,
  BookOpen,
  Sparkles,
  Zap,
  Hourglass,
  PauseCircle,
  ScanBarcode,
  Warehouse,
  MapPin,
  Scale,
  CircleDollarSign,
  SlidersHorizontal,
  ClipboardCheck,
  RefreshCw,
  Upload,
  PackageMinus,
  PackagePlus,
  PackageCheck,
  RotateCcw,
  Tags,
  History,
  BellRing,
  AlertTriangle,
  ShieldCheck,
  UserPlus,
  UserMinus,
  Navigation,
  Coins,
  Leaf,
  Trash2,
  Ruler,
  FolderKanban,
  Briefcase,
  FolderOpen,
  Milestone,
  Flag,
  GanttChart,
  CalendarRange,
  CalendarCheck,
  CalendarClock,
  Kanban,
  Columns3,
  ListTodo,
  ListChecks,
  Network,
  GitFork,
  Workflow,
  GitCompare,
  BrainCircuit,
  StickyNote,
  NotebookPen,
  FileEdit,
  HardHat,
  Construction,
  BadgeDollarSign,
  HandCoins,
  FileSignature,
  FileCheck2,
  FileQuestion,
  FileKey,
  FileCode,
  Store,
  ShoppingBag,
  Fuel,
  Ship,
  Anchor,
  Route as RouteIcon,
  GraduationCap,
  Gavel,
  Cog,
  DoorOpen,
  Activity,
  Percent,
  PieChart,
  LineChart,
  UserCheck,
  UserCog,
  Key,
  KeyRound,
  Scroll,
  Stethoscope,
  Printer,
  Star,
  Siren,
  Biohazard,
  AlertOctagon,
  Shield,
  Target,
  Award,
  TrendingUp,
  Send,
  Lock,
  LifeBuoy,
} from "lucide-react";
import FloatingChat from "../components/chat/FloatingChat.jsx";
import BanksAiFloating from "../components/ai/BanksAiFloating.jsx";
import FloatingCreateButton from "../components/FloatingCreateButton.jsx";
import useSocket from "../hooks/useSocket.js";
import { MODULES_REGISTRY } from "../data/modulesRegistry.js";
import { MODULE_SECTIONS } from "../data/userAssignedSections.js";
import { MODULE_HOME_SECTIONS } from "../data/moduleHomeSectionsRegistry.js";

const AppRoutes = React.memo(function AppRoutes({ user }) {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400">Loading module...</span>
          </div>
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/administration/*" element={<AdministrationHome />} />
        <Route path="/sales/*" element={<SalesHome />} />
        <Route path="/inventory/*" element={<InventoryHome />} />
        <Route path="/purchase/*" element={<PurchaseHome />} />
        <Route path="/finance/*" element={<FinanceRoutes />} />
        <Route path="/human-resources/*" element={<HumanResourcesHome />} />
        <Route path="/maintenance/*" element={<MaintenanceHome />} />
        <Route path="/facilities/*" element={<FacilitiesHome />} />
        <Route
          path="/environmental-health-safety/*"
          element={<EnvironmentalHealthSafetyHome />}
        />
        <Route
          path="/ehs/*"
          element={<Navigate to="/environmental-health-safety" replace />}
        />
        <Route
          path="/hse/*"
          element={<Navigate to="/environmental-health-safety" replace />}
        />
        <Route path="/assets/*" element={<AssetManagementHome />} />
        <Route path="/asset-management/*" element={<AssetManagementHome />} />
        <Route
          path="/project-management/*"
          element={<ProjectManagementHome />}
        />
        <Route path="/production/*" element={<ProductionHome />} />
        <Route path="/pos/*" element={<PosHome />} />
        <Route
          path="/business-intelligence/*"
          element={<BusinessIntelligenceHome />}
        />
        <Route
          path="/service-management/*"
          element={<ServiceManagementHome />}
        />
        <Route path="/transport/*" element={<TransportLayout />} />
        <Route
          path="/executive-overview/*"
          element={<ExecutiveOverviewRoutes />}
        />
        <Route
          path="/administration/access/dashboard-permissions"
          element={<DashboardPermissions />}
        />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/notes" element={<ProjectNotesPage />} />
        <Route path="/project-management/notes" element={<ProjectNotesPage />} />
        <Route path="/project-plan" element={<ProjectPlanPage />} />
        <Route path="/project-plan/:projectId" element={<ProjectPlanPage />} />
        <Route path="/project-management/plan" element={<ProjectPlanPage />} />
        <Route path="/project-management/plan/:projectId" element={<ProjectPlanPage />} />
        <Route path="/social-feed" element={<SocialFeedPage />} />
        <Route path="/social-feed/:id" element={<SocialFeedPage />} />
        <Route path="/admin/roles" element={<RoleSetup />} />
        <Route path="/admin/roles/new" element={<RoleSetup />} />
        <Route path="/admin/roles/:id" element={<RoleSetup />} />
        <Route path="/admin/user-permissions" element={<UserPermissions />} />
        <Route path="/admin/reports/user-login-activity" element={<Navigate to="/administration/reports/user-login-activity" replace />} />
        <Route path="/admin/reports/user-activity" element={<Navigate to="/administration/reports/user-login-activity" replace />} />
        <Route path="/admin/reports/audit" element={<Navigate to="/administration/reports/system-log-book" replace />} />
        <Route path="/admin/user-activity" element={<Navigate to="/administration/reports/user-login-activity" replace />} />
        <Route
          path="/system-configuration/*"
          element={
            user?.id === 1 || user?.id === 2 ? (
              <SystemConfigurationHome />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </React.Suspense>
  );
});

const modules = [
  {
    key: "system-configuration",
    label: "System Configuration",
    shortLabel: "Config",
    path: "/system-configuration",
    icon: <Settings />,
  },
  {
    key: "administration",
    label: "System Administration",
    shortLabel: "Admin",
    path: "/administration",
    icon: <Settings />,
  },
  {
    key: "sales",
    label: "Sales Management",
    shortLabel: "Sales",
    path: "/sales",
    icon: <Banknote />,
  },
  {
    key: "inventory",
    label: "Inventory Management",
    shortLabel: "Inventory",
    path: "/inventory",
    icon: <Archive />,
  },
  {
    key: "purchase",
    label: "Procurement",
    shortLabel: "Purchase",
    path: "/purchase",
    icon: <ShoppingCart />,
  },
  {
    key: "finance",
    label: "Finance",
    shortLabel: "Finance",
    path: "/finance",
    icon: <Landmark />,
  },
  {
    key: "human-resources",
    label: "Human Resources",
    shortLabel: "HR",
    path: "/human-resources",
    icon: <Users />,
  },
  {
    key: "maintenance",
    label: "Maintenance",
    shortLabel: "Maintenance",
    path: "/maintenance",
    icon: <Wrench />,
  },
  {
    key: "facilities",
    label: "Facilities Management",
    shortLabel: "Facilities",
    path: "/facilities",
    icon: <Building2 />,
  },
  {
    key: "environmental-health-safety",
    label: "Health & Safety (EHS)",
    shortLabel: "EHS",
    path: "/environmental-health-safety",
    icon: <ShieldAlert />,
  },
  {
    key: "assets",
    label: "Asset Management",
    shortLabel: "Assets",
    path: "/assets",
    icon: <Calculator />,
  },
  {
    key: "project-management",
    label: "Project Management",
    shortLabel: "Projects",
    path: "/project-management",
    icon: <Blocks />,
  },
  {
    key: "production",
    label: "Manufacturing",
    shortLabel: "Production",
    path: "/production",
    icon: <Factory />,
  },
  {
    key: "pos",
    label: "POS",
    shortLabel: "POS",
    path: "/pos",
    icon: <ShoppingBasket />,
  },
  {
    key: "business-intelligence",
    label: "Business Intelligence",
    shortLabel: "BI",
    path: "/business-intelligence",
    icon: <AreaChart />,
  },
  {
    key: "service-management",
    label: "Field Service Management",
    shortLabel: "Service",
    path: "/service-management",
    icon: <Headset />,
  },
  {
    key: "executive-overview",
    label: "Executive Overview",
    shortLabel: "Executive",
    path: "/executive-overview",
    icon: <Presentation />,
  },
  {
    key: "transport",
    label: "Transport & Logistics",
    shortLabel: "Transport",
    path: "/transport",
    icon: <Truck />,
  },
];


const MODULE_HOME_PATHS = new Set([
  "/",
  "/dashboard",
  "/asset-management",
  ...modules.map((m) => m.path.replace(/\/+$/, "")),
]);

function isModuleHomeOrSection(pathname, search = "") {
  if (!pathname) return false;
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (MODULE_HOME_PATHS.has(normalized)) {
    return true;
  }
  const segments = normalized.split("/").filter(Boolean);
  if (
    segments.length === 2 &&
    (segments[1] === "dashboard" || segments[1] === "dashboards")
  ) {
    if (MODULE_HOME_PATHS.has(`/${segments[0]}`)) {
      return true;
    }
  }
  return false;
}

const BACKGROUND_GET_CONFIG = { __background: true };

function scheduleDeferredTask(task, delayMs = 200) {
  let settled = false;
  let timeoutId = null;
  let idleId = null;

  const run = () => {
    if (settled) return;
    settled = true;
    if (timeoutId !== null) window.clearTimeout(timeoutId);
    if (
      idleId !== null &&
      typeof window !== "undefined" &&
      typeof window.cancelIdleCallback === "function"
    ) {
      window.cancelIdleCallback(idleId);
    }
    Promise.resolve()
      .then(task)
      .catch(() => {});
  };

  if (typeof window !== "undefined") {
    timeoutId = window.setTimeout(run, delayMs);
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(run, { timeout: delayMs + 300 });
    }
  } else {
    run();
  }

  return () => {
    settled = true;
    if (timeoutId !== null && typeof window !== "undefined") {
      window.clearTimeout(timeoutId);
    }
    if (
      idleId !== null &&
      typeof window !== "undefined" &&
      typeof window.cancelIdleCallback === "function"
    ) {
      window.cancelIdleCallback(idleId);
    }
  };
}

function getSectionIcon(secKey, secTitle) {
  const k = String(secKey || "").toLowerCase();
  const t = String(secTitle || "").toLowerCase();

  if (k.includes("dashboard") || t.includes("dashboard") || k.includes("overview") || t.includes("overview")) return <LayoutDashboard />;
  if (k.includes("initiation") || t.includes("initiation") || t.includes("start")) return <Rocket />;
  if (k.includes("planning") || t.includes("planning") || t.includes("plan")) return <Compass />;
  if (k.includes("execution") || t.includes("execution") || t.includes("shop floor")) return <PlayCircle />;
  if (k.includes("monitoring") || t.includes("monitoring") || k.includes("control") || t.includes("control")) return <Gauge />;
  if (k.includes("closure") || t.includes("closure") || t.includes("handover")) return <CheckCircle2 />;
  if (k.includes("receipt") || t.includes("goods receipt") || k.includes("grn") || t.includes("grn")) return <PackagePlus />;
  if (k.includes("voucher") || t.includes("voucher") || k.includes("document") || t.includes("document")) return <FileText />;
  if (k.includes("transaction") || t.includes("transaction") || k.includes("invoice") || t.includes("invoice") || k.includes("billing") || t.includes("billing")) return <Receipt />;
  if (k.includes("report") || t.includes("report") || k.includes("analytic") || t.includes("analytic") || k.includes("valuation") || t.includes("valuation")) return <BarChart3 />;
  if (k.includes("setup") || t.includes("setup") || k.includes("setting") || t.includes("setting") || k.includes("config") || t.includes("config") || k.includes("parameter") || t.includes("parameter")) return <Settings />;
  if (k.includes("customer") || t.includes("customer") || k.includes("user") || t.includes("user") || k.includes("employee") || t.includes("employee") || k.includes("resource") || t.includes("resource")) return <Users />;
  if (k.includes("price") || t.includes("pricing") || k.includes("discount") || t.includes("discount")) return <Tag />;
  if (k.includes("warehouse") || t.includes("warehouse") || k.includes("store") || t.includes("store")) return <Warehouse />;
  if (k.includes("operation") || t.includes("operation") || k.includes("stock") || t.includes("stock") || k.includes("item") || t.includes("inventory")) return <Package />;
  if (k.includes("procurement") || t.includes("procurement") || k.includes("purchase") || t.includes("purchase") || k.includes("order") || t.includes("order")) return <ShoppingCart />;
  if (k.includes("bank") || t.includes("banking") || k.includes("finance") || t.includes("finance") || k.includes("depreciation")) return <Coins />;
  if (k.includes("time") || t.includes("time") || k.includes("attendance") || t.includes("attendance")) return <Clock />;
  if (k.includes("leave") || t.includes("leave") || k.includes("calendar") || t.includes("calendar") || k.includes("timeline")) return <Calendar />;
  if (k.includes("payroll") || t.includes("payroll") || k.includes("benefit") || t.includes("benefit") || k.includes("pos")) return <CreditCard />;
  if (k.includes("equipment") || t.includes("equipment") || k.includes("asset") || t.includes("maintenance")) return <Wrench />;
  if (k.includes("safety") || t.includes("safety") || k.includes("incident") || t.includes("hazard") || k.includes("compliance")) return <ShieldAlert />;
  if (k.includes("workflow") || t.includes("workflow")) return <GitBranch />;
  if (k.includes("log") || t.includes("log") || k.includes("audit") || t.includes("audit") || k.includes("task") || t.includes("task")) return <ClipboardList />;
  return <Folder />;
}

export function getPageWhiteIcon(pageTitle, path, featureKey, explicitIcon) {
  const t = String(pageTitle || "").toLowerCase().trim();
  const f = String(featureKey || "").toLowerCase().trim();
  const p = String(path || "").toLowerCase().trim();

  // 1. Project Management, Construction & Engineering Lifecycle
  if (t.includes("milestone") || t.includes("phase gate") || t.includes("phase-gate") || t.includes("phase approval") || t.includes("roadmap")) return <Milestone />;
  if (t.includes("gantt") || t.includes("timeline") || t.includes("schedule monitoring")) return <GanttChart />;
  if (t.includes("kanban") || t.includes("task assignment")) return <Kanban />;
  if (t.includes("wbs") || t.includes("work breakdown") || t.includes("breakdown structure")) return <Network />;
  if (t.includes("mindmap") || t.includes("mind map") || t.includes("whiteboard") || t.includes("brainstorm")) return <BrainCircuit />;
  if (t.includes("note") || t.includes("notes") || t.includes("scratchpad")) return <StickyNote />;
  if (t.includes("daily site") || t.includes("site report") || t.includes("site log") || /\bsite\b/i.test(t)) return <HardHat />;
  if (t.includes("subcontractor") || t.includes("sub-contractor") || t.includes("tradesman")) return <HardHat />;
  if (t.includes("boq") || t.includes("bill of quantities") || t.includes("cost estimation") || t.includes("costing") || t.includes("cost control")) return <Calculator />;
  if (t.includes("valuation") || t.includes("progress billing") || t.includes("client valuation")) return <CircleDollarSign />;
  if (t.includes("payment application") || t.includes("interim payment") || t.includes("ipc")) return <BadgeDollarSign />;
  if (t.includes("variation") || t.includes("change order") || t.includes("scope change")) return <GitCompare />;
  if (t.includes("snag") || t.includes("punch list") || t.includes("defect list")) return <ListChecks />;
  if (t.includes("quality control") || t.includes("qc") || t.includes("qa") || t.includes("qa/qc")) return <Award />;
  if (t.includes("project closure") || t.includes("handover") || t.includes("commissioning")) return <CheckCircle2 />;
  if (t.includes("final account")) return <Landmark />;
  if (t.includes("payment claim") || t.includes("claims") || t.includes("dispute")) return <HandCoins />;
  if (t.includes("risk management") || t.includes("risk register") || t.includes("risks")) return <ShieldAlert />;
  if (t.includes("project plan") || t.includes("work plan") || t.includes("master plan")) return <Compass />;
  if (t.includes("task execution") || t.includes("tasks") || t.includes("task list") || t.includes("my tasks")) return <ListTodo />;
  if (t.includes("client order") || t.includes("client's order") || t.includes("project order") || t.includes("engagement") || t.includes("contract")) return <FileSignature />;
  if (t.includes("project proposal") || t.includes("proposal") || t.includes("bidding") || t.includes("tender")) return <FileText />;
  if (t.includes("project") || t.includes("projects") || t.includes("portfolio") || t.includes("charter")) return <FolderKanban />;

  // 2. POS (Point of Sale), Retail & Cash Counter
  if (t.includes("on-hold") || t.includes("hold sales") || t.includes("parked sale") || t.includes("suspended")) return <PauseCircle />;
  if (t.includes("pos return") || t.includes("sales return") || t.includes("purchase return") || t.includes("return advice") || t.includes("return") || t.includes("refund")) return <RotateCcw />;
  if (t.includes("direct purchase") || t.includes("direct procurement")) return <Zap />;
  if (t.includes("store inventory") || t.includes("retail store") || /\bstore\b/i.test(t)) return <Store />;
  if (t.includes("sales entry") || t.includes("quick sale") || t.includes("counter sale") || t.includes("pos entry")) return <ShoppingBag />;
  if (t.includes("day management") || t.includes("business day") || t.includes("eod")) return <CalendarClock />;
  if (t.includes("cash collection") || t.includes("cash drop") || t.includes("cash desk") || t.includes("till")) return <Coins />;
  if (t.includes("post to finance") || t.includes("gl post") || t.includes("post gl")) return <Send />;
  if (t.includes("sync reconciliation") || t.includes("reconcil") || t.includes("sync")) return <RefreshCw />;
  if (t.includes("pos register") || t.includes("cash register")) return <Calculator />;
  if (/\bpos\b/i.test(t) || t.includes("cashier") || t.includes("retail")) return <ShoppingBasket />;

  // 3. Movement Velocity & Speed
  if (t.includes("fast moving")) return <Zap />;
  if (t.includes("slow moving")) return <Hourglass />;
  if (t.includes("non moving") || t.includes("non-moving") || t.includes("dead stock")) return <PauseCircle />;

  // 4. Barcodes, Scanning & Identification
  if (t.includes("barcode") || t.includes("qr code") || t.includes("scanner") || t.includes("scan")) return <ScanBarcode />;

  // 5. Batches, Lots, Serial Numbers & Layers
  if (t.includes("batch") || t.includes("lot") || t.includes("serial")) return <Layers />;

  // 6. Warehouses, Storage, Bins & Aisles
  if (/\b(bin|bins|shelf|shelves|rack|racks|aisle|bay)\b/i.test(t) || t.includes("bin location")) return <MapPin />;
  if (t.includes("warehouse") || t.includes("warehouses") || t.includes("stores")) return <Warehouse />;
  if (t.includes("location") || t.includes("locations")) return <MapPin />;

  // 7. Stock Operations, Balances, Adjustments & Physical Count
  if (t.includes("aging") || t.includes("age analysis")) return <History />;
  if (t.includes("stock value") || t.includes("asset value")) return <CircleDollarSign />;
  if (t.includes("adjustment") || t.includes("adjustments") || t.includes("write-off")) return <SlidersHorizontal />;
  if (t.includes("physical inventory") || t.includes("stock take") || t.includes("cycle count")) return <ClipboardCheck />;
  if (t.includes("daily stock take")) return <CalendarCheck />;
  if (t.includes("verification") || t.includes("verify") || t.includes("audit") || t.includes("inspect")) return <FileCheck />;
  if (t.includes("updation")) return <RefreshCw />;
  if (t.includes("upload") || t.includes("import grn") || t.includes("import purchase") || t.includes("bulk upload")) return <Upload />;
  if (t.includes("stock journal") || t.includes("journal") || t.includes("ledger")) return <BookOpen />;
  if (t.includes("unit conversion") || t.includes("conversion") || t.includes("uom")) return <Ruler />;
  if (t.includes("debtors balance") || t.includes("trial balance") || t.includes("balance sheet") || t.includes("balance") || t.includes("scale") || t.includes("weight")) return <Scale />;
  if (t.includes("classification") || t.includes("category") || t.includes("categories") || t.includes("catalog")) return <Tags />;

  // 8. Transfers, Receipts, Requisitions & Issues
  if (t.includes("transfer acceptance") || t.includes("acceptance")) return <PackageCheck />;
  if (t.includes("transfer") || t.includes("movement") || t.includes("transit") || t.includes("relocation")) return <ArrowLeftRight />;
  if (t.includes("material requisition") || t.includes("general requisition") || t.includes("purchase requisition") || t.includes("requisition")) return <ClipboardList />;
  if (t.includes("material utilization") || t.includes("utilization") || t.includes("consumption")) return <Boxes />;
  if (t.includes("issue to") || t.includes("stock issue") || t.includes("issue") || t.includes("dispatch")) return <PackageMinus />;
  if (t.includes("local purchase grn") || t.includes("import purchase grn") || t.includes("receipt") || t.includes("grn") || t.includes("goods receipt") || t.includes("delivery note")) return <PackagePlus />;

  // 9. Alerts, Hazards, HSE & Safety
  if (t.includes("near miss") || t.includes("near-miss")) return <AlertOctagon />;
  if (t.includes("hazard") || t.includes("biohazard")) return <Biohazard />;
  if (t.includes("incident") || t.includes("defect") || t.includes("bug") || t.includes("violation") || t.includes("accident")) return <AlertTriangle />;
  if (t.includes("alert") || t.includes("alarm") || t.includes("warning")) return <BellRing />;
  if (t.includes("safety") || t.includes("security") || t.includes("compliance") || t.includes("statutory") || t.includes("hse") || t.includes("ppe")) return <ShieldCheck />;
  if (t.includes("emergency") || t.includes("siren") || t.includes("fire drill")) return <Siren />;
  if (t.includes("environment") || t.includes("sustainability") || t.includes("green") || t.includes("carbon")) return <Leaf />;
  if (t.includes("disposal") || t.includes("scrap") || t.includes("waste")) return <Trash2 />;

  // 10. HR, People, Staff, Recruitment & Leaves
  if (t.includes("recruitment") || t.includes("hiring") || t.includes("applicant") || t.includes("job opening")) return <UserPlus />;
  if (t.includes("onboard") || t.includes("induction")) return <UserCheck />;
  if (t.includes("offboard") || t.includes("exit") || t.includes("termination") || t.includes("resignation")) return <UserMinus />;
  if (t.includes("attendance") || t.includes("clock in") || t.includes("clock out") || t.includes("timesheet") || t.includes("time tracking")) return <Clock />;
  if (t.includes("leave") || t.includes("holiday") || t.includes("vacation") || t.includes("calendar")) return <Calendar />;
  if (t.includes("payroll") || t.includes("salary") || t.includes("payslip") || t.includes("remuneration") || t.includes("wage")) return <Banknote />;
  if (t.includes("loan") || t.includes("advance")) return <HandCoins />;
  if (t.includes("training") || t.includes("course") || t.includes("learning")) return <GraduationCap />;
  if (t.includes("disciplinary") || t.includes("grievance") || t.includes("legal")) return <Gavel />;
  if (t.includes("prospect") || t.includes("lead")) return <Target />;
  if (t.includes("directory") || t.includes("employee") || t.includes("staff") || t.includes("customer") || t.includes("client") || t.includes("supplier") || t.includes("vendor") || t.includes("driver") || t.includes("people") || t.includes("users")) return <Users />;
  if (t.includes("user account") || t.includes("user management") || t.includes("user")) return <UserCog />;

  // 11. Finance, Banking, Vouchers, Tax & Ledger
  if (t.includes("credit note") || t.includes("debit note") || t.includes("service bill") || t.includes("purchase bill") || t.includes("voucher") || t.includes("invoice") || t.includes("bill") || t.includes("billing")) return <Receipt />;
  if (t.includes("payment voucher") || t.includes("payment") || t.includes("disburse") || t.includes("remittance") || t.includes("pdc") || t.includes("cheque")) return <CreditCard />;
  if (t.includes("tax") || t.includes("vat") || t.includes("wht") || t.includes("withholding")) return <Percent />;
  if (t.includes("discount") || t.includes("price") || t.includes("pricing") || t.includes("scheme")) return <Tag />;
  if (t.includes("bank") || t.includes("cash") || t.includes("fund") || t.includes("financial") || t.includes("account")) return <Coins />;

  // 12. Reports, Analytics, KPI & Performance
  if (t.includes("overview") || t.includes("dashboard") || t.includes("bi dashboard")) return <LayoutDashboard />;
  if (t.includes("profitability") || t.includes("sales trend") || t.includes("growth") || t.includes("revenue trend")) return <TrendingUp />;
  if (t.includes("budget") || t.includes("budgeting")) return <PieChart />;
  if (t.includes("analytic") || t.includes("performance") || t.includes("kpi") || t.includes("chart") || /\bbi\b/i.test(t)) return <BarChart3 />;
  if (t.includes("report") || t.includes("register") || t.includes("summary") || t.includes("statement") || t.includes("log book") || t.includes("roster")) return <FileSpreadsheet />;

  // 13. Sales, Orders & Marketing
  if (t.includes("quotation") || t.includes("quote") || t.includes("rfq") || t.includes("estimate")) return <FileText />;
  if (t.includes("order") || t.includes("lpo") || t.includes("ipo") || t.includes("purchase") || t.includes("procure") || t.includes("buy")) return <ShoppingCart />;
  if (t.includes("campaign") || t.includes("promo") || t.includes("broadcast") || t.includes("announcement")) return <Sparkles />;

  // 14. Transport, Fleet & Maintenance
  if (t.includes("fuel") || t.includes("diesel") || t.includes("gasoline") || t.includes("mileage") || t.includes("odometer")) return <Fuel />;
  if (t.includes("shipping advice") || t.includes("shipment") || t.includes("vessel")) return <Ship />;
  if (t.includes("port clearance") || t.includes("customs") || t.includes("berth")) return <Anchor />;
  if (t.includes("trip") || t.includes("route") || t.includes("route tracking")) return <RouteIcon />;
  if (t.includes("vehicle") || t.includes("truck") || t.includes("fleet") || t.includes("transport")) return <Truck />;
  if (t.includes("gps") || t.includes("navigation") || t.includes("tracking")) return <Navigation />;
  if (t.includes("maintenance") || t.includes("repair") || t.includes("work order") || t.includes("technician") || t.includes("service job") || t.includes("servicing")) return <Wrench />;
  if (t.includes("equipment log") || t.includes("equipment") || t.includes("machine") || t.includes("asset") || t.includes("tool") || t.includes("spares")) return <Boxes />;
  if (t.includes("property") || t.includes("estate") || t.includes("facility") || t.includes("building") || t.includes("branch") || t.includes("company") || t.includes("tenant")) return <Building2 />;
  if (t.includes("meter") || t.includes("utility") || t.includes("gauge")) return <Gauge />;
  if (t.includes("factory") || t.includes("plant") || t.includes("production line") || t.includes("work center") || t.includes("bom") || t.includes("mrp") || t.includes("manufacturing")) return <Factory />;
  if (t.includes("helpdesk") || t.includes("service request") || t.includes("ticket") || t.includes("service call")) return <Headset />;

  // 15. Security, System, Settings, Access & Licenses
  if (t.includes("override") || t.includes("exceptional") || t.includes("exception")) return <KeyRound />;
  if (t.includes("permission") || t.includes("access control") || t.includes("security matrix")) return <Lock />;
  if (t.includes("role") || t.includes("credential") || t.includes("privilege")) return <ShieldCheck />;
  if (t.includes("license") || t.includes("package") || t.includes("subscription")) return <Key />;
  if (t.includes("workflow") || t.includes("approval engine") || t.includes("configuration")) return <Workflow />;
  if (t.includes("approved document") || t.includes("document review")) return <FileCheck2 />;
  if (t.includes("audit report") || t.includes("activity log") || t.includes("system log")) return <Scroll />;
  if (t.includes("diagnostic") || t.includes("system health") || t.includes("health check")) return <Stethoscope />;
  if (t.includes("template") || t.includes("print format") || t.includes("document template")) return <Printer />;
  if (t.includes("setting") || t.includes("config") || t.includes("setup") || t.includes("parameter") || t.includes("preference") || t.includes("admin")) return <Settings />;
  if (t.includes("database") || t.includes("backup")) return <Database />;
  if (t.includes("home")) return <Home />;
  if (t.includes("item") || t.includes("stock") || t.includes("material") || t.includes("product")) return <Package />;

  // --- Fallback based on featureKey / path ---
  if (f.includes("report") || p.includes("report")) return <FileSpreadsheet />;
  if (f.includes("setting") || p.includes("setting")) return <Settings />;
  if (f.includes("dashboard") || p.includes("dashboard")) return <LayoutDashboard />;

  // Explicit icon fallback if provided and valid
  if (explicitIcon && typeof explicitIcon === "function") {
    return React.createElement(explicitIcon, { className: "w-5 h-5 sm:w-6 sm:h-6 stroke-[2] text-white" });
  }
  if (explicitIcon && typeof explicitIcon === "object" && (explicitIcon.$typeof || explicitIcon.render)) {
    return explicitIcon;
  }

  return <FileText />;
}

/**
 * AppShell component
 * Acts as the primary shell around all authenticated routes.
 * Initializes real-time sockets, manages offline queue state, and handles user session inactivity.
 *
 * @returns {JSX.Element} The rendered application shell.
 */
export default function AppShell() {
  const { token, user, scope, setScope, logout } = useAuth();
  const {
    isModuleEnabled,
    canViewModule,
    canPerformAction,
    globalOverrides,
    canPerformPageAction,
    ensurePagePerms,
    basePathFrom,
    canAccessFeatureKey,
    canAccessPath,
    canViewDashboardElement,
    appBackground,
    roleFeatures,
    permissions,
    isSuper,
    sidebarDisplayMode: ctxSidebarDisplayMode,
  } = usePermission();
  const { theme } = useTheme();
  const isDark =
    theme === "dark" ||
    (typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"));
  const resolvedBg = useMemo(
    () => resolveBackgroundForTheme(appBackground, isDark),
    [appBackground, isDark],
  );

  // Dynamic top 3 modules for mobile bottom navigation ordered by number of assigned pages
  const topMobileModules = useMemo(() => {
    // 1. Filter modules assigned / viewable to this user
    const assigned = modules.filter((m) => {
      if (m.key === "system-configuration") {
        return Number(user?.id) === 1 || Number(user?.id) === 2;
      }
      return canViewModule(m.key);
    });

    // 2. Count accessible / assigned pages per module
    const withPageCounts = assigned.map((m, index) => {
      let pageCount = 0;
      const modInfo = MODULES_REGISTRY[m.key] || {};
      const regFeatures = (modInfo.features || []).filter(
        (f) => f.type !== "dashboard"
      );

      // Unique page keys from MODULES_REGISTRY and MODULE_SECTIONS
      const allPageKeys = new Set(regFeatures.map((f) => f.key));
      const sections = MODULE_SECTIONS[m.key] || [];
      sections.forEach((sec) => {
        (sec.features || []).forEach((f) => {
          if (f.type !== "dashboard" && f.key) {
            allPageKeys.add(f.key);
          }
        });
      });

      // Count pages accessible to the user
      allPageKeys.forEach((fKey) => {
        if (canAccessFeatureKey(m.key, fKey)) {
          pageCount++;
        }
      });

      // Also account for any roleFeatures specific to this module that might not be in registry
      if (roleFeatures && roleFeatures.size > 0) {
        const prefix = `${m.key}:`;
        roleFeatures.forEach((rf) => {
          if (rf.startsWith(prefix)) {
            const subKey = rf.slice(prefix.length);
            if (!allPageKeys.has(subKey) && !subKey.includes("dashboard")) {
              pageCount++;
            }
          }
        });
      }

      return {
        ...m,
        pageCount,
        originalIndex: index,
      };
    });

    // Prefer modules that have at least 1 assigned page
    const validModules = withPageCounts.filter((m) => m.pageCount > 0);
    let candidates = [...validModules];

    // Ensure at least 4 candidates in the window if accessible modules exist
    if (candidates.length < 4 && withPageCounts.length >= 4) {
      const existingKeys = new Set(candidates.map((m) => m.key));
      for (const m of withPageCounts) {
        if (!existingKeys.has(m.key)) {
          candidates.push(m);
          existingKeys.add(m.key);
          if (candidates.length >= 4) break;
        }
      }
    } else if (candidates.length === 0) {
      candidates = [...withPageCounts];
    }

    // Sort descending by number of assigned pages; tie-break by original index
    candidates.sort((a, b) => {
      if (b.pageCount !== a.pageCount) {
        return b.pageCount - a.pageCount;
      }
      return a.originalIndex - b.originalIndex;
    });

    // Return all assigned modules sorted by priority so user can slide through all modules on mobile & tablet
    return candidates;
  }, [
    user?.id,
    canViewModule,
    canAccessFeatureKey,
    roleFeatures,
    permissions,
    isSuper,
  ]);
  const { pending, failed, completed, items, lastEvent } = useOfflineQueue();
  const navigate = useNavigate();
  const location = useLocation();
  const [queueOpen, setQueueOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [expandedModules, setExpandedModules] = useState({});
  const moduleIconMap = useMemo(() => new Map(modules.map((m) => [m.key, m.icon])), []);
  const isUserId1 = Number(user?.sub || user?.id) === 1;
  const [localSidebarDisplayMode, setLocalSidebarDisplayMode] = useState(() => {
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

  useEffect(() => {
    const handleSidebarDisplayModeChange = (e) => {
      const next = e.detail?.mode;
      if (next && ["MODULES", "SECTIONS", "PAGES"].includes(String(next).toUpperCase())) {
        setLocalSidebarDisplayMode(String(next).toUpperCase());
      }
    };
    window.addEventListener("sidebar-display-mode-changed", handleSidebarDisplayModeChange);
    return () => window.removeEventListener("sidebar-display-mode-changed", handleSidebarDisplayModeChange);
  }, []);

  const activeSidebarDisplayMode = localSidebarDisplayMode || ctxSidebarDisplayMode || "MODULES";
  const [expandedSections, setExpandedSections] = useState({});

  const allMobileSections = useMemo(() => {
    const list = [];
    MODULE_HOME_SECTIONS.filter((mod) => {
      if (mod.moduleKey === "system-configuration") {
        return Number(user?.id) === 1 || Number(user?.id) === 2;
      }
      return canViewModule(mod.moduleKey);
    }).forEach((mod) => {
      (mod.sections || []).forEach((sec) => {
        const targetPath = sec.path || `${mod.modulePath}?section=${encodeURIComponent(sec.title)}`;
        const hasPerm = !sec.path || (canAccessPath && canAccessPath(sec.path));
        if (hasPerm && sec.title) {
          list.push({
            key: `${mod.moduleKey}-${sec.key}`,
            label: sec.title,
            shortLabel: sec.title,
            path: targetPath,
            icon: getSectionIcon(sec.key, sec.title),
          });
        }
      });
    });
    return list;
  }, [user?.id, canViewModule, canAccessPath]);

  const allMobilePages = useMemo(() => {
    const list = [];
    const seen = new Set();
    const isUid1 = Number(user?.id) === 1 || Number(user?.id) === 2;

    MODULE_HOME_SECTIONS.filter((mod) => {
      if (mod.moduleKey === "system-configuration") {
        return isUid1;
      }
      return isUid1 || isSuper || canViewModule(mod.moduleKey);
    }).forEach((mod) => {
      (mod.sections || []).forEach((sec) => {
        (sec.items || []).forEach((item) => {
          if (item.path && !seen.has(item.path)) {
            const hasPerm =
              isUid1 ||
              isSuper ||
              (canAccessPath && canAccessPath(item.path)) ||
              (item.feature_key && canAccessFeatureKey(mod.moduleKey, item.feature_key));
            if (hasPerm) {
              seen.add(item.path);
              list.push({
                key: item.path,
                label: item.title,
                shortLabel: item.title,
                path: item.path,
                icon: getPageWhiteIcon(item.title, item.path, item.feature_key),
              });
            }
          }
        });
      });
    });
    return list;
  }, [user?.id, isSuper, canViewModule, canAccessFeatureKey, canAccessPath]);

  const mobileNavItems = useMemo(() => {
    if (activeSidebarDisplayMode === "PAGES") {
      return allMobilePages.slice(0, 16);
    }
    if (activeSidebarDisplayMode === "SECTIONS") {
      return allMobileSections.slice(0, 16);
    }
    return topMobileModules;
  }, [activeSidebarDisplayMode, allMobilePages, allMobileSections, topMobileModules]);
  const lastChatToneAtRef = useRef(0);
  const listPageContentRef = useRef(null);
  const mobileNavScrollRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuSearch, setMobileMenuSearch] = useState("");

  useEffect(() => {
    if (!sidebarOpen) {
      setMobileMenuSearch("");
    }
  }, [sidebarOpen]);

  const filteredMobilePages = useMemo(() => {
    if (!mobileMenuSearch.trim()) return allMobilePages;
    const q = mobileMenuSearch.toLowerCase().trim();
    return allMobilePages.filter((p) => (p.label || "").toLowerCase().includes(q));
  }, [allMobilePages, mobileMenuSearch]);

  const filteredMobileSections = useMemo(() => {
    if (!mobileMenuSearch.trim()) return allMobileSections;
    const q = mobileMenuSearch.toLowerCase().trim();
    return allMobileSections.filter((s) => (s.label || "").toLowerCase().includes(q));
  }, [allMobileSections, mobileMenuSearch]);

  const filteredMobileModules = useMemo(() => {
    const allowed = modules.filter(
      (m) => m.key !== "system-configuration" || Number(user?.id) === 1 || Number(user?.id) === 2
    );
    if (!mobileMenuSearch.trim()) return allowed;
    const q = mobileMenuSearch.toLowerCase().trim();
    return allowed.filter((m) => (m.label || "").toLowerCase().includes(q));
  }, [user?.id, mobileMenuSearch]);

  useEffect(() => {
    if (mobileNavScrollRef.current) {
      mobileNavScrollRef.current.scrollLeft = 0;
    }
  }, [activeSidebarDisplayMode]);
  useEffect(() => {
    if (lastEvent === "queued") {
      setSavedToast(true);
      const t = setTimeout(() => setSavedToast(false), 3000);
      return () => clearTimeout(t);
    }
  }, [lastEvent]);

  useEffect(() => {
    if (sessionStorage.getItem("triggerRenewal") === "true") {
      sessionStorage.removeItem("triggerRenewal");
      setShowPaymentModal(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function checkLicense() {
      if (Number(user?.id) === 1) return;
      const companyId = user?.company_id || user?.companyIds?.[0];
      if (!companyId) return;

      try {
        const res = await api.get(`/licenses/company/${companyId}`);
        if (mounted && res?.data) {
          const l = res.data;
          console.log("License Data:", l);
          if (
            [
              "ACTIVE",
              "EXPIRED",
              "INACTIVE",
              "SUSPENDED",
              "CANCELLED",
            ].includes(l.status)
          ) {
            const exp = new Date(l.expiry_date);
            const graceDays = l.grace_days || 0;
            const finalExp = new Date(
              exp.getTime() + graceDays * 24 * 60 * 60 * 1000,
            );
            const now = new Date();
            let daysRemaining = Math.max(
              0,
              Math.ceil((finalExp - now) / (1000 * 60 * 60 * 24)),
            );

            const alertDays =
              l.alert_days !== undefined && l.alert_days !== null
                ? l.alert_days
                : 30;
            console.log("License Expiry:", {
              daysRemaining,
              alertDays,
              finalExp,
              now,
              status: l.status,
            });

            const shouldAlert =
              l.status !== "ACTIVE" ||
              daysRemaining <= alertDays ||
              isNaN(daysRemaining);

            if (shouldAlert) {
              const formattedDate = new Date(
                l.expiry_date,
              ).toLocaleDateString();
              let title = "";
              let text = "";

              if (l.status === "INACTIVE") {
                title = "License Inactive";
                text = "Your license is currently INACTIVE. Please renew.";
              } else if (l.status === "SUSPENDED") {
                title = "License Suspended";
                text = "Your license is suspended. Please renew.";
              } else if (l.status === "CANCELLED") {
                title = "License Cancelled";
                text = "Your license is cancelled. Please renew.";
              } else {
                title =
                  daysRemaining === 0
                    ? "License Expired"
                    : "License Expiring Soon";
                text =
                  daysRemaining === 0
                    ? `Your license expired on ${formattedDate} (including ${graceDays} days grace).`
                    : `Your license expires on ${formattedDate} + ${graceDays} days grace period.`;
              }

              // Temporarily ignore the dismissal check to guarantee it shows during our testing
              const isDismissed = false; // sessionStorage.getItem("licenseAlertDismissed") === "true";
              const canDismiss = l.status === "ACTIVE" && daysRemaining > 0;
              const canRenew = canAccessFeatureKey("system", "license-renewal");

              if (!isDismissed || !canDismiss) {
                Swal.fire({
                  toast: true,
                  position: "bottom-end",
                  title,
                  iconHtml: `<img src="${clearIcon}" style="height: 64px; width: auto; object-fit: contain;" />`,
                  text,
                  showCancelButton: canDismiss,
                  showConfirmButton: canRenew,
                  confirmButtonColor: "#2563eb",
                  cancelButtonColor: "#64748b",
                  confirmButtonText: "Renew",
                  cancelButtonText: "Dismiss",
                  width: "20em",
                  padding: "0.5em",
                  customClass: {
                    container: "z-[999999]",
                    title: "text-sm m-0 p-0",
                    htmlContainer: "text-xs m-1 p-0",
                    actions: "m-0 p-0 scale-75",
                    icon: "border-0 m-0 mr-2",
                  },
                  timerProgressBar: true,
                  showCloseButton: canDismiss,
                  background: "rgba(255, 255, 255, 1)",
                }).then((result) => {
                  if (result.isConfirmed) {
                    setShowPaymentModal(true);
                  } else if (result.isDismissed) {
                    sessionStorage.setItem("licenseAlertDismissed", "true");
                  }
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("License check error:", err);
      }
    }

    checkLicense();
    return () => {
      mounted = false;
    };
  }, [user]);

  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine !== false : true,
  );
  useEffect(() => {
    function onOnline() {
      setOnline(true);
      touchLastActivity();
    }
    function onOffline() {
      // Validate with network probe before assuming offline to prevent sleep/screen-lock glitches
      fetch("/api/health", { method: "HEAD", cache: "no-store" })
        .then(() => setOnline(true))
        .catch(() => {
          if (typeof navigator !== "undefined" && navigator.onLine === false) {
            setOnline(false);
          }
        });
    }
    function onWakeOrFocus() {
      touchLastActivity();
      setOnline(true);
      api.get("/auth/me", BACKGROUND_GET_CONFIG).catch(() => {});
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("focus", onWakeOrFocus);
    document.addEventListener("visibilitychange", onWakeOrFocus);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("focus", onWakeOrFocus);
      document.removeEventListener("visibilitychange", onWakeOrFocus);
    };
  }, []);
  useEffect(() => {
    try {
      if ("serviceWorker" in navigator) {
        function playChatTone() {
          try {
            const now = Date.now();
            if (now - Number(lastChatToneAtRef.current || 0) < 800) return;
            lastChatToneAtRef.current = now;
            const AudioCtx =
              window.AudioContext || window.webkitAudioContext || null;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = "triangle";
            o.frequency.setValueAtTime(880, ctx.currentTime);
            g.gain.setValueAtTime(0.0001, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.01);
            o.connect(g).connect(ctx.destination);
            o.start();
            setTimeout(() => {
              o.frequency.setValueAtTime(660, ctx.currentTime);
            }, 150);
            setTimeout(() => {
              g.gain.exponentialRampToValueAtTime(
                0.0001,
                ctx.currentTime + 0.01,
              );
              o.stop();
              ctx.close();
            }, 700);
          } catch {}
        }
        const handler = (e) => {
          const data = e?.data || {};
          if (data.type === "navigate" && typeof data.url === "string") {
            const url = data.url;
            setTimeout(() => {
              if (url.startsWith("/chat?cid=")) {
                try {
                  const m = url.match(/cid=(\d+)/);
                  const cid = m ? Number(m[1]) : null;
                  if (cid) {
                    localStorage.setItem(
                      "omni.chat.lastConversationId",
                      String(cid),
                    );
                    window.dispatchEvent(new Event("omni.chat.open"));
                  }
                } catch {}
                navigate("/");
              } else {
                navigate(url);
              }
            }, 0);
          }
          if (data.type === "chat_push") {
            if (
              typeof document !== "undefined" &&
              document.visibilityState === "visible"
            ) {
              const run =
                typeof window !== "undefined" &&
                typeof window.requestIdleCallback === "function"
                  ? window.requestIdleCallback
                  : (fn) => setTimeout(fn, 0);
              run(() => playChatTone());
            }
          }
        };
        navigator.serviceWorker.addEventListener("message", handler);
        return () =>
          navigator.serviceWorker.removeEventListener("message", handler);
      }
    } catch {}
  }, [navigate]);

  useEffect(() => {
    try {
      if (typeof sessionStorage !== "undefined") {
        const path = location.pathname + (location.search || "");
        sessionStorage.setItem("last_path", path);
      }
    } catch {}
  }, [location.pathname, location.search]);
  useEffect(() => {
    async function logPageView() {
      try {
        if (import.meta && import.meta.env && import.meta.env.DEV) {
          return;
        }
        const path = location.pathname || "/";
        const seg = path.split("/").filter(Boolean)[0] || "dashboard";
        const moduleName = seg
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        try {
          await api.post("/admin/activity/log", {
            module_name: moduleName,
            action: "VIEW",
            ref_no: String(user?.username || ""),
            message: "Page View",
            url_path: path,
            event_time: new Date().toISOString(),
          });
        } catch {}
      } catch {}
    }
    logPageView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const sidebarTouchStart = useRef(null);
  const handleSidebarTouchStart = (e) => {
    sidebarTouchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };
  const handleSidebarTouchEnd = (e) => {
    if (!sidebarTouchStart.current) return;
    const dx = e.changedTouches[0].clientX - sidebarTouchStart.current.x;
    const dy = e.changedTouches[0].clientY - sidebarTouchStart.current.y;
    sidebarTouchStart.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && dx < 0) {
      setSidebarOpen(false);
    }
  };
  useEffect(() => {
    if (sidebarOpen && window.innerWidth < 768) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen]);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const [contextModalOpen, setContextModalOpen] = useState(false);
    // Automatically close the side menu bar when a page is opened
  // (Excludes module homes and module home sections)
  useEffect(() => {
    if (isModuleHomeOrSection(location.pathname, location.search)) {
      return;
    }
    setSidebarOpen(false);
  }, [location.pathname, location.search]);
  const [lowStockPrompted, setLowStockPrompted] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [changePwModalOpen, setChangePwModalOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwChanging, setPwChanging] = useState(false);
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);
  useEffect(() => {
    if (user?.status === "N") {
      setWelcomeModalOpen(true);
    }
  }, [user?.status]);
  useEffect(() => {
    try {
      const raw =
        typeof localStorage !== "undefined"
          ? localStorage.getItem("omni.unread_notification_count")
          : null;
      if (raw != null && raw !== "") {
        const n = Number(raw);
        if (Number.isFinite(n) && n >= 0) {
          setUnreadCount(n);
        }
      }
    } catch {}
  }, []);
  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;
    function onNewNotif(payload) {
      try {
        setUnreadCount((n) => {
          const next = (n || 0) + 1;
          try {
            if (typeof localStorage !== "undefined") {
              localStorage.setItem(
                "omni.unread_notification_count",
                String(next),
              );
            }
          } catch {}
          return next;
        });
      } catch {}
    }
    socket.on("notifications:new", onNewNotif);
    return () => {
      socket.off("notifications:new", onNewNotif);
    };
  }, [socket]);

  const [pushPromptAllowed, setPushPromptAllowed] = useState(false);
  const [pushPromptRolledDown, setPushPromptRolledDown] = useState(false);

  const dismissPushPrompt = () => {
    setPushPromptRolledDown(false);
    setPushPromptAllowed(false);
  };

  useEffect(() => {
    if (!token) {
      setPushPromptAllowed(false);
      setPushPromptRolledDown(false);
      return;
    }
    let showTimer = null;
    let hideTimer = null;
    try {
      const raw =
        typeof localStorage !== "undefined"
          ? localStorage.getItem("push_enabled")
          : null;
      const enabled = raw === "1";
      const perm =
        typeof window !== "undefined" && "Notification" in window
          ? window.Notification.permission
          : "denied";
      const canPrompt =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      if (!canPrompt || enabled || perm === "granted") {
        setPushPromptAllowed(false);
        setPushPromptRolledDown(false);
        return;
      }

      // Eligible: hidden on login, rolls down 1 minute after login, stays for 30 seconds, then rolls up back
      setPushPromptAllowed(true);
      setPushPromptRolledDown(false);

      showTimer = setTimeout(() => {
        setPushPromptRolledDown(true);

        hideTimer = setTimeout(() => {
          setPushPromptRolledDown(false);
        }, 30000);
      }, 60000);
    } catch {
      setPushPromptAllowed(false);
      setPushPromptRolledDown(false);
    }

    return () => {
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [token]);

  async function enablePushNow() {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("push_enabled", "1");
      }
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        dismissPushPrompt();
        return;
      }
      if (window.Notification.permission === "denied") {
        dismissPushPrompt();
        return;
      }
      if (window.Notification.permission !== "granted") {
        try {
          const perm = await window.Notification.requestPermission();
          if (perm !== "granted") {
            dismissPushPrompt();
            return;
          }
        } catch {
          dismissPushPrompt();
          return;
        }
      }
      const reg = await navigator.serviceWorker.ready;
      let publicKey = "";
      try {
        const res = await api.get("/push/public-key");
        publicKey = String(res.data?.publicKey || "");
      } catch {
        publicKey = "";
      }
      if (!publicKey) {
        dismissPushPrompt();
        return;
      }
      function urlBase64ToUint8Array(base64String) {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
          .replace(/-/g, "+")
          .replace(/_/g, "/");
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      }
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      const existing = await reg.pushManager.getSubscription();
      if (existing && existing.endpoint) {
        try {
          await api.post("/push/subscribe", {
            subscription: existing.toJSON(),
          });
        } catch {}
        dismissPushPrompt();
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      try {
        await api.post("/push/subscribe", { subscription: sub.toJSON() });
      } catch {}
      dismissPushPrompt();
    } catch {
      dismissPushPrompt();
    }
  }

  const [branchOptions, setBranchOptions] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(
    () => scope?.branchId || null,
  );
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    if (scope?.branchId) {
      setSelectedBranchId(scope.branchId);
    }
  }, [scope?.branchId]);

  const profile = useMemo(() => {
    const username = user?.username || user?.name || "Guest";
    const role =
      user?.role ||
      (Array.isArray(user?.roles) ? user.roles[0] : null) ||
      "Developer";

    // Resolve the active branch from the branchOptions list so the name
    // reflects the currently switched branch, not the JWT default.
    const activeBranch = Array.isArray(branchOptions)
      ? branchOptions.find((b) => Number(b.id) === Number(scope?.branchId))
      : null;
    const companyName =
      activeBranch?.company_name ||
      user?.companyName ||
      `Company #${scope?.companyId ?? "-"}`;
    const branchName =
      activeBranch?.name ||
      user?.branchName ||
      `Branch #${scope?.branchId ?? "-"}`;

    return { username, role, companyName, branchName };
  }, [scope?.branchId, scope?.companyId, user, branchOptions]);

  const roleOptions = useMemo(
    () =>
      Array.isArray(user?.roles) ? user.roles : user?.role ? [user.role] : [],
    [user?.roles, user?.role],
  );
  const [selectedRole, setSelectedRole] = useState(() =>
    Array.isArray(user?.roles) ? user.roles[0] : user?.role || null,
  );
  const [dbRoles, setDbRoles] = useState([]);
  const [dbRolesLoading, setDbRolesLoading] = useState(false);
  useEffect(() => {
    const userId = Number(user?.sub || user?.id);
    if (!Number.isFinite(userId)) {
      setDbRoles([]);
      return;
    }
    let mounted = true;
    async function loadRoles() {
      setDbRolesLoading(true);
      try {
        const res = await api.get(`/admin/users/${userId}/roles`);
        const items =
          (res.data && res.data.data && Array.isArray(res.data.data.items)
            ? res.data.data.items
            : Array.isArray(res.data?.items)
              ? res.data.items
              : []) || [];
        if (mounted) setDbRoles(items);
        if (mounted && items.length > 0 && !selectedRole) {
          setSelectedRole(items[0]?.name || items[0]?.code || null);
        }
      } catch {
        if (mounted) setDbRoles([]);
      } finally {
        if (mounted) setDbRolesLoading(false);
      }
    }
    loadRoles();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLowStockPrompted(false);
    setLowStockCount(0);
    setUnreadCount(0);
  }, [scope?.companyId, scope?.branchId]);

  useEffect(() => {
    let cancelled = false;
    async function subscribePush() {
      try {
        const raw =
          typeof localStorage !== "undefined"
            ? localStorage.getItem("push_enabled")
            : null;
        const enabled = raw === null ? true : String(raw) === "1";
        if (!enabled) return;
        if (typeof window === "undefined") return;
        if (!("serviceWorker" in navigator)) return;
        if (!("PushManager" in window)) return;
        if (!("Notification" in window)) return;
        if (window.Notification.permission !== "granted") {
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        let publicKey = "";
        try {
          const res = await api.get("/push/public-key");
          publicKey = String(res.data?.publicKey || "");
        } catch {
          publicKey = "";
        }
        if (!publicKey) return;
        function urlBase64ToUint8Array(base64String) {
          const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
          const base64 = (base64String + padding)
            .replace(/-/g, "+")
            .replace(/_/g, "/");
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
        }
        const applicationServerKey = urlBase64ToUint8Array(publicKey);
        const existing = await reg.pushManager.getSubscription();
        if (existing && existing.endpoint) {
          try {
            await api.post("/push/subscribe", {
              subscription: existing.toJSON(),
            });
          } catch {}
          return;
        }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
        if (cancelled) return;
        try {
          await api.post("/push/subscribe", { subscription: sub.toJSON() });
        } catch {}
      } catch {}
    }
    subscribePush();
    return () => {
      cancelled = true;
    };
  }, [token]);
  const authFailedRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    let pollTimer = null;

    async function loadUnread() {
      try {
        if (!token || !online || authFailedRef.current) return;
        const res = await api.get(
          "/workflows/notifications",
          BACKGROUND_GET_CONFIG,
        );
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        const unread = items.filter((n) => Number(n.is_read) !== 1).length;
        setUnreadCount(unread);
        try {
          if (typeof localStorage !== "undefined") {
            localStorage.setItem(
              "omni.unread_notification_count",
              String(unread),
            );
          }
        } catch {}
        if (typeof window !== "undefined") {
          try {
            const storeKey = "notified_notification_ids";
            const prevRaw = localStorage.getItem(storeKey);
            const prev = prevRaw ? JSON.parse(prevRaw) : [];
            const prevSet = new Set(Array.isArray(prev) ? prev : []);
            const nativeAllowed =
              "Notification" in window &&
              window.Notification?.permission === "granted";
            const icon =
              theme === "dark"
                ? "/OMNISUITE_ICON_CLEAR.png"
                : "/OMNISUITE_ICON_CLEAR.png";
            // Identify all new unread notifications that haven't been alerted yet
            const pendingNotifs = items.filter((n) => {
              const id = Number(n.id);
              const isUnread = Number(n.is_read) !== 1;
              return isUnread && !prevSet.has(id);
            });

            if (pendingNotifs.length === 1) {
              // Single notification: display directly
              const single = pendingNotifs[0];
              try {
                addNotification({
                  title: String(single.title || "Notification"),
                  message: String(single.message || ""),
                  native: nativeAllowed,
                  icon,
                  onClick: () => {
                    if (single.link) navigate(String(single.link));
                    else navigate("/notifications");
                  },
                });
              } catch {}
              prevSet.add(Number(single.id));
            } else if (pendingNotifs.length > 1) {
              // Multiple notifications: Consolidate into ONE single push notification
              // Group and count distinct notification types
              const typeCounts = {};
              for (const n of pendingNotifs) {
                const title = String(n.title || "").trim();
                const msg = String(n.message || "").toLowerCase();
                const link = String(n.link || "").toLowerCase();
                const t = String(n.type || "").toLowerCase();

                let category = "General Alert";
                if (t.includes("stock") || title.toLowerCase().includes("stock") || msg.includes("reorder") || link.includes("low-stock")) {
                  category = "Low Stock Alert";
                } else if (t.includes("approval_req") || title.toLowerCase().includes("approval required") || title.toLowerCase().includes("pending approval") || msg.includes("requires your approval")) {
                  category = "Approval Request";
                } else if (t.includes("approved") || title.toLowerCase().includes("approved")) {
                  category = "Document Approved";
                } else if (t.includes("reject") || title.toLowerCase().includes("rejected") || title.toLowerCase().includes("returned")) {
                  category = "Document Rejected";
                } else if (t.includes("workflow") || link.includes("workflow") || title.toLowerCase().includes("workflow")) {
                  category = "Workflow Update";
                } else if (t.includes("post") || t.includes("feed") || title.toLowerCase().includes("post") || link.includes("feed")) {
                  category = "Social Feed Post";
                } else if (t.includes("petty") || t.includes("voucher") || link.includes("finance") || title.toLowerCase().includes("voucher") || title.toLowerCase().includes("cash")) {
                  category = "Finance Voucher";
                } else if (t.includes("task") || t.includes("project") || link.includes("project") || title.toLowerCase().includes("project")) {
                  category = "Project Task";
                } else if (title) {
                  category = title;
                }

                typeCounts[category] = (typeCounts[category] || 0) + 1;
                prevSet.add(Number(n.id));
              }

              const totalCount = pendingNotifs.length;
              // Format breakdown of types, e.g. "10 Low Stock Alerts, 1 Approval Request, 1 Document Approved"
              const typeBreakdown = Object.entries(typeCounts)
                .map(([type, count]) => {
                  const plural = count === 1 ? type : (type.endsWith("s") ? type : `${type}s`);
                  return `${count} ${plural}`;
                })
                .join(", ");

              try {
                addNotification({
                  title: `🔔 You have ${totalCount} new notifications`,
                  message: `${typeBreakdown}. Click to review all notifications.`,
                  native: nativeAllowed,
                  icon,
                  onClick: () => {
                    navigate("/notifications");
                  },
                });
              } catch {}
            }

            localStorage.setItem(storeKey, JSON.stringify(Array.from(prevSet)));
          } catch {}
        }
      } catch (err) {
        if (err?.response?.status === 401) authFailedRef.current = true;
      }
    }

    async function checkLowStock() {
      try {
        if (lowStockPrompted) return;
        const res = await api.get(
          "/inventory/alerts/low-stock",
          BACKGROUND_GET_CONFIG,
        );
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        if (!items.length) return;
        setLowStockPrompted(true);
        setLowStockCount(items.length);
        const count = items.length;
        const nativeAllowed =
          typeof window !== "undefined" &&
          "Notification" in window &&
          window.Notification?.permission === "granted";
        const icon =
          theme === "dark"
            ? "/OMNISUITE_ICON_CLEAR.png"
            : "/OMNISUITE_ICON_CLEAR.png";
        // Suppress inline/pop-up messages completely per requirement
      } catch {}
    }
    if (token && online) {
      const cancelLowStock = scheduleDeferredTask(checkLowStock, 250);
      const cancelUnread = scheduleDeferredTask(loadUnread, 350);
      return () => {
        cancelled = true;
        cancelLowStock();
        cancelUnread();
      };
    }
    return () => {
      cancelled = true;
    };
  }, [scope?.companyId, scope?.branchId, lowStockPrompted, token, online]);

  useEffect(() => {
    if (!token) return;
    let throttleTimer = null;
    const handleActivity = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        touchLastActivity();
        throttleTimer = null;
      }, 5000); // Throttle activity updates to once every 5 seconds
    };

    window.addEventListener("mousemove", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });
    window.addEventListener("click", handleActivity, { passive: true });
    window.addEventListener("scroll", handleActivity, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const inactivityTimer = setInterval(() => {
      const timeoutMs = getInactivityTimeoutMs();
      if (timeoutMs <= 0) return;
      const lastActivity = getLastActivity();
      if (lastActivity > 0 && Date.now() - lastActivity > timeoutMs) {
        logout({ redirect: false });
      }
    }, 30000);
    return () => clearInterval(inactivityTimer);
  }, [token, logout]);

  // Persistent Keep-Alive Heartbeat: keep connection alive and prevent disconnection when computer is inactive
  useEffect(() => {
    if (!token) return;
    const keepAliveTimer = setInterval(() => {
      touchLastActivity();
      api.get("/auth/me", BACKGROUND_GET_CONFIG).catch(() => {});
    }, 90000); // Heartbeat every 90 seconds
    return () => clearInterval(keepAliveTimer);
  }, [token]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    function onSwMessage(ev) {
      try {
        const t = String(ev?.data?.type || "");
        if (t === "workflow_push") {
          if (!window.__omniSocketConnected) {
            setUnreadCount((n) => {
              const next = (n || 0) + 1;
              try {
                if (typeof localStorage !== "undefined") {
                  localStorage.setItem(
                    "omni.unread_notification_count",
                    String(next),
                  );
                }
              } catch {}
              return next;
            });
          }
        }
      } catch {}
    }
    navigator.serviceWorker.addEventListener("message", onSwMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", onSwMessage);
  }, []);

  useEffect(() => {
    const roles = Array.isArray(user?.roles)
      ? user.roles
      : user?.role
        ? [user.role]
        : [];
    if (roles.length && !roles.includes(selectedRole)) {
      setSelectedRole(roles[0]);
    }
  }, [user?.roles, user?.role, selectedRole]);

  useEffect(() => {
    let mounted = true;
    async function loadUserBranches() {
      try {
        const res = await api.get("/auth/user-branches", BACKGROUND_GET_CONFIG);
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        if (mounted) {
          setBranchOptions(items);
          if (!selectedBranchId && !scope?.branchId && items.length > 0) {
            setSelectedBranchId(Number(items[0].id));
          }
        }
      } catch (err) {
        console.error("Failed to load branches:", err);
        setBranchOptions([]);
      }
    }
    const cancelLoad = scheduleDeferredTask(loadUserBranches, 250);
    return () => {
      mounted = false;
      cancelLoad();
    };
  }, [scope?.branchId]);
  useEffect(() => {
    let mounted = true;
    async function loadCompanies() {
      try {
        const res = await api.get("/admin/companies", BACKGROUND_GET_CONFIG);
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        if (mounted) setCompanies(items);
      } catch {
        if (mounted) setCompanies([]);
      }
    }
    const cancelLoad = scheduleDeferredTask(loadCompanies, 300);
    return () => {
      mounted = false;
      cancelLoad();
    };
  }, []);
  const currentBranchName = useMemo(() => {
    const targetId = Number(scope?.branchId ?? selectedBranchId);
    let found = null;
    if (targetId) {
      found = branchOptions.find((b) => Number(b.id) === targetId);
    }
    if (!found) {
      found =
        branchOptions.find((b) => b.name === profile.branchName) ||
        (branchOptions.length ? branchOptions[0] : null);
    }
    if (found) {
      const comp = found.company_name || `Company #${found.company_id}`;
      return `${found.name} (${comp})`;
    }
    return profile.branchName;
  }, [branchOptions, scope?.branchId, selectedBranchId, profile.branchName]);
  const currentCompanyName = useMemo(() => {
    const found = branchOptions.find(
      (b) => Number(b.id) === Number(scope?.branchId),
    );
    if (found) {
      return found.company_name || `Company #${found.company_id}`;
    }
    if (branchOptions.length === 1) {
      const b = branchOptions[0];
      return b.company_name || `Company #${b.company_id}`;
    }
    const mapped = companies.find(
      (c) => Number(c.id) === Number(scope?.companyId),
    );
    if (mapped) return mapped.name;
    return user?.companyName || `Company #${scope?.companyId ?? "-"}`;
  }, [
    branchOptions,
    scope?.branchId,
    user?.companyName,
    scope?.companyId,
    companies,
  ]);
  useEffect(() => {
    const hasMultipleRoles =
      (Array.isArray(dbRoles) && dbRoles.length > 1) ||
      (Array.isArray(roleOptions) && roleOptions.length > 1);
    const hasMultipleBranches = Array.isArray(branchOptions)
      ? branchOptions.length > 1
      : false;
    if (hasMultipleRoles && hasMultipleBranches) {
      setContextModalOpen(true);
    }
  }, [dbRoles, roleOptions, branchOptions]);

  const isRootPage = useMemo(() => {
    const path = location.pathname.replace(/\/+$/, "") || "/";
    if (path === "/" || path === "/dashboard") return true;
    return modules.some((m) => m.path === path);
  }, [location.pathname]);

  useEffect(() => {
    function onDocClick(e) {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(e.target)) setProfileOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    // Proactively prefetch page-level permissions on route change
    try {
      if (ensurePagePerms && typeof location?.pathname === "string") {
        const path = location.pathname || "/";
        const cancelPrefetch = scheduleDeferredTask(
          () => ensurePagePerms(path),
          300,
        );
        return () => cancelPrefetch();
      }
    } catch {}
  }, [location.pathname, ensurePagePerms]);

  useEffect(() => {
    let raf = 0;
    const labels = {
      create: ["+", "new", "create", "generate", "add"],
      delete: ["delete", "deactivate", "remove"],
      edit: ["edit", "update"],
      view: ["view", "open", "details", "preview"],
    };
    const norm = (s) =>
      String(s || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
    const matches = (t, group) => {
      if (!t) return false;
      if (group.includes("+") && t.includes("+")) return true;
      for (const w of group) {
        if (w === "+") continue;
        const re = new RegExp(
          `\\b${w.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`,
          "i",
        );
        if (re.test(t)) return true;
      }
      return false;
    };
    const resolveFeatureKey = () => {
      const path = (window.location && window.location.pathname) || "/";
      const parts = path.split("/").filter(Boolean);
      if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
      return null;
    };
    const resolveBasePath = () => {
      const path = (window.location && window.location.pathname) || "/";
      try {
        return basePathFrom(path);
      } catch {
        const parts = path.split("/").filter(Boolean);
        if (parts.length >= 2) return `/${parts[0]}/${parts[1]}`;
        if (parts.length === 1) return `/${parts[0]}`;
        return "/";
      }
    };
    const apply = () => {
      const fk = resolveFeatureKey();
      const go = globalOverrides || {
        view: false,
        create: false,
        edit: false,
        delete: false,
      };
      const base = resolveBasePath();
      const pageAllow = {
        view: canPerformPageAction ? canPerformPageAction(base, "view") : null,
        create: canPerformPageAction
          ? canPerformPageAction(base, "create")
          : null,
        edit: canPerformPageAction ? canPerformPageAction(base, "edit") : null,
        delete: canPerformPageAction
          ? canPerformPageAction(base, "delete")
          : null,
      };
      if (
        (pageAllow.view === null ||
          pageAllow.create === null ||
          pageAllow.edit === null ||
          pageAllow.delete === null) &&
        ensurePagePerms
      ) {
        try {
          ensurePagePerms(base);
        } catch {}
      }
      const allow = {
        view:
          pageAllow.view !== null
            ? pageAllow.view
            : fk
              ? canPerformAction(fk, "view")
              : true,
        create:
          pageAllow.create !== null
            ? pageAllow.create
            : fk
              ? canPerformAction(fk, "create")
              : true,
        edit:
          pageAllow.edit !== null
            ? pageAllow.edit
            : fk
              ? canPerformAction(fk, "edit")
              : true,
        delete:
          pageAllow.delete !== null
            ? pageAllow.delete
            : fk
              ? canPerformAction(fk, "delete")
              : true,
      };
      const nodes = Array.from(
        document.querySelectorAll(
          'button, a, [role="button"], input[type="button"], input[type="submit"]',
        ),
      );
      const attrNames = [
        "aria-label",
        "title",
        "data-label",
        "data-title",
        "data-tooltip",
        "name",
        "alt",
        "value",
      ];
      const extractTitle = (el) => {
        for (const n of attrNames) {
          const v = el.getAttribute && el.getAttribute(n);
          if (v && String(v).trim()) return String(v);
        }
        // Try dataset fallbacks
        try {
          const ds = el.dataset || {};
          for (const k of Object.keys(ds || {})) {
            const v = ds[k];
            if (v && String(v).trim()) return String(v);
          }
        } catch {}
        // Fall back to text content
        return el.textContent || "";
      };
      for (const el of nodes) {
        try {
          if (
            (el.getAttribute &&
              (el.getAttribute("data-rbac-exempt") === "" ||
                el.getAttribute("data-rbac-exempt") === "true")) ||
            (el.closest &&
              (el.closest("[data-rbac-exempt='true']") ||
                el.closest("[data-rbac-exempt]") ||
                el.closest("header") ||
                el.closest("aside") ||
                el.closest("nav") ||
                el.closest(".app-header") ||
                el.closest(".app-sidebar") ||
                el.closest("form") ||
                el.closest(".form-section") ||
                el.closest("[data-form]")))
          ) {
            continue;
          }
        } catch {}
        const titleRaw = extractTitle(el);
        const t = norm(titleRaw);
        let action = null;
        // Prefer explicit data-action or similar hints
        try {
          const ds = el.dataset || {};
          const da = String(ds.action || ds.permission || ds.permAction || "")
            .toLowerCase()
            .trim();
          if (
            da === "view" ||
            da === "create" ||
            da === "edit" ||
            da === "delete"
          ) {
            action = da;
          }
        } catch {}
        if (matches(t, labels.create)) {
          action = "create";
        } else if (matches(t, labels.delete)) {
          action = "delete";
        } else if (matches(t, labels.edit)) {
          action = "edit";
        } else if (matches(t, labels.view)) {
          action = "view";
        }
        if (!action) continue;
        const allowed = allow[action];
        if (allowed) {
          el.hidden = false;
          el.style.display = "";
          el.style.pointerEvents = "";
          el.style.opacity = "";
          el.setAttribute("aria-disabled", "false");
          if ("disabled" in el) el.disabled = false;
        } else {
          el.hidden = true;
          el.style.pointerEvents = "none";
          el.style.opacity = "0.6";
          el.setAttribute("aria-disabled", "true");
          if ("disabled" in el) el.disabled = true;
        }
      }
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };
    const mo = new MutationObserver(() => schedule());
    mo.observe(document.body, { childList: true, subtree: true });
    schedule();
    const onRbac = () => schedule();
    const onStorage = (e) => {
      try {
        const k = String(e?.key || "");
        if (
          k === "rbac_allow_all_view" ||
          k === "rbac_allow_all_create" ||
          k === "rbac_allow_all_edit" ||
          k === "rbac_allow_all_delete"
        ) {
          schedule();
        }
      } catch {
        schedule();
      }
    };
    window.addEventListener("rbac:changed", onRbac);
    window.addEventListener("rbac:updated", onRbac);
    window.addEventListener("storage", onStorage);
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      window.removeEventListener("rbac:changed", onRbac);
      window.removeEventListener("rbac:updated", onRbac);
      window.removeEventListener("storage", onStorage);
    };
  }, [location.pathname, canPerformAction, globalOverrides]);

  // Track page visits for auto-generating frequently visited pages in Favorites section
  useEffect(() => {
    if (location.pathname) {
      const meta = resolvePageMetadata(location.pathname);
      recordPageVisit(user?.id, {
        path: location.pathname,
        title: meta.title,
        module: meta.module,
        iconKey: meta.iconKey,
      });
    }
  }, [location.pathname, user?.id]);

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Floating Social Feed Notification - Always Visible */}
      <SocialFeedNotification />

      <header
        data-rbac-exempt="true"
        className="h-14 flex justify-between items-center px-4 sm:px-6 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-apple-xs z-50 sticky top-0"
      >
        <div className="flex items-center gap-2 sm:gap-3 flex-nowrap shrink-0">
          <button
            type="button"
            aria-label="Toggle navigation menu"
            data-rbac-exempt="true"
            onClick={() => setSidebarOpen((v) => !v)}
            className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors active:scale-95 shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link
            to="/"
            className="inline-flex items-center shrink-0"
            aria-label="Go to Home"
          >
            <img
              src={theme === "dark" ? logoDark : logoLight}
              alt="OmniSuite"
              className="h-7 sm:h-8 w-auto object-contain"
            />
          </Link>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-nowrap shrink-0">
          {/* <div className="badge bg-brand-100 dark:bg-brand-900/50 text-brand-800 dark:text-brand-200 border border-brand-300 dark:border-brand-700">
            Role-based + Branch-based
          </div> */}
          <OmniSuiteFavoriteButton />
          <FloatingInstallButton />
          <ThemeToggle />
          <Link
            to="/notifications"
            className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>

          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="inline-flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200"
              aria-label="User profile menu"
            >
              {/* User Avatar */}
              <div className="w-7 h-7 rounded-lg overflow-hidden bg-brand-900/10 dark:bg-white/10 text-brand-900 dark:text-white flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-slate-200 dark:ring-slate-700">
                {user?.profile_picture_url || user?.avatar_url ? (
                  <img
                    src={user?.profile_picture_url || user?.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>
                    {(user?.full_name || profile.username || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}
              </div>

              {/* Username: hide text on narrow mobile screens (< 640px) to prevent header overflow */}
              <span className="hidden sm:inline text-sm font-semibold truncate max-w-[120px] sm:max-w-[160px]">
                {user?.full_name || profile.username}
              </span>

              {/* Dropdown Icon */}
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                  profileOpen ? "rotate-180 text-brand-600 dark:text-brand-400" : ""
                }`}
              />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-24px)] sm:w-80 max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-erp-lg overflow-hidden z-50">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {profile.username}
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Branch
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {currentBranchName}
                    </div>
                  </div>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setContextModalOpen(true)}
                      className="w-full text-sm font-semibold text-white px-4 py-2 rounded-lg bg-ticker-blue hover:opacity-90 transition-opacity"
                      disabled={
                        (dbRoles.length > 1 || roleOptions.length > 1) &&
                        branchOptions.length > 1
                      }
                    >
                      Switch Branch
                    </button>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        setChangePwModalOpen(true);
                        setPwCurrent("");
                        setPwNew("");
                        setPwConfirm("");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-ticker-green hover:opacity-90 transition-opacity"
                    >
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      <span className="flex-1 text-left">Change Password</span>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={async () => {
                        setProfileOpen(false);
                        await logout({ redirect: true });
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-xs border border-red-200 hover:bg-red-50 dark:hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400"
                      style={{ backgroundColor: "#ffffff", color: "#dc2626" }}
                    >
                      <svg
                        className="w-4 h-4"
                        style={{ color: "#dc2626" }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      {savedToast && (
        <div className="px-6 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-b border-green-300 dark:border-green-800 text-sm">
          Saved Offline
        </div>
      )}
      {!online && (
        <div className="px-6 py-2 bg-amber-50 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border-b border-amber-200 dark:border-amber-800 text-sm flex items-center justify-between">
          <span>
            Reconnecting to network. Your changes are saved and will sync
            automatically.
          </span>
        </div>
      )}
      {queueOpen && (
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div className="text-sm">
            Pending {pending} • Failed {failed} • Completed {completed}
          </div>
          <div className="mt-3">
            <div className="grid grid-cols-1 gap-2">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between px-3 py-2 rounded border border-slate-200 dark:border-slate-800"
                >
                  <div className="text-xs">
                    <span className="font-semibold">
                      {it.method.toUpperCase()}
                    </span>{" "}
                    <span className="text-slate-500">{it.url}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        it.status === "pending"
                          ? "badge bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-800"
                          : it.status === "failed"
                            ? "badge bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-800"
                            : "badge bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-800"
                      }
                    >
                      {it.status}
                    </span>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-xs text-slate-500">No queued items</div>
              )}
            </div>
          </div>
        </div>
      )}
      {contextModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md card p-6 shadow-erp-lg bg-white dark:bg-slate-900">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Switch Role & Branch</h2>
              <button
                type="button"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setContextModalOpen(false)}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {/* <div>
                <label className="label">Company</label>
                <div className="input">{currentCompanyName}</div>
              </div> */}
              <div>
                <label className="label">Role</label>
                {dbRoles.length > 1 || roleOptions.length > 1 ? (
                  <select
                    className="input w-full"
                    value={selectedRole || ""}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    disabled={dbRolesLoading}
                  >
                    {(dbRoles.length ? dbRoles : roleOptions).map((r) => {
                      const name = typeof r === "string" ? r : r.name || r.code;
                      const key = typeof r === "string" ? r : r.id;
                      return (
                        <option key={key} value={name}>
                          {name}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="input">{selectedRole || profile.role}</div>
                )}
              </div>
              <div>
                <label className="label">Branch</label>
                {branchOptions.length > 1 ? (
                  <select
                    className="input w-full"
                    value={String(selectedBranchId || scope?.branchId || "")}
                    onChange={(e) =>
                      setSelectedBranchId(Number(e.target.value))
                    }
                  >
                    {branchOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.company_name || `Company #${b.company_id}`}
                        )
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="input">{currentBranchName}</div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setContextModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={
                  ((dbRoles.length > 1 || roleOptions.length > 1) &&
                    !selectedRole) ||
                  (branchOptions.length > 1 && !selectedBranchId)
                }
                onClick={() => {
                  const chosen = branchOptions.find(
                    (b) =>
                      Number(b.id) ===
                      Number(selectedBranchId || scope?.branchId),
                  );
                  setScope((prev) => ({
                    ...prev,
                    companyId: chosen
                      ? Number(chosen.company_id)
                      : prev.companyId,
                    branchId: chosen ? Number(chosen.id) : prev.branchId,
                  }));
                  setContextModalOpen(false);
                  setProfileOpen(false);
                  navigate("/");
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {welcomeModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 sm:p-6">
          <div className="w-full max-w-sm sm:max-w-md card p-5 sm:p-6 shadow-erp-lg bg-white dark:bg-slate-900 text-center max-h-[90vh] overflow-y-auto">
            <div className="mx-auto w-12 sm:w-14 h-12 sm:h-14 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-3 sm:mb-4">
              <svg
                className="w-6 sm:w-7 h-6 sm:h-7 text-blue-600 dark:text-blue-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              Welcome!
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              To keep your account secure, please change your password before
              proceeding
            </p>
            <button
              type="button"
              className="btn-primary w-full mt-5 sm:mt-6"
              onClick={() => {
                setWelcomeModalOpen(false);
                setChangePwModalOpen(true);
                setPwCurrent("");
                setPwNew("");
                setPwConfirm("");
              }}
            >
              Change Password
            </button>
          </div>
        </div>
      )}
      {changePwModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 sm:p-6">
          <div className="w-full max-w-sm sm:max-w-md card shadow-erp-2xl bg-white dark:bg-slate-900 flex flex-col max-h-[90vh]">
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base sm:text-lg font-bold">
                  Change Password
                </h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPwCurrent ? "text" : "password"}
                      placeholder="Enter current password"
                      className="input w-full pr-10"
                      value={pwCurrent}
                      onChange={(e) => setPwCurrent(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwCurrent((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      tabIndex={-1}
                    >
                      {showPwCurrent ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPwNew ? "text" : "password"}
                      placeholder="Enter new password"
                      className="input w-full pr-10"
                      value={pwNew}
                      onChange={(e) => setPwNew(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwNew((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      tabIndex={-1}
                    >
                      {showPwNew ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Verify Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPwConfirm ? "text" : "password"}
                      placeholder="Re-enter new password"
                      className="input w-full pr-10"
                      value={pwConfirm}
                      onChange={(e) => setPwConfirm(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwConfirm((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      tabIndex={-1}
                    >
                      {showPwConfirm ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 shrink-0">
              <button
                type="button"
                className="btn-primary w-full py-2.5 text-base shadow-md"
                data-rbac-exempt="true"
                disabled={pwChanging}
                onClick={async () => {
                  if (!pwCurrent || !pwNew || !pwConfirm) {
                    toast.error("Fill in all password fields");
                    return;
                  }
                  if (pwNew.length < 6) {
                    toast.error("New password must be at least 6 characters");
                    return;
                  }
                  if (pwNew !== pwConfirm) {
                    toast.error("New password and confirmation do not match");
                    return;
                  }
                  setPwChanging(true);
                  try {
                    await api.post("/auth/change-password", {
                      currentPassword: pwCurrent,
                      newPassword: pwNew,
                      confirmNewPassword: pwConfirm,
                    });
                    toast.success("Password changed successfully");
                    setPwCurrent("");
                    setPwNew("");
                    setPwConfirm("");
                    setChangePwModalOpen(false);
                    const stored = readStoredAuth();
                    if (stored?.user) {
                      stored.user.status = "Y";
                      writeStoredAuth(stored);
                    }
                  } catch (err) {
                    const msg =
                      err?.response?.data?.message ||
                      err?.message ||
                      "Failed to change password";
                    toast.error(msg);
                  } finally {
                    setPwChanging(false);
                  }
                }}
              >
                {pwChanging ? "Saving..." : "Update Password Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 relative z-10 grid grid-cols-1 w-full">
        {/* Mobile App Launcher 4-Column Grid Bottom Sheet (< 768px / Small Devices) */}
        {sidebarOpen && (
          <div className="md:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />

            {/* Bottom Sheet Modal with 4-Column App Grid */}
            <div
              data-rbac-exempt="true"
              onTouchStart={handleSidebarTouchStart}
              onTouchEnd={handleSidebarTouchEnd}
              className="fixed bottom-0 inset-x-0 z-[80] bg-[#061a22] text-white rounded-t-[28px] shadow-2xl border-t border-[#0e3646]/70 max-h-[85vh] overflow-y-auto pb-10 pt-3 px-4 animate-in slide-in-from-bottom duration-300 no-scrollbar"
            >
              {/* Drag Handle */}
              <div className="w-12 h-1.5 bg-slate-600/70 rounded-full mx-auto mb-3" />

              {/* Header Row */}
              <div
                data-sheet-header="true"
                data-no-stack="true"
                className="flex flex-row items-center justify-between gap-3 px-1 pb-2.5 mb-2.5 border-b border-[#0e3646]/70 w-full shrink-0"
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "nowrap",
                  width: "100%",
                }}
              >
                <div className="flex items-center gap-2 min-w-0" style={{ display: "flex", alignItems: "center", flexWrap: "nowrap" }}>
                  <span className="text-xs font-bold uppercase tracking-wider text-white truncate">
                    {activeSidebarDisplayMode === "PAGES"
                      ? "Pages"
                      : activeSidebarDisplayMode === "SECTIONS"
                      ? "Module Sections"
                      : "Modules"}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-full bg-[#0e3646] hover:bg-[#14475c] active:scale-95 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
                  style={{
                    width: "32px",
                    minWidth: "32px",
                    maxWidth: "32px",
                    height: "32px",
                    minHeight: "32px",
                    maxHeight: "32px",
                    flex: "0 0 32px",
                    padding: 0,
                    borderRadius: "9999px",
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Instant Search Bar for Small Devices */}
              <div className="relative mb-3 w-full" style={{ width: "100%" }}>
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                <input
                  type="text"
                  data-menu-search-input="true"
                  value={mobileMenuSearch}
                  onChange={(e) => setMobileMenuSearch(e.target.value)}
                  placeholder={`Search ${
                    activeSidebarDisplayMode === "PAGES"
                      ? `${allMobilePages.length} pages`
                      : activeSidebarDisplayMode === "SECTIONS"
                      ? `${allMobileSections.length} sections`
                      : `${modules.length} modules`
                  }...`}
                  className="w-full text-xs rounded-xl pl-9 pr-8 py-2 border transition-all"
                  style={{
                    backgroundColor: "#0e3646",
                    color: "#ffffff",
                    WebkitTextFillColor: "#ffffff",
                    caretColor: "#f8bc24",
                    borderColor: "#14475c",
                    boxSizing: "border-box",
                  }}
                />
                {mobileMenuSearch && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setMobileMenuSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                    style={{ width: "24px", height: "24px", padding: 0 }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 4-Column Grid Launcher matching reference image */}
              <div
                data-mobile-menu-grid="true"
                className="w-full"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: "10px 4px",
                  width: "100%",
                }}
              >
                {/* 1. Home Item */}
                {(!mobileMenuSearch.trim() || "home".includes(mobileMenuSearch.toLowerCase().trim())) && (
                  <NavLink
                    to="/"
                    end
                    onClick={() => setSidebarOpen(false)}
                    style={{ minWidth: 0, width: "100%" }}
                    className={({ isActive }) =>
                      `flex flex-col items-center justify-center px-1 py-1.5 rounded-2xl transition-all active:scale-95 text-center min-h-[82px] w-full min-w-0 ${
                        isActive
                          ? "bg-[#0e3646] text-white shadow-lg ring-2 ring-[#f8bc24] font-bold"
                          : "text-white hover:bg-white/10"
                      }`
                    }
                  >
                    <span className="w-8 h-8 flex items-center justify-center mb-1 text-white [&>svg]:w-6 [&>svg]:h-6 [&>svg]:text-white [&>svg]:stroke-white [&>svg]:fill-none shrink-0" aria-hidden="true">
                      <Home />
                    </span>
                    <span className="text-[9.5px] sm:text-[10.5px] font-medium leading-tight w-full text-center text-white px-0.5 break-normal tracking-tight line-clamp-2">
                      Home
                    </span>
                  </NavLink>
                )}

                {/* 2. Items depending on activeSidebarDisplayMode */}
                {activeSidebarDisplayMode === "SECTIONS" ? (
                  filteredMobileSections.length > 0 ? (
                    filteredMobileSections.map((sec) => (
                      <NavLink
                        key={sec.key}
                        to={sec.path}
                        onClick={() => setSidebarOpen(false)}
                        style={{ minWidth: 0, width: "100%" }}
                        className={({ isActive }) =>
                          `flex flex-col items-center justify-center px-1 py-1.5 rounded-2xl transition-all active:scale-95 text-center min-h-[82px] w-full min-w-0 ${
                            isActive
                              ? "bg-[#0e3646] text-white shadow-lg ring-2 ring-[#f8bc24] font-bold"
                              : "text-white hover:bg-white/10"
                          }`
                        }
                        title={sec.label}
                      >
                        <span className="w-8 h-8 flex items-center justify-center mb-1 text-white [&>svg]:w-6 [&>svg]:h-6 [&>svg]:text-white [&>svg]:stroke-white [&>svg]:fill-none shrink-0" aria-hidden="true">
                          {sec.icon}
                        </span>
                        <span className="text-[9.5px] sm:text-[10.5px] font-medium leading-tight w-full text-center text-white px-0.5 break-normal tracking-tight line-clamp-2" title={sec.label}>
                          {sec.label}
                        </span>
                      </NavLink>
                    ))
                  ) : (
                    <div className="col-span-4 py-8 text-center text-xs text-slate-400">
                      No sections matching &ldquo;{mobileMenuSearch}&rdquo;
                    </div>
                  )
                ) : activeSidebarDisplayMode === "MODULES" ? (
                  filteredMobileModules.length > 0 ? (
                    filteredMobileModules.map((m) => (
                      <NavLink
                        key={m.key}
                        to={m.path}
                        onClick={() => setSidebarOpen(false)}
                        style={{ minWidth: 0, width: "100%" }}
                        className={({ isActive }) =>
                          `flex flex-col items-center justify-center px-1 py-1.5 rounded-2xl transition-all active:scale-95 text-center min-h-[82px] w-full min-w-0 ${
                            isActive || (m.path !== "/" && location.pathname.startsWith(m.path))
                              ? "bg-[#0e3646] text-white shadow-lg ring-2 ring-[#f8bc24] font-bold"
                              : "text-white hover:bg-white/10"
                          }`
                        }
                        title={m.label}
                      >
                        <span className="w-8 h-8 flex items-center justify-center mb-1 text-white [&>svg]:w-6 [&>svg]:h-6 [&>svg]:stroke-white [&>svg]:text-white [&>svg]:fill-none shrink-0" aria-hidden="true">
                          {m.icon}
                        </span>
                        <span className="text-[9.5px] sm:text-[10.5px] font-medium leading-tight w-full text-center text-white px-0.5 break-normal tracking-tight line-clamp-2" title={m.label}>
                          {m.label}
                        </span>
                      </NavLink>
                    ))
                  ) : (
                    <div className="col-span-4 py-8 text-center text-xs text-slate-400">
                      No modules matching &ldquo;{mobileMenuSearch}&rdquo;
                    </div>
                  )
                ) : (
                  // Default / PAGES mode: Show ALL allocated pages for this user in 4 columns
                  filteredMobilePages.length > 0 ? (
                    filteredMobilePages.map((page) => (
                      <NavLink
                        key={page.key}
                        to={page.path}
                        onClick={() => setSidebarOpen(false)}
                        style={{ minWidth: 0, width: "100%" }}
                        className={({ isActive }) =>
                          `flex flex-col items-center justify-center px-1 py-1.5 rounded-2xl transition-all active:scale-95 text-center min-h-[82px] w-full min-w-0 ${
                            isActive || location.pathname === page.path
                              ? "bg-[#0e3646] text-white shadow-lg ring-2 ring-[#f8bc24] font-bold"
                              : "text-white hover:bg-white/10"
                          }`
                        }
                        title={page.label}
                      >
                        <span className="w-8 h-8 flex items-center justify-center mb-1 text-white [&>svg]:w-6 [&>svg]:h-6 [&>svg]:text-white [&>svg]:stroke-white [&>svg]:fill-none shrink-0" aria-hidden="true">
                          {page.icon}
                        </span>
                        <span className="text-[9.5px] sm:text-[10.5px] font-medium leading-tight w-full text-center text-white px-0.5 break-normal tracking-tight line-clamp-2" title={page.label}>
                          {page.label}
                        </span>
                      </NavLink>
                    ))
                  ) : (
                    <div className="col-span-4 py-8 text-center text-xs text-slate-400">
                      No pages matching &ldquo;{mobileMenuSearch}&rdquo;
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Medium & Large Devices: Floating Board with rounded edges, 80% opacity, 8 grid columns */}
        {sidebarOpen && (
          <div className="hidden md:block">
            {/* Backdrop Overlay */}
            <div
              className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />

            {/* Floating Board */}
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Navigation Menu Board"
              data-rbac-exempt="true"
              className="fixed z-[80] inset-x-6 md:inset-x-8 lg:inset-x-12 xl:inset-x-16 top-[70px] max-h-[calc(100vh-90px)] overflow-y-auto no-scrollbar rounded-3xl p-6 lg:p-8 shadow-2xl border border-[#0e3646]/80 text-white animate-in zoom-in-95 fade-in duration-200"
              style={{
                backgroundColor: "rgba(6, 26, 34, 0.80)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            >
              {/* Floating Board Header */}
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#0e3646]/80">
                <div className="flex items-center gap-3">
                  <span className="text-base lg:text-lg font-bold uppercase tracking-wider text-white">
                    {activeSidebarDisplayMode === "PAGES"
                      ? "Pages"
                      : activeSidebarDisplayMode === "SECTIONS"
                      ? "Module Sections"
                      : "Modules"}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#0e3646] text-slate-300 font-medium">
                    {activeSidebarDisplayMode === "PAGES"
                      ? (mobileMenuSearch ? `${filteredMobilePages.length} of ${allMobilePages.length}` : `${allMobilePages.length + 1} items`)
                      : activeSidebarDisplayMode === "SECTIONS"
                      ? (mobileMenuSearch ? `${filteredMobileSections.length} of ${allMobileSections.length}` : `${allMobileSections.length + 1} items`)
                      : (mobileMenuSearch ? `${filteredMobileModules.length} of ${modules.length}` : `${modules.filter((m) => m.key !== "system-configuration" || Number(user?.id) === 1 || Number(user?.id) === 2).length + 1} items`)}
                  </span>
                </div>

                {/* Instant Search Bar for Desktop Floating Board */}
                <div className="flex-1 max-w-sm mx-6 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  <input
                    type="text"
                    data-menu-search-input="true"
                    value={mobileMenuSearch}
                    onChange={(e) => setMobileMenuSearch(e.target.value)}
                    placeholder={`Search ${
                      activeSidebarDisplayMode === "PAGES"
                        ? `${allMobilePages.length} pages`
                        : activeSidebarDisplayMode === "SECTIONS"
                        ? `${allMobileSections.length} sections`
                        : `${modules.length} modules`
                    }...`}
                    className="w-full text-xs rounded-xl pl-9 pr-8 py-2 border transition-all"
                    style={{
                      backgroundColor: "#0e3646",
                      color: "#ffffff",
                      WebkitTextFillColor: "#ffffff",
                      caretColor: "#f8bc24",
                      borderColor: "#14475c",
                      boxSizing: "border-box",
                    }}
                  />
                  {mobileMenuSearch && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => setMobileMenuSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                      style={{ width: "24px", height: "24px", padding: 0 }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  aria-label="Close menu board"
                  onClick={() => setSidebarOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#0e3646] hover:bg-[#14475c] active:scale-95 flex items-center justify-center text-slate-300 hover:text-white transition-all shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 8-Column Grid Launcher */}
              <div
                data-desktop-floating-board-grid="true"
                className="w-full"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
                  gap: "16px 12px",
                  width: "100%",
                }}
              >
                {/* 1. Home Item */}
                {(!mobileMenuSearch.trim() || "home".includes(mobileMenuSearch.toLowerCase().trim())) && (
                  <NavLink
                    to="/"
                    end
                    onClick={() => setSidebarOpen(false)}
                    style={{ minWidth: 0, width: "100%" }}
                    className={({ isActive }) =>
                      `flex flex-col items-center justify-center p-3 rounded-2xl transition-all active:scale-95 text-center min-h-[96px] w-full min-w-0 group border border-transparent hover:border-[#0e3646] ${
                        isActive
                          ? "bg-[#0e3646] text-white shadow-lg ring-2 ring-[#f8bc24] font-bold"
                          : "text-white hover:bg-white/10"
                      }`
                    }
                  >
                    <span className="w-9 h-9 flex items-center justify-center mb-1.5 text-white [&>svg]:w-6 [&>svg]:h-6 [&>svg]:text-white [&>svg]:stroke-white [&>svg]:fill-none shrink-0" aria-hidden="true">
                      <Home />
                    </span>
                    <span className="text-xs font-medium leading-snug w-full text-center text-white px-1 break-words line-clamp-2">
                      Home
                    </span>
                  </NavLink>
                )}

                {/* 2. Items depending on activeSidebarDisplayMode */}
                {activeSidebarDisplayMode === "SECTIONS" ? (
                  filteredMobileSections.length > 0 ? (
                    filteredMobileSections.map((sec) => (
                      <NavLink
                        key={sec.key}
                        to={sec.path}
                        onClick={() => setSidebarOpen(false)}
                        style={{ minWidth: 0, width: "100%" }}
                        className={({ isActive }) =>
                          `flex flex-col items-center justify-center p-3 rounded-2xl transition-all active:scale-95 text-center min-h-[96px] w-full min-w-0 group border border-transparent hover:border-[#0e3646] ${
                            isActive
                              ? "bg-[#0e3646] text-white shadow-lg ring-2 ring-[#f8bc24] font-bold"
                              : "text-white hover:bg-white/10"
                          }`
                        }
                        title={sec.label}
                      >
                        <span className="w-9 h-9 flex items-center justify-center mb-1.5 text-white [&>svg]:w-6 [&>svg]:h-6 [&>svg]:text-white [&>svg]:stroke-white [&>svg]:fill-none shrink-0" aria-hidden="true">
                          {sec.icon}
                        </span>
                        <span className="text-xs font-medium leading-snug w-full text-center text-white px-1 break-words line-clamp-2">
                          {sec.label}
                        </span>
                      </NavLink>
                    ))
                  ) : (
                    <div className="col-span-8 py-8 text-center text-sm text-slate-400">
                      No sections matching &ldquo;{mobileMenuSearch}&rdquo;
                    </div>
                  )
                ) : activeSidebarDisplayMode === "MODULES" ? (
                  filteredMobileModules.length > 0 ? (
                    filteredMobileModules.map((m) => {
                      const isModActive = location.pathname.startsWith(m.path);
                      return (
                        <NavLink
                          key={m.key}
                          to={m.path}
                          onClick={() => setSidebarOpen(false)}
                          style={{ minWidth: 0, width: "100%" }}
                          className={({ isActive }) =>
                            `flex flex-col items-center justify-center p-3 rounded-2xl transition-all active:scale-95 text-center min-h-[96px] w-full min-w-0 group border border-transparent hover:border-[#0e3646] ${
                              isActive || isModActive
                                ? "bg-[#0e3646] text-white shadow-lg ring-2 ring-[#f8bc24] font-bold"
                                : "text-white hover:bg-white/10"
                            }`
                          }
                          title={m.label}
                        >
                          <span className="w-9 h-9 flex items-center justify-center mb-1.5 text-white [&>svg]:w-6 [&>svg]:h-6 [&>svg]:text-white [&>svg]:stroke-white [&>svg]:fill-none shrink-0" aria-hidden="true">
                            {getPageWhiteIcon(m.label, m.path, m.key)}
                          </span>
                          <span className="text-xs font-medium leading-snug w-full text-center text-white px-1 break-words line-clamp-2">
                            {m.label}
                          </span>
                        </NavLink>
                      );
                    })
                  ) : (
                    <div className="col-span-8 py-8 text-center text-sm text-slate-400">
                      No modules matching &ldquo;{mobileMenuSearch}&rdquo;
                    </div>
                  )
                ) : (
                  // Default / PAGES mode: Show ALL allocated pages in 8-column grid
                  filteredMobilePages.length > 0 ? (
                    filteredMobilePages.map((page) => (
                      <NavLink
                        key={page.key}
                        to={page.path}
                        onClick={() => setSidebarOpen(false)}
                        style={{ minWidth: 0, width: "100%" }}
                        className={({ isActive }) =>
                          `flex flex-col items-center justify-center p-3 rounded-2xl transition-all active:scale-95 text-center min-h-[96px] w-full min-w-0 group border border-transparent hover:border-[#0e3646] ${
                            isActive || location.pathname === page.path
                              ? "bg-[#0e3646] text-white shadow-lg ring-2 ring-[#f8bc24] font-bold"
                              : "text-white hover:bg-white/10"
                          }`
                        }
                        title={page.label}
                      >
                        <span className="w-9 h-9 flex items-center justify-center mb-1.5 text-white [&>svg]:w-6 [&>svg]:h-6 [&>svg]:text-white [&>svg]:stroke-white [&>svg]:fill-none shrink-0" aria-hidden="true">
                          {page.icon}
                        </span>
                        <span className="text-xs font-medium leading-snug w-full text-center text-white px-1 break-words line-clamp-2">
                          {page.label}
                        </span>
                      </NavLink>
                    ))
                  ) : (
                    <div className="col-span-8 py-8 text-center text-sm text-slate-400">
                      No pages matching &ldquo;{mobileMenuSearch}&rdquo;
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        <main
          className={`flex-1 overflow-x-hidden min-w-0 relative min-h-[calc(100vh-56px)] pb-24 lg:pb-6 ${
            resolvedBg.isSolid
              ? resolvedBg.isSolidDark
                ? "bg-[#0b0f19]"
                : "bg-white"
              : "bg-slate-100 dark:bg-[#0b0f19]"
          }`}
        >
          {/* Main Application Background Image Layer (strictly inside main application area) */}
          {resolvedBg.isSolid ? (
            <div
              aria-hidden="true"
              className="fixed top-[56px] bottom-0 right-0 pointer-events-none z-0 transition-colors duration-300 ease-in-out"
              style={{
                left: "0px",
                backgroundColor: resolvedBg.color,
              }}
            />
          ) : resolvedBg.url ? (
            <div
              aria-hidden="true"
              className="fixed top-[56px] bottom-0 right-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-300 ease-in-out"
              style={{
                left: "0px",
                backgroundImage: `url(${resolvedBg.url})`,
                opacity: Math.max(
                  0,
                  Math.min(1, Number(resolvedBg.opacity ?? 40) / 100),
                ),
                filter:
                  [
                    resolvedBg.blur ? `blur(${resolvedBg.blur}px)` : "",
                    resolvedBg.isCustom && isDark
                      ? "brightness(0.38) contrast(1.15)"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined,
              }}
            />
          ) : null}

          <div
            ref={listPageContentRef}
            className="relative z-10 w-full max-w-full 2xl:max-w-[1600px] mx-auto p-2 md:p-2 lg:p-3"
          >
            {pushPromptAllowed ? (
              <div
                className={`transition-all duration-700 ease-in-out overflow-hidden transform ${
                  pushPromptRolledDown
                    ? "max-h-60 opacity-100 translate-y-0 mb-3"
                    : "max-h-0 opacity-0 -translate-y-4 mb-0 pointer-events-none"
                }`}
              >
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 px-4 flex flex-col gap-3 shadow-smoky-card">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <span className="text-xl shrink-0">🔔</span>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                      Enable push notifications to receive real-time approval and message alerts.
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-0 sm:pl-7">
                    <button
                      type="button"
                      className="btn btn-primary text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-smoky-card cursor-pointer whitespace-nowrap inline-flex items-center justify-center"
                      onClick={enablePushNow}
                    >
                      <span className="whitespace-nowrap">Enable Push</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary text-xs font-medium px-3.5 py-1.5 rounded-xl shadow-smoky-card cursor-pointer whitespace-nowrap inline-flex items-center justify-center"
                      onClick={dismissPushPrompt}
                    >
                      <span className="whitespace-nowrap">Dismiss</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            <React.Suspense fallback={<div>Loading...</div>}>
              <AppRoutes user={user} />
            </React.Suspense>
          </div>
        </main>
      </div>
      {location.pathname &&
      location.pathname.startsWith("/inventory/stock-verification") ? (
        <FloatingCreateButton
          to="/inventory/stock-verification/new"
          title="New Verification"
        />
      ) : null}
      <PaymentPackageModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        companyId={user?.company_id || user?.companyIds?.[0]}
      />
      <FloatingChat />
      <BanksAiFloating />

      {/* Apple-style Mobile Bottom Navigation Tab Bar for Small & Medium screens (< lg / 1024px) */}
      <nav
        aria-label="Mobile Navigation"
        data-rbac-exempt="true"
        className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800 z-40 flex items-center px-1 shadow-apple-dock pb-[env(safe-area-inset-bottom)]"
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center shrink-0 w-[50px] sm:w-[54px] py-1 transition-all duration-150 active:scale-95 border-r border-slate-200/60 dark:border-slate-800/80 ${
              isActive
                ? "text-brand-900 dark:text-brand-300 font-semibold"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`
          }
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10.5px] sm:text-[11px] font-medium leading-tight">Home</span>
        </NavLink>

        {/* Middle items window: displays at least 4 items in the window */}
        <div 
          ref={mobileNavScrollRef}
          className="flex-1 h-full flex items-center overflow-x-auto scrollbar-none no-scrollbar snap-x snap-mandatory px-0.5"
          style={{
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {mobileNavItems.map((m) => (
            <NavLink
              key={m.key}
              to={m.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-none snap-start ${
                  mobileNavItems.length <= 4
                    ? "flex-1 min-w-0"
                    : "basis-1/4 w-1/4 min-w-[25%] max-w-[25%]"
                } h-full px-0.5 py-1 rounded-xl transition-all duration-150 active:scale-95 ${
                  isActive
                    ? "text-brand-900 dark:text-brand-300 font-semibold bg-brand-50/60 dark:bg-brand-950/50"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`
              }
            >
              <span
                className="w-5 h-5 mb-0.5 flex items-center justify-center shrink-0 [&>svg]:w-5 [&>svg]:h-5"
                aria-hidden="true"
              >
                {m.icon}
              </span>
              <span className="text-[8.5px] sm:text-[9.5px] leading-tight line-clamp-2 break-normal tracking-tight w-full text-center px-0.5 font-medium" title={m.label}>
                {m.label}
              </span>
            </NavLink>
          ))}
        </div>

        <button
          type="button"
          aria-label="Toggle all modules menu"
          data-rbac-exempt="true"
          onClick={() => setSidebarOpen((v) => !v)}
          className={`flex flex-col items-center justify-center shrink-0 w-[50px] sm:w-[54px] py-1 border-l border-slate-200/60 dark:border-slate-800/80 transition-all duration-150 active:scale-95 ${
            sidebarOpen
              ? "text-brand-900 dark:text-brand-300 font-semibold"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10.5px] sm:text-[11px] font-medium leading-tight">Menu</span>
        </button>
      </nav>
    </div>
  );
}
