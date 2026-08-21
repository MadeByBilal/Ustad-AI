export async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || body.success !== true) {
    const errorMessage =
      typeof body?.error === "object"
        ? body.error.message ?? "Request failed"
        : body?.error ?? "Request failed";
    throw new Error(errorMessage);
  }
  return body.data as T;
}
