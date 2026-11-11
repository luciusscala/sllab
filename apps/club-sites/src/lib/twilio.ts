import "server-only";

/**
 * Outbound SMS through Twilio's REST API. One form POST per message, which is
 * all the SDK would do for us.
 *
 * Sent through a Messaging Service rather than from a bare number: the service
 * owns the sender, and answers STOP and HELP replies on the club's behalf.
 */
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

/** Phones are stored as bare digits; ten of them is a US number without its +1. */
const toE164 = (digits: string) =>
  `+${digits.length === 10 ? `1${digits}` : digits}`;

/** Throws with Twilio's own explanation when the message is refused. */
export async function sendSms(phone: string, body: string) {
  if (!accountSid || !authToken || !messagingServiceSid) {
    throw new Error("Twilio is not configured.");
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        To: toE164(phone),
        MessagingServiceSid: messagingServiceSid,
        Body: body,
      }),
    },
  );

  if (!response.ok) {
    const { message } = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(message ?? `Twilio responded ${response.status}.`);
  }
}
