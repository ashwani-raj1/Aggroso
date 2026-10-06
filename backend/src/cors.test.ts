import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "./app.js";

describe("production CORS", () => {
  it("allows the deployed Vercel frontend", async () => {
    const origin = "https://aggroso-azure.vercel.app";
    const response = await request(app).get("/api/config").set("Origin", origin);

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(origin);
  });
});
