import { SetupStep } from "reading-companion";

export const InList = () => (
  <ol className="list-decimal space-y-6 pl-6 marker:font-semibold">
    <SetupStep title="Apply the library migration">
      Follow the migration steps in the first-library guide, then sign in, save a book, and refresh to confirm it persists.
    </SetupStep>
  </ol>
);
