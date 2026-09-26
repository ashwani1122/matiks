"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import OnlineUsers from "@/components/onlineUsers";
import { Router } from "next/router";

type CellState = "normal" | "correct" | "wrong";

type Question = {
  id: string;
  pattern: string[][];
};

type GamePhase =
  | "LOBBY"
  | "WAITING"
  | "INTRO"
  | "SHOWING"
  | "PLAYING"
  | "SUBMITTING"
  | "COMPLETED";

export type User = {
  id: string;
  name: string;
  ws: WebSocket;
};

type Opponent = {
  id: string;
  name: string;
  score: number;
};

export default function Home() {
  const wsRef = useRef<WebSocket | null>(null);

  const route = useRouter();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [connected, setConnected] = useState(false);

  const [gameId, setGameId] = useState("");

  const [question, setQuestion] = useState<Question | null>(null);

  const [cells, setCells] = useState<CellState[]>([]);

  const [phase, setPhase] = useState<GamePhase>("LOBBY");

  // My score
  const [score1, setScore1] = useState<number>(0);

  // Opponent score
  const [score2, setScore2] = useState<number>(0);

  // My username
  const [user1, setUser1] = useState<string>("");

  // Opponent username
  const [user2, setUser2] = useState<string>("");

  const [opponent, setOpponent] = useState<Opponent | null>(null);

  const [questionNumber, setQuestionNumber] = useState(1);

  const [timer, setTimer] = useState<number>(60);

  const [end, setEnd] = useState(false);

  const [message, setMessage] = useState("Connecting...");

  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);

  /*
   * ==========================================
   * WEBSOCKET CONNECTION
   * ==========================================
   */

  useEffect(() => {
    const token = localStorage.getItem("token");

    const storedUser = localStorage.getItem("user");
    
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);

        setUser1(parsedUser.username || parsedUser.name || "");
      } catch (error) {
        console.error("Failed to parse user:", error);
      }
    }

    if (!token) {
      setMessage("Please login first");
      return;
    }

    const ws = new WebSocket(`ws://localhost:8080?token=${token}`);

    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");

      setConnected(true);
      setMessage("Connected");
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);

      setMessage("WebSocket error");
    };

    ws.onclose = (event) => {
      console.log("WebSocket closed");

      console.log("Close code:", event.code);

      console.log("Close reason:", event.reason);

      console.log("Was clean:", event.wasClean);

      setConnected(false);
      setMessage("Disconnected");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      console.log("SERVER MESSAGE:", data);

      /*
       * ==========================================
       * ONLINE USERS
       * ==========================================
       */

      if (data.type === "ONLINE_USER") {
        const { users } = data.payload;
        
        setOnlineUsers(users);
      }

      /*
       * ==========================================
       * FIRST QUESTION
       * ==========================================
       */
      else if (data.type === "QUESTION") {
        const [questionId, pattern] = data.payload.question;

        const { endTime } = data.payload;

        const receivedGameId = data.payload.runningGameId;

        setGameId(receivedGameId);

        /*
         * Start 60 second countdown
         */

        if (countdownRef.current) {
          clearInterval(countdownRef.current);
        }

        countdownRef.current = setInterval(() => {
          const remaining = Math.ceil((endTime - Date.now()) / 1000);

          setTimer(Math.max(0, remaining));

          if (remaining <= 0) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);

              countdownRef.current = null;
            }

            setTimer(0);
            setEnd(true);
            setPhase("COMPLETED");
          }
        }, 1000);

        setQuestion({
          id: questionId,
          pattern: pattern,
        });

        setQuestionNumber(1);

        startShowingPattern(pattern);
      }

      /*
       * ==========================================
       * NEXT QUESTION
       * ==========================================
       */

      if (data.type === "NEXT_QUESTION") {
        const questionId = data.payload.questionId;

        const pattern = data.payload.question;

        console.log("Next question:", questionId, pattern);

        setQuestion({
          id: questionId,
          pattern: pattern,
        });

        setQuestionNumber((previous) => previous + 1);

        startQuestionIntro(pattern);
      }

      /*
       * ==========================================
       * SCORE UPDATE
       * ==========================================
       */

      if (data.type === "SCORE_UPDATE") {
        const { myScore, opponent } = data.payload;

        setScore1(myScore);

        setScore2(opponent?.score ?? 0);

        setOpponent(opponent ?? null);

        if (opponent) {
          setUser2(opponent.name);
        }
      }

      /*
       * ==========================================
       * TIME UP
       * ==========================================
       */

      if (data.type === "TIME_UP") {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);

          countdownRef.current = null;
        }

        setTimer(0);
        setEnd(true);
        setPhase("COMPLETED");
      }

      /*
       * ==========================================
       * GAME COMPLETED
       * ==========================================
       */

      if (data.type === "GAME_COMPLETED") {
        clearGameTimer();

        setPhase("COMPLETED");

        setMessage("Game completed!");
      }

      /*
       * ==========================================
       * ANSWER RESULT
       * ==========================================
       */

      if (data.type === "ANSWER_RESULT") {
        if (data.payload?.correct === false) {
          setPhase("PLAYING");

          setMessage("Some boxes were incorrect. Try again.");
        }
      }
    };

    return () => {
      clearGameTimer();

      if (countdownRef.current) {
        clearInterval(countdownRef.current);

        countdownRef.current = null;
      }

      ws.close();
    };
  }, []);

  /*
   * ==========================================
   * CLEAR QUESTION TIMER
   * ==========================================
   */

  function clearGameTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);

      timerRef.current = null;
    }
  }

  /*
   * ==========================================
   * CREATE GAME
   * ==========================================
   */

  function createGame() {
    if (!wsRef.current) {
      return;
    }

    if (wsRef.current.readyState !== WebSocket.OPEN) {
      setMessage("WebSocket is not connected");

      return;
    }

    console.log("Creating game...");

    wsRef.current.send(
      JSON.stringify({
        type: "CREATE",
        payload: {},
      }),
    );

    setPhase("WAITING");

    setMessage("Waiting for another player...");
  }

  /*
   * ==========================================
   * JOIN GAME
   * ==========================================
   */

  function joinGame() {
    if (!wsRef.current) {
      return;
    }

    if (wsRef.current.readyState !== WebSocket.OPEN) {
      setMessage("WebSocket is not connected");

      return;
    }

    console.log("Joining game...");

    wsRef.current.send(
      JSON.stringify({
        type: "JOIN",
        payload: {},
      }),
    );

    setPhase("WAITING");

    setMessage("Joining game...");
  }

  /*
   * ==========================================
   * QUESTION INTRO
   * ==========================================
   */

  function startQuestionIntro(pattern: string[][]) {
    clearGameTimer();

    setPhase("INTRO");

    setMessage("");

    timerRef.current = setTimeout(() => {
      startShowingPattern(pattern);
    }, 1000);
  }

  /*
   * ==========================================
   * SHOW PATTERN
   * ==========================================
   */

  function startShowingPattern(pattern: string[][]) {
    clearGameTimer();

    const totalCells = pattern.flat().length;

    setCells(Array(totalCells).fill("normal"));

    setPhase("SHOWING");

    setMessage("Remember the green boxes");

    timerRef.current = setTimeout(() => {
      setPhase("PLAYING");

      setMessage("Select the boxes you remember");
    }, 3000);
  }

  /*
   * ==========================================
   * CLICK BOX
   * ==========================================
   */

  function handleCellClick(index: number) {
    if (phase !== "PLAYING") {
      return;
    }

    if (!question) {
      return;
    }

    if (cells[index] !== "normal") {
      return;
    }

    const flattenedPattern = question.pattern.flat();

    const actualValue = flattenedPattern[index];

    /*
     * CORRECT BOX
     */

    if (actualValue === "on") {
      const updatedCells = [...cells];

      updatedCells[index] = "correct";

      setCells(updatedCells);

      setScore1((previous) => previous + 1);

      const totalOn = flattenedPattern.filter((value) => value === "on").length;

      const selectedCorrect = updatedCells.filter(
        (value) => value === "correct",
      ).length;

      if (selectedCorrect === totalOn) {
        setPhase("SUBMITTING");

        setMessage("Perfect! Checking answer...");

        submitAnswer(updatedCells);
      }

      return;
    }

    /*
     * WRONG BOX
     */

    const updatedCells = [...cells];

    updatedCells[index] = "wrong";

    setCells(updatedCells);

    setMessage("Wrong box!");

    setTimeout(() => {
      setCells((current) => {
        const updated = [...current];

        if (updated[index] === "wrong") {
          updated[index] = "normal";
        }

        return updated;
      });

      setMessage("Select the boxes you remember");
    }, 700);
  }

  /*
   * ==========================================
   * SUBMIT ANSWER
   * ==========================================
   */

  function submitAnswer(selectedCells: CellState[]) {
    if (!wsRef.current) {
      return;
    }

    if (!question) {
      return;
    }

    if (!gameId) {
      return;
    }

    const answerFlat = selectedCells.map((cell) =>
      cell === "correct" ? "on" : "off",
    );

    const columns = question.pattern[0].length;

    const answer: string[][] = [];

    for (let i = 0; i < answerFlat.length; i += columns) {
      answer.push(answerFlat.slice(i, i + columns));
    }

    console.log("SUBMITTING ANSWER:", {
      questionId: question.id,

      gameId: gameId,

      answer: answer,
    });

    wsRef.current.send(
      JSON.stringify({
        type: "SUBMIT",

        payload: {
          questionId: question.id,

          gameId: gameId,

          answer: answer,
        },
      }),
    );
  }

  /*
   * ==========================================
   * CELL COLOR
   * ==========================================
   */

  function getCellColor(index: number) {
    if (phase === "SHOWING" && question) {
      const value = question.pattern.flat()[index];

      if (value === "on") {
        return "bg-green-500 animate-pulse";
      }

      return "bg-white";
    }

    if (cells[index] === "normal") {
      return "bg-white";
    }

    if (cells[index] === "correct") {
      return "bg-green-500";
    }

    if (cells[index] === "wrong") {
      return "bg-red-500";
    }

    return "bg-zinc-700";
  }

  /*
   * ==========================================
   * RESULT
   * ==========================================
   */

  function getResult() {
    if (score1 > score2) {
      return "WINNER";
    }

    if (score1 < score2) {
      return "LOST";
    }

    return "DRAW";
  }

  /*
   * ==========================================
   * RENDER
   * ==========================================
   */

  return (
    <main className="min-h-screen bg-violet-700 text-white flex flex-col items-center justify-center px-4">
      {/* ========================================
          GAME
      ======================================== */}

      {!end ? (
        <div className="w-full max-w-lg">
          {/* ====================================
              ACTIVE PLAYER
          ==================================== */}

          <div className="flex flex-col items-center mb-6">
            <div
              className="
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-full
              bg-white
              text-black
              text-lg
              font-bold
              uppercase
            "
            >
              {user1 ? user1.slice(0, 2) : "??"}
            </div>

            <p className="mt-2 text-sm font-medium">{user1 || "Player"}</p>
          </div>

          {/* ====================================
              ONLINE USERS
          ==================================== */}

          <OnlineUsers users={onlineUsers} />

          {/* ====================================
              TIMER
          ==================================== */}

          <div
            className="
            mb-6
            text-center
            text-2xl
            font-bold
          "
          >
            Time left: {timer}
          </div>

          {/* ====================================
              SCOREBOARD
          ==================================== */}

          {(phase === "SHOWING" ||
            phase === "PLAYING" ||
            phase === "SUBMITTING") && (
            <div
              className="
              mb-8
              flex
              items-center
              justify-between
              rounded-2xl
              border
              border-white/10
              bg-black/10
              p-4
            "
            >
              {/* MY SCORE */}

              <div
                className="
                flex
                flex-col
                items-center
              "
              >
                <div
                  className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  bg-white
                  text-black
                  text-sm
                  font-bold
                  uppercase
                "
                >
                  {user1 ? user1.slice(0, 2) : "??"}
                </div>

                <p
                  className="
                  mt-1
                  max-w-24
                  truncate
                  text-xs
                  text-zinc-200
                "
                >
                  {user1 || "You"}
                </p>

                <p
                  className="
                  text-2xl
                  font-black
                "
                >
                  {score1}
                </p>
              </div>

              {/* VS */}

              <div
                className="
                text-xs
                font-bold
                text-white/40
              "
              >
                VS
              </div>

              {/* OPPONENT */}

              <div
                className="
                flex
                flex-col
                items-center
              "
              >
                <div
                  className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  bg-black/30
                  text-sm
                  font-bold
                  uppercase
                "
                >
                  {user2 ? user2.slice(0, 2) : "??"}
                </div>

                <p
                  className="
                  mt-1
                  max-w-24
                  truncate
                  text-xs
                  text-zinc-200
                "
                >
                  {user2 || "Opponent"}
                </p>

                <p
                  className="
                  text-2xl
                  font-black
                "
                >
                  {score2}
                </p>
              </div>
            </div>
          )}

          {/* ====================================
              LOBBY
          ==================================== */}

          {phase === "LOBBY" && (
            <div
              className="
              text-center
            "
            >
              <h1
                className="
                text-5xl
                font-bold
              "
              >
                Memory Grid
              </h1>

              <p
                className="
                text-gray-200
                mt-3
              "
              >
                {message}
              </p>

              <div
                className="
                flex
                flex-col
                gap-4
                max-w-sm
                mx-auto
                mt-10
              "
              >
                <button
                  onClick={createGame}
                  disabled={!connected}
                  className="
                    w-full
                    rounded-xl
                    bg-white
                    text-black
                    py-4
                    font-semibold
                    text-lg
                    hover:bg-gray-200
                    disabled:opacity-40
                    disabled:cursor-not-allowed
                  "
                >
                  Create Game
                </button>

                <button
                  onClick={joinGame}
                  disabled={!connected}
                  className="
                    w-full
                    rounded-xl
                    border
                    border-white/20
                    bg-white/5
                    py-4
                    font-semibold
                    text-lg
                    hover:bg-white/10
                    disabled:opacity-40
                    disabled:cursor-not-allowed
                  "
                >
                  Join Game
                </button>
              </div>
            </div>
          )}

          {/* ====================================
              WAITING
          ==================================== */}

          {phase === "WAITING" && (
            <div
              className="
              text-center
            "
            >
              <h1
                className="
                text-4xl
                font-bold
              "
              >
                Waiting for player
              </h1>

              <div
                className="
                flex
                justify-center
                gap-2
                mt-8
              "
              >
                <span
                  className="
                  w-3
                  h-3
                  bg-white
                  rounded-full
                  animate-bounce"
                />

                <span
                  className="
                    w-3
                    h-3
                    bg-white
                    rounded-full
                    animate-bounce
                  "
                  style={{
                    animationDelay: "150ms",
                  }}
                />

                <span
                  className="
                    w-3
                    h-3
                    bg-white
                    rounded-full
                    animate-bounce
                  "
                  style={{
                    animationDelay: "300ms",
                  }}
                />
              </div>

              <p
                className="
                text-gray-200
                mt-6
              "
              >
                {message}
              </p>
            </div>
          )}

          {/* ====================================
              INTRO
          ==================================== */}

          {phase === "INTRO" && (
            <div
              className="
              min-h-[400px]
              flex
              items-center
              justify-center
            "
            >
              <div
                className="
                text-center
              "
              >
                <p
                  className="
                  text-white/60
                  text-lg
                "
                >
                  Get ready
                </p>

                <h1
                  className="
                  text-6xl
                  font-bold
                  mt-3
                "
                >
                  Question {questionNumber}
                </h1>
              </div>
            </div>
          )}

          {/* ====================================
              GAME GRID
          ==================================== */}

          {(phase === "SHOWING" ||
            phase === "PLAYING" ||
            phase === "SUBMITTING") && (
            <div>
              <div
                className="
                flex
                justify-between
                items-center
                mb-8
              "
              >
                <div>
                  <p
                    className="
                    text-white/50
                    text-sm
                  "
                  >
                    QUESTION
                  </p>

                  <p
                    className="
                    text-2xl
                    font-bold
                  "
                  >
                    {questionNumber}
                  </p>
                </div>

                <div
                  className="
                  text-right
                "
                >
                  <p
                    className="
                    text-white/50
                    text-sm
                  "
                  >
                    SCORE
                  </p>

                  <p
                    className="
                    text-2xl
                    font-bold
                  "
                  >
                    {score1}
                  </p>
                </div>
              </div>

              <div
                className="
                text-center
                mb-8
              "
              >
                <p
                  className="
                  text-white/70
                "
                >
                  {message}
                </p>
              </div>

              {/* GRID */}

              <div
                className="
                grid
                grid-cols-5
                gap-3
                max-w-md
                mx-auto
              "
              >
                {cells.map((state, index) => (
                  <button
                    key={index}
                    onClick={() => handleCellClick(index)}
                    disabled={phase !== "PLAYING"}
                    className={`
                        aspect-square
                        rounded-xl
                        transition-transform
                        duration-150

                        hover:-translate-x-1
                        hover:-translate-y-1

                        hover:shadow-[6px_6px_0px_rgba(0,0,0,1)]

                        active:translate-x-0
                        active:translate-y-0

                        ${getCellColor(index)}

                        ${
                          phase === "PLAYING"
                            ? "cursor-pointer"
                            : "cursor-default"
                        }
                      `}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================
           RESULT MODAL
        ======================================== */

        <div
          className="
          fixed
          inset-0
          z-50
          flex
          items-center
          justify-center
          bg-black/70
          px-4
        "
        >
          <div
            className="
            w-full
            max-w-md
            rounded-3xl
            border
            border-white/10
            bg-zinc-950
            p-8
            shadow-2xl
          "
          >
            {/* RESULT */}

            <h1
              className="
              text-center
              text-5xl
              font-black
            "
            >
              {getResult()}
            </h1>

            {/* SCORE LINE */}

            <div
              className="
              mt-10
              flex
              items-center
            "
            >
              {/* MY SCORE */}

              <div
                className="
                flex
                flex-1
                flex-col
                items-start
              "
              >
                <p
                  className="
                  text-5xl
                  font-black
                "
                >
                  {score1}
                </p>

                <p
                  className="
                  mt-2
                  text-lg
                  text-zinc-400
                "
                >
                  {user1 || "You"}
                </p>
              </div>

              {/* MIDDLE LINE */}

              <div
                className="
                mx-6
                h-20
                w-px
                bg-white/20"
              />

              {/* OPPONENT SCORE */}

              <div
                className="
                flex
                flex-1
                flex-col
                items-end"
              >
                <p
                  className="
                  text-5xl
                  font-black
                "
                >
                  {score2}
                </p>

                <p
                  className="
                  mt-2
                  text-lg
                  text-zinc-400
                "
                >
                  {user2 || "Opponent"}
                </p>
              </div>
            </div>

            {/* RESULT DESCRIPTION */}

            <p
              className="
              mt-8
              text-center
              text-sm
              text-zinc-500
            "
            >
              Final score
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
