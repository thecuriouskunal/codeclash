'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RoomData, Player } from '@/lib/types';
import { Trophy, Crown, RotateCcw, Home, Sparkles, Medal } from 'lucide-react';
import { Instagram } from '@/components/icons/Instagram';
import { sounds } from '@/lib/sound';

interface PodiumViewProps {
  roomData: RoomData;
  currentUser: Player | null;
  onRematch: () => void;
  onLeave: () => void;
}

export default function PodiumView({
  roomData,
  currentUser,
  onRematch,
  onLeave,
}: PodiumViewProps) {
  const isHost = currentUser?.isHost ?? false;

  // Ranked players
  const playersList = Object.values(roomData.players || {});
  const rankedPlayers = [...playersList].sort((a, b) => (b.score || 0) - (a.score || 0));

  const first = rankedPlayers[0];
  const second = rankedPlayers[1];
  const third = rankedPlayers[2];

  useEffect(() => {
    // Blast confetti on victory
    sounds.playVictory();

    const end = Date.now() + 2.5 * 1000;
    const colors = ['#10b981', '#06b6d4', '#f59e0b', '#ec4899'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  return (
    <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-between py-2 sm:py-3">
      {/* Top Banner */}
      <div className="text-center space-y-1 mb-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>DUEL CONCLUDED</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-zinc-100">
          FINAL PODIUM
        </h2>
        <p className="text-[11px] font-mono text-zinc-400">
          5 rounds of rapid code reading complete!
        </p>
      </div>

      {/* Visual Podium Stage */}
      <div className="my-auto space-y-3">
        <div className="flex items-end justify-center gap-2 pt-6 pb-1 px-2">
          {/* 2nd Place */}
          {second && (
            <div className="flex flex-col items-center flex-1 max-w-[95px]">
              <div className="flex flex-col items-center mb-1.5 animate-fadeIn">
                <Medal className="w-5 h-5 text-zinc-300 drop-shadow-[0_0_8px_rgba(212,212,216,0.6)] mb-0.5" />
                <span className="font-mono font-bold text-xs truncate max-w-[85px] text-zinc-200">
                  {second.handle}
                </span>
                <span className="font-mono text-[10px] text-zinc-400 font-semibold">
                  {second.score} pts
                </span>
              </div>
              <div className="w-full h-20 bg-gradient-to-t from-zinc-800 to-zinc-700/80 rounded-t-xl border-t border-x border-zinc-600 flex items-center justify-center font-mono font-black text-xl text-zinc-300 shadow-lg">
                2
              </div>
            </div>
          )}

          {/* 1st Place (Champion) */}
          {first && (
            <div className="flex flex-col items-center flex-1 max-w-[115px] -mt-4">
              <div className="flex flex-col items-center mb-1.5 animate-bounce">
                <Crown className="w-7 h-7 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)] fill-amber-400/30 mb-0.5" />
                <span className="font-mono font-extrabold text-xs sm:text-sm truncate max-w-[105px] text-amber-300">
                  {first.handle}
                </span>
                <span className="font-mono text-[11px] text-amber-400 font-bold">
                  {first.score} pts
                </span>
              </div>
              <div className="w-full h-28 bg-gradient-to-t from-amber-950/80 to-amber-600/40 rounded-t-xl border-t-2 border-x-2 border-amber-400/80 flex flex-col items-center justify-center font-mono font-black text-3xl text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.3)] relative">
                <Trophy className="w-4 h-4 text-amber-400 mb-0.5 opacity-80" />
                <span>1</span>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {third && (
            <div className="flex flex-col items-center flex-1 max-w-[95px]">
              <div className="flex flex-col items-center mb-1.5 animate-fadeIn">
                <Medal className="w-5 h-5 text-amber-700 drop-shadow-[0_0_8px_rgba(180,83,9,0.5)] mb-0.5" />
                <span className="font-mono font-bold text-xs truncate max-w-[85px] text-zinc-300">
                  {third.handle}
                </span>
                <span className="font-mono text-[10px] text-zinc-400 font-semibold">
                  {third.score} pts
                </span>
              </div>
              <div className="w-full h-14 bg-gradient-to-t from-zinc-900 to-amber-950/40 rounded-t-xl border-t border-x border-amber-800/60 flex items-center justify-center font-mono font-black text-lg text-amber-600 shadow-md">
                3
              </div>
            </div>
          )}
        </div>

        {/* Detailed Leaderboard List */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block px-1">
            Final Standings
          </span>

          <div className="space-y-1">
            {rankedPlayers.map((player, idx) => {
              const isMe = player.id === currentUser?.id;
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-2 rounded-xl border text-xs font-mono transition-all ${
                    isMe
                      ? 'bg-zinc-800/90 border-emerald-500/50 shadow-sm'
                      : 'bg-zinc-950/60 border-zinc-850'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                        idx === 0
                          ? 'bg-amber-400 text-zinc-950'
                          : idx === 1
                          ? 'bg-zinc-300 text-zinc-950'
                          : idx === 2
                          ? 'bg-amber-700 text-zinc-100'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-semibold truncate text-zinc-200">
                      {player.handle}
                    </span>
                    {isMe && (
                      <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1 rounded border border-emerald-500/30">
                        YOU
                      </span>
                    )}
                  </div>

                  <div className="font-bold text-xs sm:text-sm font-mono text-emerald-400">
                    {player.score || 0}{' '}
                    <span className="text-[9px] text-zinc-500 font-normal">PTS</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Footer & Instagram Watermark */}
      <div className="pt-3 space-y-2">
        {isHost ? (
          <button
            onClick={() => {
              sounds.playClick();
              onRematch();
            }}
            className="w-full min-h-[48px] bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-bold font-mono text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>START REMATCH (HOST)</span>
          </button>
        ) : (
          <div className="text-center p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400">
            Waiting for host to initiate a rematch...
          </div>
        )}

        {/* Instagram Watermark directly beneath rematch button */}
        <a
          href="https://instagram.com/venturekunal"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-pink-500/50 text-[11px] font-mono text-zinc-400 hover:text-zinc-100 transition-all group shadow-sm hover:shadow-[0_0_15px_rgba(236,72,153,0.2)] cursor-pointer"
        >
          <Instagram className="w-3.5 h-3.5 text-pink-400 group-hover:scale-110 transition-transform shrink-0" />
          <span className="truncate">
            Engineered by <span className="text-zinc-200 font-semibold group-hover:text-pink-400 transition-colors">@venturekunal</span> • Share your win on IG Stories
          </span>
        </a>

        <button
          onClick={() => {
            sounds.playClick();
            onLeave();
          }}
          className="w-full min-h-[40px] bg-zinc-900/60 hover:bg-zinc-800 active:scale-[0.98] text-zinc-300 font-mono text-xs rounded-xl flex items-center justify-center gap-1.5 border border-zinc-800 transition-all cursor-pointer"
        >
          <Home className="w-3.5 h-3.5 text-zinc-400" />
          <span>EXIT TO HOME</span>
        </button>
      </div>
    </div>
  );
}
