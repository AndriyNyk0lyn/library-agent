import type { ComponentProps } from "react";
import { InputField, SelectField, TextareaField } from "@/components/ui/field";
import { readingStatuses, statusLabels } from "./schemas";

export function ReadingStatusOptions() {
  return readingStatuses.map((status) => (
    <option key={status} value={status}>
      {statusLabels[status]}
    </option>
  ));
}
export function ReadingStatusField({
  label = "Reading status",
  emptyLabel,
  ...props
}: ComponentProps<typeof SelectField> & { emptyLabel?: string }) {
  return (
    <SelectField label={label} {...props}>
      {emptyLabel ? <option value="">{emptyLabel}</option> : null}
      <ReadingStatusOptions />
    </SelectField>
  );
}
export function OwnershipField({
  label = "Ownership",
  unknownValue = "unknown",
  unknownLabel = "Unknown",
  ownedValue = "true",
  notOwnedValue = "false",
  ...props
}: ComponentProps<typeof SelectField> & {
  unknownValue?: string;
  unknownLabel?: string;
  ownedValue?: string;
  notOwnedValue?: string;
}) {
  return (
    <SelectField label={label} {...props}>
      <option value={unknownValue}>{unknownLabel}</option>
      <option value={ownedValue}>Owned</option>
      <option value={notOwnedValue}>Not owned</option>
    </SelectField>
  );
}
export function RatingField({
  label = "Rating (optional, out of 5)",
  ...props
}: ComponentProps<typeof InputField>) {
  return (
    <InputField
      label={label}
      type="number"
      min={0.5}
      max={5}
      step={0.5}
      {...props}
    />
  );
}
export function PageCountField({
  label = "Pages (optional)",
  ...props
}: ComponentProps<typeof InputField>) {
  return (
    <InputField
      label={label}
      type="number"
      min={1}
      max={100000}
      step={1}
      {...props}
    />
  );
}
export function NotesField({
  label = "Notes (optional)",
  ...props
}: ComponentProps<typeof TextareaField>) {
  return <TextareaField label={label} maxLength={20000} {...props} />;
}
