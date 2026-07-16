import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND_NAME = "GEOSERVI LAB";
const TECHNICAL_OWNER = "MSc. Ing. Abel Mario Vega Perez";
const BRAND_LINE = `${BRAND_NAME} - ${TECHNICAL_OWNER}`;

function fmt(value, digits = 2, suffix = "") {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value.toFixed(digits)}${suffix}`;
  }
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function getFinalStatus(summary) {
  if (!summary) return "SIN DATOS";
  if (summary.global_compliance_status === "ok") return "APROBADO";
  if (summary.global_compliance_status === "warning") return "CONDICIONADO";
  if (summary.global_compliance_status === "fail") return "NO CONFORME";
  return "SIN DATOS";
}

function getStatusColor(status) {
  if (status === "APROBADO") return [22, 163, 74];
  if (status === "CONDICIONADO") return [202, 138, 4];
  if (status === "NO CONFORME") return [220, 38, 38];
  return [71, 85, 105];
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseRebarOption(text) {
  if (!text || typeof text !== "string") {
    return { count: "-", diameter: "-" };
  }
  const clean = text.replace(/\s/g, "");
  const match = clean.match(/^(\d+)(?:Ø|ø)(\d+(?:\.\d+)?)$/);
  if (!match) {
    return { count: "-", diameter: "-" };
  }
  return {
    count: match[1],
    diameter: match[2],
  };
}

function loadLogoBase64() {
  try {
    const img = document.createElement("img");
    img.src = "/logo.png";

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    return new Promise((resolve) => {
      img.onload = () => {
        ctx.clearRect(0, 0, 512, 512);
        ctx.drawImage(img, 0, 0, 512, 512);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(null);
    });
  } catch {
    return Promise.resolve(null);
  }
}

function drawHeader(doc, pageWidth, logoBase64, title = "MEMORIA DE CÁLCULO - CABEZAL SOBRE PILOTES") {
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 24, "F");

  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", 14, 5, 14, 14);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PileCap Studio", 32, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(title, 32, 19);

  doc.setTextColor(0, 0, 0);
}

function drawFooter(doc, pageWidth) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(203, 213, 225);
    doc.line(14, 286, pageWidth - 14, 286);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Marca registrada: ${BRAND_LINE}`, 14, 291);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 34, 291);
    doc.setTextColor(0, 0, 0);
  }
}

function ensureSpace(doc, y, needed, pageWidth, logoBase64) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 18) {
    doc.addPage();
    drawHeader(doc, pageWidth, logoBase64);
    return 32;
  }
  return y;
}

function addSectionTitle(doc, title, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, y);
  doc.setTextColor(0, 0, 0);
  return y + 6;
}

function addParagraph(doc, text, y, pageWidth, size = 10) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(text || "-", pageWidth - 28);
  doc.text(lines, 14, y);
  return y + lines.length * 5;
}

