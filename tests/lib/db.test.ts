import { describe, it, expect, vi, beforeEach } from "vitest";

const connect = vi.fn().mockResolvedValue({ connection: { readyState: 1 } });
vi.mock("mongoose", () => ({ default: { connect, connections: [] } }));

describe("dbConnect", () => {
  beforeEach(() => {
    vi.resetModules();
    connect.mockClear();
    delete process.env.MONGODB_URI;
  });

  it("throws a clear error when MONGODB_URI is not set", async () => {
    const { dbConnect } = await import("@/lib/db");
    await expect(dbConnect()).rejects.toThrow("MONGODB_URI is not set");
  });

  it("connects once and reuses the connection on later calls", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    const { dbConnect } = await import("@/lib/db");
    await dbConnect();
    await dbConnect();
    expect(connect).toHaveBeenCalledTimes(1);
  });
});
