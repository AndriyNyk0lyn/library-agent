import { ErrorMessage, StatusMessage } from "./feedback";
export type FormState = { error?: string; message?: string };

export function FormFeedback({ state }: { state: FormState }) {
  return (
    <>
      {state.error ? (
        <ErrorMessage className="rounded border border-red-300 bg-red-50 p-3 text-red-800">
          {state.error}
        </ErrorMessage>
      ) : null}
      {state.message ? (
        <StatusMessage className="rounded border border-line bg-surface p-3">
          {state.message}
        </StatusMessage>
      ) : null}
    </>
  );
}
