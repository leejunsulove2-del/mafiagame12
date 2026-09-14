import { Role, Team } from '../types/game';

export interface RoleMeta {
  role: Role;
  name: string;
  count: number;
  team: Team;
  badgeColor: string;
  borderColor: string;
  bgColor: string;
  summary: string;
  description: string;
  nightActionText?: string;
  passiveText?: string;
}

export const ROLES_CONFIG: Record<Role, RoleMeta> = {
  MAFIA: {
    role: 'MAFIA',
    name: '마피아',
    count: 2,
    team: 'MAFIA',
    badgeColor: 'bg-rose-600 text-white',
    borderColor: 'border-rose-500',
    bgColor: 'bg-rose-950/40',
    summary: '밤마다 1명을 암살합니다. (동료 마피아와 합의)',
    description:
      '밤마다 동료 마피아와 상의하여 제거할 대상 1명을 지목합니다. 지목을 안 할 수도 있으며, 의견이 갈리면 무작위로 한 명이 선택됩니다. 생존한 마피아 수가 시민(비마피아) 수와 같아지면 승리합니다.',
    nightActionText: '처단할 대상을 지목하세요 (선택하지 않을 수도 있습니다)',
  },
  CLOWN: {
    role: 'CLOWN',
    name: '광대',
    count: 2,
    team: 'CITIZEN',
    badgeColor: 'bg-amber-500 text-slate-950',
    borderColor: 'border-amber-400',
    bgColor: 'bg-amber-950/40',
    summary: '낮에 처형된 유저의 직업을 1회 복사하여 계승합니다.',
    description:
      '게임 내 단 1회에 한해, 낮 투표로 처형당한 유저의 직업을 획득하여 그 능력으로 살아갈 수 있습니다. 경찰의 조사에는 일반 "시민"으로 식별됩니다.',
    passiveText: '경찰 조사 시 항상 시민으로 판정됩니다.',
  },
  POLICE: {
    role: 'POLICE',
    name: '경찰',
    count: 1,
    team: 'CITIZEN',
    badgeColor: 'bg-sky-500 text-white',
    borderColor: 'border-sky-400',
    bgColor: 'bg-sky-950/40',
    summary: '밤에 1명을 조사하여 마피아인지 판별합니다.',
    description:
      '매일 밤 1명의 플레이어를 지목하여 그 사람이 마피아인지 시민인지 조사할 수 있습니다. (광대는 시민으로 판별됩니다)',
    nightActionText: '마피아 여부를 조사할 대상을 1명 선택하세요',
  },
  DETECTIVE: {
    role: 'DETECTIVE',
    name: '탐정',
    count: 1,
    team: 'CITIZEN',
    badgeColor: 'bg-indigo-500 text-white',
    borderColor: 'border-indigo-400',
    bgColor: 'bg-indigo-950/40',
    summary: '밤에 2명을 지목해 행동(능력 사용) 여부를 추적합니다.',
    description:
      '밤에 플레이어 2명을 지목하여, 그들이 이번 밤에 능력을 사용했는지(행동했는지) 추적합니다. 마피아가 대상을 지목하지 않았다면 "움직이지 않음"으로 처리됩니다.',
    nightActionText: '행동 여부를 추적할 대상 2명을 선택하세요',
  },
  DOCTOR: {
    role: 'DOCTOR',
    name: '의사',
    count: 1,
    team: 'CITIZEN',
    badgeColor: 'bg-emerald-500 text-white',
    borderColor: 'border-emerald-400',
    bgColor: 'bg-emerald-950/40',
    summary: '밤에 1명을 치료하여 마피아의 공격을 막습니다 (자신 불가).',
    description:
      '밤에 플레이어 1명을 지목하여 마피아의 기습 공격으로부터 보호합니다. 자신은 지목할 수 없습니다.',
    nightActionText: '치료하여 보호할 다른 플레이어 1명을 선택하세요',
  },
  NURSE: {
    role: 'NURSE',
    name: '간호사',
    count: 1,
    team: 'CITIZEN',
    badgeColor: 'bg-teal-500 text-white',
    borderColor: 'border-teal-400',
    bgColor: 'bg-teal-950/40',
    summary: '마피아에게 공격당해도 절대 사망하지 않는 불사 패시브.',
    description:
      '마피아의 밤 기습 공격을 받아도 사망하지 않는 강력한 패시브 능력을 보유하고 있습니다.',
    passiveText: '마피아 기습 공격 면역 (밤에 마피아에게 사망하지 않음)',
  },
  POLITICIAN: {
    role: 'POLITICIAN',
    name: '정치가',
    count: 1,
    team: 'CITIZEN',
    badgeColor: 'bg-purple-500 text-white',
    borderColor: 'border-purple-400',
    bgColor: 'bg-purple-950/40',
    summary: '낮 투표에서 처형 대상이 되면 정체를 밝히고 즉시 생존합니다.',
    description:
      '낮 재판 투표에서 최다 득표로 처형 위기에 처했을 때, 모든 이에게 "정치가" 신분을 당당히 밝히고 처형이 즉각 면제되어 생존합니다.',
    passiveText: '낮 재판 투표 처형 면제 (신분 공개 후 즉시 생존)',
  },
  SPY: {
    role: 'SPY',
    name: '스파이',
    count: 1,
    team: 'CITIZEN', // 시작은 시민팀이나 마피아 접선 시 마피아로 전향
    badgeColor: 'bg-orange-500 text-white',
    borderColor: 'border-orange-400',
    bgColor: 'bg-orange-950/40',
    summary: '밤에 마피아를 찾으면 즉시 마피아 팀으로 변환 합류합니다.',
    description:
      '밤마다 1명을 지정합니다. 지정한 대상이 마피아일 경우, 자신의 직업이 마피아로 변환되며 마피아 진영에 합류합니다!',
    nightActionText: '접선할 대상 1명을 선택하세요 (마피아일 경우 마피아로 전향)',
  },
  COWARD: {
    role: 'COWARD',
    name: '겁쟁이',
    count: 2,
    team: 'CITIZEN',
    badgeColor: 'bg-yellow-500 text-slate-950',
    borderColor: 'border-yellow-400',
    bgColor: 'bg-yellow-950/40',
    summary: '게임 중 1회 밤에 "도주"하여 모든 지목과 공격을 회피합니다.',
    description:
      '게임 중 단 1회에 한해 밤에 "도주"를 발동할 수 있습니다. 도주 시 그 밤에 자신을 향한 모든 공격, 치료, 경찰 및 탐정 조사를 완벽히 회피합니다.',
    nightActionText: '도주를 사용하여 오늘 밤 모든 위협과 조사를 회피하시겠습니까?',
  },
};

// 12명 구성 목록 (2 마피아, 2 광대, 1 경찰, 1 탐정, 1 의사, 1 간호사, 1 정치가, 1 스파이, 2 겁쟁이)
export const TWELVE_ROLES_DECK: Role[] = [
  'MAFIA',
  'MAFIA',
  'CLOWN',
  'CLOWN',
  'POLICE',
  'DETECTIVE',
  'DOCTOR',
  'NURSE',
  'POLITICIAN',
  'SPY',
  'COWARD',
  'COWARD',
];

// 타이머 설정 (초 단위)
export const PHASE_DURATIONS = {
  ROLE_REVEAL: 5,
  DAY: 60,
  VOTE_TARGET: 20,
  VOTE_DECISION: 10,
  NIGHT: 30,
};
