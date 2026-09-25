"use client";

import { useEffect, useRef, useState } from "react";

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

export default function Home() {
  const wsRef = useRef<WebSocket | null>(null);

  const timerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const [connected, setConnected] = useState(false);

  const [gameId, setGameId] = useState("");

  const [question, setQuestion] =
    useState<Question | null>(null);

  const [cells, setCells] =
    useState<CellState[]>([]);

  const [phase, setPhase] =
    useState<GamePhase>("LOBBY");

  const [score, setScore] = useState(0);

  const [questionNumber, setQuestionNumber] =
    useState(1);

  const [message, setMessage] =
    useState("Connecting...");

  /*
   * ==========================================
   * WEBSOCKET CONNECTION
   * ==========================================
   */

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please login first");
      return;
    }

    const ws = new WebSocket(
      `ws://localhost:8080?token=${token}`
    );

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
       * FIRST QUESTION
       * ==========================================
       */

      if (data.type === "QUESTION") {
        const [questionId, pattern] =
          data.payload.question;

        const receivedGameId =
          data.payload.runningGameId;

        console.log(
          "First question:",
          questionId,
          pattern
        );

        setGameId(receivedGameId);

        setQuestion({
          id: questionId,
          pattern: pattern,
        });

        setQuestionNumber(1);

        /*
         * First question starts immediately.
         * No 1 second intro.
         */

        startShowingPattern(pattern);
      }

      /*
       * ==========================================
       * NEXT QUESTION
       * ==========================================
       */

      if (data.type === "NEXT_QUESTION") {
        const questionId =
          data.payload.questionId;

        const pattern =
          data.payload.question;

        console.log(
          "Next question:",
          questionId,
          pattern
        );

        /*
         * Store the new question.
         */

        setQuestion({
          id: questionId,
          pattern: pattern,
        });

        /*
         * Increase question number.
         */

        setQuestionNumber(
          (previous) => previous + 1
        );

        /*
         * IMPORTANT:
         *
         * Pass `pattern` directly.
         *
         * Don't read question.pattern
         * inside the timer because React
         * state updates asynchronously.
         */

        startQuestionIntro(pattern);
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

          setMessage(
            "Some boxes were incorrect. Try again."
          );
        }
      }
    };

    return () => {
      clearGameTimer();
      ws.close();
    };
  }, []);

  /*
   * ==========================================
   * CLEAR TIMER
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

    if (
      wsRef.current.readyState !==
      WebSocket.OPEN
    ) {
      setMessage(
        "WebSocket is not connected"
      );
      return;
    }

    console.log("Creating game...");

    wsRef.current.send(
      JSON.stringify({
        type: "CREATE",
        payload: {},
      })
    );

    setPhase("WAITING");

    setMessage(
      "Waiting for another player..."
    );
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

    if (
      wsRef.current.readyState !==
      WebSocket.OPEN
    ) {
      setMessage(
        "WebSocket is not connected"
      );
      return;
    }

    console.log("Joining game...");

    wsRef.current.send(
      JSON.stringify({
        type: "JOIN",
        payload: {},
      })
    );

    setPhase("WAITING");

    setMessage("Joining game...");
  }

  /*
   * ==========================================
   * QUESTION INTRO
   * ==========================================
   *
   * For question 2, 3, 4...
   *
   * QUESTION 2
   *      ↓
   *   1 second
   *      ↓
   * Green pattern
   *      ↓
   *   3 seconds
   *      ↓
   * Player clicks
   */

  function startQuestionIntro(
    pattern: string[][]
  ) {
    clearGameTimer();

    setPhase("INTRO");

    setMessage("");

    /*
     * Show:
     *
     * Question 2
     *
     * for exactly 1 second.
     */

    timerRef.current = setTimeout(() => {
      startShowingPattern(pattern);
    }, 1000);
  }

  /*
   * ==========================================
   * SHOW PATTERN
   * ==========================================
   *
   * Green ON boxes are shown for 3 seconds.
   */

  function startShowingPattern(
    pattern: string[][]
  ) {
    clearGameTimer();

    const totalCells =
      pattern.flat().length;

    /*
     * Reset all boxes.
     */

    setCells(
      Array(totalCells).fill("normal")
    );

    /*
     * Show green pattern.
     */

    setPhase("SHOWING");

    setMessage(
      "Remember the green boxes"
    );

    /*
     * After 3 seconds,
     * allow player to click.
     */

    timerRef.current = setTimeout(() => {
      setPhase("PLAYING");

      setMessage(
        "Select the boxes you remember"
      );
    }, 3000);
  }

  /*
   * ==========================================
   * CLICK BOX
   * ==========================================
   */

  function handleCellClick(
    index: number
  ) {
    /*
     * Player can only click
     * during PLAYING.
     */

    if (phase !== "PLAYING") {
      return;
    }

    if (!question) {
      return;
    }

    /*
     * Don't allow clicking an already
     * selected box.
     */

    if (cells[index] !== "normal") {
      return;
    }

    const flattenedPattern =
      question.pattern.flat();

    const actualValue =
      flattenedPattern[index];

    /*
     * ==========================================
     * CORRECT BOX
     * ==========================================
     */

    if (actualValue === "on") {
      const updatedCells = [...cells];

      updatedCells[index] = "correct";

      setCells(updatedCells);

      setScore(
        (previous) => previous + 1
      );

      /*
       * Count total ON boxes.
       */

      const totalOn =
        flattenedPattern.filter(
          (value) => value === "on"
        ).length;

      /*
       * Count correctly selected boxes.
       */

      const selectedCorrect =
        updatedCells.filter(
          (value) => value === "correct"
        ).length;

      /*
       * Player found every ON box.
       */

      if (
        selectedCorrect === totalOn
      ) {
        setPhase("SUBMITTING");

        setMessage(
          "Perfect! Checking answer..."
        );

        submitAnswer(updatedCells);
      }

      return;
    }

    /*
     * ==========================================
     * WRONG BOX
     * ==========================================
     */

    const updatedCells = [...cells];

    updatedCells[index] = "wrong";

    setCells(updatedCells);

    setMessage("Wrong box!");

    /*
     * Red → white after 700ms.
     */

    setTimeout(() => {
      setCells((current) => {
        const updated = [...current];

        if (
          updated[index] === "wrong"
        ) {
          updated[index] = "normal";
        }

        return updated;
      });

      /*
       * Return normal message if
       * player is still playing.
       */

      setMessage(
        "Select the boxes you remember"
      );
    }, 700);
  }

  /*
   * ==========================================
   * SUBMIT ANSWER
   * ==========================================
   */

  function submitAnswer(
    selectedCells: CellState[]
  ) {
    if (!wsRef.current) {
      return;
    }

    if (!question) {
      return;
    }

    if (!gameId) {
      return;
    }

    /*
     * Convert:
     *
     * correct → on
     * normal  → off
     * wrong   → off
     */

    const answerFlat =
      selectedCells.map((cell) =>
        cell === "correct"
          ? "on"
          : "off"
      );

    /*
     * Convert 1D array back into
     * the original 2D structure.
     *
     * Example:
     *
     * [
     *   "on", "off", "on", "off",
     *   "off", "on", "off", "on"
     * ]
     *
     * becomes:
     *
     * [
     *   ["on", "off", "on", "off"],
     *   ["off", "on", "off", "on"]
     * ]
     */

    const columns =
      question.pattern[0].length;

    const answer: string[][] = [];

    for (
      let i = 0;
      i < answerFlat.length;
      i += columns
    ) {
      answer.push(
        answerFlat.slice(
          i,
          i + columns
        )
      );
    }

    console.log(
      "SUBMITTING ANSWER:",
      {
        questionId: question.id,
        gameId: gameId,
        answer: answer,
      }
    );

    wsRef.current.send(
      JSON.stringify({
        type: "SUBMIT",

        payload: {
          questionId:
            question.id,

          gameId:
            gameId,

          answer:
            answer,
        },
      })
    );
  }

  /*
   * ==========================================
   * CELL COLOR
   * ==========================================
   */

  function getCellColor(
    index: number
  ) {
    /*
     * During the 3 second memory phase,
     * show ON boxes as green.
     */

    if (
      phase === "SHOWING" &&
      question
    ) {
      const value =
        question.pattern
          .flat()[index];

      if (value === "on") {
        return "bg-green-500 animate-pulse";
      }

      return "bg-white";
    }

    /*
     * Normal box.
     */

    if (
      cells[index] === "normal"
    ) {
      return "bg-white";
    }

    /*
     * Correct selected box.
     */

    if (
      cells[index] === "correct"
    ) {
      return "bg-green-500";
    }

    /*
     * Wrong selected box.
     */

    if (
      cells[index] === "wrong"
    ) {
      return "bg-red-500";
    }

    return "bg-white";
  }

  /*
   * ==========================================
   * UI
   * ==========================================
   */

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">

      <div className="w-full max-w-lg">

        {/* ================================= */}
        {/* LOBBY */}
        {/* ================================= */}

        {phase === "LOBBY" && (
          <div className="text-center">

            <h1 className="text-5xl font-bold">
              Memory Grid
            </h1>

            <p className="text-gray-400 mt-3">
              {message}
            </p>

            <div className="flex flex-col gap-4 max-w-sm mx-auto mt-10">

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

        {/* ================================= */}
        {/* WAITING */}
        {/* ================================= */}

        {phase === "WAITING" && (
          <div className="text-center">

            <h1 className="text-4xl font-bold">
              Waiting for player
            </h1>

            <div className="flex justify-center gap-2 mt-8">

              <span
                className="
                  w-3
                  h-3
                  bg-white
                  rounded-full
                  animate-bounce
                "
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

            <p className="text-gray-400 mt-6">
              {message}
            </p>

          </div>
        )}

        {/* ================================= */}
        {/* QUESTION INTRO */}
        {/* ================================= */}

        {phase === "INTRO" && (
          <div className="min-h-[400px] flex items-center justify-center">

            <div className="text-center">

              <p className="text-gray-400 text-lg">
                Get ready
              </p>

              <h1 className="text-6xl font-bold mt-3">
                Question {questionNumber}
              </h1>

            </div>

          </div>
        )}

        {/* ================================= */}
        {/* GAME */}
        {/* ================================= */}

        {(
          phase === "SHOWING" ||
          phase === "PLAYING" ||
          phase === "SUBMITTING"
        ) && (
          <div>

            {/* HEADER */}

            <div className="flex justify-between items-center mb-8">

              <div>
                <p className="text-gray-500 text-sm">
                  QUESTION
                </p>

                <p className="text-2xl font-bold">
                  {questionNumber}
                </p>
              </div>

              <div className="text-right">
                <p className="text-gray-500 text-sm">
                  SCORE
                </p>

                <p className="text-2xl font-bold">
                  {score}
                </p>
              </div>

            </div>

            {/* MESSAGE */}

            <div className="text-center mb-8">

              <p className="text-gray-400">
                {message}
              </p>

            </div>

            {/* GRID */}

            <div className="grid grid-cols-5 gap-3 max-w-md mx-auto">

              {cells.map(
                (state, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      handleCellClick(index)
                    }
                    disabled={
                      phase !== "PLAYING"
                    }
                    className={`
                      aspect-square
                      rounded-xl
                      transition-all
                      duration-200
                      ${getCellColor(index)}
                      ${
                        phase === "PLAYING"
                          ? "cursor-pointer hover:scale-105"
                          : "cursor-default"
                      }
                    `}
                  />
                )
              )}

            </div>

          </div>
        )}

        {/* ================================= */}
        {/* COMPLETED */}
        {/* ================================= */}

        {phase === "COMPLETED" && (
          <div className="text-center">

            <p className="text-gray-400">
              Game completed
            </p>

            <h1 className="text-6xl font-bold mt-4">
              {score}
            </h1>

            <p className="text-gray-400 mt-2">
              Final Score
            </p>

          </div>
        )}

      </div>

    </main>
  );
}