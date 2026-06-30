import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

// Edge-veilige basisconfig (geen Prisma). De Credentials-provider met
// database-lookup wordt toegevoegd in src/auth.ts (node-runtime).
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: Role }).role;
        token.customerId = (user as { customerId?: string }).customerId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role as Role;
        session.user.customerId = token.customerId as string | undefined;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
