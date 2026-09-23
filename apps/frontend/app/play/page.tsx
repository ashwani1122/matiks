"use client";

import { useEffect, useRef, useState } from "react";

type Question = {
  id: string;
  integer1: number;
  integer2: number;
  operator: string;
  answer:number 
};

type Game = {
  gameId: string;
  question: Question;
};

export default function PlayPage() {
  const [game, setGame] = useState<Game | null>(null);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [question , setQuestion] = useState<Question>()
  const [gameId , setGameId] = useState("")
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    const ws = new WebSocket(
      `ws://localhost:8080?token=${encodeURIComponent(token)}`
    );

    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected");
      alert("request came here")
      // Start game
      ws.send(
        JSON.stringify({
          type: "PLAY_GAME",
          payload: {},
        })
      );
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      console.log("SERVER:", data);
      
      // First question
      if (data.type === "GAME_REQUEST") {
        setGameId(data.payload.gameId);

        setAnswer("");
        setMessage("");
      }
      else if(data.type ==="GAME_ACCEPTED"){
            setQuestion(data.payload.firstQuestion)
      }
      // Next question
      else if (data.type === "QUESTION") {
        setGame((previous) => {
          if (!previous) return previous;

          return {
            gameId: data.payload.gameId,
            question: data.payload.question,
          };
        });

        setAnswer("");
        setMessage("");
      }
      else{
        console.log("hi there its done")
      }
    };

    ws.onclose = () => {
      console.log("Disconnected");
    };

    return () => {
      ws.close();
    };
  }, []);

  function handleAnswerChange(value: string) {
    setAnswer(value);

    if (!game || value === "") {
      return;
    }

    const answerNumber = Number(value);

    if (Number.isNaN(answerNumber)) {
      return;
    }

    const ws = wsRef.current;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    ws.send(
      JSON.stringify({
        type: "SUBMIT_ANSWER",
        payload: {
          gameId: gameId,
          questionId: question?.id,
          answer: answerNumber,
        },
      })
    );

    console.log("Answer submitted:", answerNumber);
  }

  if (!game) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-white mx-auto" />

          <h1 className="text-xl font-semibold">
            Waiting for opponent...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-xl">
        {/* Header */}

        <div className="mb-10 flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            Matiks
          </h1>

          <span className="rounded-full bg-green-500/10 px-4 py-2 text-sm text-green-400">
            Playing
          </span>
        </div>

        {/* Question */}

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-10">
          <p className="mb-3 text-center text-sm text-zinc-500">
            Solve
          </p>

          <div className="mb-10 flex flex-col  text-center text-6xl font-bold">
            <p>{question?.integer1}</p>
            <p>{question?.integer2}</p>

            <p>{question?.operator}</p>
            <hr />
          </div>

          {/* Answer */}

          <input
            autoFocus
            type="number"
            value={answer}
            onChange={(e) => handleAnswerChange(e.target.value)}
            placeholder="Enter answer"
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-5 text-center text-3xl font-semibold text-white outline-none transition focus:border-cyan-400"
          />

          <p className="mt-4 text-center text-sm text-zinc-500">
            Enter the correct answer to continue
          </p>

          {message && (
            <p className="mt-4 text-center text-red-400">
              {message}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}