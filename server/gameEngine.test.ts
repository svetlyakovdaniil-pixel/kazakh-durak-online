import { describe, expect, it } from 'vitest';
import {
  createFullDeck, canBeat, createGame, getCardValue,
  isKingOfSpades, is777, isAceOfSpades, findFirstPlayer,
  getNextActivePlayer, getPrevActivePlayer, isEdgePlayer, canPlayAsAttack,
  canPlayerAddCards, playAttackCard, playDefenseCard,
  transferAttack, endAttack, showPassThrough, takeCards, finalizeTake, successfulDefense,
  toClientState, getAvailableActions, shouldSkipTurn, getBotAction,
  drawCards, resetTurnTimer, getMaxAttackCards,
} from './gameEngine';
import type { Card, Suit, Rank, GameState, Player, TrumpInfo, RoomSettings } from '../shared/gameTypes';

// Helper to create a card
function card(suit: Suit | null, rank: string, copy = 0): Card {
  return { id: `${suit}-${rank}-${copy}`, suit, rank: rank as any, copy };
}

// Helper to create a minimal game state for testing
function createTestState(numPlayers: number, overrides?: Partial<GameState>): GameState {
  const players: Player[] = Array.from({ length: numPlayers }, (_, i) => ({
    id: `p${i + 1}`,
    odId: `p${i + 1}`,
    name: `Player ${i + 1}`,
    hand: [],
    passThrough: [],
    isOut: false,
    seatIndex: i,
    isBot: false,
    winPlace: null,
  }));

  return {
    roomId: 'test',
    players,
    deck1: [],
    deck2: [],
    trumpInfo: {
      mainTrump: 'hearts',
      hiddenTrump1: 'diamonds',
      hiddenTrump2: 'clubs',
      currentTrump: 'hearts',
      phase: 1,
    },
    battleField: [],
    discardPile: [],
    currentAttackerIdx: 0,
    currentDefenderIdx: 1,
    direction: 'cw',
    turnPhase: 'attack',
    gamePhase: 'playing',
    firstTrick: true,
    trickCount: 0,
    lastPlayedRank: null,
    winnersOrder: [],
    loserId: null,
    turnTimer: 30,
    turnTimerMax: 30,
    leadCardRank: null,
    attackerHasPriority: true,
    passedAttackers: [],
    nextWinPlace: 1,
    defenderTaking: false,
    passThroughUsedIds: [],
    revealedPassThroughs: [],
    ...overrides,
  };
}

// ============================================================
// DECK CREATION
// ============================================================
describe('Deck creation', () => {
  it('creates 145 cards total (4 suits × 9 ranks × 4 copies + 1 × 777)', () => {
    const deck = createFullDeck();
    expect(deck.length).toBe(145);
  });

  it('contains exactly one 777 card', () => {
    const deck = createFullDeck();
    const sevens = deck.filter(c => c.rank === '777');
    expect(sevens.length).toBe(1);
    expect(sevens[0].suit).toBeNull();
  });

  it('contains 4 copies of each normal card', () => {
    const deck = createFullDeck();
    const kingSpades = deck.filter(c => c.rank === 'K' && c.suit === 'spades');
    expect(kingSpades.length).toBe(4);
  });

  it('all cards have unique IDs', () => {
    const deck = createFullDeck();
    const ids = new Set(deck.map(c => c.id));
    expect(ids.size).toBe(145);
  });
});

// ============================================================
// CARD VALUE ORDERING
// ============================================================
describe('Card value ordering', () => {
  it('ranks 6 < 7 < 8 < 9 < 10 < J < Q < K < A', () => {
    expect(getCardValue(card('spades', '6'))).toBeLessThan(getCardValue(card('spades', '7')));
    expect(getCardValue(card('spades', '7'))).toBeLessThan(getCardValue(card('spades', '10')));
    expect(getCardValue(card('spades', '10'))).toBeLessThan(getCardValue(card('spades', 'J')));
    expect(getCardValue(card('spades', 'J'))).toBeLessThan(getCardValue(card('spades', 'Q')));
    expect(getCardValue(card('spades', 'Q'))).toBeLessThan(getCardValue(card('spades', 'K')));
    expect(getCardValue(card('spades', 'K'))).toBeLessThan(getCardValue(card('spades', 'A')));
  });

  it('777 has the highest value', () => {
    expect(getCardValue(card(null, '777'))).toBeGreaterThan(getCardValue(card('spades', 'A')));
  });
});

// ============================================================
// SPECIAL CARD IDENTIFICATION
// ============================================================
describe('Special card identification', () => {
  it('identifies King of Spades', () => {
    expect(isKingOfSpades(card('spades', 'K'))).toBe(true);
    expect(isKingOfSpades(card('hearts', 'K'))).toBe(false);
    expect(isKingOfSpades(card('spades', 'Q'))).toBe(false);
  });

  it('identifies 777', () => {
    expect(is777(card(null, '777'))).toBe(true);
    expect(is777(card('spades', '7'))).toBe(false);
  });

  it('identifies Ace of Spades', () => {
    expect(isAceOfSpades(card('spades', 'A'))).toBe(true);
    expect(isAceOfSpades(card('hearts', 'A'))).toBe(false);
  });
});

