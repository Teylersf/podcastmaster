// Quick audit: how many UserProfile rows exist, when the last few were
// created, and whether anything looks unhealthy about the funnel. Read-only.
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL },
  },
});

async function main() {
  const now = new Date();
  const since6th = new Date("2026-07-06T00:00:00Z");
  const since30d = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

  const [totalProfiles, since6thCount, since30dCount, last10, jobsSince6th, freeFilesSince6th] = await Promise.all([
    prisma.userProfile.count(),
    prisma.userProfile.count({ where: { createdAt: { gte: since6th } } }),
    prisma.userProfile.count({ where: { createdAt: { gte: since30d } } }),
    prisma.userProfile.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { userId: true, email: true, createdAt: true, referredByCode: true },
    }),
    prisma.freeUserFile.count({ where: { createdAt: { gte: since6th } } }).catch(() => "err"),
    prisma.freeUserFile.count({ where: { createdAt: { gte: since30d } } }).catch(() => "err"),
  ]);

  console.log("=== UserProfile counts ===");
  console.log(`total:              ${totalProfiles}`);
  console.log(`since 2026-07-06:   ${since6thCount}`);
  console.log(`last 30 days:       ${since30dCount}`);
  console.log("");
  console.log("=== last 10 signups ===");
  for (const p of last10) {
    console.log(`  ${p.createdAt.toISOString()}  ${p.email ?? "(no email)"}  ${p.referredByCode ? `[ref:${p.referredByCode}]` : ""}`);
  }
  console.log("");
  console.log("=== FreeUserFile activity (signed-in-free-user masters) ===");
  console.log(`since 2026-07-06:   ${freeFilesSince6th}`);
  console.log(`last 30 days:       ${jobsSince6th}`);
}

main()
  .catch((err) => {
    console.error("[AUDIT] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
