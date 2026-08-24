import type { AuthSession, AuthIdentity, AuthChallenge } from "../domain";
import type {
  ForgotPasswordCommand,
  LoginCommand,
  RefreshSessionCommand,
  RegisterCommand,
  VerifyOtpCommand,
} from "../application";

export interface AuthApiService {
  login(command: LoginCommand): Promise<{ identity: AuthIdentity; session: AuthSession }>;
  register(command: RegisterCommand): Promise<{ identity: AuthIdentity; session: AuthSession }>;
  forgotPassword(command: ForgotPasswordCommand): Promise<AuthChallenge>;
  verifyOtp(command: VerifyOtpCommand): Promise<AuthSession>;
  refreshSession(command: RefreshSessionCommand): Promise<AuthSession>;
}

export const authApiService: AuthApiService = {
  async login() {
    return {
      identity: { id: "", email: "", role: "citizen" },
      session: { accessToken: "", refreshToken: "", expiresAt: "" },
    };
  },
  async register() {
    return {
      identity: { id: "", email: "", role: "citizen" },
      session: { accessToken: "", refreshToken: "", expiresAt: "" },
    };
  },
  async forgotPassword() {
    return { channel: "email", identifier: "" };
  },
  async verifyOtp() {
    return { accessToken: "", refreshToken: "", expiresAt: "" };
  },
  async refreshSession() {
    return { accessToken: "", refreshToken: "", expiresAt: "" };
  },
};
export const authservicesModule = {
  name: "authservices",
} as const;
