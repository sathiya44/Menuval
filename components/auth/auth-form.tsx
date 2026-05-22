"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type AuthFormProps = {
  mode: "login" | "signup";
  initialError?: string;
};

export function AuthForm({ mode, initialError }: AuthFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function ensureProfile() {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return { ok: false, error: "No authenticated user found after login." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) return { ok: true, error: "" };

    const { error: clientUpsertError } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? "",
      full_name: user.user_metadata?.full_name ?? null,
      role: "vendor"
    });

    if (!clientUpsertError) return { ok: true, error: "" };

    const response = await fetch("/api/auth/ensure-profile", { method: "POST" });
    if (response.ok) return { ok: true, error: "" };

    const payload = await response.json().catch(() => null);
    return {
      ok: false,
      error:
        payload?.error ??
        clientUpsertError.message ??
        "Profile could not be created."
    };
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("fullName") ?? "");

    if (mode === "login") {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      setLoading(false);
      if (loginError) {
        setError(loginError.message);
        return;
      }

      const profileReady = await ensureProfile();
      if (!profileReady.ok) {
        setError(`Logged in, but the vendor profile could not be prepared. ${profileReady.error}`);
        return;
      }
      router.refresh();
      router.replace("/vendor");
      return;
    }

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/vendor`,
        data: {
          full_name: fullName
        }
      }
    });

    setLoading(false);
    if (signupError) {
      setError(signupError.message);
      return;
    }

    if (data.session) {
      const profileReady = await ensureProfile();
      if (!profileReady.ok) {
        setError(`Account created, but the vendor profile could not be prepared. ${profileReady.error}`);
        return;
      }
      router.refresh();
      router.replace("/vendor");
      return;
    }

    setMessage("Account created. Check your email to confirm your account, then login.");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {error ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-md bg-primary/10 p-3 text-sm text-primary">{message}</p>
      ) : null}

      {mode === "signup" ? (
        <div className="grid gap-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" autoComplete="name" required />
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <div className="flex gap-2">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={6}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Please wait" : mode === "login" ? "Login" : "Create account"}
      </Button>

      <p className="text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            New vendor?{" "}
            <Link className="font-medium text-primary" href="/signup">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already registered?{" "}
            <Link className="font-medium text-primary" href="/login">
              Login
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
