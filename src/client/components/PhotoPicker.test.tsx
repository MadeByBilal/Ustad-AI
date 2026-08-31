// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PhotoPicker from "./PhotoPicker";

vi.mock("@/client/lib/image", () => ({
  fileToPhotoBase64: vi.fn(),
}));

import { fileToPhotoBase64 } from "@/client/lib/image";

function jpegFile(name = "tap.jpg"): File {
  return new File([new Uint8Array([0xff, 0xd8, 0xff])], name, { type: "image/jpeg" });
}

function mockUploadOnce(payload: unknown, status = 201): void {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } })
  );
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:preview-1"),
    revokeObjectURL: vi.fn(),
  });
  vi.mocked(fileToPhotoBase64).mockResolvedValue({ mime: "image/jpeg", data: "aGVsbG8=" });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PhotoPicker", () => {
  it("shows the capture button", () => {
    render(<PhotoPicker onPhotos={vi.fn()} />);
    expect(screen.getByRole("button", { name: /take a photo/i })).toBeInTheDocument();
  });

  it("uploads a picked photo and reports its id", async () => {
    const user = userEvent.setup();
    const onPhotos = vi.fn();
    render(<PhotoPicker onPhotos={onPhotos} />);

    mockUploadOnce({ success: true, data: { photo_id: "photo-1" } });
    const input = screen.getByLabelText("Photo") as HTMLInputElement;
    await user.upload(input, jpegFile());

    await waitFor(() => expect(onPhotos).toHaveBeenCalledWith(["photo-1"]));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/jobs/photos",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ mime: "image/jpeg", data: "aGVsbG8=" }),
      })
    );
    expect(await screen.findByTitle("photo-1")).toBeInTheDocument();
  });

  it("accumulates multiple photos", async () => {
    const user = userEvent.setup();
    const onPhotos = vi.fn();
    render(<PhotoPicker onPhotos={onPhotos} />);

    mockUploadOnce({ success: true, data: { photo_id: "photo-1" } });
    mockUploadOnce({ success: true, data: { photo_id: "photo-2" } });
    const input = screen.getByLabelText("Photo") as HTMLInputElement;
    await user.upload(input, jpegFile());
    await user.upload(input, jpegFile("second.jpg"));

    await waitFor(() => expect(onPhotos).toHaveBeenLastCalledWith(["photo-1", "photo-2"]));
  });

  it("removes a photo and reports the shrink", async () => {
    const user = userEvent.setup();
    const onPhotos = vi.fn();
    render(<PhotoPicker onPhotos={onPhotos} />);

    mockUploadOnce({ success: true, data: { photo_id: "photo-1" } });
    await user.upload(screen.getByLabelText("Photo") as HTMLInputElement, jpegFile());
    await waitFor(() => expect(onPhotos).toHaveBeenCalledWith(["photo-1"]));

    await user.click(screen.getByRole("button", { name: /remove photo/i }));
    expect(onPhotos).toHaveBeenLastCalledWith([]);
  });

  it("shows the upload failure and keeps the picker usable", async () => {
    const user = userEvent.setup();
    const onPhotos = vi.fn();
    render(<PhotoPicker onPhotos={onPhotos} />);

    mockUploadOnce({ success: false, error: "boom" }, 400);
    await user.upload(screen.getByLabelText("Photo") as HTMLInputElement, jpegFile());

    expect(await screen.findByText(/upload failed/i)).toBeInTheDocument();
    expect(onPhotos).not.toHaveBeenCalled();
  });

  it("rejects a non-image file locally", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<PhotoPicker onPhotos={vi.fn()} />);

    const bad = new File(["hello"], "notes.txt", { type: "text/plain" });
    await user.upload(screen.getByLabelText("Photo") as HTMLInputElement, bad);

    expect(await screen.findByText(/only images/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});