export interface Question {
  id: number;
  lang: string;
  prompt: string;
  code: string;
  options: string[];
  answer: number;
}

export interface Player {
  id: string;
  handle: string;
  isHost: boolean;
  score: number;
  currentAnswer: number | null;
  lastAnswerCorrect?: boolean | null;
  joinedAt: number;
}

export type RoomStatus = 'LOBBY' | 'PLAYING' | 'PODIUM';
export type RoundState = 'QUESTION' | 'REVEAL';

export interface RoomData {
  roomId: string;
  createdAt: number;
  status: RoomStatus;
  hostId: string;
  currentQuestionIndex: number;
  questionIds: number[];
  roundState: RoundState;
  timeLeft: number;
  roundStartTime?: number;
  players: Record<string, Player>;
}