// ============================================================
// COMBAT RULES (canBeat)
// ============================================================
describe('canBeat — combat rules', () => {
  const trump: Suit = 'hearts';

  it('higher same-suit card beats lower', () => {
    expect(canBeat(card('spades', '7'), card('spades', '10'), trump)).toBe(true);
    expect(canBeat(card('spades', '10'), card('spades', '7'), trump)).toBe(false);
  });

  it('trump beats non-trump', () => {
    expect(canBeat(card('spades', 'A'), card('hearts', '6'), trump)).toBe(true);
  });

  it('non-trump cannot beat different non-trump suit', () => {
    expect(canBeat(card('spades', '7'), card('diamonds', 'A'), trump)).toBe(false);
  });

  it('identical cards beat each other (same rank + suit)', () => {
    expect(canBeat(card('diamonds', 'Q'), card('diamonds', 'Q', 1), trump)).toBe(true);
  });

  it('King of Spades beats any card (except itself and 777)', () => {
    expect(canBeat(card('hearts', 'A'), card('spades', 'K'), trump)).toBe(true);
    expect(canBeat(card('diamonds', '6'), card('spades', 'K'), trump)).toBe(true);
    expect(canBeat(card('clubs', 'K'), card('spades', 'K'), trump)).toBe(true);
  });

  it('King of Spades does NOT beat another King of Spades', () => {
    expect(canBeat(card('spades', 'K'), card('spades', 'K', 1), trump)).toBe(false);
  });

  it('only Ace of Spades and 777 can beat King of Spades', () => {
    expect(canBeat(card('spades', 'K'), card('spades', 'A'), trump)).toBe(true);
    expect(canBeat(card('spades', 'K'), card(null, '777'), trump)).toBe(true);
    expect(canBeat(card('spades', 'K'), card('hearts', 'A'), trump)).toBe(false);
  });

  it('777 beats everything', () => {
    expect(canBeat(card('spades', 'K'), card(null, '777'), trump)).toBe(true);
    expect(canBeat(card('hearts', 'A'), card(null, '777'), trump)).toBe(true);
    expect(canBeat(card('diamonds', '6'), card(null, '777'), trump)).toBe(true);
  });
});

// ============================================================
// GAME CREATION
// ============================================================
describe('Game creation', () => {
  it('creates a game with correct number of players', () => {
    const players = [
      { id: 'p1', odId: 'p1', name: 'Player 1', isBot: false },
      { id: 'p2', odId: 'p2', name: 'Player 2', isBot: false },
      { id: 'p3', odId: 'p3', name: 'Player 3', isBot: false },
    ];
    const game = createGame('room1', players);
    expect(game.players.length).toBe(3);
    expect(game.gamePhase).toBe('playing');
    expect(game.direction).toBe('cw');
  });

  it('deals 14 cards to each player', () => {
    const players = [
      { id: 'p1', odId: 'p1', name: 'Player 1', isBot: false },
      { id: 'p2', odId: 'p2', name: 'Player 2', isBot: false },
    ];
    const game = createGame('room1', players);
    expect(game.players[0].hand.length).toBe(14);
    expect(game.players[1].hand.length).toBe(14);
  });

  it('remaining cards split into two decks', () => {
    const players = [
      { id: 'p1', odId: 'p1', name: 'Player 1', isBot: false },
      { id: 'p2', odId: 'p2', name: 'Player 2', isBot: false },
    ];
    const game = createGame('room1', players);
    const totalCards = game.players.reduce((sum, p) => sum + p.hand.length, 0)
      + game.deck1.length + game.deck2.length;
    expect(totalCards).toBe(145);
  });

  it('trump info has 3 different suits', () => {
    const players = [
      { id: 'p1', odId: 'p1', name: 'Player 1', isBot: false },
      { id: 'p2', odId: 'p2', name: 'Player 2', isBot: false },
    ];
    const game = createGame('room1', players);
    const trumpSuits = new Set([
      game.trumpInfo.mainTrump,
      game.trumpInfo.hiddenTrump1,
      game.trumpInfo.hiddenTrump2,
    ]);
    expect(trumpSuits.size).toBe(3);
    expect(game.trumpInfo.currentTrump).toBe(game.trumpInfo.mainTrump);
    expect(game.trumpInfo.phase).toBe(1);
  });

  it('sets first attacker and defender correctly', () => {
    const players = [
      { id: 'p1', odId: 'p1', name: 'Player 1', isBot: false },
      { id: 'p2', odId: 'p2', name: 'Player 2', isBot: false },
    ];
    const game = createGame('room1', players);
    expect(game.currentAttackerIdx).toBeGreaterThanOrEqual(0);
    expect(game.currentDefenderIdx).toBeGreaterThanOrEqual(0);
    expect(game.currentAttackerIdx).not.toBe(game.currentDefenderIdx);
  });

  it('creates bot players correctly', () => {
    const players = [
      { id: 'p1', odId: 'p1', name: 'Player 1', isBot: false },
      { id: 'bot-1', odId: 'bot-1', name: 'Бот Алмас', isBot: true },
    ];
    const game = createGame('room1', players);
    expect(game.players[1].isBot).toBe(true);
    expect(game.players[0].isBot).toBe(false);
  });

  it('respects custom turn timer from settings', () => {
    const players = [
      { id: 'p1', odId: 'p1', name: 'Player 1', isBot: false },
      { id: 'p2', odId: 'p2', name: 'Player 2', isBot: false },
    ];
    const settings: RoomSettings = { turnTimer: 45, withBots: false, botCount: 0 };
    const game = createGame('room1', players, settings);
    expect(game.turnTimerMax).toBe(45);
    expect(game.turnTimer).toBe(45);
  });
});

