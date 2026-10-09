"use server";

import { revalidatePath } from "next/cache";
import { finishEnquiry } from "@/lib/pipeline/enquiry";
import { requireSession } from "@/lib/session";

export async function retryEnquiry(form: FormData) {
  await requireSession();
  const id = String(form.get("id") ?? "");
  if (!/^ENQ-[0-9A-F]{8}$/.test(id)) return;
  await finishEnquiry(id);
  revalidatePath("/desk");
}
