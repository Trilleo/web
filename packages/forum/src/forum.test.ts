import { describe, expect, it } from "vitest";
import {
  BUILT_IN_GROUPS,
  FORUM_LAYOUTS,
  can,
  editWindowOf,
  groupsOf,
  moderates,
  resolveRules,
  excerpt,
  extractMentions,
  forumLayout,
  forumSlugProblem,
  isReadyLayout,
  parseTopicSegment,
  plainText,
  quoteFor,
  renderForumPost,
  slugify,
  topicPath,
  type ForumPlace,
  type ForumViewer,
  type TopicPlace,
} from "./index";

describe("slugs", () => {
  it("turns titles into address words", () => {
    expect(slugify("How do I start?")).toBe("how-do-i-start");
    expect(slugify("Café — crème brûlée")).toBe("cafe-creme-brulee");
    expect(slugify("你好")).toBe("topic");
    expect(slugify("a".repeat(100))).toHaveLength(60);
    expect(slugify("word ".repeat(30)).endsWith("-")).toBe(false);
  });

  it("checks forum slugs", () => {
    expect(forumSlugProblem("general")).toBeNull();
    expect(forumSlugProblem("help-and-feedback")).toBeNull();
    expect(forumSlugProblem("")).toBe("empty");
    expect(forumSlugProblem("Bad Slug")).toBe("invalid");
    expect(forumSlugProblem("double--hyphen")).toBe("invalid");
    expect(forumSlugProblem("-start")).toBe("invalid");
    expect(forumSlugProblem("search")).toBe("reserved");
  });

  it("reads topic ids from addresses", () => {
    expect(parseTopicSegment("12-how-to-start")).toBe(12);
    expect(parseTopicSegment("12")).toBe(12);
    expect(parseTopicSegment("012-x")).toBeNull();
    expect(parseTopicSegment("x-12")).toBeNull();
    expect(parseTopicSegment("99999999999")).toBeNull();
    expect(topicPath({ slug: "general" }, { id: 3, slug: "hi" }, 2)).toBe(
      "/forum/general/3-hi/?page=2",
    );
  });
});

describe("layouts", () => {
  it("knows which layouts can be chosen", () => {
    expect(isReadyLayout("classic")).toBe(true);
    expect(isReadyLayout("qa")).toBe(true);
    expect(isReadyLayout("threaded")).toBe(true);
    expect(isReadyLayout("nope")).toBe(false);
    expect(forumLayout("nope")).toBe(FORUM_LAYOUTS[0]);
  });
});

