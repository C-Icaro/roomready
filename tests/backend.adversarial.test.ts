import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");
const TOKEN = crypto.randomUUID();
const setup = () => convexTest(schema, modules);
let tests: ReturnType<typeof setup>[];
function backend() {
  const t = setup();
  tests.push(t);
  return t;
}
function json(value: unknown) {
  return new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
  });
}
async function homeWithInbox(t: ReturnType<typeof setup>) {
  const homeId = await t.mutation(api.homes.createHome, {
    token: TOKEN,
    demo: false,
  });
  await t.run((ctx) =>
    ctx.db.patch(homeId, { inboxId: "controlled@agentmail.to" }),
  );
}
async function homeWithSources(t: ReturnType<typeof setup>, count = 50) {
  const homeId = await t.mutation(api.homes.createHome, {
    token: TOKEN,
    demo: false,
  });
  await t.run(async (ctx) => {
    for (let index = 0; index < count; index++)
      await ctx.db.insert("sources", {
        homeId,
        title: `Saved source ${index}`,
        url: `https://example.com/source-${index}`,
        summary: "Original excerpt.",
        category: "Scraped page",
        status: "live",
        capturedAt: Date.now(),
      });
  });
  return homeId;
}

beforeEach(() => {
  tests = [];
  vi.useFakeTimers();
  vi.stubEnv("EXTERNAL_ACTIONS_ENABLED", "true");
  vi.stubEnv("FIRECRAWL_API_KEY", "test-firecrawl");
  vi.stubEnv("OPENAI_API_KEY", "test-openai");
  vi.stubEnv("AGENTMAIL_API_KEY", "test-agentmail");
  vi.stubEnv("AGENTMAIL_ALLOWED_RECIPIENTS", "controlled@example.com");
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.reject(new Error("Unexpected network access in test.")),
    ),
  );
});
afterEach(async () => {
  for (const t of tests) await t.finishAllScheduledFunctions(vi.runAllTimers);
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("adversarial provider boundaries", () => {
  it("counts task records, not distinct titles, when enforcing the AI task limit", async () => {
    const t = backend();
    const homeId = await t.mutation(api.homes.createHome, {
      token: TOKEN,
      demo: false,
    });
    await t.run(async (ctx) => {
      for (let order = 0; order < 99; order++)
        await ctx.db.insert("tasks", {
          homeId,
          room: "living",
          title: "Repeated title",
          done: false,
          cost: 0,
          assignee: "Unassigned",
          priority: "medium",
          note: "",
          order,
        });
    });
    const jobId = await t.mutation(api.homes.plan, { token: TOKEN });
    await t.mutation(internal.providers.claim, { jobId });
    // A collaborator fills the final slot while the provider request is running.
    await t.mutation(api.homes.addTask, {
      token: TOKEN,
      room: "living",
      title: "Repeated title",
    });
    await t.mutation(internal.providers.finish, {
      jobId,
      result: "Suggestions added.",
      suggestions: [
        { room: "living", title: "An additional task", note: "Review this." },
      ],
    });
    const rows = await t.run((ctx) =>
      ctx.db
        .query("tasks")
        .withIndex("by_home", (q) => q.eq("homeId", homeId))
        .collect(),
    );
    expect(rows).toHaveLength(100);
    expect(
      (await t.query(api.homes.getHome, { token: TOKEN }))?.jobs[0].result,
    ).toContain("No tasks were added");
    await expect(t.mutation(api.homes.plan, { token: TOKEN })).rejects.toThrow(
      "100 tasks",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("applies the response limit to bytes, including multibyte provider text", async () => {
    const t = backend();
    await t.mutation(api.homes.createHome, { token: TOKEN, demo: false });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json({
          success: true,
          data: { web: [] },
          padding: "é".repeat(300_001),
        }),
      ),
    );
    const jobId = await t.mutation(api.homes.research, {
      token: TOKEN,
      query: "sofa",
    });
    await t.action(internal.providers.run, { jobId });
    expect(
      (await t.query(api.homes.getHome, { token: TOKEN }))?.jobs[0].status,
    ).toBe("failed");
  });

  it("cancels an oversized streaming response before reading its remaining body", async () => {
    const t = backend();
    await t.mutation(api.homes.createHome, { token: TOKEN, demo: false });
    let pulled = 0;
    let canceled = false;
    const encoder = new TextEncoder();
    const chunks = [
      '{"success":true,"data":{"web":[]},"padding":"',
      ...Array.from({ length: 12 }, () => "x".repeat(100_000)),
      '"}',
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            new ReadableStream<Uint8Array>(
              {
                pull(controller) {
                  if (pulled >= chunks.length) controller.close();
                  else controller.enqueue(encoder.encode(chunks[pulled++]));
                },
                cancel() {
                  canceled = true;
                },
              },
              { highWaterMark: 0 },
            ),
          ),
      ),
    );
    const jobId = await t.mutation(api.homes.research, {
      token: TOKEN,
      query: "sofa",
    });
    await t.action(internal.providers.run, { jobId });
    expect(
      (await t.query(api.homes.getHome, { token: TOKEN }))?.jobs[0].status,
    ).toBe("failed");
    expect(canceled).toBe(true);
    expect(pulled).toBeLessThan(chunks.length);
  });
});

describe("source storage capacity", () => {
  it.each(["https://example.com/new-source", "new sofa research"])(
    "does not request a provider for %s when all source slots are occupied",
    async (query) => {
      const t = backend();
      await homeWithSources(t);
      const jobId = await t.mutation(api.homes.research, {
        token: TOKEN,
        query,
      });
      await t.action(internal.providers.run, { jobId });
      const view = await t.query(api.homes.getHome, { token: TOKEN });
      expect(fetch).not.toHaveBeenCalled();
      expect(view?.sources).toHaveLength(50);
      expect(view?.jobs[0]).toMatchObject({
        status: "failed",
        error: expect.stringContaining("No provider request was made"),
      });
    },
  );

  it("refreshes an existing URL at capacity, including a source outside the latest eight", async () => {
    const t = backend();
    await homeWithSources(t);
    const mock = vi.fn(async () =>
      json({
        success: true,
        data: {
          markdown: "Refreshed dimensions: 180 cm.",
          metadata: {
            title: "Current dimensions",
            sourceURL: "https://example.com/source-0",
          },
        },
      }),
    );
    vi.stubGlobal("fetch", mock);
    const jobId = await t.mutation(api.homes.research, {
      token: TOKEN,
      query: "https://example.com/source-0",
    });
    await t.action(internal.providers.run, { jobId });
    const view = await t.query(api.homes.getHome, { token: TOKEN });
    expect(mock).toHaveBeenCalledTimes(1);
    expect(view?.sources).toHaveLength(50);
    expect(
      view?.sources.find((source) => source.url.endsWith("/source-0"))?.summary,
    ).toBe("Refreshed dimensions: 180 cm.");
    expect(view?.jobs[0]).toMatchObject({
      status: "completed",
      result: expect.stringContaining("Saved or refreshed 1 source"),
    });
  });

  it("reports no saved source if the final slot fills while a request is running", async () => {
    const t = backend();
    const homeId = await homeWithSources(t, 49);
    const jobId = await t.mutation(api.homes.research, {
      token: TOKEN,
      query: "https://example.com/new-source",
    });
    expect(
      await t.mutation(internal.providers.claim, { jobId }),
    ).not.toBeNull();
    // Simulate a competing completion after the worker's preflight.
    await t.run((ctx) =>
      ctx.db.insert("sources", {
        homeId,
        title: "Concurrent source",
        url: "https://example.com/concurrent",
        summary: "Another result.",
        category: "Research",
        status: "live",
        capturedAt: Date.now(),
      }),
    );
    await t.mutation(internal.providers.finish, {
      jobId,
      result: "Saved a live page excerpt with its source URL.",
      sources: [
        {
          title: "New source",
          url: "https://example.com/new-source",
          summary: "Fresh excerpt.",
          category: "Scraped page",
        },
      ],
    });
    const view = await t.query(api.homes.getHome, { token: TOKEN });
    expect(view?.sources).toHaveLength(50);
    expect(
      view?.sources.some((source) => source.url.endsWith("/new-source")),
    ).toBe(false);
    expect(view?.jobs[0].result).toContain("No sources were saved");
    expect(view?.jobs[0].result).not.toContain("Saved a live");
  });

  it("keeps planner evidence bounded to eight sources after the capacity preflight change", async () => {
    const t = backend();
    await homeWithSources(t);
    const jobId = await t.mutation(api.homes.plan, { token: TOKEN });
    const context = await t.mutation(internal.providers.claim, { jobId });
    expect(context?.sources).toHaveLength(8);
    await t.mutation(internal.providers.fail, {
      jobId,
      error: "Fixture finished without calling a provider.",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("bounded read-only provider retries", () => {
  it.each([502, 503, 504])(
    "retries one AgentMail GET after HTTP %i and saves the successful result",
    async (status) => {
      const t = backend();
      await homeWithInbox(t);
      const mock = vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status }))
        .mockResolvedValueOnce(
          json({
            messages: [
              {
                message_id: "received-retry",
                from: "controlled@example.com",
                subject: "Confirmed",
                text: "Move-in access confirmed.",
              },
            ],
          }),
        );
      vi.stubGlobal("fetch", mock);
      const jobId = await t.mutation(api.homes.syncInbox, { token: TOKEN });
      await t.action(internal.providers.run, { jobId });
      expect(mock).toHaveBeenCalledTimes(2);
      expect(mock.mock.calls.every(([, init]) => init.method === "GET")).toBe(
        true,
      );
      expect(mock.mock.calls[0][1].signal).toBe(mock.mock.calls[1][1].signal);
      const view = await t.query(api.homes.getHome, { token: TOKEN });
      expect(view?.jobs[0].status).toBe("completed");
      expect(view?.messages).toHaveLength(1);
    },
  );

  it("stops at two GET attempts when the transient error persists", async () => {
    const t = backend();
    await homeWithInbox(t);
    const mock = vi.fn(async () => new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", mock);
    const jobId = await t.mutation(api.homes.syncInbox, { token: TOKEN });
    await t.action(internal.providers.run, { jobId });
    expect(mock).toHaveBeenCalledTimes(2);
    expect(
      (await t.query(api.homes.getHome, { token: TOKEN }))?.jobs[0].status,
    ).toBe("failed");
  });

  it.each([401, 402, 403, 429, 500])(
    "does not retry GET HTTP %i",
    async (status) => {
      const t = backend();
      await homeWithInbox(t);
      const mock = vi.fn(async () => new Response(null, { status }));
      vi.stubGlobal("fetch", mock);
      const jobId = await t.mutation(api.homes.syncInbox, { token: TOKEN });
      await t.action(internal.providers.run, { jobId });
      expect(mock).toHaveBeenCalledTimes(1);
      expect(
        (await t.query(api.homes.getHome, { token: TOKEN }))?.jobs[0].status,
      ).toBe("failed");
    },
  );

  it.each(["research", "plan", "sendEmail"] as const)(
    "does not retry a %s POST on a transient HTTP error",
    async (type) => {
      const t = backend();
      await homeWithInbox(t);
      const mock = vi.fn(async () => new Response(null, { status: 503 }));
      vi.stubGlobal("fetch", mock);
      let jobId;
      if (type === "research")
        jobId = await t.mutation(api.homes.research, {
          token: TOKEN,
          query: "sofa",
        });
      else if (type === "plan")
        jobId = await t.mutation(api.homes.plan, { token: TOKEN });
      else {
        const messageId = await t.mutation(api.homes.draftEmail, {
          token: TOKEN,
          recipient: "controlled@example.com",
          subject: "Move-in access",
          body: "Please confirm access.",
        });
        const approved = await t.mutation(api.homes.sendEmail, {
          token: TOKEN,
          messageId,
          approval: true,
        });
        if (!("jobId" in approved) || !approved.jobId)
          throw new Error("Expected a queued send.");
        jobId = approved.jobId;
      }
      await t.action(internal.providers.run, { jobId });
      expect(mock).toHaveBeenCalledTimes(1);
      expect(
        (mock.mock.calls[0] as unknown as [string, RequestInit])[1].method,
      ).toBe("POST");
      const view = await t.query(api.homes.getHome, { token: TOKEN });
      expect(view?.jobs[0].status).toBe("failed");
      if (type === "sendEmail")
        expect(view?.messages[0].status).toBe("uncertain");
    },
  );

  it("shares one 25-second timeout across both attempts and never retries a timeout", async () => {
    const t = backend();
    await homeWithInbox(t);
    let attempts = 0;
    const mock = vi.fn(async (_url: string, init: RequestInit) => {
      attempts++;
      if (attempts === 1) {
        await vi.advanceTimersByTimeAsync(20_000);
        return new Response(null, { status: 503 });
      }
      const signal = init.signal!;
      await vi.advanceTimersByTimeAsync(5_000);
      expect(signal.aborted).toBe(true);
      signal.throwIfAborted();
      return json({ messages: [] });
    });
    vi.stubGlobal("fetch", mock);
    const started = Date.now();
    const jobId = await t.mutation(api.homes.syncInbox, { token: TOKEN });
    await t.action(internal.providers.run, { jobId });
    expect(Date.now() - started).toBe(25_000);
    expect(mock).toHaveBeenCalledTimes(2);
    expect(
      (await t.query(api.homes.getHome, { token: TOKEN }))?.jobs[0].status,
    ).toBe("failed");
  });

  it.each(["network failure", "timeout"])(
    "does not retry an ambiguous %s on the first GET",
    async (failure) => {
      const t = backend();
      await homeWithInbox(t);
      const mock = vi.fn(async (_url: string, init: RequestInit) => {
        if (failure === "timeout") {
          await vi.advanceTimersByTimeAsync(25_000);
          init.signal!.throwIfAborted();
        }
        throw new Error("Connection lost");
      });
      vi.stubGlobal("fetch", mock);
      const jobId = await t.mutation(api.homes.syncInbox, { token: TOKEN });
      await t.action(internal.providers.run, { jobId });
      expect(mock).toHaveBeenCalledTimes(1);
      expect(
        (await t.query(api.homes.getHome, { token: TOKEN }))?.jobs[0].status,
      ).toBe("failed");
    },
  );
});
