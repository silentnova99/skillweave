import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { loadPathProgress, getRecommendationsForPath, catalogueStats } from "@/lib/progress";

async function main() {
  const email = process.env.SEED_DEMO_EMAIL ?? "learner@skillweave.local";
  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });

  console.log("catalogue:", await catalogueStats());

  if (!user) {
    console.log(`no demo user (${email}); run \`npm run db:seed\` first`);
    return;
  }

  const slug =
    (
      await prisma.careerPath.findUnique({
        where: { id: user.profile?.targetCareerPathId ?? "" },
        select: { slug: true },
      })
    )?.slug ?? "backend-python";

  const progress = await loadPathProgress(user.id, slug);
  if (!progress) throw new Error(`path ${slug} not found`);

  console.log(`\nuser: ${user.email} → ${progress.pathTitle}`);
  console.log(
    `progress: ${progress.state.completedRequiredChapters}/${progress.state.totalRequiredChapters} (${progress.state.percentComplete}%)`,
  );
  console.log(
    `next eligible chapter: ${
      progress.chapters.find((c) => c.id === progress.state.nextEligibleChapterId)?.title ?? "none"
    }`,
  );

  const recs = await getRecommendationsForPath(user.id, slug);
  console.log(`\nrecommendations (${recs.length}):`);
  for (const rec of recs) {
    console.log(`  [${rec.priority}] ${rec.kind} — ${rec.title}${rec.href ? ` → ${rec.href}` : ""}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
