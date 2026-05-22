import Link from "next/link";
import { QrCode, Search, Store, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const modules = [
  { title: "Discover", icon: Search, text: "Search local shops and compare dish prices." },
  { title: "QR Menus", icon: QrCode, text: "Every vendor gets a public mobile menu link." },
  { title: "Orders", icon: Utensils, text: "Customers order quickly and receive a token." },
  { title: "Vendor Ops", icon: Store, text: "Manage shop details, dishes, reviews, and plans." }
];

export default function HomePage() {
  return (
    <main className="food-grid">
      <section className="container grid min-h-[calc(100vh-4rem)] items-center gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="text-sm font-medium text-primary">Food menu discovery and QR ordering</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
            Menuval
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            A clean MVP for vendors to publish menus, receive realtime orders, manage subscriptions, and get discovered by nearby customers.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/discover">Browse shops</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/signup">Create vendor account</Link>
            </Button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {modules.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <item.icon className="h-6 w-6 text-primary" />
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{item.text}</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
