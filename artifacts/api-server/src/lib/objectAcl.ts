// ACL helpers — placeholder for Supabase bucket-level policy checks
// For Supabase, access control is primarily handled via bucket RLS policies.
// These helpers are retained for extensibility.

const ACL_POLICY_METADATA_KEY = 'custom:aclPolicy';

// Can be flexibly defined according to the use case.
export enum ObjectAccessGroupType {}

export interface ObjectAccessGroup {
  type: ObjectAccessGroupType;
  id: string;
}

export enum ObjectPermission {
  READ = 'read',
  WRITE = 'write',
}

export interface ObjectAclRule {
  group: ObjectAccessGroup;
  permission: ObjectPermission;
}

// Stored as object custom metadata (not used with Supabase — bucket RLS handles this).
export interface ObjectAclPolicy {
  owner: string;
  visibility: 'public' | 'private';
  aclRules?: Array<ObjectAclRule>;
}

function isPermissionAllowed(
  requested: ObjectPermission,
  granted: ObjectPermission,
): boolean {
  if (requested === ObjectPermission.READ) {
    return [ObjectPermission.READ, ObjectPermission.WRITE].includes(granted);
  }
  return granted === ObjectPermission.WRITE;
}

abstract class BaseObjectAccessGroup implements ObjectAccessGroup {
  constructor(
    public readonly type: ObjectAccessGroupType,
    public readonly id: string,
  ) {}

  public abstract hasMember(userId: string): Promise<boolean>;
}

function createObjectAccessGroup(
  group: ObjectAccessGroup,
): BaseObjectAccessGroup {
  switch (group.type) {
    default:
      throw new Error(`Unknown access group type: ${group.type}`);
  }
}

// --- Stub implementations for Supabase (bucket RLS handles real auth) ---

export async function setObjectAclPolicy(
  _objectPath: string,
  _aclPolicy: ObjectAclPolicy,
): Promise<void> {
  // No-op: Use Supabase bucket policies for access control.
}

export async function getObjectAclPolicy(
  _objectPath: string,
): Promise<ObjectAclPolicy | null> {
  // No-op: Use Supabase bucket policies for access control.
  return null;
}

export async function canAccessObject({
  userId,
  objectPath,
  requestedPermission,
}: {
  userId?: string;
  objectPath: string;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  // Default: public bucket, allow all reads.
  return requestedPermission === ObjectPermission.READ;
}
