import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getSession() {
  return auth();
}

/**
 * Returns the authenticated database user, or null. Sessions are JWT based so
 * we re-read the user from the database to reflect role/profile changes.
 */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

export function isAdmin(user: { role: string } | null | undefined): boolean {
  return user?.role === "ADMIN";
}
