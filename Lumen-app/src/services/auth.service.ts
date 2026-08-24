import { useAuthStore } from "../store/AuthStore";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { apiClient } from "./api.client";

export const AuthService = {
  initialize() {
    // Check tokens on startup if needed
  },

  getBiometricKey(email: string) {
    const safeEmail = email
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9._-]/g, "_");
    return `lumen_biometric_credentials_${safeEmail}`;
  },

  async generateOtp(data: {
    fullName?: string;
    email: string;
    phoneNumber?: string;
    password?: string;
  }) {
    try {
      const response = await apiClient.post("/auth/register", data);
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Failed to generate OTP");
    }
  },

  async generateForgotPasswordOtp(email: string) {
    try {
      await apiClient.post("/auth/forgot-password", { email });
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Failed to generate OTP for password reset");
    }
  },

  async resetPassword(email: string, otp: string, newPassword: string) {
    try {
      await apiClient.post("/auth/reset-password", { email, otp, newPassword });
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Failed to reset password");
    }
  },

  async resendOtp(data: { email: string }) {
    try {
      const response = await apiClient.post("/auth/resend-otp", data);
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Failed to resend OTP");
    }
  },

  async verifyOtp(email: string, otp: string) {
    try {
      const response = await apiClient.post("/auth/verify-otp", { email, otp });
      const data = response.data;
      this.handleTokenResponse(data);
      await AsyncStorage.setItem("lumen_last_email", email);
      return data.user;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Verification failed");
    }
  },

  async login(email: string, password: string) {
    try {
      const response = await apiClient.post("/auth/login", { email, password });
      const data = response.data;
      this.handleTokenResponse(data);
      await AsyncStorage.setItem("lumen_last_email", email);
      return data.user;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Login failed");
    }
  },

  async enrollBiometric(email: string, password?: string) {
    const session = useAuthStore.getState().session;
    if (!session || !session.access_token) throw new Error("No active session");

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) throw new Error("Biometric hardware not found on this device.");

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled)
      throw new Error(
        "No biometrics enrolled. Please set up FaceID/TouchID in your device settings."
      );

    // Authenticate with FaceID/Fingerprint first
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Enable Biometric Login",
      cancelLabel: "Cancel",
    });

    if (!result.success) {
      if (__DEV__) {
        console.warn(`Biometric authentication failed, but bypassing for DEV mode.`);
      } else {
        throw new Error(`Biometric authentication failed or was cancelled.`);
      }
    }

    if (!email) throw new Error("No email context found");

    // Generate a secure unique device hash for this biometric enrollment
    const biometricHash = Crypto.randomUUID();

    // Store the hash securely under user-specific key
    const credentials = JSON.stringify({ email, biometricHash });
    const userBiometricKey = this.getBiometricKey(email);
    await SecureStore.setItemAsync(userBiometricKey, credentials);

    try {
      await apiClient.post("/auth/biometric/enable", { biometricHash });
    } catch (err: any) {
      throw new Error(
        `Failed to enable biometric on backend: ${err.response?.status} ${err.response?.data?.message || "Unknown error"}`
      );
    }
  },

  async loginWithBiometric(email?: string) {
    let hasHardware = await LocalAuthentication.hasHardwareAsync();
    let isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (__DEV__) {
      hasHardware = true;
      isEnrolled = true;
    }

    if (!hasHardware || !isEnrolled) {
      throw new Error("Biometric hardware not available or not enrolled");
    }

    const targetEmail = email || (await AsyncStorage.getItem("lumen_last_email"));
    if (!targetEmail) {
      throw new Error("Please specify an email or enroll first");
    }

    const userBiometricKey = this.getBiometricKey(targetEmail);
    const storedCredentials = await SecureStore.getItemAsync(userBiometricKey);
    if (!storedCredentials) {
      throw new Error(`No biometric credentials found for ${targetEmail}`);
    }

    const authResult = await LocalAuthentication.authenticateAsync({
      promptMessage: "Login to LUMEN",
      cancelLabel: "Cancel",
    });

    if (!authResult.success) {
      if (__DEV__) {
        console.warn(`Biometric login failed, but bypassing for DEV mode.`);
      } else {
        throw new Error(`Biometric does not match. Please retry again.`);
      }
    }

    const { email: storedEmail, biometricHash } = JSON.parse(storedCredentials);

    try {
      const response = await apiClient.post("/auth/biometric/login", {
        email: storedEmail,
        biometricHash,
      });
      const data = response.data;
      this.handleTokenResponse(data);
      await AsyncStorage.setItem("lumen_last_email", storedEmail);
      return data.user;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || "Biometric login failed");
    }
  },

  async logout(keepBiometric: boolean = true) {
    const session = useAuthStore.getState().session;

    if (session?.access_token) {
      // Best effort backend logout
      apiClient.post("/auth/logout", { refreshToken: session.refresh_token }).catch((e) => {
        if (__DEV__) {
          console.warn("Backend logout failed:", e);
        }
      });
    }

    if (!keepBiometric) {
      const lastEmail = await AsyncStorage.getItem("lumen_last_email");
      if (lastEmail) {
        const userBiometricKey = this.getBiometricKey(lastEmail);
        await SecureStore.deleteItemAsync(userBiometricKey);
      }
    }

    useAuthStore.getState().logout();
  },

  handleTokenResponse(data: any) {
    useAuthStore.getState().setRole(data.user.role);
    useAuthStore.getState().setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user,
    } as any);
  },
};