function drawCover(doc, form, result, pageWidth, logoBase64) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const summary = result?.summary || {};
  const status = getFinalStatus(summary);
  const color = getStatusColor(status);

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(14, 20, pageWidth - 28, pageHeight - 40, 6, 6, "F");

  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", 20, 28, 34, 34);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("PileCap Studio", 20, 74);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("Memoria de Cálculo Estructural", 20, 90);
  doc.setFontSize(15);
  doc.text("Cabezal sobre pilotes", 20, 102);

  doc.setDrawColor(148, 163, 184);
  doc.line(20, 110, pageWidth - 20, 110);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Proyecto: ${form?.project?.name || "-"}`, 20, 124);
  doc.text(`Código: ${form?.project?.code || "-"}`, 20, 132);
  doc.text(`Norma: ${result?.summary?.design_code || form?.project?.design_code || "-"}`, 20, 140);
  doc.text(`Número de pilotes: ${safeArray(form?.piles).length}`, 20, 148);

  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(20, 164, 82, 16, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Estado: ${status}`, 24, 174);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Modelo STM: ${result?.stm_model?.model_name || "-"}`, 20, 196);
  doc.text(`Variante óptima: ${result?.optimal_stm_selection?.selected_variant_name || "-"}`, 20, 204);
  doc.text(`Armadura: ${result?.reinforcement?.selected_option || "-"}`, 20, 212);

  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text("Documento generado automáticamente por la aplicación.", 20, pageHeight - 24);
  doc.text(`Marca registrada: ${BRAND_LINE}`, 20, pageHeight - 18);
  doc.setTextColor(0, 0, 0);
}

function drawStatusPanel(doc, result, y, pageWidth) {
  const summary = result?.summary || {};
  const finalStatus = getFinalStatus(summary);
  const color = getStatusColor(finalStatus);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, pageWidth - 28, 24, 4, 4, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Estado global del diseño", 18, y + 8);

  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(pageWidth - 78, y + 4, 56, 12, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(finalStatus, pageWidth - 66, y + 12);
  doc.setTextColor(0, 0, 0);

  return y + 30;
}

function drawMiniCards(doc, form, result, y) {
  const cards = [
    ["Norma", result?.summary?.design_code || form?.project?.design_code || "-"],
    ["Modelo", result?.stm_model?.model_code || "-"],
    ["Variante", result?.optimal_stm_selection?.selected_variant_code || "-"],
    ["Armadura", result?.reinforcement?.selected_option || "-"],
  ];

  let x = 14;
  const w = 45;
  const h = 18;

  cards.forEach((card, idx) => {
    const colors = [
      [37, 99, 235],
      [124, 58, 237],
      [16, 185, 129],
      [245, 158, 11],
    ];
    const c = colors[idx];

    doc.setFillColor(c[0], c[1], c[2]);
    doc.roundedRect(x, y, w, h, 3, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(card[0], x + 3, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(String(card[1]), w - 6);
    doc.text(lines, x + 3, y + 13);

    x += 46;
  });

  doc.setTextColor(0, 0, 0);
  return y + 24;
}

function drawPilecapSketch(doc, form, x0, y0, width, height) {
  const L = Number(form?.geometry?.length || 1);
  const B = Number(form?.geometry?.width || 1);
  const colX = Number(form?.geometry?.column_x || L / 2);
  const colY = Number(form?.geometry?.column_y || B / 2);
  const colW = Number(form?.geometry?.column_width || 0.4);
  const colL = Number(form?.geometry?.column_length || 0.4);
  const piles = safeArray(form?.piles);

  const mapX = (x) => x0 + 6 + (x / L) * (width - 12);
  const mapY = (y) => y0 + 10 + (y / B) * (height - 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Esquema del cabezal", x0, y0 - 2);

  doc.setDrawColor(100, 116, 139);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(x0, y0, width, height, 3, 3, "FD");

  const colPx = mapX(colX - colW / 2);
  const colPy = mapY(colY - colL / 2);
  const colPw = Math.max(8, (colW / L) * (width - 12));
  const colPh = Math.max(8, (colL / B) * (height - 14));

  doc.setFillColor(37, 99, 235);
  doc.rect(colPx, colPy, colPw, colPh, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text("COL", colPx + 2, colPy + colPh / 2 + 1);
  doc.setTextColor(0, 0, 0);

  piles.forEach((pile) => {
    const px = mapX(Number(pile.x || 0));
    const py = mapY(Number(pile.y || 0));

    doc.setFillColor(71, 85, 105);
    doc.circle(px, py, 3, "F");

    doc.setDrawColor(245, 158, 11);
    doc.line(colPx + colPw / 2, colPy + colPh / 2, px, py);

    doc.setFontSize(6);
    doc.text(String(pile.id || ""), px - 2, py + 6);
  });

  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(1);
  doc.line(x0 + 10, y0 + height - 4, x0 + width - 10, y0 + height - 4);
  doc.setLineWidth(0.2);
}

function drawRebarSketch(doc, result, x0, y0, width, height) {
  const bars = parseRebarOption(result?.reinforcement?.selected_option);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Esquema de armado inferior", x0, y0 - 2);

  doc.setDrawColor(100, 116, 139);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x0, y0, width, height, 3, 3, "FD");

  doc.setFillColor(37, 99, 235);
  doc.rect(x0 + 26, y0 + 8, 18, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text("COL", x0 + 31, y0 + 13);
  doc.setTextColor(0, 0, 0);

  doc.setFillColor(226, 232, 240);
  doc.rect(x0 + 8, y0 + 16, width - 16, 24, "F");

  const barCount = Number.isFinite(Number(bars.count)) ? Math.min(Number(bars.count), 10) : 6;
  const startX = x0 + 12;
  const endX = x0 + width - 12;
  const yBars = y0 + 34;
  const spacing = barCount > 1 ? (endX - startX) / (barCount - 1) : 0;

  doc.setDrawColor(220, 38, 38);
  doc.line(x0 + 10, yBars, x0 + width - 10, yBars);

  for (let i = 0; i < barCount; i += 1) {
    const bx = startX + i * spacing;
    doc.setFillColor(220, 38, 38);
    doc.circle(bx, yBars, 1.2, "F");
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Armadura: ${result?.reinforcement?.selected_option || "-"}`, x0 + 8, y0 + 48);
  doc.text(`Cantidad: ${bars.count}`, x0 + 8, y0 + 54);
  doc.text(`Diámetro: Ø${bars.diameter}`, x0 + 8, y0 + 60);
}

