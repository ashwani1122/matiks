"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Question = {
  id: string | number;
  answer?: unknown;
  [key: string]: unknown;
};

type ResultInfo = { correct: boolean; correctAnswer: unknown };

type Finished = {
  result: "WIN" | "LOSE" | "DRAW";
  score: number;
  opponent: { name: string; score: number } | null;
};

const WS_URL = process.env.NEXT_PUBLIC_MATH_WS_URL ?? "ws://localhost:8080";
const DEFAULT_DURATION_MS = 60_000;
const FEEDBACK_MS = 1200;

const fmt = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const parseAnswer = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

/* Updates the URL bar without going through Next's router. router.replace /
   router.push navigate the [gameId] route, which remounts this page (a new
   dynamic-segment value is a different route match), which tears the
   socket down, reconnects, and re-sends PLAY_GAME — which the backend then
   rejects with "You are already participating in a game." because the
   reconnected user is already in the game they just matched into.
   history.replaceState only touches the address bar, no remount. */
const setUrlSilently = (path: string) => {
  if (typeof window !== "undefined") window.history.replaceState(null, "", path);
};

const card =
  "mb-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800";
const input =
  "w-full rounded-xl border border-slate-300 bg-transparent p-3 outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 dark:border-slate-600";
const btn =
  "rounded-xl bg-amber-400 px-5 py-3 font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-50";
const btnGhost =
  "rounded-xl border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700";

const outcome = {
  WIN: { title: "You win!", tone: "text-emerald-500" },
  LOSE: { title: "You lose", tone: "text-red-500" },
  DRAW: { title: "It's a draw", tone: "text-amber-500" },
} as const;

