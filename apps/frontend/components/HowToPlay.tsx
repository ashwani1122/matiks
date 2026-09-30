"use client";

import Image from "next/image";

const games = [
  {
    number: "01",
    title: "Math Duel",
    description:
      "Race against your opponent and solve as many questions as possible before the timer runs out.",
    image: "/math.png",
    steps: [
      "Join a match and wait for an opponent.",
      "Read the question shown on the screen.",
      "Type your answer as quickly as possible.",
      "Your answer is submitted automatically when it matches.",
      "The player with the most correct answers wins.",
    ],
  },
  {
    number: "02",
    title: "Memory Grid",
    description:
      "Memorise the highlighted pattern and reproduce it before your opponent does.",
    image: "/memory.png",
    steps: [
      "Join a match and wait for an opponent.",
      "Watch the grid carefully when the pattern appears.",
      "Remember which boxes were highlighted.",
      "Tap the correct boxes after the pattern disappears.",
      "Complete more patterns than your opponent to win.",
    ],
  },
];

export default function HowToPlay() {
  return (
    <section
      id="how-to-play"
      className="relative overflow-hidden border-t border-white/[0.06] bg-[#070b14] py-24 text-white sm:py-32"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-0 h-72 w-72 rounded-full bg-amber-400/[0.06] blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-purple-500/[0.05] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        {/* Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.06] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            How to play
          </div>

          <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
            Learn the game.
            <br />
            <span className="text-slate-500">Then beat your opponent.</span>
          </h2>

          <p className="mt-5 text-base leading-7 text-slate-500 sm:text-lg">
            Pick a game, challenge another player, and see how fast
            you can think.
          </p>
        </div>

        {/* Games */}
        <div className="space-y-20">
          {games.map((game, index) => (
            <div
              key={game.title}
              className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
                index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              {/* Image */}
              <div className="group relative">
                {/* Glow */}
                <div className="absolute -inset-4 rounded-[2rem] bg-amber-400/[0.06] opacity-0 blur-2xl transition duration-500 group-hover:opacity-100" />

                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-2 shadow-2xl shadow-black/30">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-black">
                    
                    <img src={game.image} alt="games" />
                    {/* Image overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
                      {game.title}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div>
                <div className="mb-5 text-sm font-black tracking-[0.25em] text-amber-400">
                  {game.number}
                </div>

                <h3 className="text-3xl font-black tracking-tight sm:text-4xl">
                  {game.title}
                </h3>

                <p className="mt-4 max-w-lg text-base leading-7 text-slate-500">
                  {game.description}
                </p>

                <div className="mt-8 space-y-4">
                  {game.steps.map((step, stepIndex) => (
                    <div
                      key={step}
                      className="flex items-start gap-4"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-bold text-slate-400">
                        {stepIndex + 1}
                      </div>

                      <p className="pt-0.5 text-sm leading-6 text-slate-300">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-24 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center sm:p-12">
          <div className="mx-auto max-w-xl">
            <div className="mb-4 text-3xl">⚡</div>

            <h3 className="text-2xl font-black sm:text-3xl">
              Ready to test yourself?
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Choose your game, find an opponent, and see who
              can think faster.
            </p>

            <a
              href="#games"
              className="mt-7 inline-flex rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-black text-black shadow-lg shadow-amber-400/10 transition hover:-translate-y-0.5 hover:bg-amber-300"
            >
              Play Now →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}