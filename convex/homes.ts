import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  activity,
  amount,
  dateValue,
  editLimit,
  limit,
  priorityValue,
  providerConfigured,
  publicHome,
  requireHome,
  researchInput,
  roomValue,
  taskForHome,
  text,
  tokenValue,
  visibleRoom,
} from "./lib";

const access = { token: v.string() };
const optionalTask = {
  room: v.optional(v.string()),
  title: v.optional(v.string()),
  cost: v.optional(v.number()),
  assignee: v.optional(v.string()),
  priority: v.optional(v.string()),
  note: v.optional(v.string()),
  done: v.optional(v.boolean()),
};
const optionalHome = {
  name: v.optional(v.string()),
  city: v.optional(v.string()),
  moveDate: v.optional(v.string()),
  budget: v.optional(v.number()),
};

export const getHome = query({
  args: access,
  handler: async (ctx, { token }) => {
    const home = await ctx.db
      .query("homes")
      .withIndex("by_token", (q) => q.eq("token", tokenValue(token)))
      .unique();
    if (!home) return null;
    const [tasks, sources, messages, events, jobs] = await Promise.all([
      ctx.db
        .query("tasks")
        .withIndex("by_home", (q) => q.eq("homeId", home._id))
        .take(100),
      ctx.db
        .query("sources")
        .withIndex("by_home", (q) => q.eq("homeId", home._id))
        .order("desc")
        .take(50),
      ctx.db
        .query("messages")
        .withIndex("by_home", (q) => q.eq("homeId", home._id))
        .order("desc")
        .take(100),
      ctx.db
        .query("activity")
        .withIndex("by_home", (q) => q.eq("homeId", home._id))
        .order("desc")
        .take(30),
      ctx.db
        .query("jobs")
        .withIndex("by_home", (q) => q.eq("homeId", home._id))
        .order("desc")
        .take(30),
    ]);
    return {
      home: publicHome(home),
      tasks: tasks
        .sort((a, b) => a.order - b.order)
        .map((task) => ({ ...task, room: visibleRoom(task.room) })),
      sources,
      messages,
      activity: events,
      jobs: jobs.map(({ input: _input, ...job }) => job),
      integrations: {
        firecrawl: providerConfigured("firecrawl"),
        openai: providerConfigured("openai"),
        agentmail: providerConfigured("agentmail"),
      },
    };
  },
});

const seedTasks = [
  {
    room: "living",
    title: "Measure the sofa wall and doorway",
    cost: 0,
    assignee: "You",
    priority: "high",
    done: true,
    note: "Demo task. Check doorway clearance before ordering.",
  },
  {
    room: "living",
    title: "Choose a sofa that fits the room",
    cost: 780,
    assignee: "Alex",
    priority: "medium",
    done: false,
    note: "Illustrative budget estimate, not a supplier quote.",
  },
  {
    room: "living",
    title: "Transfer the internet connection",
    cost: 50,
    assignee: "You",
    priority: "high",
    done: false,
    note: "Ask your provider about service at the new address.",
  },
  {
    room: "bedroom",
    title: "Pack a first-night essentials box",
    cost: 25,
    assignee: "Alex",
    priority: "high",
    done: true,
    note: "Sheets, charger, medication, toiletries and a change of clothes.",
  },
  {
    room: "bedroom",
    title: "Assemble the bed before unpacking",
    cost: 120,
    assignee: "You",
    priority: "high",
    done: false,
    note: "Illustrative assembly budget; confirm with a provider.",
  },
  {
    room: "kitchen",
    title: "Label boxes by cabinet",
    cost: 15,
    assignee: "Alex",
    priority: "medium",
    done: false,
    note: "Keep daily-use dishes in the first box.",
  },
  {
    room: "kitchen",
    title: "Clean appliances before moving in",
    cost: 85,
    assignee: "You",
    priority: "high",
    done: false,
    note: "Illustrative supplies budget.",
  },
  {
    room: "bathroom",
    title: "Set up towels and a shower curtain",
    cost: 65,
    assignee: "Alex",
    priority: "medium",
    done: false,
    note: "Measure the shower rail before buying.",
  },
  {
    room: "living",
    title: "Confirm keys and building move-in access",
    cost: 0,
    assignee: "You",
    priority: "high",
    done: true,
    note: "Confirm your booked time directly with the building.",
  },
  {
    room: "living",
    title: "Book a moving van",
    cost: 350,
    assignee: "You",
    priority: "high",
    done: false,
    note: "Illustrative estimate. Get a written quote including stairs and insurance.",
  },
];

