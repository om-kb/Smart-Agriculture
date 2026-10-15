import { generateChatResponse } from "./response.ts";
import {
  MAX_REQUEST_BODY_LENGTH,
  validateChatRequest,
} from "./validation.ts";

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

async function readRequestBody(
  request: Request,
): Promise<{ body: string } | { response: Response }> {
  if (!request.body) return { body: "" };
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let byteLength = 0;

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) {
        return { body: body + decoder.decode() };
      }

      byteLength += chunk.value.byteLength;
      if (byteLength > MAX_REQUEST_BODY_LENGTH) {
        try {
          await reader.cancel();
        } catch {
          return {
            response: errorResponse(
              "Request body exceeds the allowed size.",
              413,
            ),
          };
        }
        return {
          response: errorResponse("Request body exceeds the allowed size.", 413),
        };
      }

      body += decoder.decode(chunk.value, { stream: true });
    }
  } catch {
    return {
      response: errorResponse("The request body could not be read.", 400),
    };
  }
}

export async function handleChatRequest(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLocaleLowerCase("en").includes("application/json")) {
    return errorResponse("Content-Type must be application/json.", 415);
  }

  const lengthHeader = request.headers.get("content-length");
  if (lengthHeader && Number(lengthHeader) > MAX_REQUEST_BODY_LENGTH) {
    return errorResponse("Request body exceeds the allowed size.", 413);
  }

  const body = await readRequestBody(request);
  if ("response" in body) return body.response;

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(body.body);
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const validation = validateChatRequest(parsedBody);
  if (!validation.valid) {
    return errorResponse(validation.error, 400);
  }

  return Response.json(generateChatResponse(validation.value), {
    headers: { "Cache-Control": "no-store" },
  });
}
