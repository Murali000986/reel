import { Router, type IRouter } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { db, commentsTable, reelLikesTable, reelsTable, usersTable, notificationsTable } from "@workspace/db";
import { requireAuth, optionalAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

// ─── LIKES ───────────────────────────────────────────────────────────────────

// POST /api/reels/:id/like — toggle like
router.post("/reels/:id/like", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const reelId = Number(req.params.id);

  const [existing] = await db.select().from(reelLikesTable)
    .where(and(eq(reelLikesTable.userId, userId), eq(reelLikesTable.reelId, reelId)));

  if (existing) {
    // Unlike
    await db.delete(reelLikesTable)
      .where(and(eq(reelLikesTable.userId, userId), eq(reelLikesTable.reelId, reelId)));
    await db.update(reelsTable)
      .set({ likes: sql`greatest(0, ${reelsTable.likes} - 1)` })
      .where(eq(reelsTable.id, reelId));
    res.json({ liked: false });
  } else {
    // Like
    await db.insert(reelLikesTable).values({ userId, reelId });
    const [reel] = await db.update(reelsTable)
      .set({ likes: sql`${reelsTable.likes} + 1` })
      .where(eq(reelsTable.id, reelId))
      .returning();

    // Fire notification for reel owner
    if (reel?.userId && reel.userId !== userId) {
      await db.insert(notificationsTable).values({
        userId: reel.userId,
        actorId: userId,
        type: "like",
        reelId,
        text: "liked your reel",
      });
    }
    res.json({ liked: true });
  }
});

// ─── COMMENTS ────────────────────────────────────────────────────────────────

// GET /api/reels/:id/comments
router.get("/reels/:id/comments", optionalAuth, async (req, res): Promise<void> => {
  const reelId = Number(req.params.id);
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const offset = (page - 1) * limit;

  const comments = await db.select({
    comment: commentsTable,
    user: {
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
    }
  })
    .from(commentsTable)
    .innerJoin(usersTable, eq(usersTable.id, commentsTable.userId))
    .where(eq(commentsTable.reelId, reelId))
    .orderBy(desc(commentsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(comments.map((c: any) => ({ ...c.comment, user: c.user })));
});

// POST /api/reels/:id/comments — add comment
router.post("/reels/:id/comments", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const reelId = Number(req.params.id);
  const { text } = req.body;

  if (!text?.trim()) { res.status(400).json({ error: "Comment text required" }); return; }

  const [comment] = await db.insert(commentsTable)
    .values({ userId, reelId, text: text.trim() })
    .returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  // Fire notification for reel owner
  const [reel] = await db.select().from(reelsTable).where(eq(reelsTable.id, reelId));
  if (reel?.userId && reel.userId !== userId) {
    await db.insert(notificationsTable).values({
      userId: reel.userId,
      actorId: userId,
      type: "comment",
      reelId,
      text: text.trim().slice(0, 80),
    });
  }

  res.status(201).json({ ...comment, user });
});

// DELETE /api/comments/:id — delete own comment
router.delete("/comments/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const commentId = Number(req.params.id);

  const [comment] = await db.select().from(commentsTable).where(eq(commentsTable.id, commentId));
  if (!comment) { res.status(404).json({ error: "Not found" }); return; }
  if (comment.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(commentsTable).where(eq(commentsTable.id, commentId));
  res.sendStatus(204);
});

export default router;
