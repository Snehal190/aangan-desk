import { getEnquiry, getLead, saveEnquiry, saveLead } from "@/lib/store";

// Public: when a website call couldn't connect, the visitor leaves an email
// so the front desk can follow up. Only updates that enquiry's own callback lead.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { enquiryId?: unknown; email?: unknown } | null;
  const id = typeof body?.enquiryId === "string" ? body.enquiryId : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^ENQ-[0-9A-F]{8}$/.test(id) || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(email) || email.length > 120) {
    return Response.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  const e = await getEnquiry(id);
  const lead = await getLead(`L-${id}`);
  if (!e || !lead || lead.status !== "needs_review") return Response.json({ error: "not found" }, { status: 404 });

  await saveEnquiry({ ...e, email });
  await saveLead({ ...lead, email, nextStep: `Email ${lead.callerName} at ${email} to pick up the enquiry.` });
  return Response.json({ ok: true });
}
