import { TextLink } from "./text-link";

export function Pagination({
  label,
  previousHref,
  nextHref,
  nextLabel = "Next page",
  className = "mt-6 flex gap-6",
}: {
  label: string;
  previousHref?: string;
  nextHref?: string;
  nextLabel?: string;
  className?: string;
}) {
  if (!previousHref && !nextHref) return null;
  return (
    <nav aria-label={label} className={className}>
      {previousHref && <TextLink href={previousHref}>Previous page</TextLink>}
      {nextHref && <TextLink href={nextHref}>{nextLabel}</TextLink>}
    </nav>
  );
}
