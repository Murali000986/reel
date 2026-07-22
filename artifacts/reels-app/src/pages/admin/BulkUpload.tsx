import { useState, useCallback, useRef } from 'react';
import { useRequestUploadUrl, useCreateReel } from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import {
  Upload, Film, X, CheckCircle2, AlertCircle,
  Loader2, ArrowLeft, CloudUpload, Plus,
} from 'lucide-react';

type FileStatus = 'pending' | 'uploading' | 'done' | 'error';

interface BulkFile {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  errorMsg?: string;
  customTitle?: string;
}

function fileId(f: File) {
  return `${f.name}-${f.size}-${f.lastModified}`;
}

function cleanTitle(filename: string) {
  return filename
    .replace(/\.[^.]+$/, '')       // strip extension
    .replace(/[-_]/g, ' ')         // dashes/underscores → spaces
    .replace(/\b\w/g, c => c.toUpperCase()); // Title Case
}

export function BulkUploadPage() {
  const [files, setFiles] = useState<BulkFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requestUrl = useRequestUploadUrl();
  const createReel = useCreateReel();

  // ─── Add files ───────────────────────────────────────────────────────────
  const addFiles = useCallback((incoming: FileList | File[]) => {
    const videoFiles = Array.from(incoming).filter(f => f.type.startsWith('video/'));
    if (!videoFiles.length) {
      toast.error('Please select video files only.');
      return;
    }
    setFiles(prev => {
      const existingIds = new Set(prev.map(f => f.id));
      const newEntries: BulkFile[] = videoFiles
        .filter(f => !existingIds.has(fileId(f)))
        .map(f => ({
          id: fileId(f),
          file: f,
          status: 'pending',
          progress: 0,
          customTitle: cleanTitle(f.name),
        }));
      return [...prev, ...newEntries];
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const updateTitle = useCallback((id: string, title: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, customTitle: title } : f));
  }, []);

  // ─── Drag & Drop ──────────────────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  // ─── Upload one file ─────────────────────────────────────────────────────
  const uploadOne = async (entry: BulkFile): Promise<void> => {
    setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: 'uploading', progress: 0 } : f));
    try {
      // 1. Get signed upload URL
      const { uploadURL, objectPath } = await requestUrl.mutateAsync({
        data: {
          name: entry.file.name,
          size: entry.file.size,
          contentType: entry.file.type,
        },
      });

      // 2. Upload with XHR for progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, progress: pct } : f));
          }
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed (${xhr.status})`));
        });
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.open('PUT', uploadURL);
        xhr.setRequestHeader('Content-Type', entry.file.type);
        xhr.send(entry.file);
      });

      // 3. Create DB record — title defaults to cleaned filename on server if empty
      await createReel.mutateAsync({
        data: {
          title: entry.customTitle?.trim() || cleanTitle(entry.file.name),
          videoPath: objectPath,
          status: 'published',
        },
      });

      setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: 'done', progress: 100 } : f));
    } catch (err: any) {
      setFiles(prev => prev.map(f =>
        f.id === entry.id ? { ...f, status: 'error', errorMsg: err.message ?? 'Failed' } : f
      ));
    }
  };

  // ─── Upload all ───────────────────────────────────────────────────────────
  const handleUploadAll = async () => {
    const pending = files.filter(f => f.status === 'pending' || f.status === 'error');
    if (!pending.length) {
      toast.info('No pending files to upload.');
      return;
    }
    setIsUploading(true);
    // Upload 2 at a time (concurrency = 2)
    const concurrency = 2;
    let i = 0;
    const run = async () => {
      while (i < pending.length) {
        const batch = pending.slice(i, i + concurrency);
        i += concurrency;
        await Promise.all(batch.map(uploadOne));
      }
    };
    await run();
    setIsUploading(false);
    const failed = files.filter(f => f.status === 'error').length;
    const done = files.filter(f => f.status === 'done').length;
    if (failed === 0) {
      toast.success(`${done} reel${done > 1 ? 's' : ''} uploaded successfully!`);
      setTimeout(() => setLocation('/'), 1200);
    } else {
      toast.warning(`${done} uploaded, ${failed} failed. Retry the failed ones.`);
    }
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const doneCount = files.filter(f => f.status === 'done').length;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <a
          href="/"
          onClick={e => { e.preventDefault(); setLocation('/'); }}
          className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bulk Upload</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Drop multiple videos at once — titles are auto-generated from filenames.</p>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 transition-all duration-200 cursor-pointer mb-6 ${
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary/50 hover:bg-white/2'
        }`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={e => e.target.files && addFiles(e.target.files)}
        />
        <div className={`p-5 rounded-2xl transition-colors ${isDragging ? 'bg-primary/20' : 'bg-muted/50'}`}>
          <CloudUpload className={`w-10 h-10 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold">{isDragging ? 'Drop videos here!' : 'Drag & drop videos here'}</p>
          <p className="text-muted-foreground text-sm mt-1">or click to browse — MP4, MOV, WebM supported</p>
        </div>
        <button
          type="button"
          className="px-5 py-2 bg-primary/10 border border-primary/30 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Select Videos
        </button>
      </div>

      {/* File Queue */}
      {files.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
          {/* Table header */}
          <div className="grid grid-cols-[auto_1fr_140px_80px] gap-3 px-4 py-3 bg-muted/30 border-b border-border text-xs text-muted-foreground font-mono uppercase tracking-wider">
            <span className="w-8" />
            <span>File / Title</span>
            <span>Status</span>
            <span className="text-right">Action</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
            {files.map(entry => (
              <div key={entry.id} className="grid grid-cols-[auto_1fr_140px_80px] gap-3 items-center px-4 py-3">
                {/* Icon */}
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Film className="w-4 h-4 text-muted-foreground" />
                </div>

                {/* Title / filename */}
                <div className="flex flex-col gap-1 min-w-0">
                  <input
                    type="text"
                    value={entry.customTitle ?? ''}
                    onChange={e => updateTitle(entry.id, e.target.value)}
                    placeholder={cleanTitle(entry.file.name)}
                    disabled={entry.status === 'uploading' || entry.status === 'done'}
                    className="bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground border-0 border-b border-transparent focus:border-primary/50 focus:outline-none transition-colors disabled:opacity-60 truncate"
                  />
                  <span className="text-xs text-muted-foreground truncate font-mono">
                    {entry.file.name} · {(entry.file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  {/* Progress bar */}
                  {entry.status === 'uploading' && (
                    <div className="h-1 rounded-full bg-muted overflow-hidden mt-1">
                      <div
                        className="h-full bg-primary transition-all duration-200 ease-linear"
                        style={{ width: `${entry.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Status badge */}
                <div className="text-xs font-mono">
                  {entry.status === 'pending' && (
                    <span className="px-2 py-1 rounded-full border border-border text-muted-foreground">Pending</span>
                  )}
                  {entry.status === 'uploading' && (
                    <span className="px-2 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary flex items-center gap-1 w-fit">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {entry.progress}%
                    </span>
                  )}
                  {entry.status === 'done' && (
                    <span className="px-2 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 flex items-center gap-1 w-fit">
                      <CheckCircle2 className="w-3 h-3" />
                      Done
                    </span>
                  )}
                  {entry.status === 'error' && (
                    <span className="px-2 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 flex items-center gap-1 w-fit" title={entry.errorMsg}>
                      <AlertCircle className="w-3 h-3" />
                      Error
                    </span>
                  )}
                </div>

                {/* Remove button */}
                <div className="flex justify-end">
                  {entry.status !== 'uploading' && (
                    <button
                      onClick={() => removeFile(entry.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      {files.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground font-mono">
            {pendingCount > 0 && <span>{pendingCount} pending </span>}
            {doneCount > 0 && <span className="text-green-400">{doneCount} done </span>}
            {errorCount > 0 && <span className="text-red-400">{errorCount} failed</span>}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setFiles([])}
              disabled={isUploading}
              className="px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors text-sm font-medium disabled:opacity-40"
            >
              Clear All
            </button>
            <button
              onClick={handleUploadAll}
              disabled={isUploading || (pendingCount === 0 && errorCount === 0)}
              className="px-6 py-2.5 bg-primary text-black font-semibold rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-[0_0_20px_rgba(0,255,255,0.3)]"
            >
              {isUploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
              ) : (
                <><Upload className="w-4 h-4" /> Upload {pendingCount + errorCount} Reels</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
