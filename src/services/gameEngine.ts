import {
  Player,
  Role,
  Team,
  GamePhase,
  RoomState,
  NightReport,
  ChatMessage,
} from '../types/game';
import { TWELVE_ROLES_DECK, PHASE_DURATIONS, ROLES_CONFIG } from '../constants/roles';
import { AVATAR_LIST } from '../constants/avatars';

// Helper to shuffle an array (Fisher-Yates)
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Generate 11 bot names
const BOT_NAMES = [
  '밤안개',
  '달빛수사관',
  '네온사인',
  '비둘기순경',
  '닥터하우스',
  '그림자스파이',
  '골목대장',
  '시계토끼',
  '체스마스터',
  '루팡3세',
  '하얀거탑',
  '셜록홈즈',
  '붉은장미',
  '심야식당',
];

// Initialize 12 players for a room
export function create12PlayerGame(
  hostPlayer: { uid: string; nickname: string; avatarId: string },
  otherHumanPlayers: { uid: string; nickname: string; avatarId: string }[] = [],
  roomId: string
): RoomState {
  // We need total 12 players
  const shuffledRoles = shuffle(TWELVE_ROLES_DECK);

  const playersList: Player[] = [];

  // Host player
  playersList.push({
    id: hostPlayer.uid,
    nickname: hostPlayer.nickname,
    avatarId: hostPlayer.avatarId,
    role: shuffledRoles[0],
    originalRole: shuffledRoles[0],
    team: shuffledRoles[0] === 'MAFIA' ? 'MAFIA' : 'CITIZEN',
    isAlive: true,
    isBot: false,
    isConnected: true,
  });

  // Other humans
  otherHumanPlayers.forEach((h, idx) => {
    const role = shuffledRoles[idx + 1];
    playersList.push({
      id: h.uid,
      nickname: h.nickname,
      avatarId: h.avatarId,
      role: role,
      originalRole: role,
      team: role === 'MAFIA' ? 'MAFIA' : 'CITIZEN',
      isAlive: true,
      isBot: false,
      isConnected: true,
    });
  });

  // Fill remaining slots with Bots to reach exactly 12
  const remainingSlots = 12 - playersList.length;
  const shuffledBotNames = shuffle(BOT_NAMES);
  const shuffledAvatars = shuffle(AVATAR_LIST);

  for (let i = 0; i < remainingSlots; i++) {
    const slotIdx = playersList.length;
    const role = shuffledRoles[slotIdx];
    playersList.push({
      id: `bot_${i + 1}_${Math.random().toString(36).substring(2, 6)}`,
      nickname: shuffledBotNames[i % shuffledBotNames.length] || `시민_${i + 1}`,
      avatarId: shuffledAvatars[i % shuffledAvatars.length].id,
      role: role,
      originalRole: role,
      team: role === 'MAFIA' ? 'MAFIA' : 'CITIZEN',
      isAlive: true,
      isBot: true,
      isConnected: true,
    });
  }

  const playersRecord: Record<string, Player> = {};
  playersList.forEach((p) => {
    playersRecord[p.id] = p;
  });

  return {
    roomId,
    createdAt: Date.now(),
    hostId: hostPlayer.uid,
    status: 'PLAYING',
    phase: 'ROLE_REVEAL',
    dayCount: 1,
    phaseDuration: PHASE_DURATIONS.ROLE_REVEAL,
    phaseEndTime: Date.now() + PHASE_DURATIONS.ROLE_REVEAL * 1000,
    players: playersRecord,
    lastDayDeadPlayerId: null,
    lastDayDeadRole: null,
    voteCandidateId: null,
    winner: null,
    winReason: null,
    nightReport: null,
  };
}

// Evaluate Win Conditions
export function checkWinCondition(players: Record<string, Player>): {
  winner: Team | null;
  winReason: string | null;
} {
  const alivePlayers = Object.values(players).filter((p) => p.isAlive);
  const aliveMafiaCount = alivePlayers.filter((p) => p.role === 'MAFIA').length;
  const aliveCitizenCount = alivePlayers.length - aliveMafiaCount;

  if (aliveMafiaCount === 0) {
    return {
      winner: 'CITIZEN',
      winReason: '모든 마피아가 소탕되었습니다! 시민 팀 승리!',
    };
  }

  if (aliveMafiaCount >= aliveCitizenCount) {
    return {
      winner: 'MAFIA',
      winReason: `생존 마피아(${aliveMafiaCount}명)가 시민 수(${aliveCitizenCount}명) 이상을 장악했습니다! 마피아 승리!`,
    };
  }

  return { winner: null, winReason: null };
}

