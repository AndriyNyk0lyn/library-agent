import { AppNavigation, CurrentPathProvider } from "reading-companion";

export const OnLibrary = () => (
  <CurrentPathProvider pathname="/library">
    <AppNavigation />
  </CurrentPathProvider>
);

export const OnPlanDetail = () => (
  <CurrentPathProvider pathname="/plans/new">
    <AppNavigation />
  </CurrentPathProvider>
);
