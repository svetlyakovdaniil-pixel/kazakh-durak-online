// ============================================================
// Kazakh Durak Online — Game Engine (v4)
// Fixes: attacker priority handoff, pickup-after-take mechanic,
// card limit enforcement, bito multi-attacker
// ============================================================

import {
  Card, Suit, Rank, SUITS, RANKS, RANK_ORDER, COPIES_PER_CARD,
  HAND_SIZE, FIRST_TRICK_LIMIT,
  TrumpInfo, Player, BattlePair, Direction, GameState, GamePhase, TurnPhase,
  ClientGameState, ClientPlayer, AvailableAction, RoomSettings,
} from '../shared/gameTypes';

// ---- Helpers ----

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Card creation & identification ----

export function createFullDeck(): Card[] {
  const cards: Card[] = [];
  for (let copy = 0; copy < COPIES_PER_CARD; copy++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ id: `${suit}-${rank}-${copy}`, suit, rank, copy });
      }
    }
  }
  cards.push({ id: '777-0', suit: null, rank: '777', copy: 0 });
  return cards;
}

export function getCardValue(card: Card): number {
  if (card.rank === '777') return 100;
  return RANK_ORDER[card.rank] ?? 0;
}

export function isKingOfSpades(card: Card): boolean {
  return card.rank === 'K' && card.suit === 'spades';
}

export function is777(card: Card): boolean {
  return card.rank === '777';
}

export function isAceOfSpades(card: Card): boolean {
  return card.rank === 'A' && card.suit === 'spades';
}

// ---- Combat rules ----

export function canBeat(attack: Card, defense: Card, currentTrump: Suit): boolean {
  if (is777(defense)) return true;
  if (is777(attack)) return false;
  if (isKingOfSpades(attack)) {
    return isAceOfSpades(defense) || is777(defense);
  }
  if (isKingOfSpades(defense)) {
    if (isKingOfSpades(attack)) return false;
    return true;
  }
  if (attack.suit === defense.suit && attack.rank === defense.rank) {
    return true;
  }
  if (attack.suit === defense.suit) {
    return getCardValue(defense) > getCardValue(attack);
  }
  if (defense.suit === currentTrump && attack.suit !== currentTrump) {
    return true;
  }
  return false;
}

// ---- Trump selection ----

function pickTrumps(): { mainTrump: Suit; hiddenTrump1: Suit; hiddenTrump2: Suit } {
  const shuffled = shuffleArray([...SUITS]);
  return { mainTrump: shuffled[0], hiddenTrump1: shuffled[1], hiddenTrump2: shuffled[2] };
}

function splitDecks(cards: Card[]): { deck1: Card[]; deck2: Card[] } {
  const half = Math.ceil(cards.length / 2);
  return { deck1: cards.slice(0, half), deck2: cards.slice(half) };
}

// ---- First player logic ----

export function findFirstPlayer(players: Player[], trumpSuit: Suit): number {
  let bestIdx = 0;
  let bestValue = Infinity;
  let bestCount = 0;

  for (let i = 0; i < players.length; i++) {
    const trumpCards = players[i].hand.filter(c => c.suit === trumpSuit);
    if (trumpCards.length === 0) continue;
    const lowestTrump = trumpCards.reduce((min, c) =>
      getCardValue(c) < getCardValue(min) ? c : min
    );
    const val = getCardValue(lowestTrump);
    const count = trumpCards.filter(c => getCardValue(c) === val).length;
    if (val < bestValue || (val === bestValue && count < bestCount)) {
      bestValue = val;
      bestCount = count;
      bestIdx = i;
    }
  }
  return bestIdx;
}

// ---- Game creation ----

