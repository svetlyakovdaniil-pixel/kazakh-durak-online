# Analysis Notes

## 1. UI — увеличить козырь и карты на столе
- PlayingCard.tsx: `small ? 'w-12 h-18' : 'w-16 h-24 sm:w-20 sm:h-30'`
- Карты на столе используют `<PlayingCard card={pair.attack} small />` — нужно убрать `small` или добавить `medium` размер
- Козырь в HUD: Badge с `<span className={trumpColor}>{trumpSymbol}</span>` — маленький текст, нужно увеличить

## 2. Баг отключения не-хост игроков
- Корневая причина: `socket.on('disconnect')` немедленно вызывает `handlePlayerLeaveRoom` для ВСЕХ комнат
- `handlePlayerLeaveRoom` для не-хоста: удаляет из `room.players`, отправляет `playerLeft`
- Нет grace period, нет reconnect recovery
- Socket.IO по умолчанию: pingTimeout=20000, pingInterval=25000 — итого ~45с до disconnect
- Но transient network issues или browser tab switching может вызвать disconnect раньше
- Решение: добавить grace period (30с) при disconnect — если игрок переподключится, восстановить его в комнате/игре

## 3. Проездной — текущая реализация НЕПРАВИЛЬНАЯ
- Текущий showPassThrough: УДАЛЯЕТ карту из руки, кладёт в discard, меняет attacker/defender
- Нужно: ПОКАЗАТЬ карту (не убирая из руки), ограничение 1 раз на карту за игру
- Нужно: добавить `passThroughUsed: Set<string>` в GameState (id карт, которые уже показывались)
- Нужно: добавить `revealedPassThrough: Card[]` в ClientGameState (видимые проездные)
- Карта должна быть козырной И совпадать по рангу с атакой