function addDiagnosticTable(doc, result, y) {
  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [["Verificación", "Estado", "Mensaje"]],
    body: [
      [
        "Topología STM",
        result?.summary?.topology_status || "-",
        result?.summary?.topology_message || "-",
      ],
      [
        "Comportamiento bidireccional",
        result?.summary?.bidirectional_status || "-",
        result?.summary?.bidirectional_message || "-",
      ],
      [
        "Uniformidad nodal",
        result?.summary?.nodal_uniformity_status || "-",
        result?.summary?.nodal_uniformity_message || "-",
      ],
      [
        "Cumplimiento global",
        result?.summary?.global_compliance_status || "-",
        result?.summary?.global_compliance_message || "-",
      ],
    ],
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8.5, cellPadding: 2 },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 1) {
        const value = String(data.cell.raw || "").toLowerCase();
        if (value === "ok") data.cell.styles.fillColor = [220, 252, 231];
        if (value === "warning") data.cell.styles.fillColor = [254, 249, 195];
        if (value === "fail") data.cell.styles.fillColor = [254, 226, 226];
      }
    },
  });
  return doc.lastAutoTable.finalY + 6;
}

function buildConclusion(form, result) {
  const summary = result?.summary || {};
  const finalStatus = getFinalStatus(summary);

  const base =
    `El análisis fue procesado bajo la norma ${result?.summary?.design_code || form?.project?.design_code || "-"}. ` +
    `El modelo STM adoptado corresponde a "${result?.stm_model?.model_name || "-"}" y la variante óptima seleccionada fue ` +
    `"${result?.optimal_stm_selection?.selected_variant_name || "-"}". La armadura adoptada es ` +
    `${result?.reinforcement?.selected_option || "-"} con As provista de ${fmt(result?.reinforcement?.As_provided_mm2, 2, " mm²")}. `;

  if (finalStatus === "APROBADO") {
    return (
      base +
      "De acuerdo con las verificaciones implementadas, el diseño presenta conformidad global y puede asumirse como técnicamente aceptable dentro del alcance del modelo desarrollado."
    );
  }

  if (finalStatus === "CONDICIONADO") {
    return (
      base +
      "El diseño cumple de manera condicionada. Se recomienda revisar con detalle las advertencias emitidas, la distribución del acero, la coherencia geométrica del STM y el criterio final del proyectista antes de aceptar la solución."
    );
  }

  if (finalStatus === "NO CONFORME") {
    return (
      base +
      "El diseño no cumple de manera global con las verificaciones implementadas. Debe replantearse la geometría, la disposición de pilotes, la altura del cabezal o la estrategia resistente antes de su aceptación."
    );
  }

  return base + "No fue posible clasificar el estado global del diseño.";
}

function buildRecommendations(result) {
  const finalStatus = getFinalStatus(result?.summary || {});
  const list = [
    "Verificar en planos el detallado completo del acero inferior, incluyendo anclajes, separaciones libres y recubrimientos.",
    "Confirmar la compatibilidad geométrica real entre columna, pilotes, cabezal y armadura antes de emitir planos definitivos.",
    "Revisar que el modelo STM adoptado sea coherente con la trayectoria resistente esperada en obra.",
  ];

  if (finalStatus === "CONDICIONADO") {
    list.push("Atender especialmente las advertencias del motor de cálculo antes de considerar el diseño como definitivo.");
  }

  if (finalStatus === "NO CONFORME") {
    list.push("Rediseñar la solución estructural antes de proceder con documentación final o ejecución.");
  }

  return list;
}

