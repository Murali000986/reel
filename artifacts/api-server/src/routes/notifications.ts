import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, notificationsTable, usersTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

// GET /api/notifications — get own notifications
router.get("/notifications", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;

  const notifs = await db.select({
    notification: notificationsTable,
    actor: {
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
    }
  })
    .from(notificationsTable)
    .leftJoin(usersTable, eq(usersTable.id, notificationsTable.actorId))
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  res.json(notifs.map((n: any) => ({ ...n.notification, actor: n.actor })));
});

// POST /api/notifications/read-all — mark all as read
router.post("/notifications/read-all", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, userId));
  res.json({ success: true });
});

// GET /api/notifications/unread-count
router.get("/notifications/unread-count", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const unread = await db.select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId));
  const count = unread.filter((n: any) => !n.isRead).length;
  res.json({ count });
});

export default router;
