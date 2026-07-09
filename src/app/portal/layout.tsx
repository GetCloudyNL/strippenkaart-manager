import Image from "next/image";
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
        <div className="flex items-center gap-3">
          <Image
            src="/logo-vector-light-bg-green.svg"
            alt="LemonCap"
            width={124}
            height={33}
            priority
          />
          <span className="hidden text-sm text-muted sm:inline">
            {session.user.name}
          </span>
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
