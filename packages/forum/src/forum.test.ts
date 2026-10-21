import { describe, expect, it } from "vitest";
import {
  FORUM_LAYOUTS,
  can,
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
    expect(isReadyLayout("qa")).toBe(false);
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
  const admin: ForumViewer = {
    id: "a",
    admin: true,
    trusted: true,
    blocked: false,
  };
  const newcomer: ForumViewer = {
    id: "n",
    admin: false,
    trusted: false,
    blocked: false,
  };
  const trusted: ForumViewer = { ...newcomer, id: "t", trusted: true };
  const blocked: ForumViewer = { ...trusted, id: "b", blocked: true };
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
    expect(can(newcomer, "topic.create", { ...forum, kind: "category" })).toBe(
      false,
    );
  });

  it("keeps hidden forums and others' pending topics from view", () => {
    const hidden = { ...forum, hidden: true };
    expect(can(trusted, "forum.view", hidden)).toBe(false);
    expect(can(admin, "forum.view", hidden)).toBe(true);
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
    const lockedForum = { ...forum, locked: true };
    expect(can(trusted, "topic.create", lockedForum)).toBe(false);
    expect(can(admin, "topic.create", lockedForum)).toBe(true);
    expect(
      can(newcomer, "post.edit-own", forum, locked, { authorId: "n" }),
    ).toBe(false);
  });

  it("lets people edit only their own posts", () => {
    expect(
      can(newcomer, "post.edit-own", forum, topic, { authorId: "n" }),
    ).toBe(true);
    expect(can(trusted, "post.edit-own", forum, topic, { authorId: "n" })).toBe(
      false,
    );
    expect(
      can(trusted, "post.edit-own", forum, topic, { authorId: null }),
    ).toBe(false);
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

  it("makes plain text and excerpts", () => {
    expect(plainText("<p>A &amp; B</p>\n<p>C</p>")).toBe("A & B C");
    expect(excerpt("one two three four", 9)).toBe("one two…");
    expect(excerpt("short", 9)).toBe("short");
  });
});
