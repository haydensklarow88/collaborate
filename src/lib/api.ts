// src/lib/api.ts
const BASE_URL = import.meta.env.VITE_API_BASE;

export async function saveUserRole(token: string, role: string) {
  const res = await fetch(`${BASE_URL}/user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ role })
  });
  return res.json();
}

export async function getUserProfile(token: string) {
  const res = await fetch(`${BASE_URL}/user`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });
  return res.json();
}
