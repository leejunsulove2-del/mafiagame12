import React, { useState, useEffect } from 'react';
import { UserProfile, RoomState } from './types/game';
import { authService } from './firebase/firebase';
import { LoginScreen } from './components/LoginScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { CharacterSettingsModal } from './components/CharacterSettingsModal';
import { MatchmakingScreen } from './components/MatchmakingScreen';
import { GameScreen } from './components/GameScreen';
import { FirebaseConfigModal } from './components/FirebaseConfigModal';

type AppScreen = 'LOGIN' | 'LOBBY' | 'MATCHMAKING' | 'GAME';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('LOGIN');
  const [matchmakingMode, setMatchmakingMode] = useState<'multiplayer' | 'quick-bot'>('multiplayer');
  const [activeRoom, setActiveRoom] = useState<RoomState | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showCharacterSettings, setShowCharacterSettings] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Check auth session on startup
  useEffect(() => {
    async function initAuth() {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setCurrentScreen('LOBBY');
        } else {
          setCurrentScreen('LOGIN');
        }
      } catch (e) {
        console.error('Init auth error:', e);
        setCurrentScreen('LOGIN');
      } finally {
        setIsInitializing(false);
      }
    }
    initAuth();
  }, []);

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setCurrentScreen('LOBBY');
  };

  const handleLogout = async () => {
    await authService.signOutUser();
    setCurrentUser(null);
    setActiveRoom(null);
    setCurrentScreen('LOGIN');
  };

  const handleFindGame = (mode: 'multiplayer' | 'quick-bot') => {
    setMatchmakingMode(mode);
    setCurrentScreen('MATCHMAKING');
  };

  const handleGameStart = (room: RoomState) => {
    setActiveRoom(room);
    setCurrentScreen('GAME');
  };

  const handleExitGame = () => {
    setActiveRoom(null);
    setCurrentScreen('LOBBY');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-400">
        <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-mono">마피아 게임 시스템 초기화 중...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased select-none">
      {/* 1. Login Screen */}
      {currentScreen === 'LOGIN' && (
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onOpenConfigModal={() => setShowConfigModal(true)}
        />
      )}

      {/* 2. Main Lobby Screen */}
      {currentScreen === 'LOBBY' && currentUser && (
        <LobbyScreen
          user={currentUser}
          onFindGame={handleFindGame}
          onOpenCharacterSettings={() => setShowCharacterSettings(true)}
          onOpenConfigModal={() => setShowConfigModal(true)}
          onLogout={handleLogout}
        />
      )}

      {/* 3. Matchmaking Screen */}
      {currentScreen === 'MATCHMAKING' && currentUser && (
        <MatchmakingScreen
          user={currentUser}
          initialMode={matchmakingMode}
          onGameStart={handleGameStart}
          onCancel={() => setCurrentScreen('LOBBY')}
        />
      )}

      {/* 4. Active Game Screen */}
      {currentScreen === 'GAME' && activeRoom && currentUser && (
        <GameScreen
          initialRoom={activeRoom}
          myUid={currentUser.uid}
          onExitGame={handleExitGame}
        />
      )}

      {/* Character Settings Modal */}
      {currentUser && (
        <CharacterSettingsModal
          user={currentUser}
          isOpen={showCharacterSettings}
          onClose={() => setShowCharacterSettings(false)}
          onSaveSuccess={(updated) => setCurrentUser(updated)}
        />
      )}

      {/* Firebase Settings Modal */}
      <FirebaseConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </div>
  );
}
