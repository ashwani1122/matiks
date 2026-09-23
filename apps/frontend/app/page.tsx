"use client";

// import { Button } from "@repo/ui/button";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation"
type Question = {
  id: string | number;
  question: string;
  options: string[];
  answer: string;
};

type GameStatus =
  | "IDLE"
  | "SEARCHING"
  | "PLAYING"
  | "FINISHED"
  | "ERROR";

type AnswerState = "idle" | "correct" | "wrong";

type WsMessage = {
  type: string;
  payload?: any;
};

type Player = {
  id: string;
  name: string;
};


/*
|--------------------------------------------------------------------------
| Main Page
|--------------------------------------------------------------------------
*/

export default function Home() {
  const wsRef = useRef<WebSocket | null>(null);

  const [connected, setConnected] = useState(false);
  const router = useRouter()
  const [status, setStatus] = useState<GameStatus>("IDLE");

  const [error, setError] =
    useState<string | null>(null);

  const [onlineUsers, setOnlineUsers] =
    useState<Player[]>([]);

  const [gameId, setGameId] =
    useState<string | null>(null);

  const [question, setQuestion] =
    useState<Question | null>(null);

  const [selectedAnswer, setSelectedAnswer] =
    useState<string | null>(null);

  const [answerState, setAnswerState] =
    useState<AnswerState>("idle");

  const [score, setScore] =
    useState(0);

  const [totalQuestions, setTotalQuestions] =
    useState(0);

  const [answeredCount, setAnsweredCount] =
    useState(0);

  const [correctAnswer, setCorrectAnswer] =
    useState<string | null>(null);


  /*
  |--------------------------------------------------------------------------
  | WebSocket connection
  |--------------------------------------------------------------------------
  */

useEffect(() => {
  let cancelled = false;
  let ws: WebSocket | null = null;

  const connect = () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please login before playing.");
      return;
    }

    const url = `ws://localhost:8080/?token=${encodeURIComponent(token)}`;

    console.log("🔌 Creating WebSocket:", url.replace(token, "***"));

    ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (cancelled) {
        alert("canceld the ws close")
        ws?.close();
        return;
      }

      console.log("✅ WebSocket connected");
      alert("true")
      setConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      if (cancelled) return;

      try {
        const data = JSON.parse(event.data);

        console.log("📩 WebSocket message:", data);

        switch (data.type) {
          case "ONLINE_USER":
            setOnlineUsers(data.payload?.users ?? []);
            break;

          case "SEARCHING_FOR_PLAYER":
            setGameId(data.payload?.gameId ?? null);
            setStatus("SEARCHING");
            break;

          case "GAME_ACCEPTED":
            setGameId(data.payload?.gameId ?? null);
            setQuestion(data.payload?.firstQuestion ?? null);
            setTotalQuestions(data.payload?.totalQuestions ?? 0);
            setAnsweredCount(0);
            setSelectedAnswer(null);
            setAnswerState("idle");
            setStatus("PLAYING");
            break;

          case "QUESTION":
            setQuestion(data.payload?.question ?? null);
            setSelectedAnswer(null);
            setAnswerState("idle");
            setAnsweredCount((prev) => prev + 1);
            break;

          case "ANSWER_RESULT":
            setAnswerState(
              data.payload?.correct ? "correct" : "wrong"
            );

            setCorrectAnswer(
              data.payload?.correctAnswer ?? null
            );

            if (data.payload?.correct) {
              setScore((prev) => prev + 1);
            }

            break;

          case "GAME_FINISHED":
            setStatus("FINISHED");
            break;

          case "ERROR":
            console.error(
              "❌ Server error:",
              data.payload?.message
            );

            setError(
              data.payload?.message ??
                "Something went wrong."
            );
            break;

          default:
            console.log(
              "Unknown WebSocket event:",
              data.type
            );
        }
      } catch (error) {
        console.error(
          "❌ Failed to parse WebSocket message:",
          error
        );
      }
    };

    ws.onerror = (event) => {
      if (cancelled) return;

      console.error("❌ WebSocket error event:", event);

      setConnected(false);
    };

    ws.onclose = (event) => {
      console.log(
        "🔌 WebSocket closed:",
        event.code,
        event.reason
      );

      if (cancelled) return;

      setConnected(false);
    };
  };

  connect();

  return () => {
    cancelled = true;

    console.log("🧹 Cleaning up WebSocket");

    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;

      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
    }

    if (wsRef.current === ws) {
      wsRef.current = null;
    }
  };
}, []);


  /*
  |--------------------------------------------------------------------------
  | Start game
  |--------------------------------------------------------------------------
  */

  const playGame = () => {
    if (!wsRef.current) {
      setError(
        "WebSocket is not initialized."
      );

      return;
    }


    if (
      wsRef.current.readyState !==
      WebSocket.OPEN
    ) {
      setError(
        "Game server is not connected."
      );

      return;
    }


    setError(null);

    setStatus("SEARCHING");


    wsRef.current.send(
      JSON.stringify({
        type: "PLAY_GAME",

        payload: {},
      })
    );
  };


  /*
  |--------------------------------------------------------------------------
  | Submit answer
  |--------------------------------------------------------------------------
  */

  const submitAnswer = (
    answer: string
  ) => {
    if (!question) return;

    if (!gameId) return;

    /*
     * Prevent double-clicking.
     */
    if (
      selectedAnswer !== null
    ) {
      return;
    }


    setSelectedAnswer(answer);


    /*
     * Send answer to server.
     *
     * IMPORTANT:
     * We do NOT calculate correctness
     * here. The server is authoritative.
     */
    if (
      wsRef.current?.readyState !==
      WebSocket.OPEN
    ) {
      setError(
        "Connection to server lost."
      );

      return;
    }


    wsRef.current.send(
      JSON.stringify({
        type: "SUBMIT_ANSWER",

        payload: {
          gameId,

          questionId:
            question.id,

          answer,
        },
      })
    );
  };


  /*
  |--------------------------------------------------------------------------
  | Reset game
  |--------------------------------------------------------------------------
  */

  const resetGame = () => {
    setStatus("IDLE");

    setGameId(null);

    setQuestion(null);

    setSelectedAnswer(null);

    setAnswerState("idle");

    setCorrectAnswer(null);

    setScore(0);

    setAnsweredCount(0);

    setTotalQuestions(0);

    setError(null);
  };


  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <main className="min-h-screen bg-[#050608] text-white">

      <Header
        connected={connected}
        onlineUsers={
          onlineUsers.length
        }
      />


      {error && (
        <ErrorBanner
          message={error}
          onClose={() =>
            setError(null)
          }
        />
      )}


      {status === "IDLE" && (
        <Lobby
          connected={connected}
          onlineUsers={
            onlineUsers.length
          }
          onPlay={playGame}
        />
      )}


      {status === "SEARCHING" && (
        <SearchingScreen
          onCancel={resetGame}
        />
      )}


      {status === "PLAYING" &&
        question && (
          <GameScreen
            question={question}
            score={score}
            answeredCount={
              answeredCount
            }
            totalQuestions={
              totalQuestions
            }
            selectedAnswer={
              selectedAnswer
            }
            answerState={
              answerState
            }
            correctAnswer={
              correctAnswer
            }
            onAnswer={
              submitAnswer
            }
          />
        )}


      {status === "FINISHED" && (
        <FinishedScreen
          score={score}
          answeredCount={
            answeredCount
          }
          onPlayAgain={
            resetGame
          }
        />
      )}
    </main>
  );
}


