"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SiteHeader() {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/vendor") || pathname.startsWith("/admin");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function syncMenuState() {
      setMenuOpen(window.location.hash === "#dashboard-menu");
    }

    function syncFromDashboardMenu(event: Event) {
      setMenuOpen(Boolean((event as CustomEvent<boolean>).detail));
    }

    syncMenuState();
    window.addEventListener("hashchange", syncMenuState);
    window.addEventListener("dashboard-menu-toggle", syncFromDashboardMenu);
    return () => {
      window.removeEventListener("hashchange", syncMenuState);
      window.removeEventListener("dashboard-menu-toggle", syncFromDashboardMenu);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function toggleDashboardMenu() {
    const query = window.location.search;

    if (menuOpen) {
      window.history.replaceState(null, "", `${pathname}${query}`);
      setMenuOpen(false);
      window.dispatchEvent(new CustomEvent("dashboard-menu-toggle", { detail: false }));
      return;
    }

    window.history.replaceState(null, "", `${pathname}${query}#dashboard-menu`);
    setMenuOpen(true);
    window.dispatchEvent(new CustomEvent("dashboard-menu-toggle", { detail: true }));
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-3">
        <Link href="/" className="shrink-0 text-lg font-semibold">
          Menuval
        </Link>

        {isDashboard ? (
          <Button
            type="button"
            variant={menuOpen ? "default" : "outline"}
            size="sm"
            className="lg:hidden"
            onClick={toggleDashboardMenu}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            {menuOpen ? "Close" : "Menu"}
          </Button>
        ) : (
          <form action="/discover" className="flex w-full max-w-md items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-10 pl-9"
                name="q"
                placeholder="Search food or shops"
                aria-label="Search food or shops"
              />
            </div>
            <Button type="submit" size="icon" aria-label="Search">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        )}
      </div>
    </header>
  );
}
