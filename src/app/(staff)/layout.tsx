import Link from "next/link";
import Image from "next/image";
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
  { href: "/admin/export", label: "Facturatie-export", adminOnly: true },
  { href: "/admin/audit", label: "Audit log", adminOnly: true },
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
      <aside className="flex w-60 flex-col bg-brand text-brand-cream">
        <div className="border-b border-white/10 p-4">
          <Image
            src="/logo-vector-dark-bg.svg"
            alt="LemonCap"
            width={132}
            height={35}
            priority
          />
          <p className="mt-2 text-xs text-brand-cream/60">{session.user.name}</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.filter(
            (item) => !item.adminOnly || session.user.role === "ADMIN",
          ).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-brand-cream/80 transition-colors hover:bg-white/10 hover:text-brand-cream"
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
          className="border-t border-white/10 p-3"
        >
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-sm text-brand-cream/60 transition-colors hover:bg-white/10 hover:text-brand-cream"
          >
            Uitloggen
          </button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
