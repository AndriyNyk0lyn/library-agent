import { ReadingStatusField } from "reading-companion";

export const Default = () => <ReadingStatusField id="status" name="status" defaultValue="reading" />;

export const AsFilter = () => <ReadingStatusField id="status-filter" name="status" emptyLabel="All statuses" defaultValue="" />;
