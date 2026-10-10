import { CheckboxField } from "reading-companion";

export const Options = () => (
  <div className="space-y-2">
    <CheckboxField name="skip_duplicates" label="Skip rows that match a saved book" defaultChecked />
    <CheckboxField name="import_notes" label="Import Goodreads private notes" />
  </div>
);
