import { SubmitButton } from "reading-companion";

export const InSearchForm = () => (
  <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => event.preventDefault()}>
    <label className="min-w-64">
      <span className="form-label">Search title or author</span>
      <input className="form-field" name="q" defaultValue="Le Guin" />
    </label>
    <SubmitButton pendingLabel="Searching…">Search library</SubmitButton>
  </form>
);

export const SaveBook = () => (
  <form onSubmit={(event) => event.preventDefault()}>
    <SubmitButton pendingLabel="Saving book…">Save book</SubmitButton>
  </form>
);
