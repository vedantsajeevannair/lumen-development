import { apiClient } from "./api.client";

export const CitizenService = {
  async getDashboard() {
    const response = await apiClient.get("/api/v1/citizen/dashboard");
    return response.data;
  },

  async getAnalytics(range: 'Daily' | 'Monthly' | 'Yearly' = 'Daily') {
    const response = await apiClient.get(`/api/v1/citizen/analytics?range=${range.toLowerCase()}`);
    return response.data;
  },

  async getPayments() {
    const response = await apiClient.get("/api/v1/citizen/payments");
    return response.data;
  },

  async payBill(paymentId: string) {
    const response = await apiClient.post(`/api/v1/citizen/payments/${paymentId}/pay`);
    return response.data;
  },

  async getProfile() {
    const response = await apiClient.get("/api/v1/citizen/profile");
    return response.data;
  },

  async updateProfile(data: any) {
    const response = await apiClient.patch("/api/v1/citizen/profile", data);
    return response.data;
  },

  async getComplaints() {
    const response = await apiClient.get("/api/v1/citizen/complaints");
    return response.data;
  },

  async getComplaintTracking(id: string) {
    const response = await apiClient.get(`/api/v1/citizen/complaints/${id}/tracking`);
    return response.data;
  },
};
