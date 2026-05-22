import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="container grid min-h-[calc(100vh-4rem)] place-items-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Vendor login</CardTitle>
        </CardHeader>
        <CardContent>
          <AuthForm mode="login" initialError={params.error} />
        </CardContent>
      </Card>
    </main>
  );
}
