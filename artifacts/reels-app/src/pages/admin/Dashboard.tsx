import { useGetReelsStats, useListReels, useDeleteReel, useUpdateReel } from '@workspace/api-client-react';
import { format } from 'date-fns';
import { Loader2, Trash2, Edit2, PlaySquare, Eye, Heart, BarChart3, Video, FileText, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Link } from 'wouter';

export function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetReelsStats();
  const { data: reelsData, isLoading: reelsLoading, refetch } = useListReels({ limit: 50, status: 'all' });
  const deleteReel = useDeleteReel();
  const updateReel = useUpdateReel();
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this reel?')) return;
    try {
      setIsDeleting(id);
      await deleteReel.mutateAsync({ id });
      toast.success('Reel deleted successfully');
      refetch();
    } catch (e) {
      toast.error('Failed to delete reel');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'published' ? 'draft' : 'published';
      await updateReel.mutateAsync({ id, data: { status: newStatus as any } });
      toast.success(`Reel marked as ${newStatus}`);
      refetch();
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  if (statsLoading || reelsLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Overview of your reels platform performance.</p>
        </div>
        <Link href="/admin/upload" className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 rounded-md font-semibold transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,255,0.3)]">
          <Video className="w-4 h-4" />
          New Reel
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
        <StatCard icon={Video} label="Total Reels" value={stats?.totalReels ?? 0} />
        <StatCard icon={Eye} label="Total Views" value={stats?.totalViews ?? 0} />
        <StatCard icon={Heart} label="Total Likes" value={stats?.totalLikes ?? 0} />
        <StatCard icon={CheckCircle2} label="Published" value={stats?.publishedCount ?? 0} />
      </div>

      {/* Reels Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
        <div className="p-5 border-b border-border flex items-center gap-2 bg-muted/20">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Content Library</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-mono tracking-wider">
              <tr>
                <th className="px-6 py-4 rounded-tl-xl">Reel</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Views</th>
                <th className="px-6 py-4 text-right">Likes</th>
                <th className="px-6 py-4 text-right">Date</th>
                <th className="px-6 py-4 rounded-tr-xl text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(reelsData?.reels?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Video className="w-8 h-8 opacity-20" />
                      <p>No reels uploaded yet</p>
                    </div>
                  </td>
                </tr>
              )}
              {reelsData?.reels?.map((reel: any) => (
                <tr key={reel.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-6 py-4 font-medium flex items-center gap-3">
                    <div className="w-12 h-16 bg-muted rounded overflow-hidden shrink-0 border border-border relative">
                      {reel.thumbnailPath ? (
                        <img src={`/api/storage${reel.thumbnailPath}`} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-black to-zinc-800 flex items-center justify-center">
                          <PlaySquare className="w-4 h-4 text-white/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col max-w-[200px] md:max-w-[300px]">
                      <span className="truncate" title={reel.title}>{reel.title}</span>
                      <span className="text-xs text-muted-foreground truncate">{reel.description || 'No description'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => handleToggleStatus(reel.id, reel.status)}
                      className={`px-2.5 py-1 text-xs font-mono rounded-full border transition-colors ${
                        reel.status === 'published' 
                          ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20' 
                          : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {reel.status}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right font-mono">{reel.views.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-mono">{reel.likes.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-muted-foreground whitespace-nowrap">
                    {format(new Date(reel.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleDelete(reel.id)}
                        disabled={isDeleting === reel.id}
                        className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors disabled:opacity-50"
                        title="Delete Reel"
                      >
                        {isDeleting === reel.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any, label: string, value: number }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
      <div className="flex items-center gap-3 relative">
        <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-muted-foreground font-medium text-sm">{label}</span>
      </div>
      <div className="text-3xl font-bold font-mono relative">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
