import { TextareaField } from "reading-companion";

export const Default = () => (
  <TextareaField id="preferences" name="preferences" label="Reading preferences" rows={4} description="Used for recommendations in chat." defaultValue="Literary science fiction, slow-paced novels, nothing over 600 pages on weeknights." />
);