// Resolve Night Phase Actions
export function resolveNightActions(state: RoomState): {
  updatedPlayers: Record<string, Player>;
  nightReport: NightReport;
  systemMessages: string[];
} {
  const players = JSON.parse(JSON.stringify(state.players)) as Record<string, Player>;
  const alivePlayers = Object.values(players).filter((p) => p.isAlive);
  const systemMessages: string[] = [];

  const nightReport: NightReport = {
    killedPlayerId: null,
    savedByDoctor: false,
    nurseImmune: false,
    cowardEscaped: false,
    spyConverted: false,
    detectiveResults: null,
    policeResult: null,
  };

  // 1. Identify Cowards who fled tonight
  const cowardsWhoFled: string[] = [];
  alivePlayers.forEach((p) => {
    if (p.role === 'COWARD' && p.cowardFledTonight) {
      cowardsWhoFled.push(p.id);
      p.hasUsedCowardFlee = true; // Consumed 1-time ability
      nightReport.cowardEscaped = true;
    }
  });

  // 2. Identify Doctor Heal Target (cannot be doctor self)
  const doctor = alivePlayers.find((p) => p.role === 'DOCTOR');
  const doctorTargetId =
    doctor && doctor.nightTarget && doctor.nightTarget !== doctor.id
      ? doctor.nightTarget
      : null;

  // 3. Identify Spy action (if targets a Mafia -> transforms into Mafia)
  const spy = alivePlayers.find((p) => p.role === 'SPY');
  if (spy && spy.nightTarget) {
    const target = players[spy.nightTarget];
    // Check if target fled as coward
    if (cowardsWhoFled.includes(spy.nightTarget)) {
      // Evaded
    } else if (target && target.isAlive && target.role === 'MAFIA') {
      // Spy converts into Mafia!
      spy.role = 'MAFIA';
      spy.team = 'MAFIA';
      nightReport.spyConverted = true;
      systemMessages.push(`[비밀 접선] 스파이가 마피아와 접선하여 마피아로 전향했습니다!`);
    }
  }

  // 4. Mafia Kill Target Determination:
  // - 2 Mafias agree on 1 target, or pass.
  // - If split votes, randomly choose one of the chosen targets.
  const aliveMafias = alivePlayers.filter((p) => p.role === 'MAFIA');
  const mafiaTargets: string[] = [];
  aliveMafias.forEach((m) => {
    if (m.nightTarget && players[m.nightTarget]?.isAlive) {
      mafiaTargets.push(m.nightTarget);
    }
  });

  let chosenMafiaTargetId: string | null = null;
  if (mafiaTargets.length > 0) {
    if (mafiaTargets.length === 1) {
      chosenMafiaTargetId = mafiaTargets[0];
    } else if (mafiaTargets[0] === mafiaTargets[1]) {
      chosenMafiaTargetId = mafiaTargets[0];
    } else {
      // Split vote -> random selection between the two
      chosenMafiaTargetId = mafiaTargets[Math.floor(Math.random() * mafiaTargets.length)];
    }
  }

  // Evaluate Mafia Kill on chosen target
  if (chosenMafiaTargetId) {
    const victim = players[chosenMafiaTargetId];
    if (cowardsWhoFled.includes(chosenMafiaTargetId)) {
      // Coward avoided all actions by fleeing!
      systemMessages.push('어젯밤 누군가 마피아의 습격을 받았으나 도주하여 생존했습니다.');
    } else if (victim.role === 'NURSE') {
      // Nurse passive: immune to night attacks by Mafia!
      nightReport.nurseImmune = true;
      systemMessages.push(
        '어젯밤 마피아의 총격이 있었으나, 간호사의 수호로 아무도 사망하지 않았습니다.'
      );
    } else if (doctorTargetId === chosenMafiaTargetId) {
      // Doctor saved!
      nightReport.savedByDoctor = true;
      systemMessages.push(
        '어젯밤 의사의 신속한 치료로 마피아의 공격을 받은 플레이어가 기적적으로 살아났습니다!'
      );
    } else {
      // Victim killed!
      victim.isAlive = false;
      nightReport.killedPlayerId = victim.id;
      systemMessages.push(
        `어젯밤 마피아의 습격으로 [${victim.nickname}] 님이 차가운 시신으로 발견되었습니다.`
      );
    }
  } else {
    systemMessages.push('어젯밤 마피아는 아무도 지목하지 않아 평온한 밤이었습니다.');
  }

  // 5. Police Investigation
  const police = alivePlayers.find((p) => p.role === 'POLICE');
  if (police && police.nightTarget) {
    const target = players[police.nightTarget];
    if (target) {
      if (cowardsWhoFled.includes(police.nightTarget)) {
        // Coward evaded police search
        nightReport.policeResult = null;
      } else {
        // Clown is checked as CITIZEN!
        // Spy before conversion is CITIZEN; after conversion is MAFIA
        const isMafia = target.role === 'MAFIA';
        nightReport.policeResult = {
          targetId: target.id,
          isMafia: isMafia,
        };
      }
    }
  }

  // 6. Detective Investigation (Checks 2 players for action usage)
  const detective = alivePlayers.find((p) => p.role === 'DETECTIVE');
  if (detective && detective.nightTargets && detective.nightTargets.length === 2) {
    const p1 = players[detective.nightTargets[0]];
    const p2 = players[detective.nightTargets[1]];

    if (p1 && p2) {
      // An action was taken if nightTarget was set, or coward fled
      const p1Acted =
        !cowardsWhoFled.includes(p1.id) &&
        Boolean(p1.nightTarget || p1.nightTargets?.length || p1.cowardFledTonight);
      const p2Acted =
        !cowardsWhoFled.includes(p2.id) &&
        Boolean(p2.nightTarget || p2.nightTargets?.length || p2.cowardFledTonight);

      nightReport.detectiveResults = {
        player1Id: p1.id,
        player1Acted: p1Acted,
        player2Id: p2.id,
        player2Acted: p2Acted,
      };
    }
  }

  // Reset temporary night action flags for next round
  Object.values(players).forEach((p) => {
    p.nightTarget = null;
    p.nightTargets = [];
    p.cowardFledTonight = false;
    p.nightActionCompleted = false;
    p.voteTarget = null;
    p.decisionVote = null;
  });

  return {
    updatedPlayers: players,
    nightReport,
    systemMessages,
  };
}

