export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
export const healthEndpoint = `${API_BASE_URL}/api/v1/health`;
