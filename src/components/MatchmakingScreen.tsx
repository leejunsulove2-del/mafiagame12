import React, { useEffect, useState } from 'react';
import { UserProfile, RoomState } from '../types/game';
import { dbService, isLiveFirebase } from '../firebase/firebase';
import { create12PlayerGame } from '../services/gameEngine';
import { AvatarIcon } from './AvatarIcon';
import { Loader2, Users, ArrowLeft, Bot, Sparkles, ShieldAlert } from 'lucide-react';

interface MatchmakingScreenProps {
  user: UserProfile;
  initialMode: 'multiplayer' | 'quick-bot';
  onGameStart: (room: RoomState) => void;
  onCancel: () => void;
}

interface QueuedUser {
  uid: string;
  nickname: string;
  avatarId: string;
  joinedAt: number;
}

export const MatchmakingScreen: React.FC<MatchmakingScreenProps> = ({
  user,
  initialMode,
  onGameStart,
  onCancel,
}) => {
  const [queue, setQueue] = useState<Record<string, QueuedUser>>({});
  const [secondsWaiting, setSecondsWaiting] = useState(0);

  // If initialMode is quick-bot, start immediately after a brief matching animation!
  useEffect(() => {
    if (initialMode === 'quick-bot') {
      const timer = setTimeout(() => {
        const roomId = 'room_' + Date.now().toString(36);
        const room = create12PlayerGame(
          { uid: user.uid, nickname: user.nickname, avatarId: user.avatarId },
          [],
          roomId
        );
        dbService.setRoomState(roomId, room);
        onGameStart(room);
      }, 1200);
      return () => clearTimeout(timer);
    }

    // Multiplayer queue via Firebase RTDB
    dbService.joinQueue({
      uid: user.uid,
      nickname: user.nickname,
      avatarId: user.avatarId,
    });

    const unsub = dbService.listenQueue((q) => {
      setQueue(q || {});
      const usersList = (Object.values(q || {}) as QueuedUser[]);

      // If 12 players gathered, first in queue acts as host and creates room
      if (usersList.length >= 12) {
        // Sort by joinedAt
        usersList.sort((a, b) => a.joinedAt - b.joinedAt);
        const isHost = usersList[0].uid === user.uid;
        const roomId = 'match_' + usersList[0].joinedAt;

        if (isHost) {
          const hostUser = usersList[0];
          const others = usersList.slice(1, 12);
          const room = create12PlayerGame(hostUser, others, roomId);
          dbService.setRoomState(roomId, room);
          // Clear matched users from queue
          usersList.slice(0, 12).forEach((u) => dbService.leaveQueue(u.uid));
          onGameStart(room);
        } else {
          // Non-host listens for room state
          const unsubRoom = dbService.listenRoomState(roomId, (room) => {
            if (room && room.status === 'PLAYING') {
              unsubRoom();
              onGameStart(room);
            }
          });
        }
      }
    });

    const interval = setInterval(() => {
      setSecondsWaiting((s) => s + 1);
    }, 1000);

    return () => {
      dbService.leaveQueue(user.uid);
      unsub();
      clearInterval(interval);
    };
  }, [initialMode, user.uid, user.nickname, user.avatarId, onGameStart]);

  const handleInstantFillBots = () => {
    const roomId = 'room_' + Date.now().toString(36);
    const others = (Object.values(queue) as QueuedUser[])
      .filter((q) => q.uid !== user.uid)
      .slice(0, 11);

    const room = create12PlayerGame(
      { uid: user.uid, nickname: user.nickname, avatarId: user.avatarId },
      others,
      roomId
    );
    dbService.setRoomState(roomId, room);
    dbService.leaveQueue(user.uid);
    onGameStart(room);
  };

  const queueList = (Object.values(queue) as QueuedUser[]);
  const queuedCount = queueList.length > 0 ? queueList.length : 1;

  return (
    <div
      id="matchmaking-screen"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-4 sm:p-6 relative overflow-hidden"
    >
      {/* Background radar animation */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-rose-900/30 animate-ping opacity-25 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-rose-800/40 pointer-events-none" />

      {/* Top Bar */}
      <div className="w-full max-w-2xl flex items-center justify-between z-10">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>매칭 취소</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-mono text-rose-400">
            {Math.floor(secondsWaiting / 60)}:{(secondsWaiting % 60).toString().padStart(2, '0')}
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>

      {/* Center Matching Board */}
      <div className="w-full max-w-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 my-auto shadow-2xl flex flex-col items-center text-center z-10">
        {/* Pulsing Search Icon */}
        <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center mb-4 text-rose-500 shadow-lg shadow-rose-950">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>

        <h2 className="text-2xl font-black text-white mb-1">12인 매칭 중...</h2>
        <p className="text-xs text-slate-400 mb-6">
          현재 대기열 플레이어: <span className="text-rose-400 font-bold">{queuedCount} / 12명</span>
          <span className="block text-[11px] text-slate-500 mt-0.5">
            12명이 모이면 역할이 무작위 배정되며 게임이 자동 시작됩니다.
          </span>
        </p>

        {/* 12-Slot Grid */}
        <div className="w-full grid grid-cols-4 sm:grid-cols-6 gap-2.5 mb-8">
          {Array.from({ length: 12 }).map((_, index) => {
            const queuedPlayer = queueList[index];
            const isMe = queuedPlayer?.uid === user.uid;

            if (queuedPlayer) {
              return (
                <div
                  key={queuedPlayer.uid}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center text-center transition ${
                    isMe
                      ? 'bg-rose-950/40 border-rose-500 ring-1 ring-rose-500/50'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <AvatarIcon avatarId={queuedPlayer.avatarId} size="sm" className="mb-1.5" />
                  <span className="text-[11px] font-bold text-slate-200 line-clamp-1">
                    {queuedPlayer.nickname}
                  </span>
                  <span className="text-[9px] text-rose-400 font-mono">
                    {isMe ? '나' : `#${index + 1}`}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={`empty_${index}`}
                className="p-2.5 rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/30 flex flex-col items-center justify-center text-center min-h-[72px]"
              >
                <div className="w-7 h-7 rounded-full bg-slate-900/80 border border-slate-800 flex items-center justify-center mb-1 text-slate-600">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] text-slate-600">대기 중...</span>
              </div>
            );
          })}
        </div>

        {/* Quick Test Option */}
        <div className="w-full pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-left">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
              혼자 테스트하시나요?
            </span>
            <p className="text-[11px] text-slate-500">
              부족한 인원을 지능형 봇으로 즉시 채워 12인 게임을 시작할 수 있습니다.
            </p>
          </div>
          <button
            id="btn-force-start-bots"
            onClick={handleInstantFillBots}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-950 transition flex items-center justify-center gap-1.5 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI 봇으로 즉시 시작</span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-slate-500 z-10">
        Firebase RTDB의 경량 대기열을 통해 데이터 전송량을 최소화합니다.
      </div>
    </div>
  );
};
