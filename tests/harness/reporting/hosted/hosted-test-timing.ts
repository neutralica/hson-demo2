export function format_hosted_test_duration(ms: number): string {
  const finiteMs = Number.isFinite(ms) && ms >= 0 ? ms : 0;
  if (finiteMs < 1000) return `${finiteMs.toFixed(1)} ms`;
  const seconds = finiteMs / 1000;
  return `${seconds.toFixed(seconds < 10 ? 2 : 1)} s`;
}
