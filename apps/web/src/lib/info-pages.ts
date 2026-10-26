/**
 * The site's information pages (legal, help, about the site): one list that the
 * footer, the /legal/ hub, the HTML sitemap, llms.txt and the SEO checklist read.
 * Each page's own file holds its text; this holds what's said about it elsewhere.
 */

export type InfoGroup = "legal" | "help" | "site";

export interface InfoChange {
  /** YYYY-MM-DD. */
  date: string;
  note: string;
}

export interface InfoPage {
  path: string;
  title: string;
  /** Short name for footers and lists. */
  label: string;
  description: string;
  group: InfoGroup;
  /** Newest first. The first entry is the page's "Last updated" date. */
  changes: readonly InfoChange[];
}

const FIRST: readonly InfoChange[] = [
  { date: "2026-10-05", note: "First version." },
];

export const INFO_GROUP_LABELS: Readonly<Record<InfoGroup, string>> = {
  legal: "Legal",
  help: "Help",
  site: "The site",
};

export const INFO_PAGES: readonly InfoPage[] = [
  {
    path: "/legal/terms/",
    title: "Terms of use",
    label: "Terms",
    description:
      "The rules for using Trilleo Network: accounts, comments, the forum, uploads, tools, games and the wiki.",
    group: "legal",
    changes: [
      {
        date: "2026-10-22",
        note: "Hotfix: runs on its leaderboards are public and can be watched again.",
      },
      {
        date: "2026-10-21",
        note: "Private messages and forum attachments are yours too; messages are shown only to their conversation, and to the admin when reported.",
      },
      {
        date: "2026-10-21",
        note: "Added the forum and profile pictures: forum posts stay, without your name, after you delete your account.",
      },
      {
        date: "2026-10-12",
        note: "Added proposed edits on the wiki: anyone signed in can propose one, and an approved one counts as your edit.",
      },
      {
        date: "2026-10-11",
        note: "Added the wiki: who can read and edit it, and what saving an edit allows.",
      },
      {
        date: "2026-10-09",
        note: "Accounts are now their email address, with GitHub as a linked account.",
      },
      {
        date: "2026-10-07",
        note: "Added Minecraft creations: anyone signed in can share them, under a licence they choose.",
      },
      ...FIRST,
    ],
  },
  {
    path: "/legal/privacy/",
    title: "Privacy policy",
    label: "Privacy",
    description:
      "What Trilleo Network keeps about you, why, for how long, and how to see or delete it.",
    group: "legal",
    changes: [
      {
        date: "2026-10-25",
        note: "CHUNITHM charts: the “Original jacket” link takes your browser to sdvx.in itself.",
      },
      {
        date: "2026-10-24",
        note: "CHUNITHM charts: names you suggest for songs, how long they're kept, and what stays when you delete your account.",
      },
      {
        date: "2026-10-24",
        note: "CHUNITHM charts: favourites and recently viewed charts, kept as tool data.",
      },
      {
        date: "2026-10-24",
        note: "CHUNITHM chart pictures: the hashed address that limits how many one visitor can have built.",
      },
      {
        date: "2026-10-23",
        note: "Preview: links the server fetches for you (passed on, not kept), the hashed address that limits it, and Microsoft's viewer if you choose it.",
      },
      {
        date: "2026-10-23",
        note: "The daily cryptic played through other programs: what's kept, and for how long.",
      },
      {
        date: "2026-10-23",
        note: "The API: what it keeps in memory to limit requests without a key.",
      },
      {
        date: "2026-10-22",
        note: "Hotfix: checked runs, their key presses, achievements, and run tickets.",
      },
      {
        date: "2026-10-21",
        note: "Private messages (and when the admin sees one), polls and attached files.",
      },
      {
        date: "2026-10-21",
        note: "Forum activity: reactions, votes, watching, reading, drafts, notifications and their emails, points and badges.",
      },
      {
        date: "2026-10-21",
        note: "Forum moderation: earlier versions of edited posts, reports you make, bans, forum groups, and the moderation log.",
      },
      {
        date: "2026-10-21",
        note: "Added profile pictures and the forum: what’s kept, who can see it, and that forum posts stay without your name when you delete your account.",
      },
      {
        date: "2026-10-16",
        note: "Study progress: what’s kept when you study signed in, and that it goes with your account.",
      },
      {
        date: "2026-10-12",
        note: "Added proposed wiki edits, wiki watchlists and their daily digest email.",
      },
      {
        date: "2026-10-11",
        note: "Added pictures uploaded for a wiki, and which wiki they’re for.",
      },
      {
        date: "2026-10-11",
        note: "Added the wiki: what’s kept when you edit or join a wiki, and how long.",
      },
      {
        date: "2026-10-09",
        note: "Added passkeys, the security log, sign-in alerts and undoing an address change.",
      },
      {
        date: "2026-10-09",
        note: "Web Analytics now only runs if you allow it in the cookie settings.",
      },
      {
        date: "2026-10-09",
        note: "Accounts are now their email address: signing in by code, usernames chosen on the site, GitHub as a linked account (and reading its verified address).",
      },
      {
        date: "2026-10-09",
        note: "Added email: the address you can add, notifications, how long email is kept, and Tencent Cloud as the sender.",
      },
      { date: "2026-10-07", note: "Added what’s kept for Minecraft projects." },
      ...FIRST,
    ],
  },
  {
    path: "/legal/cookies/",
    title: "Cookies and local storage",
    label: "Cookies",
    description:
      "The cookies and browser storage the site uses, what each is for, and how to choose what’s kept.",
    group: "legal",
    changes: [
      {
        date: "2026-10-24",
        note: "Listed what the CHUNITHM tool remembers in your browser: favourites, recent charts and your layout (preferences).",
      },
      {
        date: "2026-10-23",
        note: "Listed the links Preview remembers in your browser (a preference).",
      },
      {
        date: "2026-10-23",
        note: "Listed the admin's cookie for showing a new API key once, and the API's docs.",
      },
      {
        date: "2026-10-22",
        note: "Listed the Hotfix records kept in your browser (a preference).",
      },
      {
        date: "2026-10-16",
        note: "Listed the study progress kept in your browser while signed out (a preference).",
      },
      {
        date: "2026-10-11",
        note: "Added the wiki’s sign-in cookie, and that the wiki keeps its cookies and choices apart.",
      },
      {
        date: "2026-10-09",
        note: "Corrected the summary, which still said there was one cookie and no banner.",
      },
      {
        date: "2026-10-09",
        note: "Added the cookie used while adding or using a passkey.",
      },
      {
        date: "2026-10-09",
        note: "Added cookie settings: preferences (on unless you turn them off) and analytics (only if you allow it).",
      },
      {
        date: "2026-10-09",
        note: "Added the cookie used while signing in by email.",
      },
      ...FIRST,
    ],
  },
  {
    path: "/legal/guidelines/",
    title: "Community guidelines",
    label: "Guidelines",
    description:
      "How to take part in comments, the forum and uploads, and what happens when rules are broken.",
    group: "legal",
    changes: [
      {
        date: "2026-10-21",
        note: "Polls, attachments and private messages, with messaging limits.",
      },
      {
        date: "2026-10-21",
        note: "Forum moderation: edit windows, moderators, bans, and reporting posts and profile pictures.",
      },
      {
        date: "2026-10-21",
        note: "Added the forum’s rules (posting, approval, limits, editing and deleting) and profile pictures.",
      },
      {
        date: "2026-10-07",
        note: "Added the rules for Minecraft projects, and their reports.",
      },
      ...FIRST,
    ],
  },
  {
    path: "/legal/copyright/",
    title: "Copyright and takedowns",
    label: "Copyright",
    description:
      "Who owns what on Trilleo Network, how to report infringing content, and how to appeal.",
    group: "legal",
    changes: [
      { date: "2026-10-07", note: "Mentioned reporting Minecraft projects." },
      ...FIRST,
    ],
  },
  {
    path: "/contact/",
    title: "Contact",
    label: "Contact",
    description:
      "Questions, feedback, privacy requests, takedowns or security reports: how to reach Trilleo.",
    group: "help",
    changes: FIRST,
  },
  {
    path: "/faq/",
    title: "Questions and answers",
    label: "FAQ",
    description:
      "Short answers about accounts, your data, the tools, the games, comments and the forum.",
    group: "help",
    changes: [
      {
        date: "2026-10-26",
        note: "The CHUNITHM score calculator.",
      },
      {
        date: "2026-10-21",
        note: "Polls, attachments and private messages.",
      },
      {
        date: "2026-10-21",
        note: "Forum notifications, points and badges, layouts and drafts.",
      },
      {
        date: "2026-10-21",
        note: "Forum edit windows, reports and bans.",
      },
      {
        date: "2026-10-21",
        note: "Added the forum, and profile pictures.",
      },
      {
        date: "2026-10-16",
        note: "Where the study lessons come from, and how reviews and progress are kept.",
      },
      {
        date: "2026-10-12",
        note: "Proposing wiki edits, and following changes with a watchlist.",
      },
      {
        date: "2026-10-09",
        note: "Passkeys, and how you’d know about someone else signing in.",
      },
      {
        date: "2026-10-09",
        note: "Signing in by email, what changed for GitHub accounts, and usernames.",
      },
      { date: "2026-10-09", note: "Added a question about email." },
      {
        date: "2026-10-07",
        note: "Added questions about sharing Minecraft creations.",
      },
      ...FIRST,
    ],
  },
  {
    path: "/accessibility/",
    title: "Accessibility",
    label: "Accessibility",
    description:
      "The standard Trilleo Network aims for, what's known not to meet it yet, and how to report a barrier.",
    group: "help",
    changes: [
      {
        date: "2026-10-21",
        note: "The picture lightbox works with the keyboard; attaching files needs JavaScript.",
      },
      {
        date: "2026-10-21",
        note: "The forum works without JavaScript; the profile picture cropper works with the keyboard.",
      },
      {
        date: "2026-10-07",
        note: "Added the 3D views of Minecraft builds to the known limits.",
      },
      ...FIRST,
    ],
  },
  {
    path: "/security/",
    title: "Security",
    label: "Security",
    description:
      "How to report a vulnerability in Trilleo Network, what's in scope, and what to expect back.",
    group: "help",
    changes: [
      {
        date: "2026-10-23",
        note: "Added the API (api.trilleo.net), its keys, webhooks and the daily cryptic to what’s in scope.",
      },
      {
        date: "2026-10-21",
        note: "Added the forum and profile pictures to what’s in scope.",
      },
      {
        date: "2026-10-09",
        note: "Added email addresses, codes and unsubscribe links to what’s in scope.",
      },
      {
        date: "2026-10-07",
        note: "Added the Minecraft platform to what’s in scope.",
      },
      ...FIRST,
    ],
  },
  {
    path: "/colophon/",
    title: "Colophon",
    label: "Colophon",
    description:
      "How Trilleo Network is built and hosted, its typefaces, and the open-source work it stands on.",
    group: "site",
    changes: [
      {
        date: "2026-10-23",
        note: "The API and its docs (api.trilleo.net).",
      },
      {
        date: "2026-10-16",
        note: "Credited KaTeX (the study lessons' maths) and ts-fsrs (their flashcard reviews).",
      },
      {
        date: "2026-10-09",
        note: "Mentioned how email is sent, and credited Nodemailer.",
      },
      {
        date: "2026-10-07",
        note: "Mentioned how Minecraft files are read and drawn.",
      },
      ...FIRST,
    ],
  },
  {
    path: "/sitemap/",
    title: "Sitemap",
    label: "Sitemap",
    description: "Every public page on Trilleo Network, in one list.",
    group: "site",
    changes: FIRST,
  },
];

/** The hub that lists the legal pages. */
export const LEGAL_HUB = {
  path: "/legal/",
  title: "Legal",
  description:
    "Terms, privacy, cookies, community guidelines and copyright for Trilleo Network.",
} as const;

export function infoPage(path: string): InfoPage {
  const page = INFO_PAGES.find((candidate) => candidate.path === path);
  if (!page) throw new Error(`Not an info page: ${path}`);
  return page;
}

export function infoPagesIn(group: InfoGroup): InfoPage[] {
  return INFO_PAGES.filter((page) => page.group === group);
}

/** When the page last changed (its newest change). */
export function lastUpdated(page: InfoPage): Date {
  const newest = page.changes[0];
  if (!newest) throw new Error(`No changes listed for ${page.path}`);
  return new Date(`${newest.date}T00:00:00Z`);
}

/** Every info page's address, the hub included (for the SEO checklist). */
export function infoPaths(): string[] {
  return [LEGAL_HUB.path, ...INFO_PAGES.map((page) => page.path)];
}
