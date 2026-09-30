import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageSquare,
  Send,
  X,
  Activity,
  Smile,
  VolumeX,
  Volume2,
  Bot,
  Sparkles,
  Bell,
  BellOff,
  GripHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore.js';

const QUICK_REACTIONS = ['👍', '😂', '😮', '😡', '🎉'];
const EMOJI_PICKER_LIST = [
  '🔥',
  '❤️',
  '😎',
  '🃏',
  '🎯',
  '⚡',
  '🥳',
  '🤔',
  '🙌',
  '💯',
  '🚀',
  '👑',
];

/**
 * Part 6 & Part 11 Collapsible Live Chat / Move Log — Single Floating Chat Button 💬
 *
 * - Default state: Collapsed into a compact floating button (💬) on the right-hand side.
 * - Desktop: Opens a 340x450px floating glassmorphic window anchored to the bottom-right corner.
 * - Mobile: Opens as a bottom-sheet drawer (~60% screen height) with a top drag handle to pull down and close.
 * - Auto-scrolls to the newest message ONLY when user is already at the bottom (never interrupts scrolled-up reading).
 * - Smooth iOS momentum scrolling with overscroll-behavior: contain.
 * - Closes on X button, outside click, or Escape key.
 */
export default function ChatDrawer({
  chatMessages = [],
  actionLog = [],
  onSendChat,
}) {
  const {
    playerId,
    isChatOpen,
    setChatOpen,
    unreadChatCount,
    chatPingEnabled,
    toggleChatPing,
    mutedPlayerIds,
    toggleMutePlayer,
  } = useGameStore();

  const [tab, setTab] = useState('chat'); // 'chat' | 'log'
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const chatScrollContainerRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const windowRef = useRef(null);
  const triggerBtnRef = useRef(null);

  const handleMessageScroll = () => {
    if (!chatScrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollContainerRef.current;
    // Considered near bottom if within 60px of the end
    isNearBottomRef.current = scrollHeight - (scrollTop + clientHeight) < 60;
  };

  // Auto-scroll to newest message ONLY when user is near bottom
  useEffect(() => {
    if (isChatOpen && isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages.length, actionLog.length, isChatOpen, tab]);

  // Close on Escape key or outside click
  useEffect(() => {
    if (!isChatOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setChatOpen(false);
      }
    };

    const handlePointerDownOutside = (e) => {
      if (
        windowRef.current &&
        !windowRef.current.contains(e.target) &&
        triggerBtnRef.current &&
        !triggerBtnRef.current.contains(e.target)
      ) {
        setChatOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDownOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDownOutside);
    };
  }, [isChatOpen, setChatOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendChat(text.trim(), false);
    setText('');
    setShowEmojiPicker(false);
  };

  const handleQuickReaction = (emoji) => {
    onSendChat(emoji, true);
  };

  const handleInsertEmoji = (emoji) => {
    setText((prev) => (prev + emoji).slice(0, 200));
  };

  const visibleMessages = chatMessages.filter(
    (msg) => msg.type === 'system' || !mutedPlayerIds.includes(msg.playerId)
  );

  const renderWindowContents = (isMobileSheet = false) => (
    <div className="flex flex-col h-full w-full bg-slate-950/95 backdrop-blur-2xl border border-white/20 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
      {/* Mobile Bottom-Sheet Drag Handle */}
      {isMobileSheet && (
        <div
          onClick={() => setChatOpen(false)}
          className="pt-2.5 pb-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing bg-slate-900/90"
        >
          <div className="w-10 h-1.5 rounded-full bg-slate-600" />
        </div>
      )}

      {/* Header with Tabs + Ping Toggle + Close (X) */}
      <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between bg-slate-900/85">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTab('chat')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
              tab === 'chat'
                ? 'bg-amber-400 text-slate-950 shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Live Chat
          </button>
          <button
            type="button"
            onClick={() => setTab('log')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
              tab === 'log'
                ? 'bg-amber-400 text-slate-950 shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Move Log
          </button>
        </div>

        <div className="flex items-center gap-1">
          {!isMobileSheet && (
            <span
              className="p-1 text-slate-500 cursor-move hidden sm:inline-flex"
              title="Drag window to reposition"
            >
              <GripHorizontal className="w-4 h-4" />
            </span>
          )}
          <button
            type="button"
            onClick={toggleChatPing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-white/10 cursor-pointer transition"
            title={
              chatPingEnabled
                ? 'Notification sound ON'
                : 'Notification sound muted'
            }
          >
            {chatPingEnabled ? (
              <Bell className="w-4 h-4 text-amber-300" />
            ) : (
              <BellOff className="w-4 h-4 text-slate-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setChatOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Message / Move Log Stream */}
      <div
        ref={chatScrollContainerRef}
        onScroll={handleMessageScroll}
        className="chat-messages flex-1 p-3 space-y-2 min-h-0"
      >
        {tab === 'chat' ? (
          visibleMessages.length === 0 ? (
            <p className="text-slate-500 text-xs text-center mt-10 italic">
              No messages yet. Send a quick reaction or say hello!
            </p>
          ) : (
            visibleMessages.map((msg) => {
              if (msg.type === 'system') {
                return (
                  <div
                    key={msg.id}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-white/5 text-[11px] text-slate-400 italic flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400/80 shrink-0" />
                    <span className="flex-1">{msg.text}</span>
                  </div>
                );
              }

              const isMe = msg.playerId === playerId;
              const isMuted = mutedPlayerIds.includes(msg.playerId);
              const initial = (msg.playerName || 'P').trim().charAt(0).toUpperCase();

              return (
                <div
                  key={msg.id}
                  className={`rounded-2xl p-2.5 border transition ${
                    isMe
                      ? 'bg-amber-500/15 border-amber-400/35 ml-4'
                      : 'bg-slate-900/90 border-white/10 mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        style={{ backgroundColor: msg.avatarColor || '#3b82f6' }}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white font-display font-bold text-[10px] shrink-0 border border-white/30"
                      >
                        {msg.isBot ? <Bot className="w-3 h-3" /> : initial}
                      </div>
                      <span className="text-xs font-extrabold text-white truncate">
                        {msg.playerName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {!isMe && msg.playerId && (
                        <button
                          type="button"
                          onClick={() => toggleMutePlayer(msg.playerId)}
                          title={isMuted ? 'Unmute player' : 'Mute player'}
                          className="text-slate-500 hover:text-rose-400 cursor-pointer"
                        >
                          {isMuted ? (
                            <Volume2 className="w-3 h-3" />
                          ) : (
                            <VolumeX className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <p
                    className={`${
                      msg.type === 'reaction' ? 'text-2xl py-0.5' : 'text-xs text-slate-100'
                    } break-words pl-6`}
                  >
                    {msg.text}
                  </p>
                </div>
              );
            })
          )
        ) : actionLog.length === 0 ? (
          <p className="text-slate-500 text-xs text-center mt-10 italic">
            Moves will appear here as cards are played.
          </p>
        ) : (
          actionLog.map((entry) => (
            <div
              key={entry.id}
              className="text-[11px] text-slate-300 py-1.5 px-2.5 rounded-lg bg-slate-900/65 border border-white/5"
            >
              {entry.text}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Emoji Reactions + Input Bar */}
      {tab === 'chat' && (
        <div className="p-2.5 border-t border-white/10 bg-slate-900/90 space-y-2 relative">
          {/* Reaction Emoji Row */}
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">
              React:
            </span>
            <div className="flex items-center gap-1">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleQuickReaction(emoji)}
                  className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-sm leading-none cursor-pointer transition hover:scale-110 active:scale-95"
                  title={`Send ${emoji} reaction`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Emoji Picker Popover */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute bottom-14 left-2.5 right-2.5 p-2 rounded-2xl bg-slate-900 border border-white/20 shadow-2xl grid grid-cols-6 gap-1 z-30"
              >
                {EMOJI_PICKER_LIST.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => handleInsertEmoji(em)}
                    className="p-1 rounded-lg hover:bg-white/10 text-base text-center cursor-pointer"
                  >
                    {em}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Text Input (max 200 chars) + Send */}
          <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-white/10 cursor-pointer transition"
              title="Emoji Picker"
            >
              <Smile className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message (max 200)..."
              maxLength={200}
              className="flex-1 bg-slate-950 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold cursor-pointer transition"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Right-Side Floating Chat Button (Never overlaps hand) */}
      <div className="uno-floating-stack">
        <button
          ref={triggerBtnRef}
          type="button"
          onClick={() => setChatOpen(!isChatOpen)}
          style={{
            height: 'var(--fab-size)',
            minWidth: 'var(--fab-size)',
            paddingInline: 'clamp(0.65rem, 1.4vmin, 1rem)',
          }}
          className={`uno-tap-target pointer-events-auto relative rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center justify-center gap-2 cursor-pointer transition hover:scale-105 ${
            isChatOpen
              ? 'bg-amber-400 border-yellow-200 text-slate-950 font-extrabold'
              : 'bg-slate-900/95 hover:bg-slate-800 border-white/20 text-white'
          }`}
          title="Toggle Live Chat & Move Log"
        >
          <span style={{ fontSize: 'clamp(1rem, 2.2vmin, 1.25rem)' }} className="leading-none">
            💬
          </span>
          <span
            style={{ fontSize: 'var(--font-xs)' }}
            className="hidden md:inline font-bold"
          >
            Chat
          </span>

          {/* Unread Red Badge */}
          {!isChatOpen && unreadChatCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-rose-600 border-2 border-slate-950 text-[10px] font-black text-white flex items-center justify-center shadow-lg animate-bounce">
              {unreadChatCount > 99 ? '99+' : unreadChatCount}
            </span>
          )}
        </button>
      </div>

      {/* Floating Chat Window (Desktop >=768px) & Bottom-Sheet Drawer (Mobile <768px) via Portal */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            {/* Desktop Floating Window (clamp(280px, 30vw, 380px) x clamp(360px, 56vh, 480px)) */}
            <motion.div
              ref={windowRef}
              drag
              dragMomentum={false}
              dragConstraints={{ left: -260, right: 0, top: -260, bottom: 20 }}
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 16 }}
              transition={{ duration: 0.2 }}
              style={{
                right: 'calc(2vw + var(--fab-size) + 1.2vw)',
                bottom: '2.5vh',
                width: 'clamp(280px, 30vw, 380px)',
                height: 'clamp(360px, 56vh, 480px)',
              }}
              className="hidden md:flex fixed z-50 flex-col"
            >
              {renderWindowContents(false)}
            </motion.div>

            {/* Mobile Bottom-Sheet Drawer (<768px: 100vw x 58vh, border-radius 20px 20px 0 0) */}
            <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-xs">
              <motion.div
                ref={windowRef}
                drag="y"
                dragConstraints={{ top: 0, bottom: 320 }}
                dragElastic={0.18}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 90) {
                    setChatOpen(false);
                  }
                }}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                style={{
                  width: '100vw',
                  height: '58dvh',
                  borderRadius: '20px 20px 0 0',
                }}
                className="flex flex-col"
              >
                {renderWindowContents(true)}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
