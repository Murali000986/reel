import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable, followsTable, reelsTable } from "@workspace/db";
import { requireAuth, optionalAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

// GET /api/users/me — get own profile (create if first time via Google OAuth)
router.get("/users/me", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  let [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  if (!user) {
    // Auto-create profile on first login (Google OAuth)
    const email = req.userEmail ?? "";
    const baseUsername = email.split("@")[0].replace(/[^a-z0-9_]/gi, "").toLowerCase() || `user_${userId.slice(0, 8)}`;
    let username = baseUsername;

    // Ensure username unique
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.username, username));
    if (existing) username = `${baseUsername}_${Date.now().toString().slice(-4)}`;

    [user] = await db.insert(usersTable).values({
      id: userId,
      username,
      displayName: email.split("@")[0],
      bio: null,
      avatarUrl: null,
    }).returning();
  }

  res.json(user);
});

// PATCH /api/users/me — update own profile
router.patch("/users/me", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { displayName, bio, avatarUrl, username } = req.body;

  if (username) {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.username, username));
    if (existing && existing.id !== userId) {
      res.status(409).json({ error: "Username already taken" });
      return;
    }
  }

  const [user] = await db
    .update(usersTable)
    .set({ displayName, bio, avatarUrl, username })
    .where(eq(usersTable.id, userId))
    .returning();

  res.json(user);
});

// GET /api/users/:username — public profile
router.get("/users/:username", optionalAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const username = req.params.username as string;
  const viewerId = req.userId;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  // Reels by this user
  const reels = await db.select().from(reelsTable)
    .where(eq(reelsTable.userId, user.id));

  // Is viewer following this user?
  let isFollowing = false;
  if (viewerId && viewerId !== user.id) {
    const [follow] = await db.select().from(followsTable)
      .where(eq(followsTable.followerId, viewerId));
    isFollowing = !!follow;
  }

  res.json({ ...user, reels, isFollowing });
});

// POST /api/users/:id/follow
router.post("/users/:id/follow", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const followerId = req.userId!;
  const followingId = req.params.id as string;

  if (followerId === followingId) { res.status(400).json({ error: "Cannot follow yourself" }); return; }

  await db.insert(followsTable).values({ followerId, followingId }).onConflictDoNothing();

  // Increment counters
  await Promise.all([
    db.update(usersTable).set({ followingCount: sql`${usersTable.followingCount} + 1` }).where(eq(usersTable.id, followerId)),
    db.update(usersTable).set({ followersCount: sql`${usersTable.followersCount} + 1` }).where(eq(usersTable.id, followingId)),
  ]);

  res.json({ success: true });
});

// DELETE /api/users/:id/follow
router.delete("/users/:id/follow", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const followerId = req.userId!;
  const followingId = req.params.id as string;

  await db.delete(followsTable)
    .where(eq(followsTable.followerId, followerId));

  await Promise.all([
    db.update(usersTable).set({ followingCount: sql`${usersTable.followingCount} - 1` }).where(eq(usersTable.id, followerId)),
    db.update(usersTable).set({ followersCount: sql`${usersTable.followersCount} - 1` }).where(eq(usersTable.id, followingId)),
  ]);

  res.json({ success: true });
});

// GET /api/users/:id/followers
router.get("/users/:id/followers", async (req, res): Promise<void> => {
  const userId = req.params.id as string;
  const followers = await db
    .select({ user: usersTable })
    .from(followsTable)
    .innerJoin(usersTable, eq(usersTable.id, followsTable.followerId))
    .where(eq(followsTable.followingId, userId));
  res.json(followers.map((f: any) => f.user));
});

// GET /api/users/:id/following
router.get("/users/:id/following", async (req, res): Promise<void> => {
  const userId = req.params.id as string;
  const following = await db
    .select({ user: usersTable })
    .from(followsTable)
    .innerJoin(usersTable, eq(usersTable.id, followsTable.followingId))
    .where(eq(followsTable.followerId, userId));
  res.json(following.map((f: any) => f.user));
});

export default router;
