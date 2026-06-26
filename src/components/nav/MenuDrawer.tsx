"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Map as MapIcon,
  Images,
  LayoutDashboard,
  ClipboardList,
  Moon,
  Sun,
  LogOut,
  UserPlus,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/components/auth/AuthProvider";

const PRIMARY = [
  { href: "/", label: "Explore map", icon: MapIcon },
  { href: "/cases", label: "Cases", icon: ClipboardList },
  { href: "/dashboard", label: "NGO dashboard", icon: LayoutDashboard },
  { href: "/feed", label: "Sightings feed", icon: Images },
];

const INFO = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms" },
  { href: "/community-guidelines", label: "Community Guidelines" },
  { href: "/safety", label: "Safety" },
  { href: "/cookies", label: "Cookies" },
  { href: "/contact", label: "Contact" },
  { href: "/report-content", label: "Report Content" },
];

export function MenuDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { theme, toggle } = useTheme();
  const { user, isAuthed, signOut, openSignIn } = useAuth();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-[61] flex w-[85%] max-w-sm flex-col bg-white shadow-2xl dark:bg-bark-900"
          >
            <div className="flex items-center justify-between border-b border-bark-100 p-4 dark:border-bark-800">
              <span className="font-display text-lg font-extrabold">
                Stray<span className="text-paw-500">Paw</span>
              </span>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-bark-500 hover:bg-bark-100 dark:hover:bg-bark-800"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="no-scrollbar flex-1 overflow-y-auto p-4">
              {/* account */}
              <div className="mb-4 rounded-2xl bg-paw-50 p-3 dark:bg-bark-800">
                {isAuthed ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-paw-200 text-xs font-bold text-paw-700">
                          {user!.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p className="text-xs text-bark-400">Signed in as</p>
                          <p className="text-sm font-semibold">{user!.name}</p>
                        </div>
                      </div>
                      <button
                        onClick={signOut}
                        className="flex items-center gap-1 text-xs font-semibold text-status-injured"
                      >
                        <LogOut className="h-3.5 w-3.5" /> Sign out
                      </button>
                    </div>
                    <Link
                      href="/account"
                      onClick={onClose}
                      className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm font-semibold text-paw-700 dark:bg-bark-900"
                    >
                      My sightings
                      <ChevronRight className="h-4 w-4 text-bark-300" />
                    </Link>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      onClose();
                      openSignIn();
                    }}
                    className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-paw-700"
                  >
                    <UserPlus className="h-4 w-4" /> Sign in to contribute
                  </button>
                )}
              </div>

              {/* primary nav */}
              <nav className="space-y-1">
                {PRIMARY.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-bark-100 dark:hover:bg-bark-800"
                    >
                      <Icon className="h-4 w-4 text-paw-500" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {/* appearance */}
              <div className="mt-4 border-t border-bark-100 pt-4 dark:border-bark-800">
                <button
                  onClick={toggle}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-bark-100 dark:hover:bg-bark-800"
                >
                  <span className="flex items-center gap-3">
                    {theme === "dark" ? (
                      <Moon className="h-4 w-4 text-paw-500" />
                    ) : (
                      <Sun className="h-4 w-4 text-paw-500" />
                    )}
                    Appearance
                  </span>
                  <span className="text-xs text-bark-400">
                    {theme === "dark" ? "Dark" : "Light"}
                  </span>
                </button>
              </div>

              {/* info links */}
              <div className="mt-4 border-t border-bark-100 pt-4 dark:border-bark-800">
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-bark-400">
                  More
                </p>
                {INFO.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-bark-100 dark:hover:bg-bark-800"
                  >
                    {item.label}
                    <ChevronRight className="h-4 w-4 text-bark-300" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-t border-bark-100 p-4 text-center text-xs text-bark-400 dark:border-bark-800">
              Built in India by{" "}
              <span className="font-semibold text-paw-600">Jay</span>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
