import { Platform } from 'react-native';
import { getToken } from "./auth";

// const getBaseUrl = () => {
//   if (Platform.OS === 'web' && typeof window !== 'undefined') {
//     return `http://${window.location.hostname}:3000`;
//   }
//   return "http://192.168.0.103:3000"; 
// };

export const BASE_URL = "https://stepwell-api.onrender.com";

async function request(path: string, options: RequestInit = {}) {
  const token = await getToken();

  console.log(`[API Request] ${options.method || 'GET'} ${BASE_URL}${path}`);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.message || "Request failed");
    }

    return data;
  } catch (error: any) {
    console.error(`[API Error] ${path}:`, error.message);
    throw error; 
  }
}

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  role: "patient" | "doctor";
  height: number;
  weight: number;
  password: string;
};

export function apiRegister(payload: RegisterPayload) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function apiLogin(payload: { email: string; password: string }) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getHealthSnapshot(userId: number) {
  return request(`/health/snapshot/${userId}`, { 
    method: "GET" 
  });
}

export function apiMe() {
  return request("/me", { method: "GET" });
}

export function apiLatestMetrics() {
  return request("/metrics/latest", { method: "GET" });
}

export function apiGetPatients() {
  return request("/users?role=patient", { method: "GET" });
}

export function updateHealthSnapshot(userId: number, data: any) {
  return request(`/health/snapshot/${userId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function apiAskAssistant(prompt: string, patientMetrics: any) {
  return request("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ prompt, patientMetrics }),
  });
}