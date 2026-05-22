import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { error: upsertError } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? "",
      full_name: user.user_metadata?.full_name ?? null,
      role: "vendor"
    });

    if (upsertError) {
      console.error("Profile setup failed", upsertError);
      return NextResponse.json({ error: "Could not prepare profile." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Profile setup request failed", error);
    return NextResponse.json({ error: "Could not prepare profile." }, { status: 500 });
  }
}
