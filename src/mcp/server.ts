import "server-only";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { ReaderContext } from "@/books/service";
import { readerTools } from "./tools";

export function createLibraryMcpServer(reader: ReaderContext) {
  const server = new Server(
    { name: "reading-companion", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: readerTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: {
        ...z.toJSONSchema(tool.inputSchema, { io: "input" }),
        type: "object" as const,
      },
      outputSchema: {
        ...z.toJSONSchema(tool.outputSchema),
        type: "object" as const,
      },
      annotations: {
        readOnlyHint: tool.readOnly,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    })),
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = readerTools.find((tool) => tool.name === request.params.name);
    if (!tool) throw new McpError(ErrorCode.InvalidParams, "Unknown tool.");
    let result;
    try {
      result = await tool.execute(reader, request.params.arguments ?? {});
    } catch {
      result = {
        ok: false,
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message: tool.readOnly
            ? "Book storage is temporarily unavailable. Try again."
            : "Save outcome is uncertain. Retry identical inputs and operation ID, or read the current record/saved plans.",
        },
      };
    }
    const output = tool.outputSchema.parse(result);
    return {
      isError: !output.ok,
      structuredContent: output,
      content: [{ type: "text", text: JSON.stringify(output) }],
    };
  });
  return server;
}
