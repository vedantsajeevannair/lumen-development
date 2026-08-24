export const authConstants = {
  flow: {
    login: "login",
    register: "register",
    forgotPassword: "forgotPassword",
    otp: "otp",
    verifyEmail: "verifyEmail",
  },
  storageKeys: {
    accessToken: "auth.accessToken",
    refreshToken: "auth.refreshToken",
    session: "auth.session",
  },
} as const;
export const authconstantsModule = {
  name: "authconstants",
} as const;