/*
|--------------------------------------------------------------------------
| Header
|--------------------------------------------------------------------------
*/

function Header({
  connected,
  onlineUsers,
}: {
  connected: boolean;
  onlineUsers: number;
}) {
  return (
    <header className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-white/[0.06] bg-[#050608]/80 px-5 backdrop-blur-xl sm:px-8">

      <div className="flex items-center gap-3">

        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">

          <img
            src="/maatiks.png"
            alt="Maatiks"
            className="h-8 w-8 object-contain"
          />

        </div>


        <div>
          <p className="text-sm font-bold">
            Maatiks
          </p>

          <div className="mt-0.5 flex items-center gap-2">

            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connected
                  ? "bg-emerald-400"
                  : "bg-red-400"
              }`}
            />

            <span className="text-[10px] uppercase tracking-widest text-zinc-600">
              {connected
                ? "Connected"
                : "Offline"}
            </span>

          </div>
        </div>

      </div>


      <div className="flex items-center gap-4">

        <div className="hidden items-center gap-2 sm:flex">

          <span className="h-2 w-2 rounded-full bg-emerald-400" />

          <span className="text-xs text-zinc-500">
            {onlineUsers} online
          </span>

        </div>


        <button className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-zinc-400 transition hover:bg-white/[0.06] hover:text-white">
          Profile
        </button>

      </div>
    </header>
  );
}


/*
|--------------------------------------------------------------------------
| Lobby
|--------------------------------------------------------------------------
*/

function Lobby({
  connected,
  onlineUsers,
  onPlay,
}: {
  connected: boolean;
  onlineUsers: number;
  onPlay: () => void;
}) {
  return (
    <section className="relative min-h-[calc(100vh-80px)] overflow-hidden">

      {/* Background */}
      <div className="pointer-events-none absolute left-1/2 top-[-220px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-blue-600/[0.08] blur-[150px]" />

      <div className="pointer-events-none absolute bottom-[-300px] left-[-150px] h-[500px] w-[500px] rounded-full bg-purple-600/[0.05] blur-[150px]" />


      <div className="relative mx-auto flex min-h-[calc(100vh-80px)] max-w-6xl items-center px-5 py-16 sm:px-8">

        <div className="grid w-full gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">


          {/* Left */}
          <div>

            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2">

              <span
                className={`h-2 w-2 rounded-full ${
                  connected
                    ? "animate-pulse bg-emerald-400"
                    : "bg-red-400"
                }`}
              />

              <span className="text-xs font-medium text-zinc-400">
                {connected
                  ? `${onlineUsers} players online`
                  : "Connecting to server"}
              </span>

            </div>


            <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.055em] sm:text-6xl lg:text-7xl">

              Think fast.

              <br />

              <span className="text-blue-400">
                Play smarter.
              </span>

            </h1>


            <p className="mt-7 max-w-xl text-base leading-7 text-zinc-500 sm:text-lg">
              Enter a real-time 1v1 knowledge battle.
              Find an opponent, answer questions,
              and climb your score one question at a
              time.
            </p>


            <div className="mt-9 flex flex-col gap-3 sm:flex-row">

              <button
                // appName="play-game"
                disabled={!connected}
                onClick={onPlay}
                className="h-14 rounded-2xl bg-blue-500 px-8 text-base font-bold text-white shadow-xl shadow-blue-500/10 transition hover:-translate-y-0.5 hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {connected
                  ? "Find Opponent  →"
                  : "Connecting..."}
              </button>


              <button className="h-14 rounded-2xl border border-white/10 bg-white/[0.03] px-8 text-sm font-semibold text-zinc-400 transition hover:bg-white/[0.06] hover:text-white">
                How it works
              </button>

            </div>


            {/* Stats */}
            <div className="mt-14 grid max-w-xl grid-cols-3 gap-3">

              <Stat
                value={`${onlineUsers}`}
                label="Online"
              />

              <Stat
                value="1v1"
                label="Battle"
              />

              <Stat
                value="∞"
                label="Questions"
              />

            </div>

          </div>


          {/* Right preview */}
          <GamePreview />

        </div>

      </div>
    </section>
  );
}


/*
|--------------------------------------------------------------------------
| Game Preview
|--------------------------------------------------------------------------
*/

function GamePreview() {
  return (
    <div className="relative">

      <div className="absolute inset-0 rounded-[40px] bg-blue-500/[0.08] blur-3xl" />


      <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0b0e13] p-4 shadow-2xl sm:p-5">

        {/* Browser header */}
        <div className="mb-5 flex items-center justify-between">

          <div className="flex gap-1.5">

            <span className="h-2 w-2 rounded-full bg-red-400/70" />

            <span className="h-2 w-2 rounded-full bg-yellow-400/70" />

            <span className="h-2 w-2 rounded-full bg-green-400/70" />

          </div>

          <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-zinc-600">
            LIVE MATCH
          </span>

        </div>


        <div className="rounded-2xl border border-white/10 bg-[#07090d] p-5 sm:p-6">

          <div className="flex items-center justify-between">

            <span className="text-xs text-zinc-600">
              QUESTION 03
            </span>

            <span className="rounded-full bg-blue-400/10 px-3 py-1 text-[10px] font-bold text-blue-400">
              240 PTS
            </span>

          </div>


          <h3 className="mt-6 text-xl font-bold leading-8">
            Which technology enables
            real-time communication
            between clients and servers?
          </h3>


          <div className="mt-7 space-y-2">

            {[
              "HTTP",
              "WebSockets",
              "REST",
              "GraphQL",
            ].map((answer, index) => (

              <div
                key={answer}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  index === 1
                    ? "border-blue-400/30 bg-blue-400/[0.08]"
                    : "border-white/5 bg-white/[0.02]"
                }`}
              >

                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-[11px] font-bold text-zinc-500">
                  {String.fromCharCode(
                    65 + index
                  )}
                </span>

                <span className="text-xs font-medium text-zinc-300">
                  {answer}
                </span>

                {index === 1 && (
                  <span className="ml-auto text-blue-400">
                    ✓
                  </span>
                )}

              </div>
            ))}

          </div>

        </div>


        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-4">

          <div className="flex -space-x-2">

            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#0b0e13] bg-blue-500 text-xs font-bold">
              A
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#0b0e13] bg-purple-500 text-xs font-bold">
              B
            </div>

          </div>

          <div className="text-right">

            <p className="text-xs font-medium text-zinc-300">
              Multiplayer
            </p>

            <p className="text-[10px] text-zinc-600">
              Real-time battle
            </p>

          </div>

        </div>

      </div>
    </div>
  );
}


