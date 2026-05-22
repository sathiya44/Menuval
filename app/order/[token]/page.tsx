import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { OrderTracker } from "@/components/customer/order-tracker";

export default async function OrderTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="container grid min-h-[calc(100vh-4rem)] place-items-center py-4 sm:py-10">
      <Card className="w-full max-w-lg">
        <CardContent className="grid gap-4 p-4 text-center sm:p-8">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <p className="text-sm text-muted-foreground">Your order token is</p>
          <h1 className="break-all text-3xl font-semibold tracking-widest sm:text-4xl">{token}</h1>
          <p className="text-sm text-muted-foreground">Please show this token at the counter when your order is ready.</p>
          <OrderTracker token={token} />
        </CardContent>
      </Card>
    </main>
  );
}
