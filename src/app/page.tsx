'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ref, get, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import { generateRoomCode, getOrCreatePlayerId, getStoredHandle, storeHandle, getRandomQuestionIds } from '@/lib/game';
import { sounds } from '@/lib/sound';
import { RoomData } from '@/lib/types';
import { Swords, Zap, Terminal, Trophy, Volume2, VolumeX, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import { Instagram } from '@/components/icons/Instagram';

export default function HomePage() {
  const router = useRouter();
  const [handle, setHandle] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const existingHandle = getStoredHandle();
    if (existingHandle) {
      setHandle(existingHandle);
    }
    getOrCreatePlayerId();
  }, []);

  const toggleSound = () => {
    const isNowMuted = sounds.toggleMute();
    setMuted(isNowMuted);
  };

  const handleCreateDuel = async () => {
    const cleanHandle = handle.trim();
    if (!cleanHandle) {
      setErrorMessage('Please enter your player handle first.');
      sounds.playWrong();
      return;
    }
    if (cleanHandle.length < 2) {
      setErrorMessage('Handle must be at least 2 characters.');
      sounds.playWrong();
      return;
    }

    setErrorMessage('');
    setIsCreating(true);
    sounds.playClick();

    try {
      storeHandle(cleanHandle);
      const playerId = getOrCreatePlayerId();
      const roomCode = generateRoomCode();
      const questionIds = getRandomQuestionIds(5);

      const newRoom: RoomData = {
        roomId: roomCode,
        createdAt: Date.now(),
        status: 'LOBBY',
        hostId: playerId,
        currentQuestionIndex: 0,
        questionIds,
        roundState: 'QUESTION',
        timeLeft: 15,
        players: {
          [playerId]: {
            id: playerId,
            handle: cleanHandle,
            isHost: true,
            score: 0,
            currentAnswer: null,
            joinedAt: Date.now(),
          },
        },
      };

      const roomRef = ref(db, `rooms/${roomCode}`);
      await set(roomRef, newRoom);

      router.push(`/${roomCode}`);
    } catch (err) {
      console.error('Error creating room:', err);
      setErrorMessage('Failed to create duel room. Check your internet connection.');
      setIsCreating(false);
    }
  };

  const handleJoinDuel = async () => {
    const cleanHandle = handle.trim();
    const cleanCode = joinCode.trim().toUpperCase();

    if (!cleanHandle) {
      setErrorMessage('Please enter your player handle first.');
      sounds.playWrong();
      return;
    }
    if (cleanHandle.length < 2) {
      setErrorMessage('Handle must be at least 2 characters.');
      sounds.playWrong();
      return;
    }
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMessage('Please enter a valid 6-character room code.');
      sounds.playWrong();
      return;
    }

    setErrorMessage('');
    setIsJoining(true);
    sounds.playClick();

    try {
      storeHandle(cleanHandle);
      const playerId = getOrCreatePlayerId();
      const roomRef = ref(db, `rooms/${cleanCode}`);
      const snapshot = await get(roomRef);

      if (!snapshot.exists()) {
        setErrorMessage('Duel room not found. Check the code and try again.');
        sounds.playWrong();
        setIsJoining(false);
        return;
      }

      const roomData = snapshot.val() as RoomData;
      const players = roomData.players || {};
      const playerCount = Object.keys(players).length;

      // If duel is already in progress and player isn't reconnecting
      if (roomData.status !== 'LOBBY' && !players[playerId]) {
        setErrorMessage('This duel has already started.');
        sounds.playWrong();
        setIsJoining(false);
        return;
      }

      // Max 4 players
      if (playerCount >= 4 && !players[playerId]) {
        setErrorMessage('Room is full (max 4 players).');
        sounds.playWrong();
        setIsJoining(false);
        return;
      }

      // Register or update player in room
      const playerRef = ref(db, `rooms/${cleanCode}/players/${playerId}`);
      await set(playerRef, {
        id: playerId,
        handle: cleanHandle,
        isHost: players[playerId]?.isHost || false,
        score: players[playerId]?.score || 0,
        currentAnswer: null,
        joinedAt: players[playerId]?.joinedAt || Date.now(),
      });

      router.push(`/${cleanCode}`);
    } catch (err) {
      console.error('Error joining room:', err);
      setErrorMessage('Failed to join duel room.');
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Background Cyber Grid Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(255,255,255,0))] pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-10 max-w-md mx-auto w-full flex items-center justify-between py-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Terminal className="w-4 h-4" />
          </div>
          <span className="font-mono font-bold tracking-wider text-sm text-emerald-400">
            CODE<span className="text-zinc-100">CLASH</span>
          </span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            v1.0
          </span>
        </div>

        <button
          onClick={toggleSound}
          aria-label="Toggle sound"
          className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </header>

      {/* Main Terminal Card */}
      <main className="relative z-10 max-w-md mx-auto w-full my-auto py-6">
        {/* Title Hero */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold mb-1 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>REAL-TIME 1v1 & 1v4 ARENA</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            CODECLASH
          </h1>
          <p className="text-zinc-400 text-sm max-w-xs mx-auto">
            Zero-login rapid coding duels. Read fast, predict outputs, conquer the leaderboard.
          </p>
        </div>

        {/* Terminal Box */}
        <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5">
          {/* Terminal prompt bar */}
          <div className="flex items-center gap-1.5 pb-3 border-b border-zinc-800 text-xs font-mono text-zinc-500">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-2 text-zinc-400">session://terminal.auth</span>
          </div>

          {/* Handle input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400">
              Player Handle
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 font-mono text-emerald-400 text-sm font-bold">
                &gt;
              </span>
              <input
                type="text"
                maxLength={14}
                value={handle}
                onChange={(e) => {
                  setHandle(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="Enter codename (e.g. ByteNinja)"
                className="w-full bg-zinc-950 border border-zinc-700 focus:border-emerald-500 rounded-xl py-3 pl-8 pr-4 text-zinc-100 placeholder-zinc-600 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono animate-fadeIn">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action 1: Create Room */}
          <button
            onClick={handleCreateDuel}
            disabled={isCreating}
            className="w-full min-h-[52px] bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60 text-zinc-950 font-bold font-mono text-sm rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
          >
            <Swords className="w-5 h-5" />
            <span>{isCreating ? 'INITIALIZING ARENA...' : 'CREATE DUEL (HOST)'}</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-zinc-800 w-full" />
            <span className="bg-zinc-900 px-3 text-xs font-mono text-zinc-500 uppercase">
              OR JOIN ARENA
            </span>
            <div className="border-t border-zinc-800 w-full" />
          </div>

          {/* Action 2: Join with Code */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase());
                  setErrorMessage('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleJoinDuel();
                }}
                placeholder="6-CHAR CODE"
                className="flex-1 bg-zinc-950 border border-zinc-700 focus:border-cyan-500 rounded-xl py-3 px-4 text-center font-mono font-bold tracking-widest text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 uppercase transition-all"
              />
              <button
                onClick={handleJoinDuel}
                disabled={isJoining || joinCode.length < 3}
                className="min-h-[52px] px-5 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] disabled:opacity-40 text-cyan-400 font-mono font-bold text-sm rounded-xl border border-zinc-700 hover:border-cyan-500/50 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>{isJoining ? 'JOINING...' : 'JOIN'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-3 gap-2 mt-6 text-center">
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 flex flex-col items-center">
            <Zap className="w-4 h-4 text-amber-400 mb-1" />
            <span className="text-[11px] font-mono text-zinc-300 font-semibold">15s Blitz</span>
            <span className="text-[9px] text-zinc-500">Rapid fire DSA</span>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 flex flex-col items-center">
            <Swords className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="text-[11px] font-mono text-zinc-300 font-semibold">1v1 & 1v4</span>
            <span className="text-[9px] text-zinc-500">Instant challenge</span>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 flex flex-col items-center">
            <Trophy className="w-4 h-4 text-cyan-400 mb-1" />
            <span className="text-[11px] font-mono text-zinc-300 font-semibold">60 Questions</span>
            <span className="text-[9px] text-zinc-500">Randomized duel</span>
          </div>
        </div>
      </main>

      {/* Footer & Instagram Badge */}
      <footer className="relative z-10 max-w-md mx-auto w-full flex flex-col items-center gap-2 py-3 text-center border-t border-zinc-900">
        <a
          href="https://instagram.com/venturekunal"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 hover:border-pink-500/50 text-zinc-400 hover:text-zinc-100 text-xs font-mono transition-all group shadow-sm hover:shadow-[0_0_15px_rgba(236,72,153,0.25)] cursor-pointer"
        >
          <Instagram className="w-3.5 h-3.5 text-pink-400 group-hover:scale-110 transition-transform" />
          <span>
            Built by <span className="text-zinc-200 font-semibold group-hover:text-pink-400 transition-colors">@venturekunal</span>
          </span>
        </a>
        <p className="text-[10px] font-mono text-zinc-600">
          CodeClash &bull; Built for competitive coders &bull; Powered by Firebase
        </p>
      </footer>
    </div>
  );
}
