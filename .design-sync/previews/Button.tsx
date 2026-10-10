import { Button } from "reading-companion";

export const Primary = () => <Button type="button">Save rating</Button>;

export const Outline = () => (
  <Button type="button" variant="outline">
    Reload this view
  </Button>
);

export const LinkVariant = () => (
  <Button type="button" variant="link">
    Load older conversations
  </Button>
);

export const Disabled = () => (
  <Button type="button" disabled>
    Saving…
  </Button>
);

export const ActionRow = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button type="button">Import Goodreads CSV</Button>
    <Button type="button" variant="outline">
      Filter plans
    </Button>
    <Button type="button" variant="link">
      Clear filters
    </Button>
  </div>
);
