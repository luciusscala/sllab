import type { Env } from "./env.js";

/** Sends one text. Throws with the provider's own explanation when refused. */
export type SendSms = (phone: string, body: string) => Promise<void>;

/**
 * Outbound SMS through Twilio's REST API: one form POST per message, which is
 * all the SDK would do.
 *
 * Messages go through a Messaging Service rather than from a bare number. The
 * service owns the sender, keeps texts inside the countries its geo
 * permissions allow, and answers STOP and HELP replies.
 */
export function twilioSender({ accountSid, authToken, messagingServiceSid }: Env["twilio"]): SendSms {
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const authorization = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;

  return async (phone, body) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: authorization },
      body: new URLSearchParams({
        // Numbers are stored as digits with the country code; E.164 adds the plus.
        To: `+${phone}`,
        MessagingServiceSid: messagingServiceSid,
        Body: body,
      }),
    });

    if (!response.ok) {
      const { message } = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(message ?? `Twilio responded ${response.status}.`);
    }
  };
}
