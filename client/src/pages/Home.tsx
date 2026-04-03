import { useAuth } from "../../_core/hooks/useAuth";
import { getLoginUrl } from "../../const";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { useSocket } from "../../hooks/useSocket";
import Lobby from "./Lobby";
import WaitingRoom from "./WaitingRoom";
import GameTable from "../../components/GameTable";
import { CARD_IMAGES } from "../../../shared/cardAssets";
import { Loader2, Swords, Shield, Crown, Star, Users, Zap } from "lucide-react";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();

  const {
    connected,
    rooms,
    currentRoom,
    gameState,
    availableActions,
    turnTimer,
    gameOverData,
    createRoom,
    joinRoom,
    leaveRoom,
    closeRoom,
    toggleReady,
    startGame,
    playCard,
    transferCard,
    showPassThrough,
    takeCards,
    passTurn,
    endAttack,
    skipTurn,
    returnToLobby,
  } = useSocket(
    isAuthenticated ? user?.openId || null : null,
    isAuthenticated ? user?.name || 'Гость' : null
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f2035] to-[#0a1628] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // In game
  if (gameState && (gameState.gamePhase === 'playing' || gameState.gamePhase === 'finished')) {
    return (
      <GameTable
        gameState={gameState}
        availableActions={availableActions}
        turnTimer={turnTimer}
        gameOverData={gameOverData}
        onPlayCard={(cardId, targetPairIdx) => playCard(gameState.roomId, cardId, targetPairIdx)}
        onTransferCard={(cardId) => transferCard(gameState.roomId, cardId)}
        onTakeCards={() => takeCards(gameState.roomId)}
        onPassTurn={() => passTurn(gameState.roomId)}
        onEndAttack={() => endAttack(gameState.roomId)}
        onSkipTurn={() => skipTurn(gameState.roomId)}
        onShowPassThrough={(cardId) => showPassThrough(gameState.roomId, cardId)}
        onReturnToLobby={returnToLobby}
      />
    );
  }

  // In waiting room
  if (currentRoom) {
    return (
      <WaitingRoom
        room={currentRoom}
        userId={user?.openId || ''}
        onToggleReady={() => toggleReady(currentRoom.id)}
        onStartGame={() => startGame(currentRoom.id)}
        onLeave={() => leaveRoom(currentRoom.id)}
        onCloseRoom={() => closeRoom(currentRoom.id)}
      />
    );
  }

  // Lobby
  return (
    <Lobby
      rooms={rooms}
      connected={connected}
      userName={user?.name || 'Гость'}
      onCreateRoom={createRoom}
      onJoinRoom={joinRoom}
      onLogout={logout}
    />
  );
}

function LandingPage() {
  const faceCards = [
    CARD_IMAGES['K-spades'],
    CARD_IMAGES['Q-hearts'],
    CARD_IMAGES['J-diamonds'],
    CARD_IMAGES['A-clubs'],
    CARD_IMAGES['777'],
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f2035] to-[#0a1628] relative overflow-hidden">
      <div className="relative z-10">
        <div className="container mx-auto px-4 pt-12 pb-20 max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-amber-900/50 text-amber-300 border-amber-700 mb-4">
                <Star className="w-3 h-3 mr-1" /> Новая карточная игра
              </Badge>
              <h1 className="text-5xl lg:text-6xl font-bold text-amber-100 mb-4 leading-tight">
                Казахский<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                  Дурак Онлайн
                </span>
              </h1>
              <p className="text-amber-200/60 text-lg mb-8 max-w-lg">
                Классическая карточная игра с уникальными казахскими правилами.
              </p>
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg shadow-amber-900/40 text-lg px-8"
              >
                <a href={getLoginUrl()}>
                  Войти и играть
                </a>
              </Button>
            </div>
            <div className="flex justify-center items-center">
              <div className="relative">
                {faceCards.map((url, i) => (
                  <div
                    key={i}
                    className="absolute rounded-xl overflow-hidden shadow-2xl border-2 border-amber-700/40 w-32 h-48"
                    style={{
                      transform: `rotate(${(i - 2) * 12}deg) translateX(${(i - 2) * 40}px)`,
                      zIndex: i,
                    }}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                <div className="w-80 h-72" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
