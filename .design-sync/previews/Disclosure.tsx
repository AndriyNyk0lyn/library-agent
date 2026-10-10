import { Disclosure } from "reading-companion";

export const Collapsed = () => (
  <Disclosure summary="Show catalog description (may contain spoilers)">
    <p className="mt-2 whitespace-pre-wrap">A young woman lives in a house of endless halls and tides.</p>
  </Disclosure>
);

export const Open = () => (
  <Disclosure open summary="Show catalog description (may contain spoilers)" summaryClassName="cursor-pointer font-medium">
    <p className="mt-2 whitespace-pre-wrap">A young woman lives in a house of endless halls and tides.</p>
  </Disclosure>
);
