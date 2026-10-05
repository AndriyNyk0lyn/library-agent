import "server-only";
import { z } from "zod";
import { setTimeout as delay } from "node:timers/promises";
import { catalogEnabled } from "./config";
import {
  catalogSearchSchema,
  catalogCandidateSchema,
  editionIdSchema,
  type CatalogCandidate,
  type CatalogSearchResult,
} from "./schema";

const strings = z.array(z.string());
const searchResponseSchema = z.object({
  docs: z.array(
    z.object({
      key: z.string(),
      title: z.string(),
      author_name: strings.nullish(),
      editions: z
        .object({ docs: z.array(z.object({ key: z.string() })) })
        .nullish(),
    }),
  ),
});
const editionSchema = z.object({
  key: z.string(),
  title: z.string(),
  authors: z.array(z.object({ key: z.string() })).nullish(),
  isbn_10: strings.nullish(),
  isbn_13: strings.nullish(),
  number_of_pages: z.unknown().optional(),
  covers: z.array(z.number()).nullish(),
  languages: z.array(z.object({ key: z.string() })).nullish(),
  description: z.union([z.string(), z.object({ value: z.string() })]).nullish(),
  publishers: strings.nullish(),
  publish_date: z.string().nullish(),
});

// Public metadata only. Bounded per-process cache and admission; never store reader data here.
const cache = new Map<string, { expires: number; value: unknown }>();
let nextRequestAt = 0;
async function requestJson(path: string, signal?: AbortSignal) {
  if (!catalogEnabled()) throw new Error("CATALOG_DISABLED");
  const contact = z.email().safeParse(process.env.OPEN_LIBRARY_CONTACT_EMAIL);
  if (!contact.success) throw new Error("CATALOG_CONTACT_REQUIRED");
  const cached = cache.get(path);
  if (cached && cached.expires > Date.now()) return cached.value;
  cache.delete(path);
  // Reject excess requests instead of building an unbounded queue. No automatic retries.
  if (Date.now() < nextRequestAt) throw new Error("CATALOG_BUSY");
  nextRequestAt = Date.now() + 1100;
  const response = await fetch(`https://openlibrary.org${path}`, {
    headers: {
      "User-Agent": `ReadingCompanion (${contact.data})`,
      Accept: "application/json",
    },
    signal: AbortSignal.any([
      AbortSignal.timeout(7000),
      ...(signal ? [signal] : []),
    ]),
    redirect: "error",
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 429) nextRequestAt = Date.now() + 60000;
    throw new Error("CATALOG_UPSTREAM");
  }
  // Bound decompressed responses as well as search results.
  const stream = response.body?.getReader();
  if (!stream) throw new Error("CATALOG_RESPONSE");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const chunk = await stream.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 524288) throw new Error("CATALOG_RESPONSE_SIZE");
      chunks.push(chunk.value);
    }
  } finally {
    await stream.cancel();
  }
  const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (cache.size >= 100) cache.delete(cache.keys().next().value ?? "");
  cache.set(path, { expires: Date.now() + 300000, value });
  return value;
}
const failure = (
  code: "VALIDATION_ERROR" | "UPSTREAM_UNAVAILABLE",
  message: string,
) => ({ ok: false as const, error: { code, message } });

