/** Whether a failed server sync should show a blocking error in the UI. */
export function shouldSurfaceSyncError(): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  return true;
}