export function createGame(
  roomId: string,
  playerInfos: { id: string; odId: string; name: string; isBot: boolean }[],
  settings?: RoomSettings
): GameState {
  const allCards = shuffleArray(createFullDeck());
  const numPlayers = playerInfos.length;
  const totalDeal = numPlayers * HAND_SIZE;

  const players: Player[] = playerInfos.map((p, idx) => ({
    id: p.id,
    odId: p.odId,
    name: p.name,
    hand: allCards.slice(idx * HAND_SIZE, (idx + 1) * HAND_SIZE),
    passThrough: [],
    isOut: false,
    seatIndex: idx,
    isBot: p.isBot,
    winPlace: null,
  }));

  const remaining = allCards.slice(totalDeal);
  const { deck1, deck2 } = splitDecks(remaining);
  const trumps = pickTrumps();

  const trumpInfo: TrumpInfo = {
    mainTrump: trumps.mainTrump,
    hiddenTrump1: trumps.hiddenTrump1,
    hiddenTrump2: trumps.hiddenTrump2,
    currentTrump: trumps.mainTrump,
    phase: 1,
  };

  const firstPlayerIdx = findFirstPlayer(players, trumpInfo.currentTrump);
  const defenderIdx = getNextActivePlayer(players, firstPlayerIdx, 'cw');
  const timerMax = settings?.turnTimer ?? 30;

  return {
    roomId,
    players,
    deck1,
    deck2,
    trumpInfo,
    battleField: [],
    discardPile: [],
    currentAttackerIdx: firstPlayerIdx,
    currentDefenderIdx: defenderIdx,
    direction: 'cw',
    turnPhase: 'attack',
    gamePhase: 'playing',
    firstTrick: true,
    trickCount: 0,
    lastPlayedRank: null,
    winnersOrder: [],
    loserId: null,
    turnTimer: timerMax,
    turnTimerMax: timerMax,
    leadCardRank: null,
    attackerHasPriority: true,
    passedAttackers: [],
    nextWinPlace: 1,
    defenderTaking: false,
    passThroughUsedIds: [],
    revealedPassThroughs: [],
  };
}

// ---- Navigation helpers ----

export function getNextActivePlayer(players: Player[], fromIdx: number, dir: Direction): number {
  const n = players.length;
  let idx = fromIdx;
  for (let i = 0; i < n; i++) {
    idx = dir === 'cw' ? (idx + 1) % n : (idx - 1 + n) % n;
    if (!players[idx].isOut) return idx;
  }
  return fromIdx;
}

export function getPrevActivePlayer(players: Player[], fromIdx: number, dir: Direction): number {
  return getNextActivePlayer(players, fromIdx, dir === 'cw' ? 'ccw' : 'cw');
}

export function isEdgePlayer(players: Player[], playerIdx: number, defenderIdx: number, dir: Direction): boolean {
  const leftNeighbor = getNextActivePlayer(players, defenderIdx, dir === 'cw' ? 'ccw' : 'cw');
  const rightNeighbor = getNextActivePlayer(players, defenderIdx, dir);
  return playerIdx === leftNeighbor || playerIdx === rightNeighbor;
}

// ---- Trick limits ----

export function getMaxAttackCards(state: GameState): number {
  if (state.firstTrick) return FIRST_TRICK_LIMIT;
  const defender = state.players[state.currentDefenderIdx];
  return defender.hand.length;
}

// ---- Draw cards ----

export function drawCards(state: GameState): void {
  const order: number[] = [];
  let idx = state.currentAttackerIdx;
  const n = state.players.length;
  for (let i = 0; i < n; i++) {
    if (!state.players[idx].isOut) order.push(idx);
    idx = state.direction === 'cw' ? (idx + 1) % n : (idx - 1 + n) % n;
  }

  for (const pIdx of order) {
    const player = state.players[pIdx];
    while (player.hand.length < HAND_SIZE) {
      if (state.deck1.length > 0) {
        player.hand.push(state.deck1.pop()!);
      } else if (state.deck2.length > 0) {
        if (state.trumpInfo.phase === 1) {
          state.trumpInfo.phase = 2;
          state.trumpInfo.currentTrump = state.trumpInfo.hiddenTrump1;
        }
        player.hand.push(state.deck2.pop()!);
      } else {
        break;
      }
    }
  }

  if (state.deck2.length === 0 && state.trumpInfo.phase === 2) {
    state.trumpInfo.phase = 3;
    state.trumpInfo.currentTrump = state.trumpInfo.hiddenTrump2;
  }
}

// ---- Skip turn (777 only) ----

export function shouldSkipTurn(state: GameState, playerIdx: number): boolean {
  const player = state.players[playerIdx];
  return player.hand.length === 1 && is777(player.hand[0]) && playerIdx === state.currentAttackerIdx;
}

// ---- Attack validation ----

export function canPlayAsAttack(state: GameState, card: Card): boolean {
  if (is777(card)) return false;
  if (state.battleField.length === 0) return true;
  const ranksOnTable = new Set<string>();
  for (const pair of state.battleField) {
    ranksOnTable.add(pair.attack.rank);
    if (pair.defense) ranksOnTable.add(pair.defense.rank);
  }
  return ranksOnTable.has(card.rank);
}

