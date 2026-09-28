import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/** Blog posts: src/content/writing/<slug>.md(x), served at /writing/<slug>/. */
const writing = defineCollection({
  loader: glob({ base: "./src/content/writing", pattern: "**/*.{md,mdx}" }),
  schema: z
    .object({
      title: z.string().min(1),
      description: z.string().min(1),
      pubDate: z.coerce.date().optional(),
      updatedDate: z.coerce.date().optional(),
      tags: z.array(z.string().min(1)).default([]),
      /** Drafts show in `pnpm dev` (and the e2e build) but never in production. */
      draft: z.boolean().default(false),
    })
    .refine((post) => post.draft || post.pubDate !== undefined, {
      message: "Published posts need a pubDate",
      path: ["pubDate"],
    }),
});

export const collections = { writing };
