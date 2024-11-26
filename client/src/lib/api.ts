import { z } from "zod";

const API_BASE = "/api";

export async function createUser(userData: any) {
  const response = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  if (!response.ok) throw new Error("Failed to create user");
  return response.json();
}

export async function getUserPreferences(userId: number) {
  const response = await fetch(`${API_BASE}/preferences/${userId}`);
  if (!response.ok) throw new Error("Failed to fetch preferences");
  return response.json();
}

export async function updatePreferences(preferencesData: any) {
  const response = await fetch(`${API_BASE}/preferences`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preferencesData),
  });
  if (!response.ok) throw new Error("Failed to update preferences");
  return response.json();
}

export async function uploadScan(scanData: FormData) {
  const response = await fetch(`${API_BASE}/scans`, {
    method: "POST",
    body: scanData,
  });
  if (!response.ok) throw new Error("Failed to upload scan");
  return response.json();
}

export async function getUserScans(userId: number) {
  const response = await fetch(`${API_BASE}/scans/${userId}`);
  if (!response.ok) throw new Error("Failed to fetch scans");
  return response.json();
}

export async function performOCR(image: File) {
  const formData = new FormData();
  formData.append("image", image);
  
  const response = await fetch(`${API_BASE}/ocr`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) throw new Error("OCR processing failed");
  return response.json();
}

export async function analyzeLabelContent(text: string) {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error("Analysis failed");
  return response.json();
}
