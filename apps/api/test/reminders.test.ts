import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Deps, createApp } from "../src/app.js";
import { DAILY_LIMIT } from "../src/reminders/deliver.js";
import type { Member, ReminderStore } from "../src/reminders/store.js";

const TEAM = "11111111-1111-1111-1111-111111111111";
const EVENT = "22222222-2222-2222-2222-222222222222";
const ROSTER_A = "33333333-3333-3333-3333-333333333333";
const ROSTER_B = "44444444-4444-4444-4444-444444444444";

const captain: Member = { personId: "captain-person", role: "captain", status: "active" };

/** A store that answers from memory and records what was logged. */
function fakeStore(overrides: Partial<{ member: Member | null; sentToday: number; phones: string[] }> = {}) {
  const logged: Parameters<ReminderStore["log"]>[0][] = [];
  const store: ReminderStore = {
    membership: vi.fn(async () => ("member" in overrides ? overrides.member! : captain)),
    sentSince: vi.fn(async () => overrides.sentToday ?? 0),
    recipients: vi.fn(async () => overrides.phones ?? ["14155550100", "14155550101"]),
    log: vi.fn(async (entry) => {
      logged.push(entry);
    }),
  };
  return { store, logged };
}

let sendSms: ReturnType<typeof vi.fn<Deps["sendSms"]>>;

beforeEach(() => {
  sendSms = vi.fn<Deps["sendSms"]>(async () => {});
});

function app(store: ReminderStore, verifyToken: Deps["verifyToken"] = async (t) => (t === "good" ? "user-1" : null)) {
  return createApp({ verifyToken, store, sendSms });
}

function post(body: unknown, token: string | null = "good") {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  };
}

const valid = { teamId: TEAM, eventId: EVENT, rosterIds: [ROSTER_A, ROSTER_B], message: "Practice at 6" };

describe("GET /health", () => {
  it("answers without auth", async () => {
    const res = await app(fakeStore().store).request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe("POST /v1/reminders", () => {
  it("rejects a request with no token", async () => {
    const res = await app(fakeStore().store).request("/v1/reminders", post(valid, null));
    expect(res.status).toBe(401);
    expect(sendSms).not.toHaveBeenCalled();
  });

  it("rejects a token Supabase doesn't recognise", async () => {
    const res = await app(fakeStore().store).request("/v1/reminders", post(valid, "forged"));
    expect(res.status).toBe(401);
  });

  it("requires a team", async () => {
    const res = await app(fakeStore().store).request("/v1/reminders", post({ ...valid, teamId: undefined }));
    expect(res.status).toBe(400);
  });

  it("rejects malformed roster ids", async () => {
    const res = await app(fakeStore().store).request("/v1/reminders", post({ ...valid, rosterIds: ["nope"] }));
    expect(res.status).toBe(400);
  });

  it.each<[string, Member | null]>([
    ["someone not on the team", null],
    ["a player", { personId: "p", role: "player", status: "active" }],
    ["a guest", { personId: "p", role: "guest", status: "active" }],
    ["a captain who is away", { personId: "p", role: "captain", status: "away" }],
    ["a coach who left", { personId: "p", role: "coach", status: "inactive" }],
  ])("refuses %s", async (_label, member) => {
    const res = await app(fakeStore({ member }).store).request("/v1/reminders", post(valid));
    expect(res.status).toBe(403);
    expect(sendSms).not.toHaveBeenCalled();
  });

  it("lets an active coach send", async () => {
    const coach: Member = { personId: "coach-person", role: "coach", status: "active" };
    const res = await app(fakeStore({ member: coach }).store).request("/v1/reminders", post(valid));
    expect(res.status).toBe(200);
  });

  it("texts every recipient and logs the send", async () => {
    const { store, logged } = fakeStore();
    const res = await app(store).request("/v1/reminders", post(valid));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: 2, failed: 0 });
    expect(sendSms).toHaveBeenCalledWith("14155550100", "Practice at 6");
    expect(logged).toEqual([{ teamId: TEAM, eventId: EVENT, sentBy: "captain-person", recipientCount: 2 }]);
  });

  it("accepts the upper-case UUIDs Swift sends", async () => {
    const { store } = fakeStore();
    const res = await app(store).request(
      "/v1/reminders",
      post({ ...valid, teamId: TEAM.toUpperCase(), rosterIds: [ROSTER_A.toUpperCase()] }),
    );
    expect(res.status).toBe(200);
    expect(store.membership).toHaveBeenCalledWith("user-1", TEAM);
    expect(store.recipients).toHaveBeenCalledWith(TEAM, [ROSTER_A]);
  });

  it("stops at the daily limit", async () => {
    const res = await app(fakeStore({ sentToday: DAILY_LIMIT }).store).request("/v1/reminders", post(valid));
    expect(res.status).toBe(429);
    expect(sendSms).not.toHaveBeenCalled();
  });

  it("refuses an empty message", async () => {
    const res = await app(fakeStore().store).request("/v1/reminders", post({ ...valid, message: "   " }));
    expect(res.status).toBe(400);
  });

  it("says so when nobody selected can be texted", async () => {
    const res = await app(fakeStore({ phones: [] }).store).request("/v1/reminders", post(valid));
    expect(res.status).toBe(400);
  });

  it("reports partial failures and logs only what went out", async () => {
    sendSms.mockImplementation(async (phone) => {
      if (phone === "14155550101") throw new Error("Unreachable");
    });
    const { store, logged } = fakeStore();
    const res = await app(store).request("/v1/reminders", post(valid));

    expect(await res.json()).toEqual({ sent: 1, failed: 1 });
    expect(logged[0]?.recipientCount).toBe(1);
  });

  it("logs nothing when every text fails", async () => {
    sendSms.mockRejectedValue(new Error("Twilio is down"));
    const { store, logged } = fakeStore();
    const res = await app(store).request("/v1/reminders", post(valid));

    expect(res.status).toBe(502);
    expect(logged).toEqual([]);
  });
});
