import { useMemo, useState } from "react";

const periods = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 3 meses" },
  { value: "365", label: "Último ano" },
  { value: "all", label: "Todo o período" }
];

export default function Dashboard({ attempts }) {
  const [period, setPeriod] = useState("30");
  const [area, setArea] = useState("Todas");

  const areas = useMemo(() => [...new Set(attempts.map(a => a.area))].sort(), [attempts]);
  const filtered = useMemo(() => {
    const cutoff = period === "all" ? 0 : Date.now() - Number(period) * 86400000;
    return attempts.filter(a =>
      (area === "Todas" || a.area === area) &&
      new Date(a.answeredAt).getTime() >= cutoff
    );
  }, [attempts, area, period]);

  const correct = filtered.filter(a => a.correct).length;
  const rate = filtered.length ? Math.round(correct / filtered.length * 100) : 0;
  const byArea = useMemo(() => {
    const grouped = {};
    filtered.forEach(a => {
      grouped[a.area] ||= { total: 0, correct: 0 };
      grouped[a.area].total++;
      if (a.correct) grouped[a.area].correct++;
    });
    return Object.entries(grouped).map(([name, value]) => ({
      name, ...value, rate: Math.round(value.correct / value.total * 100)
    })).sort((a, b) => b.total - a.total);
  }, [filtered]);

  return (
    <section className="dashboard-page">
      <div className="dashboard-heading"><div><span className="eyebrow">SEU PROGRESSO</span><h1>Desempenho</h1><p>Acompanhe seus resultados por período e área médica.</p></div>
        <div className="dashboard-filters"><label>Período<select value={period} onChange={e => setPeriod(e.target.value)}>{periods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
          <label>Área<select value={area} onChange={e => setArea(e.target.value)}><option>Todas</option>{areas.map(x => <option key={x}>{x}</option>)}</select></label></div>
      </div>
      <div className="metric-grid"><div className="metric"><span>Questões respondidas</span><b>{filtered.length}</b></div><div className="metric"><span>Respostas corretas</span><b>{correct}</b></div><div className="metric accent"><span>Aproveitamento</span><b>{rate}%</b></div></div>
      <div className="chart-card"><div className="chart-title"><h2>Desempenho por área</h2><span>{periods.find(p => p.value === period)?.label}</span></div>
        {byArea.length ? <div className="bar-chart">{byArea.map(item => <div className="bar-row" key={item.name}><div className="bar-label"><span>{item.name}</span><small>{item.correct}/{item.total} acertos</small></div><div className="bar-track"><div className="bar-fill" style={{ width: `${item.rate}%` }} /></div><b>{item.rate}%</b></div>)}</div>
          : <div className="chart-empty">Responda algumas questões para visualizar seu desempenho.</div>}
      </div>
    </section>
  );
}
