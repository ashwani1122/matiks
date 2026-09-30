"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useParams, useRouter } from "next/navigation";

type CellState = "normal" | "correct" | "wrong";

type Question = {
  id: string;
  pattern: string[][];
};

type GamePhase =
  | "CONNECTING"
  | "MATCHING"
  | "WAITING"
  | "INTRO"
  | "SHOWING"
  | "PLAYING"
  | "SUBMITTING"
  | "COMPLETED";

type OnlineUser = {
  id: string;
  name: string;
};

const WS_URL =
  process.env.NEXT_PUBLIC_MEMORY_WS_URL ?? "ws://localhost:8081";

const BOARD_PHASES: GamePhase[] = [
  "INTRO",
  "SHOWING",
  "PLAYING",
  "SUBMITTING",
];

const setUrlSilently = (path: string) => {
  if (typeof window !== "undefined") {
    window.history.replaceState(null, "", path);
  }
};

/* -------------------------------------------------------------------------- */
/* Cell                                                                       */
/* -------------------------------------------------------------------------- */

const Cell = memo(function Cell({
  index,
  flipped,
  backClass,
  delay,
  clickable,
  instant,
  onClick,
}: {
  index: number;
  flipped: boolean;
  backClass: string;
  delay: number;
  clickable: boolean;
  instant: boolean;
  onClick: (index: number) => void;
}) {
  const face: React.CSSProperties = {
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
  };

  return (
    <div
      className="aspect-square w-[64px] sm:w-[76px]"
      style={{ perspective: 700 }}
    >
      <button
        onClick={() => onClick(index)}
        disabled={!clickable}
        aria-label={`Memory cell ${index + 1}`}
        className={`relative h-full w-full rounded-2xl ${
          clickable
            ? "cursor-pointer active:scale-95"
            : "cursor-default"
        }`}
        style={{
          transformStyle: "preserve-3d",
          transition: instant
            ? "none"
            : "transform 450ms cubic-bezier(.2,.8,.2,1)",
          transitionDelay: instant ? "0ms" : `${delay}ms`,
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Hidden side */}
        <span
          className="absolute inset-0 rounded-2xl border border-white/10 bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,.08)]"
          style={face}
        >
          <span className="absolute inset-[6px] rounded-xl border border-white/[0.06]" />
        </span>

        {/* Revealed side */}
        <span
          className={`absolute inset-0 rounded-2xl ${backClass} shadow-lg`}
          style={{
            ...face,
            transform: "rotateY(180deg)",
          }}
        >
          <span className="absolute inset-0 rounded-2xl bg-white/10" />
        </span>
      </button>
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/* Player                                                                     */
/* -------------------------------------------------------------------------- */

const Player = memo(function Player({
  name,
  fallback,
  score,
  me,
}: {
  name: string;
  fallback: string;
  score: number;
  me?: boolean;
}) {
  const initials = name
    ? name.slice(0, 2).toUpperCase()
    : fallback.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black ${
          me
            ? "bg-white text-slate-950 shadow-lg shadow-white/10"
            : "border border-white/10 bg-white/[0.08] text-white"
        }`}
      >
        {initials}
      </div>

      <div className="min-w-0">
        <p className="max-w-[110px] truncate text-xs font-medium text-white/50">
          {name || fallback}
        </p>

        <p className="text-2xl font-black leading-none tracking-tight">
          {score}
        </p>
      </div>
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

export default function MemoryGamePage() {
  const router = useRouter();
  const { gameId: routeGameId } = useParams<{ gameId: string }>();

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const gameIdRef = useRef("");
  const triedCreateRef = useRef(false);
  const joinSentRef = useRef(false);

  const [question, setQuestion] = useState<Question | null>(null);
  const [cells, setCells] = useState<CellState[]>([]);
  const [reveal, setReveal] = useState(false);

  const [phase, setPhase] = useState<GamePhase>("CONNECTING");

  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);

  const [user1, setUser1] = useState("");
  const [user2, setUser2] = useState("");

  const [questionNumber, setQuestionNumber] = useState(1);
  const [timer, setTimer] = useState(60);

  const [end, setEnd] = useState(false);
  const [message, setMessage] = useState("Connecting...");
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  const flatPattern = useMemo(
    () => (question ? question.pattern.flat() : []),
    [question],
  );

  const columns = question?.pattern[0]?.length ?? 4;

  /* ---------------------------------------------------------------------- */
  /* Timers                                                                 */
  /* ---------------------------------------------------------------------- */

  const clearGameTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const startShowingPattern = useCallback(
    (pattern: string[][]) => {
      clearGameTimer();

      setCells(Array(pattern.flat().length).fill("normal"));
      setReveal(false);
      setPhase("SHOWING");
      setMessage("Remember the green boxes");

      timerRef.current = setTimeout(() => {
        setReveal(true);

        timerRef.current = setTimeout(() => {
          setReveal(false);

          timerRef.current = setTimeout(() => {
            setPhase("PLAYING");
            setMessage("Select the boxes you remember");
          }, 700);
        }, 2500);
      }, 150);
    },
    [clearGameTimer],
  );

  const startQuestionIntro = useCallback(
    (pattern: string[][]) => {
      clearGameTimer();

      setPhase("INTRO");
      setMessage("");

      timerRef.current = setTimeout(() => {
        startShowingPattern(pattern);
      }, 1000);
    },
    [clearGameTimer, startShowingPattern],
  );

  /* ---------------------------------------------------------------------- */
  /* WebSocket                                                              */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    console.log("🔌 Creating new WebSocket");

    let token = "";
    let storedUser: { id: string } | null = null;

    try {
      token = localStorage.getItem("token") ?? "";
      storedUser = JSON.parse(localStorage.getItem("user") || "null");
    } catch (error) {
      console.error("Failed to read localStorage", error);
    }

    if (!token) {
      router.replace("/");
      return;
    }

    const ws = new WebSocket(
      `${WS_URL}?token=${encodeURIComponent(token)}`,
    );

    wsRef.current = ws;

    const send = (type: string, payload: unknown = {}) => {
      if (cancelled) return;

      if (ws.readyState === WebSocket.OPEN) {
        console.log("📤 Sending:", type);

        ws.send(
          JSON.stringify({
            type,
            payload,
          }),
        );
      }
    };

    ws.onopen = () => {
      if (cancelled) return;

      console.log("🟢 WebSocket OPEN");

      setPhase("MATCHING");
      setMessage("Finding a game...");
    };

    ws.onerror = (event) => {
      if (cancelled) return;

      console.error("❌ WebSocket ERROR", event);
      setMessage("WebSocket error");
    };

    ws.onclose = (event) => {
      console.log("🔴 WebSocket CLOSED", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        cancelled,
      });

      if (cancelled) return;

      if (wsRef.current === ws) {
        wsRef.current = null;
      }

      setPhase((p) =>
        p === "COMPLETED" ? p : "CONNECTING",
      );

      setMessage("Disconnected");
    };

    ws.onmessage = (event) => {
      if (cancelled) return;

      let data;

      try {
        data = JSON.parse(event.data);
      } catch {
        console.error("Invalid WS message:", event.data);
        return;
      }

      console.log(
        "📩 Received:",
        data.type,
        data.payload,
      );

      switch (data.type) {
        case "ONLINE_USER": {
          setOnlineUsers(data.payload.users ?? []);

          if (!joinSentRef.current) {
            joinSentRef.current = true;

            console.log(
              "📤 Sending JOIN after ONLINE_USER",
            );

            send("JOIN", {});
          }

          break;
        }

        case "ERROR": {
          if (
            !triedCreateRef.current &&
            /no open game/i.test(
              data.payload?.message ?? "",
            )
          ) {
            triedCreateRef.current = true;

            console.log(
              "🎮 No open game → creating game",
            );

            send("CREATE");

            return;
          }

          setMessage(
            data.payload?.message ??
              "Something went wrong.",
          );

          break;
        }

        case "GAME_CREATED": {
          gameIdRef.current =
            data.payload.gameId;

          console.log(
            "🎮 Game created:",
            data.payload.gameId,
          );

          setUrlSilently(
            `/play/memory/${data.payload.gameId}`,
          );

          setPhase("WAITING");
          setMessage(
            "Waiting for another player...",
          );

          break;
        }

        case "QUESTION": {
          const [questionId, pattern] =
            data.payload.question;

          const {
            member,
            endTime,
            runningGameId,
          } = data.payload;

          const me = member.find(
            (m: any) =>
              m.id === storedUser?.id,
          );

          const other = member.find(
            (m: any) =>
              m.id !== storedUser?.id,
          );

          setUser1(me?.name ?? "");
          setUser2(other?.name ?? "");

          gameIdRef.current =
            runningGameId;

          setUrlSilently(
            `/play/memory/${runningGameId}`,
          );

          clearCountdown();

          countdownRef.current =
            setInterval(() => {
              const remaining = Math.max(
                0,
                Math.ceil(
                  (endTime - Date.now()) /
                    1000,
                ),
              );

              setTimer(remaining);

              if (remaining <= 0) {
                clearCountdown();
                setEnd(true);
                setPhase("COMPLETED");
              }
            }, 250);

          setQuestion({
            id: questionId,
            pattern,
          });

          setQuestionNumber(1);

          startShowingPattern(pattern);

          break;
        }

        case "NEXT_QUESTION": {
          const pattern =
            data.payload.question;

          setQuestion({
            id: data.payload.questionId,
            pattern,
          });

          setCells(
            Array(pattern.flat().length).fill(
              "normal",
            ),
          );

          setQuestionNumber(
            (n) => n + 1,
          );

          startQuestionIntro(pattern);

          break;
        }

        case "SCORE_UPDATE": {
          const {
            myScore,
            opponent,
          } = data.payload;

          setScore1(myScore?.score ?? 0);
          setScore2(
            opponent?.score ?? 0,
          );

          break;
        }

        case "TIME_UP": {
          clearCountdown();

          setTimer(0);
          setEnd(true);
          setPhase("COMPLETED");

          break;
        }

        case "GAME_COMPLETED": {
          clearGameTimer();

          setPhase("COMPLETED");
          setMessage("Game completed!");

          break;
        }

        case "ANSWER_RESULT": {
          if (
            data.payload?.correct === false
          ) {
            setPhase("PLAYING");
            setMessage(
              "Some boxes were incorrect. Try again.",
            );
          }

          break;
        }
      }
    };

    return () => {
      console.log(
        "🧹 Cleaning WebSocket effect",
      );

      cancelled = true;

      clearGameTimer();
      clearCountdown();

      if (wsRef.current === ws) {
        wsRef.current = null;

        if (
          ws.readyState ===
            WebSocket.OPEN ||
          ws.readyState ===
            WebSocket.CONNECTING
        ) {
          console.log(
            "🔌 Closing current socket",
          );

          ws.close();
        }
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Submit answer                                                          */
  /* ---------------------------------------------------------------------- */

  const submitAnswer = useCallback(
    (selected: CellState[]) => {
      const ws = wsRef.current;
      const q = question;

      if (
        !ws ||
        !q ||
        !gameIdRef.current
      ) {
        return;
      }

      const flat = selected.map(
        (c) =>
          c === "correct"
            ? "on"
            : "off",
      );

      const cols =
        q.pattern[0].length;

      const answer: string[][] = [];

      for (
        let i = 0;
        i < flat.length;
        i += cols
      ) {
        answer.push(
          flat.slice(i, i + cols),
        );
      }

      ws.send(
        JSON.stringify({
          type: "SUBMIT",
          payload: {
            questionId: q.id,
            gameId: gameIdRef.current,
            answer,
          },
        }),
      );
    },
    [question],
  );

  /* ---------------------------------------------------------------------- */
  /* Cell click                                                             */
  /* ---------------------------------------------------------------------- */

  const handleCellClick = useCallback(
    (index: number) => {
      if (
        phase !== "PLAYING" ||
        !question
      ) {
        return;
      }

      if (cells[index] !== "normal") {
        return;
      }

      const updated = [...cells];

      if (
        flatPattern[index] === "on"
      ) {
        updated[index] = "correct";

        setCells(updated);

        const totalOn =
          flatPattern.filter(
            (v) => v === "on",
          ).length;

        const selectedCorrect =
          updated.filter(
            (v) => v === "correct",
          ).length;

        if (
          selectedCorrect ===
          totalOn
        ) {
          setPhase("SUBMITTING");

          setMessage(
            "Perfect! Checking answer...",
          );

          submitAnswer(updated);
        }

        return;
      }

      updated[index] = "wrong";

      setCells(updated);

      setMessage("Wrong box!");

      setTimeout(() => {
        setCells((current) => {
          if (
            current[index] !==
            "wrong"
          ) {
            return current;
          }

          const next = [...current];

          next[index] = "normal";

          return next;
        });

        setMessage(
          "Select the boxes you remember",
        );
      }, 600);
    },
    [
      phase,
      question,
      cells,
      flatPattern,
      submitAnswer,
    ],
  );

  /* ---------------------------------------------------------------------- */
  /* Leave                                                                  */
  /* ---------------------------------------------------------------------- */

  const leave = () => {
    wsRef.current?.close();
    router.push("/");
  };

  /* ---------------------------------------------------------------------- */
  /* Derived values                                                         */
  /* ---------------------------------------------------------------------- */

  const flipped = useMemo(
    () =>
      cells.map(
        (state, i) =>
          state !== "normal" ||
          (reveal &&
            flatPattern[i] === "on"),
      ),
    [cells, reveal, flatPattern],
  );

  const backClasses = useMemo(
    () =>
      cells.map((state) => {
        if (state === "wrong") {
          return "bg-gradient-to-br from-red-400 to-red-600";
        }

        return "bg-gradient-to-br from-emerald-300 to-emerald-600";
      }),
    [cells],
  );

  const result =
    score1 > score2
      ? "WINNER"
      : score1 < score2
        ? "LOST"
        : "DRAW";

  const showBoard =
    BOARD_PHASES.includes(phase);

  const isIntro =
    phase === "INTRO";

  const isBusy =
    phase === "CONNECTING" ||
    phase === "MATCHING" ||
    phase === "WAITING";

  const timerDanger = timer <= 10;

  const timerProgress =
    Math.min(100, (timer / 60) * 100);

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080b12] text-white">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-emerald-500/10 blur-[100px]" />
        <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      {!end ? (
        <div className="relative mx-auto w-full max-w-2xl px-4 pb-10 pt-6 sm:pt-10">
          {/* Header */}
          <header className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-xl">
                <span className="text-xl">🧠</span>
              </div>

              <div>
                <h1 className="text-lg font-black tracking-tight sm:text-xl">
                  Memory Grid
                </h1>

                <p className="text-xs text-white/40">
                  Remember. React. Win.
                </p>
              </div>
            </div>

            <button
              onClick={leave}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
            >
              Leave
            </button>
          </header>

          {/* Online users */}
          {onlineUsers.length > 0 && (
            <div className="mb-5 flex items-center gap-2 overflow-hidden">
              <div className="flex -space-x-2">
                {onlineUsers
                  .slice(0, 5)
                  .map((user) => (
                    <div
                      key={user.id}
                      title={user.name}
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#080b12] bg-slate-700 text-[9px] font-bold"
                    >
                      {user.name
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  ))}
              </div>

              <span className="text-xs text-white/40">
                {onlineUsers.length}{" "}
                {onlineUsers.length === 1
                  ? "player"
                  : "players"}{" "}
                online
              </span>
            </div>
          )}

          {/* Matching / waiting */}
          {isBusy && (
            <div className="flex min-h-[65vh] flex-col items-center justify-center text-center">
              <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.04] shadow-2xl">
                <span className="text-5xl">
                  {phase === "WAITING"
                    ? "⏳"
                    : "🧠"}
                </span>
              </div>

              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                {phase === "WAITING"
                  ? "Waiting for player"
                  : phase === "MATCHING"
                    ? "Finding opponent"
                    : "Connecting"}
              </h2>

              <p className="mt-3 max-w-sm text-sm leading-6 text-white/40">
                {phase === "WAITING"
                  ? "Your game is ready. As soon as another player joins, the challenge begins."
                  : "Get ready to test your memory against another player."}
              </p>

              <div className="mt-8 flex gap-2">
                {[0, 150, 300].map(
                  (delay) => (
                    <span
                      key={delay}
                      className="h-2.5 w-2.5 animate-bounce rounded-full bg-emerald-400"
                      style={{
                        animationDelay: `${delay}ms`,
                      }}
                    />
                  ),
                )}
              </div>

              <p className="mt-6 text-xs text-white/30">
                {message}
              </p>

              {phase === "WAITING" && (
                <p className="mt-2 rounded-lg bg-white/[0.03] px-3 py-2 font-mono text-[10px] text-white/20">
                  {gameIdRef.current ||
                    routeGameId}
                </p>
              )}
            </div>
          )}

          {/* Game */}
          {showBoard && (
            <>
              {/* Timer */}
              <div className="mb-5 flex flex-col items-center">
                <div
                  className={`flex items-center gap-2 rounded-full border px-5 py-2 ${
                    timerDanger
                      ? "border-red-400/30 bg-red-500/10 text-red-400"
                      : "border-white/10 bg-white/[0.05] text-white"
                  }`}
                >
                  <span className="text-xs font-semibold uppercase tracking-widest opacity-50">
                    Time
                  </span>

                  <span className="font-mono text-xl font-black tabular-nums">
                    00:
                    {String(timer).padStart(
                      2,
                      "0",
                    )}
                  </span>
                </div>

                <div className="mt-3 h-1 w-48 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      timerDanger
                        ? "bg-red-500"
                        : "bg-emerald-400"
                    }`}
                    style={{
                      width: `${timerProgress}%`,
                    }}
                  />
                </div>
              </div>

              {/* Scoreboard */}
              <div className="mb-7 rounded-3xl border border-white/10 bg-white/[0.045] p-4 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <Player
                    name={user1}
                    fallback="You"
                    score={score1}
                    me
                  />

                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                      VS
                    </span>

                    <div className="mt-1 h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]" />
                  </div>

                  <Player
                    name={user2}
                    fallback="Opponent"
                    score={score2}
                  />
                </div>
              </div>

              {/* Round info */}
              <div className="mb-7 flex items-center justify-between px-1">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                    Round
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {questionNumber}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                    Your score
                  </p>

                  <p className="mt-1 text-xl font-black text-emerald-400">
                    {score1}
                  </p>
                </div>
              </div>

              {/* Message */}
              <div className="mb-7 flex h-8 items-center justify-center">
                <p
                  className={`text-sm font-medium ${
                    phase === "SUBMITTING"
                      ? "text-emerald-400"
                      : phase === "SHOWING"
                        ? "text-emerald-300"
                        : "text-white/50"
                  }`}
                >
                  {isIntro
                    ? "Get ready..."
                    : message}
                </p>
              </div>

              {/* Grid */}
              <div className="relative mb-8 flex min-h-[330px] items-center justify-center">
                <div
                  className={`grid gap-2 sm:gap-3 ${
                    isIntro
                      ? "invisible"
                      : ""
                  }`}
                  style={{
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  }}
                >
                  {cells.map(
                    (_, index) => (
                      <Cell
                        key={index}
                        index={index}
                        flipped={
                          flipped[index]
                        }
                        backClass={
                          backClasses[
                            index
                          ]
                        }
                        delay={
                          reveal
                            ? index * 30
                            : 0
                        }
                        clickable={
                          phase ===
                          "PLAYING"
                        }
                        instant={reveal}
                        onClick={
                          handleCellClick
                        }
                      />
                    ),
                  )}
                </div>

                {/* Intro overlay */}
                {isIntro && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-emerald-400">
                      Get ready
                    </div>

                    <h2 className="text-5xl font-black tracking-tight sm:text-6xl">
                      Round{" "}
                      {questionNumber}
                    </h2>
                  </div>
                )}
              </div>

              {/* Bottom instruction */}
              {phase === "PLAYING" && (
                <div className="mx-auto max-w-sm rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-3 text-center">
                  <p className="text-xs text-white/30">
                    Tap every green box you
                    remember
                  </p>
                </div>
              )}

              {phase === "SUBMITTING" && (
                <div className="flex justify-center">
                  <div className="flex items-center gap-2 rounded-full bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-400">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                    Checking your answer...
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* ---------------------------------------------------------------- */
        /* Result screen                                                     */
        /* ---------------------------------------------------------------- */
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05070b]/90 px-4 backdrop-blur-md">
          <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-[#0c1018] p-7 shadow-2xl sm:p-9">
            {/* Glow */}
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[70px]" />

            <div className="relative">
              {/* Trophy */}
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-3xl">
                {result === "WINNER"
                  ? "🏆"
                  : result === "DRAW"
                    ? "🤝"
                    : "🧠"}
              </div>

              <p className="text-center text-[10px] font-bold uppercase tracking-[0.35em] text-white/30">
                Game complete
              </p>

              <h1
                className={`mt-2 text-center text-4xl font-black tracking-tight ${
                  result === "WINNER"
                    ? "text-emerald-400"
                    : result === "LOST"
                      ? "text-red-400"
                      : "text-amber-400"
                }`}
              >
                {result}
              </h1>

              {/* Scores */}
              <div className="mt-10 flex items-center">
                <div className="flex flex-1 flex-col items-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-black text-slate-950">
                    {user1
                      ? user1
                          .slice(0, 2)
                          .toUpperCase()
                      : "YO"}
                  </div>

                  <p className="text-5xl font-black tabular-nums">
                    {score1}
                  </p>

                  <p className="mt-2 max-w-[120px] truncate text-sm text-white/40">
                    {user1 || "You"}
                  </p>
                </div>

                <div className="mx-4 flex flex-col items-center">
                  <div className="h-12 w-px bg-white/10" />

                  <span className="my-2 text-[10px] font-black text-white/20">
                    VS
                  </span>

                  <div className="h-12 w-px bg-white/10" />
                </div>

                <div className="flex flex-1 flex-col items-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-sm font-black">
                    {user2
                      ? user2
                          .slice(0, 2)
                          .toUpperCase()
                      : "OP"}
                  </div>

                  <p className="text-5xl font-black tabular-nums">
                    {score2}
                  </p>

                  <p className="mt-2 max-w-[120px] truncate text-sm text-white/40">
                    {user2 || "Opponent"}
                  </p>
                </div>
              </div>

              {/* Result line */}
              <div className="mt-8 rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-3 text-center">
                <p className="text-xs text-white/30">
                  Final score
                </p>

                <p className="mt-1 text-sm font-semibold text-white/70">
                  {score1 === score2
                    ? "A perfectly matched game."
                    : score1 > score2
                      ? "Great memory. You came out on top!"
                      : "Good game. Give it another shot!"}
                </p>
              </div>

              <button
                className="mt-6 w-full rounded-2xl bg-emerald-400 px-5 py-4 font-bold text-slate-950 shadow-lg shadow-emerald-400/10 transition hover:bg-emerald-300 active:scale-[0.98]"
                onClick={leave}
              >
                Back to lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}