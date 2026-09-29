"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type OnlineUser = { id: string; name: string };

const WS_URL = process.env.NEXT_PUBLIC_MEMORY_WS_URL ?? "ws://localhost:8081";

/* Phases where the board (scoreboard + grid) is on screen.
   INTRO is included on purpose so the board never unmounts between questions. */
const BOARD_PHASES: GamePhase[] = ["INTRO", "SHOWING", "PLAYING", "SUBMITTING"];

const btn =
  "rounded-xl bg-amber-400 px-5 py-3 font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-50";
const btnGhost =
  "rounded-xl border border-white/20 px-5 py-3 font-semibold hover:bg-white/10";

/* Updates the URL bar without going through Next's router. router.replace /
   router.push navigate the [gameId] route, which remounts this page (a new
   dynamic-segment value is a different route match), which would tear the
   socket down and reconnect it. history.replaceState only touches the
   address bar. */
const setUrlSilently = (path: string) => {
  if (typeof window !== "undefined") window.history.replaceState(null, "", path);
};

/* ------------------------------------------------------------------ */
/* Small memoised components: they only re-render when their props    */
/* change, so a timer tick doesn't repaint the whole grid.             */
/* ------------------------------------------------------------------ */

const Cell = memo(function Cell({
  index,
  flipped,
  backClass,
  delay,
  clickable,
  instant,
  showingPattern,
  onClick,
}: {
  index: number;
  flipped: boolean;
  backClass: string;
  delay: number;
  clickable: boolean;

  // During the remember phase, show the green cell directly.
  instant: boolean;

  // True while showing the pattern to remember.
  showingPattern: boolean;

  onClick: (index: number) => void;
}) {
  const face: React.CSSProperties = {
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
  };

  return (
    <div className="w-20 aspect-square" style={{ perspective: 600 }}>
      <button
        onClick={() => onClick(index)}
        disabled={!clickable}
        className={`relative h-full w-full ${
          clickable ? "cursor-pointer" : "cursor-default"
        }`}
        style={{
          transformStyle: "preserve-3d",

          // No animation while showing the pattern.
          transition: instant ? "none" : "transform 500ms ease-in-out",

          transitionDelay: instant ? "0ms" : `${delay}ms`,

          // IMPORTANT:
          // During SHOWING, directly show the green side.
          // During PLAYING, use flipped state.
          transform: showingPattern
            ? "rotateY(180deg)"
            : flipped
              ? "rotateY(180deg)"
              : "rotateY(0deg)",
        }}
      >
        {/* Front: hidden/white state */}
        <span
          className="absolute inset-0 rounded-xl bg-white"
          style={face}
        />

        {/* Back: revealed colour */}
        <span
          className={`absolute inset-0 rounded-xl ${backClass}`}
          style={{
            ...face,
            transform: "rotateY(180deg)",
          }}
        />
      </button>
    </div>
  );
});

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
  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold uppercase ${
          me ? "bg-white text-black" : "bg-black/30"
        }`}
      >
        {name ? name.slice(0, 2) : "??"}
      </div>
      <p className="mt-1 max-w-24 truncate text-xs text-zinc-200">{name || fallback}</p>
      <p className="text-2xl font-black">{score}</p>
    </div>
  );
});

export default function MemoryGamePage() {
  const router = useRouter();
  const { gameId: routeGameId } = useParams<{ gameId: string }>();

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameIdRef = useRef<string>("");
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

  const flatPattern = useMemo(() => (question ? question.pattern.flat() : []), [question]);
  const columns = question?.pattern[0]?.length ?? 4;

  /* ------------------------------------------------------------------ */
  /* Timers                                                              */
  /* ------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------ */
  /* WebSocket                                                           */
  /* ------------------------------------------------------------------ */

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

    const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    const send = (type: string, payload: unknown = {}) => {
      if (cancelled) return;

      if (ws.readyState === WebSocket.OPEN) {
        console.log("📤 Sending:", type);
        ws.send(JSON.stringify({ type, payload }));
      } else {
        console.warn("⚠️ Cannot send. Socket state:", ws.readyState);
      }
    };

    ws.onopen = () => {
      if (cancelled) return;
      console.log("🟢 WebSocket OPEN");
      setPhase("MATCHING");
      setMessage("Finding a game...");
      // JOIN is sent once ONLINE_USER arrives, see onmessage below.
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

      if (wsRef.current === ws) wsRef.current = null;

      setPhase((p) => (p === "COMPLETED" ? p : "CONNECTING"));
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

      console.log("📩 Received:", data.type, data.payload);

      switch (data.type) {
        case "ONLINE_USER": {
          setOnlineUsers(data.payload.users);

          /* Server sends ONLINE_USER first, right after auth. Wait for it
             before sending JOIN so we know the connection is fully live. */
          if (!joinSentRef.current) {
            joinSentRef.current = true;
            console.log("📤 Sending JOIN after ONLINE_USER");
            send("JOIN", {});
          }
          break;
        }

        case "ERROR": {
          if (!triedCreateRef.current && /no open game/i.test(data.payload?.message ?? "")) {
            triedCreateRef.current = true;
            console.log("🎮 No open game → creating game");
            send("CREATE");
            return;
          }

          setMessage(data.payload?.message ?? "Something went wrong.");
          break;
        }

        case "GAME_CREATED": {
          gameIdRef.current = data.payload.gameId;
          console.log("🎮 Game created:", data.payload.gameId);

          /* Reflect the id in the URL without navigating — router.replace
             would remount this page (dynamic segment changed), tearing the
             socket down and reconnecting it, which retriggers JOIN against
             the game we just made and starts the whole thing over. */
          setUrlSilently(`/play/memory/${data.payload.gameId}`);

          setPhase("WAITING");
          setMessage("Waiting for another player...");
          break;
        }

        case "QUESTION": {
          const [questionId, pattern] = data.payload.question;
          const { member, endTime, runningGameId } = data.payload;

          const me = member.find((m: any) => m.id === storedUser?.id);
          const other = member.find((m: any) => m.id !== storedUser?.id);

          setUser1(me?.name ?? "");
          setUser2(other?.name ?? "");
          gameIdRef.current = runningGameId;

          /* Safe to call again here: it's the same silent URL update, not
             a router navigation, so it never remounts the page. This is
             what actually gives the joiner (who never saw GAME_CREATED)
             the real id in their address bar. */
          setUrlSilently(`/play/memory/${runningGameId}`);

          clearCountdown();
          countdownRef.current = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            setTimer(remaining);

            if (remaining <= 0) {
              clearCountdown();
              setEnd(true);
              setPhase("COMPLETED");
            }
          }, 250);

          setQuestion({ id: questionId, pattern });
          setQuestionNumber(1);
          startShowingPattern(pattern);
          break;
        }

        case "NEXT_QUESTION": {
          const pattern = data.payload.question;

          setQuestion({ id: data.payload.questionId, pattern });
          setCells(Array(pattern.flat().length).fill("normal"));
          setQuestionNumber((n) => n + 1);
          startQuestionIntro(pattern);
          break;
        }

        case "SCORE_UPDATE": {
          const { myScore, opponent } = data.payload;
          setScore1(myScore.score);
          setScore2(opponent?.score ?? 0);
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
          if (data.payload?.correct === false) {
            setPhase("PLAYING");
            setMessage("Some boxes were incorrect. Try again.");
          }
          break;
        }
      }
    };

    return () => {
      console.log("🧹 Cleaning WebSocket effect");
      cancelled = true;

      clearGameTimer();
      clearCountdown();

      if (wsRef.current === ws) {
        wsRef.current = null;
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          console.log("🔌 Closing current socket");
          ws.close();
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------------ */
  /* Actions                                                             */
  /* ------------------------------------------------------------------ */

  const submitAnswer = useCallback((selected: CellState[]) => {
    const ws = wsRef.current;
    const q = question;
    if (!ws || !q || !gameIdRef.current) return;

    const flat = selected.map((c) => (c === "correct" ? "on" : "off"));
    const cols = q.pattern[0].length;
    const answer: string[][] = [];

    for (let i = 0; i < flat.length; i += cols) {
      answer.push(flat.slice(i, i + cols));
    }

    ws.send(
      JSON.stringify({
        type: "SUBMIT",
        payload: { questionId: q.id, gameId: gameIdRef.current, answer },
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question]);

  const handleCellClick = useCallback(
    (index: number) => {
      if (phase !== "PLAYING" || !question) return;
      if (cells[index] !== "normal") return;

      const updated = [...cells];

      if (flatPattern[index] === "on") {
        updated[index] = "correct";
        setCells(updated);

        const totalOn = flatPattern.filter((v) => v === "on").length;
        const selectedCorrect = updated.filter((v) => v === "correct").length;

        if (selectedCorrect === totalOn) {
          setPhase("SUBMITTING");
          setMessage("Perfect! Checking answer...");
          submitAnswer(updated);
        }
        return;
      }

      updated[index] = "wrong";
      setCells(updated);
      setMessage("Wrong box!");

      setTimeout(() => {
        setCells((current) => {
          if (current[index] !== "wrong") return current;
          const next = [...current];
          next[index] = "normal";
          return next;
        });
        setMessage("Select the boxes you remember");
      }, 600);
    },
    [phase, question, cells, flatPattern, submitAnswer],
  );

  const leave = () => {
    wsRef.current?.close();
    router.push("/");
  };

  /* ------------------------------------------------------------------ */
  /* Derived values                                                      */
  /* ------------------------------------------------------------------ */

  const flipped = useMemo(
    () => cells.map((state, i) => state !== "normal"),
    [cells, reveal, flatPattern],
  );

  const backClasses = useMemo(
    () => cells.map((state) => (state === "wrong" ? "bg-red-500" : "bg-green-500")),
    [cells],
  );

  const result = score1 > score2 ? "WINNER" : score1 < score2 ? "LOST" : "DRAW";

  const showBoard = BOARD_PHASES.includes(phase);
  const isIntro = phase === "INTRO";
  const isBusy = phase === "CONNECTING" || phase === "MATCHING" || phase === "WAITING";

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <main className="min-h-screen text-white flex flex-col items-center px-4 bg-blue-700">
      {!end ? (
        <div className="w-full max-w-lg mt-10">
          <div className="mb-2 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Memory Grid</h1>
            <button className={btnGhost} onClick={leave}>
              Leave
            </button>
          </div>

          {onlineUsers.length > 0 && (
            <p className="mb-4 text-xs text-white/50">{onlineUsers.length} players online</p>
          )}

          {showBoard && (
            <div className="text-center text-2xl font-bold flex items-end justify-center m-4">
              Time left: {timer}
            </div>
          )}

          {isBusy && (
            <div className="text-center">
              <h2 className="text-3xl font-bold">
                {phase === "WAITING" ? "Waiting for player" : "Connecting"}
              </h2>

              <div className="flex justify-center gap-2 mt-8">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="w-3 h-3 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>

              <p className="text-gray-200 mt-6">{message}</p>
              {phase === "WAITING" && (
                <p className="mt-2 text-xs text-white/40">Game ID: {gameIdRef.current || routeGameId}</p>
              )}
            </div>
          )}

          {showBoard && (
            <>
              <div className="mb-8 flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 p-4">
                <Player name={user1} fallback="You" score={score1} me />
                <div className="text-xs font-bold text-white/40">VS</div>
                <Player name={user2} fallback="Opponent" score={score2} />
              </div>

              <div className="flex justify-between items-center mb-8">
                <div>
                  <p className="text-white/50 text-sm">QUESTION</p>
                  <p className="text-2xl font-bold">{questionNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-sm">SCORE</p>
                  <p className="text-2xl font-bold">{score1}</p>
                </div>
              </div>

              <div className="text-center mb-8 h-6">
                <p className="text-white/70">{isIntro ? "Get ready" : message}</p>
              </div>

              <div className="relative mb-10">
                <div
                  className={`grid gap-1 w-fit mx-auto ${isIntro ? "invisible" : ""}`}
                  style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                >
                  {cells.map((_, index) => (
                   <Cell
                    key={index}
                    index={index}
                    flipped={flipped[index]}
                    backClass={backClasses[index]}
                    delay={reveal ? index * 30 : 0}
                    clickable={phase === "PLAYING"}
                    instant={reveal}
                    showingPattern={phase === "SHOWING" && reveal}
                    onClick={handleCellClick}
/>
                  ))}
                </div>

                {isIntro && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <h1 className="text-6xl font-bold">Question {questionNumber}</h1>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-8 shadow-2xl">
            <h1 className="text-center text-5xl font-black">{result}</h1>

            <div className="mt-10 flex items-center">
              <div className="flex flex-1 flex-col items-start">
                <p className="text-5xl font-black">{score1}</p>
                <p className="mt-2 text-lg text-zinc-400">{user1 || "You"}</p>
              </div>

              <div className="mx-6 h-20 w-px bg-white/20" />

              <div className="flex flex-1 flex-col items-end">
                <p className="text-5xl font-black">{score2}</p>
                <p className="mt-2 text-lg text-zinc-400">{user2 || "Opponent"}</p>
              </div>
            </div>

            <p className="mt-8 text-center text-sm text-zinc-500">Final score</p>
            <div className="mt-6 flex justify-center">
              <button className={btn} onClick={leave}>
                Back to lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}