import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/use-api';
import { UserAvatar } from '@/components/UserAvatar';
import { ReelOverlay, type OverlayReel } from '@/components/ReelOverlay';
import {
  Search, Play, Loader2, X,
  UserCheck, MessageCircle, Users, Grid3x3, Compass
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const PAGE_SIZE = 50;

interface ExploreReel {
  id: number;
  title: string;
  description?: string | null;
  videoPath: string;
  thumbnailPath: string | null;
  views: number;
  likes: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; username: string; displayName: string; avatarUrl?: string | null } | null;
  isLiked?: boolean;
}

interface ExploreUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  followersCount: number;
  bio?: string | null;
  isFollowing: boolean;
}

function thumbUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${API_BASE}${path.startsWith('/api/') ? path : `/api/storage${path}`}`;
}

function toOverlayReel(r: ExploreReel): OverlayReel {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? null,
    videoPath: r.videoPath,
    thumbnailPath: r.thumbnailPath,
    status: r.status ?? 'published',
    views: r.views,
    likes: r.likes ?? 0,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    user: r.user ?? null,
    isLiked: r.isLiked ?? false,
  };
}

// ─── User Card (memoized) ─────────────────────────────────────────────────────
const UserCard = memo(function UserCard({
  user,
  onFollowChange,
}: {
  user: ExploreUser;
  onFollowChange: (id: string, following: boolean) => void;
}) {
  const { user: me } = useAuth();
  const { authFetch } = useApi();
  const [, setLocation] = useLocation();
  const [followLoading, setFollowLoading] = useState(false);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!me) { setLocation('/login'); return; }
    setFollowLoading(true);
    try {
      if (user.isFollowing) {
        await authFetch(`/api/users/${user.id}/follow`, { method: 'DELETE' });
        onFollowChange(user.id, false);
      } else {
        await authFetch(`/api/users/${user.id}/follow`, { method: 'POST' });
        onFollowChange(user.id, true);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!me) { setLocation('/login'); return; }
    try {
      await authFetch(`/api/messages/start/${user.id}`, { method: 'POST' });
      setLocation(`/messages`);
    } catch {}
  };

  const isOwnProfile = me?.id === user.id;

  return (
    <div
      className="flex flex-col items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 bg-white border border-gray-100"
      onClick={() => setLocation(`/${user.username}`)}
    >
      <div className="relative">
        <UserAvatar
          avatarUrl={user.avatarUrl}
          displayName={user.displayName}
          username={user.username}
          className="w-16 h-16"
          size={5}
        />
        {user.isFollowing && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <UserCheck className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      <div className="text-center min-w-0 w-full">
        <p className="text-gray-900 font-semibold text-sm truncate">{user.displayName}</p>
        <p className="text-gray-400 text-xs truncate">@{user.username}</p>
        <p className="text-gray-400 text-[10px] mt-0.5">
          {user.followersCount >= 1000
            ? `${(user.followersCount / 1000).toFixed(1)}K`
            : user.followersCount} followers
        </p>
      </div>
      {!isOwnProfile && (
        <div className="flex gap-2 w-full" onClick={e => e.stopPropagation()}>
          <button
            onClick={handleFollow}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 border"
            style={{
              background: user.isFollowing ? '#f0f0f0' : '#e60023',
              borderColor: user.isFollowing ? '#ddd' : '#e60023',
              color: user.isFollowing ? '#333' : 'white',
            }}
          >
            {followLoading ? '...' : user.isFollowing ? 'Following' : 'Follow'}
          </button>
          <button
            onClick={handleMessage}
            className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all duration-200 active:scale-95 border border-gray-200"
            title="Message"
          >
            <MessageCircle className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}
    </div>
  );
});

// ─── Reel Pin (memoized) ────────────────────────────────────────────────────
const ReelPin = memo(function ReelPin({ reel, onClick }: { reel: ExploreReel; onClick: () => void }) {
  const thumb = thumbUrl(reel.thumbnailPath);
  const vidUrl = thumbUrl(reel.videoPath);

  return (
    <div
      onClick={onClick}
      className="relative aspect-[9/16] overflow-hidden rounded-2xl cursor-pointer group shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 bg-gray-100"
    >
      {thumb ? (
        <img
          src={thumb}
          alt={reel.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <video
          src={vidUrl ? `${vidUrl}#t=0.1` : undefined}
          className="w-full h-full object-cover"
          preload="metadata"
          muted
          playsInline
        />
      )}
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300 delay-75 shadow-2xl">
          <Play className="w-5 h-5 text-white fill-white ml-1" />
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white text-xs font-bold bg-black/40 backdrop-blur-md rounded-full px-2.5 py-1 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
          <Play className="w-3 h-3 fill-white" /> {reel.views.toLocaleString()}
        </div>
      </div>
    </div>
  );
});

// ─── Sentinel for infinite scroll ────────────────────────────────────────────
function LoadMoreSentinel({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onVisible(); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisible]);
  return <div ref={ref} className="h-8" />;
}

// ─── Main Explore Page ────────────────────────────────────────────────────────
type Tab = 'people' | 'reels';

