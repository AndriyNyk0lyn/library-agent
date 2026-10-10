import type { ComponentPropsWithRef, ReactNode } from "react";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Select } from "./select";
import { Label } from "./label";

export function FieldHelp({
  className = "mt-1 text-sm text-muted",
  ...props
}: ComponentPropsWithRef<"p">) {
  return <p className={className} {...props} />;
}
export function FieldError({ children, ...props }: ComponentPropsWithRef<"p">) {
  return children ? (
    <p className="mt-1 text-sm text-red-800" {...props}>
      {children}
    </p>
  ) : null;
}
type FieldProps = {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  descriptionClassName?: string;
  error?: string | string[];
};

export function Field({
  id,
  label,
  description,
  descriptionClassName,
  error,
  children,
}: FieldProps & { children: ReactNode }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {description ? (
        <FieldHelp id={`${id}-help`} className={descriptionClassName}>
          {description}
        </FieldHelp>
      ) : null}
      <FieldError id={`${id}-error`}>
        {Array.isArray(error) ? error.join(" ") : error}
      </FieldError>
    </div>
  );
}
function controlAttributes(
  { id, description, error }: FieldProps,
  describedBy?: string,
) {
  return {
    id,
    "aria-describedby":
      [
        describedBy,
        description ? `${id}-help` : undefined,
        error ? `${id}-error` : undefined,
      ]
        .filter(Boolean)
        .join(" ") || undefined,
  };
}
export function InputField({
  id,
  label,
  description,
  descriptionClassName,
  error,
  ...props
}: FieldProps & Omit<ComponentPropsWithRef<"input">, "id">) {
  const field = { id, label, description, descriptionClassName, error };
  return (
    <Field {...field}>
      <Input
        {...props}
        {...controlAttributes(field, props["aria-describedby"])}
        aria-invalid={error ? true : props["aria-invalid"]}
      />
    </Field>
  );
}
export function TextareaField({
  id,
  label,
  description,
  descriptionClassName,
  error,
  ...props
}: FieldProps & Omit<ComponentPropsWithRef<"textarea">, "id">) {
  const field = { id, label, description, descriptionClassName, error };
  return (
    <Field {...field}>
      <Textarea
        {...props}
        {...controlAttributes(field, props["aria-describedby"])}
        aria-invalid={error ? true : props["aria-invalid"]}
      />
    </Field>
  );
}
export function SelectField({
  id,
  label,
  description,
  descriptionClassName,
  error,
  ...props
}: FieldProps & Omit<ComponentPropsWithRef<"select">, "id">) {
  const field = { id, label, description, descriptionClassName, error };
  return (
    <Field {...field}>
      <Select
        {...props}
        {...controlAttributes(field, props["aria-describedby"])}
        aria-invalid={error ? true : props["aria-invalid"]}
      />
    </Field>
  );
}
