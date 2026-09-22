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
