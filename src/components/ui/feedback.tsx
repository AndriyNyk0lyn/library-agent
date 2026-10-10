import type { ComponentPropsWithRef, ReactNode } from "react";
import { CardSection } from "./card";

export function ErrorMessage(props: ComponentPropsWithRef<"p">) {
  return <p {...props} role="alert" />;
}
export function StatusMessage(props: ComponentPropsWithRef<"p">) {
  return <p {...props} role="status" />;
}
export function LoadingMessage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <StatusMessage className={className}>{children}</StatusMessage>;
}
export function EmptyState({
  title,
  children,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <CardSection className={className}>
      {title ? <h2 className="text-lg font-semibold">{title}</h2> : null}
      {children}
    </CardSection>
  );
}
