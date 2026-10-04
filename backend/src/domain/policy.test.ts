import { describe, expect, it } from "vitest";
import { retrievePolicies } from "./policy.js";

describe("policy retrieval", () => {
  it("retrieves medical claims guidance for health claims", () => {
    const result = retrievePolicies({
      title: "Guaranteed pain relief cushion",
      description: "This cushion claims to cure persistent back pain quickly.",
      category: "HEALTH_WELLNESS",
      price: "49.00",
      attributes: {},
      seller: "Wellness Store",
      tags: ["therapy"]
    });
    expect(result.map((policy) => policy.code)).toContain("POL-HEALTH-01");
  });
});
