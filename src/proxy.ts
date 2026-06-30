import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

const STAFF_ROLES = ["ADMIN", "TECHNICIAN", "READONLY"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const isLoginPage = nextUrl.pathname === "/login";
  const isPortal = nextUrl.pathname.startsWith("/portal");

  if (!isLoggedIn) {
    if (isLoginPage) return;
    const url = new URL("/login", nextUrl);
    url.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
    return Response.redirect(url);
  }

  // Ingelogd maar op de loginpagina -> doorsturen naar de juiste startpagina.
  if (isLoginPage) {
    const target = role === "CUSTOMER" ? "/portal" : "/dashboard";
    return Response.redirect(new URL(target, nextUrl));
  }

  // Klanten mogen alleen in het portaal.
  if (role === "CUSTOMER" && !isPortal) {
    return Response.redirect(new URL("/portal", nextUrl));
  }

  // Medewerkers mogen niet in het klantportaal.
  if (isPortal && role && STAFF_ROLES.includes(role)) {
    return Response.redirect(new URL("/dashboard", nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
