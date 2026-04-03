import { useState, useMemo } from 'react';
import type { ClientGameState, AvailableAction, Card, BattlePair } from '../../../shared/gameTypes';
import { RANK_ORDER } from '../../../shared/gameTypes';
import { SUIT_SYMBOLS, GAME_TABLE_URL } from '../../../shared/cardAssets';
import PlayingCard from './PlayingCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Swords, Shield, ArrowRight, ArrowLeft, Timer, Layers, Trash2, Crown, Trophy, Frown, Home, HandMetal, Eye } from 'lucide-react';

const SUIT_ORDER: Record<string, number> = { spades: 0, clubs: 1, diamonds: 2, hearts: 3 };

function sortHand(hand: Card[], mode: 'suit-rank' | 'rank-only'): Card[] {
  return [...hand].sort((a, b) => {
    if (a.rank === '777') return 1;
    if (b.rank === '777') return -1;
    if (mode === 'suit-rank') {
      const suitDiff = (SUIT_ORDER[a.suit || ''] ?? 4) - (SUIT_ORDER[b.suit || ''] ?? 4);
      if (suitDiff !== 0) return suitDiff;
    }
    return (RANK_ORDER[a.rank] ?? 0) - (RANK_ORDER[b.rank] ?? 0);
  });
}

export interface GameTableProps {
  gameState: ClientGameState;
  availableActions: AvailableAction[];
  turnTimer: number;
  gameOverData?: { winnersOrder: string[]; loserId: string | null } | null;
  onPlayCard: (cardId: string, targetPairIdx?: number) => void;
  onTransferCard: (cardId: string) => void;
  onTakeCards: () => void;
  onPassTurn: () => void;
  onEndAttack: () => void;
  onSkipTurn: () => void;
  onShowPassThrough: (cardId: string) => void;
  onReturnToLobby?: () => void;
}