// ---- Edge player / 6-exception ----

export function canPlayerAddCards(state: GameState, playerIdx: number): boolean {
  if (playerIdx === state.currentDefenderIdx) return false;
  if (state.players[playerIdx].isOut) return false;
  if (state.leadCardRank === '6') return true;
  return isEdgePlayer(state.players, playerIdx, state.currentDefenderIdx, state.direction);
}

// ---- Total cards on table ----

function totalCardsOnTable(state: GameState): number {
  let count = 0;
  for (const pair of state.battleField) {
    count++; // attack card
    if (pair.defense) count++; // defense card
  }
  return count;
}

// ---- Check if more attack cards can be added ----

function canAddMoreAttackCards(state: GameState): boolean {
  const maxCards = getMaxAttackCards(state);
  // Count total attack cards (each pair has one attack card)
  const attackCardCount = state.battleField.length;
  return attackCardCount < maxCards;
}

// ---- Attack card play ----

export function playAttackCard(state: GameState, playerIdx: number, cardId: string): string | null {
  // Only the current attacker can initiate the first card
  if (state.battleField.length === 0 && playerIdx !== state.currentAttackerIdx) {
    return 'Only the attacker can play the first card';
  }

  // Defender cannot play attack cards
  if (playerIdx === state.currentDefenderIdx) {
    return 'Defender cannot attack';
  }

  const player = state.players[playerIdx];
  if (player.isOut) return 'Player is out of the game';

  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return 'Card not in hand';
  const card = player.hand[cardIndex];

  // After first card, check if this player can add cards
  if (state.battleField.length > 0 && playerIdx !== state.currentAttackerIdx) {
    // PRIORITY RULE: Edge players cannot add cards while attacker has priority
    if (state.attackerHasPriority) return 'Attacker has priority — wait for them to press Бито';
    if (!canPlayerAddCards(state, playerIdx)) return 'You cannot add cards to this trick';
  }

  if (!canPlayAsAttack(state, card)) return 'Cannot play this card as attack';

  // Check card limit
  if (!canAddMoreAttackCards(state)) return 'Maximum attack cards reached';

  player.hand.splice(cardIndex, 1);
  state.battleField.push({ attack: card, defense: null });
  state.lastPlayedRank = card.rank as Rank;

  // 10-card only reverses direction when it's the LEAD card
  if (state.battleField.length === 1 && card.rank === '10') {
    state.direction = state.direction === 'cw' ? 'ccw' : 'cw';
    state.leadCardRank = '10';
    state.currentDefenderIdx = getNextActivePlayer(state.players, state.currentAttackerIdx, state.direction);
  }

  if (state.battleField.length === 1) {
    state.leadCardRank = card.rank as Rank;
  }

  // When attacker plays a card, they regain priority
  if (playerIdx === state.currentAttackerIdx) {
    state.attackerHasPriority = true;
  }

  // If defender is NOT taking, set phase to defend
  if (!state.defenderTaking) {
    state.turnPhase = 'defend';
  }
  // If defender IS taking (pickup mode), stay in pickup — cards just pile up

  // When someone adds a card, reset passed attackers since new cards appeared
  state.passedAttackers = [];
  checkPlayerOut(state, playerIdx);
  return null;
}

// ---- Defense card play ----

export function playDefenseCard(state: GameState, playerIdx: number, cardId: string, targetPairIdx?: number): string | null {
  if (playerIdx !== state.currentDefenderIdx) return 'Not your turn to defend';
  if (state.defenderTaking) return 'You already chose to take cards';

  const player = state.players[playerIdx];
  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return 'Card not in hand';
  const card = player.hand[cardIndex];

  let pairIdx = targetPairIdx;
  if (pairIdx === undefined || pairIdx === null) {
    pairIdx = state.battleField.findIndex(p => !p.defense && canBeat(p.attack, card, state.trumpInfo.currentTrump));
  }

  if (pairIdx === -1 || pairIdx === undefined) return 'No valid target for this card';
  const pair = state.battleField[pairIdx];
  if (!pair) return 'Invalid target';
  if (pair.defense) return 'Already defended';

  if (!canBeat(pair.attack, card, state.trumpInfo.currentTrump)) {
    return 'This card cannot beat the attack card';
  }

  player.hand.splice(cardIndex, 1);
  pair.defense = card;

  const allDefended = state.battleField.every(p => p.defense !== null);
  if (allDefended) {
    // After defender beats a card, attacker regains priority to add more
    state.turnPhase = 'attack';
    state.attackerHasPriority = true;
    state.passedAttackers = [];
  }

  checkPlayerOut(state, playerIdx);
  return null;
}