describe("permissions", () => {
  const forum: ForumPlace = {
    id: 1,
    kind: "forum",
    locked: false,
    hidden: false,
    moderation: "newcomers",
  };
  const person = (overrides: Partial<ForumViewer>): ForumViewer => ({
    id: "n",
    admin: false,
    trusted: false,
    blocked: false,
    groups: [],
    banned: false,
    editWindowMs: 60 * 60_000,
    ...overrides,
  });
  const admin = person({
    id: "a",
    admin: true,
    trusted: true,
    editWindowMs: null,
  });
  const newcomer = person({});
  const trusted = person({ id: "t", trusted: true });
  const blocked = person({ id: "b", trusted: true, blocked: true });
  const moderator = person({ id: "m", trusted: true, groups: ["moderator"] });
  const topic: TopicPlace = {
    locked: false,
    state: "published",
    authorId: "n",
  };

  it("lets visitors read, and members write", () => {
    expect(can(null, "forum.view", forum)).toBe(true);
    expect(can(null, "topic.create", forum)).toBe(false);
    expect(can(newcomer, "topic.create", forum)).toBe(true);
    expect(can(blocked, "topic.create", forum)).toBe(false);
    expect(can(newcomer, "topic.reply", forum, topic)).toBe(true);
    expect(can(newcomer, "post.report", forum, topic)).toBe(true);
    expect(can(null, "post.report", forum, topic)).toBe(false);
    expect(can(newcomer, "topic.create", { ...forum, kind: "category" })).toBe(
      false,
    );
  });

  it("keeps hidden forums and others' pending topics from view", () => {
    const hidden = { ...forum, hidden: true };
    expect(can(trusted, "forum.view", hidden)).toBe(false);
    expect(can(admin, "forum.view", hidden)).toBe(true);
    expect(can(moderator, "forum.view", hidden)).toBe(true);
    const pending: TopicPlace = { ...topic, state: "pending" };
    expect(can(newcomer, "forum.view", forum, pending)).toBe(true);
    expect(can(trusted, "forum.view", forum, pending)).toBe(false);
    expect(can(null, "forum.view", forum, pending)).toBe(false);
    expect(can(admin, "forum.view", forum, pending)).toBe(true);
  });

  it("stops replies to locked topics and forums, except from moderators", () => {
    const locked = { ...topic, locked: true };
    expect(can(trusted, "topic.reply", forum, locked)).toBe(false);
    expect(can(admin, "topic.reply", forum, locked)).toBe(true);
    expect(can(moderator, "topic.reply", forum, locked)).toBe(true);
    const lockedForum = { ...forum, locked: true };
    expect(can(trusted, "topic.create", lockedForum)).toBe(false);
    expect(can(admin, "topic.create", lockedForum)).toBe(true);
    expect(
      can(newcomer, "post.edit-own", forum, locked, { authorId: "n" }),
    ).toBe(false);
  });

  it("lets people edit their own posts within their edit window", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const minutesAgo = (n: number) => new Date(now.getTime() - n * 60_000);
    const edit = (viewer: ForumViewer, authorId: string, age: number) =>
      can(
        viewer,
        "post.edit-own",
        forum,
        topic,
        { authorId, createdAt: minutesAgo(age) },
        now,
      );
    expect(edit(newcomer, "n", 30)).toBe(true);
    expect(edit(newcomer, "n", 61)).toBe(false);
    expect(edit(person({ editWindowMs: null }), "n", 10_000)).toBe(true);
    expect(edit(trusted, "n", 1)).toBe(false);
    expect(edit(moderator, "m", 10_000)).toBe(true);
    expect(
      can(trusted, "post.edit-own", forum, topic, { authorId: null }),
    ).toBe(false);
  });

  it("stops banned people writing, but not reading or deleting", () => {
    const banned = person({ banned: true });
    expect(can(banned, "forum.view", forum)).toBe(true);
    expect(can(banned, "topic.create", forum)).toBe(false);
    expect(can(banned, "topic.reply", forum, topic)).toBe(false);
    expect(can(banned, "post.edit-own", forum, topic, { authorId: "n" })).toBe(
      false,
    );
    expect(
      can(banned, "post.delete-own", forum, topic, { authorId: "n" }),
    ).toBe(true);
  });

  it("follows the forum's moderation setting", () => {
    expect(can(newcomer, "post.skip-review", forum)).toBe(false);
    expect(can(trusted, "post.skip-review", forum)).toBe(true);
    const all = { ...forum, moderation: "all" as const };
    expect(can(trusted, "post.skip-review", all)).toBe(false);
    expect(can(admin, "post.skip-review", all)).toBe(true);
    const none = { ...forum, moderation: "none" as const };
    expect(can(newcomer, "post.skip-review", none)).toBe(true);
    expect(can(null, "post.skip-review", none)).toBe(false);
  });

  it("resolves groups' permissions through the forums above", () => {
    const groups = [
      ...BUILT_IN_GROUPS,
      {
        slug: "helpers",
        name: "Helpers",
        description: "",
        title: "Helper",
        permissions: {},
        editWindowMinutes: null,
      },
    ];
    // Members-only above; this forum lets helpers moderate and newcomers back in.
    const rules = resolveRules(groups, [
      [
        { group: "guest", permission: "forum.view", allowed: false },
        { group: "newcomer", permission: "forum.view", allowed: false },
      ],
      [
        { group: "newcomer", permission: "forum.view", allowed: true },
        { group: "helpers", permission: "moderate", allowed: true },
      ],
    ]);
    const place = { ...forum, rules };
    expect(can(null, "forum.view", place)).toBe(false);
    expect(can(newcomer, "forum.view", place)).toBe(true);
    const helper = person({ id: "h", trusted: true, groups: ["helpers"] });
    expect(moderates(helper, place)).toBe(true);
    expect(moderates(helper, forum)).toBe(false);
    // Assigned moderators moderate without any group.
    expect(moderates(trusted, { ...forum, moderators: ["t"] })).toBe(true);
    expect(moderates(admin, { ...forum, rules })).toBe(true);
  });

  it("keeps a group called __proto__ an ordinary group", () => {
    const rules = resolveRules(
      [
        {
          slug: "__proto__",
          permissions: { moderate: true },
        },
      ],
      [[{ group: "__proto__", permission: "moderate", allowed: false }]],
    );
    expect(Object.hasOwn(rules, "__proto__")).toBe(true);
    expect(rules.__proto__?.moderate).toBe(false);
    expect(({} as Record<string, unknown>).moderate).toBeUndefined();
  });

  it("works out groups and edit windows", () => {
    expect(groupsOf(null)).toEqual(["guest"]);
    expect(groupsOf(moderator)).toEqual(["member", "moderator"]);
    expect(groupsOf(admin)).toEqual(["member", "admin"]);
    const definitions = new Map(
      BUILT_IN_GROUPS.map((group) => [group.slug, group] as const),
    );
    expect(editWindowOf(["newcomer"], definitions)).toBe(60 * 60_000);
    expect(editWindowOf(["member", "newcomer"], definitions)).toBe(
      24 * 60 * 60_000,
    );
    expect(editWindowOf(["member", "moderator"], definitions)).toBeNull();
  });
});

