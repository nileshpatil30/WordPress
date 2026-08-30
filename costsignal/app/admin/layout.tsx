import Link from "next/link";
import { currentAdmin } from "@/lib/auth";
import { loginAction, logoutAction } from "./actions";
import { LoginForm } from "@/components/admin/AdminForms";
import { Button, Card } from "@/components/ui";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/pricing", label: "Pricing and factors" },
  { href: "/admin/geo", label: "Geography" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/sources", label: "Sources" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin();

  if (!admin) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-5 py-24">
        <Card className="w-full p-8">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Admin console</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            Phase 1 uses a single shared password rather than user accounts.
            Replace this with real authentication before launch &mdash; the audit
            log already records an actor, so the swap is contained.
          </p>
          <div className="mt-6"><LoginForm action={loginAction} /></div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Admin console</h1>
          <p className="mt-0.5 text-[13px] text-muted">Signed in as {admin.actor}</p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="secondary" size="sm">Sign out</Button>
        </form>
      </div>

      <nav className="scroll-x mt-5 flex gap-1 border-b border-line pb-4">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="whitespace-nowrap rounded-lg px-3 py-1.5 text-[13.5px] font-medium text-muted hover:bg-sunken hover:text-ink"
          >
            {n.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8">{children}</div>
    </div>
  );
}
