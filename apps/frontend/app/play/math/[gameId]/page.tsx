"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Question = {
  id: string | number;
  answer?: unknown;
  question?: unknown;
  text?: unknown;
  prompt?: unknown;
  title?: unknown;
  grid?: unknown;
  board?: unknown;
  data?: unknown;
  [key: string]: unknown;
};

type ResultInfo = {
  correct: boolean;
  correctAnswer: unknown;
  score: number;
};

type Finished = {
  result: "WIN" | "LOSE" | "DRAW";
  score: number;
  opponent: {
    name: string;
    score: number;
  } | null;
};

type ServerMessage = {
  type: string;
  payload?: any;
};

const WS_URL =
  process.env.NEXT_PUBLIC_MATH_WS_URL ?? "ws://localhost:8080";

const DEFAULT_DURATION_MS = 60_000;
const FEEDBACK_MS = 1200;

const fmt = (value: unknown) =>
  typeof value === "string"
    ? value
    : JSON.stringify(value);

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

const parseAnswer = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

/*
 * Update the URL without causing Next.js to remount
 * the page and destroy the WebSocket connection.
 */
const setUrlSilently = (path: string) => {
  if (typeof window !== "undefined") {
    window.history.replaceState(null, "", path);
  }
};

const outcome = {
  WIN: {
    title: "You Win!",
    subtitle: "Great job. You were faster.",
    icon: "🏆",
    color: "text-emerald-400",
    glow: "bg-emerald-400/20",
  },
  LOSE: {
    title: "You Lose",
    subtitle: "Better luck next round.",
    icon: "💥",
    color: "text-red-400",
    glow: "bg-red-400/20",
  },
  DRAW: {
    title: "It's a Draw",
    subtitle: "That was close.",
    icon: "🤝",
    color: "text-amber-400",
    glow: "bg-amber-400/20",
  },
} as const;