// Resolve Day Vote Target (20s phase ends)
export function resolveVoteTargetPhase(players: Record<string, Player>): {
  candidateId: string | null;
  voteSummary: Record<string, number>;
  message: string;
} {
  const voteCounts: Record<string, number> = {};
  const alivePlayers = Object.values(players).filter((p) => p.isAlive);

  alivePlayers.forEach((p) => {
    if (p.voteTarget && players[p.voteTarget]?.isAlive) {
      voteCounts[p.voteTarget] = (voteCounts[p.voteTarget] || 0) + 1;
    }
  });

  let maxVotes = 0;
  let topCandidates: string[] = [];

  Object.entries(voteCounts).forEach(([candidateId, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      topCandidates = [candidateId];
    } else if (count === maxVotes) {
      topCandidates.push(candidateId);
    }
  });

  // Must have at least 1 vote and no tie
  if (topCandidates.length === 1 && maxVotes > 0) {
    const candidate = players[topCandidates[0]];
    return {
      candidateId: candidate.id,
      voteSummary: voteCounts,
      message: `최다 지목 투표로 [${candidate.nickname}] 님이 재판 심판대에 올랐습니다. (찬반 결정 시작)`,
    };
  }

  return {
    candidateId: null,
    voteSummary: voteCounts,
    message:
      topCandidates.length > 1
        ? '동표가 발생하여 오늘 낮 재판 심판 대상이 결정되지 않았습니다.'
        : '투표가 진행되지 않아 오늘 재판이 무효 처리되었습니다.',
  };
}

// Resolve Day Vote Decision (10s phase ends)
export function resolveVoteDecisionPhase(
  players: Record<string, Player>,
  candidateId: string
): {
  executedPlayer: Player | null;
  politicianSaved: boolean;
  message: string;
} {
  const candidate = players[candidateId];
  if (!candidate || !candidate.isAlive) {
    return {
      executedPlayer: null,
      politicianSaved: false,
      message: '심판 대상이 존재하지 않습니다.',
    };
  }

  const alivePlayers = Object.values(players).filter((p) => p.isAlive);
  let agreeCount = 0;
  let disagreeCount = 0;

  alivePlayers.forEach((p) => {
    if (p.decisionVote === 'AGREE') agreeCount++;
    else if (p.decisionVote === 'DISAGREE') disagreeCount++;
  });

  // Plurality: If Agree > Disagree -> Execute (unless Politician!)
  if (agreeCount > disagreeCount) {
    // Politician passive check!
    if (candidate.role === 'POLITICIAN') {
      candidate.politicianRevealed = true;
      return {
        executedPlayer: null,
        politicianSaved: true,
        message: `[정치가 능력 발동!] ${candidate.nickname} 님이 "저는 당당한 정치가입니다!" 라며 신분을 밝히고 처형을 즉각 면제받아 생존했습니다!`,
      };
    }

    // Normal execution
    candidate.isAlive = false;
    return {
      executedPlayer: candidate,
      politicianSaved: false,
      message: `찬성 ${agreeCount}표 vs 반대 ${disagreeCount}표로 [${candidate.nickname}] 님이 사형 처형되었습니다.`,
    };
  }

  return {
    executedPlayer: null,
    politicianSaved: false,
    message: `찬성 ${agreeCount}표 vs 반대 ${disagreeCount}표로 과반에 미달하여 [${candidate.nickname}] 님의 처형이 부결되었습니다.`,
  };
}

