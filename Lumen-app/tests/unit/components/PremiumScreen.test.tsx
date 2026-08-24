import React from "react";
import { render } from "@testing-library/react-native";
import { Component as PremiumScreen } from "../../../src/components/ui/Component";

describe("PremiumScreen Component", () => {
  it("renders the badge, title, subtitle, and description", async () => {
    const { getByText, getAllByText } = await render(
      <PremiumScreen
        badge="Progress Update"
        title="Upload Proof"
        subtitle="Provide credentials for security"
        description="This flow allows verifying work completeness."
      />
    );

    expect(getByText("Progress Update")).toBeTruthy();
    // The title appears twice: once in the hero section and once in the card header
    expect(getAllByText("Upload Proof").length).toBe(2);
    expect(getByText("Provide credentials for security")).toBeTruthy();
    expect(getByText("This flow allows verifying work completeness.")).toBeTruthy();
  });

  it("renders the primary and secondary action labels if provided", async () => {
    const { getByText } = await render(
      <PremiumScreen
        title="Action Test"
        primaryActionLabel="Submit Request"
        secondaryActionLabel="Cancel Action"
      />
    );

    expect(getByText("Submit Request")).toBeTruthy();
    expect(getByText("Cancel Action")).toBeTruthy();
  });
});
