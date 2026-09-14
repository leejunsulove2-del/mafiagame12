import React, { useState } from 'react';
import { UserProfile, Role } from '../types/game';
import { AvatarIcon } from './AvatarIcon';
import { ROLES_CONFIG, TWELVE_ROLES_DECK } from '../constants/roles';
import { isLiveFirebase } from '../firebase/firebase';
import {
  Gamepad2,
  UserCheck,
  BookOpen,
  LogOut,
  Settings,
  Sparkles,
  Flame,
  Shield,
  Clock,
  Radio,
  HelpCircle,
  Trophy,
} from 'lucide-react';

interface LobbyScreenProps {
  user: UserProfile;
  onFindGame: (mode: 'multiplayer' | 'quick-bot') => void;
  onOpenCharacterSettings: () => void;
  onOpenConfigModal: () => void;
  onLogout: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  user,
  onFindGame,
  onOpenCharacterSettings,
  onOpenConfigModal,
  onLogout,
}) => {
  const [showRoleGuide, setShowRoleGuide] = useState(false);
  const [selectedGuideRole, setSelectedGuideRole] = useState<Role>('MAFIA');

  return (
    <div
      id="lobby-screen"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden"
    >
      {/* Background glow ambiance */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[350px] bg-rose-950/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-950/20 rounded-full blur-[90px] pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between py-2 z-10">
        {/* User profile summary */}
        <div className="flex items-center gap-3">
          <AvatarIcon avatarId={user.avatarId} size="md" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white">{user.nickname}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {user.wins}승 / {user.gamesPlayed}판
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {user.email ? user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '게스트 요원'}
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          <button
            id="btn-rtdb-status"
            onClick={onOpenConfigModal}
            title="Firebase RTDB 설정 상태"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:border-slate-700 transition"
          >
            <Radio className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">RTDB</span>
            <span
              className={`w-2 h-2 rounded-full ${
                isLiveFirebase ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400'
              }`}
            />
          </button>

          <button
            id="btn-logout"
            onClick={onLogout}
            title="로그아웃"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-900/50 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Center Main Action Area */}
      <main className="w-full max-w-xl mx-auto my-auto py-8 flex flex-col items-center justify-center text-center z-10">
        {/* Brand Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-950/50 border border-rose-800/40 text-rose-300 text-xs font-semibold mb-6">
          <Flame className="w-3.5 h-3.5 text-rose-500 animate-bounce" />
          <span>12인 실시간 멀티플레이어 마피아</span>
        </div>

        {/* Main Banner Heading */}
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-3">
          어둠 속의 도시, 진실을 밝혀라
        </h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-10 leading-relaxed">
          낮에는 토론과 표결(60초+30초), 밤에는 고유 능력(30초)으로 생존하세요.
          모든 액션은 Firebase RTDB로 즉시 동기화됩니다.
        </p>

        {/* [Two Main Center Buttons Requested in Prompt] */}
        <div className="w-full space-y-4 max-w-md">
          {/* 1. [게임찾기] 버튼 */}
          <button
            id="btn-find-game"
            onClick={() => onFindGame('multiplayer')}
            className="w-full py-5 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold text-lg sm:text-xl shadow-xl shadow-rose-900/40 hover:shadow-rose-900/60 active:scale-[0.98] transition flex items-center justify-center gap-3 border border-rose-400/20 group"
          >
            <Gamepad2 className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
            <span>게임찾기</span>
            <span className="text-xs bg-black/30 px-2.5 py-1 rounded-full font-medium ml-1">
              12인 방 매칭
            </span>
          </button>

          {/* 2. [캐릭터설정] 버튼 */}
          <button
            id="btn-character-settings"
            onClick={onOpenCharacterSettings}
            className="w-full py-4 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800/90 text-slate-100 font-bold text-base shadow-lg shadow-black/40 border border-slate-800 hover:border-slate-700 active:scale-[0.98] transition flex items-center justify-center gap-3"
          >
            <UserCheck className="w-5 h-5 text-indigo-400" />
            <span>캐릭터설정</span>
            <span className="text-xs text-slate-400 font-normal">
              닉네임 및 아바타 변경
            </span>
          </button>

          {/* Quick Single Tester Feature: 12-Bot Instant Game */}
          <button
            id="btn-quick-bot-game"
            onClick={() => onFindGame('quick-bot')}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-950/80 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-xs font-medium border border-dashed border-slate-800 hover:border-slate-700 transition flex items-center justify-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>빠른 혼자 테스트 (11인 AI 봇 자동 편성 즉시 시작)</span>
          </button>
        </div>

        {/* Quick Rule Deck Bar */}
        <div className="mt-8 flex items-center justify-center gap-4 text-xs text-slate-400">
          <button
            id="btn-open-role-guide"
            onClick={() => setShowRoleGuide(true)}
            className="flex items-center gap-1.5 hover:text-white transition underline underline-offset-4 decoration-slate-700"
          >
            <BookOpen className="w-4 h-4 text-rose-400" />
            <span>9가지 특수 직업 규칙 가이드북</span>
          </button>
        </div>
      </main>

      {/* Bottom Timing Specs */}
      <footer className="w-full max-w-4xl mx-auto py-3 border-t border-slate-900 text-center text-xs text-slate-500 flex flex-wrap items-center justify-center gap-4 z-10">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>낮 60초</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>투표 30초 (지목 20초 + 결정 10초)</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>밤 30초</span>
        </div>
        <span>•</span>
        <span className="text-emerald-500/90 font-mono">RTDB Spark 플랜 최적화</span>
      </footer>

      {/* Role Guide Modal */}
      {showRoleGuide && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-lg text-white">12인 9개 직업 규칙 가이드</h3>
              </div>
              <button
                id="btn-close-role-guide"
                onClick={() => setShowRoleGuide(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Role tabs */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 py-3 border-b border-slate-800/80">
              {Object.keys(ROLES_CONFIG).map((rk) => {
                const r = rk as Role;
                const meta = ROLES_CONFIG[r];
                const active = selectedGuideRole === r;
                return (
                  <button
                    key={r}
                    onClick={() => setSelectedGuideRole(r)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                      active
                        ? `${meta.badgeColor} ring-1 ring-white/20`
                        : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{meta.name}</span>
                    <span className="text-[10px] opacity-75">({meta.count})</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Role Detail */}
            {(() => {
              const meta = ROLES_CONFIG[selectedGuideRole];
              return (
                <div className="p-4 my-2 overflow-y-auto space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xl font-black text-white flex items-center gap-2">
                        <span>{meta.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${meta.badgeColor}`}>
                          {meta.team === 'MAFIA' ? '마피아 진영' : '시민 진영'} ({meta.count}명)
                        </span>
                      </h4>
                      <p className="text-xs text-rose-400 mt-1 font-medium">{meta.summary}</p>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-sm text-slate-300 leading-relaxed">
                    {meta.description}
                  </div>

                  {meta.nightActionText && (
                    <div className="bg-indigo-950/30 border border-indigo-900/50 p-3 rounded-xl text-xs text-indigo-300">
                      <strong className="block text-indigo-200 mb-1">🌙 밤 행동 규칙:</strong>
                      {meta.nightActionText}
                    </div>
                  )}

                  {meta.passiveText && (
                    <div className="bg-emerald-950/30 border border-emerald-900/50 p-3 rounded-xl text-xs text-emerald-300">
                      <strong className="block text-emerald-200 mb-1">🛡️ 특수 패시브:</strong>
                      {meta.passiveText}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="pt-3 border-t border-slate-800 text-right">
              <button
                onClick={() => setShowRoleGuide(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
