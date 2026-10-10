import { Field, Input } from "reading-companion";

export const WithHelp = () => (
  <Field id="isbn" label="ISBN (optional)" description="10 or 13 digits, without spaces.">
    <Input id="isbn" aria-describedby="isbn-help" defaultValue="9780441478125" />
  </Field>
);
