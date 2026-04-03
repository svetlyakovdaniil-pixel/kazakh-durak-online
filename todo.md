# Казахский Дурак Онлайн — TODO

## Server-side
- [x] Shared game types (gameTypes.ts) — cards, suits, ranks, game state, room, socket events
- [x] Shared card assets (cardAssets.ts) — CDN URLs for face cards, card back, game table
- [x] Game engine (gameEngine.ts) — full game logic with all Kazakh Durak rules
- [x] Socket server (socketServer.ts) — WebSocket rooms, multiplayer, bots, timers
- [x] Register socket server in server/_core/index.ts

## Client-side
- [x] Dark theme with amber/gold color scheme
- [x] useSocket hook — client WebSocket connection and game state management
- [x] PlayingCard component — card rendering with face/back images
- [x] GameTable component — main game UI with battlefield, hand, actions
- [x] Lobby page — room list, create room dialog
- [x] WaitingRoom page — player list, ready toggle, start game
- [x] Home page — landing page (unauthenticated) + game flow (authenticated)
- [x] App.tsx — dark theme, routing

## Improvements needed
- [x] Add passTurn button for non-attacker/non-defender players in GameTable (uses skipTurn action)
- [x] Handle useSocket events properly (trumpChanged, directionChanged, gameOver)
- [x] Add "Вернуться в лобби" button on game over screen

## Testing
- [x] Game engine unit tests (61 tests)
- [x] Socket server integration tests (10 tests)
- [x] Auth logout test (1 test)
- [x] All 72 tests passing

## Механика хода — исправления
- [x] Приоритет хода атакующего: edge-игроки НЕ могут подкидывать, пока текущий атакующий не нажмёт "бито". После "бито" атакующего — ход переходит к edge-игроку. Если edge-игрок подкинул карту, которую защитник отбил картой, совпадающей с рукой атакующего — атакующий снова получает приоритет.
- [x] Механика "взять": когда защитник нажимает "взять", атакующие получают возможность докинуть карты (до лимита). Только после того как все атакующие нажмут "бито" — защитник забирает карты со стола.
- [x] Лимит карт: первая бита — не более 13 карт. Далее — не более количества карт в руке защитника.
- [x] Обновить UI: показывать состояние "Защитник берёт — можно докинуть" и соответствующие кнопки
- [x] Обновить тесты для новой механики (84 теста проходят)

## UI улучшения
- [x] Увеличить значок козыря — text-2xl с большим padding
- [x] Увеличить карты на столе (battlefield) — medium размер вместо small

## Баг: отключение не-хост игроков
- [x] Исправлено: 45с grace period при disconnect, auto-reconnect с rejoinRoom, трекинг комнат игроков, передача хоста при выходе

## Механика "проездной"
- [x] Если на игрока походили, и у него в руке есть козырная карта с таким же номиналом — он может показать её (не выкладывая на стол) как "проездной"
- [x] Ограничение: каждая конкретная карта может быть показана как проездной только 1 раз за игру
- [x] Если у игрока 2 такие карты — он может показать проездной 2 раза
- [x] Другим игрокам нужно показать, что у этого игрока есть проездные карты (UI индикатор)
- [x] Карты-проездные НЕ выкладываются на стол, только показываются
- [x] Обновить тесты для механики проездной (94 теста проходят)

## Баг: после reconnect нельзя подкидывать карты
- [x] Исправлено: сервер всегда отправляет yourTurn (даже пустой массив), клиент сбрасывает stale actions при gameStateUpdate
- [x] Стабилизация: pingTimeout 60s, pingInterval 25s, reconnectionAttempts Infinity, reconnectionDelay 500ms, transport upgrade+remember
- [x] rejoinRoom всегда отправляет полное состояние игры + актуальные действия
