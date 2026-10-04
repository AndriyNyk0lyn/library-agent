import { handleMcp } from "@/mcp/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export {
  handleMcp as POST,
  handleMcp as GET,
  handleMcp as DELETE,
  handleMcp as OPTIONS,
};
