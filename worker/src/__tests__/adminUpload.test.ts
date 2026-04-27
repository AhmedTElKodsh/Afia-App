/**
 * Admin Upload Handler Tests
 * Story 5.4 - Admin Image Upload
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleAdminUpload } from "../adminUpload";
import * as supabaseClient from "../storage/supabaseClient";
import * as admin from "../admin";
import * as bottleRegistry from "../bottleRegistry";

vi.mock("../storage/supabaseClient.ts");
vi.mock("../admin.ts", () => ({
  verifyAdminSession: vi.fn(),
  handleGetScans: vi.fn(),
}));
vi.mock("../bottleRegistry.ts", () => ({
  getBottleBySku: vi.fn(),
  bottleRegistry: [],
}));

describe("handleAdminUpload", () => {
  const mockEnv = {
    ADMIN_PASSWORD: "test-password",
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-key",
  };

  const VALID_SKU = "filippo-berio-500ml";

  function makeFile(
    content: string | Uint8Array,
    type: string,
    name = "test.jpg"
  ): File {
    // Don't double-wrap - pass content directly to File constructor
    return new File([content], name, { type });
  }

  function makeFormData(overrides: {
    file?: File | null;
    sku?: string;
    fillPercentage?: string;
    augmentationType?: string;
  } = {}): FormData {
    const fd = new FormData();
    const file =
      overrides.file !== undefined
        ? overrides.file
        : makeFile("fake-image-data", "image/jpeg");
    if (file) fd.append("file", file);
    fd.append("sku", overrides.sku ?? VALID_SKU);
    fd.append("fillPercentage", overrides.fillPercentage ?? "50");
    fd.append("augmentationType", overrides.augmentationType ?? "none");
    return fd;
  }

  function makeRequest(formData: FormData, token = "valid-token"): Request {
    return new Request("https://example.com/admin/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  }

  function mockContext(request: Request, env: any) {
    return {
      req: {
        raw: request,
        header: vi.fn((name: string) => request.headers.get(name)),
        formData: () => request.formData(),
      },
      env,
      get: vi.fn((key: string) => (key === "requestId" ? "test-req-id" : undefined)),
      json: vi.fn((data: any, status?: number) => new Response(JSON.stringify(data), { status: status ?? 200 })),
    } as any;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(admin.verifyAdminSession).mockImplementation(async (c: any) => {
      const auth = c.req.raw.headers.get("Authorization");
      return auth === "Bearer valid-token";
    });
    vi.mocked(bottleRegistry.getBottleBySku).mockImplementation((sku: string) =>
      sku === VALID_SKU ? ({ sku } as any) : null
    );
    vi.mocked(supabaseClient.storeAdminUpload).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 if no Bearer token", async () => {
    const req = makeRequest(makeFormData(), "bad-token");
    const res = await handleAdminUpload(mockContext(req, mockEnv));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 if file missing", async () => {
    const fd = new FormData();
    fd.append("sku", VALID_SKU);
    fd.append("fillPercentage", "50");
    const req = makeRequest(fd);
    const res = await handleAdminUpload(mockContext(req, mockEnv));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("MISSING_FILE");
  });

  it("returns 413 if file > 4MB", async () => {
    const largeContent = new Uint8Array(4 * 1024 * 1024 + 1);
    const bigFile = makeFile(largeContent, "image/jpeg", "big.jpg");

    const fd = makeFormData({ file: bigFile });
    const req = makeRequest(fd);

    // Create a mock context with a custom formData handler that preserves file size
    const mockCtx = mockContext(req, mockEnv);
    const originalFormData = mockCtx.req.formData;
    mockCtx.req.formData = async () => {
      const formData = await originalFormData();
      // Replace the file with one that has the correct size
      const file = formData.get('file') as File;
      if (file) {
        const largeFile = new File([largeContent], file.name, { type: file.type });
        formData.set('file', largeFile);
      }
      return formData;
    };

    const res = await handleAdminUpload(mockCtx);
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.code).toBe("FILE_TOO_LARGE");
  });

  it("returns 400 if MIME type not jpeg or png", async () => {
    const gifFile = makeFile("gif-data", "image/gif", "anim.gif");
    const req = makeRequest(makeFormData({ file: gifFile }));
    const res = await handleAdminUpload(mockContext(req, mockEnv));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("INVALID_FILE_TYPE");
  });

  it("returns 400 if SKU not in bottleRegistry", async () => {
    const req = makeRequest(makeFormData({ sku: "unknown-sku-xyz" }));
    const res = await handleAdminUpload(mockContext(req, mockEnv));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("INVALID_SKU");
  });

  it("returns 400 if fillPercentage out of range", async () => {
    const req = makeRequest(makeFormData({ fillPercentage: "150" }));
    const res = await handleAdminUpload(mockContext(req, mockEnv));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("INVALID_FILL_PERCENTAGE");
  });

  it("returns 200 with ok and scanId on valid upload", async () => {
    const req = makeRequest(makeFormData());
    const res = await handleAdminUpload(mockContext(req, mockEnv));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.scanId).toBe("string");
    expect(body.scanId).toMatch(/^admin-/);
  });

  it("calls storeAdminUpload with correct args on valid upload", async () => {
    const req = makeRequest(makeFormData({ fillPercentage: "65", augmentationType: "none" }));
    await handleAdminUpload(mockContext(req, mockEnv));
    expect(supabaseClient.storeAdminUpload).toHaveBeenCalledOnce();
    const [envArg, scanIdArg, bufferArg, skuArg, fillPctArg, augTypeArg] =
      vi.mocked(supabaseClient.storeAdminUpload).mock.calls[0];
    expect(envArg).toBe(mockEnv);
    expect(scanIdArg).toMatch(/^admin-/);
    // Check that bufferArg is an ArrayBuffer or has ArrayBuffer-like properties
    expect(bufferArg).toBeDefined();
    expect(typeof bufferArg.byteLength).toBe('number');
    expect(skuArg).toBe(VALID_SKU);
    expect(fillPctArg).toBe(65);
    expect(augTypeArg).toBe("none");
  });
});
