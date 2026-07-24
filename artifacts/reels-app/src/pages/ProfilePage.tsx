import { useState, useEffect, memo } from 'react';
import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/use-api';
import { UserAvatar } from '@/components/UserAvatar';
import { Grid3x3, Play, Settings, ArrowLeft, Loader2, MessageCircle } from 'lucide-react';

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
  reels: {
    id: number;
    title: string;
    videoPath: string;
    thumbnailPath: string | null;
    views: number;
    likes: number;
  }[];
}

function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-gray-900 font-bold text-lg">
        {value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value}
      </span>
      <span className="text-gray-400 text-xs">{label}</span>
    </div>
  );
}

const API_BASE = import.meta.env.VITE_API_URL ?? '';

// Memoized pin tile for performance — no videos in grid!
const ReelPin = memo(function ReelPin({ reel, onPress }: {
  reel: UserProfile['reels'][number];
  onPress: () => void;
}) {
  const thumb = reel.thumbnailPath
    ? `${API_BASE}${reel.thumbnailPath.startsWith('/api/') ? reel.thumbnailPath : `/api/storage${reel.thumbnailPath}`}`
    : null;
    
  const vidUrl = reel.videoPath
    ? `${API_BASE}${reel.videoPath.startsWith('/api/') ? reel.videoPath : `/api/storage${reel.videoPath}`}`
    : null;

  return (
    <div
      className="relative aspect-[9/16] bg-gray-100 overflow-hidden rounded-2xl cursor-pointer group shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5"
      onClick={onPress}
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
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
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

export function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username?.replace('@', '') ?? '';
  const { profile: myProfile, session } = useAuth();
  const { authFetch } = useApi();
  const [, setLocation] = useLocation();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = myProfile?.username === username;

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    fetch(`${API_BASE}/api/users/${username}`, {
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
      .then(r => r.json())
      .then((data: UserProfile) => {
        setProfile(data);
        setFollowing(data.isFollowing ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username, session]);

  const handleFollow = async () => {
    if (!profile) return;
    setFollowLoading(true);
    try {
      if (following) {
        await authFetch(`/api/users/${profile.id}/follow`, { method: 'DELETE' });
        setFollowing(false);
        setProfile(p => p ? { ...p, followersCount: Math.max(0, p.followersCount - 1) } : p);
      } else {
        await authFetch(`/api/users/${profile.id}/follow`, { method: 'POST' });
        setFollowing(true);
        setProfile(p => p ? { ...p, followersCount: p.followersCount + 1 } : p);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-gray-400">User not found</p>
        <button onClick={() => setLocation('/')} className="text-primary text-sm font-semibold">Go home</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24" id="profile-page">
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <button onClick={() => setLocation('/')} className="text-gray-500 hover:text-gray-900 transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-gray-900 font-bold text-base flex-1">@{profile.username}</span>
        {isOwnProfile && (
          <button onClick={() => setLocation('/settings')} className="text-gray-500 hover:text-gray-900 p-1 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Profile Card */}
      <div className="bg-white px-5 pt-6 pb-5 mb-2">
        {/* Avatar + Stats Row */}
        <div className="flex items-center gap-6 mb-5">
          <div className="relative flex-shrink-0">
            <UserAvatar
              avatarUrl={profile.avatarUrl}
              displayName={profile.displayName}
              username={profile.username}
              className="w-24 h-24 ring-2 ring-primary/30 ring-offset-2"
              size={9}
            />
          </div>
          <div className="flex-1 flex justify-around">
            <StatBox value={profile.reels.length} label="Reels" />
            <StatBox value={profile.followersCount} label="Followers" />
            <StatBox value={profile.followingCount} label="Following" />
          </div>
        </div>

        {/* Name + Bio */}
        <div className="mb-5">
          <h1 className="text-gray-900 font-bold text-base">{profile.displayName}</h1>
          {profile.bio && <p className="text-gray-500 text-sm mt-1 leading-relaxed">{profile.bio}</p>}
        </div>

        {/* Action Buttons */}
        {isOwnProfile ? (
          <button
            id="edit-profile-btn"
            onClick={() => setLocation('/settings')}
            className="w-full py-2.5 rounded-xl text-gray-800 text-sm font-semibold transition-all duration-200 hover:bg-gray-100 active:scale-95 bg-gray-100 border border-gray-200"
          >
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              id="follow-btn"
              onClick={handleFollow}
              disabled={followLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 disabled:opacity-60"
              style={{
                background: following ? '#e9e9e9' : '#e60023',
                color: following ? '#333' : 'white',
              }}
            >
              {followLoading ? '...' : following ? 'Following' : 'Follow'}
            </button>
            <button
              id="message-profile-btn"
              onClick={async () => {
                const conv = await authFetch(`/api/messages/start/${profile.id}`, { method: 'POST' });
                setLocation(`/messages/${conv.id}`);
              }}
              className="flex-1 py-2.5 rounded-xl text-gray-700 text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 hover:bg-gray-100 active:scale-95 bg-gray-100 border border-gray-200"
            >
              <MessageCircle className="w-4 h-4" />
              Message
            </button>
          </div>
        )}
      </div>

      {/* Grid Tab */}
      <div className="bg-white flex items-center justify-center py-2 border-b border-gray-200 mb-1">
        <div className="flex items-center gap-2 text-primary border-b-2 border-primary pb-2 px-4">
          <Grid3x3 className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wide">REELS</span>
        </div>
      </div>

      {/* Reels Grid */}
      {profile.reels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
          <Play className="w-12 h-12 text-gray-300" />
          <p className="text-gray-400 text-sm">No reels yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 p-3">
          {profile.reels.map(reel => (
            <ReelPin
              key={reel.id}
              reel={reel}
              onPress={() => setLocation(`/reels/${reel.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
