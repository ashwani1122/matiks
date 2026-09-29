
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
    <nav className="flex h-16 items-center justify-between border-b border-zinc-800 bg-black px-6 text-white">
      {/* Logo */}
      <Link href="/" className="flex items-center">
        <Image
          src="/maatiks.png"
          alt="Matiks"
          width={100}
          height={40}
          className="h-10 w-auto object-contain"
        />
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {!isLoggedIn ? (
          <>
            <Link
              href="/auth/login"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium transition hover:bg-zinc-900"
            >
              Login
            </Link>

            <Link
              href="/auth/register"
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
            >
              Register
            </Link>
          </>
        ) : (
          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}



