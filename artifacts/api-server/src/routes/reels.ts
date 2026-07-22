import { Router, type IRouter } from "express";
import { eq, desc, count, sum, sql } from "drizzle-orm";
import { db, reelsTable } from "@workspace/db";
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

router.post("/reels", async (req, res): Promise<void> => {
  const parsed = CreateReelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [reel] = await db.insert(reelsTable).values(parsed.data).returning();
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

router.get("/reels/:id", async (req, res): Promise<void> => {
  const params = GetReelParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [reel] = await db
    .select()
    .from(reelsTable)
    .where(eq(reelsTable.id, params.data.id));

  if (!reel) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }

  res.json(reel);
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
