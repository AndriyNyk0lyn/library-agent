import { SelectField } from "reading-companion";

export const Default = () => (
  <SelectField id="timezone" name="timezone" label="Timezone" defaultValue="Europe/London">
    <option value="Europe/London">Europe/London</option>
    <option value="America/New_York">America/New_York</option>
  </SelectField>
);