export default function GameTable({
  gameState, availableActions, turnTimer, gameOverData,
  onPlayCard, onTransferCard, onTakeCards, onPassTurn, onEndAttack, onSkipTurn, onShowPassThrough,
  onReturnToLobby,
}: GameTableProps) {
  const [sortMode, setSortMode] = useState<'suit-rank' | 'rank-only'>('suit-rank');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const gs = gameState;
  const myIdx = gs.myIndex;
  const isAttacker = myIdx === gs.currentAttackerIdx;
  const isDefender = myIdx === gs.currentDefenderIdx;

  const playableIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of availableActions) {
      if (a.type === 'playCard') a.cardIds.forEach(id => ids.add(id));
    }
    return ids;
  }, [availableActions]);

  const transferIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of availableActions) {
      if (a.type === 'transferCard') a.cardIds.forEach(id => ids.add(id));
    }
    return ids;
  }, [availableActions]);

  const passThroughIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of availableActions) {
      if (a.type === 'showPassThrough') a.cardIds.forEach(id => ids.add(id));
    }
    return ids;
  }, [availableActions]);

  const canTake = availableActions.some(a => a.type === 'takeCards');
  const canEndAttack = availableActions.some(a => a.type === 'endAttack');
  const canSkip = availableActions.some(a => a.type === 'skipTurn');
  const canTransfer = transferIds.size > 0;
  const canPassThrough = passThroughIds.size > 0;

  const sortedHand = sortHand(gs.myHand, sortMode);

  const handleCardClick = (card: Card) => {
    if (isDefender && gs.turnPhase === 'defend' && !gs.defenderTaking) {
      // If card is a transfer or passThrough candidate, select it
      if (transferIds.has(card.id) || passThroughIds.has(card.id)) {
        if (selectedCardId === card.id) {
          setSelectedCardId(null);
        } else {
          setSelectedCardId(card.id);
        }
        return;
      }
      if (playableIds.has(card.id)) {
        const undefended = gs.battleField
          .map((p, i) => ({ pair: p, idx: i }))
          .filter(x => !x.pair.defense);
        if (undefended.length === 1) {
          onPlayCard(card.id, undefended[0].idx);
        } else {
          onPlayCard(card.id);
        }
        return;
      }
    }
    if (playableIds.has(card.id)) {
      onPlayCard(card.id);
    }
  };

  const trumpSymbol = SUIT_SYMBOLS[gs.trumpInfo.currentTrump] || '';
  const trumpColor = gs.trumpInfo.currentTrump === 'hearts' || gs.trumpInfo.currentTrump === 'diamonds' ? 'text-red-400' : 'text-gray-200';

  const opponents = gs.players.filter((_, i) => i !== myIdx);

  // Game over overlay
  if (gs.gamePhase === 'finished') {
    const myPlayer = gs.players[myIdx];
    const isLoser = gs.loserId === myPlayer?.id;
    const isWinner = myPlayer?.winPlace !== null && myPlayer?.winPlace !== undefined;

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f2035] to-[#0a1628] flex items-center justify-center p-4">
        <div className="bg-[#1a2d45]/90 border border-amber-700/30 rounded-2xl p-8 max-w-md w-full text-center space-y-6">
          <div className="text-6xl mb-4">
            {isLoser ? '😢' : '🎉'}
          </div>
          <h2 className="text-3xl font-bold text-amber-100">
            {isLoser ? 'Вы проиграли!' : isWinner ? `Вы победили! (${myPlayer.winPlace}-е место)` : 'Игра окончена!'}
          </h2>

          <div className="space-y-2">
            <h3 className="text-amber-400 font-semibold text-lg">Результаты:</h3>
            {gs.players.map(p => (
              <div key={p.id} className={`flex items-center justify-between px-4 py-2 rounded-lg ${
                p.id === gs.loserId ? 'bg-red-900/30 border border-red-700/30' :
                p.winPlace ? 'bg-green-900/20 border border-green-700/20' : 'bg-[#0f2035]/50'
              }`}>
                <span className="text-amber-100 flex items-center gap-2">
                  {p.winPlace && <Trophy className="w-4 h-4 text-amber-400" />}
                  {p.id === gs.loserId && <Frown className="w-4 h-4 text-red-400" />}
                  {p.name}
                </span>
                <span className={p.id === gs.loserId ? 'text-red-400' : 'text-green-400'}>
                  {p.id === gs.loserId ? 'Дурак' : p.winPlace ? `${p.winPlace}-е место` : ''}
                </span>
              </div>
            ))}
          </div>

          {onReturnToLobby && (
            <Button
              size="lg"
              className="w-full bg-amber-600 hover:bg-amber-500 text-white"
              onClick={onReturnToLobby}
            >
              <Home className="w-4 h-4 mr-2" />
              Вернуться в лобби
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat relative flex flex-col"
      style={{ backgroundImage: `url(${GAME_TABLE_URL})` }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 flex flex-col h-screen">
        {/* Top HUD */}
        <div className="flex items-center justify-between px-3 py-2 bg-black/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-amber-900/60 text-amber-300 border-amber-700/40 px-3 py-1.5">
              <span className={`${trumpColor} text-2xl leading-none`}>{trumpSymbol}</span>
              <span className="ml-2 text-sm font-medium">Фаза {gs.trumpInfo.phase}/3</span>
            </Badge>
            <Badge variant="outline" className="border-amber-700/30 text-amber-200/70 text-xs">
              <Layers className="w-3 h-3 mr-1" />
              {gs.deck1Count + gs.deck2Count}
            </Badge>
            <Badge variant="outline" className="border-amber-700/30 text-amber-200/70 text-xs">
              <Trash2 className="w-3 h-3 mr-1" />
              {gs.discardCount}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-amber-700/30 text-amber-200/70 text-xs">
              {gs.direction === 'cw' ? <ArrowRight className="w-3 h-3" /> : <ArrowLeft className="w-3 h-3" />}
            </Badge>
            <Badge className={`${turnTimer <= 5 ? 'bg-red-900/60 text-red-300 border-red-700/40 animate-pulse' : 'bg-amber-900/60 text-amber-300 border-amber-700/40'}`}>
              <Timer className="w-3 h-3 mr-1" />
              {turnTimer}с
            </Badge>
          </div>
        </div>

        {/* Opponents */}
        <div className="flex justify-center gap-3 px-3 py-2 flex-wrap">
          {opponents.map(p => {
            const pIdx = gs.players.findIndex(pp => pp.id === p.id);
            const isOppAttacker = pIdx === gs.currentAttackerIdx;
            const isOppDefender = pIdx === gs.currentDefenderIdx;
            // Check if this opponent has revealed pass-through cards
            const oppRevealed = gs.revealedPassThroughs?.find(r => r.playerId === p.id);
            return (
              <div key={p.id} className={`flex flex-col items-center px-3 py-2 rounded-xl border transition-all ${
                isOppAttacker ? 'bg-red-900/30 border-red-500/40' :
                isOppDefender ? (gs.defenderTaking ? 'bg-orange-900/30 border-orange-500/40' : 'bg-blue-900/30 border-blue-500/40') :
                'bg-black/30 border-amber-700/20'
              }`}>
                <div className="flex items-center gap-1 mb-1">
                  {isOppAttacker && <Swords className="w-3 h-3 text-red-400" />}
                  {isOppDefender && !gs.defenderTaking && <Shield className="w-3 h-3 text-blue-400" />}
                  {isOppDefender && gs.defenderTaking && <HandMetal className="w-3 h-3 text-orange-400" />}
                  {p.isOut && p.winPlace && <Crown className="w-3 h-3 text-amber-400" />}
                  <span className="text-xs text-amber-100 font-medium truncate max-w-20">{p.name}</span>
                </div>
                {isOppDefender && gs.defenderTaking && (
                  <span className="text-[10px] text-orange-400 mb-0.5">Берёт</span>
                )}
                {/* Show revealed pass-through cards */}
                {oppRevealed && oppRevealed.cards.length > 0 && (
                  <div className="flex items-center gap-1 mb-1 bg-yellow-900/40 border border-yellow-600/40 rounded px-2 py-0.5">
                    <Eye className="w-3 h-3 text-yellow-400" />
                    <span className="text-[10px] text-yellow-300 font-medium">
                      Проездной: {oppRevealed.cards.length}
                    </span>
                    <div className="flex gap-0.5 ml-1">
                      {oppRevealed.cards.map(c => (
                        <span key={c.id} className="text-xs">
                          {SUIT_SYMBOLS[c.suit as keyof typeof SUIT_SYMBOLS] || ''}{c.rank}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {p.isOut ? (
                  <span className="text-xs text-green-400">{p.winPlace}-е место</span>
                ) : (
                  <div className="flex gap-0.5">
                    {Array.from({ length: Math.min(p.cardCount, 14) }).map((_, i) => (
                      <div key={i} className="w-3 h-5 bg-amber-900/60 rounded-sm border border-amber-700/30" />
                    ))}
                    {p.cardCount > 14 && <span className="text-xs text-amber-400 ml-1">+{p.cardCount - 14}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Battlefield */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="flex flex-col items-center gap-2">
            {/* Defender taking banner */}
            {gs.defenderTaking && (
              <div className="bg-orange-900/60 border border-orange-600/40 rounded-lg px-4 py-1.5 mb-2">
                <span className="text-orange-300 text-sm font-medium">
                  {isDefender ? '🫳 Вы берёте — ждите, пока атакующие докинут' :
                   isAttacker ? '🔥 Защитник берёт — можно докинуть карты!' :
                   gs.attackerHasPriority ? '⏳ Ожидание — атакующий решает' :
                   '🔥 Защитник берёт — можно докинуть карты!'}
                </span>
              </div>
            )}

            {/* Revealed pass-through cards banner (my own) */}
            {gs.revealedPassThroughs && gs.revealedPassThroughs.find(r => r.playerId === gs.players[myIdx]?.id) && (
              <div className="bg-yellow-900/50 border border-yellow-600/40 rounded-lg px-4 py-1.5 mb-2">
                <span className="text-yellow-300 text-sm font-medium flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Вы показали проездной ({gs.revealedPassThroughs.find(r => r.playerId === gs.players[myIdx]?.id)!.cards.length} шт.)
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-3 justify-center max-w-2xl">
              {gs.battleField.map((pair: BattlePair, i: number) => (
                <div key={i} className="relative">
                  <PlayingCard card={pair.attack} medium />
                  {pair.defense && (
                    <div className="absolute top-4 left-4">
                      <PlayingCard card={pair.defense} medium />
                    </div>
                  )}
                </div>
              ))}
              {gs.battleField.length === 0 && (
                <div className="text-amber-200/30 text-sm italic">Стол пуст</div>
              )}
            </div>
          </div>
        </div>

        {/* Role indicator & Actions */}
        <div className="flex items-center justify-center gap-2 px-3 py-1">
          {isAttacker && !gs.defenderTaking && (
            <Badge className="bg-red-900/60 text-red-300 border-red-700/40">
              <Swords className="w-3 h-3 mr-1" /> Вы атакуете
            </Badge>
          )}
          {isAttacker && gs.defenderTaking && (
            <Badge className="bg-orange-900/60 text-orange-300 border-orange-700/40">
              <Swords className="w-3 h-3 mr-1" /> Можно докинуть
            </Badge>
          )}
          {isDefender && !gs.defenderTaking && (
            <Badge className="bg-blue-900/60 text-blue-300 border-blue-700/40">
              <Shield className="w-3 h-3 mr-1" /> Вы защищаетесь
            </Badge>
          )}
          {isDefender && gs.defenderTaking && (
            <Badge className="bg-orange-900/60 text-orange-300 border-orange-700/40">
              <HandMetal className="w-3 h-3 mr-1" /> Вы берёте карты
            </Badge>
          )}
          {!isAttacker && !isDefender && gs.canAddCards && !gs.attackerHasPriority && (
            <Badge className="bg-amber-900/60 text-amber-300 border-amber-700/40">
              Можно подкинуть
            </Badge>
          )}
          {!isAttacker && !isDefender && gs.canAddCards && gs.attackerHasPriority && (
            <Badge className="bg-gray-800/60 text-gray-400 border-gray-700/40">
              Ожидание атакующего...
            </Badge>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-2 px-3 py-1 flex-wrap">
          {canTransfer && selectedCardId && transferIds.has(selectedCardId) && (
            <Button
              size="sm"
              className="bg-purple-700 hover:bg-purple-600 text-white"
              onClick={() => { onTransferCard(selectedCardId); setSelectedCardId(null); }}
            >
              Перевести
            </Button>
          )}
          {canPassThrough && selectedCardId && passThroughIds.has(selectedCardId) && (
            <Button
              size="sm"
              className="bg-yellow-700 hover:bg-yellow-600 text-white"
              onClick={() => { onShowPassThrough(selectedCardId); setSelectedCardId(null); }}
            >
              <Eye className="w-3 h-3 mr-1" />
              Проездной
            </Button>
          )}
          {canTake && (
            <Button size="sm" variant="destructive" onClick={onTakeCards}>
              Забрать
            </Button>
          )}
          {canEndAttack && (
            <Button size="sm" className="bg-green-700 hover:bg-green-600 text-white" onClick={onEndAttack}>
              {gs.defenderTaking ? 'Бито (хватит)' : 'Бито'}
            </Button>
          )}
          {canSkip && (
            <Button size="sm" variant="outline" className="border-amber-700/40 text-amber-200 bg-amber-900/30" onClick={onSkipTurn}>
              Пропустить
            </Button>
          )}
        </div>

        {/* Player hand */}
        <div className="px-2 pb-3 pt-1">
          <div className="flex items-center justify-between mb-1 px-2">
            <span className="text-xs text-amber-200/50">{gs.myHand.length} карт</span>
            <button
              className="text-xs text-amber-400/60 hover:text-amber-300 transition-colors"
              onClick={() => setSortMode(m => m === 'suit-rank' ? 'rank-only' : 'suit-rank')}
            >
              {sortMode === 'suit-rank' ? 'По масти' : 'По рангу'}
            </button>
          </div>
          <div className="flex justify-center overflow-x-auto pb-2">
            <div className="flex gap-1" style={{ marginLeft: sortedHand.length > 10 ? `-${Math.min((sortedHand.length - 10) * 8, 40)}px` : '0' }}>
              {sortedHand.map((card, i) => {
                const isPlayable = playableIds.has(card.id) || transferIds.has(card.id) || passThroughIds.has(card.id);
                const isSelected = selectedCardId === card.id;
                const isPassThroughCard = passThroughIds.has(card.id);
                return (
                  <div
                    key={card.id}
                    className="relative"
                    style={{
                      marginLeft: i > 0 && sortedHand.length > 10 ? `-${Math.min(12, Math.floor(80 / sortedHand.length))}px` : '0',
                      zIndex: isSelected ? 50 : i,
                    }}
                  >
                    <PlayingCard
                      card={card}
                      playable={isPlayable}
                      selected={isSelected}
                      onClick={() => handleCardClick(card)}
                    />
                    {/* Small pass-through indicator on card */}
                    {isPassThroughCard && !isSelected && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-600 rounded-full flex items-center justify-center border border-yellow-400">
                        <Eye className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
