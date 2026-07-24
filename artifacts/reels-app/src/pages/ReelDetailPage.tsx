import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { ReelPlayer } from '@/components/ReelPlayer';
import { Loader2, ArrowLeft, PlaySquare } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function ReelDetailPage() {
  const params = useParams<{ id: string }>();
  const initialReelId = params.id ? Number(params.id) : undefined;
  const { session } = useAuth();
  const [, setLocation] = useLocation();

  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [globalMuted, setGlobalMuted] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const fetchFeed = useCallback(async () => {
    if (!initialReelId) return;
    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Fetch the specific reel details first
      const reelRes = await fetch(`${API_BASE}/api/reels/${initialReelId}`, { headers });
      if (!reelRes.ok) throw new Error('Reel not found');
      const clickedReel = await reelRes.json();

      // Fetch explore/trending reels to build the rest of the feed
      const exploreRes = await fetch(`${API_BASE}/api/explore`, { headers });
      let otherReels: any[] = [];
      if (exploreRes.ok) {
        const exploreData = await exploreRes.json();
        const exploreList = exploreData.reels ?? [];
        // Filter out the clicked reel from the explore list to avoid duplicates
        otherReels = exploreList.filter((r: any) => r.id !== clickedReel.id);
      }

      setReels([clickedReel, ...otherReels]);
    } catch (err: any) {
      setError(err.message || 'Error loading reels');
    } finally {
      setLoading(false);
    }
  }, [initialReelId, session]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const itemHeight = e.currentTarget.clientHeight;
    const index = Math.round(scrollTop / itemHeight);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  if (loading) {
    return (
      <div className="h-[100dvh] w-full bg-gray-50 flex flex-col items-center justify-center gap-4">
        <PlaySquare className="w-14 h-14 text-primary animate-pulse" />
        <Loader2 className="w-6 h-6 text-primary/40 animate-spin" />
      </div>
    );
  }

  if (error || reels.length === 0) {
    return (
      <div className="h-[100dvh] w-full bg-gray-50 flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-gray-500 text-sm">{error ?? 'No reels available'}</p>
        <button
          onClick={() => setLocation('/')}
          className="px-6 py-2.5 rounded-full text-sm font-bold text-white transition-opacity active:scale-95 bg-primary"
        >
          Go back home
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full bg-gray-50">
      {/* Back button overlay */}
      <button
        onClick={() => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            setLocation('/explore');
          }
        }}
        className="absolute top-4 left-4 z-50 p-2.5 rounded-full bg-black/40 border border-white/10 hover:bg-black/60 transition-colors text-white/80 active:scale-95"
        title="Back"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Snap-scrollable container for reels feed */}
      <div 
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory [scrollbar-width:none]"
        onScroll={handleScroll}
      >
        {reels.map((reel, index) => (
          <ReelPlayer
            key={reel.id}
            reel={reel}
            globalMuted={globalMuted}
            setGlobalMuted={setGlobalMuted}
            shouldMount={Math.abs(index - activeIndex) <= 1}
            isActive={index === activeIndex}
          />
        ))}
      </div>
    </div>
  );
}
