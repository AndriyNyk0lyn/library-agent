import { FormFeedback } from "reading-companion";

export const Success = () => (
  <FormFeedback state={{ message: "Saved “The Left Hand of Darkness” to your library." }} />
);

export const ValidationError = () => (
  <FormFeedback
    state={{ error: "Page count must be a whole number above 0. Your other details were kept." }}
  />
);

export const InForm = () => (
  <div className="max-w-xl space-y-4">
    <label className="block">
      <span className="form-label">Pages read</span>
      <input className="form-field" defaultValue="412" />
    </label>
    <FormFeedback state={{ error: "Pages read cannot exceed the book's 304 pages." }} />
  </div>
);
