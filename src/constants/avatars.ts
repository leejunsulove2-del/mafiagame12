export interface AvatarDef {
  id: string;
  name: string;
  category: string;
  bgColor: string;
  svgPath: string; // SVG icon graphic
  accentColor: string;
}

export const AVATAR_LIST: AvatarDef[] = [
  {
    id: 'fedora-boss',
    name: '페도라 보스',
    category: '마피아',
    bgColor: 'from-rose-900 to-slate-900',
    accentColor: '#f43f5e',
    svgPath: 'M3 8l3-3h12l3 3v2H3V8zm2 4h14v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7zm4 3a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2z',
  },
  {
    id: 'clown-mask',
    name: '피에로 광대',
    category: '광대',
    bgColor: 'from-amber-700 to-purple-950',
    accentColor: '#f59e0b',
    svgPath: 'M12 2a10 10 0 100 20 10 10 0 000-20zm-4 7a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm8 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm-4 4a2 2 0 110 4 2 2 0 010-4zm-4 4s1.5 2 4 2 4-2 4-2H8z',
  },
  {
    id: 'officer-cap',
    name: '베테랑 경위',
    category: '경찰',
    bgColor: 'from-sky-900 to-slate-900',
    accentColor: '#38bdf8',
    svgPath: 'M12 2l8 3v6c0 5.55-3.84 10.74-8 12-4.16-1.26-8-6.45-8-12V5l8-3zm0 4.5l-1.5 3-3 .5 2.2 2.1-.5 3 2.8-1.5 2.8 1.5-.5-3 2.2-2.1-3-.5-1.5-3z',
  },
  {
    id: 'detective-glass',
    name: '명탐정 돋보기',
    category: '탐정',
    bgColor: 'from-indigo-900 to-slate-900',
    accentColor: '#818cf8',
    svgPath: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  },
  {
    id: 'doctor-cross',
    name: '외과의사 닥터',
    category: '의사',
    bgColor: 'from-emerald-900 to-slate-900',
    accentColor: '#34d399',
    svgPath: 'M12 2a10 10 0 100 20 10 10 0 000-20zm1 5h-2v4H7v2h4v4h2v-4h4v-2h-4V7z',
  },
  {
    id: 'nurse-cap',
    name: '수호 간호사',
    category: '간호사',
    bgColor: 'from-teal-900 to-slate-900',
    accentColor: '#2dd4bf',
    svgPath: 'M12 3L2 7v3c0 6.6 4.3 12.8 10 14 5.7-1.2 10-7.4 10-14V7l-10-4zm2 9h-1.5v1.5h-1V12H10v-1h1.5V9.5h1V11H14v1z',
  },
  {
    id: 'politician-podium',
    name: '정치인 배지',
    category: '정치가',
    bgColor: 'from-purple-900 to-slate-900',
    accentColor: '#c084fc',
    svgPath: 'M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z',
  },
  {
    id: 'spy-agent',
    name: '비밀 요원',
    category: '스파이',
    bgColor: 'from-orange-900 to-slate-900',
    accentColor: '#fb923c',
    svgPath: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
  },
  {
    id: 'coward-rabbit',
    name: '비둘기/달팽이',
    category: '겁쟁이',
    bgColor: 'from-yellow-900 to-slate-900',
    accentColor: '#facc15',
    svgPath: 'M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7z',
  },
  {
    id: 'shady-hoodie',
    name: '그림자 후드',
    category: '기본',
    bgColor: 'from-zinc-800 to-slate-950',
    accentColor: '#94a3b8',
    svgPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z',
  },
  {
    id: 'neon-cyber',
    name: '사이버 네온',
    category: '스페셜',
    bgColor: 'from-cyan-900 to-blue-950',
    accentColor: '#22d3ee',
    svgPath: 'M12 1L3 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-9-4zm0 4a3 3 0 110 6 3 3 0 010-6zm5 11.2c0 .5-.4.8-.9.8H7.9c-.5 0-.9-.3-.9-.8 0-1.8 2.2-3.2 5-3.2s5 1.4 5 3.2z',
  },
  {
    id: 'golden-skull',
    name: '골든 스컬',
    category: '스페셜',
    bgColor: 'from-amber-900 to-yellow-950',
    accentColor: '#fbbf24',
    svgPath: 'M12 2C7.58 2 4 5.58 4 10c0 2.7 1.34 5.09 3.4 6.55.24.17.38.45.38.74V19c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-1.71c0-.29.14-.57.38-.74C18.66 15.09 20 12.7 20 10c0-4.42-3.58-8-8-8zm-3 9c-.83 0-1.5-.67-1.5-1.5S8.17 8 9 8s1.5.67 1.5 1.5S9.83 11 9 11zm6 0c-.83 0-1.5-.67-1.5-1.5S14.17 8 15 8s1.5.67 1.5 1.5S15.83 11 15 11z',
  },
];

export function getAvatarById(id: string): AvatarDef {
  const found = AVATAR_LIST.find((a) => a.id === id);
  return found || AVATAR_LIST[0];
}
