export interface LoginFormValues {
  readonly email: string;
  readonly password: string;
}

export interface RegisterFormValues {
  readonly email: string;
  readonly password: string;
  readonly confirmPassword: string;
  readonly role: "citizen" | "engineer";
}

export interface OtpFormValues {
  readonly identifier: string;
  readonly otp: string;
}

export interface ForgotPasswordFormValues {
  readonly email: string;
}
export const authtypesModule = {
  name: "authtypes",
} as const;