export async function searchBooks(
  input: unknown,
): Promise<CatalogSearchResult> {
  const parsed = catalogSearchSchema.safeParse(input);
  if (!parsed.success)
    return failure(
      "VALIDATION_ERROR",
      "Enter a query, optional author/ISBN, and a limit from 1 to 10.",
    );
  try {
    const params = new URLSearchParams({
      q: parsed.data.query,
      limit: String(parsed.data.limit),
      fields: "key,title,author_name,editions,editions.key",
    });
    if (parsed.data.author) params.set("author", parsed.data.author);
    if (parsed.data.isbn) params.set("isbn", parsed.data.isbn);
    const response = searchResponseSchema.parse(
      await requestJson(`/search.json?${params}`),
    );
    const candidates: CatalogCandidate[] = [];
    for (const work of response.docs.slice(0, parsed.data.limit)) {
      const workId = work.key.replace(/^\/works\//, "");
      if (!/^OL[0-9]+W$/.test(workId)) continue;
      const edition = work.editions?.docs[0]?.key.replace(/^\/books\//, "");
      const editionId = editionIdSchema.safeParse(edition);
      const candidate = catalogCandidateSchema.safeParse({
        provider: "open_library",
        kind: "work",
        provider_id: workId,
        source_url: `https://openlibrary.org/works/${workId}`,
        title: work.title,
        authors: (work.author_name ?? []).slice(0, 10),
        edition_id: editionId.success ? editionId.data : null,
        isbn10: null,
        isbn13: null,
        page_count: null,
        cover_url: null,
        description: null,
        language: [],
        publishers: [],
        publish_date: null,
      });
      if (candidate.success) candidates.push(candidate.data);
    }
    if (response.docs.length && !candidates.length)
      throw new Error("CATALOG_RESPONSE");
    return { ok: true, candidates };
  } catch {
    return failure(
      "UPSTREAM_UNAVAILABLE",
      "Open Library is unavailable or busy. Try again shortly. Your library is still available.",
    );
  }
}

export async function getBookDetails(
  input: unknown,
): Promise<
  | { ok: true; candidate: CatalogCandidate }
  | Extract<CatalogSearchResult, { ok: false }>
> {
  const id = editionIdSchema.safeParse(input);
  if (!id.success)
    return failure("VALIDATION_ERROR", "Choose an Open Library edition ID.");
  try {
    const signal = AbortSignal.timeout(15000);
    const edition = editionSchema.parse(
      await requestJson(`/books/${id.data}.json`, signal),
    );
    if (edition.key !== `/books/${id.data}`) throw new Error("CATALOG_EDITION");
    const authors: string[] = [];
    // Edition authors are resolved individually, only on deliberate selection, never during search.
    for (const author of (edition.authors ?? []).slice(0, 10)) {
      if (!/^\/authors\/OL[0-9]+A$/.test(author.key)) continue;
      const authorPath = `${author.key}.json`;
      if (
        (cache.get(authorPath)?.expires ?? 0) <= Date.now() &&
        Date.now() < nextRequestAt
      )
        await delay(Math.max(0, nextRequestAt - Date.now()), undefined, {
          signal,
        });
      const result = z
        .object({ name: z.string().trim().min(1).max(200) })
        .parse(await requestJson(authorPath, signal));
      authors.push(result.name);
    }
    const pages = z
      .number()
      .int()
      .min(1)
      .max(100000)
      .safeParse(edition.number_of_pages);
    const cover = edition.covers?.find(
      (value) => Number.isSafeInteger(value) && value > 0,
    );
    const description =
      typeof edition.description === "string"
        ? edition.description
        : edition.description?.value;
    const candidate = catalogCandidateSchema.parse({
      provider: "open_library",
      kind: "edition",
      provider_id: id.data,
      edition_id: id.data,
      source_url: `https://openlibrary.org/books/${id.data}`,
      title: edition.title,
      authors,
      isbn10:
        edition.isbn_10?.find((value) => /^[0-9]{9}[0-9X]$/.test(value)) ??
        null,
      isbn13:
        edition.isbn_13?.find((value) => /^[0-9]{13}$/.test(value)) ?? null,
      page_count: pages.success ? pages.data : null,
      cover_url: cover
        ? `https://covers.openlibrary.org/b/id/${cover}-M.jpg`
        : null,
      description: description?.slice(0, 2000) ?? null,
      language: (edition.languages ?? [])
        .map((value) => value.key.replace(/^\/languages\//, ""))
        .filter((value) => /^[a-z]{3}$/.test(value))
        .slice(0, 10),
      publishers: (edition.publishers ?? [])
        .map((value) => value.slice(0, 200))
        .slice(0, 10),
      publish_date: edition.publish_date?.slice(0, 100) ?? null,
    });
    return { ok: true, candidate };
  } catch {
    return failure(
      "UPSTREAM_UNAVAILABLE",
      "Could not load this Open Library edition. Try again shortly, or add the book manually.",
    );
  }
}
