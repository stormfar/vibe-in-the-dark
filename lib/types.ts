// Core data models for the game

export type GameStatus = 'lobby' | 'reveal' | 'active' | 'voting' | 'finished';

export type ReactionType = 'fire' | 'laugh' | 'think' | 'shock' | 'cool';

export interface Reaction {
  id: string;
  participantId: string;
  type: ReactionType;
  voterFingerprint: string;
  timestamp: number;
}

export interface Vote {
  id: string;
  participantId: string;
  voterFingerprint: string;
  timestamp: number;
}

export interface Participant {
  id: string;
  name: string;
  socketId: string;
  currentCode: {
    html: string;
    css: string;
  };
  promptHistory: {
    prompt: string;
    timestamp: number;
  }[];
  voteCount: number;
  reactions: Record<ReactionType, number>;
  joinedAt: number;
}

export interface Game {
  code: string; // Primary ID - short code like "VIBE42"
  status: GameStatus;
  targetType: 'image' | 'text'; // Type of target
  targetImageUrl?: string; // URL if targetType is 'image'
  targetText?: string; // Description if targetType is 'text'
  duration: number;
  maxPrompts: number; // Maximum number of prompts per participant
  maxCharacters: number; // Maximum characters per prompt
  anthropicApiKey?: string; // Optional custom API key for this game
  startTime: number | null;
  votingStartTime: number | null;
  createdAt: number;
  participants: Participant[];
  votes: Vote[];
  reactions: Reaction[];
  winnerId: string | null;
}

// API Request/Response types
export interface CreateGameRequest {
  targetType: 'image' | 'text';
  targetImageUrl?: string; // Required if targetType is 'image'
  targetText?: string; // Required if targetType is 'text'
  duration: number;
  maxPrompts?: number; // Optional max prompts per participant (default: 3)
  maxCharacters?: number; // Optional max characters per prompt (default: 1000)
  customCode?: string; // Optional custom game code
  anthropicApiKey?: string; // Optional custom Anthropic API key
}

export interface CreateGameResponse {
  gameCode: string;
  adminUrl: string;
  voterUrl: string;
}

export interface JoinGameRequest {
  gameCode: string;
  participantName: string;
}

export interface JoinGameResponse {
  gameCode: string;
  participantId: string;
  playUrl: string;
}

export interface PromptRequest {
  gameCode: string;
  participantId: string;
  prompt: string;
}

export interface PromptResponse {
  html: string;
  css: string;
}

export interface VoteRequest {
  gameCode: string;
  participantId: string;
  voterFingerprint: string;
}

export interface VoteResponse {
  success: boolean;
  newVoteCount: number;
}

export interface ReactionRequest {
  gameCode: string;
  participantId: string;
  reactionType: ReactionType;
  voterFingerprint: string;
}

export interface ReactionResponse {
  success: boolean;
  reactions: Record<ReactionType, number>;
}

// WebSocket Event types
export interface GameStatusUpdateEvent {
  status: GameStatus;
  startTime: number | null;
  timeRemaining: number;
}

export interface ParticipantJoinedEvent {
  participant: {
    id: string;
    name: string;
  };
}

export interface PreviewUpdateEvent {
  participantId: string;
  html: string;
  css: string;
  promptCount: number;
}

export interface VoteUpdateEvent {
  participantId: string;
  voteCount: number;
}

export interface ReactionUpdateEvent {
  participantId: string;
  reactions: Record<ReactionType, number>;
}

export interface WinnerDeclaredEvent {
  winnerId: string;
  finalStandings: {
    participantId: string;
    name: string;
    voteCount: number;
  }[];
}

export interface GameJoinPayload {
  gameCode: string;
  participantId: string;
}

export interface PromptSubmitPayload {
  gameCode: string;
  participantId: string;
  prompt: string;
}