export const createHome = mutation({
  args: { ...access, ...optionalHome, demo: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const token = tokenValue(args.token);
    const existing = await ctx.db
      .query("homes")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (existing) return existing._id;
    await limit(ctx, "global:create", 3_600_000, 200);
    const demo = args.demo ?? true;
    const homeId = await ctx.db.insert("homes", {
      token,
      name: text(args.name ?? "Our next chapter", "Home name", 80),
      city: text(args.city ?? "San Francisco", "City", 100),
      moveDate: dateValue(
        args.moveDate ??
          new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10),
      ),
      budget: amount(args.budget ?? 3500),
      createdAt: Date.now(),
      demo,
    });
    if (demo) {
      for (const [order, task] of seedTasks.entries())
        await ctx.db.insert("tasks", { ...task, homeId, order });
      await ctx.db.insert("sources", {
        homeId,
        title: "Moving checklist: official USPS change-of-address guide",
        url: "https://www.usps.com/manage/forward.htm",
        summary:
          "Reference link included with the example home. Open it to check the current official process; this has not been fetched by Firecrawl.",
        category: "Moving",
        capturedAt: Date.now(),
        status: "reference",
      });
    }
    await activity(
      ctx,
      homeId,
      demo
        ? "A private example home was created. Task costs are illustrative estimates."
        : "Your private home was created.",
    );
    return homeId;
  },
});

export const updateHome = mutation({
  args: { ...access, ...optionalHome },
  handler: async (ctx, args) => {
    const home = await requireHome(ctx, args.token);
    await editLimit(ctx, home._id);
    const patch: Partial<Doc<"homes">> = {};
    if (args.name !== undefined) patch.name = text(args.name, "Home name", 80);
    if (args.city !== undefined) patch.city = text(args.city, "City", 100);
    if (args.moveDate !== undefined) patch.moveDate = dateValue(args.moveDate);
    if (args.budget !== undefined) patch.budget = amount(args.budget);
    await ctx.db.patch(home._id, patch);
    await activity(ctx, home._id, "Home details updated.");
  },
});

export const addTask = mutation({
  args: { ...access, ...optionalTask, room: v.string(), title: v.string() },
  handler: async (ctx, args) => {
    const home = await requireHome(ctx, args.token);
    await editLimit(ctx, home._id);
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_home", (q) => q.eq("homeId", home._id))
      .take(100);
    if (tasks.length >= 100)
      throw new ConvexError("This home has reached its limit of 100 tasks.");
    const title = text(args.title, "Task title", 160);
    const id = await ctx.db.insert("tasks", {
      homeId: home._id,
      room: roomValue(args.room),
      title,
      cost: amount(args.cost ?? 0),
      assignee: text(args.assignee ?? "Unassigned", "Assignee", 60),
      priority: priorityValue(args.priority ?? "medium"),
      note: text(args.note ?? "", "Note", 2000, true),
      done: args.done ?? false,
      order: Math.max(-1, ...tasks.map((t) => t.order)) + 1,
    });
    await activity(ctx, home._id, `Added: ${title}`);
    return id;
  },
});

export const updateTask = mutation({
  args: { ...access, taskId: v.id("tasks"), ...optionalTask },
  handler: async (ctx, args) => {
    const home = await requireHome(ctx, args.token);
    await editLimit(ctx, home._id);
    await taskForHome(ctx, home._id, args.taskId);
    const patch: Partial<Doc<"tasks">> = {};
    if (args.room !== undefined) patch.room = roomValue(args.room);
    if (args.title !== undefined)
      patch.title = text(args.title, "Task title", 160);
    if (args.cost !== undefined) patch.cost = amount(args.cost);
    if (args.assignee !== undefined)
      patch.assignee = text(args.assignee, "Assignee", 60);
    if (args.priority !== undefined)
      patch.priority = priorityValue(args.priority);
    if (args.note !== undefined)
      patch.note = text(args.note, "Note", 2000, true);
    if (args.done !== undefined) patch.done = args.done;
    await ctx.db.patch(args.taskId, patch);
    await activity(ctx, home._id, "A room task was updated.");
  },
});
export const toggleTask = mutation({
  args: { ...access, taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const home = await requireHome(ctx, args.token);
    await editLimit(ctx, home._id);
    const task = await taskForHome(ctx, home._id, args.taskId);
    await ctx.db.patch(task._id, { done: !task.done });
    await activity(
      ctx,
      home._id,
      `${task.done ? "Reopened" : "Completed"}: ${task.title}`,
    );
  },
});
export const deleteTask = mutation({
  args: { ...access, taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const home = await requireHome(ctx, args.token);
    await editLimit(ctx, home._id);
    const task = await taskForHome(ctx, home._id, args.taskId);
    await ctx.db.delete(task._id);
    await activity(ctx, home._id, `Removed: ${task.title}`);
  },
});

