"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const card =
  "rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800";
const input =
  "w-full rounded-xl border border-slate-300 bg-transparent p-3 outline-none focus:ring-2 focus:ring-amber-400 dark:border-slate-600";
const btn =
  "rounded-xl bg-amber-400 px-5 py-3 font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-50";

/* Each game is served by its own WebSocket backend, so a game is only
   "playable" once the person has a token saved for it. */
const GAMES = [
  {
    slug: "math",
    title: "Math Duel",
    blurb: "Type the answer as fast as you can. One minute, most correct wins.",
    accent: "bg-amber-400",
  },
  {
    slug: "memory",
    title: "Memory Grid",
    blurb: "Memorise the pattern, then tap the boxes back in order.",
    accent: "bg-emerald-400",
  },
] as const;

export default function Page() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("token") ?? "";
      setToken(stored);
      setSaved(!!stored);
    } catch {}
  }, []);

  const saveToken = () => {
    if (!token.trim()) return;
    try {
      localStorage.setItem("token", token.trim());
    } catch {}
    setSaved(true);
  };

  /* "new" is a placeholder segment: the game page connects, starts
     matchmaking, then replaces the URL with the real game id once the
     server assigns one. */
  const play = (slug: string) => {
    if (!saved) return;
    router.push(`/play/${slug}/new`);
  };

  return (
    <main className="flex min-h-screen justify-center bg-slate-100 px-4 py-10 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="w-full max-w-xl">
        <h1 className="mb-1 text-4xl font-extrabold tracking-tight">Game Room</h1>
        <p className="mb-6 text-slate-500">Sign in once, then pick a game.</p>

        <section className={`${card} mb-6`}>
          <h2 className="mb-3 text-xl font-semibold">Login token (JWT)</h2>
          <input
            className={input}
            type="password"
            value={token}
            placeholder="Paste your token"
            onChange={(e) => {
              setToken(e.target.value);
              setSaved(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && saveToken()}
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              {saved ? "Saved on this device." : "Save it to unlock the games below."}
            </span>
            <button className={btn} onClick={saveToken}>
              Save
            </button>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          {GAMES.map((g) => (
            <button
              key={g.slug}
              disabled={!saved}
              onClick={() => play(g.slug)}
              className={`${card} text-left transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0`}
            >
              <span className={`inline-block h-2 w-10 rounded-full ${g.accent}`} />
              <h3 className="mt-3 text-2xl font-bold">{g.title}</h3>
              <p className="mt-1 text-slate-500">{g.blurb}</p>
              <span className="mt-4 inline-block font-semibold text-amber-500">Play →</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}