/*
|--------------------------------------------------------------------------
| Searching Screen
|--------------------------------------------------------------------------
*/

function SearchingScreen({
  onCancel,
}: {
  onCancel: () => void;
}) {
  return (
    <section className="flex min-h-[calc(100vh-80px)] items-center justify-center px-5">

      <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-[#0b0e13] p-10 text-center shadow-2xl">

        <div className="absolute left-1/2 top-[-80px] h-40 w-40 -translate-x-1/2 rounded-full bg-blue-500/20 blur-[80px]" />


        <div className="relative">

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-blue-400/20 bg-blue-400/[0.06]">

            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400/20 border-t-blue-400" />

          </div>


          <p className="mt-8 text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            Matchmaking
          </p>


          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Finding opponent
          </h1>


          <p className="mt-4 text-sm leading-6 text-zinc-500">
            Searching for another player.
            Your game will start automatically
            when someone joins.
          </p>


          <div className="mt-8 flex justify-center gap-2">

            <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400" />

            <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:150ms]" />

            <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:300ms]" />

          </div>


          <button
            onClick={onCancel}
            className="mt-9 text-sm text-zinc-600 transition hover:text-white"
          >
            Cancel matchmaking
          </button>

        </div>
      </div>
    </section>
  );
}


/*
|--------------------------------------------------------------------------
| Game Screen
|--------------------------------------------------------------------------
*/

