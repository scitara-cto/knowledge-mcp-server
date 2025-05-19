import { jest, expect, describe, it, beforeEach } from "@jest/globals";
import { dlxHandler } from "..";
import { SessionInfo } from "dynamic-mcp-server";
import { DlxService } from "../DlxService.js";

// Mock the DlxService
jest.mock("../DlxService.js");
const MockedDlxService = DlxService as jest.MockedClass<typeof DlxService>;

// Mock the logger
jest.mock("dynamic-mcp-server", () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe("dlxHandler", () => {
  const mockExecuteDlxApiCall = jest.fn() as jest.MockedFunction<
    typeof DlxService.prototype.executeDlxApiCall
  >;
  const baseUrl = "https://test-api.example.com";
  const contextWithToken: SessionInfo = {
    token: "test-token",
    user: { clientId: "test-client", scopes: [] },
    dlxApiUrl: baseUrl,
  };

  beforeEach(() => {
    // Reset mocks
    jest.resetAllMocks();

    // Setup mock implementation for executeDlxApiCall
    mockExecuteDlxApiCall.mockResolvedValue("test");

    // Mock the prototype method
    MockedDlxService.prototype.executeDlxApiCall = mockExecuteDlxApiCall;
  });

  it("should execute a simple GET request with no parameters", async () => {
    const args = {};
    const handlerConfig = {
      action: "api-call",
      path: "/test",
      method: "GET",
    };

    const result = await dlxHandler(args, contextWithToken, handlerConfig);

    expect(mockExecuteDlxApiCall).toHaveBeenCalledWith(
      {
        method: "GET",
        path: "/test",
      },
      contextWithToken,
    );
    expect(result).toEqual({
      result: "test",
      message: "Operation completed successfully",
    });
  });

  it("should handle path parameters correctly", async () => {
    const args = { id: "123" };
    const handlerConfig = {
      action: "api-call",
      path: "/test/{id}",
      method: "GET",
    };

    const result = await dlxHandler(args, contextWithToken, handlerConfig);

    expect(mockExecuteDlxApiCall).toHaveBeenCalledWith(
      {
        method: "GET",
        path: "/test/123",
      },
      contextWithToken,
    );
    expect(result).toEqual({
      result: "test",
      message: "Operation completed successfully",
    });
  });

  it("should throw an error if a required path parameter is missing", async () => {
    const args = {};
    const handlerConfig = {
      action: "api-call",
      path: "/test/{id}",
      method: "GET",
    };

    await expect(
      dlxHandler(args, contextWithToken, handlerConfig),
    ).rejects.toThrow("Missing required path parameter: id");
  });

  it("should handle query parameters correctly", async () => {
    const args = { param1: "value1", param2: 123 };
    const handlerConfig = {
      action: "api-call",
      path: "/test",
      method: "GET",
      params: ["param1", "param2"],
    };

    const result = await dlxHandler(args, contextWithToken, handlerConfig);

    expect(mockExecuteDlxApiCall).toHaveBeenCalledWith(
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
    expect(result).toEqual({
      result: "test",
      message: "Operation completed successfully",
    });
  });

  it("should handle body as an array of fields correctly", async () => {
    const args = { name: "John", age: 30 };
    const handlerConfig = {
      action: "api-call",
      path: "/test",
      method: "POST",
      body: ["name", "age"],
    };

    const result = await dlxHandler(args, contextWithToken, handlerConfig);

    expect(mockExecuteDlxApiCall).toHaveBeenCalledWith(
      {
        method: "POST",
        path: "/test",
        data: {
          name: "John",
          age: 30,
        },
      },
      contextWithToken,
    );
    expect(result).toEqual({
      result: "test",
      message: "Operation completed successfully",
    });
  });

  it("should throw an error if a required body field is missing", async () => {
    const args = { name: "John" };
    const handlerConfig = {
      action: "api-call",
      path: "/test",
      method: "POST",
      body: ["name", "age"],
    };

    await expect(
      dlxHandler(args, contextWithToken, handlerConfig),
    ).rejects.toThrow("Missing required body parameter: age");
  });

  it("should handle body as a string reference correctly", async () => {
    const args = { userData: { name: "John", age: 30 } };
    const handlerConfig = {
      action: "api-call",
      path: "/test",
      method: "POST",
      body: "userData",
    };

    const result = await dlxHandler(args, contextWithToken, handlerConfig);

    expect(mockExecuteDlxApiCall).toHaveBeenCalledWith(
      {
        method: "POST",
        path: "/test",
        data: { name: "John", age: 30 },
      },
      contextWithToken,
    );
    expect(result).toEqual({
      result: "test",
      message: "Operation completed successfully",
    });
  });

  it("should throw an error if a required body reference is missing", async () => {
    const args = {};
    const handlerConfig = {
      action: "api-call",
      path: "/test",
      method: "POST",
      body: "userData",
    };

    await expect(
      dlxHandler(args, contextWithToken, handlerConfig),
    ).rejects.toThrow("Missing required body parameter: userData");
  });

  it("should handle body as an object correctly", async () => {
    const args = {};
    const handlerConfig = {
      action: "api-call",
      path: "/test",
      method: "POST",
      body: { name: "John", age: 30 },
    };

    const result = await dlxHandler(args, contextWithToken, handlerConfig);

    expect(mockExecuteDlxApiCall).toHaveBeenCalledWith(
      {
        method: "POST",
        path: "/test",
        data: { name: "John", age: 30 },
      },
      contextWithToken,
    );
    expect(result).toEqual({
      result: "test",
      message: "Operation completed successfully",
    });
  });

  it("should handle errors from the DlxService correctly", async () => {
    const error = new Error("API Error");
    mockExecuteDlxApiCall.mockRejectedValueOnce(error);

    const args = {};
    const handlerConfig = {
      action: "api-call",
      path: "/test",
      method: "GET",
    };

    await expect(
      dlxHandler(args, contextWithToken, handlerConfig),
    ).rejects.toThrow("API Error");
  });
});
