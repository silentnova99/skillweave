import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingForm, type PathOption } from "./onboarding-form";
import { saveOnboardingAction, skipOnboardingAction } from "./actions";

export const metadata: Metadata = { title: "Set up your path" };

export default async function OnboardingPage() {
  await requireUser();

  const paths = await prisma.careerPath.findMany({
    where: { published: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      summary: true,
      roles: { orderBy: { order: "asc" }, select: { title: true } },
    },
  });

  const options: PathOption[] = paths.map((path) => ({
    id: path.id,
    title: path.title,
    summary: path.summary,
    roles: path.roles.map((r) => r.title),
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[var(--color-brand)]">Step 1 of 2</p>
        <h1 className="display-title mt-1 text-2xl">
          Let&apos;s tailor your roadmap
        </h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          A few questions so we can order your learning and estimate a realistic
          pace. You can change any of this later.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your goal</CardTitle>
          <CardDescription>
            Pick the outcome you want. SkillWeave builds an ordered curriculum from
            existing free resources.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm paths={options} action={saveOnboardingAction} />
        </CardContent>
      </Card>

      <form action={skipOnboardingAction} className="text-center">
        <p className="text-sm text-[var(--color-fg-muted)]">
          In a hurry?{" "}
          <Button variant="ghost" size="sm" type="submit" className="font-medium text-[var(--color-brand)]">
            Skip for now
          </Button>{" "}
          — you can complete this later from your dashboard.
        </p>
      </form>
    </div>
  );
}
