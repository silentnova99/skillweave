import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { loginAction } from "../actions";

export const metadata: Metadata = {
  title: "Sign in · SkillWeave",
};

export default function LoginPage() {
  return (
    <div>
      <h1 className="display-title text-xl">
        Welcome back
      </h1>
      <p className="mt-1 mb-6 text-sm text-[var(--color-fg-muted)]">
        Continue your roadmap where you left off.
      </p>
      <AuthForm mode="login" action={loginAction} />
    </div>
  );
}
