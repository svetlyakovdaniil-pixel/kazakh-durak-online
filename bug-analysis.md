# Bug Analysis: Actions lost after reconnect

## Root Cause

There are TWO issues:

### Issue 1: Inconsistent index usage for getAvailableActions

In `broadcastGameState` (line 687):
```ts
const actions = getAvailableActions(gameState, p.seatIndex);
```

In reconnect handlers (lines 81, 115):
```ts
const playerIdx = gameState.players.findIndex(p => p.id === odId);
const actions = getAvailableActions(gameState, playerIdx);
```

`seatIndex` is set once at game creation and never changes. `findIndex` returns the current array position. These should be the same since the players array doesn't change order during the game, so this is NOT the primary issue.

### Issue 2: broadcastGameState only sends yourTurn when actions.length > 0

```ts
if (actions.length > 0) {
  io.to(sid).emit('yourTurn', actions);
}
```

When a player has NO actions (e.g., it's not their turn), the server never sends an empty `yourTurn` event. The client keeps the OLD `availableActions` from before the disconnect. After reconnect, the client may have stale actions that don't match the current game state.

BUT the reconnect handler also has this same pattern. So after reconnect, if the player CAN act, they should get correct actions.

### Issue 3: The REAL problem — client doesn't clear availableActions on gameStateUpdate

In useSocket.ts:
```ts
socket.on('gameStateUpdate', (s) => {
  setGameState(s);
  setTurnTimer(s.turnTimer);
  // NOTE: availableActions is NOT cleared here!
});
socket.on('yourTurn', (a) => setAvailableActions(a));
```

After reconnect:
1. Server sends `gameStateUpdate` → client updates game state
2. Server sends `yourTurn` with actions (IF player has actions)
3. But if server sends `yourTurn` AFTER `gameStateUpdate`, the client may briefly have stale actions
4. More importantly: if the player's actions change between broadcasts (e.g., they could add cards before disconnect but can't after some game state change), the stale actions remain

### Issue 4: Actions are never CLEARED — only overwritten when non-empty

The server ONLY sends `yourTurn` when `actions.length > 0`. If a player transitions from having actions to having NO actions, the client never gets notified to clear its `availableActions`. This means:

1. Player can add cards → has actions like `playCard`
2. Game state changes (e.g., attacker presses bito, priority changes)  
3. Player can no longer add cards → server doesn't send `yourTurn` (empty)
4. Client still shows old `playCard` actions
5. Player tries to play a card → server rejects with error

After reconnect, the same pattern applies: if the player currently has no actions, the server doesn't send `yourTurn`, so the client keeps whatever stale actions it had.

## Fix

1. **Server**: Always send `yourTurn` event, even when actions are empty (send empty array)
2. **Client**: Clear `availableActions` on `gameStateUpdate` before receiving new `yourTurn`
3. **Connection stability**: Increase ping timeouts and add transport upgrade fallback
