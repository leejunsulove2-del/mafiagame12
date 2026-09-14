export type Role =
  | 'MAFIA'      // 마피아 (2명)
  | 'CLOWN'      // 광대 (2명)
  | 'POLICE'     // 경찰 (1명)
  | 'DETECTIVE'  // 탐정 (1명)
  | 'DOCTOR'     // 의사 (1명)
  | 'NURSE'      // 간호사 (1명)
  | 'POLITICIAN' // 정치가 (1명)
  | 'SPY'        // 스파이 (1명)
  | 'COWARD';    // 겁쟁이 (2명)

export type Team = 'CITIZEN' | 'MAFIA';

export type GamePhase =
  | 'WAITING'        // 대기실 (12명 모으는 중)
  | 'ROLE_REVEAL'    // 역할 확인 (5초)
  | 'DAY'            // 낮 (60초)
  | 'VOTE_TARGET'    // 투표 지목 (20초)
  | 'VOTE_DECISION'  // 찬반 결정 (10초)
  | 'NIGHT'          // 밤 (30초)
  | 'GAME_OVER';     // 게임 종료

export interface Player {
  id: string;
  nickname: string;
  avatarId: string;
  role: Role;
  originalRole?: Role; // 광대 또는 스파이가 변했을 때 원래 역할 기억
  team: Team;
  isAlive: boolean;
  isBot?: boolean;
  isConnected?: boolean;

  // 일회성 능력 상태
  cowardFledTonight?: boolean;  // 겁쟁이: 오늘 밤 도주 선택 여부
  hasUsedCowardFlee?: boolean;  // 겁쟁이: 게임 중 1회 사용 완료 여부
  hasUsedClownCopy?: boolean;   // 광대: 낮 사망자 직업 획득 1회 사용 여부

  // 밤 액션
  nightTarget?: string | null;       // 의사/경찰/스파이/마피아 대상
  nightTargets?: string[];          // 탐정 (2명 지목)
  nightActionCompleted?: boolean;   // 행동 여부 (탐정이 추적)

  // 낮 투표
  voteTarget?: string | null;       // 지목한 대상 ID
  decisionVote?: 'AGREE' | 'DISAGREE' | null; // 찬반 투표

  // 정치가 패시브 발동 여부
  politicianRevealed?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderRole?: Role;
  text: string;
  timestamp: number;
  type: 'PUBLIC' | 'MAFIA' | 'SYSTEM' | 'DEAD';
}

export interface GameLog {
  id: string;
  timestamp: number;
  text: string;
  type: 'PHASE' | 'KILL' | 'VOTE' | 'ROLE_EVENT' | 'SYSTEM';
}

export interface NightReport {
  killedPlayerId?: string | null;
  savedByDoctor?: boolean;
  nurseImmune?: boolean;
  cowardEscaped?: boolean;
  spyConverted?: boolean;
  detectiveResults?: {
    player1Id: string;
    player1Acted: boolean;
    player2Id: string;
    player2Acted: boolean;
  } | null;
  policeResult?: {
    targetId: string;
    isMafia: boolean;
  } | null;
}

export interface RoomState {
  roomId: string;
  createdAt: number;
  hostId: string;
  status: 'WAITING' | 'PLAYING' | 'ENDED';
  phase: GamePhase;
  dayCount: number;
  phaseEndTime: number; // Server timestamp ms
  phaseDuration: number; // seconds
  players: Record<string, Player>;
  lastDayDeadPlayerId: string | null;
  lastDayDeadRole: Role | null;
  voteCandidateId: string | null;
  winner: Team | null;
  winReason: string | null;
  nightReport?: NightReport | null;
}

export interface UserProfile {
  uid: string;
  nickname: string;
  avatarId: string;
  email?: string | null;
  gamesPlayed: number;
  wins: number;
  updatedAt: number;
}
