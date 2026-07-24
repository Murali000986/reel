import { Router, type IRouter } from "express";
import { eq, desc, or, and, sql } from "drizzle-orm";
import { db, conversationsTable, messagesTable, usersTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

// Helper: get or create conversation between two users
async function getOrCreateConversation(userAId: string, userBId: string) {
  // Canonical ordering so (A,B) and (B,A) resolve to same row
  const [a, b] = [userAId, userBId].sort();
  const [existing] = await db.select().from(conversationsTable)
    .where(and(eq(conversationsTable.userAId, a), eq(conversationsTable.userBId, b)));

  if (existing) return existing;

  const [conv] = await db.insert(conversationsTable)
    .values({ userAId: a, userBId: b })
    .returning();
  return conv;
}

// GET /api/messages/conversations — list all DM conversations for current user
router.get("/messages/conversations", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;

  const convs = await db.select({
    conversation: conversationsTable,
    userA: {
      id: sql<string>`ua.id`,
      username: sql<string>`ua.username`,
      displayName: sql<string>`ua.display_name`,
      avatarUrl: sql<string>`ua.avatar_url`,
    },
    userB: {
      id: sql<string>`ub.id`,
      username: sql<string>`ub.username`,
      displayName: sql<string>`ub.display_name`,
      avatarUrl: sql<string>`ub.avatar_url`,
    },
  })
    .from(conversationsTable)
    .innerJoin(sql`users ua`, sql`ua.id = ${conversationsTable.userAId}`)
    .innerJoin(sql`users ub`, sql`ub.id = ${conversationsTable.userBId}`)
    .where(or(
      eq(conversationsTable.userAId, userId),
      eq(conversationsTable.userBId, userId)
    ))
    .orderBy(desc(conversationsTable.lastMessageAt));

  // Attach last message
  const results = await Promise.all(convs.map(async (c: any) => {
    const [lastMsg] = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, c.conversation.id))
      .orderBy(desc(messagesTable.createdAt))
      .limit(1);
    const otherUser = c.conversation.userAId === userId ? c.userB : c.userA;
    return { ...c.conversation, otherUser, lastMessage: lastMsg ?? null };
  }));

  res.json(results);
});

// GET /api/messages/:conversationId — messages in a conversation
router.get("/messages/:conversationId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const convId = Number(req.params.conversationId);

  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, convId));
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  if (conv.userAId !== userId && conv.userBId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const messages = await db.select({
    message: messagesTable,
    sender: {
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
    }
  })
    .from(messagesTable)
    .innerJoin(usersTable, eq(usersTable.id, messagesTable.senderId))
    .where(eq(messagesTable.conversationId, convId))
    .orderBy(messagesTable.createdAt);

  res.json(messages.map((m: any) => ({ ...m.message, sender: m.sender })));
});

// POST /api/messages/start/:userId — start or get DM with a user
router.post("/messages/start/:userId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const myId = req.userId!;
  const otherId = req.params.userId as string;

  if (myId === otherId) { res.status(400).json({ error: "Cannot message yourself" }); return; }

  const conv = await getOrCreateConversation(myId, otherId);
  res.json(conv);
});

// POST /api/messages/:conversationId/send — send a message
router.post("/messages/:conversationId/send", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const convId = Number(req.params.conversationId);
  const { text } = req.body;

  if (!text?.trim()) { res.status(400).json({ error: "Message text required" }); return; }

  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, convId));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  if (conv.userAId !== userId && conv.userBId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const [message] = await db.insert(messagesTable)
    .values({ conversationId: convId, senderId: userId, text: text.trim() })
    .returning();

  // Update last message timestamp
  await db.update(conversationsTable)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversationsTable.id, convId));

  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  res.status(201).json({ ...message, sender });
});

// DELETE /api/messages/:messageId — delete own message
router.delete("/messages/:messageId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.userId!;
  const msgId = Number(req.params.messageId);

  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, msgId));
  if (!msg) { res.status(404).json({ error: "Not found" }); return; }
  if (msg.senderId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(messagesTable).where(eq(messagesTable.id, msgId));
  res.sendStatus(204);
});

export default router;