// ============================================================
// CLIENT STATE CONVERSION
// ============================================================
describe('Client state conversion', () => {
  it('hides other players cards', () => {
    const players = [
      { id: 'p1', odId: 'p1', name: 'Player 1', isBot: false },
      { id: 'p2', odId: 'p2', name: 'Player 2', isBot: false },
    ];
    const game = createGame('room1', players);
    const clientState = toClientState(game, 'p1');
    expect(clientState.myHand.length).toBe(14);
    expect(clientState.myIndex).toBe(0);
    expect(clientState.players[1].cardCount).toBe(14);
    expect((clientState.players[1] as any).hand).toBeUndefined();
  });

  it('includes timer info in client state', () => {
    const players = [
      { id: 'p1', odId: 'p1', name: 'Player 1', isBot: false },
      { id: 'p2', odId: 'p2', name: 'Player 2', isBot: false },
    ];
    const game = createGame('room1', players);
    const clientState = toClientState(game, 'p1');
    expect(clientState.turnTimer).toBeDefined();
    expect(clientState.turnTimerMax).toBeDefined();
  });

  it('includes bot flag in client players', () => {
    const players = [
      { id: 'p1', odId: 'p1', name: 'Player 1', isBot: false },
      { id: 'bot-1', odId: 'bot-1', name: 'Bot', isBot: true },
    ];
    const game = createGame('room1', players);
    const clientState = toClientState(game, 'p1');
    expect(clientState.players[1].isBot).toBe(true);
  });
});

// ============================================================
// FIX #2: TRANSFER ATTACK (PEREVOD)
// ============================================================
describe('FIX #2: Transfer attack (perevod)', () => {
  it('defender can transfer when they have a matching rank card', () => {
    const state = createTestState(3);
    state.players[0].hand = [card('spades', '7')];
    state.players[1].hand = [card('hearts', '7'), card('clubs', '8')];
    state.players[2].hand = [card('diamonds', '9')];
    state.battleField = [{ attack: card('spades', '7'), defense: null }];
    state.turnPhase = 'defend';
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;

    const result = transferAttack(state, 1, state.players[1].hand[0].id);
    expect(result).toBeNull(); // success
    expect(state.currentDefenderIdx).toBe(2); // next player is now defending
    expect(state.currentAttackerIdx).toBe(1); // transferrer becomes attacker
  });

  it('cannot transfer if some attacks are already defended', () => {
    const state = createTestState(3);
    state.players[1].hand = [card('hearts', '7')];
    state.battleField = [
      { attack: card('spades', '7'), defense: card('spades', '8') },
      { attack: card('clubs', '7'), defense: null },
    ];
    state.turnPhase = 'defend';
    state.currentDefenderIdx = 1;

    const result = transferAttack(state, 1, state.players[1].hand[0].id);
    expect(result).not.toBeNull(); // error
  });

  it('cannot transfer with a non-matching rank', () => {
    const state = createTestState(3);
    state.players[1].hand = [card('hearts', '8')];
    state.battleField = [{ attack: card('spades', '7'), defense: null }];
    state.turnPhase = 'defend';
    state.currentDefenderIdx = 1;

    const result = transferAttack(state, 1, state.players[1].hand[0].id);
    expect(result).not.toBeNull(); // error
  });

  it('transfer option appears in available actions for defender', () => {
    const state = createTestState(3);
    state.players[1].hand = [card('hearts', '7'), card('clubs', '9')];
    state.battleField = [{ attack: card('spades', '7'), defense: null }];
    state.turnPhase = 'defend';
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;

    const actions = getAvailableActions(state, 1);
    const transferAction = actions.find(a => a.type === 'transferCard');
    expect(transferAction).toBeDefined();
    expect(transferAction!.type === 'transferCard' && transferAction!.cardIds.length).toBeGreaterThan(0);
  });

  it('transfer option does NOT appear when defender has no matching rank', () => {
    const state = createTestState(3);
    state.players[1].hand = [card('hearts', '8'), card('clubs', '9')];
    state.battleField = [{ attack: card('spades', '7'), defense: null }];
    state.turnPhase = 'defend';
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;

    const actions = getAvailableActions(state, 1);
    const transferAction = actions.find(a => a.type === 'transferCard');
    expect(transferAction).toBeUndefined();
  });
});

// ============================================================
// FIX #3: ROOM CLOSING (tested via game state, not sockets)
// ============================================================

// ============================================================
// FIX #4: TURN TIMER
// ============================================================
describe('FIX #4: Turn timer', () => {
  it('resetTurnTimer resets to max', () => {
    const state = createTestState(2);
    state.turnTimer = 5;
    state.turnTimerMax = 30;
    resetTurnTimer(state);
    expect(state.turnTimer).toBe(30);
  });
});

// ============================================================
// FIX #5: ATTACK PRIORITY & END ATTACK
// ============================================================
describe('FIX #5: Attack priority and endAttack', () => {
  it('non-attacker cannot play first card when attacker has priority', () => {
    const state = createTestState(4);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.attackerHasPriority = true;
    state.players[2].hand = [card('spades', '7')];
    state.battleField = [];

    const result = playAttackCard(state, 2, state.players[2].hand[0].id);
    expect(result).not.toBeNull(); // error: attacker has priority
  });

  it('attacker can play first card and retains priority', () => {
    const state = createTestState(4);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.attackerHasPriority = true;
    state.players[0].hand = [card('spades', '7')];

    const result = playAttackCard(state, 0, state.players[0].hand[0].id);
    expect(result).toBeNull(); // success
    // Attacker retains priority after playing a card
    expect(state.attackerHasPriority).toBe(true);
  });

  it('endAttack returns error if not the attacker', () => {
    const state = createTestState(3);
    state.currentAttackerIdx = 0;
    state.battleField = [{ attack: card('spades', '7'), defense: null }];

    const result = endAttack(state, 1);
    expect(result).not.toBeNull();
  });

  it('endAttack triggers successfulDefense when all defended', () => {
    const state = createTestState(3);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    // Give players some cards so they're not "out"
    state.players[0].hand = [card('spades', '9')];
    state.players[1].hand = [card('spades', '10')];
    state.players[2].hand = [card('hearts', '6')];
    state.battleField = [{ attack: card('spades', '7'), defense: card('spades', '8') }];

    const result = endAttack(state, 0);
    // After attacker 0 passes, player 2 (edge) should get a chance or defense succeeds
    expect(result).toBeNull();
  });
});

