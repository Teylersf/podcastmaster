/**
 * Script to check files in the database and verify blob URLs
 * Run: npx ts-node scripts/check-files.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkFiles() {
  console.log("🔍 Checking files in database...\n");

  try {
    // Get all subscriptions with their files
    const subscriptions = await prisma.subscription.findMany({
      include: {
        files: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    console.log(`Found ${subscriptions.length} subscription(s)\n`);

    for (const sub of subscriptions) {
      console.log(`Subscription: ${sub.id}`);
      console.log(`Status: ${sub.status}`);
      console.log(`Files: ${sub.files.length}\n`);

      for (const file of sub.files) {
        console.log(`  📁 ${file.fileName}`);
        console.log(`     ID: ${file.id}`);
        console.log(`     Type: ${file.fileType}`);
        console.log(`     Size: ${(file.fileSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`     blobUrl: ${file.blobUrl ? "✅ Present" : "❌ MISSING"}`);
        if (file.blobUrl) {
          console.log(`     URL: ${file.blobUrl.slice(0, 80)}...`);
          
          // Check if URL is accessible
          try {
            const response = await fetch(file.blobUrl, { method: "HEAD" });
            console.log(`     Status: ${response.status === 200 ? "✅ Accessible" : `⚠️ ${response.status}`}`);
          } catch (e) {
            console.log(`     Status: ❌ Cannot access - ${e instanceof Error ? e.message : "Unknown error"}`);
          }
        }
        console.log(`     Created: ${file.createdAt.toISOString()}\n`);
      }
      console.log("---\n");
    }

    // Also check free user files
    console.log("\n🆓 Checking free user files...\n");
    const freeFiles = await prisma.freeUserFile.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    console.log(`Found ${freeFiles.length} free user file(s)\n`);

    for (const file of freeFiles) {
      console.log(`  📁 ${file.fileName}`);
      console.log(`     Job ID: ${file.jobId}`);
      console.log(`     Status: ${file.status}`);
      console.log(`     downloadUrl: ${file.downloadUrl ? "✅ Present" : "❌ MISSING"}`);
      console.log(`     Created: ${file.createdAt.toISOString()}`);
      console.log(`     Expires: ${file.expiresAt.toISOString()}\n`);
    }

  } catch (error) {
    console.error("❌ Error checking files:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFiles();
