import { Select } from "reading-companion";

export const Default = () => (
  <Select aria-label="Reading status" defaultValue="reading">
    <option value="">All statuses</option>
    <option value="reading">Reading</option>
    <option value="finished">Finished</option>
  </Select>
);
