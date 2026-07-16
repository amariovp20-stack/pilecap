const defaultApiBase = import.meta.env.VITE_API_BASE_URL || "/api";

export async function designPileCap(data, apiBase = defaultApiBase) {
  const url = `${apiBase.replace(/\/$/, "")}/pilecap/design`;

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