async function queue(
  ctx: MutationCtx,
  homeId: Id<"homes">,
  type: string,
  provider: "firecrawl" | "openai" | "agentmail",
  input = "",
  messageId?: Id<"messages">,
) {
  if (!providerConfigured(provider))
    throw new ConvexError(
      `${provider === "openai" ? "OpenAI" : provider === "agentmail" ? "AgentMail" : "Firecrawl"} is not enabled. The deployment owner must configure the provider key and enable external actions after checking available credits.`,
    );
  const recent = await ctx.db
    .query("jobs")
    .withIndex("by_home", (q) => q.eq("homeId", homeId))
    .order("desc")
    .take(50);
  const pending = recent.find(
    (j) =>
      (j.status === "queued" || j.status === "running") &&
      (j.type === type ||
        (provider === "agentmail" &&
          ["sendEmail", "syncInbox"].includes(j.type))),
  );
  if (pending)
    throw new ConvexError(
      "A related request is already running. Wait for it to finish.",
    );
  await limit(ctx, `${homeId}:${provider}:minute`, 60_000, 3);
  await limit(ctx, `${homeId}:${provider}:day`, 86_400_000, 20);
  await limit(ctx, `global:${provider}:day`, 86_400_000, 100);
  const jobId = await ctx.db.insert("jobs", {
    homeId,
    type,
    status: "queued",
    createdAt: Date.now(),
    input,
    ...(messageId ? { messageId } : {}),
  });
  for (const old of recent.slice(39))
    if (!["queued", "running"].includes(old.status))
      await ctx.db.delete(old._id);
  await ctx.scheduler.runAfter(0, internal.providers.run, { jobId });
  await ctx.scheduler.runAfter(120_000, internal.providers.expire, { jobId });
  return jobId;
}
export const research = mutation({
  args: { ...access, query: v.string() },
  handler: async (ctx, args) => {
    const home = await requireHome(ctx, args.token);
    return queue(
      ctx,
      home._id,
      "research",
      "firecrawl",
      researchInput(args.query),
    );
  },
});
export const plan = mutation({
  args: { ...access, prompt: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const home = await requireHome(ctx, args.token);
    return queue(
      ctx,
      home._id,
      "plan",
      "openai",
      text(
        args.prompt ?? "Suggest the next practical steps for our move.",
        "Planning request",
        1200,
      ),
    );
  },
});
export const draftEmail = mutation({
  args: {
    ...access,
    recipient: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const home = await requireHome(ctx, args.token);
    await editLimit(ctx, home._id);
    const recipient = text(args.recipient, "Recipient", 254);
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(recipient))
      throw new ConvexError("Enter one valid recipient email address.");
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_home", (q) => q.eq("homeId", home._id))
      .take(100);
    if (messages.length >= 100)
      throw new ConvexError("This home has reached its limit of 100 messages.");
    const id = await ctx.db.insert("messages", {
      homeId: home._id,
      recipient,
      subject: text(args.subject, "Subject", 160),
      body: text(args.body, "Message", 8000),
      status: "draft",
      createdAt: Date.now(),
    });
    await activity(
      ctx,
      home._id,
      "Email draft saved for review. Nothing was sent.",
    );
    return id;
  },
});
export const sendEmail = mutation({
  args: { ...access, messageId: v.id("messages"), approval: v.boolean() },
  handler: async (ctx, args) => {
    const home = await requireHome(ctx, args.token);
    const message = await ctx.db.get(args.messageId);
    if (!message || message.homeId !== home._id)
      throw new ConvexError("Message not found in this home.");
    if (!args.approval)
      throw new ConvexError(
        "Review and approve the recipient and message before sending.",
      );
    const allowed = (process.env.AGENTMAIL_ALLOWED_RECIPIENTS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (!allowed.includes(message.recipient.toLowerCase()))
      throw new ConvexError(
        "Test emails can only be sent to a recipient approved by the deployment owner.",
      );
    if (["queued", "sending", "sent"].includes(message.status))
      return { messageId: message._id, status: message.status };
    if (message.status !== "draft")
      throw new ConvexError(
        "This message cannot be resent. Check the inbox before creating another draft.",
      );
    const jobId = await queue(
      ctx,
      home._id,
      "sendEmail",
      "agentmail",
      "",
      message._id,
    );
    await ctx.db.patch(message._id, { status: "queued" });
    await activity(ctx, home._id, "Approved email queued for delivery.");
    return { messageId: message._id, status: "queued", jobId };
  },
});
export const syncInbox = mutation({
  args: access,
  handler: async (ctx, args) => {
    const home = await requireHome(ctx, args.token);
    return queue(ctx, home._id, "syncInbox", "agentmail");
  },
});
