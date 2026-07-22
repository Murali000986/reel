import { randomUUID } from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  canAccessObject,
  getObjectAclPolicy,
  ObjectAclPolicy,
  ObjectPermission,
  setObjectAclPolicy,
} from './objectAcl';

// ---------------------------------------------------------------------------
// Supabase Storage client
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL must be set in environment variables.');
}
if (!supabaseServiceRoleKey && !supabaseAnonKey) {
  throw new Error(
    'Either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY must be set in environment variables.',
  );
}

// Use service role key for backend (can create signed URLs and bypass RLS).
// Fall back to anon key if service role key is not set.
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceRoleKey ?? supabaseAnonKey!,
);

export class ObjectNotFoundError extends Error {
  constructor() {
    super('Object not found');
    this.name = 'ObjectNotFoundError';
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  private getBucket(): string {
    const bucket = process.env.SUPABASE_BUCKET;
    if (!bucket) {
      throw new Error(
        'SUPABASE_BUCKET must be set in environment variables. ' +
          'Create a bucket in your Supabase project and set SUPABASE_BUCKET env var.',
      );
    }
    return bucket;
  }

  /**
   * Generate a signed upload URL for a new file in Supabase Storage.
   * Returns the signedUrl (for PUT upload) and the object path.
   */
  async getObjectEntityUploadURL(): Promise<{ signedUrl: string; path: string }> {
    const bucket = this.getBucket();
    const objectId = randomUUID();
    const objectPath = `uploads/${objectId}`;

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(objectPath);

    if (error || !data) {
      throw new Error(`Failed to create signed upload URL: ${error?.message}`);
    }

    return { signedUrl: data.signedUrl, path: objectPath };
  }

  /**
   * Return the public CDN URL for a given object path in Supabase.
   * This avoids proxying video bytes through the API server.
   */
  getPublicUrl(objectPath: string): string {
    const bucket = this.getBucket();
    const { data } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(objectPath);
    return data.publicUrl;
  }

  /**
   * Check if an object exists in Supabase Storage.
   */
  async objectExists(objectPath: string): Promise<boolean> {
    const bucket = this.getBucket();
    // List with prefix to check existence
    const dir = objectPath.includes('/')
      ? objectPath.substring(0, objectPath.lastIndexOf('/'))
      : '';
    const filename = objectPath.includes('/')
      ? objectPath.substring(objectPath.lastIndexOf('/') + 1)
      : objectPath;

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(dir, { search: filename, limit: 1 });

    if (error) return false;
    return (data ?? []).some((f) => f.name === filename);
  }

  /**
   * Download a file from Supabase Storage and return a Response object.
   */
  async downloadObject(objectPath: string, cacheTtlSec: number = 3600): Promise<Response> {
    const bucket = this.getBucket();

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .download(objectPath);

    if (error || !data) {
      throw new ObjectNotFoundError();
    }

    const arrayBuffer = await data.arrayBuffer();

    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': data.type || 'application/octet-stream',
        'Cache-Control': `public, max-age=${cacheTtlSec}`,
        'Content-Length': String(arrayBuffer.byteLength),
      },
    });
  }

  /**
   * Normalize a raw object path coming from the upload flow.
   * - If it's already a simple relative path like "uploads/uuid", return "/objects/uploads/uuid".
   * - If it's a full Supabase URL, extract the path portion.
   */
  normalizeObjectEntityPath(rawPath: string): string {
    // If it's a full https URL (Supabase CDN or signed URL), extract the path
    if (rawPath.startsWith('https://')) {
      try {
        const url = new URL(rawPath);
        // Supabase paths: /storage/v1/object/upload/sign/<bucket>/<path>
        const match = url.pathname.match(/\/storage\/v1\/object\/(?:upload\/sign|public)\/[^/]+\/(.+)/);
        if (match) {
          return `/objects/${match[1]}`;
        }
      } catch {
        // fall through
      }
      return rawPath;
    }
    // Already a relative path — normalize to /objects/...
    const clean = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
    return `/objects/${clean}`;
  }

  /**
   * Extract the Supabase storage path from a normalized entity path like /objects/uploads/uuid.
   */
  private extractStoragePath(objectPath: string): string {
    if (!objectPath.startsWith('/objects/')) {
      throw new ObjectNotFoundError();
    }
    return objectPath.slice('/objects/'.length);
  }

  async getObjectEntityFile(objectPath: string): Promise<string> {
    if (!objectPath.startsWith('/objects/')) {
      throw new ObjectNotFoundError();
    }
    const storagePath = this.extractStoragePath(objectPath);
    const exists = await this.objectExists(storagePath);
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return storagePath;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    // ACL is handled by Supabase bucket policies (RLS), not per-file metadata.
    // Simply normalize and return the path.
    return this.normalizeObjectEntityPath(rawPath);
  }

  async canAccessObjectEntity({
    userId,
    objectPath,
    requestedPermission,
  }: {
    userId?: string;
    objectPath: string;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    // For a simple public bucket setup, everything is readable.
    // Expand this logic if you add RLS / private buckets.
    return true;
  }
}
