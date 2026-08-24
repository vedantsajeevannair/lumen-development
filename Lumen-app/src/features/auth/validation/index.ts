import type {
  ForgotPasswordFormValues,
  LoginFormValues,
  OtpFormValues,
  RegisterFormValues,
} from "../types";

export function isValidLoginForm(values: LoginFormValues): boolean {
  return values.email.length > 0 && values.password.length >= 8;
}

export function isValidRegisterForm(values: RegisterFormValues): boolean {
  return (
    values.email.length > 0 &&
    values.password.length >= 8 &&
    values.password === values.confirmPassword
  );
}

export function isValidOtpForm(values: OtpFormValues): boolean {
  return values.identifier.length > 0 && values.otp.length >= 4;
}

export function isValidForgotPasswordForm(values: ForgotPasswordFormValues): boolean {
  return values.email.length > 0;
}
export const authvalidationModule = {
  name: "authvalidation",
} as const;
