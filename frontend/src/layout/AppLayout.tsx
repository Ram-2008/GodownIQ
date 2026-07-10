import { ReactNode, useState } from "react";
import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "../auth/AuthContext";
import { NAV_ITEMS, MOBILE_PRIMARY_ITEMS } from "./navItems";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { profile } = useAuth();
  const items = NAV_ITEMS.filter((item) => profile && item.roles.includes(profile.role));

  return (
    <>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "bg-brand-100 text-brand-800" : "text-gray-600 hover:bg-gray-100"
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </>
  );
}

function BottomNav() {
  const { profile } = useAuth();
  const items = NAV_ITEMS.filter((item) => MOBILE_PRIMARY_ITEMS.includes(item.to) && profile && item.roles.includes(profile.role));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-gray-200 bg-white md:hidden">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            clsx(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
              isActive ? "text-brand-700" : "text-gray-500"
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white p-4 md:flex md:flex-col md:gap-1">
        <div className="mb-4 px-2 text-lg font-bold text-brand-700">GodownIQ</div>
        <NavLinks />
        <div className="mt-auto pt-4 text-sm text-gray-500">
          <div className="px-2">{profile?.full_name}</div>
          <button onClick={signOut} className="w-full rounded-lg px-2 py-2 text-left text-red-600 hover:bg-red-50">
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden">
          <button
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          >
            ☰
          </button>
          <div className="text-base font-bold text-brand-700">GodownIQ</div>
          <div className="w-9" />
        </header>

        {drawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
            <div className="absolute left-0 top-0 flex h-full w-64 flex-col gap-1 bg-white p-4 shadow-xl">
              <div className="mb-4 px-2 text-lg font-bold text-brand-700">GodownIQ</div>
              <NavLinks onNavigate={() => setDrawerOpen(false)} />
              <div className="mt-auto pt-4 text-sm text-gray-500">
                <div className="px-2">{profile?.full_name}</div>
                <button
                  onClick={signOut}
                  className="w-full rounded-lg px-2 py-2 text-left text-red-600 hover:bg-red-50"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="mx-auto max-w-5xl px-4 py-6 pb-24 md:pb-6">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
