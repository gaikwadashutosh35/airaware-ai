// An Ask summary must never read as a yes or no on safety (spec §7.4). The
// plan's own checks already refuse "safe", "healthy" and numbers.
export const VERDICT =
  /(?:^\s*(?:yes|no)\b)|\bgo ahead\b|\b(fine|ok|okay|alright) to\b|\b(good|bad) idea\b/i;
