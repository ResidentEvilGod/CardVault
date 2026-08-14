import { describe, expect, it } from "vitest";
import { deriveAuthenticityAssessment } from "./routers/cards";

describe("deriveAuthenticityAssessment", () => {
  it("marks a strong camera capture as likely physical", () => {
    const result = deriveAuthenticityAssessment({
      captureSource: "camera",
      physicalCardLikelihood: 0.91,
      digitalImageRisk: 0.08,
      sourceClassification: "camera_photo",
      notes: "Visible perspective and lighting cues are consistent with a physical card.",
    });

    expect(result.status).toBe("likely_physical");
    expect(result.physicalCardLikelihood).toBe(0.91);
  });

  it("marks a screenshot classification as likely digital even when uploaded as a file", () => {
    const result = deriveAuthenticityAssessment({
      captureSource: "upload",
      physicalCardLikelihood: 0.55,
      digitalImageRisk: 0.44,
      sourceClassification: "screen_or_screenshot",
      notes: "Edges and uniform pixels suggest a screen capture.",
    });

    expect(result.status).toBe("likely_digital");
  });

  it("keeps borderline evidence uncertain", () => {
    const result = deriveAuthenticityAssessment({
      captureSource: "upload",
      physicalCardLikelihood: 0.68,
      digitalImageRisk: 0.40,
      sourceClassification: "uncertain",
      notes: "The image does not contain enough source cues.",
    });

    expect(result.status).toBe("uncertain");
  });

  it("clamps malformed model scores to safe display ranges", () => {
    const result = deriveAuthenticityAssessment({
      captureSource: "camera",
      physicalCardLikelihood: 4,
      digitalImageRisk: -2,
      sourceClassification: "camera_photo",
      notes: "Model score normalization test.",
    });

    expect(result.physicalCardLikelihood).toBe(1);
    expect(result.digitalImageRisk).toBe(0);
    expect(result.status).toBe("likely_physical");
  });
});
