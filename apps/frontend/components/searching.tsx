"use client";

import { useEffect, useState } from "react";

type Player = {
  id: string;
  name: string;
};

type PlayerSearchProps = {
  searching: boolean;
  player?: Player | null;
};

export default function PlayerSearch({
  searching,
  player = null,
}: PlayerSearchProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (player) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [player]);

  return (
    <div className="flex min-h-[60px] items-center justify-center bg-black">
      <div className="relative flex h-[20rem] w-[20rem] max-h-[30vw] max-w-[90vw] items-center justify-center">
        {/* Outer searching radius */}
        <div
          className={`absolute inset-0 rounded-full border border-zinc-800 ${
            searching ? "animate-pulse" : ""
          }`}
        />

        {/* Radar ring 1 */}
        <div
          className={`absolute inset-[8%] rounded-full border border-zinc-800 ${
            searching ? "animate-ping" : ""
          }`}
        />

        {/* Radar ring 2 */}
        <div
          className={`absolute inset-[20%] rounded-full border border-zinc-800 ${
            searching ? "animate-pulse" : ""
          }`}
        />

        {/* Radar ring 3 */}
        <div className="absolute inset-[35%] rounded-full border border-zinc-800" />

        {/* Center */}
        <div className="z-10 flex flex-col items-center justify-center">
          <div
            className={`h-5 w-5 rounded-full ${
              searching ? "bg-cyan-400 shadow-[0_0_30px_8px_rgba(34,211,238,0.5)]" : "bg-zinc-600"
            }`}
          />

          <p className="mt-5 text-lg font-medium text-white">
            {searching ? "..." : "Waiting"}
          </p>
        </div>

        {/* Player found */}
        {visible && player && (
          <div className="absolute left-[65%] top-[30%] flex flex-col items-center">
            {/* player dot */}
            <div className="relative">
              <div className="h-5 w-5 rounded-full bg-green-400 shadow-[0_0_25px_8px_rgba(74,222,128,0.35)]" />

              <div className="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-50" />
            </div>

            {/* player name */}
            <div className="mt-3 rounded-lg bg-zinc-900 px-3 py-1 text-sm text-white">
              {player.name}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}