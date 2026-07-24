import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/use-api';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Send, Loader2, MessageCircle } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';

interface ConvUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface Conversation {
  id: number;
  userAId: string;
  userBId: string;
  lastMessageAt: string;
  otherUser: ConvUser;
  lastMessage: { text: string; senderId: string } | null;
}

interface Message {
  id: number;
  conversationId: number;
  senderId: string;
  text: string;
  createdAt: string;
  sender: ConvUser;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ────────── Conversations List ──────────
function ConversationList({
  convs,
  loading,
  onSelect,
  selectedId,
}: {
  convs: Conversation[];
  loading: boolean;
  onSelect: (conv: Conversation) => void;
  selectedId?: number;
}) {
  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-6 h-6 text-primary/50 animate-spin" />
    </div>
  );

  if (convs.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
      <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
        <MessageCircle className="w-9 h-9 text-gray-300" />
      </div>
      <p className="text-gray-500 text-sm font-medium">No messages yet</p>
      <p className="text-gray-400 text-xs">Visit someone's profile to start a DM</p>
    </div>
  );

  return (
    <div className="bg-white divide-y divide-gray-100 mx-3 mt-3 rounded-2xl shadow-sm overflow-hidden">
      {convs.map(conv => (
        <button
          key={conv.id}
          id={`conv-${conv.id}`}
          onClick={() => onSelect(conv)}
          className={`w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-left ${selectedId === conv.id ? 'bg-red-50' : ''}`}
        >
          <UserAvatar
            avatarUrl={conv.otherUser.avatarUrl}
            displayName={conv.otherUser.displayName}
            username={conv.otherUser.username}
            className="w-12 h-12 flex-shrink-0"
            size={3.5}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-gray-900 text-sm font-semibold truncate">{conv.otherUser.displayName}</span>
              {conv.lastMessage && (
                <span className="text-gray-400 text-xs flex-shrink-0 ml-2">{timeAgo(conv.lastMessageAt)}</span>
              )}
            </div>
            <p className="text-gray-400 text-xs truncate">
              {conv.lastMessage?.text ?? 'Start chatting'}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ────────── Chat Thread ──────────
function ChatThread({
  conversation,
  onBack,
}: {
  conversation: Conversation;
  onBack: () => void;
}) {
  const { profile, session } = useAuth();
  const { authFetch } = useApi();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    authFetch(`/api/messages/${conversation.id}`)
      .then((data: Message[]) => { setMessages(data); })
      .catch(() => {})
      .finally(() => { setLoading(false); setTimeout(scrollToBottom, 100); });
  }, [conversation.id]);

  // Supabase Realtime
  useEffect(() => {
    const currentProfile = profile;
    const channel = supabase
      .channel(`conv-${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            const sender = (currentProfile && newMsg.sender_id === currentProfile.id)
              ? { id: currentProfile.id, username: currentProfile.username, displayName: currentProfile.displayName, avatarUrl: currentProfile.avatarUrl }
              : conversation.otherUser;
            return [...prev, { ...newMsg, sender }];
          });
          setTimeout(scrollToBottom, 50);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversation.id, profile]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const optimisticText = text.trim();
    setText('');
    setSending(true);
    try {
      const msg: Message = await authFetch(`/api/messages/${conversation.id}/send`, {
        method: 'POST',
        body: JSON.stringify({ text: optimisticText }),
      });
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      setTimeout(scrollToBottom, 50);
    } catch {
      setText(optimisticText);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Thread Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-900 p-1 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <UserAvatar
          avatarUrl={conversation.otherUser.avatarUrl}
          displayName={conversation.otherUser.displayName}
          username={conversation.otherUser.username}
          className="w-9 h-9 flex-shrink-0"
          size={2.8}
        />
        <div>
          <p className="text-gray-900 text-sm font-bold leading-tight">{conversation.otherUser.displayName}</p>
          <p className="text-gray-400 text-xs">@{conversation.otherUser.username}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 [scrollbar-width:none]">
        {loading && <div className="flex justify-center"><Loader2 className="w-5 h-5 text-primary/50 animate-spin" /></div>}
        {messages.map(msg => {
          const isOwn = msg.senderId === profile?.id;
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
              {!isOwn && (
                <UserAvatar
                  avatarUrl={conversation.otherUser.avatarUrl}
                  displayName={conversation.otherUser.displayName}
                  username={conversation.otherUser.username}
                  className="w-6 h-6 flex-shrink-0"
                  size={1.8}
                />
              )}
              <div
                className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isOwn
                    ? 'rounded-br-sm text-white'
                    : 'rounded-bl-sm text-gray-800 bg-white border border-gray-200 shadow-sm'
                }`}
                style={isOwn ? { background: '#e60023' } : {}}
              >
                {msg.text}
              </div>
              <span className="text-gray-400 text-[10px] flex-shrink-0 pb-1">{timeAgo(msg.createdAt)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-t border-gray-200 bg-white flex-shrink-0"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <input
          id="message-input"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={`Message @${conversation.otherUser.username}...`}
          className="flex-1 bg-gray-100 border border-gray-200 rounded-full px-4 py-2.5 text-gray-900 text-sm placeholder:text-gray-400 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all"
        />
        <button
          id="send-message-btn"
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="p-2.5 rounded-full transition-all duration-200 disabled:opacity-30 active:scale-95"
          style={{ background: text.trim() ? '#e60023' : '#e9e9e9' }}
        >
          {sending
            ? <Loader2 className="w-4 h-4 text-white animate-spin" />
            : <Send className={`w-4 h-4 ${text.trim() ? 'text-white' : 'text-gray-400'}`} />
          }
        </button>
      </div>
    </div>
  );
}

// ────────── Messages Page (container) ──────────
export function MessagesPage() {
  const { profile } = useAuth();
  const { authFetch } = useApi();
  const [, setLocation] = useLocation();
  const params = useParams<{ conversationId?: string }>();
  const routeConvId = params.conversationId ? Number(params.conversationId) : undefined;

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    authFetch('/api/messages/conversations')
      .then(setConvs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const activeConv = routeConvId ? convs.find(c => c.id === routeConvId) : null;

  const handleSelect = (conv: Conversation) => {
    setLocation(`/messages/${conv.id}`);
  };

  const handleBack = () => {
    setLocation('/messages');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16" id="messages-page">
      {/* Header */}
      {!activeConv && (
        <div className="sticky top-0 z-30 px-5 py-4 flex items-center gap-3 bg-white border-b border-gray-200">
          <button onClick={() => setLocation('/')} className="text-gray-500 hover:text-gray-900 p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-gray-900 font-bold text-lg">Messages</h1>
        </div>
      )}

      {activeConv ? (
        <div className="flex flex-col h-screen">
          <ChatThread conversation={activeConv} onBack={handleBack} />
        </div>
      ) : (
        <ConversationList
          convs={convs}
          loading={loading}
          onSelect={handleSelect}
          selectedId={routeConvId}
        />
      )}
    </div>
  );
}
