import axios from "axios";

const API = axios.create({
  baseURL: "https://underwear-locks-latinas-anonymous.trycloudflare.com", // ✅ backend URL
});

// 🔐 Attach token automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default API;