import "server-only";
import {
  MCPServerStreamableHttp,
  type MCPCallToolOptions,
} from "@openai/agents";
import { z } from "zod";
import { getMcpEndpoint } from "@/lib/supabase/config";
import { bookResultSchema } from "@/books/management-schema";
import { activitySchema, type Activity } from "./schema";
import { RecommendationCandidates } from "./recommendation-candidates";
import { PlanResults } from "./plan-results";

// Await durable activity around the real HTTP call, including server-side card checks.
export class ObservedMcp extends MCPServerStreamableHttp {
  attemptedWrite = false;
  readonly plans = new PlanResults();
  constructor(
    token: string,
    private signal: AbortSignal,
    private candidates: RecommendationCandidates,
    private activity: (activity: Activity) => Promise<void>,
  ) {
    super({
      name: "Reader library",
      url: getMcpEndpoint().href,
      timeout: 12000,
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
      fetch: (input: string | URL | Request, init?: RequestInit) =>
        fetch(input, {
          ...init,
          redirect: "error",
          signal: AbortSignal.any([
            signal,
            AbortSignal.timeout(12000),
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
    const annotated = this.candidates.annotate(name, result.structuredContent);
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
