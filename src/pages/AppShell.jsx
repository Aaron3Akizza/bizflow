import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth, useBusiness } from "../context/AuthContext";
import { useAdmin } from "../context/AdminContext";
import ProductsPage from "./ProductsPage";
import { SalesHistoryPage } from "./SalesPage";
import DashboardPage from "./DashboardPage";
import CustomersPage from "./CustomersPage";
import ExpensesPage from "./ExpensesPage";
import ReportsPage from "./ReportsPage";
import StaffPage from "./StaffPage";
import SettingsPage from "./SettingsPage";
import {
  TrendingUp, Package, Users, Wallet, FileBarChart, UserCog,
  Settings, Search, Bell, Menu, X, LayoutGrid, LogOut, HelpCircle,
  Receipt, FlaskConical, ShieldCheck,
} from "lucide-react";

/* =========================================================
   MODULE REGISTRY
   ========================================================= */

const MODULES = [
  { id: "dashboard", label: "Dashboard",  icon: LayoutGrid   },
  { id: "sales",     label: "Sales",      icon: Receipt      },
  { id: "products",  label: "Products",   icon: Package      },
  { id: "customers", label: "Customers",  icon: Users        },
  { id: "expenses",  label: "Expenses",   icon: Wallet       },
  { id: "reports",   label: "Reports",    icon: FileBarChart },
  { id: "staff",     label: "Staff",      icon: UserCog      },
  { id: "settings",  label: "Settings",   icon: Settings     },
];

const TITLES = {
  dashboard: "Dashboard", sales: "Sales", products: "Products",
  customers: "Customers", expenses: "Expenses", reports: "Reports",
  staff: "Staff", settings: "Settings",
};

/* =========================================================
   DEMO BANNER
   ========================================================= */

function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 text-amber-700">
        <FlaskConical size={15} className="shrink-0" />
        <span>
          <strong>Demo mode</strong> — all data is simulated. No real database is connected.
          Add your Supabase credentials to go live.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-500 hover:text-amber-700 shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/* =========================================================
   SIDEBAR
   ========================================================= */

