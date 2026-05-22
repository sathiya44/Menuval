import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Menuval",
  description: "Food menu discovery, QR ordering, and vendor management."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SiteHeader />
        {children}
        <footer className="border-t bg-card">
          <div className="container grid gap-4 py-6 text-sm text-muted-foreground sm:flex sm:items-center sm:justify-between">
            <p>Menuval for food courts, cafes, and local vendors.</p>
            <nav className="flex flex-wrap gap-3">
              <Link className="hover:text-foreground" href="/login">Vendor login</Link>
              <Link className="hover:text-foreground" href="/signup">Create vendor account</Link>
              <Link className="hover:text-foreground" href="/vendor">Dashboard</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
