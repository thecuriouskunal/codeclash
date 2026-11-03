'use client';

import React, { useMemo } from 'react';
import { RoomData, Player, Question } from '@/lib/types';
import { ALL_QUESTIONS } from '@/lib/game';
import { Timer, Check, X, ShieldAlert, Sparkles, CheckCircle2, Clock } from 'lucide-react';

interface PlayingViewProps {
  roomData: RoomData;
  currentUser: Player | null;
  onSelectAnswer: (optionIndex: number) => void;
}

export default function PlayingView({
  roomData,
  currentUser,
  onSelectAnswer,
}: PlayingViewProps) {
  const currentQuestionId = roomData.questionIds[roomData.currentQuestionIndex];
  const question = useMemo<Question | undefined>(() => {
    return ALL_QUESTIONS.find((q) => q.id === currentQuestionId) || ALL_QUESTIONS[0];
  }, [currentQuestionId]);

  const timeLeft = roomData.timeLeft ?? 15;
  const isReveal = roomData.roundState === 'REVEAL';
  const hasAnswered = currentUser?.currentAnswer !== null && currentUser?.currentAnswer !== undefined;
  const selectedAnswer = currentUser?.currentAnswer;

  const playersList = Object.values(roomData.players || {});
  // Sort players by score descending for HUD
  const rankedPlayers = [...playersList].sort((a, b) => (b.score || 0) - (a.score || 0));

  // Timer color calculation
  const timerPercentage = Math.max(0, Math.min(100, (timeLeft / 15) * 100));
  const timerColor =
    timeLeft > 8
      ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)]'
      : timeLeft > 4
      ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.7)]'
      : 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.9)] animate-pulse';

  const languageBadgeColor = (lang: string) => {
    switch (lang) {
      case 'C++':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'Python':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      case 'DSA':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  const optionLetters = ['A', 'B', 'C', 'D'];

  if (!question) {
    return (
      <div className="max-w-md mx-auto w-full flex items-center justify-center min-h-[400px]">
        <p className="font-mono text-zinc-500">Loading question...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-between py-2 sm:py-3">
      {/* Top HUD: Round Tracker & Score Bar */}
      <div className="space-y-2 mb-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-500">ROUND</span>
            <span className="font-bold text-emerald-400">
              {roomData.currentQuestionIndex + 1}
            </span>
            <span className="text-zinc-500">/ 5</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-right">
            <span className="text-zinc-500 text-[11px]">YOUR SCORE:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {currentUser?.score ?? 0}
            </span>
          </div>
        </div>

        {/* Real-time Opponent Tracker Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 bg-zinc-950/80 rounded-xl border border-zinc-900">
          {rankedPlayers.map((p) => {
            const isMe = p.id === currentUser?.id;
            const pAnswered = p.currentAnswer !== null && p.currentAnswer !== undefined;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-mono shrink-0 transition-all ${
                  isMe
                    ? 'bg-zinc-800 border border-emerald-500/40 text-emerald-300'
                    : 'bg-zinc-900/60 border border-zinc-800/80 text-zinc-400'
                }`}
              >
                <span className="font-semibold truncate max-w-[80px]">
                  {isMe ? 'YOU' : p.handle}
                </span>
                <span className="text-zinc-200 font-bold">{p.score || 0}</span>
                {isReveal ? (
                  p.lastAnswerCorrect ? (
                    <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                  ) : (
                    <X className="w-3 h-3 text-rose-400 stroke-[3]" />
                  )
                ) : pAnswered ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Clock className="w-3 h-3 text-zinc-600 animate-spin" />
                )}
              </div>
            );
          })}
        </div>

        {/* Synchronized Timer Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1 text-zinc-400">
              <Timer className={`w-3.5 h-3.5 ${timeLeft <= 4 ? 'text-rose-400 animate-bounce' : 'text-zinc-400'}`} />
              <span className="text-[11px] uppercase tracking-wider">
                {isReveal ? 'ROUND REVEAL' : 'TIME REMAINING'}
              </span>
            </div>
            <span
              className={`font-mono font-bold text-sm ${
                timeLeft <= 4 ? 'text-rose-400 animate-pulse' : 'text-zinc-200'
              }`}
            >
              {isReveal ? 'REVEALING' : `${timeLeft}s`}
            </span>
          </div>

          <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-linear ${timerColor}`}
              style={{ width: `${isReveal ? 100 : timerPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Center Question & Code Card */}
      <div className="space-y-2.5 my-auto">
        {/* Prompt Header */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider border ${languageBadgeColor(
              question.lang
            )}`}
          >
            {question.lang}
          </span>
          <p className="font-mono font-semibold text-xs text-zinc-300 flex-1 text-right truncate">
            {question.prompt}
          </p>
        </div>

        {/* Syntax-formatted monospace code block (bg-black/60) */}
        <div className="bg-black/60 border border-zinc-800 rounded-xl p-3 sm:p-4 font-mono text-xs sm:text-sm text-zinc-200 shadow-xl overflow-x-auto relative">
          <div className="table w-full">
            {question.code.split('\n').map((line, idx) => (
              <div key={idx} className="table-row leading-relaxed">
                <span className="table-cell pr-3 text-right text-zinc-600 select-none text-[11px] w-6">
                  {idx + 1}
                </span>
                <span className="table-cell whitespace-pre font-mono text-emerald-300/90">
                  {line}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Reveal feedback banner */}
        {isReveal && (
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-mono text-xs font-bold transition-all animate-fadeIn ${
              currentUser?.lastAnswerCorrect
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : hasAnswered
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
            }`}
          >
            {currentUser?.lastAnswerCorrect ? (
              <>
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>CORRECT! SPEED BONUS POINTS ADDED!</span>
              </>
            ) : hasAnswered ? (
              <>
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>INCORRECT! 0 POINTS THIS ROUND.</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 text-zinc-400" />
                <span>TIME RAN OUT! 0 POINTS THIS ROUND.</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* 4 Thumb-Friendly Tap Buttons (min-height 52px) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3">
        {question.options.map((optText, idx) => {
          const letter = optionLetters[idx];
          const isSelected = selectedAnswer === idx;
          const isCorrectAnswer = question.answer === idx;

          let buttonStyle = 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-100';

          if (isReveal) {
            if (isCorrectAnswer) {
              buttonStyle =
                'bg-emerald-600/30 border-emerald-500 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.4)]';
            } else if (isSelected && !isCorrectAnswer) {
              buttonStyle =
                'bg-rose-600/30 border-rose-500 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.4)]';
            } else {
              buttonStyle = 'bg-zinc-950/60 border-zinc-800/50 text-zinc-600 opacity-50';
            }
          } else if (hasAnswered) {
            if (isSelected) {
              buttonStyle =
                'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
            } else {
              buttonStyle = 'bg-zinc-950/60 border-zinc-850 text-zinc-600 opacity-60';
            }
          } else {
            buttonStyle =
              'bg-zinc-900/90 border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-800 active:scale-[0.98] text-zinc-100 cursor-pointer shadow-sm';
          }

          return (
            <button
              key={idx}
              onClick={() => {
                if (!hasAnswered && !isReveal) {
                  onSelectAnswer(idx);
                }
              }}
              disabled={hasAnswered || isReveal}
              className={`min-h-[52px] p-3 rounded-xl border flex items-center justify-between gap-3 text-left font-mono transition-all duration-150 select-none ${buttonStyle}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border ${
                    isSelected
                      ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                      : isReveal && isCorrectAnswer
                      ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}
                >
                  {letter}
                </span>
                <span className="text-xs sm:text-sm font-semibold truncate">
                  {optText}
                </span>
              </div>

              {/* Status Icons */}
              <div className="shrink-0">
                {isReveal ? (
                  isCorrectAnswer ? (
                    <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  ) : isSelected ? (
                    <X className="w-4 h-4 text-rose-400 stroke-[3]" />
                  ) : null
                ) : isSelected ? (
                  <span className="text-[10px] font-mono text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                    LOCKED
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
