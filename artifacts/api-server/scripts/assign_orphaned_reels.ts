import { db, usersTable, reelsTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";

async function main() {
  console.log("Starting script...");
  
  // 1. Find user murali701081
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, "murali701081"));
  
  if (!user) {
    console.error("User @murali701081 not found!");
    process.exit(1);
  }
  
  console.log(`Found user @murali701081 with ID: ${user.id}`);
  
  // 2. Update all reels where userId is null
  const result = await db.update(reelsTable)
    .set({ userId: user.id })
    .where(isNull(reelsTable.userId))
    .returning();
    
  console.log(`Successfully assigned ${result.length} orphaned reels to @murali701081.`);
  process.exit(0);
}

main().catch(console.error);
