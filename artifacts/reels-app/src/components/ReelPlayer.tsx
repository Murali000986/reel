import { useRef, useEffect, useState, useCallback } from 'react';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { Heart, Share2, Play, Pause, Volume2, VolumeX, Eye, MessageCircle } from 'lucide-react';
import { useIncrementReelView } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/use-api';
import { useLocation } from 'wouter';
import { CommentDrawer } from './CommentDrawer';
import { UserAvatar } from './UserAvatar';

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

interface ReelUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface ReelData {
  id: number;
  title: string;
  description?: string | null;
  videoPath: string;
  thumbnailPath?: string | null;
  status: string;
  views: number;
  likes: number;
  duration?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  user?: ReelUser | null;
  isLiked?: boolean;
}

export function ReelPlayer({
  reel,
  globalMuted,
  setGlobalMuted,
  shouldMount = true,
  isActive = false,
}: {
  reel: ReelData;
  globalMuted: boolean;
  setGlobalMuted: (m: boolean) => void;
  shouldMount?: boolean;
  isActive?: boolean;
}) {
  const [containerRef, isIntersecting] = useIntersectionObserver({ threshold: 0.7 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();
  const { authFetch } = useApi();
  const [, setLocation] = useLocation();

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasLiked, setHasLiked] = useState(reel.isLiked ?? false);
  const [optimisticLikes, setOptimisticLikes] = useState(reel.likes);
  const [hasViewed, setHasViewed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  // Double-tap to like state
  const [showHeart, setShowHeart] = useState(false);
  const [showPlayPause, setShowPlayPause] = useState(false);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<number>(0);

  const incrementView = useIncrementReelView();

  // Auto-play / pause based on viewport visibility
  useEffect(() => {
    if (!videoRef.current) return;
    if (isIntersecting) {
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
      if (!hasViewed) {
        incrementView.mutate({ id: reel.id });
        setHasViewed(true);
      }
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      videoRef.current.currentTime = 0;
      setProgress(0);
    }
  }, [isIntersecting]); // eslint-disable-line react-hooks/exhaustive-deps

  // Progress bar update
  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  }, []);

  // Tap to play/pause — with double-tap for like
  const handleContainerClick = useCallback(() => {
    if (showComments) return;
    const now = Date.now();
    const DOUBLE_TAP_MS = 280;

    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (!hasLiked && user) {
        setHasLiked(true);
        setOptimisticLikes(p => p + 1);
        authFetch(`/api/reels/${reel.id}/like`, { method: 'POST' }).catch(() => {});
      }
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 900);
    } else {
      tapTimerRef.current = setTimeout(() => {
        const v = videoRef.current;
        if (!v) return;
        if (isPlaying) {
          v.pause(); setIsPlaying(false);
        } else {
          v.play().then(() => setIsPlaying(true)).catch(() => {});
        }
        setShowPlayPause(true);
        setTimeout(() => setShowPlayPause(false), 600);
      }, DOUBLE_TAP_MS);
    }
    lastTapRef.current = now;
  }, [isPlaying, hasLiked, reel.id, user, authFetch, showComments]);

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { setLocation('/login'); return; }
    const newLiked = !hasLiked;
    setHasLiked(newLiked);
    setOptimisticLikes(p => newLiked ? p + 1 : Math.max(0, p - 1));
    authFetch(`/api/reels/${reel.id}/like`, { method: 'POST' }).catch(() => {});
  }, [hasLiked, reel.id, user, authFetch, setLocation]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = globalMuted;
  }, [globalMuted]);

  const handleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setGlobalMuted(!globalMuted);
  }, [globalMuted, setGlobalMuted]);

  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({ title: reel.title, text: reel.description ?? '' }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
  }, [reel]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const v = videoRef.current;
    if (v && v.duration) v.currentTime = pct * v.duration;
  }, []);

  const apiUrl = import.meta.env.VITE_API_URL || '';
  const videoSrc = apiUrl + (reel.videoPath.startsWith('/api/') ? reel.videoPath : `/api/storage${reel.videoPath}`);
  const thumbSrc = reel.thumbnailPath
    ? apiUrl + (reel.thumbnailPath.startsWith('/api/') ? reel.thumbnailPath : `/api/storage${reel.thumbnailPath}`)
    : undefined;

  return (
    <div
      ref={containerRef}
      className="relative h-[100dvh] w-full snap-start snap-always bg-black flex items-center justify-center overflow-hidden"
      onClick={handleContainerClick}
    >
      {/* 9:16 Video Container */}
      <div className="relative h-full w-full max-w-[calc(100dvh*9/16)] mx-auto flex items-center justify-center bg-zinc-900">
        {shouldMount ? (
          <video
            ref={videoRef}
            src={videoSrc}
            className="h-full w-full object-cover animate-in fade-in duration-300"
            loop playsInline muted={globalMuted}
            preload={isActive ? 'auto' : 'metadata'}
            poster={thumbSrc}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        ) : (
          <img src={thumbSrc ?? ''} className="h-full w-full object-cover opacity-80" alt={reel.title} />
        )}

        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent via-40% to-black/90 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent h-32 pointer-events-none" />

        {showHeart && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <Heart className="w-28 h-28 text-primary fill-primary animate-in zoom-in duration-200"
              style={{ filter: 'drop-shadow(0 0 30px var(--color-primary))' }} />
          </div>
        )}

        {/* Play/Pause flash */}
        {showPlayPause && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="bg-black/50 backdrop-blur-sm p-5 rounded-full animate-in zoom-in duration-150">
              {isPlaying ? <Play className="w-10 h-10 text-white fill-white" /> : <Pause className="w-10 h-10 text-white fill-white" />}
            </div>
          </div>
        )}

        {/* Big play button */}
        {!isPlaying && !showPlayPause && isIntersecting && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-in fade-in duration-300">
            <div className="bg-black/40 backdrop-blur-md p-6 rounded-full">
              <Play className="w-12 h-12 text-white fill-white ml-1" />
            </div>
          </div>
        )}

        {/* Top: Mute */}
        <div className="absolute top-6 right-6 z-20">
          <button onClick={handleMute} className="p-3 bg-black/20 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-black/40 hover:scale-110 active:scale-95 transition-all duration-300 shadow-xl">
            {globalMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        {/* User info overlay (bottom-left) */}
        {reel.user && (
          <button
            onClick={(e) => { e.stopPropagation(); setLocation(`/${reel.user!.username}`); }}
            className="absolute bottom-20 left-4 z-20 flex items-center gap-2 pointer-events-auto"
          >
            <UserAvatar
              avatarUrl={reel.user.avatarUrl}
              displayName={reel.user.displayName}
              username={reel.user.username}
              className="w-8 h-8 border border-white/30"
              size={2}
            />
            <span className="text-white text-sm font-semibold drop-shadow">@{reel.user.username}</span>
          </button>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-14 left-0 right-16 px-4 pb-2 z-10 pointer-events-none">
          {!reel.user && <h2 className="text-white text-lg font-bold tracking-tight drop-shadow-lg leading-snug">{reel.title}</h2>}
          {reel.user && <h2 className="text-white/0 text-lg font-bold">{reel.title}</h2>}
          {reel.description && (
            <p className="text-white/75 text-sm mt-1 line-clamp-2 font-light leading-relaxed">{reel.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-white/60 text-xs font-mono">
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {formatCount(reel.views)}</span>
            {duration > 0 && <span>{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>}
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="absolute bottom-20 right-4 flex flex-col gap-6 items-center z-20" onClick={e => e.stopPropagation()}>
          {/* Like */}
          <button id={`like-reel-${reel.id}`} onClick={handleLike} className="flex flex-col items-center gap-1.5 group">
            <div className={`p-3.5 rounded-full backdrop-blur-xl border border-white/10 shadow-xl transition-all duration-300 group-hover:scale-110 group-active:scale-95 ${hasLiked ? 'bg-primary/20' : 'bg-black/20 group-hover:bg-black/40'}`}>
              <Heart className={`w-7 h-7 transition-all duration-300 ${hasLiked ? 'fill-primary text-primary scale-110 drop-shadow-[0_0_8px_rgba(230,0,35,0.5)]' : 'text-white'}`} />
            </div>
            <span className="text-xs font-bold tracking-wide text-white drop-shadow-md">{formatCount(optimisticLikes)}</span>
          </button>

          {/* Comments */}
          <button id={`comment-reel-${reel.id}`} onClick={(e) => { e.stopPropagation(); if (!user) { setLocation('/login'); return; } setShowComments(true); }} className="flex flex-col items-center gap-1.5 group">
            <div className="p-3.5 rounded-full bg-black/20 backdrop-blur-xl border border-white/10 shadow-xl group-hover:scale-110 group-active:scale-95 group-hover:bg-black/40 transition-all duration-300">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs font-bold tracking-wide text-white drop-shadow-md">{commentCount || '0'}</span>
          </button>

          {/* Share */}
          <button onClick={handleShare} className="flex flex-col items-center gap-1.5 group">
            <div className="p-3.5 rounded-full bg-black/20 backdrop-blur-xl border border-white/10 shadow-xl group-hover:scale-110 group-active:scale-95 group-hover:bg-black/40 transition-all duration-300">
              <Share2 className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs font-bold tracking-wide text-white drop-shadow-md">Share</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 cursor-pointer z-20 group" onClick={handleSeek}>
          <div className="h-full bg-primary transition-all duration-100 ease-linear relative" style={{ width: `${progress}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
          </div>
        </div>
      </div>

      {/* Side blurred bg */}
      <div className="absolute inset-0 -z-10 scale-110 blur-2xl opacity-40"
        style={{ backgroundImage: thumbSrc ? `url(${thumbSrc})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} />

      {/* Comment Drawer */}
      {showComments && (
        <CommentDrawer
          reelId={reel.id}
          onClose={() => setShowComments(false)}
          onCommentCountChange={setCommentCount}
        />
      )}
    </div>
  );
}
