// One-off: drop NOT NULL on FreeUserFile.expiresAt so signed-in free
// users' rows can be marked permanent (NULL = never expires — rotated
// only when the user masters a new file). Idempotent — safe to re-run.
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL },
  },
});

async function main() {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "FreeUserFile" ALTER COLUMN "expiresAt" DROP NOT NULL;',
  );
  console.log("[MIGRATE] FreeUserFile.expiresAt is now nullable");
}

main()
  .catch((err) => {
    console.error("[MIGRATE] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
