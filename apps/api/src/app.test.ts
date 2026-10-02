import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "./app.js";

describe("API health", () => {
  it("returns a healthy response from /api/v1/health", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("degraded");
    expect(response.body.api).toBe("online");
    expect(response.body.database).toBe("disconnected");
  });

  it("serves the OpenAPI document at /docs/openapi.json", async () => {
    const response = await request(app).get("/docs/openapi.json");

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe("3.1.0");
    expect(response.body.info.title).toBe("ERP API");
    expect(response.body.paths["/health"]).toBeDefined();
  });

  it("serves Swagger UI at /docs", async () => {
    const response = await request(app).get("/docs");

    expect(response.status).toBe(301);
    expect(response.headers.location).toBe("/docs/");
  });

  it("allows only configured browser origins", async () => {
    const allowed = await request(app)
      .options("/api/v1/health")
      .set("Origin", "http://localhost:8081")
      .set("Access-Control-Request-Method", "GET");
    const rejected = await request(app)
      .options("/api/v1/health")
      .set("Origin", "https://untrusted.example")
      .set("Access-Control-Request-Method", "GET");

    expect(allowed.headers["access-control-allow-origin"]).toBe(
      "http://localhost:8081",
    );
    expect(rejected.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("returns the standard error for unknown routes", async () => {
    const response = await request(app).get("/missing");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
