import { useState, useEffect, useCallback } from "react";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx34KIpd7c6ULMnOzryyLVcuF4TUhAUk3wmy_udOy6EaIMJuS6MwUOx-aYHDyM5T-bG/exec";
const HORARIOS_API = "https://sheets.googleapis.com/v4/spreadsheets/10QxZKFbCVxWfM6pQ6DH5F5UoJOUyHBDvyMM7a7rKNJ4/values/Actual?key=AIzaSyCCv1fxJ9O_HNUIpvoeuRzGJF99YQyyjkM";

async function fetchSheet(sheetName?: string) {
  const url = sheetName ? `${SCRIPT_URL}?sheet=${sheetName}` : SCRIPT_URL;
  const response = await fetch(url, { method: 'GET', redirect: 'follow' });
  const text = await response.text();
  return JSON.parse(text);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function getTodayStr() {
  const hoy = new Date();
  const dd = String(hoy.getDate()).padStart(2, "0");
  const mm = String(hoy.getMonth() + 1).padStart(2, "0");
  const yy = String(hoy.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
}

interface Cliente {
  Cliente: string; Canal: string; MARCA: string; Modelo: string; Chasis: string;
  Observaciones: string; "Fecha Preparación": string; "Caja OK": string; DNRPA: string;
  "Estado Administrativo": string; _colorA: string;
}

interface EntregaHorario {
  horario: string;
  cliente: string;
  modelo: string;
  vin: string;
  vendedor: string;
  obs: string;
}

async function fetchEntregasHorario(): Promise<EntregaHorario[]> {
  const res = await fetch(HORARIOS_API);
  const json = await res.json();
  const rows: string[][] = json.values || [];
  const hoy = getTodayStr();
  const resultado: EntregaHorario[] = [];

  let colIdx = -1;
  let headerRowIdx = -1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    for (let j = 0; j < row.length; j++) {
      if (row[j] && row[j].includes(hoy)) {
        colIdx = j;
        headerRowIdx = i;
        break;
      }
    }
    if (colIdx !== -1) break;
  }

  if (colIdx === -1) return [];

  let i = headerRowIdx + 1;
  while (i < rows.length) {
    const rowA = rows[i]?.[0] || "";
    if (rowA === "Horario") break;

    const horario = rowA;
    const vinRow    = rows[i]?.[colIdx] || "";
    const modRow    = rows[i + 1]?.[colIdx] || "";
    const clientRow = rows[i + 2]?.[colIdx] || "";
    const vendRow   = rows[i + 3]?.[colIdx] || "";
    const obsRow    = rows[i + 5]?.[colIdx] || "";

    const cliente  = clientRow.replace(/^CLIENT:/, "").trim();
    const modelo   = modRow.replace(/^MOD:/, "").trim();
    const vin      = vinRow.replace(/^VIN:/, "").trim();
    const vendedor = vendRow.replace(/^VEND:/, "").trim();
    const obs      = obsRow.replace(/^OBS:/, "").trim();

    if (cliente) {
      resultado.push({ horario, cliente, modelo, vin, vendedor, obs });
    }

    i += 6;
  }

  return resultado;
}

export default function App() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [entregasHorario, setEntregasHorario] = useState<EntregaHorario[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [loadingEntregas, setLoadingEntregas] = useState(true);
  const [errorClientes, setErrorClientes] = useState("");
  const [errorEntregas, setErrorEntregas] = useState("");
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const cargarClientes = useCallback(async () => {
    setLoadingClientes(true); setErrorClientes("");
    try { const data = await fetchSheet(); setClientes(data); }
    catch { setErrorClientes("No se pudieron cargar los clientes."); }
    finally { setLoadingClientes(false); }
  }, []);

  const cargarEntregas = useCallback(async () => {
    setLoadingEntregas(true); setErrorEntregas("");
    try {
      const data = await fetchEntregasHorario();
      setEntregasHorario(data);
    }
    catch { setErrorEntregas("No se pudieron cargar las entregas."); }
    finally { setLoadingEntregas(false); }
  }, []);

  const actualizar = useCallback(() => {
    cargarClientes(); cargarEntregas(); setLastUpdate(new Date());
  }, [cargarClientes, cargarEntregas]);

  useEffect(() => {
    actualizar();
    const t = setInterval(actualizar, 600000);
    return () => clearInterval(t);
  }, [actualizar]);

  const COLORES_AMARILLO = ["#ffff00", "#ffd966", "#fff2cc", "#ffff99", "#fce8b2"];
  const pendientes = clientes.filter(c => COLORES_AMARILLO.includes(c._colorA?.toLowerCase()));

  return (
    <div style={{ fontFamily: "sans-serif", background: "#f3f4f6", minHeight: "100vh" }}>
      <div style={{ background: "#1e3a5f", color: "white", padding: "16px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "22px" }}>Mi Tablero</h1>
            <p style={{ margin: "4px 0 0", fontSize: "13px", opacity: 0.8 }}>{formatDate(new Date())}</p>
          </div>
          <button onClick={actualizar} style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "none", borderRadius: "8px", padding: "8px 16px", cursor: "pointer" }}>↻ Actualizar</button>
        </div>
        <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: "8px", padding: "10px 20px" }}>
            📞 <strong>{loadingClientes ? "..." : pendientes.length}</strong> clientes para llamar
          </div>
          <div style={{ background: "#16a34a", borderRadius: "8px", padding: "10px 20px" }}>
            🚚 <strong>{loadingEntregas ? "..." : entregasHorario.length}</strong> entregas hoy
          </div>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: "12px", opacity: 0.6 }}>Actualizado: {lastUpdate.toLocaleTimeString("es-AR")}</p>
      </div>

      <div style={{ padding: "20px 24px" }}>
        <Section title="📞 Clientes para Llamar" count={pendientes.length}>
          {loadingClientes ? <Cargando /> : errorClientes ? <ErrorCard msg={errorClientes} onRetry={cargarClientes} /> :
            pendientes.length === 0 ? <Vacio msg="No hay clientes pendientes." /> :
            pendientes.map((c, i) => <ClienteCard key={i} cliente={c} />)}
        </Section>

        <Section title="🚚 Entregas del Día" count={entregasHorario.length}>
          {loadingEntregas ? <Cargando /> : errorEntregas ? <ErrorCard msg={errorEntregas} onRetry={cargarEntregas} /> :
            entregasHorario.length === 0 ? <Vacio msg="No hay entregas programadas para hoy." /> :
            entregasHorario.map((e, i) => <EntregaHorarioCard key={i} entrega={e} />)}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
        <h2 style={{ margin: 0, color: "#1e3a5f" }}>{title}</h2>
        <span style={{ background: "#1e3a5f", color: "white", borderRadius: "20px", padding: "2px 12px", fontSize: "13px" }}>{count}</span>
      </div>
      {children}
    </div>
  );
}

