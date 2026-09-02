import { describe, expect, it } from "vitest";
import { getApiErrorMessage } from "./api-client";

describe("getApiErrorMessage", () => {
  it("extracts the message from the server error envelope", () => {
    expect(
      getApiErrorMessage(
        { error: { code: "invalid_status", message: "Job cannot move" } },
        "Request failed",
      ),
    ).toBe("Job cannot move");
  });

  it("uses the fallback for malformed error payloads", () => {
    expect(getApiErrorMessage({ error: { code: "unknown" } }, "Request failed")).toBe(
      "Request failed",
    );
  });
});
