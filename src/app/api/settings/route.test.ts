import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import { GET, PUT } from "./route";

const mockedAuth = vi.fn<() => Promise<Session | null>>();
vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => mockedAuth(...(args as [])),
}));

const mockedGetSettings = vi.fn();
const mockedSaveSettings = vi.fn();
vi.mock("@/lib/db/settings", () => ({
  getSettings: (...args: unknown[]) => mockedGetSettings(...args),
  saveSettings: (...args: unknown[]) => mockedSaveSettings(...args),
}));

function makeSession(overrides: Partial<Session & { accessToken: string }> = {}): Session {
  return {
    user: { name: "test", email: "test@example.com", image: null },
    expires: "2099-01-01",
    accessToken: "ghp_test123",
    ...overrides,
  } as Session;
}

function makePutRequest(body: unknown): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/settings"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no accessToken", async () => {
    mockedAuth.mockResolvedValue({
      user: { name: "test", email: "test@example.com" },
      expires: "2099-01-01",
    } as Session);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns 400 when user has no email", async () => {
    mockedAuth.mockResolvedValue(makeSession({
      user: { name: "test", email: null, image: null },
    }));
    const response = await GET();
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Unable to identify user");
  });

  it("returns default settings for new users", async () => {
    mockedAuth.mockResolvedValue(makeSession());
    const defaultSettings = {
      userId: "test@example.com",
      defaultTempo: 1.0,
      defaultRepo: "",
      theme: "dark",
      instrumentOverrides: {},
      enabledLanguages: [],
      authorMotifs: [],
      volume: 0.8,
    };
    mockedGetSettings.mockReturnValue(defaultSettings);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.settings).toEqual(defaultSettings);
    expect(mockedGetSettings).toHaveBeenCalledWith("test@example.com");
  });

  it("returns saved settings for existing users", async () => {
    mockedAuth.mockResolvedValue(makeSession());
    const savedSettings = {
      userId: "test@example.com",
      defaultTempo: 2.0,
      defaultRepo: "user/repo",
      theme: "light",
      instrumentOverrides: { Python: "FMSynth" },
      enabledLanguages: ["TypeScript", "Python"],
      authorMotifs: [],
      volume: 0.5,
    };
    mockedGetSettings.mockReturnValue(savedSettings);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.settings).toEqual(savedSettings);
  });

  it("handles database errors gracefully", async () => {
    mockedAuth.mockResolvedValue(makeSession());
    mockedGetSettings.mockImplementation(() => {
      throw new Error("Database error");
    });

    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Database error");
  });
});

describe("PUT /api/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    const request = makePutRequest({ theme: "light" });
    const response = await PUT(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no accessToken", async () => {
    mockedAuth.mockResolvedValue({
      user: { name: "test", email: "test@example.com" },
      expires: "2099-01-01",
    } as Session);
    const request = makePutRequest({ theme: "light" });
    const response = await PUT(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 when user has no email", async () => {
    mockedAuth.mockResolvedValue(makeSession({
      user: { name: "test", email: null, image: null },
    }));
    const request = makePutRequest({ theme: "light" });
    const response = await PUT(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Unable to identify user");
  });

  it("returns 400 for invalid JSON body", async () => {
    mockedAuth.mockResolvedValue(makeSession());
    const request = new NextRequest(new URL("http://localhost:3000/api/settings"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "not valid json{",
    });
    const response = await PUT(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 400 when body is not an object", async () => {
    mockedAuth.mockResolvedValue(makeSession());
    const request = makePutRequest("just a string");
    const response = await PUT(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Request body must be a JSON object");
  });

  it("saves full settings and returns saved result", async () => {
    mockedAuth.mockResolvedValue(makeSession());
    const currentSettings = {
      userId: "test@example.com",
      defaultTempo: 1.0,
      defaultRepo: "",
      theme: "dark",
      instrumentOverrides: {},
      enabledLanguages: [],
      authorMotifs: [],
      volume: 0.8,
    };
    mockedGetSettings.mockReturnValue(currentSettings);

    const inputSettings = {
      defaultTempo: 2.5,
      defaultRepo: "user/my-repo",
      theme: "light",
      instrumentOverrides: { Python: "FMSynth" },
      enabledLanguages: ["TypeScript"],
      authorMotifs: [],
      volume: 0.6,
    };
    const savedSettings = { userId: "test@example.com", ...inputSettings };
    mockedSaveSettings.mockReturnValue(savedSettings);

    const request = makePutRequest(inputSettings);
    const response = await PUT(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.settings).toEqual(savedSettings);
    expect(mockedSaveSettings).toHaveBeenCalledWith(savedSettings);
  });

  it("merges partial updates with existing settings", async () => {
    mockedAuth.mockResolvedValue(makeSession());
    const currentSettings = {
      userId: "test@example.com",
      defaultTempo: 1.0,
      defaultRepo: "",
      theme: "dark",
      instrumentOverrides: {},
      enabledLanguages: [],
      authorMotifs: [],
      volume: 0.8,
    };
    mockedGetSettings.mockReturnValue(currentSettings);
    mockedSaveSettings.mockReturnValue({ ...currentSettings, theme: "light" });

    const request = makePutRequest({ theme: "light" });
    const response = await PUT(request);
    expect(response.status).toBe(200);
    expect(mockedSaveSettings).toHaveBeenCalledWith({
      ...currentSettings,
      theme: "light",
      userId: "test@example.com",
    });
  });

  it("ignores userId in body and uses session user", async () => {
    mockedAuth.mockResolvedValue(makeSession());
    const currentSettings = {
      userId: "test@example.com",
      defaultTempo: 1.0,
      defaultRepo: "",
      theme: "dark",
      instrumentOverrides: {},
      enabledLanguages: [],
      authorMotifs: [],
      volume: 0.8,
    };
    mockedGetSettings.mockReturnValue(currentSettings);
    mockedSaveSettings.mockReturnValue(currentSettings);

    const request = makePutRequest({ userId: "hacker@evil.com", volume: 0.5 });
    const response = await PUT(request);
    expect(response.status).toBe(200);
    // userId should be from session, not from body
    expect(mockedSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "test@example.com" }),
    );
  });

  it("handles database errors gracefully", async () => {
    mockedAuth.mockResolvedValue(makeSession());
    mockedGetSettings.mockReturnValue({
      userId: "test@example.com",
      defaultTempo: 1.0,
      defaultRepo: "",
      theme: "dark",
      instrumentOverrides: {},
      enabledLanguages: [],
      authorMotifs: [],
      volume: 0.8,
    });
    mockedSaveSettings.mockImplementation(() => {
      throw new Error("Database write error");
    });

    const request = makePutRequest({ theme: "light" });
    const response = await PUT(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Database write error");
  });

  it("handles non-Error exceptions", async () => {
    mockedAuth.mockResolvedValue(makeSession());
    mockedGetSettings.mockReturnValue({
      userId: "test@example.com",
      defaultTempo: 1.0,
      defaultRepo: "",
      theme: "dark",
      instrumentOverrides: {},
      enabledLanguages: [],
      authorMotifs: [],
      volume: 0.8,
    });
    mockedSaveSettings.mockImplementation(() => {
      throw "string error";
    });

    const request = makePutRequest({ theme: "light" });
    const response = await PUT(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to save settings");
  });
});
