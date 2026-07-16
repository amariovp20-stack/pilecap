import React, { useMemo, useState } from "react";
import "./App.css";
import { designPileCap } from "./services/api";
import { generatePDF } from "./utils/pdfGenerator";

const brandName = "GEOSERVI LAB";
const technicalOwner = "MSc. Ing. Abel Mario Vega Perez";

const defaultPayload = {
  project: {
    name: "Cabezal 4 pilotes",
    code: "CAP-01",
    design_code: "ACI318",
  },
  geometry: {
    length: "2.4",
    width: "2.4",
    height: "0.9",
    cover_bottom: "0.075",
    cover_side: "0.075",
    column_x: "1.2",
    column_y: "1.2",
    column_width: "0.4",
    column_length: "0.4",
    main_bar_diameter: "0.02",
    stirrup_diameter: "0.0",
  },
  piles: [
    { id: "P1", x: "0.6", y: "0.6", shape: "circular", diameter: "0.4", allowable_reaction: "600" },
    { id: "P2", x: "1.8", y: "0.6", shape: "circular", diameter: "0.4", allowable_reaction: "600" },
    { id: "P3", x: "0.6", y: "1.8", shape: "circular", diameter: "0.4", allowable_reaction: "600" },
    { id: "P4", x: "1.8", y: "1.8", shape: "circular", diameter: "0.4", allowable_reaction: "600" },
  ],
  materials: {
    fc: "28",
    fy: "420",
    phi_steel: "0.9",
    phi_shear: "0.75",
    beta_s: "0.75",
    beta_n: "0.8",
  },
  loads: {
    Pu: "1800",
    Mux: "120",
    Muy: "80",
    Vux: "150",
    Vuy: "100",
  },
};

function sanitizeNumericInput(value) {
  return String(value).replace(",", ".");
}

function toNumberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function statClass(status) {
  if (status === "uplift" || status === "fail" || status === "exceeds_allowable") return "warn";
  return "ok";
}

function angleTagClass(angleStatus) {
  if (angleStatus === "ok") return "tag ok";
  if (angleStatus === "warning") return "tag warn";
  if (angleStatus === "fail") return "tag fail";
  return "tag fail";
}

function angleLabel(angleStatus) {
  if (angleStatus === "ok") return "OK";
  if (angleStatus === "warning") return "ALERTA";
  if (angleStatus === "fail") return "FALLA";
  return "SIN DATO";
}

function profileBadgeClass(profile) {
  if (profile === "económico") return "tag ok";
  if (profile === "balanceado") return "tag warn";
  if (profile === "conservador") return "tag fail";
  return "tag warn";
}

function bandBadgeClass(band) {
  if (band === "muy alta" || band === "alta") return "tag ok";
  if (band === "media") return "tag warn";
  return "tag fail";
}

function complianceTagClass(status) {
  if (status === "ok") return "tag ok";
  if (status === "warning") return "tag warn";
  if (status === "fail") return "tag fail";
  return "tag";
}

function buildNumericPayload(form) {
  return {
    project: { ...form.project },
    geometry: {
      length: toNumberOrZero(form.geometry.length),
      width: toNumberOrZero(form.geometry.width),
      height: toNumberOrZero(form.geometry.height),
      cover_bottom: toNumberOrZero(form.geometry.cover_bottom),
      cover_side: toNumberOrZero(form.geometry.cover_side),
      column_x: toNumberOrZero(form.geometry.column_x),
      column_y: toNumberOrZero(form.geometry.column_y),
      column_width: toNumberOrZero(form.geometry.column_width),
      column_length: toNumberOrZero(form.geometry.column_length),
      main_bar_diameter: toNumberOrZero(form.geometry.main_bar_diameter),
      stirrup_diameter: toNumberOrZero(form.geometry.stirrup_diameter),
    },
    piles: form.piles.map((pile) => ({
      ...pile,
      x: toNumberOrZero(pile.x),
      y: toNumberOrZero(pile.y),
      diameter: pile.diameter === "" ? null : toNumberOrZero(pile.diameter),
      side: pile.side === undefined || pile.side === "" ? null : toNumberOrZero(pile.side),
      allowable_reaction:
        pile.allowable_reaction === "" ? null : toNumberOrZero(pile.allowable_reaction),
    })),
    materials: {
      fc: toNumberOrZero(form.materials.fc),
      fy: toNumberOrZero(form.materials.fy),
      phi_steel: toNumberOrZero(form.materials.phi_steel),
      phi_shear: toNumberOrZero(form.materials.phi_shear),
      beta_s: toNumberOrZero(form.materials.beta_s),
      beta_n: toNumberOrZero(form.materials.beta_n),
    },
    loads: {
      Pu: toNumberOrZero(form.loads.Pu),
      Mux: toNumberOrZero(form.loads.Mux),
      Muy: toNumberOrZero(form.loads.Muy),
      Vux: toNumberOrZero(form.loads.Vux),
      Vuy: toNumberOrZero(form.loads.Vuy),
    },
  };
}

