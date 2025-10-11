// Core data models for the game

export type GameStatus = 'lobby' | 'reveal' | 'active' | 'voting' | 'finished';

export type RenderMode = 'retro' | 'turbo'; // retro = HTML/CSS, turbo = React components

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

export type SabotageType = 'comic-sans' | 'rotate-180' | 'lights-off' | 'inverted-colors' | 'giant-text' | 'glitter-bomb';

export interface Sabotage {
  id: string;
  type: SabotageType;
  targetParticipantId: string;
  sourceParticipantId: string;
  timestamp: number;
}

export interface Participant {
  id: string;
  name: string;
  socketId: string;
  currentCode: {
    html?: string;  // For retro mode
    css?: string;   // For retro mode
    jsx?: string;   // For turbo mode
  };
  promptHistory: {
    prompt: string;
    timestamp: number;
  }[];
  voteCount: number;
  reactions: Record<ReactionType, number>;
  joinedAt: number;
  sabotageUsed: boolean; // Has this participant used their one sabotage?
  activeSabotages: SabotageType[]; // Current sabotages affecting this participant
}

export interface Game {
  code: string; // Primary ID - short code like "VIBE42"
  status: GameStatus;
  renderMode: RenderMode; // retro (HTML/CSS) or turbo (React components)
  targetType: 'image' | 'text'; // Type of target
  targetImageUrl?: string; // URL if targetType is 'image'
  targetText?: string; // Description if targetType is 'text'
  targetDescription?: string; // Optional instruction text (e.g., "recreate this", "build something like this")
  duration: number;
  maxPrompts: number; // Maximum number of prompts per participant
  maxCharacters: number; // Maximum characters per prompt
  sabotageMode: boolean; // Whether sabotage power-ups are enabled
  startTime: number | null;
  votingStartTime: number | null;
  createdAt: number;
  participants: Participant[];
  votes: Vote[];
  reactions: Reaction[];
  sabotages: Sabotage[]; // Track all sabotage events
  winnerId: string | null;
}

// API Request/Response types
export interface CreateGameRequest {
  renderMode: RenderMode; // retro or turbo
  targetType: 'image' | 'text';
  targetImageUrl?: string; // Required if targetType is 'image'
  targetText?: string; // Required if targetType is 'text'
  targetDescription?: string; // Optional instruction text (defaults to "recreate this")
  duration: number;
  maxPrompts?: number; // Optional max prompts per participant (default: 3)
  maxCharacters?: number; // Optional max characters per prompt (default: 1000)
  sabotageMode?: boolean; // Optional sabotage power-ups enabled (default: false)
  customCode?: string; // Optional custom game code
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
  html?: string;  // For retro mode
  css?: string;   // For retro mode
  jsx?: string;   // For turbo mode
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
  html?: string;      // For retro mode
  css?: string;       // For retro mode
  jsx?: string;       // For turbo mode
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

export interface SabotageAppliedEvent {
  targetParticipantId: string;
  sabotageType: SabotageType;
  activeSabotages: SabotageType[];
}
