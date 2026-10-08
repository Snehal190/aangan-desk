import type { Lead } from "../types";
import { env, NotConfiguredError } from "./env";

// Founder's view lives in HubSpot. Each call becomes a contact + deal with the
// handoff note attached. Pipeline/stage IDs and custom properties are pending
// — see README "Questions".
export async function syncLeadToHubSpot(lead: Lead): Promise<{ dealId: string }> {
  if (!env.hubspot.token) throw new NotConfiguredError("HubSpot");

  // TODO once pipeline + properties are confirmed:
  //  1. upsert contact by phone  (POST /crm/v3/objects/contacts)
  //  2. create deal in pipeline  (POST /crm/v3/objects/deals) with status, rubric, designer, booking time
  //  3. attach note with handoff + transcript link (POST /crm/v3/objects/notes)
  throw new Error(`HubSpot sync not implemented yet (lead ${lead.id})`);
}
