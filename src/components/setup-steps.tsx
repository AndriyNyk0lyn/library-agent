import type { ReactNode } from "react";

export function SetupStep({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="pl-2">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 max-w-2xl leading-relaxed text-muted">{children}</p>
    </li>
  );
}
export function SetupSteps() {
  return (
    <ol className="list-decimal space-y-6 pl-6 marker:font-semibold">
      <SetupStep title="Finish email confirmation setup">
        Use your existing Supabase project and its default email sender. Set the
        confirmation URL and email templates using the first-library guide in
        the project docs.
      </SetupStep>
      <SetupStep title="Apply the library migration">
        Follow the migration steps in the first-library guide, then sign in,
        save a book, and refresh to confirm it persists.
      </SetupStep>
      <SetupStep title="Configure agent chat">
        Apply the chat/profile migration and configure the OpenAI key and model
        using the chat setup guide. Recommendations use your saved library.
        Apply the reading-plans migration using the plans setup guide, then
        check and deliberately save schedules from a library book.
      </SetupStep>
    </ol>
  );
}
