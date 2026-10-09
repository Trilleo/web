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
      "The rules for using Trilleo Network: accounts, comments, uploads, tools and games.",
    group: "legal",
    changes: [
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
      "The one sign-in cookie and the browser storage the site uses. No tracking, no banner.",
    group: "legal",
    changes: [
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
      "How to take part in comments and uploads, and what happens when rules are broken.",
    group: "legal",
    changes: [
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
      "Short answers about accounts, your data, the tools, the games and comments.",
    group: "help",
    changes: [
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
