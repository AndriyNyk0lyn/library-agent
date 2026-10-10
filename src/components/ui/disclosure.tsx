import type { ComponentPropsWithRef, ReactNode } from "react";

export function Disclosure({
  summary,
  summaryClassName,
  children,
  ...props
}: ComponentPropsWithRef<"details"> & {
  summary: ReactNode;
  summaryClassName?: string;
}) {
  return (
    <details {...props}>
      <summary className={summaryClassName}>{summary}</summary>
      {children}
    </details>
  );
}
export function NotesDisclosure({ notes }: { notes: string }) {
  return notes ? (
    <Disclosure
      summary="Notes"
      summaryClassName="cursor-pointer font-medium"
      className="mt-4"
    >
      <p className="mt-2 whitespace-pre-wrap break-words">{notes}</p>
    </Disclosure>
  ) : null;
}
