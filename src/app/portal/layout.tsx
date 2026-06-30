import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div>
          <p className="font-semibold">Mijn strippenkaarten</p>
          <p className="text-xs text-muted">{session.user.name}</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="rounded-md px-3 py-2 text-sm text-muted hover:bg-background"
          >
            Uitloggen
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-4xl p-6">{children}</main>
    </div>
  );
}
