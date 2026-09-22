import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

export const ROOMS = ["living", "bedroom", "kitchen", "bathroom"] as const;
/** Existing example data predates the four-room scene. Keep those tasks visible. */
export function visibleRoom(value: string) {
  return value === "entry" ? "living" : value;
}
export function text(
  value: string,
  label: string,
  max: number,
  allowEmpty = false,
) {
  const cleaned = value.trim();
  if (
    (!cleaned && !allowEmpty) ||
    cleaned.length > max ||
    // Reject control characters while allowing normal multiline notes.
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(cleaned)
  ) {
    throw new ConvexError(
      `${label} must be ${allowEmpty ? "0" : "1"}–${max} characters.`,
    );
  }
  return cleaned;
}
export function tokenValue(token: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      token,
    )
  ) {
    throw new ConvexError(
      "Invalid home access link. Create a new home or use your saved link.",
    );
  }
  return token.toLowerCase();
}
export async function requireHome(ctx: QueryCtx | MutationCtx, token: string) {
  const home = await ctx.db
    .query("homes")
    .withIndex("by_token", (q) => q.eq("token", tokenValue(token)))
    .unique();
  if (!home) throw new ConvexError("Home not found. Check your access link.");
  return home;
}
export function amount(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000)
    throw new ConvexError("Amount must be between 0 and 1,000,000.");
  return Math.round(value * 100) / 100;
}
export function roomValue(value: string) {
  if (!(ROOMS as readonly string[]).includes(value))
    throw new ConvexError("Choose a valid room.");
  return value;
}
export function priorityValue(value: string) {
  if (!["high", "medium", "low"].includes(value))
    throw new ConvexError("Choose high, medium, or low priority.");
  return value;
}
export function dateValue(value: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  ) {
    throw new ConvexError("Use a valid move date (YYYY-MM-DD).");
  }
  return value;
}
export async function taskForHome(
  ctx: MutationCtx,
  homeId: Id<"homes">,
  taskId: Id<"tasks">,
) {
  const task = await ctx.db.get(taskId);
  if (!task || task.homeId !== homeId)
    throw new ConvexError("Task not found in this home.");
  return task;
}
export async function activity(
  ctx: MutationCtx,
  homeId: Id<"homes">,
  content: string,
) {
  await ctx.db.insert("activity", {
    homeId,
    text: content,
    createdAt: Date.now(),
  });
  const rows = await ctx.db
    .query("activity")
    .withIndex("by_home", (q) => q.eq("homeId", homeId))
    .order("desc")
    .take(110);
  for (const row of rows.slice(80)) await ctx.db.delete(row._id);
}
export async function limit(
  ctx: MutationCtx,
  key: string,
  duration: number,
  maximum: number,
) {
  const window = Math.floor(Date.now() / duration);
  const row = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  const count = row?.window === window ? row.count : 0;
  if (count >= maximum)
    throw new ConvexError("Request limit reached. Please try again later.");
  if (row) await ctx.db.patch(row._id, { window, count: count + 1 });
  else await ctx.db.insert("rateLimits", { key, window, count: 1 });
}
export async function editLimit(ctx: MutationCtx, homeId: Id<"homes">) {
  await limit(ctx, `${homeId}:edits`, 60_000, 60);
}
export function publicHome(home: Doc<"homes">) {
  return {
    _id: home._id,
    name: home.name,
    city: home.city,
    moveDate: home.moveDate,
    budget: home.budget,
    createdAt: home.createdAt,
    demo: home.demo,
    ...(home.inboxId ? { inboxId: home.inboxId } : {}),
  };
}
export function providerConfigured(
  provider: "firecrawl" | "openai" | "agentmail",
) {
  return (
    process.env.EXTERNAL_ACTIONS_ENABLED === "true" &&
    Boolean(process.env[`${provider.toUpperCase()}_API_KEY`]?.trim())
  );
}

/** We only hand public DNS URLs to Firecrawl; our backend never fetches user origins. */
export function safePublicUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const url = new URL(value.trim());
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      (url.port && !["80", "443"].includes(url.port))
    )
      return null;
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (
      !host.includes(".") ||
      host.includes(":") ||
      /^\d+(?:\.\d+){3}$/.test(host)
    )
      return null;
    if (
      /(^|\.)(localhost|local|internal|intranet|lan|home|corp|test|invalid|example|onion)$/.test(
        host,
      )
    )
      return null;
    if (/(^|\.)(localtest\.me|lvh\.me|nip\.io|sslip\.io)$/.test(host))
      return null;
    if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host)) return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}
export function researchInput(value: string) {
  const cleaned = text(value, "Search or URL", 2000);
  const looksLikeUrl =
    /^[a-z][a-z\d+.-]*:/i.test(cleaned) ||
    cleaned.startsWith("//") ||
    /^[^\s/]+\.[^\s/]+(?:[/?#]|$)/.test(cleaned);
  if (looksLikeUrl) {
    const candidate = cleaned.startsWith("//")
      ? `https:${cleaned}`
      : /^[a-z][a-z\d+.-]*:/i.test(cleaned)
        ? cleaned
        : `https://${cleaned}`;
    const url = safePublicUrl(candidate);
    if (!url)
      throw new ConvexError(
        "Paste a public HTTP or HTTPS website URL. Local addresses, IP addresses, credentials, and custom ports are not supported.",
      );
    return url;
  }
  return text(cleaned, "Search", 240);
}
