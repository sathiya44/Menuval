"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";
import type { Profile } from "@/lib/database.types";

const vendorLinks = [
  ["Overview", "/vendor"],
  ["Shop", "/vendor/shop"],
  ["Menu", "/vendor/menu"],
  ["Orders", "/vendor/orders"],
  ["Reviews", "/vendor/reviews"],
  ["Subscription", "/vendor/subscription"]
];

const adminLinks = [
  ["Overview", "/admin"],
  ["Vendors", "/admin/vendors"],
  ["Orders", "/admin/orders"],
  ["Subscriptions", "/admin/subscriptions"],
  ["Reviews", "/admin/reviews"]
];

export function DashboardShell({
  profile,
  mode,
  children
}: {
  profile: Profile;
  mode: "vendor" | "admin";
  children: ReactNode;
}) {
  const links = mode === "admin" ? adminLinks : vendorLinks;

  return (
    <main className="container grid gap-5 py-4 lg:grid-cols-[220px_1fr] lg:py-6">
      <aside className="hidden h-fit rounded-lg border bg-card p-3 lg:sticky lg:top-20 lg:block">
        <div className="mb-3 px-2">
          <p className="text-sm font-medium">{profile.full_name ?? profile.email}</p>
          <Badge className="mt-2" variant="secondary">{profile.role}</Badge>
        </div>
        <nav className="grid gap-1">
          {links.map(([label, href]) => (
            <Button key={href} asChild variant="ghost" className="justify-start">
              <Link href={href}>{label}</Link>
            </Button>
          ))}
        </nav>
        <form action={signOut} className="mt-3">
          <Button variant="outline" className="w-full" type="submit">Sign out</Button>
        </form>
      </aside>
      <section className="min-w-0">{children}</section>
      <MobileDashboardMenu profile={profile} links={links} />
    </main>
  );
}

function MobileDashboardMenu({
  profile,
  links
}: {
  profile: Profile;
  links: string[][];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  function closeMenu() {
    const query = window.location.search;
    window.history.replaceState(null, "", `${window.location.pathname}${query}`);
    setOpen(false);
    window.dispatchEvent(new CustomEvent("dashboard-menu-toggle", { detail: false }));
  }

  useEffect(() => {
    function syncFromHash() {
      setOpen(window.location.hash === "#dashboard-menu");
    }

    function syncFromToggle(event: Event) {
      setOpen(Boolean((event as CustomEvent<boolean>).detail));
    }

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    window.addEventListener("dashboard-menu-toggle", syncFromToggle);
    return () => {
      window.removeEventListener("hashchange", syncFromHash);
      window.removeEventListener("dashboard-menu-toggle", syncFromToggle);
    };
  }, []);

  useEffect(() => {
    closeMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div
      id="dashboard-menu"
      className={`fixed inset-x-3 top-20 z-50 rounded-lg border bg-card p-3 shadow-xl lg:hidden ${open ? "block" : "hidden"}`}
    >
      <div className="mb-3 border-b pb-3">
        <p className="text-sm font-medium">{profile.full_name ?? profile.email}</p>
        <p className="text-xs text-muted-foreground">Menuval {profile.role}</p>
      </div>
      <nav className="grid grid-cols-2 gap-2">
        {links.map(([label, href]) => (
          <Button key={href} asChild variant="outline" className="h-11 justify-start">
            <Link href={href} onClick={closeMenu}>{label}</Link>
          </Button>
        ))}
      </nav>
      <form action={signOut} className="mt-3">
        <Button variant="outline" className="h-11 w-full" type="submit">
          Sign out
        </Button>
      </form>
    </div>
  );
}