function GameScreen({
  question,
  score,
  answeredCount,
  totalQuestions,
  selectedAnswer,
  answerState,
  correctAnswer,
  onAnswer,
}: {
  question: Question;
  score: number;
  answeredCount: number;
  totalQuestions: number;
  selectedAnswer: string | null;
  answerState: AnswerState;
  correctAnswer: string | null;
  onAnswer: (
    answer: string
  ) => void;
}) {
  const currentNumber =
    answeredCount + 1;


  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">


      {/* Top */}
      <div className="mb-8 flex items-center justify-between">

        <div>

          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-blue-400">
            Live Battle
          </p>

          <h1 className="mt-1 text-xl font-bold">
            Knowledge Arena
          </h1>

        </div>


        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-right">

          <p className="text-[9px] uppercase tracking-widest text-zinc-600">
            Score
          </p>

          <p className="mt-0.5 text-xl font-black text-blue-400">
            {score}
          </p>

        </div>

      </div>


      {/* Progress */}
      <div className="mb-8">

        <div className="mb-2 flex justify-between text-[10px] text-zinc-600">

          <span>
            Question {currentNumber}
            {totalQuestions > 0
              ? ` / ${totalQuestions}`
              : ""}
          </span>

          <span>
            {score} correct
          </span>

        </div>


        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">

          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{
              width:
                totalQuestions > 0
                  ? `${Math.min(
                      (currentNumber /
                        totalQuestions) *
                        100,
                      100
                    )}%`
                  : "15%",
            }}
          />

        </div>

      </div>


      {/* Question card */}
      <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0b0e13] p-6 shadow-2xl sm:p-10">

        <div className="pointer-events-none absolute right-[-100px] top-[-100px] h-72 w-72 rounded-full bg-blue-500/[0.07] blur-[100px]" />


        <div className="relative">

          <div className="flex items-center justify-between">

            <span className="rounded-full border border-blue-400/20 bg-blue-400/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-400">
              Question
            </span>


            <span className="text-xs text-zinc-600">
              Select one answer
            </span>

          </div>


          <h2 className="mt-8 max-w-3xl text-2xl font-bold leading-tight tracking-tight sm:text-4xl sm:leading-[1.2]">
            {question.question}
          </h2>


          {/* Answers */}
          <div className="mt-10 grid gap-3 sm:grid-cols-2">

            { question?.options?.map(
              (
                option,
                index
              ) => {

                const isSelected =
                  selectedAnswer ===
                  option;

                const isCorrect =
                  answerState ===
                    "correct" &&
                  isSelected;

                const isWrong =
                  answerState ===
                    "wrong" &&
                  isSelected;

                const isCorrectAnswer =
                  answerState ===
                    "wrong" &&
                  correctAnswer ===
                    option;


                return (
                  <button
                    key={option}
                    disabled={
                      selectedAnswer !==
                      null
                    }
                    onClick={() =>
                      onAnswer(
                        option
                      )
                    }
                    className={`
                      group flex min-h-[78px]
                      items-center gap-4
                      rounded-2xl border p-4
                      text-left
                      transition-all duration-200

                      ${
                        isCorrect
                          ? "border-emerald-400/40 bg-emerald-400/[0.08]"
                          : ""
                      }

                      ${
                        isWrong
                          ? "border-red-400/40 bg-red-400/[0.08]"
                          : ""
                      }

                      ${
                        isCorrectAnswer
                          ? "border-emerald-400/40 bg-emerald-400/[0.06]"
                          : ""
                      }

                      ${
                        !isSelected &&
                        !isCorrectAnswer
                          ? "border-white/10 bg-white/[0.025] hover:-translate-y-0.5 hover:border-blue-400/30 hover:bg-blue-400/[0.05]"
                          : ""
                      }

                      ${
                        selectedAnswer &&
                        !isSelected &&
                        !isCorrectAnswer
                          ? "opacity-40"
                          : ""
                      }
                    `}
                  >

                    <span
                      className={`
                        flex h-10 w-10
                        shrink-0 items-center
                        justify-center
                        rounded-xl border
                        text-sm font-bold

                        ${
                          isCorrect
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                            : ""
                        }

                        ${
                          isWrong
                            ? "border-red-400/30 bg-red-400/10 text-red-400"
                            : ""
                        }

                        ${
                          isCorrectAnswer
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                            : ""
                        }

                        ${
                          !isSelected &&
                          !isCorrectAnswer
                            ? "border-white/10 bg-white/[0.04] text-zinc-500"
                            : ""
                        }
                      `}
                    >
                      {String.fromCharCode(
                        65 + index
                      )}
                    </span>


                    <span className="text-sm font-medium text-zinc-200 sm:text-base">
                      {option}
                    </span>


                    {isCorrect && (
                      <span className="ml-auto text-lg text-emerald-400">
                        ✓
                      </span>
                    )}


                    {isWrong && (
                      <span className="ml-auto text-lg text-red-400">
                        ×
                      </span>
                    )}


                    {isCorrectAnswer && (
                      <span className="ml-auto text-xs font-semibold text-emerald-400">
                        Correct
                      </span>
                    )}

                  </button>
                );
              }
            )}

          </div>


          {/* Feedback */}
          {answerState !==
            "idle" && (
            <div
              className={`
                mt-6 rounded-2xl
                border px-5 py-4

                ${
                  answerState ===
                  "correct"
                    ? "border-emerald-400/20 bg-emerald-400/[0.05]"
                    : "border-red-400/20 bg-red-400/[0.05]"
                }
              `}
            >

              <p
                className={`text-sm font-semibold ${
                  answerState ===
                  "correct"
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {answerState ===
                "correct"
                  ? "Correct answer!"
                  : "Not quite!"}
              </p>


              <p className="mt-1 text-xs text-zinc-500">
                {answerState ===
                "correct"
                  ? "Preparing the next question..."
                  : `The correct answer is ${correctAnswer}.`}
              </p>

            </div>
          )}

        </div>
      </div>


      {/* Bottom info */}
      <div className="mt-5 flex items-center justify-center">

        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-700">
          Real-time multiplayer
        </p>

      </div>

    </section>
  );
}


/*
|--------------------------------------------------------------------------
| Finished
|--------------------------------------------------------------------------
*/

function FinishedScreen({
  score,
  answeredCount,
  onPlayAgain,
}: {
  score: number;
  answeredCount: number;
  onPlayAgain: () => void;
}) {
  return (
    <section className="flex min-h-[calc(100vh-80px)] items-center justify-center px-5">

      <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-[#0b0e13] p-8 text-center shadow-2xl sm:p-10">

        <div className="pointer-events-none absolute left-1/2 top-[-100px] h-56 w-56 -translate-x-1/2 rounded-full bg-blue-500/20 blur-[100px]" />


        <div className="relative">

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-blue-400/20 bg-blue-400/[0.08] text-3xl">
            🏆
          </div>


          <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">
            Match Complete
          </p>


          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Game Over
          </h1>


          <p className="mt-3 text-sm text-zinc-500">
            Nice game. Here&apos;s your
            result.
          </p>


          <div className="my-8 grid grid-cols-2 gap-3">

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">

              <p className="text-[9px] uppercase tracking-widest text-zinc-600">
                Score
              </p>

              <p className="mt-2 text-4xl font-black text-blue-400">
                {score}
              </p>

            </div>


            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">

              <p className="text-[9px] uppercase tracking-widest text-zinc-600">
                Answered
              </p>

              <p className="mt-2 text-4xl font-black">
                {answeredCount}
              </p>

            </div>

          </div>


          <button
            onClick={onPlayAgain}
            className="h-14 w-full rounded-2xl bg-blue-500 font-bold text-white transition hover:bg-blue-400"
          >
            Play Again →
          </button>

        </div>
      </div>
    </section>
  );
}


/*
|--------------------------------------------------------------------------
| Error Banner
|--------------------------------------------------------------------------
*/

function ErrorBanner({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed left-1/2 top-24 z-[100] w-[calc(100%-32px)] max-w-lg -translate-x-1/2">

      <div className="flex items-start gap-3 rounded-2xl border border-red-400/20 bg-[#12090b]/95 p-4 shadow-2xl backdrop-blur-xl">

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-400/10 text-sm text-red-400">
          !
        </div>


        <div className="flex-1">

          <p className="text-sm font-semibold text-red-300">
            Something went wrong
          </p>

          <p className="mt-1 text-xs leading-5 text-red-300/60">
            {message}
          </p>

        </div>


        <button
          onClick={onClose}
          className="text-zinc-600 transition hover:text-white"
        >
          ×
        </button>

      </div>

    </div>
  );
}


/*
|--------------------------------------------------------------------------
| Stat
|--------------------------------------------------------------------------
*/

function Stat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">

      <p className="text-lg font-bold">
        {value}
      </p>

      <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-zinc-600">
        {label}
      </p>

    </div>
  );
}
