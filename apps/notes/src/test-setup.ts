import { MotionGlobalConfig } from "motion/react";

// Tests check what's on screen, not how it got there: finish animations at once.
MotionGlobalConfig.skipAnimations = true;
