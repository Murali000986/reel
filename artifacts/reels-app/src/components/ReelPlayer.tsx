import { useRef, useEffect, useState, useCallback } from 'react';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { Reel } from '@workspace/api-client-react/api.schemas';
import { Heart, Share2, Play, Pause, Volume2, VolumeX, Eye } from 'lucide-react';
import { useToggleReelLike, useIncrementReelView } from '@workspace/api-client-react';

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export function ReelPlayer({
  reel,
  globalMuted,
  setGlobalMuted
}: {
  reel: Reel;
  globalMuted: boolean;
  setGlobalMuted: (m: boolean) => void;
}) {
  const [containerRef, isIntersecting] = useIntersectionObserver({ threshold: 0.7 });
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [optimisticLikes, setOptimisticLikes] = useState(reel.likes);
  const [hasViewed, setHasViewed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Double-tap to like state
  const [showHeart, setShowHeart] = useState(false);
  const [showPlayPause, setShowPlayPause] = useState(false);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<number>(0);

  const toggleLike = useToggleReelLike();
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

  // Tap to play/pause — with double-tap detection for like
  const handleContainerClick = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_MS = 280;

    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      // Double tap — like
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (!hasLiked) {
        setHasLiked(true);
        setOptimisticLikes(p => p + 1);
        toggleLike.mutate({ id: reel.id });
      }
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 900);
    } else {
      // Single tap — play/pause with slight delay to allow double tap detection
      tapTimerRef.current = setTimeout(() => {
        const v = videoRef.current;
        if (!v) return;
        if (isPlaying) {
          v.pause();
          setIsPlaying(false);
        } else {
          v.play().then(() => setIsPlaying(true)).catch(() => {});
        }
        setShowPlayPause(true);
        setTimeout(() => setShowPlayPause(false), 600);
      }, DOUBLE_TAP_MS);
    }
    lastTapRef.current = now;
  }, [isPlaying, hasLiked, reel.id, toggleLike]);

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newLiked = !hasLiked;
    setHasLiked(newLiked);
    setOptimisticLikes(p => newLiked ? p + 1 : p - 1);
    toggleLike.mutate({ id: reel.id });
  }, [hasLiked, reel.id, toggleLike]);

  // Sync mute state if changed externally (e.g., from scrolling to another video)
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = globalMuted;
    }
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

  // Seek on progress bar click
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const v = videoRef.current;
    if (v && v.duration) {
      v.currentTime = pct * v.duration;
    }
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
      {/* ─── 9:16 Video Container ─── */}
      <div className="relative h-full w-full max-w-[calc(100dvh*9/16)] mx-auto flex items-center justify-center">
        <video
          ref={videoRef}
          src={videoSrc}
          className="h-full w-full object-cover"
          loop
          playsInline
          muted={globalMuted}
          preload="metadata"
          poster={thumbSrc}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent via-40% to-black/90 pointer-events-none" />
        {/* Top gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent h-32 pointer-events-none" />

        {/* ─── Double-tap Heart ─── */}
        {showHeart && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <Heart
              className="w-28 h-28 text-red-500 fill-red-500 animate-in zoom-in duration-200"
              style={{ filter: 'drop-shadow(0 0 30px rgba(239,68,68,0.8))' }}
            />
          </div>
        )}

        {/* ─── Tap Play/Pause Flash ─── */}
        {showPlayPause && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="bg-black/50 backdrop-blur-sm p-5 rounded-full animate-in zoom-in duration-150">
              {isPlaying
                ? <Play className="w-10 h-10 text-white fill-white" />
                : <Pause className="w-10 h-10 text-white fill-white" />
              }
            </div>
          </div>
        )}

        {/* ─── Paused Big Play button ─── */}
        {!isPlaying && !showPlayPause && isIntersecting && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-in fade-in duration-300">
            <div className="bg-black/40 backdrop-blur-md p-6 rounded-full">
              <Play className="w-12 h-12 text-white fill-white ml-1" />
            </div>
          </div>
        )}

        {/* ─── Top Bar: Mute ─── */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={handleMute}
            className="p-2.5 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors"
          >
            {globalMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        {/* ─── Bottom Info ─── */}
        <div className="absolute bottom-14 left-0 right-16 px-4 pb-2 z-10 pointer-events-none">
          <h2 className="text-white text-lg font-bold tracking-tight drop-shadow-lg leading-snug">
            {reel.title}
          </h2>
          {reel.description && (
            <p className="text-white/75 text-sm mt-1 line-clamp-2 font-light leading-relaxed">
              {reel.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-white/60 text-xs font-mono">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> {formatCount(reel.views)}
            </span>
            {duration > 0 && (
              <span>{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>
            )}
          </div>
        </div>

        {/* ─── Right Action Bar ─── */}
        <div className="absolute bottom-16 right-3 flex flex-col gap-5 items-center z-20" onClick={e => e.stopPropagation()}>
          {/* Like */}
          <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
            <div className={`p-3 rounded-full backdrop-blur-md transition-all duration-300 ${hasLiked ? 'bg-red-500/20' : 'bg-black/40 group-hover:bg-black/60'}`}>
              <Heart
                className={`w-6 h-6 transition-all duration-300 ${hasLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-white'}`}
              />
            </div>
            <span className="text-xs font-semibold text-white drop-shadow">{formatCount(optimisticLikes)}</span>
          </button>

          {/* Share */}
          <button onClick={handleShare} className="flex flex-col items-center gap-1 group">
            <div className="p-3 rounded-full bg-black/40 backdrop-blur-md group-hover:bg-black/60 transition-all duration-300">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-semibold text-white drop-shadow">Share</span>
          </button>
        </div>

        {/* ─── Progress Bar ─── */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 cursor-pointer z-20 group"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-primary transition-all duration-100 ease-linear relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
          </div>
        </div>
      </div>

      {/* Side blurred bg fill for widescreen */}
      <div
        className="absolute inset-0 -z-10 scale-110 blur-2xl opacity-40"
        style={{ backgroundImage: thumbSrc ? `url(${thumbSrc})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
    </div>
  );
}
