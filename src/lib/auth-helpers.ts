import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/enums";

export async function getSession() {
  return auth();
}

/** Vereist een ingelogde medewerker (geen klant). */
export async function requireStaff() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "CUSTOMER") redirect("/portal");
  return session;
}

/** Vereist een ingelogde klant (portal). Geeft de gekoppelde customerId terug. */
export async function requireCustomer() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "CUSTOMER") redirect("/dashboard");
  if (!session.user.customerId) redirect("/login");
  return { session, customerId: session.user.customerId };
}

/** Vereist een specifieke rol (of een van meerdere rollen). */
export async function requireRole(roles: Role | Role[]) {
  const session = await requireStaff();
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(session.user.role)) redirect("/dashboard");
  return session;
}

export function isAdmin(role?: Role) {
  return role === "ADMIN";
}
