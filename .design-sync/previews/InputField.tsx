import { InputField } from "reading-companion";

export const Default = () => <InputField id="title" name="title" label="Title" defaultValue="The Dispossessed" />;

export const WithDescription = () => (
  <InputField id="authors" name="authors" label="Authors" description="Separate several authors with commas." defaultValue="Ursula K. Le Guin" />
);

export const WithError = () => (
  <InputField id="pages-read" name="pages_read" label="Pages read" type="number" defaultValue="412" error="Pages read cannot exceed the book’s 304 pages." />
);
