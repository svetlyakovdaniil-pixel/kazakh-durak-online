import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f2035] to-[#0a1628] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-6 text-amber-400" />
        <h1 className="text-5xl font-bold text-white mb-2">Казахский Дурак Онлайн</h1>
        <p className="text-amber-200 text-xl">Загрузка лобби...</p>
      </div>
    </div>
  );
}
