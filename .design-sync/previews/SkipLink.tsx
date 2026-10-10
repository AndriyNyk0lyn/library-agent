import { SkipLink } from "reading-companion";

// SkipLink is visually hidden until keyboard focus. This cell reveals its focused
// appearance with not-sr-only, since a static card cannot hold keyboard focus.
export const FocusedAppearance = () => (
  <div className="relative h-16 [&>a]:not-sr-only [&>a]:absolute [&>a]:top-3 [&>a]:left-3">
    <SkipLink />
  </div>
);
