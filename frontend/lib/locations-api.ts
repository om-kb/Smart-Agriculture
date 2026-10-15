export async function fetchLocationOptions<T>(
  path: string,
  isOption: (value: unknown) => value is T,
  signal?: AbortSignal,
): Promise<T[]> {
  let response: Response;
  try {
    response = await fetch(path, { signal });
  } catch {
    throw new Error("Could not connect. Check your internet connection and retry.");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Location data could not be read. Please retry.");
  }

  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.error === "string"
        ? payload.error
        : "Location data is temporarily unavailable. Please retry.";
    throw new Error(message);
  }

  if (
    !isRecord(payload) ||
    !Array.isArray(payload.data) ||
    !payload.data.every(isOption)
  ) {
    throw new Error("Location data could not be read. Please retry.");
  }

  return payload.data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
