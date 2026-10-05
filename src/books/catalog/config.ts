import "server-only";

export function catalogEnabled() {
  return process.env.OPEN_LIBRARY_ENABLED === "true";
}
