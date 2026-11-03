import questionsData from '@/data/questions.json';
import { Question } from './types';

export const ALL_QUESTIONS: Question[] = questionsData as Question[];

export function getRandomQuestionIds(count: number = 5, excludeIds: number[] = []): number[] {
  let pool = ALL_QUESTIONS.map(q => q.id);
  
  if (excludeIds.length > 0) {
    const filtered = pool.filter(id => !excludeIds.includes(id));
    if (filtered.length >= count) {
      pool = filtered;
    }
  }

  // Fisher-Yates shuffle
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function getOrCreatePlayerId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem('cc_player_id');
  if (!id) {
    id = 'p_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(4);
    sessionStorage.setItem('cc_player_id', id);
  }
  return id;
}

export function getStoredHandle(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem('cc_handle') || '';
}

export function storeHandle(handle: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('cc_handle', handle.trim());
}

export function calculateScore(timeLeft: number): number {
  const validTime = Math.max(0, Math.min(15, timeLeft));
  return 100 + (validTime * 10);
}
