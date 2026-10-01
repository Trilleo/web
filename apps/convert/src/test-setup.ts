import { MotionGlobalConfig } from "motion/react";

// Tests check what's on screen, not how it got there: finish animations at once.
MotionGlobalConfig.skipAnimations = true;

// jsdom has no canvas encoder: report every format as unwritable instead of
// logging "not implemented" (the format probe then disables WebP).
HTMLCanvasElement.prototype.toBlob = function toBlob(callback: BlobCallback) {
  callback(null);
};
