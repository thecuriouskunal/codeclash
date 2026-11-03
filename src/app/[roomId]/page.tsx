'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ref, onValue, update, get, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import {
  getOrCreatePlayerId,
  getStoredHandle,
  storeHandle,
  calculateScore,
  getRandomQuestionIds,
  ALL_QUESTIONS,
} from '@/lib/game';
import { sounds } from '@/lib/sound';
import { RoomData } from '@/lib/types';
import LobbyView from '@/components/LobbyView';
import PlayingView from '@/components/PlayingView';
import PodiumView from '@/components/PodiumView';
import { Terminal, Volume2, VolumeX, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = (params.roomId as string)?.toUpperCase();

  const [playerId, setPlayerId] = useState<string>('');
  const [needsHandlePrompt, setNeedsHandlePrompt] = useState<boolean>(false);
  const [promptHandleInput, setPromptHandleInput] = useState<string>('');
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [muted, setMuted] = useState<boolean>(false);

  // Refs for tracking host loop without stale closures
  const roomDataRef = useRef<RoomData | null>(null);
  roomDataRef.current = roomData;

  const revealTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialize Player and Handle
  useEffect(() => {
    if (!roomId) return;
    const pId = getOrCreatePlayerId();
    setPlayerId(pId);

    const storedH = getStoredHandle();
    if (!storedH) {
      setNeedsHandlePrompt(true);
    }
  }, [roomId]);

  // 2. Real-time Firebase Listener on /rooms/{roomId}
  useEffect(() => {
    if (!roomId) return;

    const roomRef = ref(db, `rooms/${roomId}`);
    const unsubscribe = onValue(
      roomRef,
      (snapshot) => {
        setLoading(false);
        if (snapshot.exists()) {
          const data = snapshot.val() as RoomData;
          setRoomData(data);
          setError('');
        } else {
          setError('Duel room not found or has expired.');
        }
      },
      (err) => {
        console.error('Firebase read error:', err);
        setLoading(false);
        setError('Failed to connect to the duel arena.');
      }
    );

    return () => {
      unsubscribe();
    };
  }, [roomId]);

  // 3. Sound tick on countdown
  useEffect(() => {
    if (
      roomData?.status === 'PLAYING' &&
      roomData.roundState === 'QUESTION' &&
      roomData.timeLeft > 0 &&
      roomData.timeLeft <= 4
    ) {
      sounds.playTick();
    }
  }, [roomData?.status, roomData?.roundState, roomData?.timeLeft]);

  // 4. HOST AUTHORITY ENGINE:
  // Only the player with isHost === true runs the 15-second timer interval and triggers the database write to advance currentQuestionIndex.
  useEffect(() => {
    if (!roomData || !playerId) return;

    const currentUser = roomData.players?.[playerId];
    const isHost = currentUser?.isHost ?? false;

    // Non-hosts do nothing; they purely listen to RTDB updates
    if (!isHost || roomData.status !== 'PLAYING') {
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
        revealTimeoutRef.current = null;
      }
      return;
    }

    // A. Round Question State: Countdown from 15 to 0
    if (roomData.roundState === 'QUESTION') {
      // Clear any pending reveal timer
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
        revealTimeoutRef.current = null;
      }

      // Check if all players have submitted answers
      const playersList = Object.values(roomData.players || {});
      const allAnswered =
        playersList.length > 0 &&
        playersList.every((p) => p.currentAnswer !== null && p.currentAnswer !== undefined);

      if (roomData.timeLeft <= 0 || allAnswered) {
        // Round ended! Transition to REVEAL state
        update(ref(db, `rooms/${roomId}`), {
          roundState: 'REVEAL',
          timeLeft: 0,
        }).catch(console.error);
        return;
      }

      // Decrement timer after 1000ms
      const intervalId = setTimeout(() => {
        const currentData = roomDataRef.current;
        if (!currentData || currentData.status !== 'PLAYING' || currentData.roundState !== 'QUESTION') {
          return;
        }

        const nextTime = Math.max(0, (currentData.timeLeft || 15) - 1);
        update(ref(db, `rooms/${roomId}`), {
          timeLeft: nextTime,
        }).catch(console.error);
      }, 1000);

      return () => clearTimeout(intervalId);
    }

    // B. Round Reveal State: Wait exactly 2.5 seconds, then advance or podium
    if (roomData.roundState === 'REVEAL') {
      if (!revealTimeoutRef.current) {
        revealTimeoutRef.current = setTimeout(async () => {
          revealTimeoutRef.current = null;
          const currentData = roomDataRef.current;
          if (!currentData || currentData.status !== 'PLAYING') return;

          const nextIndex = currentData.currentQuestionIndex + 1;

          if (nextIndex < 5) {
            // Advance to next round: reset answers, increment question index
            const updates: Record<string, unknown> = {
              currentQuestionIndex: nextIndex,
              roundState: 'QUESTION',
              timeLeft: 15,
            };

            Object.keys(currentData.players || {}).forEach((pId) => {
              updates[`players/${pId}/currentAnswer`] = null;
              updates[`players/${pId}/lastAnswerCorrect`] = null;
            });

            await update(ref(db, `rooms/${roomId}`), updates);
          } else {
            // All 5 rounds complete -> transition to PODIUM
            await update(ref(db, `rooms/${roomId}`), {
              status: 'PODIUM',
              roundState: 'REVEAL',
              timeLeft: 0,
            });
          }
        }, 2500);
      }

      return () => {
        if (revealTimeoutRef.current) {
          clearTimeout(revealTimeoutRef.current);
          revealTimeoutRef.current = null;
        }
      };
    }
  }, [roomData?.status, roomData?.roundState, roomData?.timeLeft, roomData?.players, roomData?.currentQuestionIndex, playerId, roomId]);

  // 5. Player Answer Selection Handler
  const handleSelectAnswer = async (optionIndex: number) => {
    if (!roomData || !playerId || roomData.status !== 'PLAYING' || roomData.roundState !== 'QUESTION') {
      return;
    }

    const currentUser = roomData.players?.[playerId];
    if (currentUser?.currentAnswer !== null && currentUser?.currentAnswer !== undefined) {
      // Already answered
      return;
    }

    const currentQuestionId = roomData.questionIds[roomData.currentQuestionIndex];
    const question = ALL_QUESTIONS.find((q) => q.id === currentQuestionId);
    if (!question) return;

    const isCorrect = question.answer === optionIndex;
    const points = isCorrect ? calculateScore(roomData.timeLeft) : 0;
    const currentScore = currentUser?.score || 0;
    const newScore = currentScore + points;

    if (isCorrect) {
      sounds.playCorrect();
    } else {
      sounds.playWrong();
    }

    // Record selection and score directly under /rooms/{roomId}/players/{playerId}
    const playerRef = ref(db, `rooms/${roomId}/players/${playerId}`);
    await update(playerRef, {
      currentAnswer: optionIndex,
      lastAnswerCorrect: isCorrect,
      score: newScore,
    });
  };

  // 6. Host starts the duel - Samples 5 unique questions without replacement
  const handleStartDuel = async () => {
    if (!roomData || !playerId) return;
    const currentUser = roomData.players?.[playerId];
    if (!currentUser?.isHost) return;

    // Pick 5 unique random questions from the 60 question pool
    const questionIds = getRandomQuestionIds(5);

    const updates: Record<string, unknown> = {
      status: 'PLAYING',
      currentQuestionIndex: 0,
      questionIds,
      roundState: 'QUESTION',
      timeLeft: 15,
    };

    // Reset player answers and scores
    Object.keys(roomData.players || {}).forEach((pId) => {
      updates[`players/${pId}/currentAnswer`] = null;
      updates[`players/${pId}/lastAnswerCorrect`] = null;
      updates[`players/${pId}/score`] = 0;
    });

    await update(ref(db, `rooms/${roomId}`), updates);
  };

  // 7. Host triggers rematch - Samples 5 new unique questions excluding previous set
  const handleRematch = async () => {
    if (!roomData || !playerId) return;
    const currentUser = roomData.players?.[playerId];
    if (!currentUser?.isHost) return;

    const previousIds = roomData.questionIds || [];
    const newQuestionIds = getRandomQuestionIds(5, previousIds);

    const updates: Record<string, unknown> = {
      status: 'PLAYING',
      currentQuestionIndex: 0,
      questionIds: newQuestionIds,
      roundState: 'QUESTION',
      timeLeft: 15,
    };

    // Reset player scores and answers
    Object.keys(roomData.players || {}).forEach((pId) => {
      updates[`players/${pId}/score`] = 0;
      updates[`players/${pId}/currentAnswer`] = null;
      updates[`players/${pId}/lastAnswerCorrect`] = null;
    });

    await update(ref(db, `rooms/${roomId}`), updates);
  };

  // 8. Join prompt submission for direct invite link clicks
  const handlePromptJoin = async () => {
    const cleanHandle = promptHandleInput.trim();
    if (!cleanHandle || cleanHandle.length < 2) return;

    storeHandle(cleanHandle);
    setNeedsHandlePrompt(false);

    try {
      const roomRef = ref(db, `rooms/${roomId}`);
      const snap = await get(roomRef);
      if (snap.exists()) {
        const data = snap.val() as RoomData;
        const isAlreadyHost = data.hostId === playerId;
        const playerRef = ref(db, `rooms/${roomId}/players/${playerId}`);
        await set(playerRef, {
          id: playerId,
          handle: cleanHandle,
          isHost: isAlreadyHost,
          score: 0,
          currentAnswer: null,
          joinedAt: Date.now(),
        });
      }
    } catch (err) {
      console.error('Error joining via direct prompt:', err);
    }
  };

  const handleLeave = () => {
    sounds.playClick();
    router.push('/');
  };

  const toggleSound = () => {
    const isNowMuted = sounds.toggleMute();
    setMuted(isNowMuted);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 font-mono">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-sm text-zinc-400">Connecting to duel arena #{roomId}...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !roomData) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 font-mono">
        <div className="max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-zinc-100">Arena Not Found</h2>
          <p className="text-xs text-zinc-400">{error || 'This duel arena does not exist.'}</p>
          <button
            onClick={handleLeave}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            RETURN TO LOBBY
          </button>
        </div>
      </div>
    );
  }

  // Handle Prompt Modal for Direct Link visitors
  if (needsHandlePrompt && (!roomData.players || !roomData.players[playerId])) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 font-mono">
        <div className="max-w-sm w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-2xl">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-emerald-400">JOIN DUEL ARENA</h2>
            <p className="text-xs text-zinc-400">Room #{roomId}</p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-wider text-zinc-400">
              Choose your Codename
            </label>
            <input
              type="text"
              maxLength={14}
              value={promptHandleInput}
              onChange={(e) => setPromptHandleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePromptJoin();
              }}
              placeholder="e.g. CodeWarrior"
              className="w-full bg-zinc-950 border border-zinc-700 focus:border-emerald-500 rounded-xl py-3 px-4 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              autoFocus
            />
          </div>

          <button
            onClick={handlePromptJoin}
            disabled={promptHandleInput.trim().length < 2}
            className="w-full min-h-[48px] bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <span>ENTER DUEL</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const currentUser = roomData.players?.[playerId] || null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-3 sm:p-5 font-sans relative overflow-hidden">
      {/* Background Cyber Grid Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.08),rgba(255,255,255,0))] pointer-events-none" />

      {/* Duel Header */}
      <header className="relative z-10 max-w-md mx-auto w-full flex items-center justify-between py-1.5 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <span className="font-mono font-bold tracking-wider text-xs text-emerald-400">
            CODE<span className="text-zinc-100">CLASH</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
            #{roomId}
          </span>
        </div>

        <button
          onClick={toggleSound}
          aria-label="Toggle sound"
          className="h-7 w-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
        </button>
      </header>

      {/* Main Dynamic View Area */}
      <main className="relative z-10 max-w-md mx-auto w-full flex-1 flex flex-col">
        {roomData.status === 'LOBBY' && (
          <LobbyView
            roomData={roomData}
            currentUser={currentUser}
            onStartDuel={handleStartDuel}
            onLeave={handleLeave}
          />
        )}

        {roomData.status === 'PLAYING' && (
          <PlayingView
            roomData={roomData}
            currentUser={currentUser}
            onSelectAnswer={handleSelectAnswer}
          />
        )}

        {roomData.status === 'PODIUM' && (
          <PodiumView
            roomData={roomData}
            currentUser={currentUser}
            onRematch={handleRematch}
            onLeave={handleLeave}
          />
        )}
      </main>

      {/* Footer info */}
      <footer className="relative z-10 max-w-md mx-auto w-full text-center py-1 text-[10px] font-mono text-zinc-600 border-t border-zinc-900">
        CodeClash Real-Time Duel Engine &bull; {roomData.status}
      </footer>
    </div>
  );
}
