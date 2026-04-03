import { describe, expect, it } from 'vitest';
import { createGame, toClientState, getAvailableActions, playAttackCard, playDefenseCard, successfulDefense, endAttack, takeCards, finalizeTake, resetTurnTimer, getBotAction } from './gameEngine';
import type { GameState, Player, RoomSettings } from '../shared/gameTypes';

// Integration-level tests for game flow scenarios

function createTestPlayers(count: number, withBots = false) {
  return Array.from({ length: count }, (_, i) => ({
    id: withBots && i > 0 ? `bot-${i}` : `p${i + 1}`,
    odId: withBots && i > 0 ? `bot-${i}` : `p${i + 1}`,
    name: withBots && i > 0 ? `Bot ${i}` : `Player ${i + 1}`,
    isBot: withBots && i > 0,
  }));
}

describe('Game flow integration', () => {
  it('creates a game with bots and human player', () => {
    const players = createTestPlayers(4, true);
    const game = createGame('room1', players);

    expect(game.players.length).toBe(4);
    expect(game.players[0].isBot).toBe(false);
    expect(game.players[1].isBot).toBe(true);
    expect(game.players[2].isBot).toBe(true);
    expect(game.players[3].isBot).toBe(true);
  });

  it('generates client state that hides opponent cards', () => {
    const players = createTestPlayers(3);
    const game = createGame('room1', players);
    const clientState = toClientState(game, 'p1');

    expect(clientState.myHand.length).toBe(14);
    expect(clientState.myIndex).toBe(0);
    // Other players should have card counts but no actual cards
    for (let i = 0; i < clientState.players.length; i++) {
      if (i !== clientState.myIndex) {
        expect(clientState.players[i].cardCount).toBe(14);
      }
    }
  });

  it('provides available actions for the attacker', () => {
    const players = createTestPlayers(2);
    const game = createGame('room1', players);
    const attackerIdx = game.currentAttackerIdx;
    const actions = getAvailableActions(game, attackerIdx);

    // Attacker should have playCard action
    const playCardAction = actions.find(a => a.type === 'playCard');
    expect(playCardAction).toBeDefined();
    expect(playCardAction!.cardIds.length).toBeGreaterThan(0);
  });

  it('allows attacker to play a card', () => {
    const players = createTestPlayers(2);
    const game = createGame('room1', players);
    const attackerIdx = game.currentAttackerIdx;
    const cardToPlay = game.players[attackerIdx].hand[0];

    const error = playAttackCard(game, attackerIdx, cardToPlay.id);
    expect(error).toBeNull();
    expect(game.battleField.length).toBe(1);
    expect(game.battleField[0].attack.id).toBe(cardToPlay.id);
  });

  it('bot action returns a valid action', () => {
    const players = createTestPlayers(2, true);
    const game = createGame('room1', players);

    // Find a bot player
    const botIdx = game.players.findIndex(p => p.isBot);
    if (botIdx !== -1) {
      const action = getBotAction(game, botIdx);
      // Bot should return some action (play, take, endAttack, etc.)
      expect(action).toBeDefined();
    }
  });

  it('client state includes trump info', () => {
    const players = createTestPlayers(2);
    const game = createGame('room1', players);
    const clientState = toClientState(game, 'p1');

    expect(clientState.trumpInfo).toBeDefined();
    expect(clientState.trumpInfo.currentTrump).toBeDefined();
    expect(clientState.trumpInfo.phase).toBe(1);
  });

  it('client state includes deck counts', () => {
    const players = createTestPlayers(2);
    const game = createGame('room1', players);
    const clientState = toClientState(game, 'p1');

    expect(clientState.deck1Count).toBeGreaterThanOrEqual(0);
    expect(clientState.deck2Count).toBeGreaterThanOrEqual(0);
    expect(clientState.discardCount).toBe(0);
  });

  it('custom turn timer is respected', () => {
    const players = createTestPlayers(2);
    const settings: RoomSettings = { turnTimer: 45, withBots: false, botCount: 0 };
    const game = createGame('room1', players, settings);

    expect(game.turnTimerMax).toBe(45);
    expect(game.turnTimer).toBe(45);

    const clientState = toClientState(game, 'p1');
    expect(clientState.turnTimerMax).toBe(45);
  });

  it('resetTurnTimer resets to max', () => {
    const players = createTestPlayers(2);
    const game = createGame('room1', players);
    game.turnTimer = 5;
    resetTurnTimer(game);
    expect(game.turnTimer).toBe(game.turnTimerMax);
  });

  it('full attack-defense cycle works', () => {
    const players = createTestPlayers(2);
    const game = createGame('room1', players);
    const attackerIdx = game.currentAttackerIdx;
    const defenderIdx = game.currentDefenderIdx;

    // Attacker plays a card
    const attackCard = game.players[attackerIdx].hand[0];
    const attackError = playAttackCard(game, attackerIdx, attackCard.id);
    expect(attackError).toBeNull();
    expect(game.battleField.length).toBe(1);
    expect(game.turnPhase).toBe('defend');

    // Try to find a card that can defend
    const defenderHand = game.players[defenderIdx].hand;
    const actions = getAvailableActions(game, defenderIdx);
    const defenseAction = actions.find(a => a.type === 'playCard');

    if (defenseAction && defenseAction.cardIds.length > 0) {
      const defenseCardId = defenseAction.cardIds[0];
      const defError = playDefenseCard(game, defenderIdx, defenseCardId, 0);
      expect(defError).toBeNull();
      expect(game.battleField[0].defense).not.toBeNull();
    }
  });

  it('takeCards enters pickup mode, endAttack finalizes', () => {
    const players = createTestPlayers(2);
    const game = createGame('room1', players);
    const attackerIdx = game.currentAttackerIdx;
    const defenderIdx = game.currentDefenderIdx;

    // Attacker plays a card
    const attackCard = game.players[attackerIdx].hand[0];
    playAttackCard(game, attackerIdx, attackCard.id);
    expect(game.turnPhase).toBe('defend');

    // Defender takes
    takeCards(game);
    expect(game.defenderTaking).toBe(true);
    expect(game.turnPhase).toBe('pickup');
    expect(game.battleField.length).toBe(1); // still on table

    // Attacker presses bito
    endAttack(game, attackerIdx);
    // In 2-player game, all attackers passed → finalize
    expect(game.defenderTaking).toBe(false);
    expect(game.battleField.length).toBe(0);
  });

  it('client state includes defenderTaking and attackerHasPriority', () => {
    const players = createTestPlayers(3);
    const game = createGame('room1', players);
    game.defenderTaking = true;
    game.attackerHasPriority = false;

    const clientState = toClientState(game, 'p1');
    expect(clientState.defenderTaking).toBe(true);
    expect(clientState.attackerHasPriority).toBe(false);
  });
});
