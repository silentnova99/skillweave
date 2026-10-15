"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/lib/auth";
import { loginSchema, registerSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

export type AuthState = { error?: string } | null;

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const limit = rateLimit(
    `login:${parsed.data.email.toLowerCase()}`,
    10,
    60_000,
  );
  if (!limit.ok) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: { profile: true },
  });
  redirect(user?.profile?.onboardingCompletedAt ? "/dashboard" : "/onboarding");
}

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const limit = rateLimit(`register:${parsed.data.email.toLowerCase()}`, 5, 60_000);
  if (!limit.ok) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const role = adminEmails().includes(email) ? "ADMIN" : "LEARNER";

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      role,
      profile: {
        create: {},
      },
    },
  });

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created, but sign-in failed. Please log in." };
    }
    throw error;
  }

  redirect("/onboarding");
}

export async function logoutAction() {
  await signOut({ redirect: false });
  redirect("/");
}
