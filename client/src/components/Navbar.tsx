import { NavLink, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Wifi,
  Loader2,
  Flame,
  UserCheck,
  LogOut,
  ArrowRight,
} from "lucide-react";
import type { UserProfile } from "../types";

interface Props {
  user: UserProfile | null;
  charitiesCount: number;
  apiState: "connecting" | "online" | "error";
  authLoading: boolean;
  onQuickLogin: (email: string, pass: string) => void;
  onOpenAuthModal: (mode: "login" | "signup") => void;
  onLogout: () => void;
}

export default function Navbar({
  user,
  charitiesCount,
  apiState,
  authLoading,
  onQuickLogin,
  onOpenAuthModal,
  onLogout,
}: Props) {
  const navigate = useNavigate();

  return (
    <>
      {/* EVALUATOR SANDBOX & LIVE CONNECTION STATUS BAR */}
      <div className="bg-[#161920] border-b border-white/10 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-amber-400 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>EVALUATOR SANDBOX:</span>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono flex items-center gap-1.5 border ${
              apiState === "online"
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : apiState === "connecting"
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : "bg-red-500/15 text-red-300 border-red-500/30"
            }`}
          >
            <Wifi className="w-3 h-3" />
            {apiState === "online" && "Supabase & Express API Connected"}
            {apiState === "connecting" && "Syncing API..."}
            {apiState === "error" && "API Offline — Check Server Port 5001"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onQuickLogin("subscriber@digitalheroes.co.in", "sub123")
            }
            disabled={authLoading}
            className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition cursor-pointer flex items-center gap-1.5"
          >
            {authLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            <span>1-Click Subscriber (Alex)</span>
          </button>
          <button
            onClick={() =>
              onQuickLogin("admin@digitalheroes.co.in", "admin123")
            }
            disabled={authLoading}
            className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition cursor-pointer flex items-center gap-1.5"
          >
            {authLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            <span>1-Click Admin</span>
          </button>
        </div>
      </div>

      {/* MAIN NAVIGATION */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0D0F12]/85 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#FF5A36] to-amber-500 flex items-center justify-center shadow-lg shadow-[#FF5A36]/20 group-hover:scale-105 transition">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div className="leading-2">
              <span className="font-bold tracking-tight text-xs md:text-base block">
                DIGITAL<span className="text-[#FF5A36]">.HEROES</span>
              </span>
              <span className="text-[0.5rem] md:text-[10px] uppercase tracking-widest text-zinc-400">
                Impact × Performance
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `hover:text-white transition ${isActive ? "text-[#FF5A36]" : ""}`
              }
            >
              Story & Concept
            </NavLink>
            <NavLink
              to="/charities"
              className={({ isActive }) =>
                `hover:text-white transition ${isActive ? "text-[#FF5A36]" : ""}`
              }
            >
              Charity Directory ({charitiesCount})
            </NavLink>
            {user && user.role === "subscriber" && (
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `hover:text-white transition ${isActive ? "text-[#FF5A36]" : ""}`
                }
              >
                Subscriber Dashboard
              </NavLink>
            )}
            {user && user.role === "admin" && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `hover:text-white transition ${isActive ? "text-[#FF5A36]" : ""}`
                }
              >
                Admin Control Center
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    navigate(user.role === "admin" ? "/admin" : "/dashboard")
                  }
                  className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-sm font-medium transition cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-[#FF5A36]" />
                  <span className="text-xs">{user.full_name}</span>
                </button>
                <button
                  onClick={onLogout}
                  className="p-2 rounded-full bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAuthModal("login")}
                  className="px-3 py-2 text-xs md:text-sm font-medium text-zinc-300 hover:text-white transition cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onOpenAuthModal("signup")}
                  className="px-4 py-2 rounded-full bg-[#FF5A36] hover:bg-[#ff6d4d] text-white text-xs md:text-sm font-semibold shadow-lg shadow-[#FF5A36]/25 transition flex items-center gap-2 cursor-pointer"
                >
                  <span>Join & Subscribe</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
