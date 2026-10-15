"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

type AuthState = { error?: string } | null;

export function AuthForm({
  mode,
  action,
}: {
  mode: "login" | "register";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const isRegister = mode === "register";

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}

      {isRegister ? (
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            placeholder="Ada Lovelace"
          />
        </div>
      ) : null}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
          minLength={isRegister ? 8 : undefined}
          placeholder={isRegister ? "At least 8 characters" : "••••••••"}
        />
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="w-full"
        size="lg"
        variant="gradient"
      >
        {pending
          ? "Please wait…"
          : isRegister
            ? "Create account"
            : "Sign in"}
      </Button>

      <p className="text-center text-sm text-[var(--color-fg-muted)]">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[var(--color-brand)]">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to SkillWeave?{" "}
            <Link
              href="/register"
              className="font-medium text-[var(--color-brand)]"
            >
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
