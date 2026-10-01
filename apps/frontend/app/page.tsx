"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import HowToPlay from "@/components/HowToPlay";

const GAMES = [
  {
    slug: "math",
    image: "/math.png",
    title: "Math Duel",
    blurb:
      "Type the answer as fast as you can. One minute, most correct wins.",
    accent: "from-amber-400 to-orange-500",
    tag: "⚡ SPEED",
  },
  {
    slug: "memory",
    image: "/memory.png",
    title: "Memory Grid",
    blurb:
      "Memorise the pattern, then tap the boxes back in order.",
    accent: "from-emerald-400 to-green-500",
    tag: "🧠 MEMORY",
  },
] as const;

type OnlineUser = {
  id: string;
  name: string;
};

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

const WS_URL =
  process.env.NEXT_PUBLIC_MATH_WS_URL ?? "ws://localhost:8080";

const HTTP_URL =
  process.env.NEXT_PUBLIC_HTTP_URL ?? "http://localhost:4000";

export default function Page() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  const signedIn = !!token;

  // Read token from localStorage
  useEffect(() => {
    try {
      setToken(localStorage.getItem("token") ?? "");
    } catch {
      setToken("");
    }
  }, []);

  // Connect to WebSocket
  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(
      `${WS_URL}?token=${encodeURIComponent(token)}`
    );

    ws.onopen = () => {
      console.log("🟢 Lobby WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "ONLINE_USER") {
          setOnlineUsers(data.payload.users ?? []);
        }
      } catch (err) {
        console.error("Bad WebSocket message", err);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error", err);
    };

    ws.onclose = () => {
      console.log("🔴 Lobby WebSocket disconnected");
    };

    return () => {
      ws.close();
    };
  }, [token]);

  // Fetch leaderboard
  useEffect(() => {
  const fetchLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);

      const response = await fetch(
        `${HTTP_URL}/api/v1/leaderboard/math`
      );

      if (!response.ok) {
        throw new Error(
          `Leaderboard request failed: ${response.status}`
        );
      }

      const responseData = await response.json();

      console.log("🏆 Leaderboard API:", responseData);

      const players = responseData?.data?.leaderboard ?? [];

      setLeaderboard(
        players.map(
          (player: Omit<LeaderboardUser, "rank">, index: number) => ({
            rank: index + 1,
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
          })
        )
      );
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
      setLeaderboard([]);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  fetchLeaderboard();
}, []);

  const play = (slug: string) => {
    if (!signedIn) return;

    router.push(`/play/${slug}/new`);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#080b12] text-white">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-150px] top-[-150px] h-[400px] w-[400px] rounded-full bg-amber-400/10 blur-3xl" />

        <div className="absolute right-[-150px] top-[20%] h-[400px] w-[400px] rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="absolute bottom-[-200px] left-[30%] h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto min-h-screen w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10 ">
        {/* Hero */}
        <section className="mx-auto max-w-3xl pb-12 text-center">
          <h1 className="text-4xl font-bold tracking-wide leading-tight antialiased sm:text-7xl lg:text-8xl">
            Think fast.
            <br />

            <span className="bg-gradient-to-r  from-amber-300 via-white to-emerald-300 bg-clip-text text-transparent">
              Play faster
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">
            Challenge your brain, compete with other players, and
            prove how fast you can think.
          </p>
        </section>

        {/* Online players */}
        {signedIn && (
          <section className="mb-10">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">
                  Players online
                </p>

              </div>

              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-400">
                {onlineUsers.length} online
              </div>
            </div>

            <div className="flex min-h-16 items-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              {onlineUsers.length === 0 ? (
                <p className="text-sm text-slate-500">
                  You're the first one here. Start a game!
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {onlineUsers.map((user) => (
                    <div
                      key={user.id}
                      title={user.name}
                      className="group relative"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold shadow-lg transition duration-200 group-hover:-translate-y-1 group-hover:scale-110">
                        {user.name.slice(0, 2).toUpperCase()}
                      </div>

                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#080b12] bg-emerald-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Leaderboard */}
        {/* Games */}
        <section>
          <div className="mb-5 flex items-end justify-around">
            <div>

              <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                Choose your battle
              </h2>
            </div>

            {signedIn && (
              <span className="hidden text-sm text-slate-500 sm:block">
                Pick a game to start
              </span>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {GAMES.map((game) => (
              <button
                key={game.slug}
                disabled={!signedIn}
                onClick={() => play(game.slug)}
                aria-label={`Play ${game.title}`}
                className="group relative min-h-[430px] overflow-hidden rounded-[28px] border border-white/10 bg-slate-900 text-left shadow-2xl transition duration-500 hover:-translate-y-2 hover:border-white/20 hover:shadow-black/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale"
              >
                {/* Poster */}
                <img
                  src={game.image}
                  alt=""
                  className="transition h-120 w-full duration-700 group-hover:scale-105"
                />

                {/* Dark overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                {/* Extra hover glow */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${game.accent} opacity-0 mix-blend-overlay transition duration-500 group-hover:opacity-30`}
                />

                {/* Tag */}
                <div className="absolute left-5 top-5 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-black tracking-wide text-white backdrop-blur-md">
                  {game.tag}
                </div>

                {/* Content */}
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
                  <h3 className="text-3xl font-black tracking-tight text-white drop-shadow-lg">
                    {game.title}
                  </h3>

                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-200">
                    {game.blurb}
                  </p>

                  <div className="mt-5 flex items-center justify-between">
                    <span
                      className={`rounded-xl bg-gradient-to-r ${game.accent} px-5 py-2.5 text-sm font-black text-black shadow-lg transition group-hover:scale-105 cursor-pointer active:scale-85`}
                    >
                      {signedIn ? "Play now " : "Sign in to play"}
                    </span>

                    <span className="text-sm font-semibold text-white/60 transition group-hover:text-white">
                      1 min
                    </span>
                  </div>
                </div>

                {/* Shine effect */}
                <div className="absolute -left-40 top-0 h-full w-32 rotate-12 bg-white/10 blur-xl transition duration-700 group-hover:left-[120%]" />
              </button>
            ))}
          </div>
        </section>

        {/* Bottom info */}
        <footer id="how-to-play" className="pb-10 pt-12 text-center">
          <HowToPlay />

          <p className="text-xs text-slate-600 mt-10">
            Fast games · Real-time competition · Built for your brain
          </p>
        </footer>
      </div>
    </main>
  );
}