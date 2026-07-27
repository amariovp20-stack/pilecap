const defaultApiBase = import.meta.env.VITE_API_BASE_URL || "/api";

// Use relative path in development (with proxy) and full URL in production
const getApiUrl = (endpoint) => {
  const base = import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_BASE_URL || "/api");
  return `${base.replace(/\/$/, "")}${endpoint}`;
};

export async function designPileCap(data, apiBase = defaultApiBase) {
  const url = getApiUrl("/pilecap/design");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  let responseData = null;

  try {
    responseData = await response.json();
  } catch {
    throw new Error("La API respondió en un formato no válido.");
  }

  if (!response.ok) {
    const detail = responseData?.detail || "Error al calcular el diseño.";
    throw new Error(detail);
  }

  return responseData;
}
