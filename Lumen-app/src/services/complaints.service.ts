import { apiClient } from "./api.client";

export const ComplaintsService = {
  async getNearby(lat: number, lng: number, radius = 5) {
    const response = await apiClient.get("/complaints/nearby", {
      params: { lat, lng, radius },
    });
    return response.data;
  },

  async create(data: any) {
    const response = await apiClient.post("/complaints", data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  async uploadImage(formData: FormData) {
    const response = await apiClient.post("/storage/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  async getAll() {
    const response = await apiClient.get("/complaints");
    return response.data;
  },

  async getOne(id: string) {
    const response = await apiClient.get(`/complaints/${id}`);
    return response.data;
  },

  async analyzeAI(description: string, imageUrl?: string) {
    const response = await apiClient.post("/api/v1/ai-triage/analyze", {
      description,
      imageUrl,
    });
    return response.data;
  },

  async delete(id: string) {
    const response = await apiClient.delete(`/complaints/${id}`);
    return response.data;
  },
};
