import React, { useState } from 'react';
import { Player, Role, RoomState } from '../types/game';
import { ROLES_CONFIG } from '../constants/roles';
import { AvatarIcon } from './AvatarIcon';
import {
  Crosshair,
  Shield,
  Search,
  Eye,
  HeartHandshake,
  Footprints,
  Radio,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Flame,
} from 'lucide-react';

interface RoleActionPanelProps {
  myPlayer: Player;
  room: RoomState;
  onUpdateMyAction: (updates: Partial<Player>) => void;
  onClownInheritRole?: (targetRole: Role) => void;
}

export const RoleActionPanel: React.FC<RoleActionPanelProps> = ({
  myPlayer,
  room,
  onUpdateMyAction,
  onClownInheritRole,
}) => {
  const [selectedSingleTarget, setSelectedSingleTarget] = useState<string | null>(
    myPlayer.nightTarget || null
  );
  const [detectivePicks, setDetectivePicks] = useState<string[]>(
    myPlayer.nightTargets || []
  );

  const isNight = room.phase === 'NIGHT';
  const isDay = room.phase === 'DAY';
  const alivePlayers = (Object.values(room.players) as Player[]).filter((p) => p.isAlive);
  const otherAlivePlayers = alivePlayers.filter((p) => p.id !== myPlayer.id);

  if (!myPlayer.isAlive) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl text-center">
        <p className="text-slate-400 text-xs">
          💀 사망한 상태입니다. 유령 대화방에서 관전할 수 있습니다.
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // CLOWN DAY ACTION: Once per game, steal role of daytime dead player
  // -------------------------------------------------------------
  if (myPlayer.role === 'CLOWN') {
    const canInherit =
      isDay &&
      room.lastDayDeadRole &&
      !myPlayer.hasUsedClownCopy;

    return (
      <div className="bg-amber-950/40 border border-amber-800/60 p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h4 className="font-bold text-sm text-amber-200">광대 능력 (1회 한정)</h4>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 font-mono">
            {myPlayer.hasUsedClownCopy ? '사용 완료' : '사용 가능'}
          </span>
        </div>
        <p className="text-xs text-amber-300/80 mb-3">
          낮에 투표로 처형된 유저의 직업을 획득하여 살아갈 수 있습니다. (경찰 조사 시 항상 시민으로 판정)
        </p>

        {canInherit && onClownInheritRole ? (
          <div className="p-3 bg-slate-950/80 rounded-xl border border-amber-600/40 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-300 font-semibold block">
                최근 처형 사망자 직업:{' '}
                <span className="text-amber-400 font-bold">
                  {ROLES_CONFIG[room.lastDayDeadRole!].name}
                </span>
              </span>
              <span className="text-[11px] text-slate-400">
                지금 직업을 획득하시겠습니까?
              </span>
            </div>
            <button
              id="btn-clown-inherit"
              onClick={() => onClownInheritRole(room.lastDayDeadRole!)}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition"
            >
              직업 획득
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
            {myPlayer.hasUsedClownCopy
              ? '이미 직업을 획득하여 사용이 완료되었습니다.'
              : '낮에 누군가 투표로 처형되면 그 직업을 획득할 수 있습니다.'}
          </div>
        )}
      </div>
    );
  }

  // If not night, show daytime role summary
  if (!isNight) {
    const meta = ROLES_CONFIG[myPlayer.role];
    return (
      <div className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`w-3 h-3 rounded-full ${meta.badgeColor}`} />
          <div>
            <span className="text-xs font-bold text-slate-200">
              {meta.name} ({meta.team === 'MAFIA' ? '마피아 진영' : '시민 진영'})
            </span>
            <p className="text-[11px] text-slate-400">{meta.summary}</p>
          </div>
        </div>
        {myPlayer.role === 'POLITICIAN' && (
          <span className="text-[10px] bg-purple-950/60 text-purple-300 border border-purple-800 px-2 py-1 rounded-lg">
            처형 면제 패시브 보유
          </span>
        )}
        {myPlayer.role === 'NURSE' && (
          <span className="text-[10px] bg-teal-950/60 text-teal-300 border border-teal-800 px-2 py-1 rounded-lg">
            마피아 야간 습격 면역
          </span>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // NIGHT ROLE ACTIONS (30 seconds)
  // -------------------------------------------------------------

  // 1. MAFIA (2 players): Pick target together or pass
  if (myPlayer.role === 'MAFIA') {
    const partnerMafia = (Object.values(room.players) as Player[]).find(
      (p) => p.role === 'MAFIA' && p.id !== myPlayer.id && p.isAlive
    );

    const handleMafiaTarget = (targetId: string | null) => {
      setSelectedSingleTarget(targetId);
      onUpdateMyAction({ nightTarget: targetId, nightActionCompleted: true });
    };

    return (
      <div className="bg-rose-950/40 border border-rose-800/60 p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-rose-500 animate-pulse" />
            <h4 className="font-bold text-sm text-rose-200">마피아 밤의 암살</h4>
          </div>
          {partnerMafia && (
            <span className="text-[11px] text-rose-400/90 font-medium">
              동료: {partnerMafia.nickname}{' '}
              {partnerMafia.nightTarget
                ? `(지목: ${room.players[partnerMafia.nightTarget]?.nickname || '선택'})`
                : '(지목 전)'}
            </span>
          )}
        </div>
        <p className="text-xs text-rose-300/80 mb-3">
          처단할 대상을 지목하세요. 지목을 안 할 수도 있으며, 의견이 갈리면 무작위로 선택됩니다.
        </p>

        {/* Target Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <button
            id="btn-mafia-pass"
            onClick={() => handleMafiaTarget(null)}
            className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
              selectedSingleTarget === null
                ? 'bg-rose-600 text-white border-rose-400'
                : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            ❌ 지목 안 함 (패스)
          </button>

          {otherAlivePlayers.map((player) => {
            const isSelected = selectedSingleTarget === player.id;
            const isPartner = player.id === partnerMafia?.id;
            return (
              <button
                key={player.id}
                id={`btn-target-${player.id}`}
                onClick={() => handleMafiaTarget(player.id)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
                  isSelected
                    ? 'bg-rose-600 text-white border-rose-400 ring-2 ring-rose-500/50'
                    : isPartner
                    ? 'bg-slate-950/40 text-rose-400 border-rose-950'
                    : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <AvatarIcon avatarId={player.avatarId} size="sm" />
                <span className="truncate">{player.nickname}</span>
                {isPartner && <span className="text-[9px] text-rose-400">(동료)</span>}
              </button>
            );
          })}
        </div>

        {selectedSingleTarget && (
          <div className="text-xs text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              선택된 대상: [{room.players[selectedSingleTarget]?.nickname}] (아침에 결과 반영)
            </span>
          </div>
        )}
      </div>
    );
  }

  // 2. POLICE (1 player): Target 1 player to investigate (Mafia vs Citizen)
  if (myPlayer.role === 'POLICE') {
    const handlePoliceTarget = (targetId: string) => {
      setSelectedSingleTarget(targetId);
      onUpdateMyAction({ nightTarget: targetId, nightActionCompleted: true });
    };

    return (
      <div className="bg-sky-950/40 border border-sky-800/60 p-4 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <Search className="w-4 h-4 text-sky-400" />
          <h4 className="font-bold text-sm text-sky-200">경찰 야간 수사</h4>
        </div>
        <p className="text-xs text-sky-300/80 mb-3">
          1명을 지목하여 마피아인지 시민인지 조사합니다. (광대는 시민으로 판별됩니다)
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          {otherAlivePlayers.map((player) => {
            const isSelected = selectedSingleTarget === player.id;
            return (
              <button
                key={player.id}
                id={`btn-police-target-${player.id}`}
                onClick={() => handlePoliceTarget(player.id)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
                  isSelected
                    ? 'bg-sky-600 text-white border-sky-400 ring-2 ring-sky-500/50'
                    : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <AvatarIcon avatarId={player.avatarId} size="sm" />
                <span className="truncate">{player.nickname}</span>
              </button>
            );
          })}
        </div>

        {selectedSingleTarget && (
          <div className="text-xs text-sky-300 flex items-center gap-1.5 mt-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
            <span>수사 대상: [{room.players[selectedSingleTarget]?.nickname}] 지목 완료</span>
          </div>
        )}
      </div>
    );
  }

  // 3. DETECTIVE (1 player): Target 2 players to check if they took an action
  if (myPlayer.role === 'DETECTIVE') {
    const handleDetectiveToggle = (targetId: string) => {
      let updated: string[];
      if (detectivePicks.includes(targetId)) {
        updated = detectivePicks.filter((id) => id !== targetId);
      } else {
        if (detectivePicks.length >= 2) {
          updated = [detectivePicks[1], targetId];
        } else {
          updated = [...detectivePicks, targetId];
        }
      }
      setDetectivePicks(updated);
      onUpdateMyAction({
        nightTargets: updated,
        nightActionCompleted: updated.length === 2,
      });
    };

    return (
      <div className="bg-indigo-950/40 border border-indigo-800/60 p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-400" />
            <h4 className="font-bold text-sm text-indigo-200">탐정 야간 잠복 수사 (2명 선택)</h4>
          </div>
          <span className="text-xs font-mono text-indigo-300">
            선택: {detectivePicks.length}/2명
          </span>
        </div>
        <p className="text-xs text-indigo-300/80 mb-3">
          2명을 지목하여 그들이 오늘 밤 능력을 사용했는지(행동했는지) 추적합니다.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          {otherAlivePlayers.map((player) => {
            const isSelected = detectivePicks.includes(player.id);
            return (
              <button
                key={player.id}
                id={`btn-detective-target-${player.id}`}
                onClick={() => handleDetectiveToggle(player.id)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-500/50'
                    : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <AvatarIcon avatarId={player.avatarId} size="sm" />
                <span className="truncate">{player.nickname}</span>
                {isSelected && <span className="text-[10px] text-indigo-200 font-bold">✓</span>}
              </button>
            );
          })}
        </div>

        {detectivePicks.length === 2 && (
          <div className="text-xs text-emerald-400 flex items-center gap-1.5 mt-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              2명 잠복 대상 지목 완료: [
              {detectivePicks.map((id) => room.players[id]?.nickname).join(', ')}]
            </span>
          </div>
        )}
      </div>
    );
  }

  // 4. DOCTOR (1 player): Heal 1 player against mafia kill (cannot heal self!)
  if (myPlayer.role === 'DOCTOR') {
    const handleDoctorTarget = (targetId: string) => {
      setSelectedSingleTarget(targetId);
      onUpdateMyAction({ nightTarget: targetId, nightActionCompleted: true });
    };

    return (
      <div className="bg-emerald-950/40 border border-emerald-800/60 p-4 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <HeartHandshake className="w-4 h-4 text-emerald-400" />
          <h4 className="font-bold text-sm text-emerald-200">의사 야간 치료 (자신 지목 불가)</h4>
        </div>
        <p className="text-xs text-emerald-300/80 mb-3">
          1명을 지목하여 마피아의 공격으로부터 보호하고 생존시킵니다.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          {otherAlivePlayers.map((player) => {
            const isSelected = selectedSingleTarget === player.id;
            return (
              <button
                key={player.id}
                id={`btn-doctor-target-${player.id}`}
                onClick={() => handleDoctorTarget(player.id)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-500/50'
                    : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <AvatarIcon avatarId={player.avatarId} size="sm" />
                <span className="truncate">{player.nickname}</span>
              </button>
            );
          })}
        </div>

        {selectedSingleTarget && (
          <div className="text-xs text-emerald-400 flex items-center gap-1.5 mt-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>치료 대상: [{room.players[selectedSingleTarget]?.nickname}] 보호 준비 완료</span>
          </div>
        )}
      </div>
    );
  }

  // 5. NURSE (1 player): Passive immunity to mafia attack
  if (myPlayer.role === 'NURSE') {
    return (
      <div className="bg-teal-950/40 border border-teal-800/60 p-4 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-teal-400" />
          <h4 className="font-bold text-sm text-teal-200">간호사 불사 수호 패시브</h4>
        </div>
        <p className="text-xs text-teal-300/90 leading-relaxed">
          당신은 밤에 마피아에게 기습 공격을 받아도 절대 사망하지 않는 패시브 능력을 가지고
          있습니다. 밤에는 별도의 지목 없이 안전하게 대기합니다.
        </p>
      </div>
    );
  }

  // 6. POLITICIAN (1 player): Daytime execution immunity
  if (myPlayer.role === 'POLITICIAN') {
    return (
      <div className="bg-purple-950/40 border border-purple-800/60 p-4 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-purple-400" />
          <h4 className="font-bold text-sm text-purple-200">정치가 처형 면제 패시브</h4>
        </div>
        <p className="text-xs text-purple-300/90 leading-relaxed">
          낮 표결 투표에서 자신이 최다 득표로 처형 위기에 처할 경우, 모든 이에게 "정치가"
          신분을 밝히고 즉시 처형이 면제되어 생존합니다.
        </p>
      </div>
    );
  }

  // 7. SPY (1 player): Designate 1 player; if target is Mafia -> converts to Mafia
  if (myPlayer.role === 'SPY') {
    const handleSpyTarget = (targetId: string) => {
      setSelectedSingleTarget(targetId);
      onUpdateMyAction({ nightTarget: targetId, nightActionCompleted: true });
    };

    return (
      <div className="bg-orange-950/40 border border-orange-800/60 p-4 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <Radio className="w-4 h-4 text-orange-400" />
          <h4 className="font-bold text-sm text-orange-200">스파이 비밀 접선</h4>
        </div>
        <p className="text-xs text-orange-300/80 mb-3">
          밤에 1명을 지정합니다. 지정한 대상이 마피아일 경우, 자신의 직업이 마피아로 변경되며
          마피아 진영에 합류합니다!
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          {otherAlivePlayers.map((player) => {
            const isSelected = selectedSingleTarget === player.id;
            return (
              <button
                key={player.id}
                id={`btn-spy-target-${player.id}`}
                onClick={() => handleSpyTarget(player.id)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
                  isSelected
                    ? 'bg-orange-600 text-white border-orange-400 ring-2 ring-orange-500/50'
                    : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <AvatarIcon avatarId={player.avatarId} size="sm" />
                <span className="truncate">{player.nickname}</span>
              </button>
            );
          })}
        </div>

        {selectedSingleTarget && (
          <div className="text-xs text-orange-300 flex items-center gap-1.5 mt-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />
            <span>접선 시도 대상: [{room.players[selectedSingleTarget]?.nickname}] (마피아일 시 전향)</span>
          </div>
        )}
      </div>
    );
  }

  // 8. COWARD (2 players): 1-time "도주" option during Night
  if (myPlayer.role === 'COWARD') {
    const handleCowardToggleFlee = () => {
      if (myPlayer.hasUsedCowardFlee) return;
      const nextFled = !myPlayer.cowardFledTonight;
      onUpdateMyAction({
        cowardFledTonight: nextFled,
        nightActionCompleted: nextFled,
      });
    };

    return (
      <div className="bg-yellow-950/40 border border-yellow-800/60 p-4 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Footprints className="w-4 h-4 text-yellow-400" />
            <h4 className="font-bold text-sm text-yellow-200">겁쟁이 도주 (게임 중 1회 한정)</h4>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-900/60 text-yellow-300 font-mono">
            {myPlayer.hasUsedCowardFlee ? '사용 완료' : '사용 가능'}
          </span>
        </div>
        <p className="text-xs text-yellow-300/80 mb-3">
          도주 시 오늘 밤 들어오는 모든 지목(마피아 공격, 경찰/탐정 조사 등)을 완벽하게 회피합니다.
        </p>

        {myPlayer.hasUsedCowardFlee ? (
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400">
            이미 도주 능력을 1회 소진하였습니다.
          </div>
        ) : (
          <button
            id="btn-coward-flee"
            onClick={handleCowardToggleFlee}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${
              myPlayer.cowardFledTonight
                ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/30'
                : 'bg-slate-900 border border-yellow-700 text-yellow-300 hover:bg-yellow-950/60'
            }`}
          >
            <Footprints className="w-4 h-4" />
            <span>
              {myPlayer.cowardFledTonight
                ? '🏃‍♂️ 오늘 밤 도주 선택 중 (회피 발동됨)'
                : '오늘 밤 "도주" 선택하기'}
            </span>
          </button>
        )}
      </div>
    );
  }

  return null;
};
