import { useState, useEffect, useCallback } from "react";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx34KIpd7c6ULMnOzryyLVcuF4TUhAUk3wmy_udOy6EaIMJuS6MwUOx-aYHDyM5T-bG/exec";

async function fetchSheet(sheetName?: string) {
  const url = sheetName ? `${SCRIPT_URL}?sheet=${sheetName}` : SCRIPT_URL;
  const response = await fetch(url, { method: 'GET', redirect: 'follow' });
  const text = await response.text();
  return JSON.parse(text);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function isToday(fechaStr: string) {
  if (!fechaStr) return false;
  const fecha = new Date(fechaStr);
  const hoy = new Date();
  return fecha.getDate() === hoy.getDate() && fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
}

interface Cliente {
  Cliente: string; Canal: string; MARCA: string; Modelo: string; Chasis: string;
  Observaciones: string; "Fecha Preparación": string; "Caja OK": string; DNRPA: string;
  "Estado Administrativo": string; _colorA: string;
}

export default function App() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [entregas, setEntregas] = useState<Cliente[]>([]);
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
    try { const data = await fetchSheet("ENTREGADOS"); setEntregas(data.filter((e: Cliente) => isToday(e["Fecha Preparación"]))); }
    catch { setErrorEntregas("No se pudieron cargar las entregas."); }
    finally { setLoadingEntregas(false); }
  }, []);

  const actualizar = useCallback(() => { cargarClientes(); cargarEntregas(); setLastUpdate(new Date()); }, [cargarClientes, cargarEntregas]);

  useEffect(() => { actualizar(); const t = setInterval(actualizar, 600000); return () => clearInterval(t); }, [actualizar]);

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
        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: "8px", padding: "10px 20px" }}>📞 <strong>{loadingClientes ? "..." : pendientes.length}</strong> clientes para llamar</div>
          <div style={{ background: "#16a34a", borderRadius: "8px", padding: "10px 20px" }}>🚚 <strong>{loadingEntregas ? "..." : entregas.length}</strong> entregas hoy</div>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: "12px", opacity: 0.6 }}>Actualizado: {lastUpdate.toLocaleTimeString("es-AR")}</p>
      </div>
      <div style={{ padding: "20px 24px" }}>
        <Section title="📞 Clientes para Llamar" count={pendientes.length}>
          {loadingClientes ? <Cargando /> : errorClientes ? <ErrorCard msg={errorClientes} onRetry={cargarClientes} /> : pendientes.length === 0 ? <Vacio msg="No hay clientes pendientes." /> : pendientes.map((c, i) => <ClienteCard key={i} cliente={c} />)}
        </Section>
        <Section title="🚚 Entregas del Día" count={entregas.length}>
          {loadingEntregas ? <Cargando /> : errorEntregas ? <ErrorCard msg={errorEntregas} onRetry={cargarEntregas} /> : entregas.length === 0 ? <Vacio msg="No hay entregas para hoy." /> : entregas.map((e, i) => <EntregaCard key={i} entrega={e} />)}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return <div style={{ marginBottom: "24px" }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}><h2 style={{ margin: 0, color: "#1e3a5f" }}>{title}</h2><span style={{ background: "#1e3a5f", color: "white", borderRadius: "20px", padding: "2px 12px", fontSize: "13px" }}>{count}</span></div>{children}</div>;
}
function Cargando() { return <p style={{ color: "#6b7280", textAlign: "center", padding: "20px" }}>Cargando...</p>; }
function Vacio({ msg }: { msg: string }) { return <p style={{ color: "#6b7280", textAlign: "center", padding: "20px" }}>{msg}</p>; }
function ClienteCard({ cliente }: { cliente: Cliente }) {
  return <div style={{ background: "white", borderRadius: "10px", padding: "14px 16px", marginBottom: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", borderLeft: "4px solid #1e3a5f" }}>
    <div style={{ fontWeight: "bold" }}>{cliente.Cliente}</div>
    <div style={{ color: "#6b7280", fontSize: "13px" }}>{cliente.MARCA} · {cliente.Modelo}</div>
    {cliente.Observaciones && <div style={{ color: "#f59e0b", fontSize: "12px" }}>⚠ {cliente.Observaciones}</div>}
  </div>;
}
function EntregaCard({ entrega }: { entrega: Cliente }) {
  return <div style={{ background: "white", borderRadius: "10px", padding: "14px 16px", marginBottom: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", borderLeft: "4px solid #16a34a" }}>
    <div style={{ fontWeight: "bold" }}>{entrega.Cliente}</div>
    <div style={{ color: "#6b7280", fontSize: "13px" }}>{entrega.MARCA} · {entrega.Modelo}</div>
    <div style={{ color: "#9ca3af", fontSize: "12px" }}>Chasis: {entrega.Chasis}</div>
  </div>;
}
function ErrorCard({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return <div style={{ background: "#fee2e2", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
    <p style={{ color: "#dc2626", margin: "0 0 8px" }}>⚠ {msg}</p>
    <button onClick={onRetry} style={{ background: "#dc2626", color: "white", border: "none", borderRadius: "6px", padding: "6px 16px", cursor: "pointer" }}>Reintentar</button>
  </div>;
}