// ---- Transfer (perevod) ----

export function transferAttack(state: GameState, playerIdx: number, cardId: string): string | null {
  if (playerIdx !== state.currentDefenderIdx) return 'Not your turn';
  if (state.defenderTaking) return 'Cannot transfer while taking';

  const player = state.players[playerIdx];
  const cardIndex = player.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return 'Card not in hand';
  const card = player.hand[cardIndex];

  if (state.battleField.some(p => p.defense)) return 'Cannot transfer after defending';

  const attackRank = state.battleField[0]?.attack.rank;
  if (card.rank !== attackRank) return 'Transfer card must match attack rank';

  if (card.rank === '10' && state.leadCardRank === '10') {
    state.direction = state.direction === 'cw' ? 'ccw' : 'cw';
  }

  player.hand.splice(cardIndex, 1);
  state.battleField.push({ attack: card, defense: null });

  const newDefenderIdx = getNextActivePlayer(state.players, state.currentDefenderIdx, state.direction);
  state.currentAttackerIdx = state.currentDefenderIdx;
  state.currentDefenderIdx = newDefenderIdx;

  state.turnPhase = 'defend';
  state.passedAttackers = [];
  state.attackerHasPriority = true;
  state.defenderTaking = false;
  resetTurnTimer(state);
  checkPlayerOut(state, playerIdx);
  return null;
}

// ---- Pass-through (proezdnoy) ----
// The defender SHOWS a trump card of the same rank as the attack card.
// The card stays in hand (not played to the table).
// Each specific card can only be shown as pass-through ONCE per game.
// Multiple cards can be shown if the defender has multiple qualifying cards.

export function showPassThrough(state: GameState, playerIdx: number, cardId: string): string | null {
  if (playerIdx !== state.currentDefenderIdx) return 'Не ваш ход';
  if (state.defenderTaking) return 'Вы уже берёте карты';
  if (state.battleField.length === 0) return 'Нет карт на столе';

  const player = state.players[playerIdx];
  const card = player.hand.find(c => c.id === cardId);
  if (!card) return 'Карта не в руке';

  // Card must match the attack rank
  const attackRank = state.battleField[0]?.attack.rank;
  if (card.rank !== attackRank) return 'Проездной должен совпадать по номиналу с атакующей картой';

  // Card must be a trump card
  if (card.suit !== state.trumpInfo.currentTrump) return 'Проездной должен быть козырной картой';

  // Each card can only be used as pass-through once per game
  if (state.passThroughUsedIds.includes(cardId)) return 'Эта карта уже использовалась как проездной';

  // Mark this card as used for pass-through (one-time per game)
  state.passThroughUsedIds.push(cardId);

  // Add to revealed pass-throughs for this trick (visible to all players)
  const existing = state.revealedPassThroughs.find(r => r.playerId === player.id);
  if (existing) {
    existing.cards.push(card);
  } else {
    state.revealedPassThroughs.push({ playerId: player.id, cards: [card] });
  }

  // The card stays in the player's hand — NOT removed
  // Transfer the attack: defender becomes attacker, next player becomes defender
  const newDefenderIdx = getNextActivePlayer(state.players, state.currentDefenderIdx, state.direction);
  state.currentAttackerIdx = state.currentDefenderIdx;
  state.currentDefenderIdx = newDefenderIdx;

  state.passedAttackers = [];
  state.attackerHasPriority = true;
  state.defenderTaking = false;
  resetTurnTimer(state);
  return null;
}

// ---- Take cards (defender chooses to take) ----
// NEW: Does NOT immediately take. Sets defenderTaking=true so attackers can add more cards.
// Cards are actually picked up when all attackers press "bito" (via finalizeTake).

export function takeCards(state: GameState): void {
  // Mark that defender is taking — attackers can now add more cards
  state.defenderTaking = true;
  state.turnPhase = 'pickup';
  state.attackerHasPriority = true;
  state.passedAttackers = [];
  resetTurnTimer(state);
}