function validateForm(form) {
  const errors = {};

  const requiredGeometry = [
    "length",
    "width",
    "height",
    "cover_bottom",
    "column_x",
    "column_y",
    "column_width",
    "column_length",
  ];

  requiredGeometry.forEach((key) => {
    const value = form.geometry[key];
    if (value === "" || Number(value) <= 0) {
      errors[`geometry.${key}`] = "Valor inválido";
    }
  });

  const requiredMaterials = ["fc", "fy", "phi_steel", "phi_shear"];
  requiredMaterials.forEach((key) => {
    const value = form.materials[key];
    if (value === "" || Number(value) <= 0) {
      errors[`materials.${key}`] = "Valor inválido";
    }
  });

  if (form.loads.Pu === "" || Number(form.loads.Pu) <= 0) {
    errors["loads.Pu"] = "La carga axial debe ser mayor que 0";
  }

  form.piles.forEach((pile, index) => {
    if (pile.x === "" || Number(pile.x) < 0) {
      errors[`piles.${index}.x`] = "Coordenada X inválida";
    }
    if (pile.y === "" || Number(pile.y) < 0) {
      errors[`piles.${index}.y`] = "Coordenada Y inválida";
    }
    if (pile.diameter !== "" && Number(pile.diameter) <= 0) {
      errors[`piles.${index}.diameter`] = "Diámetro inválido";
    }
    if (pile.allowable_reaction !== "" && Number(pile.allowable_reaction) <= 0) {
      errors[`piles.${index}.allowable_reaction`] = "Capacidad inválida";
    }
  });

  return errors;
}

