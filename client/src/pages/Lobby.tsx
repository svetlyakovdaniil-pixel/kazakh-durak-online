import { useState } from 'react';
import type { Room, RoomSettings } from '../../../shared/gameTypes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Users, Timer, Bot, Plus, Wifi, WifiOff, LogOut, Gamepad2 } from 'lucide-react';

interface LobbyProps {
  rooms: Room[];
  connected: boolean;
  userName: string;
  onCreateRoom: (name: string, maxPlayers: number, settings: RoomSettings) => Promise<Room>;
  onJoinRoom: (roomId: string) => Promise<boolean>;
  onLogout: () => void;
}

export default function Lobby({ rooms, connected, userName, onCreateRoom, onJoinRoom, onLogout }: LobbyProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('4');
  const [withBots, setWithBots] = useState(true);
  const [botCount, setBotCount] = useState(3);
  const [turnTimer, setTurnTimer] = useState(30);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    const settings: RoomSettings = {
      turnTimer,
      withBots,
      botCount: withBots ? botCount : 0,
    };
    await onCreateRoom(roomName || `Комната ${userName}`, parseInt(maxPlayers), settings);
    setLoading(false);
    setDialogOpen(false);
    setRoomName('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f2035] to-[#0a1628]">
      {/* Header */}
      <div className="border-b border-amber-700/20 bg-black/30 backdrop-blur-sm">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl font-bold text-amber-100">Казахский Дурак</h1>
            <Badge variant="outline" className={`text-xs ${connected ? 'border-green-600/40 text-green-400' : 'border-red-600/40 text-red-400'}`}>
              {connected ? <><Wifi className="w-3 h-3 mr-1" /> Онлайн</> : <><WifiOff className="w-3 h-3 mr-1" /> Оффлайн</>}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-amber-200/60">{userName}</span>
            <Button variant="ghost" size="sm" className="text-amber-200/50 hover:text-amber-100" onClick={onLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-amber-100">Комнаты</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-600 hover:bg-amber-500 text-white">
                <Plus className="w-4 h-4 mr-2" /> Создать комнату
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a2d45] border-amber-700/30 text-amber-100">
              <DialogHeader>
                <DialogTitle className="text-amber-100">Новая комната</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-amber-200/70">Название</Label>
                  <Input
                    value={roomName}
                    onChange={e => setRoomName(e.target.value)}
                    placeholder={`Комната ${userName}`}
                    className="bg-[#0f2035] border-amber-700/30 text-amber-100"
                  />
                </div>
                <div>
                  <Label className="text-amber-200/70">Макс. игроков</Label>
                  <Select value={maxPlayers} onValueChange={setMaxPlayers}>
                    <SelectTrigger className="bg-[#0f2035] border-amber-700/30 text-amber-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2d45] border-amber-700/30">
                      {[2, 3, 4, 5, 6].map(n => (
                        <SelectItem key={n} value={String(n)} className="text-amber-100">{n} игроков</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-amber-200/70">Таймер хода: {turnTimer}с</Label>
                  <Slider
                    value={[turnTimer]}
                    onValueChange={v => setTurnTimer(v[0])}
                    min={15}
                    max={60}
                    step={5}
                    className="mt-2"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-amber-200/70">Добавить ботов</Label>
                  <Switch checked={withBots} onCheckedChange={setWithBots} />
                </div>
                {withBots && (
                  <div>
                    <Label className="text-amber-200/70">Количество ботов: {botCount}</Label>
                    <Slider
                      value={[botCount]}
                      onValueChange={v => setBotCount(v[0])}
                      min={1}
                      max={parseInt(maxPlayers) - 1}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                )}
                <Button
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white"
                  onClick={handleCreate}
                  disabled={loading}
                >
                  {loading ? 'Создание...' : 'Создать'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {rooms.length === 0 ? (
          <div className="text-center py-20">
            <Gamepad2 className="w-16 h-16 text-amber-700/30 mx-auto mb-4" />
            <p className="text-amber-200/40 text-lg">Пока нет комнат</p>
            <p className="text-amber-200/30 text-sm mt-1">Создайте первую комнату, чтобы начать игру</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map(room => (
              <div
                key={room.id}
                className="bg-[#1a2d45]/60 border border-amber-700/20 rounded-xl p-4 hover:border-amber-500/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-amber-100 truncate">{room.name}</h3>
                  <Badge variant="outline" className="border-amber-700/30 text-amber-200/60 text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    {room.players.length}/{room.maxPlayers}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge variant="outline" className="border-amber-700/20 text-amber-200/50 text-xs">
                    <Timer className="w-3 h-3 mr-1" /> {room.settings.turnTimer}с
                  </Badge>
                  {room.settings.withBots && (
                    <Badge variant="outline" className="border-amber-700/20 text-amber-200/50 text-xs">
                      <Bot className="w-3 h-3 mr-1" /> {room.settings.botCount} бот
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 mb-3 flex-wrap">
                  {room.players.map(p => (
                    <Badge key={p.id} className={`text-xs ${p.isBot ? 'bg-purple-900/40 text-purple-300 border-purple-700/30' : p.ready ? 'bg-green-900/40 text-green-300 border-green-700/30' : 'bg-amber-900/40 text-amber-300 border-amber-700/30'}`}>
                      {p.isBot && <Bot className="w-2.5 h-2.5 mr-0.5" />}
                      {p.name}
                    </Badge>
                  ))}
                </div>
                <Button
                  className="w-full bg-amber-700/60 hover:bg-amber-600/60 text-amber-100"
                  disabled={room.players.length >= room.maxPlayers || !!room.gameState}
                  onClick={() => onJoinRoom(room.id)}
                >
                  {room.gameState ? 'Идёт игра' : room.players.length >= room.maxPlayers ? 'Полная' : 'Войти'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
