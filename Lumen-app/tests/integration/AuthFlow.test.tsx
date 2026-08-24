import { authApiService } from "../../src/features/auth/services";

describe("Authentication Integration Flow", () => {
  it("authenticates a user login command and returns standard role identities", async () => {
    const credentials = {
      username: "engineer_lumen",
      password: "password123",
    };

    const response = await authApiService.login(credentials as any);

    expect(response).toHaveProperty("identity");
    expect(response).toHaveProperty("session");
    expect(response.identity.role).toBe("citizen"); // Default mock role is citizen
  });

  it("sends a forgot password command successfully", async () => {
    const payload = {
      email: "engineer@lumen.com",
    };

    const response = await authApiService.forgotPassword(payload as any);

    expect(response.channel).toBe("email");
  });
});
