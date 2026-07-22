import { useState, useEffect } from 'react';
import { useListReels } from '@workspace/api-client-react';
import { ReelPlayer } from '@/components/ReelPlayer';
import { Reel } from '@workspace/api-client-react/api.schemas';
import { Loader2, PlaySquare, Settings } from 'lucide-react';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { Link } from 'wouter';

function BottomTrigger({ onVisible }: { onVisible: () => void }) {
  const [ref, isIntersecting] = useIntersectionObserver({ threshold: 0.1 });
  useEffect(() => {
    if (isIntersecting) onVisible();
  }, [isIntersecting, onVisible]);
  return <div ref={ref} className="h-16 shrink-0" />;
}

export function FeedPage() {
  const [page, setPage] = useState(1);
  const [allReels, setAllReels] = useState<Reel[]>([]);
  const [globalMuted, setGlobalMuted] = useState(true);
  const { data, isLoading } = useListReels({ page, limit: 10, status: 'published' });

  useEffect(() => {
    if (data?.reels) {
      setAllReels(prev => {
        const newReels = data.reels.filter(r => !prev.some(p => p.id === r.id));
        return [...prev, ...newReels];
      });
    }
  }, [data]);

  const hasMore = data ? (page * data.limit) < data.total : false;

  if (isLoading && allReels.length === 0) {
    return (
      <div className="h-[100dvh] w-full bg-black flex flex-col items-center justify-center gap-4">
        <PlaySquare className="w-14 h-14 text-primary animate-pulse" />
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
      </div>
    );
  }

  if (!isLoading && allReels.length === 0) {
    return (
      <div className="h-[100dvh] w-full bg-black flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <PlaySquare className="w-9 h-9 text-white/30" />
        </div>
        <h2 className="text-white text-xl font-semibold">No Reels Yet</h2>
        <p className="text-white/40 text-sm max-w-xs">Upload your first reel from the admin panel to get started.</p>
        <Link
          href="/admin/upload"
          className="mt-2 px-6 py-2.5 bg-primary text-black font-semibold rounded-full text-sm hover:bg-primary/90 transition-colors"
        >
          Upload Reel
        </Link>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full bg-black">
      {/* Fixed top bar */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pt-4 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center shadow-[0_0_15px_rgba(0,255,255,0.5)]">
            <PlaySquare className="w-4 h-4 text-black fill-black" />
          </div>
          <span className="text-white font-bold text-base tracking-tight drop-shadow-lg">Reels</span>
        </div>
        <Link href="/admin" className="pointer-events-auto p-2 bg-black/30 backdrop-blur-md rounded-full text-white/70 hover:text-white transition-colors">
          <Settings className="w-4 h-4" />
        </Link>
      </div>

      {/* Scrollable reel stack */}
      <div className="h-full w-full snap-y snap-mandatory overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth">
        {allReels.map((reel) => (
          <ReelPlayer
            key={reel.id}
            reel={reel}
            globalMuted={globalMuted}
            setGlobalMuted={setGlobalMuted}
          />
        ))}

        {/* Infinite scroll trigger */}
        {hasMore && (
          <BottomTrigger onVisible={() => setPage(p => p + 1)} />
        )}

        {/* End of feed */}
        {!hasMore && allReels.length > 0 && (
          <div className="h-[100dvh] snap-start flex flex-col items-center justify-center bg-black gap-4 text-center px-6">
            <PlaySquare className="w-12 h-12 text-white/20" />
            <p className="text-white/40 text-sm">You've seen all the reels!</p>
          </div>
        )}
      </div>
    </div>
  );
}
