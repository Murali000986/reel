import { useState } from 'react';
import { useRequestUploadUrl, useCreateReel } from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon, Film, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from 'wouter';

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  
  const requestUrl = useRequestUploadUrl();
  const createReel = useCreateReel();
  const [, setLocation] = useLocation();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Helper for tracking upload progress
  const uploadWithProgress = (url: string, uploadFile: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          // Only update progress for the main video file
          if (uploadFile === file) {
            setProgress(pct);
          }
        }
      });
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed: ${xhr.statusText}`));
      });
      xhr.addEventListener('error', () => reject(new Error('Network error')));
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', uploadFile.type);
      xhr.send(uploadFile);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) {
      toast.error('Please provide a title and video file');
      return;
    }
    
    try {
      setIsUploading(true);
      setProgress(0);
      
      // 1. Get Video presigned URL
      const videoRes = await requestUrl.mutateAsync({
        data: {
          name: file.name,
          size: file.size,
          contentType: file.type
        }
      });
      
      // 2. Upload Video to GCS
      await uploadWithProgress(videoRes.uploadURL, file);

      // 3. Handle thumbnail (optional)
      let thumbnailPath = undefined;
      if (thumbnail) {
        const thumbRes = await requestUrl.mutateAsync({
          data: {
             name: thumbnail.name,
             size: thumbnail.size,
             contentType: thumbnail.type
          }
        });
        await uploadWithProgress(thumbRes.uploadURL, thumbnail);
        thumbnailPath = thumbRes.objectPath;
      }

      // 4. Save to database
      await createReel.mutateAsync({
        data: {
          title,
          description: description || undefined,
          videoPath: videoRes.objectPath,
          thumbnailPath,
          status
        }
      });
      
      toast.success('Reel uploaded successfully!');
      setLocation('/');
    } catch (err) {
      console.error(err);
      toast.error('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setThumbnail(e.target.files[0]);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upload Reel</h1>
          <p className="text-muted-foreground mt-1 text-sm">Add new content to your platform.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-lg p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Col: Media Uploads */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Video File *</label>
                <div className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors ${file ? 'border-primary bg-primary/5' : 'border-border bg-muted/20 hover:bg-muted/40 hover:border-muted-foreground'}`}>
                  <input 
                    type="file" 
                    accept="video/*" 
                    onChange={handleVideoChange} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                    required
                  />
                  {file ? (
                    <>
                      <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-3">
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                      </div>
                      <p className="font-medium text-primary line-clamp-1 px-4">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{(file.size / (1024*1024)).toFixed(2)} MB</p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="font-medium">Click or drag video here</p>
                      <p className="text-xs text-muted-foreground mt-1">MP4, WebM up to 100MB</p>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Thumbnail (Optional)</label>
                <div className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors ${thumbnail ? 'border-primary bg-primary/5' : 'border-border bg-muted/20 hover:bg-muted/40 hover:border-muted-foreground'}`}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleThumbnailChange} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  {thumbnail ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-primary mb-2" />
                      <p className="font-medium text-sm text-primary line-clamp-1">{thumbnail.name}</p>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-muted-foreground mb-2" />
                      <p className="font-medium text-sm">Upload custom thumbnail</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Col: Metadata */}
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground"
                  placeholder="Catchy video title..."
                  required
                  disabled={isUploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground resize-y"
                  placeholder="Add context, hashtags, mentions..."
                  disabled={isUploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-3 text-foreground">Publish Status</label>
                <div className="flex gap-4">
                  <label className={`flex-1 flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${status === 'published' ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-muted/50'}`}>
                    <input 
                      type="radio" 
                      name="status" 
                      value="published" 
                      checked={status === 'published'} 
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="sr-only"
                      disabled={isUploading}
                    />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${status === 'published' ? 'border-primary' : 'border-muted-foreground'}`}>
                      {status === 'published' && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className="font-medium text-sm">Published</span>
                  </label>
                  
                  <label className={`flex-1 flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${status === 'draft' ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-muted/50'}`}>
                    <input 
                      type="radio" 
                      name="status" 
                      value="draft" 
                      checked={status === 'draft'} 
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="sr-only"
                      disabled={isUploading}
                    />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${status === 'draft' ? 'border-primary' : 'border-muted-foreground'}`}>
                      {status === 'draft' && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className="font-medium text-sm">Draft</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-6 border-t border-border flex flex-col gap-4">
            {isUploading && (
              <div className="w-full">
                <div className="flex justify-between text-sm mb-1 font-mono">
                  <span className="text-primary">Uploading...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-300 ease-out" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <Link href="/admin" className={`px-6 py-2.5 border border-border hover:bg-muted rounded-lg font-medium transition-colors ${isUploading ? 'pointer-events-none opacity-50' : ''}`}>
                Cancel
              </Link>
              <button 
                type="submit" 
                disabled={isUploading || !file || !title}
                className="px-8 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,255,0.3)]"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing
                  </>
                ) : (
                  <>
                    <Film className="w-5 h-5" />
                    Upload Reel
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