// ---- Finalize take — actually move cards to defender's hand ----

export function finalizeTake(state: GameState): void {
  const defender = state.players[state.currentDefenderIdx];
  for (const pair of state.battleField) {
    defender.hand.push(pair.attack);
    if (pair.defense) defender.hand.push(pair.defense);
  }
  state.battleField = [];
  state.turnPhase = 'attack';
  state.firstTrick = false;
  state.trickCount++;
  state.leadCardRank = null;
  state.attackerHasPriority = true;
  state.passedAttackers = [];
  state.defenderTaking = false;
  state.revealedPassThroughs = []; // Clear revealed pass-throughs for next trick

  drawCards(state);

  const nextAttacker = getNextActivePlayer(state.players, state.currentDefenderIdx, state.direction);
  state.currentAttackerIdx = nextAttacker;
  state.currentDefenderIdx = getNextActivePlayer(state.players, nextAttacker, state.direction);

  ensureActiveAttackerDefender(state);
  resetTurnTimer(state);
  checkGameOver(state);
}

// ---- Successful defense ----

export function successfulDefense(state: GameState): void {
  for (const pair of state.battleField) {
    state.discardPile.push(pair.attack);
    if (pair.defense) state.discardPile.push(pair.defense);
  }
  state.battleField = [];
  state.turnPhase = 'attack';
  state.firstTrick = false;
  state.trickCount++;
  state.leadCardRank = null;
  state.attackerHasPriority = true;
  state.passedAttackers = [];
  state.defenderTaking = false;
  state.revealedPassThroughs = []; // Clear revealed pass-throughs for next trick

  drawCards(state);

  state.currentAttackerIdx = state.currentDefenderIdx;
  state.currentDefenderIdx = getNextActivePlayer(state.players, state.currentDefenderIdx, state.direction);

  ensureActiveAttackerDefender(state);
  resetTurnTimer(state);
  checkGameOver(state);
}

// ---- End attack / "Бито" — multi-attacker priority mechanic ----
// 
// Flow:
// 1. Attacker plays cards, has priority. Edge players wait.
// 2. Attacker presses "бито" → priority passes to next edge player.
// 3. Edge player can add cards. If defender beats with a rank that attacker has → attacker regains priority.
// 4. When ALL eligible attackers have pressed "бито":
//    - If defenderTaking=true → finalizeTake (defender picks up cards)
//    - If all cards defended → successfulDefense
//    - Otherwise → defender must still take or defend

export function endAttack(state: GameState, playerIdx: number): string | null {
  if (state.battleField.length === 0) return 'No cards on table';

  const isCurrentAttacker = playerIdx === state.currentAttackerIdx;
  const isEdge = canPlayerAddCards(state, playerIdx);
  if (!isCurrentAttacker && !isEdge) return 'Not an attacker or edge player';

  const playerId = state.players[playerIdx].id;
  if (!state.passedAttackers.includes(playerId)) {
    state.passedAttackers.push(playerId);
  }

  // If defender is taking (pickup mode)
  if (state.defenderTaking) {
    if (checkAllAttackersPassed(state)) {
      finalizeTake(state);
      return null;
    }
    // Pass priority to next unpassed attacker
    const nextAttackerIdx = findNextUnpassedAttacker(state, playerIdx);
    if (nextAttackerIdx !== null) {
      state.currentAttackerIdx = nextAttackerIdx;
      state.attackerHasPriority = true;
      resetTurnTimer(state);
      return null;
    }
    // No one else can add — finalize take
    finalizeTake(state);
    return null;
  }

  // Normal mode — all cards defended
  if (state.battleField.every(p => p.defense)) {
    if (checkAllAttackersPassed(state)) {
      successfulDefense(state);
      return null;
    }

    // Pass to next eligible attacker who hasn't passed yet
    const nextAttackerIdx = findNextUnpassedAttacker(state, playerIdx);
    if (nextAttackerIdx !== null) {
      state.currentAttackerIdx = nextAttackerIdx;
      state.attackerHasPriority = true;
      resetTurnTimer(state);
      return null;
    }

    // Everyone passed or no one else can add
    successfulDefense(state);
    return null;
  }

  // Not all defended, not taking — pass to next edge player
  const nextAttackerIdx = findNextUnpassedAttacker(state, playerIdx);
  if (nextAttackerIdx !== null) {
    state.currentAttackerIdx = nextAttackerIdx;
    state.attackerHasPriority = true;
    resetTurnTimer(state);
    return null;
  }

  // No one else can add — defender must take or defend remaining
  return null;
}

