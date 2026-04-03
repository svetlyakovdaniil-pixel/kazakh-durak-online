// client/src/pages/GameRoom.tsx
import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useSocket } from '@/hooks/useSocket';
import WaitingRoom from '@/components/WaitingRoom';
import GameTable from '@/components/GameTable';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function GameRoom() {
  const { roomId } = useParams();
  const [, setLocation] = useLocation();
  const [joined, setJoined] = useState(false);

  const {
    currentRoom,
    gameState,
    availableActions,
    turnTimer,
    gameOverData,
    joinRoom,
    playCard,
    transferCard,
    showPassThrough,
    takeCards,
    passTurn,
    endAttack,
    skipTurn,
    returnToLobby,
  } = useSocket("temp-user", "Гость");

  useEffect(() => {
    if (!roomId || joined) return;

    joinRoom(roomId).then((success) => {
      if (success) {
        setJoined(true);
        toast.success("Вы присоединились к комнате");
      } else {
        toast.error("Не удалось присоединиться к комнате");
        setLocation("/");
      }
    });
  }, [roomId, joinRoom, joined, setLocation]);

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

  if (currentRoom) {
    return (
      <WaitingRoom
        room={currentRoom}
        userId="temp-user"
        onToggleReady={() => {}}
        onStartGame={() => {}}
        onLeave={returnToLobby}
        onCloseRoom={() => {}}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a1628] to-[#0f2035]">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-amber-400" />
        <p className="text-amber-200">Подключаемся к комнате...</p>
        <Button variant="outline" className="mt-6" onClick={() => setLocation('/')}>
          Вернуться в лобби
        </Button>
      </div>
    </div>
  );
}
