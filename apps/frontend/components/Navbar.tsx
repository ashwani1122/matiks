
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    setIsMenuOpen(false);

    window.dispatchEvent(new Event("auth-change"));

    router.push("/auth/login");
  }

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#070b14]/90 text-white backdrop-blur-xl">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:h-[68px] sm:px-5 md:px-6 lg:h-[72px] lg:px-8">
        {/* =====================================================
            LEFT
        ====================================================== */}
        <div className="flex w-full items-center   gap-4 sm:gap-5 lg:gap-8">
          {/* LOGO */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black tracking-tight">
                Matiks
              </span>
            </div>
          </div>

          {/* =================================================
              TABLET + DESKTOP NAVIGATION
              Starts at md so iPad gets navigation.
          ================================================== */}
          <div className="hidden items-center justify-center  gap-0.5 md:flex lg:gap-1 w-full ">
            <Link
              href="/"
              className="rounded-lg px-2.5 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white lg:rounded-xl lg:px-4 lg:text-sm"
            >
              Games
            </Link>

            <Link
              href="/#how-to-play"
              className="rounded-lg px-2.5 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white lg:rounded-xl lg:px-4 lg:text-sm"
            >
              How to Play
            </Link>

            <Link
              href="/leaderboard"
              className="rounded-lg px-2.5 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white lg:rounded-xl lg:px-4 lg:text-sm"
            >
              Leaderboard
            </Link>
          </div>
        </div>

        {/* =====================================================
            RIGHT
        ====================================================== */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5 lg:gap-3">
          {/* =================================================
              TABLET + DESKTOP AUTH
          ================================================== */}
          <div className="hidden items-center gap-2 md:flex">
            {!isLoggedIn ? (
              <>
                <Link
                  href="/auth/login"
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white lg:rounded-xl lg:px-4 lg:py-2.5 lg:text-sm"
                >
                  Login
                </Link>

                <Link
                  href="/auth/register"
                  className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black shadow-lg shadow-white/5 transition hover:-translate-y-0.5 hover:bg-slate-200 active:translate-y-0 lg:rounded-xl lg:px-4 lg:py-2.5 lg:text-sm"
                >
                  <span className="hidden lg:inline">
                    Create Account
                  </span>

                  <span className="lg:hidden">
                    Sign up
                  </span>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2 lg:gap-3">
                {/* Online indicator */}
                
                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-xs font-semibold text-red-400 transition hover:border-red-400/30 hover:bg-red-400/10 lg:rounded-xl lg:px-4 lg:py-2.5 lg:text-sm"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* =================================================
              MOBILE MENU BUTTON
              Only below md.
          ================================================== */}
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white md:hidden"
          >
            <div className="flex w-5 flex-col gap-1.5">
              <span
                className={`h-0.5 w-full rounded-full bg-current transition-transform duration-200 ${
                  isMenuOpen ? "translate-y-2 rotate-45" : ""
                }`}
              />

              <span
                className={`h-0.5 w-full rounded-full bg-current transition-opacity duration-200 ${
                  isMenuOpen ? "opacity-0" : ""
                }`}
              />

              <span
                className={`h-0.5 w-full rounded-full bg-current transition-transform duration-200 ${
                  isMenuOpen ? "-translate-y-2 -rotate-45" : ""
                }`}
              />
            </div>
          </button>
        </div>
      </nav>

      {/* =======================================================
          MOBILE MENU
          Only below md.
      ======================================================== */}
      <div
        className={`overflow-hidden border-t border-white/[0.06] bg-[#070b14] transition-all duration-200 md:hidden ${
          isMenuOpen
            ? "max-h-[500px] opacity-100"
            : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 py-4 sm:px-5">
          {/* NAV LINKS */}
          <div className="flex flex-col gap-1">
            <Link
              href="/"
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
            >
              Games
            </Link>

            <Link
              href="/#how-to-play"
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
            >
              How to Play
            </Link>

            <Link
              href="/leaderboard"
              onClick={closeMenu}
              className="rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
            >
              Leaderboard
            </Link>
          </div>

          {/* AUTH */}
          <div className="mt-3 border-t border-white/[0.06] pt-3">
            {!isLoggedIn ? (
              <div className="flex gap-2">
                <Link
                  href="/auth/login"
                  onClick={closeMenu}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Login
                </Link>

                <Link
                  href="/auth/register"
                  onClick={closeMenu}
                  className="flex-1 rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-black transition hover:bg-slate-200"
                >
                  Sign up
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                  Online
                </div>

                <button
                  onClick={handleLogout}
                  className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-400/10"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