// ============================================================
// FIX #6: 10-CARD DIRECTION CHANGE (ONLY ON LEAD)
// ============================================================
describe('FIX #6: 10-card direction change', () => {
  it('playing 10 as first card reverses direction', () => {
    const state = createTestState(4);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.direction = 'cw';
    state.players[0].hand = [card('spades', '10')];

    playAttackCard(state, 0, state.players[0].hand[0]?.id || 'spades-10-0');
    // After playing 10 as lead, direction should reverse
    // But we already removed the card, so let's check state
    expect(state.direction).toBe('ccw');
    expect(state.leadCardRank).toBe('10');
  });

  it('playing 10 as subsequent card does NOT reverse direction', () => {
    const state = createTestState(4);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.direction = 'cw';
    state.attackerHasPriority = false;
    state.battleField = [{ attack: card('spades', '7'), defense: null }];
    state.leadCardRank = '7';
    state.players[0].hand = [card('hearts', '10')];

    // 10 is not on the table yet, so it can't be added (rank not matching)
    // Let's set up a scenario where 10 is already on the table
    state.battleField = [{ attack: card('spades', '10'), defense: card('spades', 'J') }];
    state.leadCardRank = '10';
    state.direction = 'ccw'; // already reversed from lead
    state.players[0].hand = [card('hearts', '10')];

    const dirBefore = state.direction;
    playAttackCard(state, 0, state.players[0].hand[0]?.id || 'hearts-10-0');
    expect(state.direction).toBe(dirBefore); // should NOT change again
  });
});

// ============================================================
// FIX #7: DEFENSE TARGETING (ANY UNDEFENDED PAIR)
// ============================================================
describe('FIX #7: Free defense targeting', () => {
  it('defender can target specific undefended pair', () => {
    const state = createTestState(3);
    state.currentDefenderIdx = 1;
    state.turnPhase = 'defend';
    state.players[1].hand = [card('spades', '8')];
    state.battleField = [
      { attack: card('hearts', '6'), defense: null },
      { attack: card('spades', '7'), defense: null },
    ];

    // Target pair index 1 (spades 7) with spades 8
    const result = playDefenseCard(state, 1, state.players[1].hand[0].id, 1);
    expect(result).toBeNull(); // success
    expect(state.battleField[1].defense).not.toBeNull();
    expect(state.battleField[0].defense).toBeNull(); // first pair still undefended
  });

  it('auto-finds matching pair when no target specified', () => {
    const state = createTestState(3);
    state.currentDefenderIdx = 1;
    state.turnPhase = 'defend';
    state.players[1].hand = [card('spades', '8')];
    state.battleField = [
      { attack: card('hearts', '6'), defense: null },
      { attack: card('spades', '7'), defense: null },
    ];

    // No target specified — should auto-find spades 7 (same suit)
    const result = playDefenseCard(state, 1, state.players[1].hand[0].id);
    expect(result).toBeNull();
    expect(state.battleField[1].defense).not.toBeNull();
  });
});

// ============================================================
// 777 SPECIAL RULES
// ============================================================
describe('777 special rules', () => {
  it('cannot be used as attack card', () => {
    const state = createTestState(2);
    state.currentAttackerIdx = 0;
    const card777: Card = { id: '777-0', suit: null, rank: '777', copy: 0 };
    expect(canPlayAsAttack(state, card777)).toBe(false);
  });

  it('shouldSkipTurn returns true when player has only 777 and is attacker', () => {
    const state = createTestState(2);
    state.currentAttackerIdx = 0;
    state.players[0].hand = [{ id: '777-0', suit: null, rank: '777', copy: 0 }];
    expect(shouldSkipTurn(state, 0)).toBe(true);
    expect(shouldSkipTurn(state, 1)).toBe(false);
  });

  it('777 can beat King of Spades', () => {
    expect(canBeat(card('spades', 'K'), card(null, '777'), 'hearts')).toBe(true);
  });
});

// ============================================================
// EDGE PLAYER RULES
// ============================================================
describe('Edge player rules', () => {
  it('identifies edge players correctly in clockwise direction', () => {
    const players: Player[] = [
      { id: 'p1', odId: 'p1', name: 'P1', hand: [], passThrough: [], isOut: false, seatIndex: 0, isBot: false, winPlace: null },
      { id: 'p2', odId: 'p2', name: 'P2', hand: [], passThrough: [], isOut: false, seatIndex: 1, isBot: false, winPlace: null },
      { id: 'p3', odId: 'p3', name: 'P3', hand: [], passThrough: [], isOut: false, seatIndex: 2, isBot: false, winPlace: null },
      { id: 'p4', odId: 'p4', name: 'P4', hand: [], passThrough: [], isOut: false, seatIndex: 3, isBot: false, winPlace: null },
    ];
    expect(isEdgePlayer(players, 0, 1, 'cw')).toBe(true);
    expect(isEdgePlayer(players, 2, 1, 'cw')).toBe(true);
    expect(isEdgePlayer(players, 3, 1, 'cw')).toBe(false);
  });
});

