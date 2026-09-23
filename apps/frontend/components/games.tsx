"use client";

// import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type User = {
  id: string;
  email: string;
  username: string;
};

type OnlineUser = {
  id: string;
  name: string;
};

type Question = {
  id: string;
  integer1: number;
  integer2: number;
  operator: string;
  answer: number;
};

type Game = {
  gameId: string;
  firstQuestion: Question;
};

export default function Games() {

   const [user, setUser] = useState<User | null>(null);

  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  const [game, setGame] = useState<Game | null>(null);

  // Keep input as string because HTML input.value is always string
  const [answer, setAnswer] = useState("");

  const wsRef = useRef<WebSocket | null>(null);



useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem("token");

    if (!token) return;

    const ws = new WebSocket(
      `ws://localhost:8080?token=${encodeURIComponent(token)}`
    );

    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      console.log("SERVER:", data);

      if (data.type === "ONLINE_USER") {
        const users = data.payload.users.map(
          ([id, onlineUser]: [string, OnlineUser]) => ({
            id,
            name: onlineUser.name,
          })
        );

        setOnlineUsers(users);
        return;
      }


      if (data.type === "GAME_ACCEPTED") {
        const gameData: Game = {
          gameId: data.payload.gameId,
          firstQuestion: data.payload.firstQuestion,
        };

        setGame(gameData);

        console.log("GAME:", gameData);
        console.log("QUESTION:", gameData.firstQuestion);

        return;
      }

      // -----------------------------
      // Next question
      // -----------------------------

      if (data.type === "QUESTION") {
        console.log("NEXT QUESTION:", data);
        setGame((previousGame) => {
          if (!previousGame) return previousGame;
          return {
            ...previousGame,
            firstQuestion: data.payload.question,
          };
        });

        setAnswer("");

        return;
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setOnlineUsers([]);
      wsRef.current = null;
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [user]);
  
  
    function handlePlayGame() {
    const ws = wsRef.current;

    if (!ws) {
      console.log("WebSocket is not connected");
      return;
    }

    if (ws.readyState !== WebSocket.OPEN) {
      console.log("WebSocket is not ready");
      return;
    }

    ws.send(
      JSON.stringify({
        type: "PLAY_GAME",
        payload: {},
      })
    );

    console.log("PLAY_GAME sent");
  }
  const games = [
    {
      title: "MATH",
      color: "bg-blue-700",
      activeColor: "bg-blue-500",
    },
    {
      title: "MEMORY",
      color: "bg-purple-700",
      activeColor: "bg-purple-500",
    },
    {
      title: "PUZZLE",
      color: "bg-green-700",
      activeColor: "bg-green-500",
    },
    {
      title: "LOGIC",
      color: "bg-orange-700",
      activeColor: "bg-orange-500",
    },
  ];

  const [activeGame, setActiveGame] = useState<string | null>(null);

  return (
    <div>
      <div className="w-full flex items-center justify-center">
        {games.map((gm) => {
          const isActive = activeGame === gm.title;

          return (
            <div  className="gap-20 sm:gap-5 px-4 flex flex-col  items-center justify-center" >
            <button
              key={gm.title}
              onClick={() => setActiveGame(gm.title)}
              className={`
                flex h-40 w-40 items-center justify-center
                rounded-2xl text-white
                transition-all duration-200
                ${isActive ? gm.activeColor : "bg-slate-900"}
                ${isActive ? "scale-105" : "scale-100"}
              `}
            >
              <p className="text-2xl font-bold">
                {gm.title}
              </p>
              
            </button>
            <button  onClick={handlePlayGame} className="bg-cyan-700 px-10 rounded py-2  text-xl cursor-pointer hover:border-2 border-white active:scale-90 ">play</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}