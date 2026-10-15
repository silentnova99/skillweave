import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireUser, isAdmin } from "@/lib/session";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  if (!user.profile?.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        isAdmin: isAdmin(user),
      }}
    >
      {children}
    </AppShell>
  );
}