function Cargando() { return <p style={{ color: "#6b7280", textAlign: "center", padding: "20px" }}>Cargando...</p>; }
function Vacio({ msg }: { msg: string }) { return <p style={{ color: "#6b7280", textAlign: "center", padding: "20px" }}>{msg}</p>; }

function ClienteCard({ cliente }: { cliente: Cliente }) {
  return (
    <div style={{ background: "white", borderRadius: "10px", padding: "14px 16px", marginBottom: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", borderLeft: "4px solid #1e3a5f" }}>
      <div style={{ fontWeight: "bold" }}>{cliente.Cliente}</div>
      <div style={{ color: "#6b7280", fontSize: "13px" }}>{cliente.MARCA} · {cliente.Modelo}</div>
      {cliente.Observaciones && <div style={{ color: "#f59e0b", fontSize: "12px" }}>⚠ {cliente.Observaciones}</div>}
    </div>
  );
}

function EntregaHorarioCard({ entrega }: { entrega: EntregaHorario }) {
  return (
    <div style={{ background: "white", borderRadius: "10px", padding: "14px 16px", marginBottom: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", borderLeft: "4px solid #16a34a" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontWeight: "bold", fontSize: "15px" }}>{entrega.cliente}</div>
        <span style={{ background: "#1e3a5f", color: "white", borderRadius: "6px", padding: "2px 10px", fontSize: "13px", whiteSpace: "nowrap", marginLeft: "8px" }}>
          🕐 {entrega.horario}hs
        </span>
      </div>
      <div style={{ color: "#6b7280", fontSize: "13px", marginTop: "4px" }}>{entrega.modelo}</div>
      {entrega.vin && <div style={{ color: "#9ca3af", fontSize: "12px" }}>VIN: {entrega.vin}</div>}
      {entrega.vendedor && <div style={{ color: "#9ca3af", fontSize: "12px" }}>Vendedor: {entrega.vendedor}</div>}
      {entrega.obs && <div style={{ color: "#f59e0b", fontSize: "12px", marginTop: "4px" }}>⚠ {entrega.obs}</div>}
    </div>
  );
}

function ErrorCard({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div style={{ background: "#fee2e2", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
      <p style={{ color: "#dc2626", margin: "0 0 8px" }}>⚠ {msg}</p>
      <button onClick={onRetry} style={{ background: "#dc2626", color: "white", border: "none", borderRadius: "6px", padding: "6px 16px", cursor: "pointer" }}>Reintentar</button>
    </div>
  );
}
