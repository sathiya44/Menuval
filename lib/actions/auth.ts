"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authSchema } from "@/lib/validators/auth";

export async function signUpVendor(formData: FormData) {
  const values = authSchema.parse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName")
  });
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/vendor`,
      data: {
        full_name: values.fullName
      }
    }
  });

  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  redirect("/vendor");
}

export async function signIn(formData: FormData) {
  const values = authSchema.pick({ email: true, password: true }).parse({
    email: formData.get("email"),
    password: formData.get("password")
  });
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(values);

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/vendor");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
