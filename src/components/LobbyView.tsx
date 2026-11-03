'use client';

import React, { useState } from 'react';
import { RoomData, Player } from '@/lib/types';
import { Crown, Copy, Check, Share2, Swords, Users, User, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { sounds } from '@/lib/sound';

interface LobbyViewProps {
  roomData: RoomData;
  currentUser: Player | null;
  onStartDuel: () => void;
  onLeave: () => void;
}

const AVATAR_COLORS = [
  'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  'bg-amber-500/20 text-amber-400 border-amber-500/40',
  'bg-purple-500/20 text-purple-400 border-purple-500/40',
];

export default function LobbyView({
  roomData,
  currentUser,
  onStartDuel,
  onLeave,
}: LobbyViewProps) {
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  const playersList = Object.values(roomData.players || {});
  const playerCount = playersList.length;
  const isHost = currentUser?.isHost ?? false;
  const canStart = isHost && playerCount >= 2;

  const handleCopyCode = async () => {
    sounds.playClick();
    try {
      await navigator.clipboard.writeText(roomData.roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareWhatsApp = () => {
    sounds.playClick();
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const shareText = `⚔️ Duel me in CodeClash! ⚔️\nRoom Code: *${roomData.roomId}*\nJoin the arena: ${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleStartClick = () => {
    if (!canStart) return;
    sounds.playClick();
    setStarting(true);
    onStartDuel();
  };

  return (
    <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-between py-2 sm:py-4">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onLeave}
          className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors py-1.5 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>EXIT</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs font-mono bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-zinc-300">
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span>{playerCount}/4 PLAYERS</span>
        </div>
      </div>

      {/* Center Stage: Room Code & Challengers */}
      <div className="space-y-4 my-auto">
        {/* Room Code Banner */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 text-center relative overflow-hidden shadow-xl">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

          <p className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-1 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Duel Arena Code</span>
          </p>

          <div className="my-3 flex items-center justify-center gap-2">
            <span className="font-mono text-4xl sm:text-5xl font-black tracking-widest text-emerald-400 bg-zinc-950 px-4 py-2 rounded-xl border border-emerald-500/30 shadow-inner">
              {roomData.roomId}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 mt-3">
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 text-xs font-mono transition-all cursor-pointer border border-zinc-700"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">COPIED!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPY CODE</span>
                </>
              )}
            </button>

            {/* WhatsApp Share Button */}
            <button
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-mono font-semibold transition-all border border-emerald-500/40 active:scale-95 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>SHARE TO WHATSAPP</span>
            </button>
          </div>
        </div>

        {/* Players Roster */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Challengers in Room
            </span>
            <span className="text-[11px] font-mono text-zinc-500">
              {playerCount === 1 ? 'Waiting for opponent...' : 'Ready for battle'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {playersList.map((player, idx) => {
              const isCurrent = player.id === currentUser?.id;
              const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];

              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border backdrop-blur-sm transition-all ${
                    isCurrent
                      ? 'bg-zinc-900/90 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                      : 'bg-zinc-900/60 border-zinc-800'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center font-mono font-bold text-sm shrink-0 ${colorClass}`}
                  >
                    {player.handle.substring(0, 2).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold text-sm truncate text-zinc-100">
                        {player.handle}
                      </span>
                      {player.isHost && (
                        <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400/20" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-zinc-500">
                      {player.isHost ? (
                        <span className="text-amber-400 font-medium">HOST</span>
                      ) : (
                        <span>CHALLENGER</span>
                      )}
                      {isCurrent && (
                        <span className="text-emerald-400 font-bold">&bull; YOU</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty challenger slots up to 4 */}
            {Array.from({ length: Math.max(0, 4 - playerCount) }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 text-zinc-600"
              >
                <div className="w-10 h-10 rounded-xl border border-dashed border-zinc-800 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 opacity-30" />
                </div>
                <div className="text-xs font-mono text-zinc-600">
                  Waiting for player {playerCount + idx + 1}...
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="pt-4 space-y-2">
        {isHost ? (
          <div>
            <button
              onClick={handleStartClick}
              disabled={!canStart || starting}
              className={`w-full min-h-[54px] rounded-xl font-mono font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                canStart
                  ? 'bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 shadow-[0_0_25px_rgba(16,185,129,0.35)]'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              {starting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>STARTING DUEL...</span>
                </>
              ) : (
                <>
                  <Swords className="w-5 h-5" />
                  <span>{canStart ? 'START DUEL NOW' : 'WAITING FOR OPPONENT (MIN 2)'}</span>
                </>
              )}
            </button>
            {!canStart && (
              <p className="text-center text-[11px] font-mono text-zinc-500 mt-2">
                Share the code or WhatsApp link to invite your opponent!
              </p>
            )}
          </div>
        ) : (
          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-4 text-center space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Waiting for Host to start the duel...</span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Get ready! 5 rounds of rapid code reading, 15 seconds per round.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