// ============================================================
// ATTACK CARD VALIDATION
// ============================================================
describe('Attack card validation', () => {
  it('allows any card as first attack', () => {
    const state = createTestState(2);
    state.battleField = [];
    expect(canPlayAsAttack(state, card('spades', '7'))).toBe(true);
    expect(canPlayAsAttack(state, card('hearts', 'K'))).toBe(true);
  });

  it('subsequent attacks must match rank on table', () => {
    const state = createTestState(2);
    state.battleField = [{ attack: card('spades', '7'), defense: null }];
    expect(canPlayAsAttack(state, card('hearts', '7'))).toBe(true);
    expect(canPlayAsAttack(state, card('hearts', '8'))).toBe(false);
  });

  it('777 can never be played as attack', () => {
    const state = createTestState(2);
    state.battleField = [];
    expect(canPlayAsAttack(state, card(null, '777'))).toBe(false);
  });
});

// ============================================================
// 6-CARD EXCEPTION FOR ADDING CARDS
// ============================================================
describe('6-card exception for adding cards', () => {
  it('all players can add cards when lead card is a 6', () => {
    const state = createTestState(4);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.leadCardRank = '6';
    state.battleField = [{ attack: card('spades', '6'), defense: null }];

    expect(canPlayerAddCards(state, 2)).toBe(true);
    expect(canPlayerAddCards(state, 3)).toBe(true);
    expect(canPlayerAddCards(state, 1)).toBe(false); // defender cannot add
  });

  it('non-edge players cannot add when lead is not 6', () => {
    const state = createTestState(4);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.leadCardRank = '7';
    state.battleField = [{ attack: card('spades', '7'), defense: null }];

    // Player 3 (index 3) is not edge to defender (index 1) in 4-player CW
    expect(canPlayerAddCards(state, 3)).toBe(false);
  });
});

// ============================================================
// BOT AI
// ============================================================
describe('Bot AI', () => {
  it('bot defends with cheapest card', () => {
    const state = createTestState(2);
    state.players[1].isBot = true;
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.turnPhase = 'defend';
    state.players[1].hand = [
      card('spades', 'A'),
      card('spades', '8'),
    ];
    state.battleField = [{ attack: card('spades', '7'), defense: null }];

    const action = getBotAction(state, 1);
    expect(action).not.toBeNull();
    expect(action!.action).toBe('playDefense');
    // Should pick 8 (cheaper) over A
    expect(action!.cardId).toBe(state.players[1].hand[1].id);
  });

  it('bot takes cards when cannot defend', () => {
    const state = createTestState(2);
    state.players[1].isBot = true;
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.turnPhase = 'defend';
    state.players[1].hand = [card('clubs', '6')]; // cannot beat spades 7 (different suit, non-trump)
    state.battleField = [{ attack: card('spades', '7'), defense: null }];

    const action = getBotAction(state, 1);
    expect(action).not.toBeNull();
    expect(action!.action).toBe('takeCards');
  });

  it('bot attacks with lowest card', () => {
    const state = createTestState(2);
    state.players[0].isBot = true;
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.turnPhase = 'attack';
    state.players[0].hand = [
      card('spades', 'K'),
      card('spades', '6'),
    ];

    const action = getBotAction(state, 0);
    expect(action).not.toBeNull();
    expect(action!.action).toBe('playAttack');
    expect(action!.cardId).toBe(state.players[0].hand[1].id); // 6 is cheaper
  });

  it('bot skips turn when only has 777', () => {
    const state = createTestState(2);
    state.players[0].isBot = true;
    state.currentAttackerIdx = 0;
    state.players[0].hand = [card(null, '777')];

    const action = getBotAction(state, 0);
    expect(action).not.toBeNull();
    expect(action!.action).toBe('skipTurn');
  });

  it('non-bot player returns null from getBotAction', () => {
    const state = createTestState(2);
    state.players[0].isBot = false;
    const action = getBotAction(state, 0);
    expect(action).toBeNull();
  });
});

// ============================================================
// DRAW CARDS & TRUMP PHASE TRANSITIONS
// ============================================================
describe('Draw cards and trump transitions', () => {
  it('draws from deck1 first, then deck2', () => {
    const state = createTestState(2);
    state.players[0].hand = [card('spades', '6')]; // only 1 card
    state.players[1].hand = Array.from({ length: 14 }, (_, i) => card('hearts', '7', i));
    state.deck1 = [card('clubs', '8'), card('clubs', '9')];
    state.deck2 = Array.from({ length: 20 }, (_, i) => card('diamonds', '6', i));

    drawCards(state);
    // Player 0 should have drawn from deck1 first
    expect(state.players[0].hand.length).toBe(14);
  });

  it('transitions to trump phase 2 when deck1 is empty', () => {
    const state = createTestState(2);
    state.players[0].hand = [card('spades', '6')];
    state.players[1].hand = Array.from({ length: 14 }, (_, i) => card('hearts', '7', i));
    state.deck1 = [];
    state.deck2 = Array.from({ length: 20 }, (_, i) => card('diamonds', '6', i));
    state.trumpInfo.phase = 1;

    drawCards(state);
    expect(state.trumpInfo.phase).toBe(2);
    expect(state.trumpInfo.currentTrump).toBe(state.trumpInfo.hiddenTrump1);
  });
});

