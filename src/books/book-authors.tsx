export function BookAuthors({
  authors,
  fallback = "",
  className,
}: {
  authors: string[];
  fallback?: string;
  className?: string;
}) {
  return <p className={className}>{authors.join(", ") || fallback}</p>;
}
