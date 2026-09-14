import React, { useState } from 'react';
import {
  getSavedFirebaseConfig,
  saveFirebaseConfig,
  clearFirebaseConfig,
  isLiveFirebase,
  FirebaseConfigParams,
} from '../firebase/firebase';
import { Database, Check, X, Sparkles, Copy, Key, Server } from 'lucide-react';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const current = getSavedFirebaseConfig() || {
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    projectId: '',
  };

  const [apiKey, setApiKey] = useState(current.apiKey || '');
  const [authDomain, setAuthDomain] = useState(current.authDomain || '');
  const [databaseURL, setDatabaseURL] = useState(current.databaseURL || '');
  const [projectId, setProjectId] = useState(current.projectId || '');
  const [storageBucket, setStorageBucket] = useState(current.storageBucket || '');
  const [messagingSenderId, setMessagingSenderId] = useState(current.messagingSenderId || '');
  const [appId, setAppId] = useState(current.appId || '');
  const [measurementId, setMeasurementId] = useState(current.measurementId || '');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  // Auto-fill template from user's project
  const handleAutoFillProject = () => {
    setApiKey('AIzaSyDk58nTbwKb5JY9wZnCJszpK95it3Hotw*');
    setAuthDomain('game1-6e709.firebaseapp.com');
    setDatabaseURL('https://game1-6e709-default-rtdb.firebaseio.com');
    setProjectId('game1-6e709');
    setStorageBucket('game1-6e709.firebasestorage.app');
    setMessagingSenderId('854948382370');
    setAppId('1:854948382370:web:4355e02e67fab6b5d6b97b');
    setMeasurementId('G-87LQJLEYET');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      alert('API Key는 필수 입력 항목입니다.');
      return;
    }
    const config: FirebaseConfigParams = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim() || (projectId.trim() ? `${projectId.trim()}.firebaseapp.com` : ''),
      databaseURL:
        databaseURL.trim() ||
        (projectId.trim() ? `https://${projectId.trim()}-default-rtdb.firebaseio.com` : ''),
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
      measurementId: measurementId.trim(),
    };
    saveFirebaseConfig(config);
  };

  const handleResetToDemo = () => {
    if (confirm('Firebase 설정을 초기화하고 즉시 체험 샌드박스 모드로 전환하시겠습니까?')) {
      clearFirebaseConfig();
    }
  };

  const copyEnvCode = () => {
    const envString = [
      `VITE_FIREBASE_API_KEY=${apiKey || 'AIzaSyDk58nTbwKb5JY9wZnCJszpK95it3Hotw*'}`,
      `VITE_FIREBASE_AUTH_DOMAIN=${authDomain || 'game1-6e709.firebaseapp.com'}`,
      `VITE_FIREBASE_DATABASE_URL=${databaseURL || 'https://game1-6e709-default-rtdb.firebaseio.com'}`,
      `VITE_FIREBASE_PROJECT_ID=${projectId || 'game1-6e709'}`,
      `VITE_FIREBASE_STORAGE_BUCKET=${storageBucket || 'game1-6e709.firebasestorage.app'}`,
      `VITE_FIREBASE_MESSAGING_SENDER_ID=${messagingSenderId || '854948382370'}`,
      `VITE_FIREBASE_APP_ID=${appId || '1:854948382370:web:4355e02e67fab6b5d6b97b'}`,
      `VITE_FIREBASE_MEASUREMENT_ID=${measurementId || 'G-87LQJLEYET'}`,
    ].join('\n');

    navigator.clipboard.writeText(envString);
    setCopiedKey('env');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col relative max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-rose-500" />
            <h3 className="font-bold text-lg text-white">Firebase RTDB 및 인증 연동</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status banner */}
        <div
          className={`p-3.5 my-3 rounded-2xl border text-xs flex items-center justify-between ${
            isLiveFirebase
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : 'bg-indigo-950/40 border-indigo-800/60 text-indigo-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isLiveFirebase ? 'bg-emerald-400 animate-pulse' : 'bg-indigo-400'
              }`}
            />
            <span className="font-bold">
              {isLiveFirebase
                ? '라이브 Firebase RTDB & Auth 연결됨'
                : '스마트 샌드박스 에뮬레이터 모드 동작 중'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleAutoFillProject}
            className="px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-700 text-rose-300 text-[11px] font-bold flex items-center gap-1 hover:bg-rose-900 transition"
          >
            <Sparkles className="w-3 h-3 text-rose-400" />
            <span>내 Firebase 정보 자동채우기</span>
          </button>
        </div>

        {/* GitHub Secrets copy box */}
        <div className="mb-4 p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              GitHub Secrets / .env 보안 환경변수
            </span>
            <button
              type="button"
              onClick={copyEnvCode}
              className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-bold transition"
            >
              {copiedKey === 'env' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">복사됨!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>전체 복사</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mb-2">
            GitHub 저장소의 <strong>Settings → Secrets and variables → Actions</strong>에 등록하거나 <code className="text-rose-300">.env</code> 파일에 추가하세요.
          </p>
          <pre className="bg-slate-900 p-2.5 rounded-xl text-[11px] text-slate-300 font-mono overflow-x-auto border border-slate-800/80 leading-relaxed">
{`VITE_FIREBASE_API_KEY=${apiKey || 'AIzaSyDk58nTbwKb5JY9wZnCJszpK95it3Hotw*'}
VITE_FIREBASE_AUTH_DOMAIN=${authDomain || 'game1-6e709.firebaseapp.com'}
VITE_FIREBASE_DATABASE_URL=${databaseURL || 'https://game1-6e709-default-rtdb.firebaseio.com'}
VITE_FIREBASE_PROJECT_ID=${projectId || 'game1-6e709'}
VITE_FIREBASE_STORAGE_BUCKET=${storageBucket || 'game1-6e709.firebasestorage.app'}
VITE_FIREBASE_MESSAGING_SENDER_ID=${messagingSenderId || '854948382370'}
VITE_FIREBASE_APP_ID=${appId || '1:854948382370:web:4355e02e67fab6b5d6b97b'}
VITE_FIREBASE_MEASUREMENT_ID=${measurementId || 'G-87LQJLEYET'}`}
          </pre>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              apiKey (필수)
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                projectId
              </label>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="game1-6e709"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                authDomain
              </label>
              <input
                type="text"
                value={authDomain}
                onChange={(e) => setAuthDomain(e.target.value)}
                placeholder="game1-6e709.firebaseapp.com"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              databaseURL (Realtime Database URL)
            </label>
            <input
              type="text"
              value={databaseURL}
              onChange={(e) => setDatabaseURL(e.target.value)}
              placeholder="https://game1-6e709-default-rtdb.firebaseio.com"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                appId
              </label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="1:854948382370:web:4355e02e67fab6b5d6b97b"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                messagingSenderId
              </label>
              <input
                type="text"
                value={messagingSenderId}
                onChange={(e) => setMessagingSenderId(e.target.value)}
                placeholder="854948382370"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            {isLiveFirebase && (
              <button
                type="button"
                onClick={handleResetToDemo}
                className="text-xs text-rose-400 hover:text-rose-300 underline"
              >
                체험 모드로 초기화
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                닫기
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-900/40"
              >
                저장 및 적용
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