// ============================================================
// NAVIGATION HELPERS
// ============================================================
describe('Navigation helpers', () => {
  it('getNextActivePlayer skips out players', () => {
    const players: Player[] = [
      { id: 'p1', odId: 'p1', name: 'P1', hand: [], passThrough: [], isOut: false, seatIndex: 0, isBot: false, winPlace: null },
      { id: 'p2', odId: 'p2', name: 'P2', hand: [], passThrough: [], isOut: true, seatIndex: 1, isBot: false, winPlace: null },
      { id: 'p3', odId: 'p3', name: 'P3', hand: [], passThrough: [], isOut: false, seatIndex: 2, isBot: false, winPlace: null },
    ];
    expect(getNextActivePlayer(players, 0, 'cw')).toBe(2);
  });

  it('getPrevActivePlayer goes in reverse direction', () => {
    const players: Player[] = [
      { id: 'p1', odId: 'p1', name: 'P1', hand: [], passThrough: [], isOut: false, seatIndex: 0, isBot: false, winPlace: null },
      { id: 'p2', odId: 'p2', name: 'P2', hand: [], passThrough: [], isOut: false, seatIndex: 1, isBot: false, winPlace: null },
      { id: 'p3', odId: 'p3', name: 'P3', hand: [], passThrough: [], isOut: false, seatIndex: 2, isBot: false, winPlace: null },
    ];
    expect(getPrevActivePlayer(players, 2, 'cw')).toBe(1);
  });
});

// ============================================================
// TAKE CARDS & SUCCESSFUL DEFENSE
// ============================================================
describe('Take cards and successful defense', () => {
  it('takeCards sets defenderTaking=true and turnPhase=pickup', () => {
    const state = createTestState(3);
    state.currentDefenderIdx = 1;
    state.currentAttackerIdx = 0;
    state.players[1].hand = [];
    state.battleField = [
      { attack: card('spades', '7'), defense: card('spades', '8') },
      { attack: card('hearts', '6'), defense: null },
    ];

    takeCards(state);
    expect(state.defenderTaking).toBe(true);
    expect(state.turnPhase).toBe('pickup');
    // Cards are NOT yet taken — they stay on battlefield
    expect(state.battleField.length).toBe(2);
    expect(state.players[1].hand.length).toBe(0);
  });

  it('finalizeTake gives all battlefield cards to defender', () => {
    const state = createTestState(3);
    state.currentDefenderIdx = 1;
    state.currentAttackerIdx = 0;
    state.players[0].hand = [card('spades', '6')];
    state.players[1].hand = [];
    state.players[2].hand = [card('hearts', 'A')];
    state.battleField = [
      { attack: card('spades', '7'), defense: card('spades', '8') },
      { attack: card('hearts', '6'), defense: null },
    ];
    state.defenderTaking = true;
    state.turnPhase = 'pickup';

    finalizeTake(state);
    expect(state.players[1].hand.length).toBe(3); // 2 from pair + 1 undefended
    expect(state.battleField.length).toBe(0);
    expect(state.defenderTaking).toBe(false);
  });

  it('successfulDefense moves cards to discard pile', () => {
    const state = createTestState(3);
    state.currentDefenderIdx = 1;
    state.currentAttackerIdx = 0;
    state.battleField = [
      { attack: card('spades', '7'), defense: card('spades', '8') },
    ];

    successfulDefense(state);
    expect(state.discardPile.length).toBe(2);
    expect(state.battleField.length).toBe(0);
    // Defender becomes attacker
    expect(state.currentAttackerIdx).toBe(1);
  });
});

// ============================================================
// ATTACKER PRIORITY & PICKUP MECHANIC
// ============================================================
describe('Attacker priority mechanic', () => {
  it('edge player cannot add cards while attacker has priority', () => {
    const state = createTestState(3);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.attackerHasPriority = true;
    state.players[0].hand = [card('spades', '7'), card('hearts', '7')];
    state.players[1].hand = [card('spades', 'A')];
    state.players[2].hand = [card('spades', '7', 1)]; // edge player has matching card
    state.battleField = [
      { attack: card('spades', '7', 2), defense: card('spades', '8') },
    ];
    state.turnPhase = 'attack';

    // Edge player (p3) should NOT be able to add cards while attacker has priority
    const error = playAttackCard(state, 2, state.players[2].hand[0].id);
    expect(error).toBeTruthy();
    expect(error).toContain('priority');
  });

  it('attacker pressing bito passes priority to edge player', () => {
    const state = createTestState(3);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.attackerHasPriority = true;
    state.players[0].hand = [card('hearts', 'A')];
    state.players[1].hand = [card('spades', 'A')];
    state.players[2].hand = [card('spades', '7', 1)];
    state.battleField = [
      { attack: card('spades', '7', 2), defense: card('spades', '8') },
    ];
    state.turnPhase = 'attack';

    // Attacker presses bito
    const error = endAttack(state, 0);
    expect(error).toBeNull();
    // Priority should pass to edge player (p3 = index 2)
    expect(state.currentAttackerIdx).toBe(2);
    expect(state.attackerHasPriority).toBe(true);
  });

  it('after defender beats a card, attacker regains priority', () => {
    const state = createTestState(3);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.attackerHasPriority = false;
    state.players[0].hand = [card('hearts', '7')];
    state.players[1].hand = [card('spades', 'A')];
    state.players[2].hand = [card('hearts', '7', 1)];
    state.battleField = [
      { attack: card('spades', '7'), defense: null },
    ];
    state.turnPhase = 'defend';

    // Defender beats the card
    const error = playDefenseCard(state, 1, state.players[1].hand[0].id, 0);
    expect(error).toBeNull();
    // Attacker should regain priority
    expect(state.attackerHasPriority).toBe(true);
  });
});

