import type { Room } from '../../../shared/gameTypes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Timer, Bot, Crown, Check, X, Gamepad2 } from 'lucide-react';

interface WaitingRoomProps {
  room: Room;
  userId: string;
  onToggleReady: () => void;
  onStartGame: () => void;
  onLeave: () => void;
  onCloseRoom: () => void;
}

export default function WaitingRoom({ room, userId, onToggleReady, onStartGame, onLeave, onCloseRoom }: WaitingRoomProps) {
  const isHost = room.hostId === userId;
  const myPlayer = room.players.find(p => p.id === userId);
  const allReady = room.players.length >= 2 && room.players.every(p => p.isBot || p.ready);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f2035] to-[#0a1628] flex items-center justify-center p-4">
      <div className="bg-[#1a2d45]/80 border border-amber-700/30 rounded-2xl p-6 max-w-md w-full">
        <div className="text-center mb-6">
          <Gamepad2 className="w-10 h-10 text-amber-400 mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-amber-100">{room.name}</h2>
          <div className="flex items-center justify-center gap-3 mt-2">
            <Badge variant="outline" className="border-amber-700/30 text-amber-200/60 text-xs">
              <Users className="w-3 h-3 mr-1" /> {room.players.length}/{room.maxPlayers}
            </Badge>
            <Badge variant="outline" className="border-amber-700/30 text-amber-200/60 text-xs">
              <Timer className="w-3 h-3 mr-1" /> {room.settings.turnTimer}с
            </Badge>
            {room.settings.withBots && (
              <Badge variant="outline" className="border-amber-700/30 text-amber-200/60 text-xs">
                <Bot className="w-3 h-3 mr-1" /> {room.settings.botCount}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2 mb-6">
          {room.players.map(p => (
            <div
              key={p.id}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                p.ready || p.isBot
                  ? 'bg-green-900/20 border-green-700/20'
                  : 'bg-[#0f2035]/50 border-amber-700/10'
              }`}
            >
              <div className="flex items-center gap-2">
                {p.id === room.hostId && <Crown className="w-4 h-4 text-amber-400" />}
                {p.isBot && <Bot className="w-4 h-4 text-purple-400" />}
                <span className="text-amber-100 font-medium">{p.name}</span>
              </div>
              {p.isBot ? (
                <Badge className="bg-green-900/40 text-green-300 border-green-700/30 text-xs">Готов</Badge>
              ) : p.ready ? (
                <Badge className="bg-green-900/40 text-green-300 border-green-700/30 text-xs">
                  <Check className="w-3 h-3 mr-1" /> Готов
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-700/30 text-amber-200/50 text-xs">
                  <X className="w-3 h-3 mr-1" /> Не готов
                </Badge>
              )}
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => (
            <div key={`empty-${i}`} className="flex items-center justify-center px-4 py-3 rounded-xl border border-dashed border-amber-700/15 text-amber-200/20 text-sm">
              Ожидание игрока...
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          {isHost ? (
            <>
              <Button
                variant="outline"
                className="border-red-700/40 text-red-300 hover:bg-red-900/30"
                onClick={onCloseRoom}
              >
                Закрыть
              </Button>
              <Button
                className={`flex-1 ${myPlayer?.ready ? 'bg-green-700 hover:bg-green-600' : 'bg-amber-600 hover:bg-amber-500'} text-white`}
                onClick={onToggleReady}
              >
                {myPlayer?.ready ? 'Не готов' : 'Готов'}
              </Button>
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50"
                disabled={!allReady}
                onClick={onStartGame}
              >
                Начать игру
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="flex-1 border-amber-700/40 text-amber-200 hover:bg-amber-900/30"
                onClick={onLeave}
              >
                Выйти
              </Button>
              <Button
                className={`flex-1 ${myPlayer?.ready ? 'bg-green-700 hover:bg-green-600' : 'bg-amber-600 hover:bg-amber-500'} text-white`}
                onClick={onToggleReady}
              >
                {myPlayer?.ready ? 'Не готов' : 'Готов'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