export default function MathGamePage() {
  const router = useRouter();
  const { gameId } = useParams<{ gameId: string }>();

  const [status, setStatus] = useState<"connecting" | "searching" | "playing">("connecting");
  const [error, setError] = useState("");

  const [question, setQuestion] = useState<Question | null>(null);
  const [count, setCount] = useState(0);
  const [score, setScore] = useState(0);
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState<ResultInfo | null>(null);
  const [answer, setAnswer] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [finished, setFinished] = useState<Finished | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const gameIdRef = useRef<string | null>(null);
  const questionRef = useRef<Question | null>(null);
  const lockedRef = useRef(false);
  const pendingRef = useRef<Question | null>(null);
  const overRef = useRef(false);
  const endsAtRef = useRef(0);
  const totalRef = useRef(DEFAULT_DURATION_MS / 1000);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const playSentRef = useRef(false);

  const later = (fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const showQuestion = useCallback((q: Question) => {
    questionRef.current = q;
    pendingRef.current = null;
    lockedRef.current = false;
    setQuestion(q);
    setLocked(false);
    setResult(null);
    setAnswer("");
    setCount((c) => c + 1);
  }, []);

  /* Connect once on mount. No token → back to the login page. */
  useEffect(() => {
    let cancelled = false;

    let token = "";
    try {
      token = localStorage.getItem("token") ?? "";
    } catch {}
    if (!token) {
      router.replace("/");
      return;
    }

    const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;
    playSentRef.current = false;

    const send = (type: string, payload: unknown = {}) => {
      if (cancelled) return;
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, payload }));
    };

    ws.onopen = () => {
      if (cancelled) return;
      setStatus("searching");
      // PLAY_GAME is sent once ONLINE_USER arrives, see onmessage below —
      // sending it immediately here can race the backend attaching its
      // message listener, since it broadcasts ONLINE_USER before that.
    };

    ws.onmessage = (e) => {
      if (cancelled) return;
      try {
        const m = JSON.parse(e.data);
        handleMessage(m.type, m.payload ?? {}, send);
      } catch (err) {
        console.error(err);
      }
    };

    ws.onerror = () => {
      if (cancelled) return;
      setError("Could not reach the game server.");
    };

    ws.onclose = () => {
      if (cancelled) return;
      if (wsRef.current !== ws) return;
      wsRef.current = null;
      clearTimers();
      setError((prev) => prev || "Disconnected from the server.");
    };

    return () => {
      cancelled = true;
      clearTimers();
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Countdown derived from a local deadline, so clock skew doesn't matter */
  useEffect(() => {
    if (status !== "playing" || finished) return;
    const tick = () =>
      setTimeLeft(Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [status, finished]);

  const timeUp = timeLeft === 0;

  useEffect(() => {
    if (status === "playing" && !locked && !waiting && !timeUp && !finished) {
      inputRef.current?.focus();
    }
  }, [status, question, locked, waiting, timeUp, finished]);

  const handleMessage = useCallback(
    (type: string, p: any, send: (type: string, payload?: unknown) => void) => {
      switch (type) {
        case "ONLINE_USER":
          /* Wait for the server's first message before sending PLAY_GAME,
             so we know its message listener is definitely attached. */
          if (!playSentRef.current) {
            playSentRef.current = true;
            send("PLAY_GAME");
          }
          break;

        case "SEARCHING_FOR_PLAYER":
          gameIdRef.current = p.gameId;
          if (p.gameId) setUrlSilently(`/play/math/${p.gameId}`);
          break;

        case "GAME_ACCEPTED": {
          const ms = p.durationMs ?? DEFAULT_DURATION_MS;
          gameIdRef.current = p.gameId;
          overRef.current = false;
          totalRef.current = Math.round(ms / 1000);
          endsAtRef.current = Date.now() + ms;
          setTimeLeft(totalRef.current);
          setFinished(null);
          setWaiting(false);
          setScore(0);
          setCount(0);
          if (p.gameId) setUrlSilently(`/play/math/${p.gameId}`);
          showQuestion(p.firstQuestion);
          setStatus("playing");
          break;
        }

        case "QUESTION":
          if (lockedRef.current) pendingRef.current = p.question;
          else showQuestion(p.question);
          break;

        case "ANSWER_RESULT":
          setResult({ correct: p.correct, correctAnswer: p.correctAnswer });
          if (p.correct) setScore((s) => s + 1);
          later(() => {
            if (pendingRef.current) showQuestion(pendingRef.current);
          }, FEEDBACK_MS);
          break;

        case "WAITING_FOR_OPPONENT":
          setWaiting(true);
          break;

        case "GAME_FINISHED":
          overRef.current = true;
          later(
            () => {
              setFinished({
                result: p.result ?? "DRAW",
                score: p.score ?? 0,
                opponent: p.opponent ?? null,
              });
            },
            lockedRef.current ? FEEDBACK_MS : 0,
          );
          break;

        case "ERROR":
          if (overRef.current) break;
          setError(p.message ?? "Something went wrong.");
          lockedRef.current = false;
          setLocked(false);
          break;
      }
    },
    [showQuestion],
  );

  const submit = (raw: string) => {
    const value = raw.trim();
    const q = questionRef.current;
    const ws = wsRef.current;
    if (lockedRef.current || overRef.current || !q || !gameIdRef.current || !value) return;
    if (Date.now() >= endsAtRef.current) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    lockedRef.current = true;
    setLocked(true);
    setError("");
    ws.send(
      JSON.stringify({
        type: "SUBMIT_ANSWER",
        payload: {
          gameId: gameIdRef.current,
          questionId: q.id,
          answer: parseAnswer(value),
        },
      }),
    );
  };

  /* Auto-submit as soon as the typed text matches the question's answer */
  const handleChange = (raw: string) => {
    setAnswer(raw);
    const q = questionRef.current;
    if (!q || q.answer === undefined || !raw.trim()) return;
    if (JSON.stringify(parseAnswer(raw.trim())) === JSON.stringify(q.answer)) {
      submit(raw);
    }
  };

  const leave = () => {
    wsRef.current?.close();
    router.push("/");
  };

  const q = question;
  const text = q ? (q.question ?? q.text ?? q.prompt ?? q.title ?? "") : "";
  const extra = q ? (q.grid ?? q.board ?? q.data ?? null) : null;
  const low = timeLeft <= 10;

  return (
    <main className="flex min-h-screen justify-center bg-slate-100 px-4 py-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="w-full max-w-xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight">Math Duel</h1>
          <button className={btnGhost} onClick={leave}>
            Leave
          </button>
        </div>

        {status === "connecting" && (
          <section className={card}>
            <h2 className="animate-pulse text-xl font-semibold">Connecting…</h2>
          </section>
        )}

        {status === "searching" && (
          <section className={card}>
            <h2 className="mb-2 animate-pulse text-xl font-semibold">Looking for an opponent…</h2>
            <p className="text-slate-500">Game ID: {gameId === "new" ? "assigning…" : gameId}</p>
          </section>
        )}

        {status === "playing" && q && (
          <section className={card}>
            <div className="mb-2 flex items-center justify-between">
              <span>
                Score: <strong>{score}</strong>
              </span>
              <span className={`text-3xl font-extrabold tabular-nums ${low ? "text-red-500" : ""}`}>
                {clock(timeLeft)}
              </span>
            </div>
            <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={`h-full transition-all duration-300 ease-linear ${low ? "bg-red-500" : "bg-amber-400"}`}
                style={{ width: `${(timeLeft / totalRef.current) * 100}%` }}
              />
            </div>

            <div className="text-sm text-slate-500">Question {count}</div>
            <div className="my-2 whitespace-pre-wrap text-xl font-semibold leading-snug">{fmt(text)}</div>
            {extra != null && (
              <pre className="mb-4 overflow-x-auto rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-900">
                {JSON.stringify(extra)}
              </pre>
            )}

            {waiting ? (
              <p className="mt-4 animate-pulse text-slate-500">
                You answered everything. Waiting for your opponent…
              </p>
            ) : timeUp ? (
              <p className="mt-4 animate-pulse text-slate-500">Time&apos;s up. Getting the result…</p>
            ) : (
              <input
                ref={inputRef}
                className={`${input} mt-3`}
                value={answer}
                disabled={locked}
                placeholder="Type your answer"
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit(answer)}
              />
            )}

            {result && (
              <div
                className={`mt-4 rounded-xl px-4 py-2 font-semibold text-white ${
                  result.correct ? "bg-emerald-600" : "bg-red-600"
                }`}
              >
                {result.correct ? "Correct" : `Wrong. Correct answer: ${fmt(result.correctAnswer)}`}
              </div>
            )}
          </section>
        )}

        <div role="alert" className="mt-2 min-h-5 text-sm text-red-600">
          {error}
        </div>
      </div>

      {finished && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Game result"
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl dark:bg-slate-800">
            <h2 className={`text-4xl font-extrabold tracking-tight ${outcome[finished.result].tone}`}>
              {outcome[finished.result].title}
            </h2>
            {finished.opponent === null && (
              <p className="mt-1 text-sm text-slate-500">Your opponent left the game.</p>
            )}

            <div className="my-6 flex items-center justify-center gap-6">
              <div>
                <div className="text-5xl font-extrabold tabular-nums">{finished.score}</div>
                <div className="text-sm text-slate-500">You</div>
              </div>
              {finished.opponent && (
                <>
                  <div className="text-slate-400">vs</div>
                  <div>
                    <div className="text-5xl font-extrabold tabular-nums">{finished.opponent.score}</div>
                    <div className="max-w-[8rem] truncate text-sm text-slate-500">
                      {finished.opponent.name || "Opponent"}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button className={btn} onClick={leave}>
              Back to lobby
            </button>
          </div>
        </div>
      )}
    </main>
  );
}