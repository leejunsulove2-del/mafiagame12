import React, { useState } from 'react';
import { UserProfile } from '../types/game';
import { AVATAR_LIST, AvatarDef } from '../constants/avatars';
import { AvatarIcon } from './AvatarIcon';
import { dbService } from '../firebase/firebase';
import { Check, Sparkles, User, X } from 'lucide-react';

interface CharacterSettingsModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (updated: UserProfile) => void;
}

const RANDOM_NICKNAMES = [
  '어둠의감시자',
  '달빛의스파이',
  '새벽의수사관',
  '비둘기순찰대',
  '하얀가운의사',
  '안개속의방랑자',
  '네온느와르',
  '페도라신사',
  '정의의수호자',
  '붉은카지노',
  '미드나잇체이서',
];

export const CharacterSettingsModal: React.FC<CharacterSettingsModalProps> = ({
  user,
  isOpen,
  onClose,
  onSaveSuccess,
}) => {
  const [nickname, setNickname] = useState(user.nickname || '');
  const [selectedAvatarId, setSelectedAvatarId] = useState(user.avatarId || 'fedora-boss');
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRandomNickname = () => {
    const pick = RANDOM_NICKNAMES[Math.floor(Math.random() * RANDOM_NICKNAMES.length)];
    const num = Math.floor(10 + Math.random() * 90);
    setNickname(`${pick}_${num}`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNick = nickname.trim();
    if (!cleanNick) {
      alert('닉네임을 입력해 주세요.');
      return;
    }

    setSaving(true);
    try {
      const updated: UserProfile = {
        ...user,
        nickname: cleanNick,
        avatarId: selectedAvatarId,
        updatedAt: Date.now(),
      };
      await dbService.saveUserProfile(updated);
      setToastMessage('캐릭터 설정이 Firebase에 성공적으로 저장되었습니다!');
      setTimeout(() => {
        onSaveSuccess(updated);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Save profile error:', err);
      alert('프로필 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col relative max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>캐릭터 설정</span>
              <span className="text-xs bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 px-2 py-0.5 rounded-full">
                Firebase 동기화
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              게임 내에서 표시될 닉네임과 경량 아바타를 선택하세요.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Current Avatar Preview & Nickname Input */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            <AvatarIcon avatarId={selectedAvatarId} size="lg" />

            <div className="w-full">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>내 닉네임 (최대 12자)</span>
                <button
                  type="button"
                  onClick={handleRandomNickname}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>랜덤 생성</span>
                </button>
              </label>
              <div className="relative">
                <input
                  id="input-nickname"
                  type="text"
                  maxLength={12}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="닉네임을 입력하세요"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition"
                  required
                />
              </div>
            </div>
          </div>

          {/* Lightweight Avatar Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300">
                기본 제공 경량 아바타 ({AVATAR_LIST.length}종)
              </span>
              <span className="text-[11px] text-emerald-400 font-mono">
                용량 0KB (SVG 벡터 내장)
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {AVATAR_LIST.map((avatar: AvatarDef) => {
                const isSelected = avatar.id === selectedAvatarId;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatarId(avatar.id)}
                    className={`p-3 rounded-2xl border transition flex flex-col items-center text-center group relative ${
                      isSelected
                        ? 'bg-rose-950/30 border-rose-500 ring-2 ring-rose-500/50'
                        : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50'
                    }`}
                  >
                    <AvatarIcon avatarId={avatar.id} size="md" className="mb-2" />
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white line-clamp-1">
                      {avatar.name}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      {avatar.category}
                    </span>

                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {toastMessage && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition"
            >
              취소
            </button>
            <button
              id="btn-save-character"
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-900/40 transition active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
