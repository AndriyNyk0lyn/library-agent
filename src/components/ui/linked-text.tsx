import { AnchorLink } from "./text-link";

export function LinkedText({ text }: { text: string }) {
  return text.split(/(https?:\/\/[^\s<>()]+)/g).map((part, index) => {
    if (!URL.canParse(part)) return part;
    const url = new URL(part);
    if (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password
    )
      return (
        <AnchorLink
          key={index}
          href={url.href}

          target="_blank"
          rel="noreferrer"
        >
          {part}
        </AnchorLink>
      );
    return part;
  });
}
