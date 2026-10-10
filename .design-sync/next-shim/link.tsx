// ponytail: Claude Design has no Next.js router, so app links render as plain anchors.
import type { AnchorHTMLAttributes } from "react";

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  prefetch?: boolean | null;
  replace?: boolean;
  scroll?: boolean;
};

// Router-only props are dropped so they never reach the DOM.
export default function Link({ prefetch, replace, scroll, ...props }: LinkProps) {
  void prefetch;
  void replace;
  void scroll;
  return <a {...props} />;
}
