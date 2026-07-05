import Link from "next/link";
import { requireStaff } from "@/lib/auth-helpers";
import { signOut } from "@/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/customers", label: "Klanten" },
  { href: "/projects", label: "Projecten" },
  { href: "/time", label: "Tijdregistratie" },
  { href: "/cards", label: "Strippenkaarten" },
  { href: "/admin/card-types", label: "Kaarttypes", adminOnly: true },
  { href: "/admin/hostbill", label: "HostBill", adminOnly: true },
  { href: "/admin/reports", label: "Rapporten", adminOnly: true },
  { href: "/admin/settings", label: "Instellingen", adminOnly: true },
];

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStaff();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-border bg-card">
        <div className="border-b border-border p-4">
          <p className="font-semibold">Strippenkaart Manager</p>
          <p className="text-xs text-muted">{session.user.name}</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.filter(
            (item) => !item.adminOnly || session.user.role === "ADMIN",
          ).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm hover:bg-background"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="border-t border-border p-3"
        >
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-sm text-muted hover:bg-background"
          >
            Uitloggen
          </button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
