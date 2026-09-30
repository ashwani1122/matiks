"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    function checkAuth() {
      const storedToken = localStorage.getItem("token");
      setIsLoggedIn(!!storedToken);
    }

    checkAuth();

    window.addEventListener("auth-change", checkAuth);

    return () => {
      window.removeEventListener("auth-change", checkAuth);
    };
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setIsLoggedIn(false);

    window.dispatchEvent(new Event("auth-change"));

    router.push("/auth/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#070b14]/80 text-white backdrop-blur-xl">
      <nav className="mx-auto flex h-[72px] w-full max-w-7xl items-center justify-between px-5 sm:px-8">
        {/* LEFT */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link
            href="/"
            className="group flex items-center transition-opacity hover:opacity-90"
          >
            <span>MATIKS</span>
          </Link>

          {/* Navigation */}
          <div className="hidden items-center gap-1 md:flex">
            <Link
              href="/"
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
            >
              Games
            </Link>

            <Link
              href="/#how-to-play"
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
            >
              How to Play
            </Link>

            <Link
              href="#leaderboard"
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
            >
              Leaderboard
            </Link>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!isLoggedIn ? (
            <>
              <Link
                href="/auth/login"
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                Login
              </Link>

              <Link
                href="/auth/register"
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black shadow-lg shadow-white/5 transition hover:-translate-y-0.5 hover:bg-slate-200 active:translate-y-0"
              >
                <span className="hidden sm:inline">
                  Create Account
                </span>

                <span className="sm:hidden">Sign up</span>
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-3">
              {/* Online indicator */}
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-400 sm:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                Online
              </div>

              <button
                onClick={handleLogout}
                className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:border-red-400/30 hover:bg-red-400/10"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}