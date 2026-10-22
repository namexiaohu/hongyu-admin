import 'server-only';

import { db } from '@/server/db';
import { complaints } from '@/server/db/schema';

export type StorefrontComplaintInput = {
  fullName?: string | null;
  contact?: string | null;
  message: string;
  sourcePageUrl?: string | null;
};

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  return trimmed || null;
}

export async function createStorefrontComplaint(input: StorefrontComplaintInput) {
  const message = input.message.trim();
  if (!message) return null;

  const now = new Date();
  const [created] = await db
    .insert(complaints)
    .values({
      fullName: emptyToNull(input.fullName),
      contact: emptyToNull(input.contact),
      message,
      sourcePageUrl: emptyToNull(input.sourcePageUrl),
      status: 'new',
      awaitingAdmin: true,
      lastMessageAt: now,
    })
    .returning({ id: complaints.id });

  return created ?? null;
}
