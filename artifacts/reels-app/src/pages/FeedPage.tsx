import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/use-api';
import { useLocation } from 'wouter';
import { UserAvatar } from '@/components/UserAvatar';
import { ReelOverlay, type OverlayReel } from '@/components/ReelOverlay';
import {
  Heart, MessageCircle, Share2, Play, Loader2, PlaySquare,
  BookmarkPlus, Film
} from 'lucide-react';
import { Link } from 'wouter';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

interface FeedReel {
  id: number;
  title: string;
  description?: string | null;
  videoPath: string;
  thumbnailPath?: string | null;
  status: string;
  views: number;
  likes: number;
  duration?: number | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; username: string; displayName: string; avatarUrl?: string | null } | null;
  isLiked: boolean;
}

interface StoryUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${API_BASE}${path.startsWith('/api/') ? path : `/api/storage${path}`}`;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

// ─── Story Avatar ─────────────────────────────────────────────────────────────
function StoryAvatar({ user }: { user: StoryUser }) {
  const [, setLocation] = useLocation();
  return (
    <button
      onClick={() => setLocation(`/${user.username}`)}
      className="flex flex-col items-center gap-1.5 shrink-0 group"
    >
      <div className="p-0.5 rounded-full bg-gradient-to-tr from-primary via-orange-400 to-yellow-300 group-hover:scale-105 transition-transform duration-200">
        <div className="p-0.5 rounded-full bg-white">
          <UserAvatar
            avatarUrl={user.avatarUrl}
            displayName={user.displayName}
            username={user.username}
            className="w-14 h-14"
            size={4}
          />
        </div>
      </div>
      <span className="text-gray-700 text-[10px] font-semibold max-w-[64px] truncate text-center">
        {user.username}
      </span>
    </button>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────
const PostCard = memo(function PostCard({
  reel,
  onPlay,
  onLike,
}: {
  reel: FeedReel;
  onPlay: () => void;
  onLike: (id: number, liked: boolean) => void;
}) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { authFetch } = useApi();
  const [liked, setLiked] = useState(reel.isLiked);
  const [likeCount, setLikeCount] = useState(reel.likes);
  const [isPlayingInline, setIsPlayingInline] = useState(false);
  const thumb = mediaUrl(reel.thumbnailPath);
  const vidUrl = mediaUrl(reel.videoPath);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { setLocation('/login'); return; }
    const next = !liked;
    setLiked(next);
    setLikeCount(p => next ? p + 1 : Math.max(0, p - 1));
    onLike(reel.id, next);
    authFetch(`/api/reels/${reel.id}/like`, { method: 'POST' }).catch(() => {});
  };

  return (
    <article className="bg-white border-b border-gray-100">
      {/* Post header */}
      {reel.user && (
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setLocation(`/${reel.user!.username}`)}
        >
          <div className="p-0.5 rounded-full bg-gradient-to-tr from-primary via-orange-400 to-yellow-300">
            <div className="p-0.5 rounded-full bg-white">
              <UserAvatar
                avatarUrl={reel.user.avatarUrl}
                displayName={reel.user.displayName}
                username={reel.user.username}
                className="w-9 h-9"
                size={3}
              />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 font-bold text-sm leading-tight">@{reel.user.username}</p>
            <p className="text-gray-400 text-[11px]">{timeAgo(reel.createdAt)}</p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); setIsPlayingInline(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all duration-200"
          >
            <Play className="w-3 h-3 fill-current" />
            Play
          </button>
        </div>
      )}

      {/* Thumbnail / Video — 9:16 portrait for reels */}
      <div
        className="relative w-full max-w-sm mx-auto aspect-[9/16] bg-gray-100 cursor-pointer overflow-hidden group"
        onClick={() => {
           if (!isPlayingInline) setIsPlayingInline(true);
           else onPlay(); // Open overlay if already playing inline
        }}
      >
        {isPlayingInline ? (
          <video
            src={vidUrl ?? ''}
            className="w-full h-full object-cover"
            autoPlay
            controls
            playsInline
            loop
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <>
            {thumb ? (
              <img
                src={thumb}
                alt={reel.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
            {/* Play overlay */}
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center shadow-2xl">
                <Play className="w-7 h-7 text-white fill-white ml-1" />
              </div>
            </div>
          </>
        )}
        {/* Duration badge */}
        {reel.duration && reel.duration > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            {Math.floor(reel.duration / 60)}:{String(Math.floor(reel.duration % 60)).padStart(2, '0')}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="px-4 py-2.5">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={handleLike}
            className="flex items-center gap-1.5 group"
          >
            <Heart
              className={`w-6 h-6 transition-all duration-200 group-hover:scale-125 ${liked ? 'fill-primary text-primary' : 'text-gray-700'}`}
            />
          </button>
          <button
            onClick={onPlay}
            className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900 group"
          >
            <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
          </button>
          <button className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900 group">
            <Share2 className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
          </button>
          <div className="ml-auto">
            <button className="text-gray-700 hover:text-gray-900 group">
              <BookmarkPlus className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
            </button>
          </div>
        </div>
        {likeCount > 0 && (
          <p className="text-gray-900 text-sm font-bold mb-1">{formatCount(likeCount)} likes</p>
        )}
        {reel.title && (
          <p className="text-gray-900 text-sm">
            {reel.user && <span className="font-bold mr-1">@{reel.user.username}</span>}
            <span className="text-gray-700">{reel.title}</span>
          </p>
        )}
        {reel.description && (
          <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{reel.description}</p>
        )}
        <p className="text-gray-400 text-[10px] mt-1.5 uppercase tracking-wide font-medium">
          {timeAgo(reel.createdAt)}
        </p>
      </div>
    </article>
  );
});

// ─── Reels Row ────────────────────────────────────────────────────────────────
function ReelsRow({ reels, onOpen }: { reels: FeedReel[]; onOpen: (i: number) => void }) {
  if (reels.length === 0) return null;
  return (
    <div className="bg-white border-b border-gray-100 py-4">
      <div className="flex items-center gap-2 px-4 mb-3">
        <Film className="w-5 h-5 text-primary" />
        <h2 className="text-gray-900 font-bold text-base">Reels</h2>
        <span className="text-xs text-gray-400 font-semibold ml-auto">See all</span>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {reels.map((reel, i) => {
          const thumb = mediaUrl(reel.thumbnailPath);
          const vidUrl = mediaUrl(reel.videoPath);
          return (
            <div
              key={reel.id}
              onClick={() => onOpen(i)}
              className="relative shrink-0 w-28 aspect-[9/16] rounded-xl overflow-hidden cursor-pointer group shadow hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gray-100"
            >
              {thumb ? (
                <img src={thumb} alt={reel.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
              ) : (
                <video src={vidUrl ? `${vidUrl}#t=0.1` : undefined} className="w-full h-full object-cover" preload="metadata" muted playsInline />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-white text-[9px] font-semibold line-clamp-2 leading-tight">{reel.title}</p>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Play className="w-6 h-6 text-white fill-white drop-shadow-lg" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main FeedPage ────────────────────────────────────────────────────────────
