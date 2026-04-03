// ============================================================
// Kazakh Durak Online — Shared Game Types & Constants (v3)
// ============================================================

// --- Card Suits & Ranks ---
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANKS: Rank[] = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const RANK_ORDER: Record<string, number> = {
  '6': 0, '7': 1, '8': 2, '9': 3, '10': 4, 'J': 5, 'Q': 6, 'K': 7, 'A': 8,
};

// --- Card ---
export interface Card {
  id: string;
  suit: Suit | null;
  rank: Rank | '777';
  copy: number;
}

// --- Deck constants ---
export const COPIES_PER_CARD = 4;
export const TOTAL_NORMAL_CARDS = SUITS.length * RANKS.length * COPIES_PER_CARD; // 144
export const TOTAL_CARDS = TOTAL_NORMAL_CARDS + 1; // 145
export const HAND_SIZE = 14;
export const FIRST_TRICK_LIMIT = 13;

// --- Trump system ---
export interface TrumpInfo {
  mainTrump: Suit;
  hiddenTrump1: Suit;
  hiddenTrump2: Suit;
  currentTrump: Suit;
  phase: 1 | 2 | 3;
}

// --- Player ---
export interface Player {
  id: string;
  odId: string;
  name: string;
  hand: Card[];
  passThrough: Card[];
  isOut: boolean;
  seatIndex: number;
  isBot: boolean;
  winPlace: number | null;
}

// --- Battle pair ---
export interface BattlePair {
  attack: Card;
  defense: Card | null;
}

// --- Play direction ---
export type Direction = 'cw' | 'ccw';

// --- Game Phase ---
export type GamePhase = 'waiting' | 'dealing' | 'playing' | 'finished';

// --- Turn Phase ---
export type TurnPhase = 'attack' | 'defend' | 'addCards' | 'pickup';

// --- Room Settings ---
export interface RoomSettings {
  turnTimer: number;
  withBots: boolean;
  botCount: number;
}

// --- Game State ---
export interface GameState {
  roomId: string;
  players: Player[];
  deck1: Card[];
  deck2: Card[];
  trumpInfo: TrumpInfo;
  battleField: BattlePair[];
  discardPile: Card[];
  currentAttackerIdx: number;
  currentDefenderIdx: number;
  direction: Direction;
  turnPhase: TurnPhase;
  gamePhase: GamePhase;
  firstTrick: boolean;
  trickCount: number;
  lastPlayedRank: Rank | null;
  winnersOrder: string[];
  loserId: string | null;
  turnTimer: number;
  turnTimerMax: number;
  leadCardRank: Rank | null;
  attackerHasPriority: boolean;
  passedAttackers: string[];
  nextWinPlace: number;
  defenderTaking: boolean; // true when defender pressed "take" but attackers can still add cards
  passThroughUsedIds: string[]; // card IDs that have already been used as pass-through (one-time per card per game)
  revealedPassThroughs: { playerId: string; cards: Card[] }[]; // currently revealed pass-through cards this trick
}

// --- Room ---
export interface Room {
  id: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  players: { id: string; name: string; ready: boolean; isBot: boolean }[];
  gameState: GameState | null;
  settings: RoomSettings;
  createdAt: number;
}

// --- Hand sorting ---
export type SortMode = 'suit-rank' | 'rank-only';

// --- Socket Events ---
export interface ServerToClientEvents {
  roomList: (rooms: Room[]) => void;
  roomUpdated: (room: Room) => void;
  roomClosed: (roomId: string) => void;
  gameStarted: (state: ClientGameState) => void;
  gameStateUpdate: (state: ClientGameState) => void;
  yourTurn: (actions: AvailableAction[]) => void;
  error: (msg: string) => void;
  playerJoined: (player: { id: string; name: string }) => void;
  playerLeft: (playerId: string) => void;
  chatMessage: (msg: { from: string; text: string; ts: number }) => void;
  trumpChanged: (info: { newTrump: Suit; phase: number }) => void;
  directionChanged: (dir: Direction) => void;
  gameOver: (result: { winnersOrder: string[]; loserId: string }) => void;
  timerUpdate: (seconds: number) => void;
  transferChoice: (data: { cardIds: string[] }) => void;
  yourTurnNotification: (data: { role: 'attacker' | 'defender' | 'addCards' }) => void;
}

export interface ClientToServerEvents {
  createRoom: (data: { name: string; maxPlayers: number; settings: RoomSettings }, cb: (room: Room) => void) => void;
  joinRoom: (roomId: string, cb: (ok: boolean, room?: Room) => void) => void;
  leaveRoom: (roomId: string) => void;
  closeRoom: (roomId: string) => void;
  toggleReady: (roomId: string) => void;
  startGame: (roomId: string) => void;
  playCard: (data: { roomId: string; cardId: string; targetPairIdx?: number }) => void;
  transferCard: (data: { roomId: string; cardId: string }) => void;
  showPassThrough: (data: { roomId: string; cardId: string }) => void;
  takeCards: (roomId: string) => void;
  passTurn: (roomId: string) => void;
  endAttack: (roomId: string) => void;
  skipTurn: (roomId: string) => void;
  sendChat: (data: { roomId: string; text: string }) => void;
  rejoinRoom: (roomId: string, cb: (ok: boolean, room?: Room) => void) => void;
}

// --- Client-side game state ---
export interface ClientGameState {
  roomId: string;
  players: ClientPlayer[];
  deck1Count: number;
  deck2Count: number;
  trumpInfo: TrumpInfo;
  battleField: BattlePair[];
  discardCount: number;
  currentAttackerIdx: number;
  currentDefenderIdx: number;
  direction: Direction;
  turnPhase: TurnPhase;
  gamePhase: GamePhase;
  firstTrick: boolean;
  trickCount: number;
  myHand: Card[];
  myIndex: number;
  winnersOrder: string[];
  loserId: string | null;
  turnTimer: number;
  turnTimerMax: number;
  leadCardRank: Rank | null;
  attackerHasPriority: boolean;
  passedAttackers: string[];
  canAddCards: boolean;
  defenderTaking: boolean;
  revealedPassThroughs: { playerId: string; cards: { id: string; suit: string | null; rank: string; copy: number }[] }[]; // pass-through cards shown this trick
}

export interface ClientPlayer {
  id: string;
  name: string;
  cardCount: number;
  isOut: boolean;
  seatIndex: number;
  isBot: boolean;
  winPlace: number | null;
}

// --- Available actions ---
export type AvailableAction =
  | { type: 'playCard'; cardIds: string[] }
  | { type: 'transferCard'; cardIds: string[] }
  | { type: 'showPassThrough'; cardIds: string[] }
  | { type: 'takeCards' }
  | { type: 'passTurn' }
  | { type: 'endAttack' }
  | { type: 'skipTurn' };
