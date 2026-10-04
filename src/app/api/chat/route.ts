import { getChat, postChat } from "@/agent/chat-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

export { getChat as GET, postChat as POST };
