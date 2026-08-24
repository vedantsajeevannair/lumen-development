export const authApi = {
  login: "/auth/login",
  register: "/auth/register",
  forgotPassword: "/auth/forgot-password",
  verifyOtp: "/auth/otp/verify",
  verifyEmail: "/auth/email/verify",
  refreshSession: "/auth/token/refresh",
} as const;
export const authapiModule = {
  name: "authapi",
} as const;
