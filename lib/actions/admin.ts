"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateShopModeration(formData: FormData) {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const shopId = String(formData.get("shopId"));
  await supabase
    .from("shops")
    .update({
      is_approved: formData.get("is_approved") === "on",
      is_restricted: formData.get("is_restricted") === "on",
      is_featured: formData.get("is_featured") === "on"
    })
    .eq("id", shopId);
  revalidatePath("/admin/vendors");
  revalidatePath("/discover");
}
