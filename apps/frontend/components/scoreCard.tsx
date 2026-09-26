type ScoreCardProps = {
  user1: string;
  user2: string;
  score1: number;
  score2: number;
};

export default function ScoreCard({
  user1,
  user2,
  score1,
  score2,
}: ScoreCardProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900 p-4 shadow-lg">
        {/* Player 1 */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-lg font-bold text-white">
            {user1.charAt(0).toUpperCase()}
          </div>

          <span className="max-w-full truncate text-sm font-medium text-white">
            {user1}
          </span>

          <span className="text-3xl font-bold text-white">{score1}</span>
        </div>

        {/* VS */}
        <div className="text-sm font-bold text-zinc-500">VS</div>

        {/* Player 2 */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-lg font-bold text-white">
            {user2.charAt(0).toUpperCase()}
          </div>

          <span className="max-w-full truncate text-sm font-medium text-white">
            {user2}
          </span>

          <span className="text-3xl font-bold text-white">{score2}</span>
        </div>
      </div>
    </div>
  );
}
