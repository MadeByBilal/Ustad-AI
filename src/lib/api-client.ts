export async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || body.success !== true) {
    throw new Error(body?.error ?? "Request failed");
  }
  return body.data as T;
}