export default function MathGamePage() {
  const router = useRouter();
  const params = useParams<{ gameId: string }>();

  const routeGameId = params?.gameId;

  const [status, setStatus] = useState<
    "connecting" | "searching" | "playing"
  >("connecting");

  const [error, setError] = useState("");

  const [question, setQuestion] =
    useState<Question | null>(null);

  const [count, setCount] = useState(0);

  const [score, setScore] = useState(0);

  const [locked, setLocked] = useState(false);

  const [result, setResult] =
    useState<ResultInfo | null>(null);

  const [answer, setAnswer] = useState("");

  const [waiting, setWaiting] = useState(false);

  const [timeLeft, setTimeLeft] = useState(60);

  const [finished, setFinished] =
    useState<Finished | null>(null);

  const inputRef =
    useRef<HTMLInputElement | null>(null);

  const wsRef =
    useRef<WebSocket | null>(null);

  const gameIdRef =
    useRef<string | null>(null);

  const questionRef =
    useRef<Question | null>(null);

  const lockedRef =
    useRef(false);

  const pendingRef =
    useRef<Question | null>(null);

  const overRef =
    useRef(false);

  const endsAtRef =
    useRef(0);

  const totalRef =
    useRef(DEFAULT_DURATION_MS / 1000);

  const timersRef =
    useRef<ReturnType<typeof setTimeout>[]>([]);

  const playSentRef =
    useRef(false);

  /*
   * Store timeout IDs so that all delayed actions
   * can be cancelled when the component unmounts.
   */
  const later = useCallback(
    (fn: () => void, ms: number) => {
      const timer = setTimeout(fn, ms);

      timersRef.current.push(timer);
    },
    []
  );

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => {
      clearTimeout(timer);
    });

    timersRef.current = [];
  }, []);

  /*
   * Display a new question.
   */
  const showQuestion = useCallback(
    (q: Question) => {
      if (!q) return;

      questionRef.current = q;

      pendingRef.current = null;

      lockedRef.current = false;

      setQuestion(q);

      setLocked(false);

      setResult(null);

      setAnswer("");

      setWaiting(false);

      setCount((current) => current + 1);
    },
    []
  );

  /*
   * Send a message through the current WebSocket.
   */
  const send = useCallback(
    (
      type: string,
      payload: unknown = {}
    ) => {
      const ws = wsRef.current;

      if (!ws) return;

      if (ws.readyState !== WebSocket.OPEN) {
        return;
      }

      ws.send(
        JSON.stringify({
          type,
          payload,
        })
      );
    },
    []
  );

  /*
   * Handle messages received from the Math WebSocket server.
   */
  const handleMessage = useCallback(
    (message: ServerMessage) => {
      const type = message.type;
      const p = message.payload ?? {};

      switch (type) {
        /*
         * The Math server sends ONLINE_USER after
         * authenticating the WebSocket connection.
         *
         * Only send PLAY_GAME once.
         */
        case "ONLINE_USER": {
          if (!playSentRef.current) {
            playSentRef.current = true;

            send("PLAY_GAME");
          }

          break;
        }

        /*
         * No opponent yet.
         */
        case "SEARCHING_FOR_PLAYER": {
          gameIdRef.current = p.gameId ?? null;

          setStatus("searching");

          setError("");

          if (p.gameId) {
            setUrlSilently(
              `/play/math/${p.gameId}`
            );
          }

          break;
        }

        /*
         * Two players have been matched.
         */
        case "GAME_ACCEPTED": {
          const durationMs =
            Number(p.durationMs) ||
            DEFAULT_DURATION_MS;

          const gameId =
            typeof p.gameId === "string"
              ? p.gameId
              : null;

          if (!gameId) {
            setError(
              "The server did not provide a game ID."
            );

            return;
          }

          if (!p.firstQuestion) {
            setError(
              "The server did not provide the first question."
            );

            return;
          }

          gameIdRef.current = gameId;

          overRef.current = false;

          totalRef.current =
            Math.round(durationMs / 1000);

          endsAtRef.current =
            Date.now() + durationMs;

          setTimeLeft(
            Math.round(durationMs / 1000)
          );

          setFinished(null);

          setWaiting(false);

          setScore(0);

          setCount(0);

          setError("");

          if (gameId) {
            setUrlSilently(
              `/play/math/${gameId}`
            );
          }

          showQuestion(p.firstQuestion);

          setStatus("playing");

          break;
        }

        /*
         * The server sends the next question.
         *
         * If the answer feedback is still visible,
         * keep the question pending until the feedback
         * period is finished.
         */
        case "QUESTION": {
          if (!p.question) {
            return;
          }

          if (lockedRef.current) {
            pendingRef.current = p.question;
          } else {
            showQuestion(p.question);
          }

          break;
        }

        /*
         * Server has processed our answer.
         */
        case "ANSWER_RESULT": {
          const serverScore =
            typeof p.score === "number"
              ? p.score
              : null;

          setResult({
            correct: Boolean(p.correct),
            correctAnswer: p.correctAnswer,
            score:
              serverScore ??
              (p.correct
                ? score + 1
                : score),
          });

          /*
           * IMPORTANT:
           *
           * The server is the source of truth.
           * Do not increment the score locally.
           */
          if (serverScore !== null) {
            setScore(serverScore);
          }

          later(() => {
            if (overRef.current) {
              return;
            }

            if (pendingRef.current) {
              showQuestion(
                pendingRef.current
              );
            }
          }, FEEDBACK_MS);

          break;
        }

        /*
         * We have answered every question,
         * but the opponent has not finished yet.
         */
        case "WAITING_FOR_OPPONENT": {
          setWaiting(true);

          lockedRef.current = true;

          setLocked(true);

          break;
        }

        /*
         * Final game result.
         */
        case "GAME_FINISHED": {
          overRef.current = true;

          clearTimers();

          const finish = () => {
            const finalScore =
              typeof p.score === "number"
                ? p.score
                : score;

            setFinished({
              result:
                p.result === "WIN" ||
                p.result === "LOSE" ||
                p.result === "DRAW"
                  ? p.result
                  : "DRAW",

              score: finalScore,

              opponent:
                p.opponent ?? null,
            });

            /*
             * Make final server score authoritative.
             */
            if (
              typeof p.score === "number"
            ) {
              setScore(p.score);
            }
          };

          /*
           * If feedback is currently visible,
           * allow it to finish before showing the
           * final modal.
           */
          if (lockedRef.current) {
            later(
              finish,
              FEEDBACK_MS
            );
          } else {
            finish();
          }

          break;
        }

        /*
         * Server-side error.
         */
        case "ERROR": {
          if (overRef.current) {
            return;
          }

          setError(
            p.message ??
              "Something went wrong."
          );

          lockedRef.current = false;

          setLocked(false);

          break;
        }

        default: {
          console.warn(
            "Unknown Math WS message:",
            message
          );

          break;
        }
      }
    },
    [
      clearTimers,
      later,
      score,
      send,
      showQuestion,
    ]
  );

  /*
   * Connect once when the page mounts.
   */
  useEffect(() => {
    let cancelled = false;

    let token = "";

    try {
      token =
        localStorage.getItem("token") ?? "";
    } catch {
      token = "";
    }

    /*
     * User is not authenticated.
     */
    if (!token) {
      router.replace("/");

      return;
    }

    /*
     * Reset connection state.
     */
    playSentRef.current = false;

    overRef.current = false;

    setStatus("connecting");

    setError("");

    /*
     * Backend expects:
     *
     * ws://localhost:8080?token=JWT
     */
    const ws = new WebSocket(
      `${WS_URL}?token=${encodeURIComponent(token)}`
    );

    wsRef.current = ws;

    ws.onopen = () => {
      if (cancelled) return;

      /*
       * Do NOT send PLAY_GAME here.
       *
       * The server sends ONLINE_USER after
       * authentication. We start matchmaking
       * when ONLINE_USER arrives.
       */
      setStatus("searching");
    };

    ws.onmessage = (event) => {
      if (cancelled) return;

      try {
        const message =
          JSON.parse(
            event.data
          ) as ServerMessage;

        handleMessage(message);
      } catch (err) {
        console.error(
          "Invalid WebSocket message:",
          err
        );
      }
    };

    ws.onerror = () => {
      if (cancelled) return;

      setError(
        "Could not reach the game server."
      );
    };

    ws.onclose = () => {
      if (cancelled) return;

      /*
       * Ignore close events from an old socket.
       */
      if (wsRef.current !== ws) {
        return;
      }

      wsRef.current = null;

      clearTimers();

      if (!overRef.current) {
        setError(
          (previous) =>
            previous ||
            "Disconnected from the server."
        );
      }
    };

    return () => {
      cancelled = true;

      clearTimers();

      /*
       * Don't allow an old connection to remain
       * referenced.
       */
      if (wsRef.current === ws) {
        wsRef.current = null;
      }

      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState ===
          WebSocket.CONNECTING
      ) {
        ws.close();
      }
    };

    // handleMessage/send are stable enough for
    // this connection lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, clearTimers]);

  /*
   * Countdown timer.
   *
   * The frontend only displays the timer.
   * The backend remains responsible for
   * actually ending the game.
   */
  useEffect(() => {
    if (
      status !== "playing" ||
      finished
    ) {
      return;
    }

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil(
          (endsAtRef.current -
            Date.now()) /
            1000
        )
      );

      setTimeLeft(remaining);
    };

    tick();

    const interval =
      setInterval(tick, 250);

    return () => {
      clearInterval(interval);
    };
  }, [status, finished]);

  /*
   * Automatically focus the answer input.
   */
  useEffect(() => {
    if (
      status === "playing" &&
      !locked &&
      !waiting &&
      timeLeft > 0 &&
      !finished
    ) {
      inputRef.current?.focus();
    }
  }, [
    status,
    question,
    locked,
    waiting,
    timeLeft,
    finished,
  ]);

  /*
   * Submit an answer to the server.
   */
  const submit = useCallback(
    (raw: string) => {
      const value = raw.trim();

      const q = questionRef.current;

      const ws = wsRef.current;

      const currentGameId =
        gameIdRef.current;

      /*
       * Don't submit if:
       * - already locked
       * - game is over
       * - no question
       * - no game ID
       * - empty answer
       */
      if (
        lockedRef.current ||
        overRef.current ||
        !q ||
        !currentGameId ||
        !value
      ) {
        return;
      }

      /*
       * Client-side timer check is only an
       * optimization. Server validates game state.
       */
      if (
        endsAtRef.current > 0 &&
        Date.now() >=
          endsAtRef.current
      ) {
        return;
      }

      if (
        !ws ||
        ws.readyState !== WebSocket.OPEN
      ) {
        return;
      }

      /*
       * Lock immediately to prevent double-submit.
       */
      lockedRef.current = true;

      setLocked(true);

      setError("");

      ws.send(
        JSON.stringify({
          type: "SUBMIT_ANSWER",

          payload: {
            gameId: currentGameId,

            questionId: q.id,

            answer: parseAnswer(value),
          },
        })
      );
    },
    []
  );

  /*
   * Handle typing.
   *
   * If the typed value exactly matches the
   * question's answer, submit automatically.
   */
  const handleChange = useCallback(
    (raw: string) => {
      setAnswer(raw);

      const q = questionRef.current;

      if (
        !q ||
        q.answer === undefined ||
        !raw.trim()
      ) {
        return;
      }

      const typedAnswer =
        parseAnswer(raw.trim());

      const matches =
        JSON.stringify(
          typedAnswer
        ) ===
        JSON.stringify(q.answer);

      if (matches) {
        submit(raw);
      }
    },
    [submit]
  );

  /*
   * Leave the game.
   */
  const leave = useCallback(() => {
    overRef.current = true;

    clearTimers();

    const ws = wsRef.current;

    wsRef.current = null;

    if (
      ws &&
      (ws.readyState ===
        WebSocket.OPEN ||
        ws.readyState ===
          WebSocket.CONNECTING)
    ) {
      ws.close();
    }

    router.push("/");
  }, [clearTimers, router]);

  const q = question;

  const text = q
    ? q.question ??
      q.text ??
      q.prompt ??
      q.title ??
      ""
    : "";

  const extra = q
    ? q.grid ??
      q.board ??
      q.data ??
      null
    : null;

  const low = timeLeft <= 10;

  const progress =
    totalRef.current > 0
      ? (timeLeft /
          totalRef.current) *
        100
      : 0;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07090f] text-white">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-180px] top-[-180px] h-[450px] w-[450px] rounded-full bg-amber-400/10 blur-[120px]" />

        <div className="absolute bottom-[-180px] right-[-100px] h-[450px] w-[450px] rounded-full bg-orange-500/10 blur-[120px]" />

        <div
          className={`absolute left-1/2 top-1/2 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px] ${
            low
              ? "bg-red-500/10"
              : "bg-amber-400/5"
          }`}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-5 sm:px-6 sm:py-8">
        {/* Header */}
        <header className="mb-6 flex items-center justify-end">

          <button
            onClick={leave}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 backdrop-blur transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            Leave
          </button>
        </header>

        {/* Connecting */}
        {status === "connecting" && (
          <section className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-6 h-14 w-14 animate-spin rounded-full border-4 border-white/10 border-t-amber-400" />

              <h2 className="text-2xl font-black">
                Connecting...
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Getting the game ready
              </p>
            </div>
          </section>
        )}

        {/* Searching */}
        {status === "searching" && (
          <section className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-md text-center">
              <div className="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/10" />

                <div className="absolute inset-3 " />

                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-4xl shadow-2xl shadow-amber-500/20">
                  ⚔️
                </div>
              </div>

              <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
                Matchmaking
              </p>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Looking for an opponent
              </h1>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
                Finding someone ready to test
                their speed against you.
              </p>

              <div className="mx-auto mt-8 h-1.5 max-w-xs overflow-hidden rounded-full bg-white/5">
                <div className="h-full w-1/2 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-amber-400 to-orange-500" />
              </div>

              <p className="mt-5 text-xs text-slate-600">
                Game ID:{" "}
                <span className="font-mono text-slate-500">
                  {routeGameId === "new"
                    ? gameIdRef.current ??
                      "assigning..."
                    : routeGameId}
                </span>
              </p>
            </div>
          </section>
        )}

        {/* Playing */}
        {status === "playing" &&
          q && (
            <section className="flex flex-1 flex-col">
              {/* Game HUD */}
              <div className="mb-5 grid grid-cols-2 gap-3">
                {/* Score */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Your score
                  </p>

                  <p className="mt-1 text-3xl font-black tabular-nums">
                    {score}
                  </p>
                </div>

                {/* Timer */}
                <div
                  className={`rounded-2xl border p-4 text-right backdrop-blur ${
                    low
                      ? "border-red-500/30 bg-red-500/10"
                      : "border-white/10 bg-white/[0.04]"
                  }`}
                >
                  <p
                    className={`text-xs font-bold uppercase tracking-widest ${
                      low
                        ? "text-red-400"
                        : "text-slate-500"
                    }`}
                  >
                    Time
                  </p>

                  <p
                    className={`mt-1 text-3xl font-black tabular-nums ${
                      low
                        ? "text-red-400"
                        : "text-white"
                    }`}
                  >
                    {clock(timeLeft)}
                  </p>
                </div>
              </div>

              {/* Timer bar */}
              <div className="mb-6 h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full transition-all duration-300 ease-linear ${
                    low
                      ? "bg-red-500"
                      : "bg-gradient-to-r from-amber-400 to-orange-500"
                  }`}
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              {/* Question card */}
              <div className="flex flex-1 flex-col rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-xl sm:p-8">
                {/* Question number */}
                <div className="mb-8 flex items-center justify-between">
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Question {count}
                  </div>

                  <div className="text-xs font-medium text-slate-600">
                    Math Duel
                  </div>
                </div>

                {/* Question */}
                <div className="flex flex-1 flex-col justify-center text-center">
                  <p className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-amber-400">
                    Solve it
                  </p>

                  <div className="mx-auto max-w-xl whitespace-pre-wrap break-words text-4xl font-black leading-tight tracking-tight sm:text-6xl">
                    {fmt(text)}
                  </div>

                  {extra != null && (
                    <pre className="mx-auto mt-6 max-w-full overflow-x-auto rounded-2xl border border-white/10 bg-black/20 p-4 text-left text-sm text-slate-400">
                      {JSON.stringify(
                        extra,
                        null,
                        2
                      )}
                    </pre>
                  )}
                </div>

                {/* Answer area */}
                <div className="mt-8">
                  {waiting ? (
                    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 px-5 py-6 text-center">
                      <div className="mb-2 text-2xl">
                        ⏳
                      </div>

                      <p className="font-bold text-amber-300">
                        Waiting for your opponent
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        You answered everything.
                      </p>
                    </div>
                  ) : timeLeft === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-6 text-center">
                      <div className="mb-2 text-2xl">
                        ⏱️
                      </div>

                      <p className="font-bold">
                        Time&apos;s up!
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Getting your final result...
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        ref={inputRef}
                        autoComplete="off"
                        inputMode="numeric"
                        className={`w-full rounded-2xl border bg-black/20 px-5 py-5 text-center text-2xl font-bold text-white outline-none transition placeholder:text-slate-700 ${
                          locked
                            ? "border-white/5 opacity-50"
                            : "border-white/10 focus:border-amber-400/60 focus:ring-4 focus:ring-amber-400/10"
                        }`}
                        value={answer}
                        disabled={locked}
                        placeholder="Type your answer..."
                        onChange={(event) =>
                          handleChange(
                            event.target.value
                          )
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key ===
                            "Enter"
                          ) {
                            submit(answer);
                          }
                        }}
                      />

                      {!locked && (
                        <div className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-600 sm:block">
                          Enter
                        </div>
                      )}
                    </div>
                  )}

                  {/* Answer feedback */}
                  {result && (
                    <div
                      className={`mt-4 rounded-2xl border px-5 py-4 text-center ${
                        result.correct
                          ? "border-emerald-400/20 bg-emerald-400/10"
                          : "border-red-400/20 bg-red-400/10"
                      }`}
                    >
                      <p
                        className={`font-black ${
                          result.correct
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {result.correct
                          ? "✓ Correct!"
                          : "✕ Wrong answer"}
                      </p>

                      {!result.correct && (
                        <p className="mt-1 text-sm text-slate-400">
                          Correct answer:{" "}
                          <span className="font-bold text-white">
                            {fmt(
                              result.correctAnswer
                            )}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

        {/* Error */}
        <div
          role="alert"
          className="min-h-6 pt-3 text-center text-sm text-red-400"
        >
          {error}
        </div>
      </div>

      {/* Result modal */}
      {finished && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Game result"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-[#10131c] p-8 text-center shadow-2xl sm:p-10">
            {/* Glow */}
            <div
              className={`pointer-events-none absolute left-1/2 top-[-100px] h-64 w-64 -translate-x-1/2 rounded-full blur-[100px] ${
                outcome[
                  finished.result
                ].glow
              }`}
            />

            <div className="relative">
              {/* Icon */}
              <div className="mb-5 text-6xl">
                {
                  outcome[
                    finished.result
                  ].icon
                }
              </div>

              <p
                className={`text-4xl font-black tracking-tight ${
                  outcome[
                    finished.result
                  ].color
                }`}
              >
                {
                  outcome[
                    finished.result
                  ].title
                }
              </p>

              <p className="mt-2 text-sm text-slate-500">
                {
                  outcome[
                    finished.result
                  ].subtitle
                }
              </p>

              {finished.opponent ===
                null && (
                <p className="mt-4 rounded-xl bg-white/5 px-4 py-3 text-sm text-slate-400">
                  Your opponent left the
                  game.
                </p>
              )}

              {/* Scores */}
              <div className="my-8 flex items-center justify-center gap-5">
                {/* You */}
                <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 font-black text-black">
                    YOU
                  </div>

                  <div className="mt-3 text-5xl font-black tabular-nums">
                    {finished.score}
                  </div>

                  <div className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Your score
                  </div>
                </div>

                <div className="font-black text-slate-700">
                  VS
                </div>

                {/* Opponent */}
                {finished.opponent && (
                  <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-500 font-black text-white">
                      {finished.opponent.name
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>

                    <div className="mt-3 text-5xl font-black tabular-nums">
                      {
                        finished
                          .opponent
                          .score
                      }
                    </div>

                    <div className="mt-1 max-w-full truncate text-xs font-bold uppercase tracking-wider text-slate-500">
                      {finished.opponent
                        .name ||
                        "Opponent"}
                    </div>
                  </div>
                )}
              </div>

              {/* Button */}
              <button
                className="w-full rounded-2xl bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-4 font-black text-black shadow-xl shadow-amber-500/10 transition hover:-translate-y-0.5 hover:shadow-amber-500/20"
                onClick={leave}
              >
                Back to lobby →
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}