function Sidebar({ active, onSelect, mobileOpen, onCloseMobile, user, business, role, onSignOut, isDemo, isAdmin, onHelpClick, onAdminClick }) {
  const initials = (user?.user_metadata?.full_name || user?.email || "U")
    .split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  const content = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-800 shrink-0">
        <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center">
          <TrendingUp className="text-white" strokeWidth={2.25} size={18} />
        </div>
        <div>
          <span className="text-white text-base font-bold tracking-tight">BizFlow</span>
          {isDemo && (
            <span className="ml-2 text-[10px] font-semibold bg-amber-500 text-white px-1.5 py-0.5 rounded">
              DEMO
            </span>
          )}
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {MODULES.map((m) => {
          const isActive = active === m.id;
          return (
            <button
              key={m.id}
              onClick={() => { onSelect(m.id); onCloseMobile(); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left w-full ${
                isActive ? "bg-green-600 text-white font-semibold" : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <m.icon size={17} strokeWidth={2} />
              {m.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-800 flex flex-col gap-1 shrink-0">
        <button
          onClick={onHelpClick}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white w-full"
        >
          <HelpCircle size={17} strokeWidth={2} />
          Help / support
        </button>
        {isAdmin && (
          <button
            onClick={() => onAdminClick()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-amber-400 hover:bg-gray-800 hover:text-amber-300 w-full"
          >
            <ShieldCheck size={17} strokeWidth={2} />
            Owner Dashboard
          </button>
        )}
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <div className="h-8 w-8 rounded-full bg-green-600/20 border border-green-600/40 flex items-center justify-center text-xs font-bold text-green-400 shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {user?.user_metadata?.full_name || user?.email || "Demo Owner"}
            </p>
            <p className="text-[11px] text-gray-500 truncate capitalize">
              {role || "owner"}{business?.name ? ` · ${business.name}` : ""}
            </p>
          </div>
        </div>
        {!isDemo && (
          <button
            onClick={onSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white w-full"
          >
            <LogOut size={17} strokeWidth={2} />
            Log out
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex w-60 bg-gray-900 shrink-0 h-screen sticky top-0">
        {content}
      </aside>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={onCloseMobile} />
          <aside className="relative w-64 bg-gray-900 h-full">
            <button onClick={onCloseMobile} className="absolute top-4 right-4 text-gray-400 hover:text-white" aria-label="Close menu">
              <X size={20} />
            </button>
            {content}
          </aside>
        </div>
      )}
    </>
  );
}

/* =========================================================
   TOPBAR
   ========================================================= */

function TopBar({ title, onOpenMobile, user, searchQuery, onSearchChange, activeModule, onBellClick, bellDot }) {
  const initials = (user?.user_metadata?.full_name || user?.email || "D")
    .split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  // Modules that support search
  const searchable = ["products", "customers", "sales"];
  const placeholder = activeModule === "products"  ? "Search products…"
                    : activeModule === "customers" ? "Search customers…"
                    : activeModule === "sales"     ? "Search sales…"
                    : "Search…";

  return (
    <div className="flex items-center justify-between h-16 px-5 lg:px-8 border-b border-gray-100 bg-white sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button className="lg:hidden text-gray-600" onClick={onOpenMobile} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <h1 className="text-base font-bold text-gray-900">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        {searchable.includes(activeModule) ? (
          <div className="hidden sm:flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 w-56 border border-gray-200 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500 transition-colors">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={placeholder}
              className="bg-transparent text-xs text-gray-700 placeholder-gray-400 focus:outline-none w-full"
              aria-label="Search"
            />
            {searchQuery && (
              <button onClick={() => onSearchChange("")} className="text-gray-400 hover:text-gray-600" aria-label="Clear search">
                <X size={12} />
              </button>
            )}
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 w-56 border border-gray-100 opacity-50 cursor-not-allowed select-none">
            <Search size={14} className="text-gray-400" />
            <span className="text-xs text-gray-400">Search not available here</span>
          </div>
        )}
        <button
          onClick={onBellClick}
          className="relative text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {bellDot && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
          )}
        </button>
        <div className="h-8 w-8 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-xs font-bold text-green-600" aria-label="Account">
          {initials}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   HELP MODAL
   ========================================================= */

function HelpModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">Help & Support</h2>
          <button onClick={onClose} aria-label="Close"><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="flex flex-col gap-3 text-sm text-gray-600">
          <p>Need help using BizFlow? Here's how to get support:</p>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex flex-col gap-2">
            <p className="font-semibold text-gray-800">Contact your admin</p>
            <p className="text-xs text-gray-500">Reach out to your BizFlow administrator for account issues, password resets, or access problems.</p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col gap-2">
            <p className="font-semibold text-gray-800">Quick tips</p>
            <ul className="text-xs text-gray-500 space-y-1.5">
              <li>• Use the sidebar to navigate between modules</li>
              <li>• Sales and Products support real-time search in the topbar</li>
              <li>• Reports can be exported to CSV</li>
              <li>• Staff members must register at /get-started first</li>
            </ul>
          </div>
        </div>
        <button onClick={onClose} className="w-full mt-5 rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-green-700">
          Got it
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   NOTIFICATIONS PANEL
   ========================================================= */

function NotificationsPanel({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-16" onClick={onClose}>
      <div
        className="relative bg-white rounded-2xl w-72 shadow-xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
          <button onClick={onClose} aria-label="Close"><X size={16} className="text-gray-400" /></button>
        </div>
        <div className="px-4 py-8 text-center">
          <Bell size={24} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-medium">All caught up!</p>
          <p className="text-xs text-gray-400 mt-1">No new notifications.</p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ROOT SHELL
   ========================================================= */

export default function BizFlowApp() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, signOut, isDemo } = useAuth();
  const { business, role } = useBusiness();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();

  const activeModule = location.pathname.split("/")[2] || "dashboard";

  // Clear search when switching modules
  const selectModule = (module) => {
    setSearchQuery("");
    navigate(module === "dashboard" ? "/app" : `/app/${module}`);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/bo-login", { replace: true });
  };

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-9 w-9 rounded-lg bg-green-600 flex items-center justify-center mx-auto mb-4">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">Loading your workspace…</p>
          <p className="text-xs text-gray-400 mt-1">This may take a moment on first login.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased">
      {isDemo && <DemoBanner />}
      <div className="flex flex-1 min-h-0">
        <Sidebar
          active={activeModule}
          onSelect={selectModule}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          user={user}
          business={business}
          role={role}
          onSignOut={handleSignOut}
          isDemo={isDemo}
          isAdmin={isAdmin}
          onHelpClick={() => setShowHelp(true)}
          onAdminClick={() => navigate("/owner")}
        />
        <div className="flex-1 min-w-0 overflow-y-auto">
          <TopBar
            title={TITLES[activeModule] ?? "BizFlow"}
            onOpenMobile={() => setMobileOpen(true)}
            user={user}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeModule={activeModule}
            onBellClick={() => setShowNotifications((v) => !v)}
            bellDot={false}
          />
          {activeModule === "dashboard" && <DashboardPage businessId={business.id} />}
          {activeModule === "sales"     && <SalesHistoryPage businessId={business.id} role={role} searchQuery={searchQuery} />}
          {activeModule === "products"  && <ProductsPage businessId={business.id} role={role} searchQuery={searchQuery} />}
          {activeModule === "customers" && <CustomersPage businessId={business.id} role={role} searchQuery={searchQuery} />}
          {activeModule === "expenses"  && <ExpensesPage businessId={business.id} role={role} />}
          {activeModule === "reports"   && <ReportsPage businessId={business.id} role={role} />}
          {activeModule === "staff"     && <StaffPage businessId={business.id} role={role} />}
          {activeModule === "settings"  && <SettingsPage role={role} />}
        </div>
      </div>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showNotifications && <NotificationsPanel onClose={() => setShowNotifications(false)} />}
    </div>
  );
}