describe("rendering", () => {
  it("formats Markdown without HTML or images", () => {
    const html = renderForumPost(
      "# Title\n\n**bold** <script>alert(1)</script>\n\n![x](https://e.com/x.png)\n\n- one\n- two",
    );
    expect(html).toContain("<h3>Title</h3>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<img");
    expect(html).toContain("<li>one</li>");
  });

  it("allows only web and site links, marked as user content", () => {
    const html = renderForumPost(
      "[a](https://example.com) [b](javascript:alert(1)) [c](/forum/) [d](//evil.com)",
    );
    expect(html).toContain(
      '<a href="https://example.com" rel="nofollow ugc noopener noreferrer">a</a>',
    );
    expect(html).toContain('href="/forum/"');
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain('href="//evil.com"');
  });

  it("links mentions of accounts that exist", () => {
    expect(
      extractMentions("hi @Alice and @bob-x, not a@b.com or `@code`"),
    ).toEqual(["alice", "bob-x"]);
    const html = renderForumPost("Thanks @alice and @nobody!", {
      mentions: new Set(["alice"]),
    });
    expect(html).toContain(
      '<a href="/people/alice/" class="mention" data-mention="alice">@alice</a>',
    );
    expect(html).toContain("@nobody!");
    // Inside a link it stays text.
    expect(
      renderForumPost("[@alice](https://example.com)", {
        mentions: new Set(["alice"]),
      }),
    ).not.toContain("mention");
  });

  it("quotes a post without its own quotes", () => {
    const quote = quoteFor(
      { id: 4, body: "> older\n\nMy point\nsecond line" },
      "alice",
      "/forum/post/4/",
    );
    expect(quote).toBe(
      "> **[@alice wrote](/forum/post/4/):**\n> My point\n> second line\n\n",
    );
    expect(renderForumPost(quote)).toContain("<blockquote>");
  });

  it("strips tags in one pass, even from hostile input", () => {
    expect(plainText("a <b>bold</b> < c")).toBe("a bold < c");
    const hostile = "<".repeat(50_000);
    const started = performance.now();
    expect(plainText(hostile)).toBe(hostile);
    expect(performance.now() - started).toBeLessThan(500);
  });

  it("makes plain text and excerpts", () => {
    expect(plainText("<p>A &amp; B</p>\n<p>C</p>")).toBe("A & B C");
    expect(excerpt("one two three four", 9)).toBe("one two…");
    expect(excerpt("short", 9)).toBe("short");
  });
});
