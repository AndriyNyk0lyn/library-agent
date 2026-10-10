import { NavigationLink } from "reading-companion";

export const CurrentAndIdle = () => (
  <nav className="flex gap-1">
    <NavigationLink href="/library" current>Library</NavigationLink>
    <NavigationLink href="/plans" current={false}>Plans</NavigationLink>
  </nav>
);