// Find the next edge attacker who hasn't passed yet
function findNextUnpassedAttacker(state: GameState, fromIdx: number): number | null {
  const n = state.players.length;
  let idx = fromIdx;
  for (let i = 0; i < n; i++) {
    idx = state.direction === 'cw' ? (idx + 1) % n : (idx - 1 + n) % n;
    if (idx === state.currentDefenderIdx) continue;
    if (state.players[idx].isOut) continue;
    if (state.passedAttackers.includes(state.players[idx].id)) continue;
    if (canPlayerAddCards(state, idx) || idx === state.currentAttackerIdx) {
      return idx;
    }
  }
  return null;
}

// Check if all eligible attackers have passed
function checkAllAttackersPassed(state: GameState): boolean {
  const n = state.players.length;
  for (let i = 0; i < n; i++) {
    if (i === state.currentDefenderIdx) continue;
    if (state.players[i].isOut) continue;
    if (!canPlayerAddCards(state, i) && i !== state.currentAttackerIdx) continue;
    if (!state.passedAttackers.includes(state.players[i].id)) return false;
  }
  return true;
}

// ---- Timer ----

export function resetTurnTimer(state: GameState): void {
  state.turnTimer = state.turnTimerMax;
}

// ---- Player out check ----

function checkPlayerOut(state: GameState, playerIdx: number): void {
  const player = state.players[playerIdx];
  if (player.hand.length === 0 && state.deck1.length === 0 && state.deck2.length === 0) {
    if (!player.isOut) {
      player.isOut = true;
      player.winPlace = state.nextWinPlace;
      state.nextWinPlace++;
      if (!state.winnersOrder.includes(player.id)) {
        state.winnersOrder.push(player.id);
      }
    }
  }
}

// Ensure attacker and defender are active players (not winners)

function ensureActiveAttackerDefender(state: GameState): void {
  const activePlayers = state.players.filter(p => !p.isOut);
  if (activePlayers.length <= 1) return;

  if (state.players[state.currentAttackerIdx].isOut) {
    state.currentAttackerIdx = getNextActivePlayer(state.players, state.currentAttackerIdx, state.direction);
  }
  if (state.players[state.currentDefenderIdx].isOut || state.currentDefenderIdx === state.currentAttackerIdx) {
    state.currentDefenderIdx = getNextActivePlayer(state.players, state.currentAttackerIdx, state.direction);
  }
}

// ---- Game over check ----

function checkGameOver(state: GameState): void {
  const activePlayers = state.players.filter(p => !p.isOut);
  if (activePlayers.length <= 1) {
    state.gamePhase = 'finished';
    if (activePlayers.length === 1) {
      state.loserId = activePlayers[0].id;
    }
  }
}

// ---- Available actions ----

