export type FormState = { error?: string; message?: string };

export function FormFeedback({ state }: { state: FormState }) {
  return (
    <>
      {state.error ? (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-red-800"
        >
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="rounded border border-line bg-surface p-3">
          {state.message}
        </p>
      ) : null}
    </>
  );
}