export async function generatePDF(form, result) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoBase64 = await loadLogoBase64();

  drawCover(doc, form, result, pageWidth, logoBase64);

  doc.addPage();
  drawHeader(doc, pageWidth, logoBase64);

  let y = 32;

  y = drawStatusPanel(doc, result, y, pageWidth);
  y = drawMiniCards(doc, form, result, y);

  y = ensureSpace(doc, y, 75, pageWidth, logoBase64);
  drawPilecapSketch(doc, form, 14, y + 4, 84, 56);
  drawRebarSketch(doc, result, 108, y + 4, 88, 64);
  y += 74;

  y = ensureSpace(doc, y, 30, pageWidth, logoBase64);
  y = addSectionTitle(doc, "1. Datos generales", y);

  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [["Campo", "Valor"]],
    body: [
      ["Proyecto", form?.project?.name || "-"],
      ["Código", form?.project?.code || "-"],
      ["Norma", result?.summary?.design_code || form?.project?.design_code || "-"],
      ["Número de pilotes", safeArray(form?.piles).length],
      ["Modelo STM base", result?.stm_model?.model_name || "-"],
      ["Código STM", result?.stm_model?.model_code || "-"],
      ["Variante óptima", result?.optimal_stm_selection?.selected_variant_name || "-"],
      ["Código variante", result?.optimal_stm_selection?.selected_variant_code || "-"],
      ["Estado global", getFinalStatus(result?.summary || {})],
    ],
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9, cellPadding: 2 },
  });
  y = doc.lastAutoTable.finalY + 6;

  y = ensureSpace(doc, y, 35, pageWidth, logoBase64);
  y = addSectionTitle(doc, "2. Geometría, materiales y cargas", y);

  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [["Parámetro", "Valor"], ["Parámetro", "Valor"]],
    body: [
      [
        "Longitud L [m]", fmt(form?.geometry?.length),
        "Ancho B [m]", fmt(form?.geometry?.width),
      ],
      [
        "Altura h [m]", fmt(form?.geometry?.height),
        "Altura efectiva d [m]", fmt(result?.effective_depth_m, 3),
      ],
      [
        "Columna X [m]", fmt(form?.geometry?.column_x),
        "Columna Y [m]", fmt(form?.geometry?.column_y),
      ],
      [
        "Ancho columna [m]", fmt(form?.geometry?.column_width),
        "Largo columna [m]", fmt(form?.geometry?.column_length),
      ],
      [
        "f'c [MPa]", fmt(form?.materials?.fc),
        "fy [MPa]", fmt(form?.materials?.fy),
      ],
      [
        "Pu [kN]", fmt(form?.loads?.Pu),
        "Mux [kN·m]", fmt(form?.loads?.Mux),
      ],
      [
        "Muy [kN·m]", fmt(form?.loads?.Muy),
        "Vux [kN]", fmt(form?.loads?.Vux),
      ],
      [
        "Vuy [kN]", fmt(form?.loads?.Vuy),
        "φ acero", fmt(result?.summary?.phi_steel_used ?? form?.materials?.phi_steel),
      ],
    ],
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8.7, cellPadding: 2 },
  });
  y = doc.lastAutoTable.finalY + 6;

  y = ensureSpace(doc, y, 40, pageWidth, logoBase64);
  y = addSectionTitle(doc, "3. Diagnóstico global del motor", y);
  y = addDiagnosticTable(doc, result, y);

  y = ensureSpace(doc, y, 40, pageWidth, logoBase64);
  y = addSectionTitle(doc, "4. Reacciones en pilotes", y);
  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [["Pilote", "X [m]", "Y [m]", "Reacción [kN]", "Estado"]],
    body: safeArray(result?.reactions).map((r) => [
      r.id,
      fmt(r.x, 2),
      fmt(r.y, 2),
      fmt(r.reaction_kN, 2),
      r.status || "-",
    ]),
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8.7, cellPadding: 2 },
  });
  y = doc.lastAutoTable.finalY + 6;

  y = ensureSpace(doc, y, 45, pageWidth, logoBase64);
  y = addSectionTitle(doc, "5. Modelo STM y variantes", y);
  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [["Campo", "Valor"]],
    body: [
      ["Modelo base", result?.stm_model?.model_name || "-"],
      ["Código", result?.stm_model?.model_code || "-"],
      ["Regla de tirante", result?.stm_model?.tie_force_rule || "-"],
      ["Detalle recomendado", result?.stm_model?.recommended_detailing || "-"],
      ["Variante óptima", result?.optimal_stm_selection?.selected_variant_name || "-"],
      ["Perfil del diseño", result?.optimal_stm_selection?.design_profile || "-"],
      ["Banda de eficiencia", result?.optimal_stm_selection?.efficiency_band || "-"],
    ],
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8.7, cellPadding: 2 },
  });
  y = doc.lastAutoTable.finalY + 6;

  y = ensureSpace(doc, y, 60, pageWidth, logoBase64);
  y = addSectionTitle(doc, "6. Comparación de variantes STM", y);
  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [[
      "Rank",
      "Variante",
      "Divisor",
      "Tirante [kN]",
      "As req [mm²]",
      "As prov [mm²]",
      "Opción",
      "Eficiencia [%]"
    ]],
    body: safeArray(result?.optimal_stm_selection?.variants).map((v) => [
      v.rank,
      v.variant_name,
      fmt(v.divisor_used, 2),
      fmt(v.tie_force_kN, 2),
      fmt(v.As_required_mm2, 2),
      fmt(v.As_provided_mm2, 2),
      v.selected_option,
      fmt((v.optimization_ratio || 0) * 100, 1),
    ]),
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8.3, cellPadding: 2 },
    didParseCell(data) {
      if (data.section === "body" && data.row.raw[0] === 1) {
        data.cell.styles.fillColor = [220, 252, 231];
      }
    },
  });
  y = doc.lastAutoTable.finalY + 6;

  y = ensureSpace(doc, y, 55, pageWidth, logoBase64);
  y = addSectionTitle(doc, "7. Bielas, armadura y chequeos", y);
  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [["Chequeo / resultado", "Valor"]],
    body: [
      ["Fuerza de tirante [kN]", fmt(result?.reinforcement?.tie_force_kN, 2)],
      ["As requerida [mm²]", fmt(result?.reinforcement?.As_required_mm2, 2)],
      ["As provista [mm²]", fmt(result?.reinforcement?.As_provided_mm2, 2)],
      ["Armadura adoptada", result?.reinforcement?.selected_option || "-"],
      ["Punzonamiento", result?.punching_check?.status || "-"],
      ["Ratio punzonamiento", fmt(result?.punching_check?.ratio, 2)],
      ["Cortante", result?.shear_check?.status || "-"],
      ["Ratio cortante", fmt(result?.shear_check?.ratio, 2)],
      ["Nodo STM", result?.node_check?.status || "-"],
      ["Ratio nodo STM", fmt(result?.node_check?.ratio, 2)],
      ["Capacidad nodo [kN]", fmt(result?.node_check?.Fn_kN, 2)],
    ],
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8.7, cellPadding: 2 },
  });
  y = doc.lastAutoTable.finalY + 6;

  y = ensureSpace(doc, y, 45, pageWidth, logoBase64);
  y = addSectionTitle(doc, "8. Advertencias del backend", y);
  const warnings = safeArray(result?.warnings);
  const warningText = warnings.length
    ? warnings.map((w, i) => `${i + 1}. ${w}`).join("\n")
    : "Sin advertencias.";
  y = addParagraph(doc, warningText, y, pageWidth, 9);

  y = ensureSpace(doc, y, 55, pageWidth, logoBase64);
  y = addSectionTitle(doc, "9. Conclusión técnica", y);
  y = addParagraph(doc, buildConclusion(form, result), y, pageWidth, 10);

  y = ensureSpace(doc, y, 45, pageWidth, logoBase64);
  y = addSectionTitle(doc, "10. Recomendaciones profesionales", y);
  const recs = buildRecommendations(result);
  y = addParagraph(
    doc,
    recs.map((r, i) => `${i + 1}. ${r}`).join("\n"),
    y,
    pageWidth,
    9.5
  );

  y = ensureSpace(doc, y, 18, pageWidth, logoBase64);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Marca registrada: ${BRAND_LINE}`, 14, y + 8);
  doc.setTextColor(0, 0, 0);

  drawFooter(doc, pageWidth);
  doc.save(`Memoria_Calculo_${form?.project?.code || "PileCap"}.pdf`);
}
