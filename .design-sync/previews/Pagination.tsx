import { Pagination } from "reading-companion";

export const BothDirections = () => <Pagination label="Library pages" previousHref="/library?page=1" nextHref="/library?page=3" />;

export const NextOnly = () => <Pagination label="Conversations" nextHref="/chat?before=42" nextLabel="Older conversations" />;