export default function App() {
  const [form, setForm] = useState(defaultPayload);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [activeTab, setActiveTab] = useState("geometria");

  const pileType = useMemo(() => `${form.piles.length} pilotes`, [form.piles.length]);

  const handleGeometryChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      geometry: {
        ...prev.geometry,
        [field]: sanitizeNumericInput(value),
      },
    }));
  };

  const handleMaterialChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      materials: {
        ...prev.materials,
        [field]: sanitizeNumericInput(value),
      },
    }));
  };

  const handleLoadChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      loads: {
        ...prev.loads,
        [field]: sanitizeNumericInput(value),
      },
    }));
  };

  const handleProjectChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      project: {
        ...prev.project,
        [field]: value,
      },
    }));
  };

  const handlePileFieldChange = (index, field, value) => {
    const newPiles = [...form.piles];
    newPiles[index] = {
      ...newPiles[index],
      [field]: sanitizeNumericInput(value),
    };

    setForm((prev) => ({
      ...prev,
      piles: newPiles,
    }));
  };

  const addPile = () => {
    const nextIndex = form.piles.length + 1;

    const newPile = {
      id: `P${nextIndex}`,
      x: "0.0",
      y: "0.0",
      shape: "circular",
      diameter: "0.4",
      allowable_reaction: "600",
    };

    setForm((prev) => ({
      ...prev,
      piles: [...prev.piles, newPile],
    }));

    setResult(null);
    setError("");
    setSuccessMessage("");
  };

  const removePile = (indexToRemove) => {
    if (form.piles.length <= 2) {
      setError("El cabezal debe tener al menos 2 pilotes.");
      return;
    }

    const newPiles = form.piles
      .filter((_, index) => index !== indexToRemove)
      .map((pile, index) => ({
        ...pile,
        id: `P${index + 1}`,
      }));

    setForm((prev) => ({
      ...prev,
      piles: newPiles,
    }));

    setResult(null);
    setError("");
    setSuccessMessage("");
  };

  const handlePileCount = (count) => {
    const presets = {
      2: [
        { id: "P1", x: "0.7", y: "1.2", shape: "circular", diameter: "0.4", allowable_reaction: "600" },
        { id: "P2", x: "1.7", y: "1.2", shape: "circular", diameter: "0.4", allowable_reaction: "600" },
      ],
      3: [
        { id: "P1", x: "1.2", y: "0.55", shape: "circular", diameter: "0.4", allowable_reaction: "600" },
        { id: "P2", x: "0.7", y: "1.75", shape: "circular", diameter: "0.4", allowable_reaction: "600" },
        { id: "P3", x: "1.7", y: "1.75", shape: "circular", diameter: "0.4", allowable_reaction: "600" },
      ],
      4: defaultPayload.piles,
    };

    setForm((prev) => ({
      ...prev,
      piles: presets[count] || prev.piles,
    }));
    setResult(null);
    setError("");
    setSuccessMessage("");
    setFieldErrors({});
  };

  const calculate = async () => {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    const errors = validateForm(form);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError("Corrige los campos marcados antes de calcular.");
      setLoading(false);
      return;
    }

    try {
      const payload = buildNumericPayload(form);
      const data = await designPileCap(payload);
      setResult(data);
      setSuccessMessage("Cálculo realizado correctamente.");
      setActiveTab("reacciones");
    } catch (err) {
      setError(err.message || "No se pudo conectar con el backend.");
    } finally {
      setLoading(false);
    }
  };

  const displayReactions =
    result?.reactions ||
    form.piles.map((pile) => ({
      id: pile.id,
      reaction_kN: "-",
      status: "pendiente",
    }));

  const displayWarnings = result?.warnings || [];
  const tieForce = result?.reinforcement?.tie_force_kN ?? "-";
  const asReq = result?.reinforcement?.As_required_mm2 ?? "-";
  const asAdopt = result?.reinforcement?.selected_option ?? "-";
  const d = result?.effective_depth_m ?? "-";

  const nodeRatio = result?.node_check?.ratio;
  const nodeStatus = result?.node_check?.status || "-";
  const nodeCapacity = result?.node_check?.Fn_kN;
  const designCodeUsed = result?.summary?.design_code || form.project.design_code;
  const phiSteelUsed = result?.summary?.phi_steel_used;
  const phiShearUsed = result?.summary?.phi_shear_used;
  const betaNUsed = result?.summary?.beta_n_used;

  const stmModel = result?.stm_model;
  const stmModelName = stmModel?.model_name || "-";
  const stmModelCode = stmModel?.model_code || "-";
  const stmDescription = stmModel?.description || "-";
  const stmTieRule = stmModel?.tie_force_rule || "-";
  const stmDetailing = stmModel?.recommended_detailing || "-";

  const optimalSelection = result?.optimal_stm_selection;
  const selectedVariantName = optimalSelection?.selected_variant_name || "-";
  const selectedVariantCode = optimalSelection?.selected_variant_code || "-";
  const selectionCriterion = optimalSelection?.criterion || "-";
  const variants = optimalSelection?.variants || [];
  const designProfile = optimalSelection?.design_profile || "-";
  const efficiencyBand = optimalSelection?.efficiency_band || "-";
  const recommendation = optimalSelection?.recommendation || "-";

  const summary = result?.summary || {};
  const topologyStatus = summary?.topology_status || "-";
  const topologyMessage = summary?.topology_message || "-";
  const bidirectionalStatus = summary?.bidirectional_status || "-";
  const bidirectionalMessage = summary?.bidirectional_message || "-";
  const nodalUniformityStatus = summary?.nodal_uniformity_status || "-";
  const nodalUniformityMessage = summary?.nodal_uniformity_message || "-";
  const globalComplianceStatus = summary?.global_compliance_status || "-";
  const globalComplianceMessage = summary?.global_compliance_message || "-";

  const drawLength = toNumberOrZero(form.geometry.length) || 1;
  const drawWidth = toNumberOrZero(form.geometry.width) || 1;
  const drawPu = form.loads.Pu || "0";

  const renderTabContent = () => {
    switch (activeTab) {
      case "proyecto":
        return (
          <div className="card">
            <div className="card-header">
              <h2>Datos generales</h2>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Nombre del proyecto</label>
                <input
                  type="text"
                  value={form.project.name}
                  onChange={(e) => handleProjectChange("name", e.target.value)}
                />
              </div>
              <div className="field">
                <label>Código</label>
                <input
                  type="text"
                  value={form.project.code}
                  onChange={(e) => handleProjectChange("code", e.target.value)}
                />
              </div>
              <div className="field">
                <label>Norma de diseño</label>
                <select
                  value={form.project.design_code}
                  onChange={(e) => handleProjectChange("design_code", e.target.value)}
                  style={{
                    width: "100%",
                    background: "#0b1220",
                    color: "#ffffff",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                    padding: "12px",
                  }}
                >
                  <option value="ACI318">ACI 318</option>
                  <option value="EC2">Eurocódigo 2</option>
                </select>
              </div>
            </div>
          </div>
        );

      case "geometria":
        return (
          <>
            <div className="card">
              <div className="card-header">
                <h2>Geometría del cabezal</h2>
              </div>

              <div className="form-grid">
                <div className="field"><label>Longitud L [m]</label><input type="text" className={fieldErrors["geometry.length"] ? "input-error" : ""} value={form.geometry.length} onChange={(e) => handleGeometryChange("length", e.target.value)} /></div>
                <div className="field"><label>Ancho B [m]</label><input type="text" className={fieldErrors["geometry.width"] ? "input-error" : ""} value={form.geometry.width} onChange={(e) => handleGeometryChange("width", e.target.value)} /></div>
                <div className="field"><label>Altura h [m]</label><input type="text" className={fieldErrors["geometry.height"] ? "input-error" : ""} value={form.geometry.height} onChange={(e) => handleGeometryChange("height", e.target.value)} /></div>
                <div className="field"><label>Recubrimiento inferior [m]</label><input type="text" className={fieldErrors["geometry.cover_bottom"] ? "input-error" : ""} value={form.geometry.cover_bottom} onChange={(e) => handleGeometryChange("cover_bottom", e.target.value)} /></div>
                <div className="field"><label>Recubrimiento lateral [m]</label><input type="text" value={form.geometry.cover_side} onChange={(e) => handleGeometryChange("cover_side", e.target.value)} /></div>
                <div className="field"><label>Columna X [m]</label><input type="text" value={form.geometry.column_x} onChange={(e) => handleGeometryChange("column_x", e.target.value)} /></div>
                <div className="field"><label>Columna Y [m]</label><input type="text" value={form.geometry.column_y} onChange={(e) => handleGeometryChange("column_y", e.target.value)} /></div>
                <div className="field"><label>Ancho columna [m]</label><input type="text" value={form.geometry.column_width} onChange={(e) => handleGeometryChange("column_width", e.target.value)} /></div>
                <div className="field"><label>Largo columna [m]</label><input type="text" value={form.geometry.column_length} onChange={(e) => handleGeometryChange("column_length", e.target.value)} /></div>
              </div>

              <div className="type-group">
                <span className="type-label">Tipo de cabezal</span>
                <div className="pill-row">
                  <button type="button" className={`pill ${form.piles.length === 2 ? "active" : ""}`} onClick={() => handlePileCount(2)}>2 pilotes</button>
                  <button type="button" className={`pill ${form.piles.length === 3 ? "active" : ""}`} onClick={() => handlePileCount(3)}>3 pilotes</button>
                  <button type="button" className={`pill ${form.piles.length === 4 ? "active" : ""}`} onClick={() => handlePileCount(4)}>4 pilotes</button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2>Canvas de geometría y flujo de cargas</h2>
              </div>

              <div className="canvas-box">
                <svg viewBox="0 0 780 430" className="diagram">
                  <defs>
                    <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L9,3 z" fill="#93c5fd" />
                    </marker>
                    <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#132033" strokeWidth="1" />
                    </pattern>
                  </defs>

                  <rect x="0" y="0" width="780" height="430" fill="url(#grid)" rx="16" />
                  <rect x="160" y="80" width="460" height="250" rx="24" className="cap" />
                  <text x="390" y="68" textAnchor="middle" className="svg-title">
                    {`Planta del cabezal - ${pileType}`}
                  </text>

                  <rect x="335" y="155" width="110" height="90" rx="14" className="column" />
                  <text x="390" y="208" textAnchor="middle" className="column-text">
                    Columna
                  </text>

                  {form.piles.map((pile) => {
                    const px = 160 + (toNumberOrZero(pile.x) / drawLength) * 460;
                    const py = 80 + (toNumberOrZero(pile.y) / drawWidth) * 250;

                    const reaction = result?.reactions?.find((r) => r.id === pile.id);
                    const value = reaction?.reaction_kN || 0;
                    const status = reaction?.status || "neutral";
                    const radius = Math.max(20, Math.min(40, 20 + value / 50));

                    let colorClass = "pile-neutral";
                    if (status === "ok") colorClass = "pile-ok";
                    if (status === "uplift") colorClass = "pile-uplift";
                    if (status === "fail" || status === "exceeds_allowable") colorClass = "pile-fail";

                    return (
                      <g key={pile.id}>
                        <circle cx={px} cy={py} r={radius} className={colorClass} />
                        <text x={px} y={py + 4} textAnchor="middle" className="pile-text">{pile.id}</text>
                        <text x={px} y={py + 22} textAnchor="middle" className="pile-value">
                          {typeof value === "number" && value > 0 ? `${value.toFixed(0)} kN` : ""}
                        </text>
                        <line x1="390" y1="200" x2={px} y2={py} className="strut-line" />
                      </g>
                    );
                  })}

                  {form.piles.length >= 2 && (
                    <>
                      <line x1="245" y1="302" x2="535" y2="302" className="tie-line" />
                      <text x="390" y="322" textAnchor="middle" className="tie-text">
                        Tirante principal inferior
                      </text>
                    </>
                  )}

                  <line x1="390" y1="20" x2="390" y2="150" className="load-line" markerEnd="url(#arrow)" />
                  <text x="408" y="52" className="load-text">{`Pu = ${drawPu} kN`}</text>

                  <line x1="160" y1="350" x2="620" y2="350" className="dim-line" />
                  <line x1="160" y1="344" x2="160" y2="356" className="dim-line" />
                  <line x1="620" y1="344" x2="620" y2="356" className="dim-line" />
                  <text x="390" y="372" textAnchor="middle" className="dim-text">
                    {`L = ${form.geometry.length || 0} m`}
                  </text>
                </svg>
              </div>

              <p className="helper-text">El dibujo responde al número de pilotes, reacciones y dimensiones básicas.</p>
            </div>
          </>
        );

      case "pilotes":
        return (
          <div className="card">
            <div className="card-header card-header-inline">
              <h2>Pilotes (editable)</h2>
              <button type="button" className="btn small-btn" onClick={addPile}>+ Agregar pilote</button>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>X [m]</th>
                    <th>Y [m]</th>
                    <th>Diámetro [m]</th>
                    <th>Capacidad [kN]</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {form.piles.map((pile, index) => (
                    <tr key={pile.id}>
                      <td>{pile.id}</td>
                      <td><input type="text" className={fieldErrors[`piles.${index}.x`] ? "input-error" : ""} value={pile.x} onChange={(e) => handlePileFieldChange(index, "x", e.target.value)} /></td>
                      <td><input type="text" className={fieldErrors[`piles.${index}.y`] ? "input-error" : ""} value={pile.y} onChange={(e) => handlePileFieldChange(index, "y", e.target.value)} /></td>
                      <td><input type="text" className={fieldErrors[`piles.${index}.diameter`] ? "input-error" : ""} value={pile.diameter} onChange={(e) => handlePileFieldChange(index, "diameter", e.target.value)} /></td>
                      <td><input type="text" className={fieldErrors[`piles.${index}.allowable_reaction`] ? "input-error" : ""} value={pile.allowable_reaction} onChange={(e) => handlePileFieldChange(index, "allowable_reaction", e.target.value)} /></td>
                      <td><button type="button" className="btn danger-btn" onClick={() => removePile(index)}>Eliminar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "materiales":
        return (
          <div className="card">
            <div className="card-header">
              <h2>Materiales</h2>
            </div>

            <div className="form-grid">
              <div className="field"><label>f'c [MPa]</label><input type="text" className={fieldErrors["materials.fc"] ? "input-error" : ""} value={form.materials.fc} onChange={(e) => handleMaterialChange("fc", e.target.value)} /></div>
              <div className="field"><label>fy [MPa]</label><input type="text" className={fieldErrors["materials.fy"] ? "input-error" : ""} value={form.materials.fy} onChange={(e) => handleMaterialChange("fy", e.target.value)} /></div>
              <div className="field"><label>φ acero</label><input type="text" value={form.materials.phi_steel} onChange={(e) => handleMaterialChange("phi_steel", e.target.value)} /></div>
              <div className="field"><label>φ cortante</label><input type="text" value={form.materials.phi_shear} onChange={(e) => handleMaterialChange("phi_shear", e.target.value)} /></div>
              <div className="field"><label>βs</label><input type="text" value={form.materials.beta_s} onChange={(e) => handleMaterialChange("beta_s", e.target.value)} /></div>
              <div className="field"><label>βn</label><input type="text" value={form.materials.beta_n} onChange={(e) => handleMaterialChange("beta_n", e.target.value)} /></div>
            </div>
          </div>
        );

      case "cargas":
        return (
          <div className="card">
            <div className="card-header">
              <h2>Cargas</h2>
            </div>

            <div className="form-grid">
              <div className="field"><label>Pu [kN]</label><input type="text" className={fieldErrors["loads.Pu"] ? "input-error" : ""} value={form.loads.Pu} onChange={(e) => handleLoadChange("Pu", e.target.value)} /></div>
              <div className="field"><label>Mux [kN·m]</label><input type="text" value={form.loads.Mux} onChange={(e) => handleLoadChange("Mux", e.target.value)} /></div>
              <div className="field"><label>Muy [kN·m]</label><input type="text" value={form.loads.Muy} onChange={(e) => handleLoadChange("Muy", e.target.value)} /></div>
              <div className="field"><label>Vux [kN]</label><input type="text" value={form.loads.Vux} onChange={(e) => handleLoadChange("Vux", e.target.value)} /></div>
              <div className="field"><label>Vuy [kN]</label><input type="text" value={form.loads.Vuy} onChange={(e) => handleLoadChange("Vuy", e.target.value)} /></div>
            </div>
          </div>
        );

      case "reacciones":
        return (
          <div className="card">
            <div className="card-header">
              <h2>Reacciones</h2>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pilote</th>
                    <th>Reacción</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {displayReactions.map((row) => (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td>{typeof row.reaction_kN === "number" ? `${row.reaction_kN.toFixed(2)} kN` : row.reaction_kN}</td>
                      <td><span className={`tag ${statClass(row.status)}`}>{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "bielas":
        return (
          <>
            <div className="card">
              <div className="card-header">
                <h2>Modelo STM base</h2>
              </div>

              <div className="stats-grid">
                <div className="stat"><span>Modelo</span><strong>{stmModelName}</strong></div>
                <div className="stat"><span>Código</span><strong>{stmModelCode}</strong></div>
                <div className="stat"><span>Regla de tirante</span><strong>{stmTieRule}</strong></div>
                <div className="stat"><span>N° pilotes</span><strong>{form.piles.length}</strong></div>
              </div>

              <div className="card" style={{ marginTop: "18px", padding: "14px" }}>
                <div className="card-header">
                  <h2>Descripción del modelo</h2>
                </div>
                <p className="helper-text">{stmDescription}</p>
                <p className="helper-text"><strong>Detalle recomendado:</strong> {stmDetailing}</p>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2>Resumen inteligente del diseño</h2>
              </div>

              <div className="stats-grid">
                <div className="stat"><span>Variante óptima</span><strong>{selectedVariantName}</strong></div>
                <div className="stat"><span>Código</span><strong>{selectedVariantCode}</strong></div>
                <div className="stat">
                  <span>Perfil del diseño</span>
                  <strong><span className={profileBadgeClass(designProfile)}>{designProfile}</span></strong>
                </div>
                <div className="stat">
                  <span>Banda de eficiencia</span>
                  <strong><span className={bandBadgeClass(efficiencyBand)}>{efficiencyBand}</span></strong>
                </div>
              </div>

              <div className="card" style={{ marginTop: "18px", padding: "14px" }}>
                <div className="card-header">
                  <h2>Recomendación automática</h2>
                </div>
                <p className="helper-text"><strong>Criterio:</strong> {selectionCriterion}</p>
                <p className="helper-text">{recommendation}</p>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2>Comparación de variantes STM</h2>
              </div>

              {variants.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Variante</th>
                        <th>Divisor</th>
                        <th>Tirante [kN]</th>
                        <th>As requerida</th>
                        <th>As provista</th>
                        <th>Opción</th>
                        <th>Eficiencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v) => (
                        <tr key={v.variant_code} className={v.rank === 1 ? "best-row" : ""}>
                          <td>{v.rank}</td>
                          <td>{v.variant_name}</td>
                          <td>{v.divisor_used.toFixed(2)}</td>
                          <td>{v.tie_force_kN.toFixed(2)}</td>
                          <td>{v.As_required_mm2.toFixed(2)} mm²</td>
                          <td>{v.As_provided_mm2.toFixed(2)} mm²</td>
                          <td>{v.selected_option}</td>
                          <td>{(v.optimization_ratio * 100).toFixed(1)} %</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="helper-text">Primero calcula el diseño para comparar variantes STM.</p>
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <h2>Bielas y tirantes</h2>
              </div>

              {result?.struts?.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Pilote</th>
                        <th>Long. horizontal [m]</th>
                        <th>Long. biela [m]</th>
                        <th>Ángulo [°]</th>
                        <th>Fuerza biela [kN]</th>
                        <th>Comp. horizontal [kN]</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.struts.map((s) => (
                        <tr key={s.pile_id}>
                          <td>{s.pile_id}</td>
                          <td>{s.horizontal_projection_m.toFixed(3)}</td>
                          <td>{s.strut_length_m.toFixed(3)}</td>
                          <td>{s.angle_deg.toFixed(2)}</td>
                          <td>{s.strut_force_kN.toFixed(2)}</td>
                          <td>{s.horizontal_component_kN.toFixed(2)}</td>
                          <td><span className={angleTagClass(s.angle_status)}>{angleLabel(s.angle_status)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="helper-text">Primero calcula el diseño para ver las bielas y tirantes.</p>
              )}
            </div>
          </>
        );

      case "armadura":
        return (
          <div className="card">
            <div className="card-header">
              <h2>Armadura</h2>
            </div>

            <div className="stats-grid">
              <div className="stat"><span>Norma usada</span><strong>{designCodeUsed}</strong></div>
              <div className="stat"><span>Altura efectiva d</span><strong>{typeof d === "number" ? `${d.toFixed(3)} m` : d}</strong></div>
              <div className="stat"><span>Fuerza de tirante</span><strong>{typeof tieForce === "number" ? `${tieForce.toFixed(2)} kN` : tieForce}</strong></div>
              <div className="stat"><span>As requerida</span><strong>{typeof asReq === "number" ? `${asReq.toFixed(2)} mm²` : asReq}</strong></div>
              <div className="stat"><span>Armadura adoptada</span><strong>{asAdopt}</strong></div>
              <div className="stat"><span>φ acero usado</span><strong>{typeof phiSteelUsed === "number" ? phiSteelUsed.toFixed(2) : "-"}</strong></div>
              <div className="stat"><span>Eficiencia de optimización</span><strong>{typeof result?.reinforcement?.optimization_ratio === "number" ? `${(result.reinforcement.optimization_ratio * 100).toFixed(1)} %` : "-"}</strong></div>
              <div className="stat"><span>As provista</span><strong>{typeof result?.reinforcement?.As_provided_mm2 === "number" ? `${result.reinforcement.As_provided_mm2.toFixed(2)} mm²` : "-"}</strong></div>
            </div>

            <div className="card" style={{ marginTop: "18px", padding: "14px" }}>
              <div className="card-header">
                <h2>Opciones óptimas de armadura</h2>
              </div>

              {result?.reinforcement?.top_options?.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Opción</th>
                        <th>N° barras</th>
                        <th>Área barra</th>
                        <th>As provista</th>
                        <th>Exceso</th>
                        <th>Eficiencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.reinforcement.top_options.map((opt) => (
                        <tr key={opt.label}>
                          <td>{opt.label}</td>
                          <td>{opt.bar_count}</td>
                          <td>{opt.bar_area_mm2.toFixed(2)} mm²</td>
                          <td>{opt.As_provided_mm2.toFixed(2)} mm²</td>
                          <td>{opt.excess_mm2.toFixed(2)} mm²</td>
                          <td>{(opt.efficiency_ratio * 100).toFixed(1)} %</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="helper-text">Primero calcula el diseño para ver opciones de armadura.</p>
              )}
            </div>
          </div>
        );

      case "punzonamiento":
        return (
          <div className="card">
            <div className="card-header">
              <h2>Punzonamiento y chequeo de nodo</h2>
            </div>

            <div className="check-item"><span>Norma usada</span><strong>{designCodeUsed}</strong></div>
            <div className="check-item"><span>φ cortante usado</span><strong>{typeof phiShearUsed === "number" ? phiShearUsed.toFixed(2) : "-"}</strong></div>
            <div className="check-item"><span>βn usado</span><strong>{typeof betaNUsed === "number" ? betaNUsed.toFixed(2) : "-"}</strong></div>
            <div className="check-item"><span>Punzonamiento - Estado</span><strong>{result?.punching_check?.status || "-"}</strong></div>
            <div className="check-item"><span>Punzonamiento - Ratio</span><strong>{result?.punching_check?.ratio ? result.punching_check.ratio.toFixed(2) : "-"}</strong></div>
            <div className="check-item"><span>Cortante - Estado</span><strong>{result?.shear_check?.status || "-"}</strong></div>
            <div className="check-item"><span>Cortante - Ratio</span><strong>{result?.shear_check?.ratio ? result.shear_check.ratio.toFixed(2) : "-"}</strong></div>
            <div className="check-item"><span>Nodo STM - Estado</span><strong>{nodeStatus}</strong></div>
            <div className="check-item"><span>Nodo STM - Ratio</span><strong>{typeof nodeRatio === "number" ? nodeRatio.toFixed(2) : "-"}</strong></div>
            <div className="check-item"><span>Nodo STM - Capacidad</span><strong>{typeof nodeCapacity === "number" ? `${nodeCapacity.toFixed(2)} kN` : "-"}</strong></div>

            <div className="card" style={{ marginTop: "18px", padding: "14px" }}>
              <div className="card-header">
                <h2>Diagnóstico global del motor</h2>
              </div>

              <div className="check-item">
                <span>Topología STM</span>
                <strong><span className={complianceTagClass(topologyStatus)}>{topologyStatus}</span></strong>
              </div>
              <div className="check-item">
                <span>Mensaje topología</span>
                <strong>{topologyMessage}</strong>
              </div>

              <div className="check-item">
                <span>Comportamiento bidireccional</span>
                <strong><span className={complianceTagClass(bidirectionalStatus)}>{bidirectionalStatus}</span></strong>
              </div>
              <div className="check-item">
                <span>Mensaje bidireccional</span>
                <strong>{bidirectionalMessage}</strong>
              </div>

              <div className="check-item">
                <span>Uniformidad nodal</span>
                <strong><span className={complianceTagClass(nodalUniformityStatus)}>{nodalUniformityStatus}</span></strong>
              </div>
              <div className="check-item">
                <span>Mensaje uniformidad nodal</span>
                <strong>{nodalUniformityMessage}</strong>
              </div>

              <div className="check-item">
                <span>Cumplimiento global</span>
                <strong><span className={complianceTagClass(globalComplianceStatus)}>{globalComplianceStatus}</span></strong>
              </div>
              <div className="check-item">
                <span>Mensaje global</span>
                <strong>{globalComplianceMessage}</strong>
              </div>
            </div>
          </div>
        );

      case "reporte":
        return (
          <div className="card">
            <div className="card-header">
              <h2>Reporte PDF</h2>
            </div>

            <p className="helper-text">Genera un reporte resumido con datos de entrada y resultados.</p>
            <p className="helper-text">Marca registrada: {brandName}. Responsable tecnico: {technicalOwner}.</p>

            <button type="button" className="btn primary" onClick={() => generatePDF(form, result)} disabled={!result}>
              Exportar PDF
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img
              src="/logo.png"
              alt="PileCap Studio"
              style={{
                width: "42px",
                height: "42px",
                objectFit: "contain",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.08)",
                padding: "4px",
              }}
            />
            <div>
              <div style={{ fontSize: "18px", fontWeight: "700", lineHeight: "1.1" }}>PileCap</div>
              <span style={{ display: "block", marginTop: "2px" }}>Studio</span>
            </div>
          </div>
        </div>

        <div className="menu-section">
          <div className="menu-title">Proyecto</div>
          <button type="button" className={`menu-item ${activeTab === "proyecto" ? "active" : ""}`} onClick={() => setActiveTab("proyecto")}>Datos generales</button>
          <button type="button" className={`menu-item ${activeTab === "geometria" ? "active" : ""}`} onClick={() => setActiveTab("geometria")}>Geometría del cabezal</button>
          <button type="button" className={`menu-item ${activeTab === "pilotes" ? "active" : ""}`} onClick={() => setActiveTab("pilotes")}>Pilotes</button>
          <button type="button" className={`menu-item ${activeTab === "materiales" ? "active" : ""}`} onClick={() => setActiveTab("materiales")}>Materiales</button>
          <button type="button" className={`menu-item ${activeTab === "cargas" ? "active" : ""}`} onClick={() => setActiveTab("cargas")}>Cargas</button>
        </div>

        <div className="menu-section">
          <div className="menu-title">Resultados</div>
          <button type="button" className={`menu-item ${activeTab === "reacciones" ? "active" : ""}`} onClick={() => setActiveTab("reacciones")}>Reacciones</button>
          <button type="button" className={`menu-item ${activeTab === "bielas" ? "active" : ""}`} onClick={() => setActiveTab("bielas")}>Bielas y tirantes</button>
          <button type="button" className={`menu-item ${activeTab === "armadura" ? "active" : ""}`} onClick={() => setActiveTab("armadura")}>Armadura</button>
          <button type="button" className={`menu-item ${activeTab === "punzonamiento" ? "active" : ""}`} onClick={() => setActiveTab("punzonamiento")}>Punzonamiento</button>
          <button type="button" className={`menu-item ${activeTab === "reporte" ? "active" : ""}`} onClick={() => setActiveTab("reporte")}>Reporte PDF</button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img
              src="/logo.png"
              alt="PileCap Studio"
              style={{
                width: "54px",
                height: "54px",
                objectFit: "contain",
                borderRadius: "10px",
                background: "#ffffff",
                padding: "4px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              }}
            />
            <div>
              <h1>PileCap Studio</h1>
              <p>Modifica datos, presiona <strong>Calcular diseño</strong> y navega por las pestañas del menú izquierdo.</p>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setForm(defaultPayload);
                setResult(null);
                setError("");
                setSuccessMessage("");
                setFieldErrors({});
                setActiveTab("geometria");
              }}
            >
              Restablecer
            </button>
            <button type="button" className="btn primary" onClick={calculate} disabled={loading}>
              {loading ? "Calculando..." : "Calcular diseño"}
            </button>
            <button type="button" className="btn" onClick={() => generatePDF(form, result)} disabled={!result}>
              Exportar PDF
            </button>
          </div>
        </header>

        {error ? <div className="error-banner">{error}</div> : null}
        {successMessage ? <div className="success-banner">{successMessage}</div> : null}

        {renderTabContent()}

        {displayWarnings.length > 0 && (
          <div className="card info-card" style={{ marginTop: "18px" }}>
            <div className="card-header">
              <h2>Advertencias del backend</h2>
            </div>
            <ul>
              {displayWarnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
        <footer className="brand-footer">
          Marca registrada: {brandName} - {technicalOwner}
        </footer>
      </main>
    </div>
  );
}