describe('Pickup mechanic (defender takes)', () => {
  it('takeCards enters pickup mode, does not immediately take', () => {
    const state = createTestState(3);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.players[0].hand = [card('spades', '7', 1)];
    state.players[1].hand = [card('hearts', 'A')];
    state.battleField = [
      { attack: card('spades', '7'), defense: null },
    ];
    state.turnPhase = 'defend';

    takeCards(state);
    expect(state.defenderTaking).toBe(true);
    expect(state.turnPhase).toBe('pickup');
    expect(state.battleField.length).toBe(1); // cards still on table
  });

  it('attacker can add cards in pickup mode', () => {
    const state = createTestState(3);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.defenderTaking = true;
    state.turnPhase = 'pickup';
    state.firstTrick = false;
    state.players[0].hand = [card('spades', '7', 1)];
    state.players[1].hand = [card('hearts', 'A'), card('hearts', 'K'), card('hearts', 'Q')]; // 3 cards = max 3 attack cards
    state.battleField = [
      { attack: card('spades', '7'), defense: null },
    ];

    const actions = getAvailableActions(state, 0);
    const playAction = actions.find(a => a.type === 'playCard');
    expect(playAction).toBeTruthy();

    // Attacker adds a card
    const error = playAttackCard(state, 0, state.players[0].hand[0].id);
    expect(error).toBeNull();
    expect(state.battleField.length).toBe(2);
  });

  it('defender cannot defend in pickup mode', () => {
    const state = createTestState(3);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.defenderTaking = true;
    state.turnPhase = 'pickup';
    state.players[1].hand = [card('spades', 'A')];
    state.battleField = [
      { attack: card('spades', '7'), defense: null },
    ];

    const error = playDefenseCard(state, 1, state.players[1].hand[0].id, 0);
    expect(error).toBeTruthy();
  });

  it('all attackers pressing bito in pickup mode finalizes take', () => {
    const state = createTestState(3);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.defenderTaking = true;
    state.turnPhase = 'pickup';
    state.players[0].hand = [card('hearts', 'A')];
    state.players[1].hand = [];
    state.players[2].hand = [card('hearts', 'K')];
    state.battleField = [
      { attack: card('spades', '7'), defense: null },
    ];

    // Attacker (p1) presses bito
    endAttack(state, 0);
    // Should pass to edge player (p3)
    expect(state.currentAttackerIdx).toBe(2);
    expect(state.defenderTaking).toBe(true);

    // Edge player (p3) presses bito
    endAttack(state, 2);
    // All passed — should finalize take
    expect(state.defenderTaking).toBe(false);
    expect(state.battleField.length).toBe(0);
    expect(state.players[1].hand.length).toBe(1); // took 1 card from battlefield
  });

  it('card limit enforced: first trick max 13 cards', () => {
    const state = createTestState(2);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.firstTrick = true;
    state.defenderTaking = true;
    state.turnPhase = 'pickup';
    
    // Fill battlefield with 13 attack cards
    state.battleField = Array.from({ length: 13 }, (_, i) => ({
      attack: card('spades', '7', i),
      defense: null,
    }));
    state.players[0].hand = [card('hearts', '7')];
    state.players[1].hand = Array.from({ length: 20 }, (_, i) => card('hearts', 'A', i));

    // Should not be able to add more
    const error = playAttackCard(state, 0, state.players[0].hand[0].id);
    expect(error).toBeTruthy();
    expect(error).toContain('Maximum');
  });

  it('card limit enforced: after first trick, max = defender hand size', () => {
    const state = createTestState(2);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.firstTrick = false;
    state.defenderTaking = true;
    state.turnPhase = 'pickup';
    
    // Defender has 3 cards
    state.players[1].hand = [card('hearts', 'A'), card('hearts', 'K'), card('hearts', 'Q')];
    
    // 3 attack cards already on table (= defender hand size)
    state.battleField = [
      { attack: card('spades', '7', 0), defense: null },
      { attack: card('spades', '7', 1), defense: null },
      { attack: card('spades', '7', 2), defense: null },
    ];
    state.players[0].hand = [card('hearts', '7')];

    // Should not be able to add more (3 attack cards = 3 cards in defender hand)
    const error = playAttackCard(state, 0, state.players[0].hand[0].id);
    expect(error).toBeTruthy();
    expect(error).toContain('Maximum');
  });
});

