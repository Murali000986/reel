import { Router, type IRouter } from "express";
import { eq, desc, count, sum, sql } from "drizzle-orm";
import { db, reelsTable, usersTable, reelLikesTable } from "@workspace/db";
import { optionalAuth, type AuthenticatedRequest } from "../middlewares/auth";
import {
  ListReelsQueryParams,
  CreateReelBody,
  GetReelParams,
  UpdateReelParams,
  UpdateReelBody,
  DeleteReelParams,
  IncrementReelViewParams,
  ToggleReelLikeParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Existing routers...
// We'll insert the modified router.get("/reels/:id") below

router.get("/reels/:id", optionalAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = GetReelParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.userId;

  const [row] = await db
    .select({
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
    .where(eq(reelsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }

  let isLiked = false;
  if (userId) {
    const [like] = await db
      .select()
      .from(reelLikesTable)
      .where(sql`${reelLikesTable.userId} = ${userId} AND ${reelLikesTable.reelId} = ${params.data.id}`);
    isLiked = !!like;
  }

  res.json({
    ...row.reel,
    user: row.user,
    isLiked,
  });
});

router.get("/reels", async (req, res): Promise<void> => {
  const parsed = ListReelsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page, limit, status } = parsed.data;
  const offset = (page - 1) * limit;

  const whereClause =
    status === "all"
      ? undefined
      : eq(reelsTable.status, status ?? "published");

  const [reels, totalResult] = await Promise.all([
    db
      .select()
      .from(reelsTable)
      .where(whereClause)
      .orderBy(desc(reelsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(reelsTable)
      .where(whereClause),
  ]);

  res.json({
    reels,
    total: totalResult[0]?.count ?? 0,
    page,
    limit,
  });
});

router.post("/reels", optionalAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = CreateReelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const insertData = {
    ...parsed.data,
    userId: req.userId || null,
  };

  const [reel] = await db.insert(reelsTable).values(insertData).returning();
  res.status(201).json(reel);
});

router.get("/reels/stats", async (_req, res): Promise<void> => {
  const [stats, recentUploads] = await Promise.all([
    db
      .select({
        totalReels: count(),
        totalViews: sum(reelsTable.views),
        totalLikes: sum(reelsTable.likes),
        publishedCount: sql<number>`count(*) filter (where ${reelsTable.status} = 'published')`,
        draftCount: sql<number>`count(*) filter (where ${reelsTable.status} = 'draft')`,
      })
      .from(reelsTable),
    db
      .select()
      .from(reelsTable)
      .orderBy(desc(reelsTable.createdAt))
      .limit(5),
  ]);

  const s = stats[0];
  res.json({
    totalReels: s?.totalReels ?? 0,
    totalViews: Number(s?.totalViews ?? 0),
    totalLikes: Number(s?.totalLikes ?? 0),
    publishedCount: Number(s?.publishedCount ?? 0),
    draftCount: Number(s?.draftCount ?? 0),
    recentUploads,
  });
});


router.patch("/reels/:id", async (req, res): Promise<void> => {
  const params = UpdateReelParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateReelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [reel] = await db
    .update(reelsTable)
    .set(parsed.data)
    .where(eq(reelsTable.id, params.data.id))
    .returning();

  if (!reel) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }

  res.json(reel);
});

router.delete("/reels/:id", async (req, res): Promise<void> => {
  const params = DeleteReelParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [reel] = await db
    .delete(reelsTable)
    .where(eq(reelsTable.id, params.data.id))
    .returning();

  if (!reel) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/reels/:id/view", async (req, res): Promise<void> => {
  const params = IncrementReelViewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [reel] = await db
    .update(reelsTable)
    .set({ views: sql`${reelsTable.views} + 1` })
    .where(eq(reelsTable.id, params.data.id))
    .returning();

  if (!reel) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }

  res.json(reel);
});

router.post("/reels/:id/like", async (req, res): Promise<void> => {
  const params = ToggleReelLikeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [reel] = await db
    .update(reelsTable)
    .set({ likes: sql`${reelsTable.likes} + 1` })
    .where(eq(reelsTable.id, params.data.id))
    .returning();

  if (!reel) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }

  res.json(reel);
});

export default router;
