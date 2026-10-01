"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type LeaderboardUser = {
  rank: number;
  user: {
    id: string;
    username: string;
  };
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalScore: number;
  correctAnswers: number;
};

const HTTP_URL =
  process.env.NEXT_PUBLIC_HTTP_URL ?? "http://localhost:4000";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${HTTP_URL}/api/v1/leaderboard/math`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(`Leaderboard request failed (${response.status})`);
      }

      const responseData = await response.json();
      const players = responseData?.data?.leaderboard;

      if (!Array.isArray(players)) {
        throw new Error(
          "The API response does not contain data.leaderboard. Check the backend response shape."
        );
      }

const normalized: LeaderboardUser[] = players
  .map((player: Partial<LeaderboardUser>, index: number) => ({
    rank: 0,
    user: {
      id: player.user?.id ?? `player-${index}`,
      username: player.user?.username ?? "Unknown player",
    },
    rating: Number(player.rating ?? 1000),
    gamesPlayed: Number(player.gamesPlayed ?? 0),
    wins: Number(player.wins ?? 0),
    losses: Number(player.losses ?? 0),
    totalScore: Number(player.totalScore ?? 0),
    correctAnswers: Number(player.correctAnswers ?? 0),
  }))
  .sort((a, b) => {
    // Primary ranking:
    // matches won + questions solved
    const scoreA = a.wins + a.correctAnswers;
    const scoreB = b.wins + b.correctAnswers;

    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    // Tie-breaker 1: more wins
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }

    // Tie-breaker 2: more questions solved
    if (b.correctAnswers !== a.correctAnswers) {
      return b.correctAnswers - a.correctAnswers;
    }

    // Tie-breaker 3: higher rating
    return b.rating - a.rating;
  })
  .map((player, index) => ({
    ...player,
    rank: index + 1,
  }));

setLeaderboard(normalized);

      setLeaderboard(normalized);
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading the leaderboard."
      );
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLeaderboard();
  }, [fetchLeaderboard]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080b12] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-150px] top-[-150px] h-[400px] w-[400px] rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute right-[-150px] top-[20%] h-[400px] w-[400px] rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute bottom-[-200px] left-[30%] h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto min-h-screen w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2  border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden="true">←</span> Back to home
          </Link>

          <button
            type="button"
            onClick={() => void fetchLeaderboard()}
            disabled={loading}
            className=" border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "↻ Refresh"}
          </button>
        </header>

        <section className="mx-auto max-w-3xl pb-10 pt-16 text-center sm:pt-20">
         

          <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-6xl">
            The <span className="bg-gradient-to-r from-amber-300 via-white to-emerald-300 bg-clip-text text-transparent">Leaderboard</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-400">
            See who is competing, compare player stats, and track your progress.
          </p>
        </section>

        <section className="mb-8 grid  grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Players ranked", value: leaderboard.length.toLocaleString() },
            {
              label: "Total games",
              value: leaderboard.reduce((sum, player) => sum + player.gamesPlayed, 0).toLocaleString(),
            },
            {
              label: "Total wins",
              value: leaderboard.reduce((sum, player) => sum + player.wins, 0).toLocaleString(),
            },
            {
              label: "Top rating",
              value: (leaderboard[0]?.rating ?? 0).toLocaleString(),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center border border-white/10 bg-white/[0.03] p-4 sm:p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-black text-white">{stat.value}</p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden border border-white/10 bg-white/[0.03] shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-5 sm:px-7">
            <div>
              <h2 className="text-xl font-black">Top players</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ranked by the order returned by the backend.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-semibold text-slate-400">
              {leaderboard.length} players
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-white/70" />
                Loading leaderboard…
              </div>
            </div>
          ) : error ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <p className="text-lg font-bold text-white">Could not load rankings</p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-red-300">{error}</p>
              <p className="mt-2 text-xs text-slate-500">
                Confirm that the HTTP backend is running and NEXT_PUBLIC_HTTP_URL points to its origin.
              </p>
              <button
                type="button"
                onClick={() => void fetchLeaderboard()}
                className="mt-5 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:bg-slate-200"
              >
                Try again
              </button>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="flex min-h-64 items-center justify-center px-6 text-center">
              <div>
                <p className="text-lg font-bold text-white">No scores yet</p>
                <p className="mt-2 text-sm text-slate-500">
                  Play a match to start building the leaderboard.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {leaderboard.map((player) => (
                <article
                  key={player.user.id}
                  className="px-4 py-5 transition hover:bg-white/[0.035] sm:px-7"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                        {player.rank === 1 ? (
                          <span className="text-5xl" aria-label="First place">🥇</span>
                        ) : player.rank === 2 ? (
                          <span className="text-5xl" aria-label="Second place">🥈</span>
                        ) : player.rank === 3 ? (
                          <span className="text-5xl" aria-label="Third place">🥉</span>
                        ) : (
                          <span className="text-sm font-bold text-slate-500">#{player.rank}</span>
                        )}
                      </div>

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center  border border-white/10 bg-gradient-to-br from-blue-500 to-violet-600 text-xs font-black">
                        {player.user.username.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white sm:text-base">
                          {player.user.username}
                        </p>
                        
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xl font-black text-white sm:text-2xl">
                        {player.totalScore.toLocaleString()}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        points
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { label: "Games played", value: player.gamesPlayed, className: "text-white" },
                      { label: "Wins", value: player.wins, className: "text-emerald-400" },
                      { label: "Losses", value: player.losses, className: "text-red-400" },
                      { label: "Correct answers", value: player.correctAnswers, className: "text-amber-400" },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className=" border flex flex-col items-center border-white/5 bg-white/[0.03] px-3 py-3"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          {stat.label}
                        </p>
                        <p className={`mt-1 text-sm font-bold ${stat.className}`}>
                          {stat.value.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="pb-10 pt-8 text-center">
          <p className="text-xs text-slate-600">
            Fast games · Real-time competition · Built for your brain
          </p>
        </footer>
      </div>
    </main>
  );
}
