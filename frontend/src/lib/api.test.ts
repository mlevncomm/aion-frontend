import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mockFetch = vi.fn();
global.fetch = mockFetch;

let api: any;
let originalBase: string;

describe("api client", () => {
  beforeEach(async () => {
    mockFetch.mockReset();
    vi.resetModules();
    api = await import("@/lib/api");
    originalBase = api.getApiBase();
  });

  afterEach(() => {
    api.setApiBase(originalBase);
  });

  describe("base URL configuration", () => {
    it("defaults to /api", () => {
      expect(api.getApiBase()).toBe("/api");
    });

    it("allows setting a custom base URL", () => {
      api.setApiBase("https://backend.example.com/api");
      expect(api.getApiBase()).toBe("https://backend.example.com/api");
    });

    it("strips trailing slashes", () => {
      api.setApiBase("https://backend.example.com/api/");
      expect(api.getApiBase()).toBe("https://backend.example.com/api");
    });

    it("uses configured base in requests", async () => {
      api.setApiBase("https://backend.example.com/api");
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "ok" }), { status: 200 })
      );
      await api.fetchHealth();
      expect(mockFetch).toHaveBeenCalledWith(
        "https://backend.example.com/api/status",
        expect.any(Object)
      );
    });
  });
});