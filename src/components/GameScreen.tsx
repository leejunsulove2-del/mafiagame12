import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  RoomState,
  Player,
  GamePhase,
  Role,
  Team,
  NightReport,
} from '../types/game';
import { ROLES_CONFIG, PHASE_DURATIONS } from '../constants/roles';
import { dbService } from '../firebase/firebase';
import {
  resolveNightActions,
  resolveVoteTargetPhase,
  resolveVoteDecisionPhase,
  applyClownRoleInheritance,
  checkWinCondition,
  generateBotActions,
} from '../services/gameEngine';
import { AvatarIcon } from './AvatarIcon';
import { RoleActionPanel } from './RoleActionPanel';
import { ChatPanel } from './ChatPanel';
import confetti from 'canvas-confetti';
import {
  Sun,
  Moon,
  Clock,
  Vote,
  Gavel,
  Shield,
  Skull,
  Award,
  Users,
  Eye,
  LogOut,
  AlertTriangle,
  Sparkles,
  CheckCircle,
  XCircle,
  HelpCircle,
} from 'lucide-react';

interface GameScreenProps {
  initialRoom: RoomState;
  myUid: string;
  onExitGame: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  initialRoom,
  myUid,
  onExitGame,
}) => {
  const [room, setRoom] = useState<RoomState>(initialRoom);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedPlayerForDetail, setSelectedPlayerForDetail] = useState<Player | null>(null);

  // Keep a stable ref to current room for timer callbacks
  const roomRef = useRef<RoomState>(room);
  roomRef.current = room;

  // Real-time synchronization from Firebase RTDB
  useEffect(() => {
    const unsub = dbService.listenRoomState(initialRoom.roomId, (remoteRoom) => {
      if (remoteRoom) {
        setRoom(remoteRoom);
      }
    });
    return () => unsub();
  }, [initialRoom.roomId]);

  // Determine if this client is the authoritative host
  const isHost = room.hostId === myUid;
  const myPlayer = room.players[myUid];

  // Client-side timer countdown synced to server phaseEndTime
  useEffect(() => {
    const checkTimer = () => {
      const now = Date.now();
      const remainMs = Math.max(0, room.phaseEndTime - now);
      const remainSec = Math.ceil(remainMs / 1000);
      setTimeLeft(remainSec);

      // Phase expiration handler (executed by host)
      if (remainMs <= 0 && isHost && room.status === 'PLAYING') {
        handlePhaseTransition();
      }
    };

    checkTimer();
    const interval = setInterval(checkTimer, 500);
    return () => clearInterval(interval);
  }, [room.phase, room.phaseEndTime, isHost, room.status]);

  // Authoritative Phase Transition Machine
  const handlePhaseTransition = async () => {
    const current = roomRef.current;
    if (current.status !== 'PLAYING') return;

    let nextPhase: GamePhase = current.phase;
    let nextDuration = 0;
    let updatedPlayers = { ...current.players };
    let candidateId = current.voteCandidateId;
    let lastDayDeadRole = current.lastDayDeadRole;
    let lastDayDeadPlayerId = current.lastDayDeadPlayerId;
    let nightReport = current.nightReport;

    // Check game win before transitioning
    const winCheck = checkWinCondition(current.players);
    if (winCheck.winner) {
      const finishedRoom: Partial<RoomState> = {
        phase: 'GAME_OVER',
        status: 'ENDED',
        winner: winCheck.winner,
        winReason: winCheck.winReason,
      };
      await dbService.setRoomState(current.roomId, finishedRoom);
      await dbService.sendMessage(current.roomId, {
        id: 'sys_' + Date.now(),
        senderId: 'SYSTEM',
        senderName: '사회자',
        senderAvatar: 'fedora-boss',
        text: `🏆 [게임 종료] ${winCheck.winReason}`,
        timestamp: Date.now(),
        type: 'SYSTEM',
      });
      return;
    }

    if (current.phase === 'ROLE_REVEAL') {
      // Role Reveal (5s) -> DAY 1 (60s)
      nextPhase = 'DAY';
      nextDuration = PHASE_DURATIONS.DAY;
      await dbService.sendMessage(current.roomId, {
        id: 'sys_' + Date.now(),
        senderId: 'SYSTEM',
        senderName: '사회자',
        senderAvatar: 'fedora-boss',
        text: `☀️ 제${current.dayCount}일 낮이 밝았습니다. 60초 동안 의심되는 마피아에 대해 자유롭게 토론하세요.`,
        timestamp: Date.now(),
        type: 'SYSTEM',
      });
    } else if (current.phase === 'DAY') {
      // DAY (60s) -> VOTE_TARGET (20s)
      nextPhase = 'VOTE_TARGET';
      nextDuration = PHASE_DURATIONS.VOTE_TARGET;
      // Simulate bot votes if bots exist
      const botActions = generateBotActions(current, 'VOTE_TARGET');
      Object.entries(botActions).forEach(([bId, act]) => {
        if (updatedPlayers[bId]) {
          updatedPlayers[bId] = { ...updatedPlayers[bId], ...act };
        }
      });

      await dbService.sendMessage(current.roomId, {
        id: 'sys_' + Date.now(),
        senderId: 'SYSTEM',
        senderName: '사회자',
        senderAvatar: 'fedora-boss',
        text: `⚖️ 투표 지목 시간(20초)이 시작되었습니다. 심판대에 올릴 대상을 1명 지목해 주세요.`,
        timestamp: Date.now(),
        type: 'SYSTEM',
      });
    } else if (current.phase === 'VOTE_TARGET') {
      // VOTE_TARGET (20s) -> VOTE_DECISION (10s) OR NIGHT (30s if no candidate)
      const voteResult = resolveVoteTargetPhase(current.players);
      await dbService.sendMessage(current.roomId, {
        id: 'sys_' + Date.now(),
        senderId: 'SYSTEM',
        senderName: '사회자',
        senderAvatar: 'fedora-boss',
        text: `🗳️ ${voteResult.message}`,
        timestamp: Date.now(),
        type: 'SYSTEM',
      });

      if (voteResult.candidateId) {
        candidateId = voteResult.candidateId;
        nextPhase = 'VOTE_DECISION';
        nextDuration = PHASE_DURATIONS.VOTE_DECISION;

        // Simulate bot decisions
        const botDecisions = generateBotActions(current, 'VOTE_DECISION');
        Object.entries(botDecisions).forEach(([bId, act]) => {
          if (updatedPlayers[bId]) {
            updatedPlayers[bId] = { ...updatedPlayers[bId], ...act };
          }
        });
      } else {
        // Tie or 0 votes -> skip directly to Night
        candidateId = null;
        nextPhase = 'NIGHT';
        nextDuration = PHASE_DURATIONS.NIGHT;
        // Simulate bot night actions
        const botNight = generateBotActions(current, 'NIGHT');
        Object.entries(botNight).forEach(([bId, act]) => {
          if (updatedPlayers[bId]) {
            updatedPlayers[bId] = { ...updatedPlayers[bId], ...act };
          }
        });

        await dbService.sendMessage(current.roomId, {
          id: 'sys_' + Date.now(),
          senderId: 'SYSTEM',
          senderName: '사회자',
          senderAvatar: 'fedora-boss',
          text: `🌙 어둠이 내려앉았습니다. 밤 시간(30초) 동안 각자의 직업 능력을 발동하세요.`,
          timestamp: Date.now(),
          type: 'SYSTEM',
        });
      }
    } else if (current.phase === 'VOTE_DECISION') {
      // VOTE_DECISION (10s) -> Check execution & Politician survival -> NIGHT (30s)
      if (current.voteCandidateId) {
        const decisionResult = resolveVoteDecisionPhase(
          current.players,
          current.voteCandidateId
        );

        await dbService.sendMessage(current.roomId, {
          id: 'sys_' + Date.now(),
          senderId: 'SYSTEM',
          senderName: '사회자',
          senderAvatar: 'fedora-boss',
          text: decisionResult.message,
          timestamp: Date.now(),
          type: 'SYSTEM',
        });

        if (decisionResult.executedPlayer) {
          lastDayDeadPlayerId = decisionResult.executedPlayer.id;
          lastDayDeadRole = decisionResult.executedPlayer.role;
          updatedPlayers[decisionResult.executedPlayer.id].isAlive = false;

          // Win check after execution
          const checkAfterExec = checkWinCondition(updatedPlayers);
          if (checkAfterExec.winner) {
            await dbService.setRoomState(current.roomId, {
              players: updatedPlayers,
              phase: 'GAME_OVER',
              status: 'ENDED',
              winner: checkAfterExec.winner,
              winReason: checkAfterExec.winReason,
            });
            return;
          }
        }
      }

      candidateId = null;
      nextPhase = 'NIGHT';
      nextDuration = PHASE_DURATIONS.NIGHT;

      // Reset vote states and trigger bot night actions
      (Object.values(updatedPlayers) as Player[]).forEach((p) => {
        p.voteTarget = null;
        p.decisionVote = null;
      });
      const botNight = generateBotActions(current, 'NIGHT');
      Object.entries(botNight).forEach(([bId, act]) => {
        if (updatedPlayers[bId]) {
          updatedPlayers[bId] = { ...updatedPlayers[bId], ...act };
        }
      });

      await dbService.sendMessage(current.roomId, {
        id: 'sys_' + Date.now(),
        senderId: 'SYSTEM',
        senderName: '사회자',
        senderAvatar: 'fedora-boss',
        text: `🌙 밤이 되었습니다(30초). 마피아, 의사, 경찰, 탐정, 스파이, 겁쟁이는 행동을 결정하세요.`,
        timestamp: Date.now(),
        type: 'SYSTEM',
      });
    } else if (current.phase === 'NIGHT') {
      // NIGHT (30s) -> Resolve night actions & kills -> DAY (60s)
      const resolution = resolveNightActions(current);
      updatedPlayers = resolution.updatedPlayers;
      nightReport = resolution.nightReport;

      // Broadcast system announcements from night
      for (const msgText of resolution.systemMessages) {
        await dbService.sendMessage(current.roomId, {
          id: 'sys_' + Date.now() + Math.random(),
          senderId: 'SYSTEM',
          senderName: '사회자',
          senderAvatar: 'fedora-boss',
          text: msgText,
          timestamp: Date.now(),
          type: 'SYSTEM',
        });
      }

      // Win check after night kills
      const checkAfterNight = checkWinCondition(updatedPlayers);
      if (checkAfterNight.winner) {
        await dbService.setRoomState(current.roomId, {
          players: updatedPlayers,
          nightReport,
          phase: 'GAME_OVER',
          status: 'ENDED',
          winner: checkAfterNight.winner,
          winReason: checkAfterNight.winReason,
        });
        return;
      }

      nextPhase = 'DAY';
      nextDuration = PHASE_DURATIONS.DAY;

      await dbService.sendMessage(current.roomId, {
        id: 'sys_' + Date.now(),
        senderId: 'SYSTEM',
        senderName: '사회자',
        senderAvatar: 'fedora-boss',
        text: `☀️ 제${current.dayCount + 1}일 아침이 되었습니다. 생존자들은 낮 토론을 시작합니다.`,
        timestamp: Date.now(),
        type: 'SYSTEM',
      });
    }

    const nextState: Partial<RoomState> = {
      phase: nextPhase,
      phaseDuration: nextDuration,
      phaseEndTime: Date.now() + nextDuration * 1000,
      dayCount: nextPhase === 'DAY' ? current.dayCount + 1 : current.dayCount,
      players: updatedPlayers,
      voteCandidateId: candidateId,
      lastDayDeadPlayerId,
      lastDayDeadRole,
      nightReport,
    };

    await dbService.setRoomState(current.roomId, nextState);
  };

  // User daytime target voting
  const handleSelectVoteTarget = async (targetId: string) => {
    if (room.phase !== 'VOTE_TARGET' || !myPlayer.isAlive) return;
    const nextTarget = myPlayer.voteTarget === targetId ? null : targetId;
    const updated = {
      ...room.players,
      [myUid]: { ...myPlayer, voteTarget: nextTarget },
    };
    await dbService.setRoomState(room.roomId, { players: updated });
  };

  // User decision voting (AGREE or DISAGREE)
  const handleSelectDecisionVote = async (decision: 'AGREE' | 'DISAGREE') => {
    if (room.phase !== 'VOTE_DECISION' || !myPlayer.isAlive) return;
    const updated = {
      ...room.players,
      [myUid]: { ...myPlayer, decisionVote: decision },
    };
    await dbService.setRoomState(room.roomId, { players: updated });
  };

  // Update night action
  const handleUpdateMyAction = async (updates: Partial<Player>) => {
    const updated = {
      ...room.players,
      [myUid]: { ...myPlayer, ...updates },
    };
    await dbService.setRoomState(room.roomId, { players: updated });
  };

  // Clown inherit dead player role
  const handleClownInheritRole = async (targetRole: Role) => {
    if (myPlayer.role !== 'CLOWN') return;
    const res = applyClownRoleInheritance(room.players, myUid, targetRole);
    if (res.updated) {
      await dbService.setRoomState(room.roomId, { players: { ...room.players } });
      await dbService.sendMessage(room.roomId, {
        id: 'sys_' + Date.now(),
        senderId: 'SYSTEM',
        senderName: '사회자',
        senderAvatar: 'clown-mask',
        text: `🎭 [광대 능력 발동] ${myPlayer.nickname} 님이 낮 사망자의 능력을 계승했습니다!`,
        timestamp: Date.now(),
        type: 'SYSTEM',
      });
    }
  };

  // Confetti on game over
  useEffect(() => {
    if (room.phase === 'GAME_OVER') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
    }
  }, [room.phase]);

  const alivePlayers = (Object.values(room.players) as Player[]).filter((p) => p.isAlive);
  const aliveMafias = alivePlayers.filter((p) => p.role === 'MAFIA');
  const aliveCitizens = alivePlayers.length - aliveMafias.length;
  const myRoleMeta = ROLES_CONFIG[myPlayer?.role || 'MAFIA'];

  const candidatePlayer = room.voteCandidateId
    ? room.players[room.voteCandidateId]
    : null;

  return (
    <div
      id="game-screen"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-3 sm:p-5 relative select-none"
    >
      {/* Top Phase & Timer Navigation Bar */}
      <header className="w-full max-w-6xl mx-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-3 sm:p-4 mb-3 sm:mb-4 shadow-xl flex flex-wrap items-center justify-between gap-3 z-10">
        {/* Left: Day & Phase Indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-md ${
              room.phase === 'NIGHT'
                ? 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                : 'bg-amber-950 text-amber-400 border border-amber-800'
            }`}
          >
            {room.phase === 'NIGHT' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-white">
                제{room.dayCount}일차
              </span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  room.phase === 'NIGHT'
                    ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800'
                    : room.phase === 'VOTE_TARGET'
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800 animate-pulse'
                    : room.phase === 'VOTE_DECISION'
                    ? 'bg-purple-950/80 text-purple-300 border border-purple-800 animate-pulse'
                    : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                }`}
              >
                {room.phase === 'ROLE_REVEAL' && '직업 확인 (5초)'}
                {room.phase === 'DAY' && '낮 토론 (60초)'}
                {room.phase === 'VOTE_TARGET' && '투표 지목 (20초)'}
                {room.phase === 'VOTE_DECISION' && '찬반 결정 (10초)'}
                {room.phase === 'NIGHT' && '밤의 행동 (30초)'}
                {room.phase === 'GAME_OVER' && '게임 종료'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              생존 {alivePlayers.length}명 (시민 {aliveCitizens} : 마피아 {aliveMafias.length})
            </p>
          </div>
        </div>

        {/* Center: Countdown Clock */}
        <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800">
          <Clock
            className={`w-4 h-4 ${
              timeLeft <= 5 ? 'text-rose-500 animate-bounce' : 'text-slate-400'
            }`}
          />
          <span
            className={`font-mono text-xl font-black ${
              timeLeft <= 5 ? 'text-rose-500' : 'text-white'
            }`}
          >
            00:{timeLeft.toString().padStart(2, '0')}
          </span>
        </div>

        {/* Right: My Role & Rule Info */}
        <div className="flex items-center gap-2">
          {myPlayer && (
            <button
              id="btn-my-role"
              onClick={() => setShowRoleModal(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border ${myRoleMeta.bgColor} ${myRoleMeta.borderColor} text-xs font-bold text-white shadow hover:scale-105 transition`}
            >
              <AvatarIcon avatarId={myPlayer.avatarId} size="sm" />
              <div className="text-left">
                <span className="block text-[10px] text-slate-400">내 직업</span>
                <span>{myRoleMeta.name}</span>
              </div>
            </button>
          )}

          <button
            onClick={onExitGame}
            title="방 나가기"
            className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Game Layout: 2 Columns on Desktop */}
      <div className="w-full max-w-6xl mx-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 overflow-hidden">
        {/* Left Side: 12 Players Grid & Actions (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3 overflow-y-auto">
          {/* Phase Banner Notices */}
          {room.phase === 'VOTE_DECISION' && candidatePlayer && (
            <div className="bg-purple-950/70 border border-purple-800 p-4 rounded-3xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <AvatarIcon avatarId={candidatePlayer.avatarId} size="md" />
                <div>
                  <span className="text-xs text-purple-300 font-bold">
                    재판 심판대 (최다 지목 후보)
                  </span>
                  <h4 className="text-base font-black text-white">
                    [{candidatePlayer.nickname}] 님 처형 찬반 투표
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    과반 찬성 시 사형이 집행됩니다. (정치가는 면제)
                  </p>
                </div>
              </div>

              {myPlayer.isAlive && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    id="btn-vote-agree"
                    onClick={() => handleSelectDecisionVote('AGREE')}
                    className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                      myPlayer.decisionVote === 'AGREE'
                        ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                        : 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 text-rose-400" />
                    <span>찬성</span>
                  </button>
                  <button
                    id="btn-vote-disagree"
                    onClick={() => handleSelectDecisionVote('DISAGREE')}
                    className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                      myPlayer.decisionVote === 'DISAGREE'
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                        : 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-emerald-400" />
                    <span>반대</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 12 Players Board Grid */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-rose-400" />
                12인 참가자 테이블 ({alivePlayers.length}/12 생존)
              </span>
              <span className="text-[11px] text-slate-500">
                {room.phase === 'VOTE_TARGET' ? '클릭하여 투표 지목' : '상태 확인'}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(Object.values(room.players) as Player[]).map((player) => {
                const isMe = player.id === myUid;
                const isDead = !player.isAlive;
                const isVotedByMe = myPlayer?.voteTarget === player.id;
                const isCandidate = room.voteCandidateId === player.id;
                const canVoteThis =
                  room.phase === 'VOTE_TARGET' && myPlayer.isAlive && !isDead && !isMe;

                // Count votes received in VOTE_TARGET phase
                const votesReceived = (Object.values(room.players) as Player[]).filter(
                  (p) => p.isAlive && p.voteTarget === player.id
                ).length;

                return (
                  <div
                    key={player.id}
                    onClick={() => {
                      if (canVoteThis) handleSelectVoteTarget(player.id);
                      else setSelectedPlayerForDetail(player);
                    }}
                    className={`p-2.5 rounded-2xl border transition relative flex flex-col items-center text-center cursor-pointer ${
                      isDead
                        ? 'bg-slate-950/40 border-slate-900 opacity-40 grayscale'
                        : isCandidate
                        ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/50 animate-pulse'
                        : isVotedByMe
                        ? 'bg-rose-950/50 border-rose-500 ring-2 ring-rose-500/40'
                        : isMe
                        ? 'bg-slate-950/90 border-slate-700'
                        : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Dead Skull Overlay */}
                    {isDead && (
                      <div className="absolute top-1.5 left-1.5 text-slate-500">
                        <Skull className="w-3.5 h-3.5" />
                      </div>
                    )}

                    {/* Politician Revealed Badge */}
                    {player.politicianRevealed && (
                      <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-purple-600 text-[9px] font-extrabold text-white shadow">
                        정치가 공인
                      </span>
                    )}

                    {/* Votes received badge */}
                    {room.phase === 'VOTE_TARGET' && votesReceived > 0 && (
                      <span className="absolute -top-1.5 -right-1 px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black shadow ring-1 ring-slate-950">
                        {votesReceived}표
                      </span>
                    )}

                    <AvatarIcon
                      avatarId={player.avatarId}
                      size="sm"
                      className="mb-1.5"
                    />

                    <span className="text-xs font-bold text-slate-200 line-clamp-1">
                      {player.nickname}
                    </span>

                    <span className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                      {isMe && <span className="text-rose-400 font-bold">나</span>}
                      {player.isBot && <span className="opacity-75">AI</span>}
                      {isDead ? '사망' : '생존'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Role Action Panel (Night Action / Clown Steal / Role Passive) */}
          <RoleActionPanel
            myPlayer={myPlayer}
            room={room}
            onUpdateMyAction={handleUpdateMyAction}
            onClownInheritRole={handleClownInheritRole}
          />
        </div>

        {/* Right Side: Real-time Synchronized Chat & Night Action Log (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col min-h-[380px]">
          <ChatPanel roomId={room.roomId} myPlayer={myPlayer} phase={room.phase} />
        </div>
      </div>

      {/* Role Card Detail Modal */}
      {showRoleModal && myPlayer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center relative">
            <button
              onClick={() => setShowRoleModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold"
            >
              ✕
            </button>

            <div className="w-16 h-16 rounded-3xl mx-auto mb-3 flex items-center justify-center bg-gradient-to-br from-rose-900 to-slate-950 border border-rose-700/50 shadow-lg">
              <AvatarIcon avatarId={myPlayer.avatarId} size="md" />
            </div>

            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase mb-2 ${myRoleMeta.badgeColor}`}
            >
              {myRoleMeta.team === 'MAFIA' ? '마피아 진영' : '시민 진영'}
            </span>

            <h3 className="text-2xl font-black text-white mb-2">{myRoleMeta.name}</h3>
            <p className="text-xs text-rose-400 font-semibold mb-4">
              {myRoleMeta.summary}
            </p>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-left text-xs text-slate-300 leading-relaxed mb-4">
              {myRoleMeta.description}
            </div>

            {myRoleMeta.nightActionText && (
              <div className="bg-indigo-950/40 border border-indigo-800/60 p-3 rounded-xl text-left text-xs text-indigo-300 mb-2">
                <strong className="block text-indigo-200 mb-1">밤의 능력:</strong>
                {myRoleMeta.nightActionText}
              </div>
            )}

            {myRoleMeta.passiveText && (
              <div className="bg-emerald-950/40 border border-emerald-800/60 p-3 rounded-xl text-left text-xs text-emerald-300 mb-4">
                <strong className="block text-emerald-200 mb-1">고유 패시브:</strong>
                {myRoleMeta.passiveText}
              </div>
            )}

            <button
              onClick={() => setShowRoleModal(false)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
            >
              확인 완료
            </button>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {room.phase === 'GAME_OVER' && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
            <div className="w-20 h-20 rounded-3xl mx-auto mb-4 bg-gradient-to-br from-amber-600 to-rose-700 flex items-center justify-center shadow-xl shadow-rose-950">
              <Award className="w-10 h-10 text-white animate-bounce" />
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              게임 종료
            </span>
            <h3 className="text-3xl font-black text-white mt-1 mb-2">
              {room.winner === 'CITIZEN' ? '시민 진영 승리!' : '마피아 진영 승리!'}
            </h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              {room.winReason}
            </p>

            {/* All Players Roles Reveal */}
            <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 mb-6 text-left max-h-48 overflow-y-auto space-y-2">
              <span className="text-[11px] font-bold text-slate-400 block mb-2">
                12인 최종 정체 공개
              </span>
              {(Object.values(room.players) as Player[]).map((p) => {
                const rMeta = ROLES_CONFIG[p.role];
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-xs py-1 border-b border-slate-900"
                  >
                    <div className="flex items-center gap-2">
                      <AvatarIcon avatarId={p.avatarId} size="sm" />
                      <span className="font-semibold text-slate-200">{p.nickname}</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${rMeta.badgeColor}`}
                    >
                      {rMeta.name} {p.isAlive ? '(생존)' : '(사망)'}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              id="btn-return-lobby"
              onClick={onExitGame}
              className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-xl shadow-rose-900/40 transition active:scale-[0.98]"
            >
              메인 로비로 돌아가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
