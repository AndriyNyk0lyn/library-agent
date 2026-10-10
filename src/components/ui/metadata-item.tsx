import type { ReactNode } from "react";

export function MetadataItem({
  label,
  children,
  labelClassName,
  valueClassName,
}: {
  label: ReactNode;
  children: ReactNode;
  labelClassName?: string;
  valueClassName?: string;
}) {
  return (
    <div>
      <dt className={labelClassName}>{label}</dt>
      <dd className={valueClassName}>{children}</dd>
    </div>
  );
}
