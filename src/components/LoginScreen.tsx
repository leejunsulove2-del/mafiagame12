import React, { useState } from 'react';
import { authService, isLiveFirebase } from '../firebase/firebase';
import { UserProfile } from '../types/game';
import { Shield, Users, Flame, Sparkles, AlertCircle, Settings } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
  onOpenConfigModal: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onOpenConfigModal,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await authService.signInWithGoogle();
      onLoginSuccess(profile);
    } catch (err: any) {
      console.error('Login error:', err);
      // If Google popup was blocked by iframe environment, provide friendly message & fallback
      if (
        err?.code === 'auth/popup-blocked' ||
        err?.message?.includes('popup') ||
        err?.message?.includes('iframe')
      ) {
        setError('브라우저 또는 미리보기 보안 설정으로 팝업이 차단되었습니다. 빠른 체험 로그인을 진행합니다.');
        // Automatic quick fallback login so user is never blocked in iframe
        setTimeout(async () => {
          const fallback = await authService.signInWithGoogle();
          onLoginSuccess(fallback);
        }, 800);
      } else {
        setError(err?.message || '로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="login-screen"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden"
    >
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-950/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-indigo-950/30 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar with Firebase Status & Settings */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          id="btn-firebase-settings"
          onClick={onOpenConfigModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-slate-700 transition"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Firebase 설정</span>
          <span
            className={`w-2 h-2 rounded-full ${
              isLiveFirebase ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/80 flex flex-col items-center text-center relative z-10">
        {/* App Logo / Noir Icon */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-600 via-rose-900 to-slate-950 p-1 shadow-lg shadow-rose-900/50 mb-6 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
            <Flame className="w-10 h-10 text-rose-500 animate-pulse" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
          12인용 멀티플레이어 마피아
        </h1>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Firebase Realtime Database 연동 실시간 심리전 게임
          <br />
          <span className="text-xs text-rose-400/90 font-medium">
            (마피아·경찰·탐정·의사·간호사·정치가·스파이·광대·겁쟁이)
          </span>
        </p>

        {/* 12-Role Highlights */}
        <div className="w-full bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 mb-6 text-left">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
            <span className="flex items-center gap-1 text-slate-300">
              <Users className="w-3.5 h-3.5 text-rose-400" />
              12인 방 정원 & 9개 특수 직업군
            </span>
            <span className="text-[11px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
              무료 RTDB 최적화
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            겁쟁이의 야간 도주 회피, 스파이의 마피아 전향 접선, 정치가의 사형 면제
            생존권 등 고난도 룰이 실시간 동기화됩니다.
          </p>
        </div>

        {/* Error Alert if any */}
        {error && (
          <div className="w-full mb-4 p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-start gap-2 text-left">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign-in Button */}
        <button
          id="btn-google-login"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-base shadow-lg shadow-white/10 hover:shadow-white/20 transition flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {/* Google G logo */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>구글 계정으로 로그인</span>
            </>
          )}
        </button>

        {/* Footer info */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <Shield className="w-3.5 h-3.5" />
          <span>Firebase Auth 보안 인증 & 암호화 세션 적용</span>
        </div>
      </div>
    </div>
  );
};
