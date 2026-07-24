import { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/use-api';
import { UserAvatar } from '@/components/UserAvatar';

// Skipping to comments list mapping:
// We'll replace the avatar list items below in the target range.

interface CommentUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface Comment {
  id: number;
  text: string;
  createdAt: string;
  user: CommentUser;
}

interface CommentDrawerProps {
  reelId: number;
  onClose: () => void;
  onCommentCountChange: (count: number) => void;
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

export function CommentDrawer({ reelId, onClose, onCommentCountChange }: CommentDrawerProps) {
  const { profile } = useAuth();
  const { authFetch } = useApi();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    authFetch(`/api/reels/${reelId}/comments`)
      .then((data: Comment[]) => {
        setComments(data);
        onCommentCountChange(data.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reelId]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const newComment: Comment = await authFetch(`/api/reels/${reelId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      setComments(prev => [newComment, ...prev]);
      onCommentCountChange(comments.length + 1);
      setText('');
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Drawer */}
      <div
        className="relative z-10 rounded-t-3xl flex flex-col"
        style={{
          background: 'rgba(18,18,18,0.97)',
          backdropFilter: 'blur(20px)',
          maxHeight: '70vh',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-white font-bold text-base">Comments {comments.length > 0 && `(${comments.length})`}</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4 [scrollbar-width:none]">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
            </div>
          )}
          {!loading && comments.length === 0 && (
            <div className="text-center py-10 text-white/30 text-sm">No comments yet. Be the first!</div>
          )}
          {comments.map(c => (
            <div key={c.id} className="flex items-start gap-3 animate-fade-in">
              <UserAvatar
                avatarUrl={c.user.avatarUrl}
                displayName={c.user.displayName}
                username={c.user.username}
                className="w-8 h-8 flex-shrink-0"
                size={2.2}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white text-xs font-semibold">@{c.user.username}</span>
                  <span className="text-white/30 text-xs">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-white/85 text-sm leading-relaxed">{c.text}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-white/10 flex items-center gap-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <UserAvatar
            avatarUrl={profile?.avatarUrl}
            displayName={profile?.displayName}
            username={profile?.username}
            className="w-8 h-8 flex-shrink-0"
            size={2.2}
          />
          <input
            id="comment-input"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Add a comment..."
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-sm placeholder:text-white/30 outline-none focus:border-white/30 transition-colors"
          />
          <button
            id="send-comment-btn"
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="p-2.5 rounded-full transition-all duration-200 disabled:opacity-30"
            style={{ background: text.trim() ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'rgba(255,255,255,0.1)' }}
          >
            {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}
