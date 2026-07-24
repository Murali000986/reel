import { Router, type IRouter } from "express";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { db, reelsTable, followsTable, usersTable, reelLikesTable } from "@workspace/db";
import { requireAuth, optionalAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

// GET /api/feed — personalized feed (reels from followed users + trending if new)
router.get("/feed", optionalAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId;
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);
  const offset = (page - 1) * limit;

  let reels;

  if (userId) {
    // Get IDs of users this person follows
    const following = await db
      .select({ followingId: followsTable.followingId })
      .from(followsTable)
      .where(eq(followsTable.followerId, userId));

    const followingIds = following.map((f: { followingId: string }) => f.followingId);

    if (followingIds.length > 0) {
      // Get reels from followed users + trending
      reels = await db.select({
        reel: reelsTable,
        user: {
          id: usersTable.id,
          username: usersTable.username,
          displayName: usersTable.displayName,
          avatarUrl: usersTable.avatarUrl,
        }
      })
        .from(reelsTable)
        .leftJoin(usersTable, eq(usersTable.id, reelsTable.userId))
        .where(eq(reelsTable.status, "published"))
        .orderBy(desc(reelsTable.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      // New user: show trending
      reels = await db.select({
        reel: reelsTable,
        user: {
          id: usersTable.id,
          username: usersTable.username,
          displayName: usersTable.displayName,
          avatarUrl: usersTable.avatarUrl,
        }
      })
        .from(reelsTable)
        .leftJoin(usersTable, eq(usersTable.id, reelsTable.userId))
        .where(eq(reelsTable.status, "published"))
        .orderBy(desc(reelsTable.views))
        .limit(limit)
        .offset(offset);
    }

    // Add isLiked flag
    const reelIds = reels.map((r: any) => r.reel.id);
    let likedReelIds: Set<number> = new Set();
    if (reelIds.length > 0) {
      const likes = await db.select().from(reelLikesTable)
        .where(eq(reelLikesTable.userId, userId));
      likedReelIds = new Set(likes.map((l: any) => l.reelId));
    }

    const result = reels.map((r: any) => ({
      ...r.reel,
      user: r.user,
      isLiked: likedReelIds.has(r.reel.id),
    }));
    res.json({ reels: result, page, limit });
    return;
  }

  // Unauthenticated: public feed
  reels = await db.select({
    reel: reelsTable,
    user: {
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
    }
  })
    .from(reelsTable)
    .leftJoin(usersTable, eq(usersTable.id, reelsTable.userId))
    .where(eq(reelsTable.status, "published"))
    .orderBy(desc(reelsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ reels: reels.map((r: any) => ({ ...r.reel, user: r.user, isLiked: false })), page, limit });
});

// GET /api/explore — trending discovery + user suggestions
router.get("/explore", optionalAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const q = req.query.q as string | undefined;
  const userId = req.userId;
  const page = Number(req.query.page ?? 1);
  const limit = Math.min(Number(req.query.limit ?? 100), 200);
  const offset = (page - 1) * limit;

  const reels = await db.select({
    reel: reelsTable,
    user: {
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
    }
  })
    .from(reelsTable)
    .leftJoin(usersTable, eq(usersTable.id, reelsTable.userId))
    .where(eq(reelsTable.status, "published"))
    .orderBy(desc(reelsTable.views))
    .limit(limit)
    .offset(offset);

  // User search or suggestions
  let users: any[] = [];
  if (q) {
    // Search by username or display name
    const found = await db.select().from(usersTable)
      .where(sql`lower(${usersTable.username}) like ${'%' + q.toLowerCase() + '%'} OR lower(${usersTable.displayName}) like ${'%' + q.toLowerCase() + '%'}`)
      .limit(20);
    users = found;
  } else {
    // Always show suggested users (exclude self)
    const conditions = userId
      ? sql`${usersTable.id} != ${userId}`
      : sql`1=1`;
    const found = await db.select().from(usersTable)
      .where(conditions)
      .orderBy(desc(usersTable.followersCount))
      .limit(30);
    users = found;
  }

  // Attach isFollowing flag for each user
  if (userId && users.length > 0) {
    const followingRows = await db.select({ followingId: followsTable.followingId })
      .from(followsTable)
      .where(eq(followsTable.followerId, userId));
    const followingSet = new Set(followingRows.map((f: { followingId: string }) => f.followingId));
    users = users.map((u: any) => ({ ...u, isFollowing: followingSet.has(u.id) }));
  } else {
    users = users.map((u: any) => ({ ...u, isFollowing: false }));
  }

  res.json({ reels: reels.map((r: any) => ({ ...r.reel, user: r.user })), users });
});

export default router;