export function getAvailableActions(state: GameState, playerIdx: number): AvailableAction[] {
  if (state.gamePhase !== 'playing') return [];
  const player = state.players[playerIdx];
  if (player.isOut) return [];
  const actions: AvailableAction[] = [];

  if (shouldSkipTurn(state, playerIdx)) {
    actions.push({ type: 'skipTurn' });
    return actions;
  }

  const isAttacker = playerIdx === state.currentAttackerIdx;
  const isDefender = playerIdx === state.currentDefenderIdx;

  // === DEFENDER ACTIONS ===
  if (isDefender && !state.defenderTaking) {
    if (state.turnPhase === 'defend') {
      // Defense cards
      const undefended = state.battleField.filter(p => !p.defense);
      const playableIds: string[] = [];
      for (const card of player.hand) {
        for (const pair of undefended) {
          if (canBeat(pair.attack, card, state.trumpInfo.currentTrump)) {
            if (!playableIds.includes(card.id)) playableIds.push(card.id);
          }
        }
      }
      if (playableIds.length > 0) {
        actions.push({ type: 'playCard', cardIds: playableIds });
      }

      // Transfer option — show all matching cards for choice
      if (state.battleField.length > 0 && state.battleField.every(p => !p.defense)) {
        const attackRank = state.battleField[0].attack.rank;
        const transferCards = player.hand.filter(c => c.rank === attackRank).map(c => c.id);
        if (transferCards.length > 0) {
          actions.push({ type: 'transferCard', cardIds: transferCards });
        }
      }

      // Pass-through (проездной) — show trump cards matching attack rank that haven't been used yet
      if (state.battleField.length > 0) {
        const attackRank = state.battleField[0].attack.rank;
        const passThroughCards = player.hand.filter(c =>
          c.rank === attackRank &&
          c.suit === state.trumpInfo.currentTrump &&
          !state.passThroughUsedIds.includes(c.id)
        ).map(c => c.id);
        if (passThroughCards.length > 0) {
          actions.push({ type: 'showPassThrough', cardIds: passThroughCards });
        }
      }

      actions.push({ type: 'takeCards' });
    }
  }

  // === ATTACKER ACTIONS ===
  if (isAttacker) {
    // In pickup mode, attacker can add cards
    if (state.defenderTaking) {
      if (canAddMoreAttackCards(state)) {
        const playableIds = player.hand
          .filter(c => canPlayAsAttack(state, c))
          .map(c => c.id);
        if (playableIds.length > 0) {
          actions.push({ type: 'playCard', cardIds: playableIds });
        }
      }
      // Always can press "бито" in pickup mode
      actions.push({ type: 'endAttack' });
      return actions;
    }

    // Normal attack phase
    if (state.turnPhase === 'attack' || (state.turnPhase === 'defend' && state.battleField.length === 0)) {
      const playableIds = player.hand
        .filter(c => canPlayAsAttack(state, c))
        .map(c => c.id);
      if (playableIds.length > 0) {
        actions.push({ type: 'playCard', cardIds: playableIds });
      }
    }

    // "Бито" button — when all defended
    if (state.battleField.length > 0 && state.battleField.every(p => p.defense)) {
      actions.push({ type: 'endAttack' });
    }

    // Can still add cards when not all defended (attacker can always add)
    if (state.battleField.length > 0 && !state.battleField.every(p => p.defense) && state.turnPhase === 'defend') {
      if (canAddMoreAttackCards(state)) {
        const playableIds = player.hand
          .filter(c => canPlayAsAttack(state, c))
          .map(c => c.id);
        if (playableIds.length > 0) {
          actions.push({ type: 'playCard', cardIds: playableIds });
        }
      }
    }
  }

  // === EDGE PLAYER ACTIONS (non-attacker, non-defender) ===
  if (!isAttacker && !isDefender && canPlayerAddCards(state, playerIdx)) {
    if (state.battleField.length > 0) {
      // PRIORITY RULE: Edge players can only act when attacker does NOT have priority
      if (!state.attackerHasPriority) {
        if (state.defenderTaking) {
          // In pickup mode, edge players can add cards
          if (canAddMoreAttackCards(state)) {
            const playableIds = player.hand
              .filter(c => canPlayAsAttack(state, c))
              .map(c => c.id);
            if (playableIds.length > 0) {
              actions.push({ type: 'playCard', cardIds: playableIds });
            }
          }
          // Edge player can also press "бито" to pass
          if (!state.passedAttackers.includes(player.id)) {
            actions.push({ type: 'endAttack' });
          }
        } else {
          // Normal mode — edge can add cards when all defended or when there are cards on table
          const playableIds = player.hand
            .filter(c => canPlayAsAttack(state, c))
            .map(c => c.id);
          if (playableIds.length > 0) {
            actions.push({ type: 'playCard', cardIds: playableIds });
          }
          // Edge players can also click "бито" to pass
          if (state.battleField.every(p => p.defense) && !state.passedAttackers.includes(player.id)) {
            actions.push({ type: 'endAttack' });
          }
        }
      }
    }
  }

  return actions;
}

// ---- Client state conversion ----

