/**
 * The forum for search engines and link previews: share cards (/og/forum.png,
 * /og/forum/<topic id>.png) and DiscussionForumPosting structured data on topics.
 */
import type { Forum, ForumTopic } from "@trilleo/db";
import { excerpt, plainText } from "@trilleo/forum";
import { formatPostDate } from "../listings";
import { profileHref } from "../profile/profile";
import { CARD_META_LENGTH, truncate, type JsonLd, type OgCard } from "../seo";
import { SITE_URL } from "../site";
import { FORUM_LABEL } from "./public";
import type { PostView } from "./store";

export const FORUM_CARD: OgCard = {
  section: FORUM_LABEL,
  title: "Forum",
  meta: "Questions · Ideas · Conversation",
};

export function topicCard(
  topic: Pick<ForumTopic, "title" | "replyCount" | "createdAt">,
  forum: Pick<Forum, "name">,
): OgCard {
  const replies = `${String(topic.replyCount)} ${topic.replyCount === 1 ? "reply" : "replies"}`;
  return {
    section: truncate(`${FORUM_LABEL} / ${forum.name}`, CARD_META_LENGTH),
    title: topic.title,
    meta: `${formatPostDate(topic.createdAt)} · ${replies}`,
  };
}

const absolute = (path: string) => new URL(path, SITE_URL).href;

function person(view: PostView): JsonLd {
  return view.author
    ? {
        "@type": "Person",
        name: view.author.name,
        ...(view.author.profile
          ? { url: absolute(profileHref(view.author.username)) }
          : {}),
      }
    : { "@type": "Person", name: "Deleted account" };
}

/** A topic as a discussion: its opening post, and the replies on this page. */
export function discussionJsonLd(input: {
  topic: ForumTopic;
  path: string;
  posts: readonly PostView[];
  image: string;
}): JsonLd {
  const [opening, ...replies] = input.posts;
  return {
    "@type": "DiscussionForumPosting",
    headline: input.topic.title,
    url: absolute(input.path),
    image: absolute(input.image),
    datePublished: input.topic.createdAt.toISOString(),
    ...(opening
      ? {
          author: person(opening),
          text: excerpt(plainText(opening.html), 1000),
          ...(opening.post.editedAt
            ? { dateModified: opening.post.editedAt.toISOString() }
            : {}),
        }
      : {}),
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/CommentAction",
      userInteractionCount: input.topic.replyCount,
    },
    comment: replies
      .filter((view) => view.post.state === "published")
      .slice(0, 20)
      .map((view) => ({
        "@type": "Comment",
        author: person(view),
        datePublished: view.post.createdAt.toISOString(),
        text: excerpt(plainText(view.html), 500),
        url: absolute(`/forum/post/${String(view.post.id)}/`),
      })),
  };
}