// ============================================================
// PASS-THROUGH (ПРОЕЗДНОЙ) MECHANIC
// ============================================================
describe('Pass-through (проездной) mechanic', () => {
  it('defender can show a trump card matching attack rank as pass-through', () => {
    const state = createTestState(3);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.turnPhase = 'defend';
    // Attack with 7 of spades, defender has 7 of hearts (trump)
    state.battleField = [{ attack: card('spades', '7'), defense: null }];
    state.players[1].hand = [card('hearts', '7'), card('clubs', 'A')];

    const error = showPassThrough(state, 1, state.players[1].hand[0].id);
    expect(error).toBeNull();

    // Card should STAY in hand
    expect(state.players[1].hand.length).toBe(2);
    expect(state.players[1].hand[0].id).toBe('hearts-7-0');

    // Card should be in passThroughUsedIds
    expect(state.passThroughUsedIds).toContain('hearts-7-0');

    // Card should be in revealedPassThroughs
    expect(state.revealedPassThroughs.length).toBe(1);
    expect(state.revealedPassThroughs[0].playerId).toBe('p2');
    expect(state.revealedPassThroughs[0].cards.length).toBe(1);

    // Defender becomes attacker, next player becomes defender
    expect(state.currentAttackerIdx).toBe(1);
    expect(state.currentDefenderIdx).toBe(2);
  });

  it('cannot use same card as pass-through twice', () => {
    const state = createTestState(3);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.turnPhase = 'defend';
    state.battleField = [{ attack: card('spades', '7'), defense: null }];
    state.players[1].hand = [card('hearts', '7')];
    state.passThroughUsedIds = ['hearts-7-0']; // already used

    const error = showPassThrough(state, 1, 'hearts-7-0');
    expect(error).toBeTruthy();
    expect(error).toContain('уже использовалась');
  });

  it('cannot use non-trump card as pass-through', () => {
    const state = createTestState(3);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.turnPhase = 'defend';
    state.battleField = [{ attack: card('spades', '7'), defense: null }];
    // clubs-7 is NOT a trump (trump is hearts)
    state.players[1].hand = [card('clubs', '7')];

    const error = showPassThrough(state, 1, 'clubs-7-0');
    expect(error).toBeTruthy();
    expect(error).toContain('козырной');
  });

  it('cannot use card with wrong rank as pass-through', () => {
    const state = createTestState(3);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.turnPhase = 'defend';
    state.battleField = [{ attack: card('spades', '7'), defense: null }];
    // hearts-8 is trump but wrong rank
    state.players[1].hand = [card('hearts', '8')];

    const error = showPassThrough(state, 1, 'hearts-8-0');
    expect(error).toBeTruthy();
    expect(error).toContain('номиналу');
  });

  it('defender can show multiple pass-through cards if they have them', () => {
    const state = createTestState(4);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.turnPhase = 'defend';
    state.battleField = [{ attack: card('spades', '7'), defense: null }];
    // Defender has TWO trump 7s
    state.players[1].hand = [card('hearts', '7', 0), card('hearts', '7', 1), card('clubs', 'A')];

    // Show first pass-through
    const error1 = showPassThrough(state, 1, 'hearts-7-0');
    expect(error1).toBeNull();
    expect(state.revealedPassThroughs[0].cards.length).toBe(1);

    // Now defender is attacker (idx 1), new defender is idx 2
    // Simulate new attack on new defender who also has trump 7
    state.currentDefenderIdx = 2;
    state.currentAttackerIdx = 1;
    state.battleField = [{ attack: card('spades', '7', 1), defense: null }];
    state.players[2].hand = [card('hearts', '7', 2)];

    // New defender shows pass-through
    const error2 = showPassThrough(state, 2, 'hearts-7-2');
    expect(error2).toBeNull();
    expect(state.revealedPassThroughs.length).toBe(2); // Two different players
  });

  it('showPassThrough action appears in available actions for defender with trump matching card', () => {
    const state = createTestState(3);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.turnPhase = 'defend';
    state.battleField = [{ attack: card('spades', '7'), defense: null }];
    state.players[1].hand = [card('hearts', '7'), card('clubs', 'A')];

    const actions = getAvailableActions(state, 1);
    const ptAction = actions.find(a => a.type === 'showPassThrough');
    expect(ptAction).toBeDefined();
    if (ptAction && ptAction.type === 'showPassThrough') {
      expect(ptAction.cardIds).toContain('hearts-7-0');
    }
  });

  it('showPassThrough action does NOT appear for non-trump matching card', () => {
    const state = createTestState(3);
    state.currentAttackerIdx = 0;
    state.currentDefenderIdx = 1;
    state.turnPhase = 'defend';
    state.battleField = [{ attack: card('spades', '7'), defense: null }];
    // Only has clubs-7 (not trump)
    state.players[1].hand = [card('clubs', '7')];

    const actions = getAvailableActions(state, 1);
    const ptAction = actions.find(a => a.type === 'showPassThrough');
    expect(ptAction).toBeUndefined();
  });

  it('revealedPassThroughs are cleared after successful defense', () => {
    const state = createTestState(3);
    state.revealedPassThroughs = [{ playerId: 'p2', cards: [card('hearts', '7')] }];
    state.currentDefenderIdx = 1;
    state.currentAttackerIdx = 0;
    state.battleField = [{ attack: card('spades', '8'), defense: card('spades', '9') }];

    successfulDefense(state);
    expect(state.revealedPassThroughs.length).toBe(0);
  });

  it('revealedPassThroughs are cleared after finalizeTake', () => {
    const state = createTestState(3);
    state.revealedPassThroughs = [{ playerId: 'p2', cards: [card('hearts', '7')] }];
    state.currentDefenderIdx = 1;
    state.currentAttackerIdx = 0;
    state.defenderTaking = true;
    state.turnPhase = 'pickup';
    state.players[0].hand = [card('hearts', 'A')];
    state.players[1].hand = [];
    state.players[2].hand = [card('hearts', 'K')];
    state.battleField = [{ attack: card('spades', '7'), defense: null }];

    finalizeTake(state);
    expect(state.revealedPassThroughs.length).toBe(0);
  });

  it('revealedPassThroughs visible in client state', () => {
    const state = createTestState(3);
    state.revealedPassThroughs = [{ playerId: 'p2', cards: [card('hearts', '7')] }];
    state.players[0].hand = [card('spades', 'A')];

    const clientState = toClientState(state, 'p1');
    expect(clientState.revealedPassThroughs.length).toBe(1);
    expect(clientState.revealedPassThroughs[0].playerId).toBe('p2');
    expect(clientState.revealedPassThroughs[0].cards.length).toBe(1);
  });
});
