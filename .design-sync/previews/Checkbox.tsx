import { Checkbox } from "reading-companion";

export const States = () => (
  <div className="flex gap-4">
    <Checkbox aria-label="Owned" defaultChecked />
    <Checkbox aria-label="Not owned" />
    <Checkbox aria-label="Unavailable" disabled />
  </div>
);
