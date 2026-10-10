import { AppHeader, CurrentPathProvider } from "reading-companion";

export const OnLibrary = () => (
  <CurrentPathProvider pathname="/library">
    <AppHeader />
  </CurrentPathProvider>
);
