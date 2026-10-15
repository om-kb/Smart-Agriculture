import { handleChatRequest } from "../../../../lib/assistant/route-handler.ts";

export function POST(request: Request): Promise<Response> {
  return handleChatRequest(request);
}
