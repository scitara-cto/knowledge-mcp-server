import { jest, expect, describe, it, beforeEach } from "@jest/globals";
import { DlxService } from "../DlxService.js";
import { SessionInfo } from "dynamic-mcp-server";

// Mock the fetch function
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe("DlxService", () => {
  let dlxService: DlxService;
  const baseUrl = "https://test-api.example.com";
  const contextWithToken: SessionInfo = {
    token: "test-token",
    user: {
      clientId: "test-client",
      scopes: [],
      dlx_api_key: "test-api-key",
      dlx_api_url: baseUrl,
    },
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create a new instance of DlxService
    dlxService = new DlxService();

    // Mock successful response
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({
        "content-length": "100",
      }),
      json: jest.fn<() => Promise<any>>().mockResolvedValue({ data: "test" }),
      text: jest.fn<() => Promise<string>>().mockResolvedValue(""),
      blob: jest.fn<() => Promise<Blob>>().mockResolvedValue(new Blob()),
      arrayBuffer: jest
        .fn<() => Promise<ArrayBuffer>>()
        .mockResolvedValue(new ArrayBuffer(0)),
      clone: jest.fn<() => Response>(),
      body: null,
      bodyUsed: false,
      redirected: false,
      statusText: "OK",
      type: "default",
      url: "",
      formData: jest.fn<() => Promise<FormData>>(),
      bytes: jest.fn<() => Promise<Uint8Array>>(),
    } as Response;

    mockFetch.mockResolvedValue(mockResponse);
  });

  describe("executeDlxApiCall", () => {
    it("should use DLX API key and URL from user info when available", async () => {
      const contextWithUserInfo: SessionInfo = {
        user: {
          clientId: "test-client",
          scopes: [],
          dlx_api_key: "user-api-key",
          dlx_api_url: "https://user-api.example.com",
        },
      };

      await dlxService.executeDlxApiCall(
        {
          method: "GET",
          path: "/test",
        },
        contextWithUserInfo,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://user-api.example.com/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer user-api-key",
          }),
        }),
      );
    });

    it("should make a request with the correct URL and method", async () => {
      await dlxService.executeDlxApiCall(
        {
          method: "GET",
          path: "/test",
        },
        contextWithToken,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/test`,
        expect.objectContaining({
          method: "GET",
        }),
      );
    });

    it("should include query parameters in the URL", async () => {
      await dlxService.executeDlxApiCall(
        {
          method: "GET",
          path: "/test",
          params: {
            param1: "value1",
            param2: 123,
          },
        },
        contextWithToken,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/test?param1=value1&param2=123`,
        expect.any(Object),
      );
    });

    it("should include the request body for POST requests", async () => {
      const requestData = { key: "value" };

      await dlxService.executeDlxApiCall(
        {
          method: "POST",
          path: "/test",
          data: requestData,
        },
        contextWithToken,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/test`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(requestData),
        }),
      );
    });

    it("should include the Authorization header with Bearer token when provided", async () => {
      // Create a context without dlx_api_key to test token fallback
      const contextWithoutApiKey: SessionInfo = {
        token: "test-token",
        user: {
          clientId: "test-client",
          scopes: [],
          dlx_api_url: baseUrl,
        },
        dlxApiUrl: baseUrl,
      };

      await dlxService.executeDlxApiCall(
        {
          method: "GET",
          path: "/test",
        },
        contextWithoutApiKey,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/test`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        }),
      );
    });

    it("should throw an error if token is missing", async () => {
      await expect(
        dlxService.executeDlxApiCall(
          { method: "GET", path: "/test" },
          { token: "", user: {}, dlxApiUrl: baseUrl },
        ),
      ).rejects.toThrow("Token is required for DLX API call");
    });

    it("should throw an error if DLX API URL is missing", async () => {
      await expect(
        dlxService.executeDlxApiCall(
          { method: "GET", path: "/test" },
          { token: "test-token", user: {} },
        ),
      ).rejects.toThrow("DLX API URL is required for DLX API call");
    });

    it("should handle empty responses correctly", async () => {
      // Mock a 204 No Content response
      const mockEmptyResponse = {
        ok: true,
        status: 204,
        headers: new Headers({
          "content-length": "0",
        }),
        json: jest.fn<() => Promise<any>>().mockResolvedValue(null),
        text: jest.fn<() => Promise<string>>().mockResolvedValue(""),
        blob: jest.fn<() => Promise<Blob>>().mockResolvedValue(new Blob()),
        arrayBuffer: jest
          .fn<() => Promise<ArrayBuffer>>()
          .mockResolvedValue(new ArrayBuffer(0)),
        clone: jest.fn<() => Response>(),
        body: null,
        bodyUsed: false,
        redirected: false,
        statusText: "No Content",
        type: "default",
        url: "",
        formData: jest.fn<() => Promise<FormData>>(),
        bytes: jest.fn<() => Promise<Uint8Array>>(),
      } as Response;

      mockFetch.mockResolvedValueOnce(mockEmptyResponse);

      const result = await dlxService.executeDlxApiCall(
        {
          method: "GET",
          path: "/test",
        },
        contextWithToken,
      );

      expect(result).toBeNull();
    });

    it("should handle API errors correctly", async () => {
      const errorResponse = { error: "Not Found" };
      const mockErrorResponse = {
        ok: false,
        status: 404,
        headers: new Headers({
          "content-length": "100",
        }),
        json: jest.fn<() => Promise<any>>().mockResolvedValue(errorResponse),
        text: jest.fn<() => Promise<string>>().mockResolvedValue(""),
        blob: jest.fn<() => Promise<Blob>>().mockResolvedValue(new Blob()),
        arrayBuffer: jest
          .fn<() => Promise<ArrayBuffer>>()
          .mockResolvedValue(new ArrayBuffer(0)),
        clone: jest.fn<() => Response>(),
        body: null,
        bodyUsed: false,
        redirected: false,
        statusText: "Not Found",
        type: "default",
        url: "",
        formData: jest.fn<() => Promise<FormData>>(),
        bytes: jest.fn<() => Promise<Uint8Array>>(),
      } as Response;

      mockFetch.mockResolvedValueOnce(mockErrorResponse);

      await expect(
        dlxService.executeDlxApiCall(
          {
            method: "GET",
            path: "/test",
          },
          contextWithToken,
        ),
      ).rejects.toThrow("DLX API Error (404)");
    });

    it("should handle network errors correctly", async () => {
      mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

      await expect(
        dlxService.executeDlxApiCall(
          {
            method: "GET",
            path: "/test",
          },
          contextWithToken,
        ),
      ).rejects.toThrow(
        "DLX API Request Error: No response received from server",
      );
    });
  });
});
