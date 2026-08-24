export interface AuthIdentity {
  readonly id: string;
  readonly email: string;
  readonly role: "citizen" | "engineer" | "admin";
}

export interface AuthSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
}

export interface AuthChallenge {
  readonly channel: "email" | "sms" | "biometric";
  readonly identifier: string;
}
export const authdomainModule = {
  name: "authdomain",
} as const;
