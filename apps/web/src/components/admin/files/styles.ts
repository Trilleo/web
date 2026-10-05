/** Button looks shared by the admin's file pages (list, review queue, uploader panel). */
export const smallButton =
  "type-label inline-flex h-8 cursor-pointer items-center border border-ink px-3 press";
/** A small button drawn filled: the action that puts something (back) in circulation. */
export const primaryButton = `${smallButton} bg-ink text-paper hover:bg-accent hover:text-on-accent`;
export const secondaryButton = `${smallButton} hover:bg-chip`;
/** Joined toggles: neighbours share a border. */
export const segment =
  "type-label -ml-px inline-flex h-8 items-center border border-ink px-3 first:ml-0";
