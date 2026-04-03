import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function GameRoom() {
  const { roomId } = useParams();
  const [, setLocation] = useLocation();
  const [joined, setJoined] = useState(false);

  const socket = useSocket("temp-user", "Гость");

  useEffect(() => {
    if (!roomId || joined) return;

    socket.joinRoom(roomId).then(success => {
      if (success) {
        setJoined(true);
        toast.success("Вы в комнате");
      } else {
        toast.error("Не удалось зайти");
        setLocation("/");
      }
    });
  }, [roomId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a1628] to-[#0f2035]">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-amber-400" />
        <p className="text-amber-200">Загрузка комнаты {roomId}...</p>
        <Button variant="outline" className="mt-6" onClick={() => setLocation('/')}>
          Вернуться в лобби
        </Button>
      </div>
    </div>
  );
}
