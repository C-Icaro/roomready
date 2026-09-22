import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useConvexConnectionState } from "convex/react";
import { api } from "../convex/_generated/api";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "../convex/_generated/dataModel";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  Check,
  ChevronDown,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Home,
  ListChecks,
  Search,
  Mail,
  Share2,
  CalendarDays,
  Box,
  X,
  LoaderCircle,
  Globe2,
  ExternalLink,
  RefreshCw,
  Send,
  Trash2,
  CheckCheck,
  CircleHelp,
  Compass,
  Copy,
  Leaf,
} from "lucide-react";
import { rooms, money, daysUntil } from "./lib/rooms";
import type { RoomId } from "./lib/rooms";
import { Modal } from "./components/Modal";
const HomeScene = lazy(() => import("./components/HomeScene"));

type Tab = "home" | "plan" | "discover" | "inbox";
type ModalName =
  "task" | "settings" | "share" | "compose" | "assistant" | "help" | null;
function getToken() {
  const shared = new URLSearchParams(location.hash.slice(1)).get("home");
  const saved = localStorage.getItem("roomready-home");
  const valid = (value: string | null): value is string =>
    !!value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  const token = valid(shared)
    ? shared
    : valid(saved)
      ? saved
      : crypto.randomUUID();
  if (shared && !valid(shared))
    history.replaceState(null, "", location.pathname + location.search);
  localStorage.setItem("roomready-home", token);
  return token;
}
export default function App() {
  const [token, setToken] = useState(getToken);
  const data = useQuery(api.homes.getHome, { token });
  const createHome = useMutation(api.homes.createHome);
  const updateHome = useMutation(api.homes.updateHome);
  const addTask = useMutation(api.homes.addTask);
  const updateTask = useMutation(api.homes.updateTask);
  const deleteTask = useMutation(api.homes.deleteTask);
  const research = useMutation(api.homes.research);
  const plan = useMutation(api.homes.plan);
  const draftEmail = useMutation(api.homes.draftEmail);
  const sendEmail = useMutation(api.homes.sendEmail);
  const syncInbox = useMutation(api.homes.syncInbox);
  const connection = useConvexConnectionState();
  const [tab, setTab] = useState<Tab>("home");
  const [room, setRoom] = useState<RoomId | "all">("all");
  const [modal, setModal] = useState<ModalName>(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showDone, setShowDone] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [sceneMode, setSceneMode] = useState<"3d" | "plan">("3d");
  const [editing, setEditing] = useState<Doc<"tasks"> | null>(null);
  const [sending, setSending] = useState<Id<"messages"> | null>(null);
  const initialized = useRef("");
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const changed = () => {
      setToken(getToken());
      setRoom("all");
      setError("");
    };
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  useEffect(() => {
    if (data === null && initialized.current !== token) {
      initialized.current = token;
      createHome({ token, demo: true }).catch((e) => {
        setError(errorText(e));
        initialized.current = "";
      });
    }
  }, [data, token, createHome]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const onScroll = () => {
      const max = Math.max(
        1,
        (sectionRef.current?.offsetHeight || innerHeight) - innerHeight,
      );
      setScrollProgress(Math.min(1, Math.max(0, window.scrollY / max)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [tab]);
  async function perform(fn: () => Promise<unknown>, success?: string) {
    setError("");
    setBusy(true);
    try {
      await fn();
      if (success) setToast(success);
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  function navigate(next: Tab) {
    setTab(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function focusRoom(next: RoomId | "all") {
    setRoom(next);
    if (tab !== "home" && tab !== "plan") navigate("home");
  }
  if (!data)
    return (
      <main className="connection-screen">
        <div className="brand">
          <span className="brand-mark">
            <Home />
          </span>
          roomready<span className="brand-dot">®</span>
        </div>
        <LoaderCircle className="spin" size={28} />
        <h1>Making a little room for you.</h1>
        <p>{error || "Opening your own shared home..."}</p>
        {error && (
          <button className="primary" onClick={() => location.reload()}>
            Try again
          </button>
        )}
      </main>
    );
  const { home, tasks, sources, messages, activity, jobs, integrations } = data;
  const done = tasks.filter((t) => t.done).length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const cost = tasks.reduce((sum, t) => sum + t.cost, 0);
  const selectedRoom = rooms.find((r) => r.id === room);
  const filtered = tasks.filter(
    (t) =>
      (room === "all" || t.room === room) &&
      (showDone || !t.done) &&
      t.title.toLowerCase().includes(searchText.toLowerCase()),
  );
  const remaining = tasks.filter((t) => !t.done);
  const roomRemaining = remaining.filter(
    (t) => room === "all" || t.room === room,
  );
  const roomProgress = Object.fromEntries(
    rooms.map((r) => {
      const list = tasks.filter((t) => t.room === r.id);
      return [
        r.id,
        list.length ? list.filter((t) => t.done).length / list.length : 0,
      ];
    }),
  );
  const moveDateLabel = new Date(
    home.moveDate + "T12:00:00",
  ).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const jobRunning = jobs.some(
    (j) => j.status === "queued" || j.status === "running",
  );

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to workspace
      </a>
      <header className="topbar">
        <button
          className="brand"
          aria-label="RoomReady home"
          onClick={() => navigate("home")}
        >
          <span className="brand-mark">
            <Home size={22} />
          </span>
          roomready<span className="brand-dot">®</span>
        </button>
        <nav className="topnav" aria-label="Workspace">
          {(
            [
              { id: "home", label: "My home", icon: Home },
              { id: "plan", label: "Move plan", icon: ListChecks },
              { id: "discover", label: "Discover", icon: Compass },
              { id: "inbox", label: "Inbox", icon: Mail },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              aria-current={tab === item.id ? "page" : undefined}
              className={tab === item.id ? "active" : ""}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={17} />
              {item.label}
              {item.id === "inbox" &&
                messages.filter((m) => m.status === "received").length > 0 && (
                  <span className="count-badge">
                    {messages.filter((m) => m.status === "received").length}
                  </span>
                )}
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <span
            className={`connection ${connection.isWebSocketConnected ? "online" : ""}`}
          >
            {connection.isWebSocketConnected ? "Saved live" : "Reconnecting"}
          </span>
          <button className="share-button" onClick={() => setModal("share")}>
            <Share2 size={16} />
            <span>Share home</span>
          </button>
          <button
            className="avatar"
            onClick={() => setModal("settings")}
            aria-label="Home settings"
          >
            Y
          </button>
        </div>
      </header>
      <aside className="rail" aria-label="Room navigation">
        <div className="rail-top">
          <button
            className={room === "all" ? "selected" : ""}
            aria-label="All rooms"
            onClick={() => focusRoom("all")}
          >
            <Home size={21} />
          </button>
          <span className="rail-divider" />
          {rooms.map((r) => (
            <button
              key={r.id}
              className={room === r.id ? "selected" : ""}
              aria-label={r.name}
              onClick={() => focusRoom(r.id)}
            >
              <r.icon size={21} />
              <span className="rail-tooltip">{r.name}</span>
            </button>
          ))}
        </div>
        <button
          aria-label="Help and keyboard controls"
          onClick={() => setModal("help")}
        >
          <CircleHelp size={22} />
        </button>
      </aside>
      <main id="main-content" className={`workspace tab-${tab}`}>
        {home.demo && (
          <div className="demo-strip">
            <span>
              <span className="tiny-label">SAMPLE HOME</span> Your own space to
              explore. Changes are saved.
            </span>
            <button onClick={() => setModal("settings")}>
              Make it yours <ArrowUpRight size={13} />
            </button>
          </div>
        )}
        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button
              className="icon-button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              <X size={18} />
            </button>
          </div>
        )}
        {tab === "home" && (
          <section className="home-story" ref={sectionRef}>
            <div className="home-sticky">
              <div className="workspace-heading">
                <div>
                  <div className="eyebrow">
                    <span className="little-square" /> A LITTLE CLOSER TO HOME
                  </div>
                  <h1>
                    {room === "all" ? "A fresh start." : selectedRoom?.name}
                    <br />
                    {room === "all" ? (
                      <span>Coming together.</span>
                    ) : (
                      <span>Make it yours.</span>
                    )}
                  </h1>
                  <p>
                    {room === "all"
                      ? `Your ${home.name.toLowerCase()}, one small step at a time.`
                      : selectedRoom?.description}
                  </p>
                </div>
                <button
                  className="date-pill"
                  onClick={() => setModal("settings")}
                >
                  <CalendarDays size={18} />
                  <span>
                    Moving {moveDateLabel}
                    <strong>{daysUntil(home.moveDate)} days to go</strong>
                  </span>
                  <ChevronDown size={14} />
                </button>
              </div>
              <div className="scene-layout">
                <div className="room-overview">
                  <div className="subheading">
                    YOUR ROOMS <span>04</span>
                  </div>
                  {rooms.map((r) => {
                    const list = tasks.filter((t) => t.room === r.id);
                    const n = list.filter((t) => t.done).length;
                    return (
                      <button
                        className={`room-item ${room === r.id ? "active" : ""}`}
                        key={r.id}
                        onClick={() => setRoom(room === r.id ? "all" : r.id)}
                      >
                        <span
                          className="room-icon"
                          style={{ background: r.color + "45" }}
                        >
                          <r.icon size={19} />
                        </span>
                        <span>
                          <strong>{r.name}</strong>
                          <small>
                            {n} of {list.length} ready
                          </small>
                        </span>
                        <span
                          className="mini-ring"
                          style={
                            {
                              "--progress": `${roomProgress[r.id] * 100}%`,
                              "--ring-color": r.color,
                            } as React.CSSProperties
                          }
                        >
                          {roomProgress[r.id] === 1 ? (
                            <Check size={10} />
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                  <button
                    className="text-button all-view"
                    onClick={() => {
                      setRoom("all");
                      setScrollProgress(0);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    View whole home <ArrowUpRight size={15} />
                  </button>
                  <div className="material-note">
                    <Leaf size={16} />
                    <span>
                      A little less chaos.
                      <br />A lot more home.
                    </span>
                  </div>
                </div>
                <div className="scene-wrap">
                  <div className="scene-topline">
                    <span>
                      <span className="location-dot" />
                      {home.city} <span className="muted">/</span> {home.name}
                    </span>
                    <div className="segmented" aria-label="Home view">
                      <button
                        className={sceneMode === "3d" ? "active" : ""}
                        onClick={() => setSceneMode("3d")}
                      >
                        3D
                      </button>
                      <button
                        className={sceneMode === "plan" ? "active" : ""}
                        onClick={() => setSceneMode("plan")}
                      >
                        Plan
                      </button>
                    </div>
                  </div>
                  <Suspense
                    fallback={
                      <div className="scene-loading">
                        <LoaderCircle className="spin" />
                        <span>Building your home...</span>
                      </div>
                    }
                  >
                    <HomeScene
                      selectedRoom={room}
                      onSelectRoom={setRoom}
                      progress={scrollProgress}
                      roomProgress={roomProgress}
                      planView={sceneMode === "plan"}
                    />
                  </Suspense>
                  <div className="scene-caption">
                    <span className="caption-number">
                      0{Math.min(3, Math.floor(scrollProgress * 3) + 1)}
                    </span>
                    <span>
                      {scrollProgress < 0.33
                        ? "A home, with a plan."
                        : scrollProgress < 0.66
                          ? "Every little detail matters."
                          : "Your first night, taken care of."}
                    </span>
                  </div>
                  <span className="scene-hint">
                    {sceneMode === "3d"
                      ? "Scroll to explore · Select a room"
                      : "Select a room to see its move plan"}
                  </span>
                </div>
                <div className="next-card">
                  <div className="card-eyebrow">
                    YOUR NEXT SMALL STEP <Sparkles size={15} />
                  </div>
                  <div className="next-icon">
                    <Box size={30} strokeWidth={1.3} />
                  </div>
                  <h2>{roomRemaining[0]?.title || "Welcome home."}</h2>
                  <p>
                    {roomRemaining[0]?.note ||
                      "The essentials are taken care of. Take a breath and enjoy your new space."}
                  </p>
                  {roomRemaining[0] && (
                    <>
                      <div className="next-meta">
                        <span>
                          {
                            rooms.find((r) => r.id === roomRemaining[0].room)
                              ?.name
                          }
                        </span>
                        <span>
                          {roomRemaining[0].priority === "high"
                            ? "Do this first"
                            : "On your list"}
                        </span>
                      </div>
                      <button
                        className="primary"
                        onClick={() =>
                          perform(
                            () =>
                              updateTask({
                                token,
                                taskId: roomRemaining[0]._id,
                                done: true,
                              }),
                            "One step closer to home.",
                          )
                        }
                      >
                        <Check size={16} /> Mark as done
                      </button>
                    </>
                  )}
                  <button
                    className="text-button"
                    onClick={() => navigate("plan")}
                  >
                    See your move plan <ArrowRight size={16} />
                  </button>
                </div>
              </div>
              <div className="bottom-summary">
                <div className="readiness">
                  <div className="readiness-value">
                    {progress}
                    <span>%</span>
                  </div>
                  <div>
                    <strong>Home, almost home.</strong>
                    <span>
                      {done} of {tasks.length} things taken care of
                    </span>
                    <div className="progress-track">
                      <i style={{ width: progress + "%" }} />
                    </div>
                  </div>
                </div>
                <div className="budget-summary">
                  <span className="summary-label">PLANNED BUDGET</span>
                  <strong>
                    {money(cost)} <small>/ {money(home.budget)}</small>
                  </strong>
                  <span className={cost > home.budget ? "over-budget" : ""}>
                    {cost > home.budget
                      ? `${money(cost - home.budget)} over budget`
                      : `${money(home.budget - cost)} breathing room`}
                  </span>
                </div>
                <button
                  className="assistant-entry"
                  onClick={() => setModal("assistant")}
                >
                  <span className="sparkle-tile">
                    <Sparkles size={21} />
                  </span>
                  <span>
                    <strong>A little help goes a long way.</strong>
                    <small>Let’s work out your next steps</small>
                  </span>
                  <ArrowUpRight size={20} />
                </button>
                <div className="scroll-cue">
                  <ArrowDown size={18} />
                  <span>
                    SCROLL TO
                    <br />
                    SETTLE IN
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}
        {tab === "plan" && (
          <section className="page-content">
            <PageHeading
              eyebrow="ONE THING AT A TIME"
              title="Your move, made manageable."
              description={`${done} things done. ${remaining.length} small steps to your new home.`}
            >
              <button className="primary" onClick={() => setModal("task")}>
                <Plus size={18} /> Add a task
              </button>
            </PageHeading>
            <JobStatus jobs={jobs.filter((j) => j.type === "plan")} />
            <div className="plan-stats">
              <Stat
                label="HOME READINESS"
                value={progress + "%"}
                detail={`${done} of ${tasks.length} tasks complete`}
              />
              <Stat
                label="PLANNED SPEND"
                value={money(cost)}
                detail={`Budget: ${money(home.budget)}`}
              />
              <Stat
                label="MOVE-IN DAY"
                value={moveDateLabel}
                detail={`${daysUntil(home.moveDate)} days to make it happen`}
              />
            </div>
            <div className="plan-toolbar">
              <RoomFilter room={room} setRoom={setRoom} />
              <div className="plan-controls">
                <label className="search-field">
                  <Search size={17} />
                  <input
                    aria-label="Search tasks"
                    placeholder="Find a task..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </label>
                <button
                  className="subtle-button"
                  aria-pressed={!showDone}
                  onClick={() => setShowDone(!showDone)}
                >
                  <SlidersHorizontal size={17} />
                  {showDone ? "Show open only" : "Show all"}
                </button>
              </div>
            </div>
            <div className="task-table">
              <div className="task-table-heading">
                <span>THE LITTLE THINGS</span>
                <span>ROOM</span>
                <span>WHO</span>
                <span>ESTIMATE</span>
                <span />
              </div>
              {filtered.length ? (
                filtered.map((t) => (
                  <div
                    className={`task-row ${t.done ? "completed" : ""}`}
                    key={t._id}
                  >
                    <label className="task-main">
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={(e) => {
                          const done = e.currentTarget.checked;
                          perform(() =>
                            updateTask({ token, taskId: t._id, done }),
                          );
                        }}
                      />
                      <span className="custom-check">
                        {t.done && <Check size={14} />}
                      </span>
                      <span>
                        <strong>{t.title}</strong>
                        {t.note && <small>{t.note}</small>}
                      </span>
                    </label>
                    <span className="room-tag">
                      {rooms.find((r) => r.id === t.room)?.short || t.room}
                    </span>
                    <span className="assignee">
                      <span>{(t.assignee || "Y").slice(0, 1)}</span>
                      {t.assignee || "You"}
                    </span>
                    <button
                      className="cost-cell edit-cost"
                      aria-label={`Edit ${t.title}`}
                      onClick={() => setEditing(t)}
                    >
                      {money(t.cost)} <SlidersHorizontal size={12} />
                    </button>
                    <button
                      className="icon-button delete-task"
                      aria-label={`Delete ${t.title}`}
                      onClick={() =>
                        perform(
                          () => deleteTask({ token, taskId: t._id }),
                          "Task removed.",
                        )
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={CheckCheck}
                  title="A clear little corner."
                  text="No tasks match this view. Add one or switch rooms."
                />
              )}
              <button className="add-task-row" onClick={() => setModal("task")}>
                <Plus size={17} /> Add something to take care of
              </button>
            </div>
            <div className="activity-section">
              <h2>Coming together, together.</h2>
              <p>Your household’s latest steps, synced live.</p>
              {activity.slice(0, 5).map((a) => (
                <div className="activity-row" key={a._id}>
                  <Check size={14} />
                  <span>{a.text}</span>
                  <time>
                    {new Date(a.createdAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
              ))}
            </div>
          </section>
        )}
        {tab === "discover" && (
          <section className="page-content">
            <PageHeading
              eyebrow="FIND YOUR PEOPLE"
              title="Good help. Less guesswork."
              description="Find moving services, essentials, and useful advice. Keep the sources with your plan."
            />
            <form
              className="discovery-search"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                perform(
                  () => research({ token, query: String(form.get("query")) }),
                  "Research started. Results will appear here.",
                );
              }}
            >
              <Globe2 size={22} />
              <input
                name="query"
                required
                minLength={4}
                maxLength={240}
                placeholder={`Movers in ${home.city}, or paste a supplier website...`}
                aria-label="Research query or website"
              />
              <button className="primary" disabled={busy || jobRunning}>
                <Search size={17} /> Find options
              </button>
            </form>
            <div className="suggestion-chips">
              {["Moving company", "Internet setup", "Packing essentials"].map(
                (q) => (
                  <button
                    key={q}
                    disabled={busy || jobRunning}
                    onClick={() =>
                      perform(
                        () =>
                          research({ token, query: `${q} in ${home.city}` }),
                        `Looking for ${q.toLowerCase()}...`,
                      )
                    }
                  >
                    {q}
                    <ArrowUpRight size={14} />
                  </button>
                ),
              )}
            </div>
            <IntegrationNotice
              configured={integrations.firecrawl}
              name="Web research"
            />
            <JobStatus jobs={jobs.filter((j) => j.type === "research")} />
            <div className="section-title">
              <h2>Your shortlist</h2>
              <span>{sources.length} saved sources</span>
            </div>
            {sources.length ? (
              <div className="source-grid">
                {sources.map((s, i) => (
                  <article className="source-card" key={s._id}>
                    <div className="source-art">
                      <Globe2 size={50} strokeWidth={0.8} />
                      <span>0{i + 1}</span>
                    </div>
                    <div className="source-body">
                      <span className="source-category">
                        {s.category} ·{" "}
                        {s.status === "live"
                          ? "Web research"
                          : "Sample reference"}
                      </span>
                      <h3>{s.title}</h3>
                      <p>{s.summary}</p>
                      {s.status === "live" && (
                        <p className="source-time">
                          Retrieved{" "}
                          {new Date(s.capturedAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                      <div className="source-footer">
                        <a href={s.url} target="_blank" rel="noreferrer">
                          Visit website <ExternalLink size={14} />
                        </a>
                        <button
                          className="icon-button"
                          aria-label={`Draft enquiry about ${s.title}`}
                          onClick={() => setModal("compose")}
                        >
                          <Mail size={17} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Compass}
                title="Your shortlist starts here."
                text="Search for the help you need. Every result keeps its original source, so you can check the details."
              />
            )}
            <div className="discovery-note">
              <Leaf size={22} />
              <div>
                <strong>A helpful lead, not a promise.</strong>
                <p>
                  Check availability, prices, and suitability directly with each
                  provider before committing.
                </p>
              </div>
            </div>
          </section>
        )}
        {tab === "inbox" && (
          <section className="page-content">
            <PageHeading
              eyebrow="EVERY CONVERSATION, ONE HOME"
              title="Keep everyone in the loop."
              description="Prepare an enquiry, review it, then send. Replies come back to your shared home."
            >
              <button
                className="subtle-button"
                disabled={busy}
                onClick={() =>
                  perform(() => syncInbox({ token }), "Checking for replies...")
                }
              >
                <RefreshCw size={16} /> Check replies
              </button>
              <button className="primary" onClick={() => setModal("compose")}>
                <Plus size={17} /> New enquiry
              </button>
            </PageHeading>
            <IntegrationNotice
              configured={integrations.agentmail}
              name="Home inbox"
            />
            <JobStatus
              jobs={jobs.filter(
                (j) =>
                  j.type === "sendEmail" ||
                  j.type === "syncInbox" ||
                  j.type === "inbox",
              )}
            />
            <div className="inbox-layout">
              <div className="inbox-message-list">
                {messages.length ? (
                  messages.map((m) => (
                    <article className="message-card" key={m._id}>
                      <div className="message-icon">
                        <Mail size={21} />
                      </div>
                      <div className="message-content">
                        <div className="message-meta">
                          <span>
                            {m.status === "received"
                              ? "REPLY"
                              : m.status === "draft"
                                ? "DRAFT"
                                : m.status.toUpperCase()}
                          </span>
                          <time>
                            {new Date(m.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </time>
                        </div>
                        <h3>{m.subject}</h3>
                        <p className="recipient">
                          {m.status === "received" ? "From" : "To"}:{" "}
                          {m.recipient}
                        </p>
                        <p className="message-body">{m.body}</p>
                        {m.error && <p className="inline-error">{m.error}</p>}
                        {m.status === "draft" && (
                          <button
                            className="subtle-button"
                            disabled={busy}
                            onClick={() => setSending(m._id)}
                          >
                            <Send size={15} /> Review & send
                          </button>
                        )}
                      </div>
                    </article>
                  ))
                ) : (
                  <EmptyState
                    icon={Mail}
                    title="A fresh inbox for a fresh start."
                    text="Draft your first enquiry to a mover, landlord, or service provider. Nothing is sent until you review and approve it."
                  />
                )}
              </div>
              <aside className="inbox-guide">
                <div className="sparkle-tile">
                  <Mail size={23} />
                </div>
                <h2>
                  Less chasing.
                  <br />
                  More settling in.
                </h2>
                <ol>
                  <li>Write what you need.</li>
                  <li>Review before sending.</li>
                  <li>Keep replies with your move.</li>
                </ol>
                <p>
                  Your home link gives access to these conversations. Share only
                  with people you trust.
                </p>
              </aside>
            </div>
          </section>
        )}
        <footer className="footer">
          <span>
            roomready <span className="muted">/ A little closer to home.</span>
          </span>
          <span>Built with care. Synced with Convex.</span>
          <button onClick={() => setModal("help")}>
            How it works <ArrowUpRight size={13} />
          </button>
        </footer>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
      {modal === "task" && (
        <Modal
          error={error}
          title="One more little thing."
          onClose={() => setModal(null)}
        >
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await perform(
                  () =>
                    addTask({
                      token,
                      title: String(f.get("title")),
                      room: String(f.get("room")),
                      cost: Number(f.get("cost") || 0),
                      assignee: String(f.get("assignee") || "You"),
                      note: String(f.get("note") || ""),
                      priority: String(f.get("priority")),
                    }),
                  "Added to your move plan.",
                )
              )
                setModal(null);
            }}
          >
            <label>
              What needs doing?
              <input
                name="title"
                placeholder="Book the moving van"
                required
                maxLength={120}
                autoFocus
              />
            </label>
            <div className="form-grid">
              <label>
                Room
                <select
                  name="room"
                  defaultValue={room === "all" ? "living" : room}
                >
                  {rooms.map((r) => (
                    <option value={r.id} key={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Estimated cost ($)
                <input
                  name="cost"
                  type="number"
                  min="0"
                  max="1000000"
                  step="0.01"
                  defaultValue="0"
                />
              </label>
              <label>
                Who’s on it?
                <input name="assignee" defaultValue="You" maxLength={40} />
              </label>
              <label>
                Priority
                <select name="priority">
                  <option value="medium">When you can</option>
                  <option value="high">Do this first</option>
                  <option value="low">Nice to have</option>
                </select>
              </label>
            </div>
            <label>
              A helpful note
              <textarea
                name="note"
                maxLength={1000}
                placeholder="Measurements, timing, anything worth remembering."
              />
            </label>
            <button className="primary" disabled={busy}>
              <Plus size={17} /> Add to plan
            </button>
          </form>
        </Modal>
      )}
      {modal === "settings" && (
        <Modal
          error={error}
          title="Make yourself at home."
          onClose={() => setModal(null)}
        >
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await perform(
                  () =>
                    updateHome({
                      token,
                      name: String(f.get("name")),
                      city: String(f.get("city")),
                      moveDate: String(f.get("date")),
                      budget: Number(f.get("budget")),
                    }),
                  "Your home details are saved.",
                )
              )
                setModal(null);
            }}
          >
            <label>
              Home name
              <input
                name="name"
                defaultValue={home.name}
                required
                maxLength={60}
              />
            </label>
            <label>
              City
              <input
                name="city"
                defaultValue={home.city}
                required
                maxLength={80}
              />
            </label>
            <div className="form-grid">
              <label>
                Moving day
                <input
                  name="date"
                  type="date"
                  defaultValue={home.moveDate}
                  required
                />
              </label>
              <label>
                Your budget ($)
                <input
                  name="budget"
                  type="number"
                  min="0"
                  max="1000000"
                  defaultValue={home.budget}
                  required
                />
              </label>
            </div>
            <button className="primary" disabled={busy}>
              <Check size={17} /> Save home
            </button>
            <div className="form-divider" />
            <button
              type="button"
              className="subtle-button"
              disabled={busy}
              onClick={async () => {
                const next = crypto.randomUUID();
                if (
                  await perform(
                    () =>
                      createHome({
                        token: next,
                        demo: false,
                        name: "My new home",
                        city: home.city,
                        moveDate: home.moveDate,
                        budget: home.budget,
                      }),
                    "A fresh home is ready.",
                  )
                ) {
                  localStorage.setItem("roomready-home", next);
                  history.replaceState(null, "", location.pathname);
                  setToken(next);
                  setModal(null);
                  setRoom("all");
                  navigate("home");
                }
              }}
            >
              <Home size={17} /> Create a separate, empty home
            </button>
            <p className="form-note">
              This sample has its own saved plan. Copy its home link first if
              you want to return to it.
            </p>
          </form>
        </Modal>
      )}
      {modal === "share" && (
        <Modal
          error={error}
          title="A home is a team effort."
          onClose={() => setModal(null)}
        >
          <p className="modal-description">
            Invite your household with a shared link. Tasks, budgets and
            conversations update for everyone in real time.
          </p>
          <div className="share-preview">
            <Home size={26} />
            <div>
              <strong>{home.name}</strong>
              <span>
                {home.city} · Moving {moveDateLabel}
              </span>
            </div>
          </div>
          <p className="privacy-note">
            Anyone with this link can view and edit this home, including
            messages. Share it privately with people you trust.
          </p>
          <button
            className="primary"
            onClick={() =>
              perform(
                () =>
                  navigator.clipboard.writeText(
                    `${location.origin}${location.pathname}#home=${token}`,
                  ),
                "Home link copied.",
              )
            }
          >
            <Copy size={17} /> Copy private home link
          </button>
        </Modal>
      )}
      {modal === "assistant" && (
        <Modal
          error={error}
          title="Let’s make room for the important things."
          onClose={() => setModal(null)}
        >
          <form
            className="form"
            onSubmit={async (e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await perform(
                  () => plan({ token, prompt: String(f.get("prompt")) }),
                  "Your move assistant is working. New tasks will appear in your plan.",
                )
              ) {
                setModal(null);
                navigate("plan");
              }
            }}
          >
            <p className="modal-description">
              Tell your move assistant what matters. It will turn your home
              details and saved research into practical tasks. Estimates are
              suggestions, not supplier quotes.
            </p>
            <label>
              Your priorities
              <textarea
                name="prompt"
                defaultValue="Help me prioritize the essentials for our first night. Keep the plan within our budget."
                maxLength={1200}
                required
                rows={4}
              />
            </label>
            <IntegrationNotice
              configured={integrations.openai}
              name="Move assistant"
            />
            <button className="primary" disabled={busy || jobRunning}>
              <Sparkles size={17} /> Build my next steps
            </button>
          </form>
        </Modal>
      )}
      {modal === "compose" && (
        <Modal
          error={error}
          title="Start a helpful conversation."
          onClose={() => setModal(null)}
        >
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await perform(
                  () =>
                    draftEmail({
                      token,
                      recipient: String(f.get("recipient")),
                      subject: String(f.get("subject")),
                      body: String(f.get("body")),
                    }),
                  "Draft saved. Review it in your inbox before sending.",
                )
              ) {
                setModal(null);
                navigate("inbox");
              }
            }}
          >
            <label>
              To
              <input
                name="recipient"
                type="email"
                placeholder="Your provider’s email"
                required
                maxLength={254}
              />
            </label>
            <label>
              Subject
              <input
                name="subject"
                defaultValue={`Moving enquiry · ${moveDateLabel}`}
                required
                maxLength={160}
              />
            </label>
            <label>
              Message
              <textarea
                name="body"
                rows={6}
                defaultValue={`Hi,\n\nWe are moving to ${home.city} on ${moveDateLabel} and would love to understand your availability and pricing.\n\nCould you share what is included and any information you need from us?\n\nThank you!`}
                required
                maxLength={5000}
              />
            </label>
            <p className="form-note">
              Saving creates a draft. Nothing is sent yet.
            </p>
            <button className="primary" disabled={busy}>
              <Mail size={17} /> Save draft
            </button>
          </form>
        </Modal>
      )}
      {modal === "help" && (
        <Modal
          error={error}
          title="A calmer way to move."
          onClose={() => setModal(null)}
        >
          <div className="help-content">
            <p>
              <strong>Explore your home.</strong> Scroll to change the camera’s
              view. Select any room in the scene or the room list to focus on
              it. The Plan view works without 3D.
            </p>
            <p>
              <strong>Take small steps.</strong> Add tasks, estimate costs and
              mark things done in Move plan. Room progress reflects your real
              tasks.
            </p>
            <p>
              <strong>Bring people together.</strong> Share your private home
              link to collaborate. Anyone with it can edit your plan and see the
              inbox.
            </p>
            <p>
              <strong>Find and ask.</strong> Discover saves web research with
              sources. Inbox keeps enquiries and replies in one place. All sends
              require your review.
            </p>
            <p>
              <strong>Stay in control.</strong> Keyboard and touch work across
              the app. Your device’s reduced motion preference is respected.
              Sample data is labelled; unavailable services say so.
            </p>
          </div>
        </Modal>
      )}
      {editing && (
        <Modal
          error={error}
          title="Fine-tune your plan."
          onClose={() => setEditing(null)}
        >
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await perform(
                  () =>
                    updateTask({
                      token,
                      taskId: editing._id,
                      title: String(f.get("title")),
                      cost: Number(f.get("cost")),
                      assignee: String(f.get("assignee")),
                      note: String(f.get("note")),
                      priority: String(f.get("priority")),
                    }),
                  "Task updated for everyone.",
                )
              )
                setEditing(null);
            }}
          >
            <label>
              Task
              <input
                name="title"
                defaultValue={editing.title}
                required
                maxLength={160}
              />
            </label>
            <div className="form-grid">
              <label>
                Estimated cost ($)
                <input
                  name="cost"
                  type="number"
                  defaultValue={editing.cost}
                  min="0"
                  max="1000000"
                  step=".01"
                  required
                />
              </label>
              <label>
                Who’s on it?
                <input
                  name="assignee"
                  defaultValue={editing.assignee}
                  required
                  maxLength={60}
                />
              </label>
            </div>
            <label>
              Priority
              <select name="priority" defaultValue={editing.priority}>
                <option value="medium">When you can</option>
                <option value="high">Do this first</option>
                <option value="low">Nice to have</option>
              </select>
            </label>
            <label>
              Note
              <textarea
                name="note"
                defaultValue={editing.note}
                maxLength={2000}
              />
            </label>
            <button className="primary" disabled={busy}>
              <Check size={17} /> Save changes
            </button>
          </form>
        </Modal>
      )}
      {sending && (
        <Modal
          error={error}
          title="Ready to send this enquiry?"
          onClose={() => setSending(null)}
        >
          <p className="modal-description">
            This sends a real email through your home inbox.
          </p>
          {messages
            .filter((m) => m._id === sending)
            .map((m) => (
              <div className="send-preview" key={m._id}>
                <p>
                  <strong>To:</strong> {m.recipient}
                </p>
                <h3>{m.subject}</h3>
                <p>{m.body}</p>
              </div>
            ))}
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              if (
                await perform(
                  () =>
                    sendEmail({ token, messageId: sending, approval: true }),
                  "Sending your approved enquiry. Check its status in the inbox.",
                )
              )
                setSending(null);
            }}
          >
            <Send size={16} /> Approve & send email
          </button>
        </Modal>
      )}
    </>
  );
}
function errorText(e: unknown) {
  if (e instanceof ConvexError && typeof e.data === "string") return e.data;
  const m = e instanceof Error ? e.message : String(e);
  return (
    m
      .replace(/^\[CONVEX[^\]]*\]\s*/, "")
      .replace(/\[Request ID:[^\]]*\]\s*/, "")
      .replace(/Uncaught ConvexError:\s*/, "")
      .split("\n")[0] || "Something went wrong. Please try again."
  );
}
function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}
function RoomFilter({
  room,
  setRoom,
}: {
  room: RoomId | "all";
  setRoom: (id: RoomId | "all") => void;
}) {
  return (
    <div className="room-filter">
      <button
        className={room === "all" ? "active" : ""}
        onClick={() => setRoom("all")}
      >
        All rooms
      </button>
      {rooms.map((r) => (
        <button
          key={r.id}
          className={room === r.id ? "active" : ""}
          onClick={() => setRoom(r.id)}
        >
          <r.icon size={15} />
          {r.short}
        </button>
      ))}
    </div>
  );
}
function EmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Home;
  title: string;
  text: string;
}) {
  return (
    <div className="empty-state">
      <span>
        <Icon size={32} strokeWidth={1.3} />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}
function IntegrationNotice({
  configured,
  name,
}: {
  configured: boolean;
  name: string;
}) {
  return configured ? null : (
    <div className="integration-notice">
      <CircleHelp size={16} />
      <span>
        {name} is awaiting a service connection. You can keep organizing your
        home in the meantime.
      </span>
    </div>
  );
}
function JobStatus({
  jobs,
}: {
  jobs: Array<{ _id: string; status: string; result?: string; error?: string }>;
}) {
  const latest = jobs[0];
  if (!latest) return null;
  return (
    <div
      className={`job-status ${latest.status === "failed" ? "failed" : ""}`}
      role="status"
    >
      {latest.status === "queued" || latest.status === "running" ? (
        <LoaderCircle size={17} className="spin" />
      ) : (
        <Check size={17} />
      )}
      <span>
        {latest.error || latest.result || `Research ${latest.status}...`}
      </span>
    </div>
  );
}