// Clown role inheritance action
export function applyClownRoleInheritance(
  players: Record<string, Player>,
  clownId: string,
  targetDeadRole: Role
): { updated: boolean; message: string } {
  const clown = players[clownId];
  if (!clown || clown.role !== 'CLOWN' || clown.hasUsedClownCopy) {
    return { updated: false, message: '능력을 사용할 수 없습니다.' };
  }

  clown.hasUsedClownCopy = true;
  clown.role = targetDeadRole;
  clown.team = targetDeadRole === 'MAFIA' ? 'MAFIA' : 'CITIZEN';

  const roleName = ROLES_CONFIG[targetDeadRole].name;
  return {
    updated: true,
    message: `광대 ${clown.nickname} 님이 사망자의 영혼을 모방하여 [${roleName}] 직업을 획득했습니다!`,
  };
}

// Bot AI helper to simulate realistic actions during phases
export function generateBotActions(
  state: RoomState,
  phase: GamePhase
): Record<string, Partial<Player>> {
  const updates: Record<string, Partial<Player>> = {};
  const alivePlayers = Object.values(state.players).filter((p) => p.isAlive);
  const aliveBots = alivePlayers.filter((p) => p.isBot);

  if (phase === 'VOTE_TARGET') {
    aliveBots.forEach((bot) => {
      // 85% chance to vote a random living player other than themselves
      if (Math.random() < 0.85) {
        const candidates = alivePlayers.filter((p) => p.id !== bot.id);
        if (candidates.length > 0) {
          const chosen = candidates[Math.floor(Math.random() * candidates.length)];
          updates[bot.id] = { voteTarget: chosen.id };
        }
      }
    });
  } else if (phase === 'VOTE_DECISION') {
    aliveBots.forEach((bot) => {
      // 55% chance agree, 45% disagree
      const vote = Math.random() < 0.55 ? 'AGREE' : 'DISAGREE';
      updates[bot.id] = { decisionVote: vote };
    });
  } else if (phase === 'NIGHT') {
    aliveBots.forEach((bot) => {
      const otherAlive = alivePlayers.filter((p) => p.id !== bot.id);

      if (bot.role === 'MAFIA') {
        // Mafia target non-mafia if possible
        const nonMafias = otherAlive.filter((p) => p.role !== 'MAFIA');
        if (nonMafias.length > 0 && Math.random() < 0.9) {
          const victim = nonMafias[Math.floor(Math.random() * nonMafias.length)];
          updates[bot.id] = { nightTarget: victim.id, nightActionCompleted: true };
        }
      } else if (bot.role === 'DOCTOR') {
        // Doctor heals someone other than self
        if (otherAlive.length > 0) {
          const patient = otherAlive[Math.floor(Math.random() * otherAlive.length)];
          updates[bot.id] = { nightTarget: patient.id, nightActionCompleted: true };
        }
      } else if (bot.role === 'POLICE') {
        if (otherAlive.length > 0) {
          const target = otherAlive[Math.floor(Math.random() * otherAlive.length)];
          updates[bot.id] = { nightTarget: target.id, nightActionCompleted: true };
        }
      } else if (bot.role === 'DETECTIVE') {
        if (otherAlive.length >= 2) {
          const shuffled = shuffle(otherAlive);
          updates[bot.id] = {
            nightTargets: [shuffled[0].id, shuffled[1].id],
            nightActionCompleted: true,
          };
        }
      } else if (bot.role === 'SPY') {
        if (otherAlive.length > 0) {
          const target = otherAlive[Math.floor(Math.random() * otherAlive.length)];
          updates[bot.id] = { nightTarget: target.id, nightActionCompleted: true };
        }
      } else if (bot.role === 'COWARD') {
        // 20% chance to flee if not already used
        if (!bot.hasUsedCowardFlee && Math.random() < 0.25) {
          updates[bot.id] = { cowardFledTonight: true, nightActionCompleted: true };
        }
      }
    });
  }

  return updates;
}
