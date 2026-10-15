import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { registerAction } from "../actions";

export const metadata: Metadata = {
  title: "Create account · SkillWeave",
};

export default function RegisterPage() {
  return (
    <div>
      <h1 className="display-title text-xl">
        Create your account
      </h1>
      <p className="mt-1 mb-6 text-sm text-[var(--color-fg-muted)]">
        Build a personalised roadmap from curated, free resources.
      </p>
      <AuthForm mode="register" action={registerAction} />
    </div>
  );
}
