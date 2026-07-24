import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { createPortal } from 'react-dom';
import { ReelPlayer } from './ReelPlayer';

export interface OverlayReel {
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
  isLiked?: boolean;
}

interface ReelOverlayProps {
  reels: OverlayReel[];
  startIndex: number;
  onClose: () => void;
}

export function ReelOverlay({ reels, startIndex, onClose }: ReelOverlayProps) {
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [globalMuted, setGlobalMuted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to start index on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Use requestAnimationFrame to ensure layout is ready
    requestAnimationFrame(() => {
      el.scrollTop = startIndex * el.clientHeight;
    });
  }, [startIndex]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const itemHeight = e.currentTarget.clientHeight;
    const index = Math.round(scrollTop / itemHeight);
    if (index !== activeIndex) setActiveIndex(index);
  }, [activeIndex]);

  // Prevent body scroll when overlay is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const scrollTo = (dir: 'up' | 'down') => {
    const el = scrollRef.current;
    if (!el) return;
    const newIndex = dir === 'down' 
      ? Math.min(activeIndex + 1, reels.length - 1) 
      : Math.max(activeIndex - 1, 0);
    el.scrollTo({ top: newIndex * el.clientHeight, behavior: 'smooth' });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center animate-in fade-in duration-200"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main reel container */}
      <div className="relative w-full max-w-sm h-full flex flex-col items-center justify-center z-10 mx-auto">

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-4">
          {/* Reel counter */}
          <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs font-bold">
            {activeIndex + 1} / {reels.length}
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 hover:scale-110 active:scale-95 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav arrows (desktop) */}
        {activeIndex > 0 && (
          <button
            onClick={() => scrollTo('up')}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-20 hidden md:flex w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 items-center justify-center text-white hover:bg-white/20 transition-all"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        )}
        {activeIndex < reels.length - 1 && (
          <button
            onClick={() => scrollTo('down')}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 hidden md:flex w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 items-center justify-center text-white hover:bg-white/20 transition-all"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}

        {/* Progress dots */}
        {reels.length > 1 && reels.length <= 20 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1">
            {reels.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === activeIndex ? 'w-1.5 h-4 bg-white' : 'w-1.5 h-1.5 bg-white/30'
                }`}
              />
            ))}
          </div>
        )}

        {/* Scrollable reel feed */}
        <div
          ref={scrollRef}
          className="w-full h-screen overflow-y-scroll snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={handleScroll}
          onClick={e => e.stopPropagation()}
        >
          {reels.map((reel, index) => (
            <div key={reel.id} className="h-screen snap-start snap-always">
              <ReelPlayer
                reel={reel}
                globalMuted={globalMuted}
                setGlobalMuted={setGlobalMuted}
                shouldMount={Math.abs(index - activeIndex) <= 1}
                isActive={index === activeIndex}
              />
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
