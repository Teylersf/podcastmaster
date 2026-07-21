// One-off: add Subscription.trialEndsAt so we can store Stripe trial state
// and gate re-trialing. Idempotent.
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL },
  },
});

async function main() {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);',
  );
  console.log("[MIGRATE] Subscription.trialEndsAt column ensured");
}

main()
  .catch((err) => {
    console.error("[MIGRATE] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
