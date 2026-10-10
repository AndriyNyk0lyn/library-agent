// Stands in for next/navigation inside Claude Design, where no Next.js router exists.
import { createContext, useContext, type ReactNode } from "react";

const CurrentPathContext = createContext("");

export function usePathname() {
  return useContext(CurrentPathContext);
}

/** Sets the route AppNavigation treats as current, e.g. pathname="/library". */
export function CurrentPathProvider({ pathname, children }: { pathname: string; children: ReactNode }) {
  return <CurrentPathContext.Provider value={pathname}>{children}</CurrentPathContext.Provider>;
}
