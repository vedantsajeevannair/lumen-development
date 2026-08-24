export interface LoginCommand {
  readonly email: string;
  readonly password: string;
}

export interface RegisterCommand {
  readonly email: string;
  readonly password: string;
  readonly role: "citizen" | "engineer";
}

export interface VerifyOtpCommand {
  readonly identifier: string;
  readonly otp: string;
}

export interface RefreshSessionCommand {
  readonly refreshToken: string;
}

export interface ForgotPasswordCommand {
  readonly email: string;
}
export const authapplicationModule = {
  name: "authapplication",
} as const;