export function toClientState(state: GameState, playerId: string): ClientGameState {
  const myIndex = state.players.findIndex(p => p.id === playerId);

  const clientPlayers: ClientPlayer[] = state.players.map(p => ({
    id: p.id,
    name: p.name,
    cardCount: p.hand.length,
    isOut: p.isOut,
    seatIndex: p.seatIndex,
    isBot: p.isBot,
    winPlace: p.winPlace,
  }));

  const playerCanAdd = myIndex >= 0 ? canPlayerAddCards(state, myIndex) : false;

  return {
    roomId: state.roomId,
    players: clientPlayers,
    deck1Count: state.deck1.length,
    deck2Count: state.deck2.length,
    trumpInfo: state.trumpInfo,
    battleField: state.battleField,
    discardCount: state.discardPile.length,
    currentAttackerIdx: state.currentAttackerIdx,
    currentDefenderIdx: state.currentDefenderIdx,
    direction: state.direction,
    turnPhase: state.turnPhase,
    gamePhase: state.gamePhase,
    firstTrick: state.firstTrick,
    trickCount: state.trickCount,
    myHand: myIndex >= 0 ? state.players[myIndex].hand : [],
    myIndex,
    winnersOrder: state.winnersOrder,
    loserId: state.loserId,
    turnTimer: state.turnTimer,
    turnTimerMax: state.turnTimerMax,
    leadCardRank: state.leadCardRank,
    attackerHasPriority: state.attackerHasPriority,
    passedAttackers: state.passedAttackers,
    canAddCards: playerCanAdd,
    defenderTaking: state.defenderTaking,
    revealedPassThroughs: state.revealedPassThroughs.map(r => ({
      playerId: r.playerId,
      cards: r.cards.map(c => ({ id: c.id, suit: c.suit, rank: c.rank, copy: c.copy })),
    })),
  };
}

// ---- Bot AI ----

export function getBotAction(state: GameState, botIdx: number): { action: string; cardId?: string; targetPairIdx?: number } | null {
  const player = state.players[botIdx];
  if (player.isOut || !player.isBot) return null;

  const actions = getAvailableActions(state, botIdx);
  if (actions.length === 0) return null;

  const isDefender = botIdx === state.currentDefenderIdx;
  const isAttacker = botIdx === state.currentAttackerIdx;

  if (shouldSkipTurn(state, botIdx)) {
    return { action: 'skipTurn' };
  }

  if (isDefender && state.turnPhase === 'defend' && !state.defenderTaking) {
    // Bot tries to transfer first (50% chance if possible, or if hand is weak)
    const transferAction = actions.find(a => a.type === 'transferCard');
    if (transferAction && transferAction.type === 'transferCard' && transferAction.cardIds.length > 0) {
      const shouldTransfer = Math.random() > 0.5 || player.hand.length > 10;
      if (shouldTransfer) {
        const transferCards = player.hand
          .filter(c => transferAction.cardIds.includes(c.id))
          .sort((a, b) => getCardValue(a) - getCardValue(b));
        if (transferCards.length > 0) {
          return { action: 'transferCard', cardId: transferCards[0].id };
        }
      }
    }

    // Try to defend with the cheapest card possible
    const undefended = state.battleField.filter(p => !p.defense);
    for (const pair of undefended) {
      const pairIdx = state.battleField.indexOf(pair);
      const candidates = player.hand
        .filter(c => canBeat(pair.attack, c, state.trumpInfo.currentTrump))
        .sort((a, b) => getCardValue(a) - getCardValue(b));
      if (candidates.length > 0) {
        return { action: 'playDefense', cardId: candidates[0].id, targetPairIdx: pairIdx };
      }
    }
    return { action: 'takeCards' };
  }

  if (isAttacker) {
    const playAction = actions.find(a => a.type === 'playCard');
    if (playAction && playAction.type === 'playCard' && playAction.cardIds.length > 0) {
      // In pickup mode, bot is more aggressive about adding cards
      const addChance = state.defenderTaking ? 0.8 : 1.0;
      if (Math.random() < addChance) {
        const playableCards = player.hand
          .filter(c => playAction.cardIds.includes(c.id))
          .sort((a, b) => getCardValue(a) - getCardValue(b));
        if (playableCards.length > 0) {
          return { action: 'playAttack', cardId: playableCards[0].id };
        }
      }
    }
    // Bot clicks "бито" to pass initiative
    if (actions.find(a => a.type === 'endAttack')) return { action: 'endAttack' };
  }

  // Edge player adding cards
  const addAction = actions.find(a => a.type === 'playCard');
  if (addAction && addAction.type === 'playCard') {
    const playableCards = player.hand
      .filter(c => addAction.cardIds.includes(c.id))
      .sort((a, b) => getCardValue(a) - getCardValue(b));
    if (playableCards.length > 0 && Math.random() > 0.4) {
      return { action: 'playAttack', cardId: playableCards[0].id };
    }
  }

  // Edge player "бито" pass
  if (actions.find(a => a.type === 'endAttack')) {
    return { action: 'endAttack' };
  }

  return null;
}
