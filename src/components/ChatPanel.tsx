import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Player, GamePhase } from '../types/game';
import { dbService } from '../firebase/firebase';
import { AvatarIcon } from './AvatarIcon';
import { Send, Lock, EyeOff, Radio, ShieldAlert } from 'lucide-react';

interface ChatPanelProps {
  roomId: string;
  myPlayer: Player;
  phase: GamePhase;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ roomId, myPlayer, phase }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const scrollBottomRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time chat from RTDB
  useEffect(() => {
    const unsub = dbService.listenChats(roomId, (msgs) => {
      setMessages(msgs || []);
    });
    return () => unsub();
  }, [roomId]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const isNight = phase === 'NIGHT';
  const isMafia = myPlayer.role === 'MAFIA';
  const isDead = !myPlayer.isAlive;

  // Determine chat eligibility
  // At night: Only alive Mafias can chat (in MAFIA channel). Dead can chat in DEAD channel.
  // During day/vote: All alive players can chat (PUBLIC). Dead can chat in DEAD channel.
  const canSend = isDead
    ? true // dead can talk in ghost chat
    : isNight
    ? isMafia // only mafia can chat at night
    : true; // day/vote: everyone alive can chat

  const channelType: 'PUBLIC' | 'MAFIA' | 'DEAD' = isDead
    ? 'DEAD'
    : isNight && isMafia
    ? 'MAFIA'
    : 'PUBLIC';

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputText.trim();
    if (!clean || !canSend) return;

    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      senderId: myPlayer.id,
      senderName: myPlayer.nickname,
      senderAvatar: myPlayer.avatarId,
      senderRole: myPlayer.role,
      text: clean,
      timestamp: Date.now(),
      type: channelType,
    };

    setInputText('');
    await dbService.sendMessage(roomId, newMsg);
  };

  // Filter messages based on player perspective:
  // - PUBLIC messages: everyone sees
  // - MAFIA messages: only Mafias and Dead players see
  // - DEAD messages: only Dead players see
  // - SYSTEM messages: everyone sees
  const visibleMessages = messages.filter((msg) => {
    if (msg.type === 'SYSTEM' || msg.type === 'PUBLIC') return true;
    if (msg.type === 'MAFIA') {
      return isMafia || isDead;
    }
    if (msg.type === 'DEAD') {
      return isDead;
    }
    return true;
  });

  return (
    <div
      id="chat-panel"
      className="flex flex-col h-full bg-slate-950/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg"
    >
      {/* Channel Header Banner */}
      <div className="px-3.5 py-2 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {channelType === 'MAFIA' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="font-bold text-rose-400">마피아 비밀 무전 채널</span>
            </>
          ) : channelType === 'DEAD' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="font-bold text-purple-300">유령 관전 채팅</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-bold text-slate-200">실시간 시민 광장 채팅</span>
            </>
          )}
        </div>

        <span className="text-[10px] text-slate-500 font-mono">RTDB 연동</span>
      </div>

      {/* Messages List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 min-h-[160px] max-h-[300px] text-xs">
        {visibleMessages.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">
            대화가 시작되었습니다. 전략을 나누세요!
          </div>
        ) : (
          visibleMessages.map((msg) => {
            const isMe = msg.senderId === myPlayer.id;

            if (msg.type === 'SYSTEM') {
              return (
                <div
                  key={msg.id}
                  className="py-1 px-2.5 bg-slate-900/90 border border-slate-800 text-slate-300 rounded-xl text-[11px] text-center my-1"
                >
                  📢 {msg.text}
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <AvatarIcon avatarId={msg.senderAvatar} size="sm" />

                <div className={`max-w-[78%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[11px] font-bold text-slate-300">
                      {msg.senderName}
                    </span>
                    {msg.type === 'MAFIA' && (
                      <span className="text-[9px] bg-rose-950 text-rose-400 border border-rose-800 px-1 rounded">
                        마피아
                      </span>
                    )}
                    {msg.type === 'DEAD' && (
                      <span className="text-[9px] bg-purple-950 text-purple-300 border border-purple-800 px-1 rounded">
                        유령
                      </span>
                    )}
                  </div>

                  <div
                    className={`px-3 py-2 rounded-2xl text-xs leading-relaxed break-words ${
                      isMe
                        ? msg.type === 'MAFIA'
                          ? 'bg-rose-700 text-white rounded-tr-none'
                          : 'bg-indigo-600 text-white rounded-tr-none'
                        : msg.type === 'MAFIA'
                        ? 'bg-rose-950/80 border border-rose-800/60 text-rose-200 rounded-tl-none'
                        : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollBottomRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSendMessage}
        className="p-2 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2"
      >
        {canSend ? (
          <>
            <input
              id="input-chat-text"
              type="text"
              maxLength={80}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                channelType === 'MAFIA'
                  ? '마피아끼리만 공유되는 비밀 무전...'
                  : channelType === 'DEAD'
                  ? '유령 관전자들끼리 대화...'
                  : '낮 토론 채팅을 입력하세요...'
              }
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-xl text-xs focus:outline-none focus:border-rose-500 transition"
            />
            <button
              id="btn-send-chat"
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white transition shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="w-full py-2 px-3 rounded-xl bg-slate-950/80 text-slate-500 text-xs flex items-center justify-center gap-1.5 font-medium">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>밤 시간에는 마피아만 대화할 수 있습니다 (침묵 유지)</span>
          </div>
        )}
      </form>
    </div>
  );
};