export function FeedPage() {
  const { session, user, profile } = useAuth();
  const [, setLocation] = useLocation();

  const [reels, setReels] = useState<FeedReel[]>([]);
  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const LIMIT = 12;

  // Overlay state
  const [overlayReels, setOverlayReels] = useState<OverlayReel[]>([]);
  const [overlayIndex, setOverlayIndex] = useState<number | null>(null);

  const fetchPage = useCallback(async (p: number, reset = false) => {
    if (p === 1) setIsLoading(true);
    else setLoadingMore(true);
    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      const res = await fetch(`${API_BASE}/api/feed?page=${p}&limit=${LIMIT}`, { headers });
      const data = await res.json();
      const incoming: FeedReel[] = data.reels ?? [];
      setReels(prev => reset ? incoming : [...prev, ...incoming.filter(r => !prev.some(x => x.id === r.id))]);
      setHasMore(incoming.length === LIMIT);
    } catch {} finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  }, [session]);

  const fetchStories = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      const res = await fetch(`${API_BASE}/api/explore`, { headers });
      const data = await res.json();
      setStoryUsers((data.users ?? []).slice(0, 20));
    } catch {}
  }, [session]);

  useEffect(() => {
    fetchPage(1, true);
    fetchStories();
  }, [fetchPage, fetchStories]);

  // Infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore) {
          const next = page + 1;
          setPage(next);
          fetchPage(next);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, page, fetchPage]);

  const handleLike = useCallback((id: number, liked: boolean) => {
    setReels(prev => prev.map(r => r.id === id ? { ...r, isLiked: liked, likes: liked ? r.likes + 1 : Math.max(0, r.likes - 1) } : r));
  }, []);

  const openFromPosts = useCallback((index: number) => {
    setOverlayReels(reels.map(r => ({ ...r, isLiked: r.isLiked ?? false })));
    setOverlayIndex(index);
  }, [reels]);

  const openFromReelsRow = useCallback((index: number) => {
    setOverlayReels(reels.map(r => ({ ...r, isLiked: r.isLiked ?? false })));
    setOverlayIndex(index);
  }, [reels]);

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
          <PlaySquare className="w-6 h-6 text-white" />
        </div>
        <Loader2 className="w-6 h-6 text-primary/50 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24" id="feed-page">
      {/* Overlay */}
      {overlayIndex !== null && (
        <ReelOverlay
          reels={overlayReels}
          startIndex={overlayIndex}
          onClose={() => setOverlayIndex(null)}
        />
      )}

      {/* ── Top Header ── */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-4 py-3">
        <span className="font-extrabold text-2xl text-gray-900 tracking-tight">
          Monkey<span className="text-primary">YT</span>
        </span>
        <div className="flex items-center gap-2">
          {!user && (
            <Link
              href="/login"
              className="px-4 py-1.5 rounded-full bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* ── Stories Row ── */}
      {storyUsers.length > 0 && (
        <div className="bg-white border-b border-gray-100 px-4 py-4">
          <div className="flex gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Your own story (add story) */}
            {profile && (
              <button
                onClick={() => setLocation(`/${profile.username}`)}
                className="flex flex-col items-center gap-1.5 shrink-0 group"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gray-200">
                    <UserAvatar
                      avatarUrl={profile.avatarUrl}
                      displayName={profile.displayName}
                      username={profile.username}
                      className="w-full h-full"
                      size={4}
                    />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary border-2 border-white flex items-center justify-center">
                    <span className="text-white text-[10px] font-black leading-none">+</span>
                  </div>
                </div>
                <span className="text-gray-700 text-[10px] font-semibold">Your Story</span>
              </button>
            )}

            {storyUsers.map(u => (
              <StoryAvatar key={u.id} user={u} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {reels.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6">
          <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
            <PlaySquare className="w-9 h-9 text-gray-300" />
          </div>
          <h2 className="text-gray-700 text-xl font-bold">No Reels Yet</h2>
          <p className="text-gray-400 text-sm max-w-xs">Follow some people to see their reels, or explore trending content.</p>
          <Link href="/explore" className="mt-2 px-6 py-2.5 rounded-full text-sm font-bold text-white bg-primary hover:opacity-90 transition-opacity active:scale-95">
            Explore
          </Link>
        </div>
      )}

      {reels.length > 0 && (
        <>
          {/* ── Reels Horizontal Strip ── */}
          <ReelsRow reels={reels} onOpen={openFromReelsRow} />

          {/* ── Posts Feed ── */}
          <div className="mt-0">
            {reels.map((reel, index) => (
              <PostCard
                key={reel.id}
                reel={reel}
                onPlay={() => openFromPosts(index)}
                onLike={handleLike}
              />
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-4" />
          {loadingMore && (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 text-primary/50 animate-spin" />
            </div>
          )}
          {!hasMore && reels.length > 0 && (
            <div className="text-center py-8 px-6">
              <p className="text-gray-300 text-sm font-medium">You're all caught up! 🎉</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
