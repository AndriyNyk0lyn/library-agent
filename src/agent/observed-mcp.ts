import "server-only";
import {
  MCPServerStreamableHttp,
  type MCPCallToolOptions,
} from "@openai/agents";
import { z } from "zod";
import { getMcpEndpoint } from "@/lib/supabase/config";
import { bookResultSchema } from "@/books/management-schema";
import { librarySearchResultSchema } from "@/books/search-schema";
import type { CatalogCandidate } from "@/books/catalog/schema";
import { activitySchema, type Activity } from "./schema";
import { RecommendationCandidates } from "./recommendation-candidates";
import { CatalogCandidates } from "./catalog-candidates";
import {
  webSearchResultSchema,
  type webSourceSchema,
} from "@/web-search/schema";
import { PlanResults } from "./plan-results";

// Await durable activity around the real HTTP call, including server-side card checks.
export class ObservedMcp extends MCPServerStreamableHttp {
  attemptedWrite = false;
  readonly plans = new PlanResults();
  readonly catalog: CatalogCandidates;
  readonly webSources = new Map<string, z.output<typeof webSourceSchema>>();
  constructor(
    token: string,
    private signal: AbortSignal,
    private candidates: RecommendationCandidates,
    private activity: (activity: Activity) => Promise<void>,
    referencePrefix: string,
  ) {
    super({
      name: "Reader library",
      url: getMcpEndpoint().href,
      timeout: 22000,
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
      fetch: (input: string | URL | Request, init?: RequestInit) =>
        fetch(input, {
          ...init,
          redirect: "error",
          signal: AbortSignal.any([
            signal,
            AbortSignal.timeout(22000),
            ...(init?.signal ? [init.signal] : []),
          ]),
        }),
      useStructuredContent: true,
      errorFunction: null,
      logger: {
        namespace: "reader-mcp",
        debug: () => {},
        warn: () => {},
        error: () => {},
        dontLogModelData: true,
        dontLogToolData: true,
      },
    });
    this.catalog = new CatalogCandidates(referencePrefix);
  }
  override async callToolResult(
    name: string,
    args: Record<string, unknown> | null,
    meta?: Record<string, unknown> | null,
    options?: MCPCallToolOptions,
  ) {
    if (!this.plans.allowAttempt(name, args)) {
      const output = {
        ok: false,
        error: {
          code: "REVISION_LIMIT",
          message:
            "Two plan revisions have been attempted. Explain the constraints and ask for agreement before trying again in a later turn.",
        },
      };
      this.plans.observe(name, output);
      return {
        isError: true,
        structuredContent: output,
        content: [{ type: "text" as const, text: JSON.stringify(output) }],
      };
    }
    const result = await this.callObserved(name, args, meta, options);
    this.plans.observe(name, result.structuredContent, args);
    if (name === "search_web") {
      const web = webSearchResultSchema.safeParse(result.structuredContent);
      if (web.success && web.data.ok)
        for (const source of web.data.sources) {
          if (this.webSources.size < 10)
            this.webSources.set(source.url, source);
        }
    }
    const annotated =
      this.candidates.annotate(name, result.structuredContent) ??
      this.catalog.annotate(name, result.structuredContent);
    return annotated
      ? {
          ...result,
          structuredContent: annotated,
          content: [{ type: "text" as const, text: JSON.stringify(annotated) }],
        }
      : result;
  }
  async verifyBook(id: string) {
    const result = await this.callObserved("get_book", { id });
    return bookResultSchema.parse(result.structuredContent);
  }
  async verifyExternalCandidate(candidate: CatalogCandidate) {
    const response = await this.callObserved("search_my_library", {
      query: candidate.title.slice(0, 200),
      limit: 50,
    });
    const library = librarySearchResultSchema.parse(response.structuredContent);
    if (!library.ok || library.hasMore)
      throw new Error("RECOMMENDATION_READ_UNAVAILABLE");
    const normalize = (value: string) => value.trim().toLocaleLowerCase("en");
    if (
      library.books.some(
        (book) =>
          normalize(book.title) === normalize(candidate.title) &&
          (candidate.authors.length === 0 ||
            candidate.authors.some((author) =>
              book.authors.some(
                (saved) => normalize(saved) === normalize(author),
              ),
            )),
      )
    )
      throw new Error("RECOMMENDATION_ALREADY_IN_LIBRARY");
  }
  private async callObserved(
    name: string,
    args: Record<string, unknown> | null,
    meta?: Record<string, unknown> | null,
    options?: MCPCallToolOptions,
  ) {
    const tool = activitySchema.shape.tool.parse(name);
    this.signal.throwIfAborted();
    await this.activity({ tool, phase: "started" });
    try {
      if (
        tool === "update_book" ||
        tool === "add_catalog_book" ||
        tool === "apply_library_update" ||
        tool === "update_reader_profile" ||
        tool === "save_reading_plan"
      )
        this.attemptedWrite = true;
      const result = await super.callToolResult(name, args, meta, {
        ...options,
        signal: options?.signal
          ? AbortSignal.any([this.signal, options.signal])
          : this.signal,
      });
      const outcome = z
        .object({ ok: z.boolean() })
        .safeParse(result.structuredContent);
      await this.activity({
        tool,
        phase: "completed",
        outcome:
          result.isError || !outcome.success || !outcome.data.ok
            ? "error"
            : "ok",
      });
      return result;
    } catch (error) {
      // Completion might itself be unavailable: persisted 'started' remains an honest uncertainty signal.
      if (!this.signal.aborted)
        await this.activity({ tool, phase: "completed", outcome: "uncertain" });
      throw error;
    }
  }
}
