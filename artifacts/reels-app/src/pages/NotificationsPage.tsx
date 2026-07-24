import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/use-api';
import { Bell, Heart, MessageCircle, UserPlus, ArrowLeft, Loader2 } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';

interface NotifActor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface Notification {
  id: number;
  type: 'like' | 'comment' | 'follow';
  reelId: number | null;
  text: string | null;
  isRead: boolean;
  createdAt: string;
  actor: NotifActor | null;
}

function typeIcon(type: string) {
  if (type === 'like') return <Heart className="w-3.5 h-3.5 text-white fill-white" />;
  if (type === 'comment') return <MessageCircle className="w-3.5 h-3.5 text-white" />;
  if (type === 'follow') return <UserPlus className="w-3.5 h-3.5 text-white" />;
  return <Bell className="w-3.5 h-3.5 text-white" />;
}

function typeBg(type: string) {
  if (type === 'like') return '#e60023';
  if (type === 'comment') return '#0095f6';
  if (type === 'follow') return '#00a86b';
  return '#999';
}

function typeLabel(n: Notification) {
  const name = n.actor?.displayName ?? 'Someone';
  if (n.type === 'like') return `${name} liked your reel`;
  if (n.type === 'comment') return `${name} commented: "${n.text}"`;
  if (n.type === 'follow') return `${name} started following you`;
  return n.text ?? 'New notification';
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

export function NotificationsPage() {
  const { authFetch } = useApi();
  const [, setLocation] = useLocation();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/notifications')
      .then(setNotifs)
      .catch(() => {})
      .finally(() => setLoading(false));

    const timer = setTimeout(() => {
      authFetch('/api/notifications/read-all', { method: 'POST' }).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-24" id="notifications-page">
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-200">
        <button onClick={() => setLocation('/')} className="text-gray-500 hover:text-gray-900 p-1 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-gray-900 font-bold text-lg flex-1">Notifications</h1>
        <Bell className="w-5 h-5 text-gray-300" />
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-primary/50 animate-spin" />
        </div>
      )}

      {!loading && notifs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6">
          <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
            <Bell className="w-9 h-9 text-gray-300" />
          </div>
          <p className="text-gray-500 text-sm font-medium">No notifications yet</p>
          <p className="text-gray-400 text-xs max-w-xs">When someone likes or comments on your reels, it'll show here.</p>
        </div>
      )}

      <div className="bg-white divide-y divide-gray-100 mt-1 rounded-xl mx-3 shadow-sm overflow-hidden">
        {notifs.map(n => (
          <button
            key={n.id}
            id={`notif-${n.id}`}
            onClick={() => {
              if (n.actor) setLocation(`/${n.actor.username}`);
              else if (n.reelId) setLocation(`/reels/${n.reelId}`);
            }}
            className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left ${!n.isRead ? 'bg-red-50' : ''}`}
          >
            {/* Actor avatar */}
            <div className="relative flex-shrink-0">
              <UserAvatar
                avatarUrl={n.actor?.avatarUrl}
                displayName={n.actor?.displayName}
                username={n.actor?.username}
                className="w-12 h-12"
                size={3.5}
              />
              {/* Type icon badge */}
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: typeBg(n.type) }}
              >
                {typeIcon(n.type)}
              </div>
            </div>

            {/* Text */}
            <div className="flex-1 text-left min-w-0">
              <p className={`text-sm leading-snug ${n.isRead ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>
                {typeLabel(n)}
              </p>
              <p className="text-gray-400 text-xs mt-0.5">{timeAgo(n.createdAt)}</p>
            </div>

            {/* Unread dot */}
            {!n.isRead && <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );
}