export function ExplorePage() {
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>('reels');
  const [query, setQuery] = useState('');

  // Reels state — paginated
  const [reels, setReels] = useState<ExploreReel[]>([]);
  const [reelPage, setReelPage] = useState(1);
  const [hasMoreReels, setHasMoreReels] = useState(true);
  const [reelsLoading, setReelsLoading] = useState(false);
  const loadingRef = useRef(false);

  // Overlay state
  const [overlayIndex, setOverlayIndex] = useState<number | null>(null);

  // Users state
  const [users, setUsers] = useState<ExploreUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const fetchReelPage = useCallback(async (page: number, reset = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setReelsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      const res = await fetch(
        `${API_BASE}/api/explore?page=${page}&limit=${PAGE_SIZE}`,
        { headers }
      );
      const data = await res.json();
      const incoming: ExploreReel[] = data.reels ?? [];
      setReels(prev => reset ? incoming : [...prev, ...incoming.filter(r => !prev.some(p => p.id === r.id))]);
      setHasMoreReels(incoming.length === PAGE_SIZE);
    } catch {} finally {
      setReelsLoading(false);
      loadingRef.current = false;
    }
  }, [session]);

  const fetchUsers = useCallback(async (q: string) => {
    setUsersLoading(true);
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : '';
      const headers: Record<string, string> = {};
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      const res = await fetch(`${API_BASE}/api/explore${params}`, { headers });
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {} finally { setUsersLoading(false); }
  }, [session]);

  // Initial load
  useEffect(() => {
    fetchReelPage(1, true);
    fetchUsers('');
  }, [fetchReelPage, fetchUsers]);

  // Search users
  useEffect(() => {
    if (!query) return;
    const t = setTimeout(() => fetchUsers(query), 400);
    return () => clearTimeout(t);
  }, [query, fetchUsers]);

  useEffect(() => { if (query) setTab('people'); }, [query]);

  const loadMoreReels = useCallback(() => {
    if (!hasMoreReels || reelsLoading) return;
    const next = reelPage + 1;
    setReelPage(next);
    fetchReelPage(next);
  }, [hasMoreReels, reelsLoading, reelPage, fetchReelPage]);

  const handleFollowChange = useCallback((id: string, following: boolean) => {
    setUsers(prev => prev.map(u =>
      u.id === id
        ? { ...u, isFollowing: following, followersCount: u.followersCount + (following ? 1 : -1) }
        : u
    ));
  }, []);

  const openOverlay = useCallback((index: number) => {
    setOverlayIndex(index);
  }, []);

  const closeOverlay = useCallback(() => {
    setOverlayIndex(null);
  }, []);

  const isLoading = reelsLoading && reels.length === 0;

  return (
    <div className="min-h-screen pb-24 bg-gray-50" id="explore-page">
      {/* ── Overlay ── */}
      {overlayIndex !== null && (
        <ReelOverlay
          reels={reels.map(toOverlayReel)}
          startIndex={overlayIndex}
          onClose={closeOverlay}
        />
      )}

      {/* ── Header ── */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3 bg-white/90 backdrop-blur-xl border-b border-gray-200/50">
        <div className="flex items-center gap-2 mb-3">
          <Compass className="w-5 h-5 text-primary" />
          <h1 className="text-gray-900 font-bold text-xl flex-1">Explore</h1>
          {reels.length > 0 && tab === 'reels' && (
            <span className="text-xs text-gray-400 font-semibold bg-gray-100 px-2.5 py-1 rounded-full">
              {reels.length} reels
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative flex items-center mb-3">
          <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            id="explore-search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search people or reels..."
            className="w-full rounded-full pl-10 pr-10 py-2.5 text-gray-900 text-sm placeholder:text-gray-400 outline-none bg-gray-100 focus:bg-white focus:ring-2 focus:ring-primary/30 transition-all border border-gray-200"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {([['reels', Grid3x3, 'Reels'], ['people', Users, 'People']] as const).map(([id, Icon, label]) => (
            <button
              key={id}
              onClick={() => setTab(id as Tab)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200"
              style={{
                background: tab === id ? '#e60023' : '#f0f0f0',
                color: tab === id ? '#fff' : '#555',
              }}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading initial ── */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 text-primary/50 animate-spin" />
        </div>
      )}

      {/* ── Reels Tab ── */}
      {!isLoading && tab === 'reels' && (
        <>
          {reels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-6">
              <Play className="w-12 h-12 text-gray-300" />
              <p className="text-gray-400 text-sm">No reels yet</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 p-2 mt-1">
                {reels.map((reel, index) => (
                  <ReelPin
                    key={reel.id}
                    reel={reel}
                    onClick={() => openOverlay(index)}
                  />
                ))}
              </div>

              {hasMoreReels && <LoadMoreSentinel onVisible={loadMoreReels} />}
              {reelsLoading && reels.length > 0 && (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 text-primary/50 animate-spin" />
                </div>
              )}
              {!hasMoreReels && reels.length > 0 && (
                <p className="text-center text-gray-300 text-xs py-6 font-medium">
                  All {reels.length} reels loaded ✓
                </p>
              )}
            </>
          )}
        </>
      )}

      {/* ── People Tab ── */}
      {tab === 'people' && (
        <>
          {usersLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-7 h-7 text-primary/50 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-6">
              <Users className="w-12 h-12 text-gray-300" />
              <p className="text-gray-400 text-sm">{query ? `No users found for "${query}"` : 'No users yet'}</p>
            </div>
          ) : (
            <div className="px-4 pt-5">
              {!query && (
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-4">
                  Suggested for you · {users.length} people
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                {users.map(u => (
                  <UserCard key={u.id} user={u} onFollowChange={handleFollowChange} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
