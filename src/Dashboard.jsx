import { useMemo, useState } from "react";

const periods = [
  { value: "7", label: "Última semana" },
  { value: "30", label: "Último mês" },
  { value: "365", label: "Último ano" },
  { value: "month", label: "Mês específico" },
  { value: "all", label: "Todo o período" }
];

const STUDY_TIME_ZONE = "America/Cuiaba";
const datePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: STUDY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});
const fullDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "long",
  year: "numeric"
});

function dateKeyInStudyZone(value) {
  const parts = Object.fromEntries(
    datePartsFormatter.formatToParts(new Date(value))
      .filter(part => part.type !== "literal")
      .map(part => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function keyToUtcDate(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export default function Dashboard({ attempts }) {
  const [period, setPeriod] = useState("30");
  const [selectedMonth, setSelectedMonth] = useState(() => dateKeyInStudyZone(new Date()).slice(0, 7));
  const [area, setArea] = useState("Todas");

  const areas = useMemo(() => [...new Set(attempts.map(a => a.area))].sort(), [attempts]);
  const filtered = useMemo(() => {
    const cutoff = ["all", "month"].includes(period) ? 0 : Date.now() - Number(period) * 86400000;
    return attempts.filter(a =>
      (area === "Todas" || a.area === area) &&
      (period !== "month" || dateKeyInStudyZone(a.answeredAt).startsWith(selectedMonth)) &&
      new Date(a.answeredAt).getTime() >= cutoff
    );
  }, [attempts, area, period, selectedMonth]);

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

  const daily = useMemo(() => {
    const todayKey = dateKeyInStudyZone(new Date());
    const today = keyToUtcDate(todayKey);
    const configuredDays = ["all", "month"].includes(period) ? null : Number(period);
    const firstAttemptKey = [...filtered]
      .map(item => dateKeyInStudyZone(item.answeredAt))
      .sort()[0] || todayKey;
    let start;
    let end = today;
    if (period === "month") {
      const [year, month] = selectedMonth.split("-").map(Number);
      start = new Date(Date.UTC(year, month - 1, 1, 12));
      end = new Date(Date.UTC(year, month, 0, 12));
    } else {
      start = configuredDays
        ? new Date(today.getTime() - (configuredDays - 1) * 86400000)
        : keyToUtcDate(firstAttemptKey);
    }
    const grouped = {};
    filtered.forEach(item => {
      const key = dateKeyInStudyZone(item.answeredAt);
      grouped[key] ||= { total: 0, correct: 0 };
      grouped[key].total += 1;
      if (item.correct) grouped[key].correct += 1;
    });
    const days = [];
    for (let cursor = new Date(start); cursor <= end; cursor = new Date(cursor.getTime() + 86400000)) {
      const date = new Date(cursor);
      const key = date.toISOString().slice(0, 10);
      const values = grouped[key] || { total: 0, correct: 0 };
      days.push({
        key,
        label: `${key.slice(8, 10)}/${key.slice(5, 7)}`,
        fullLabel: fullDateFormatter.format(date),
        ...values
      });
    }
    return days;
  }, [filtered, period, selectedMonth]);
  const periodLabel = period === "month"
    ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })
      .format(keyToUtcDate(`${selectedMonth}-01`))
    : periods.find(p => p.value === period)?.label;
  const dailyMax = Math.max(1, ...daily.map(day => day.total));
  const lifetimeGame = useMemo(() => {
    const ordered = [...attempts].sort((a, b) => new Date(a.answeredAt) - new Date(b.answeredAt));
    let running = 0;
    let best = 0;
    ordered.forEach(item => {
      if (item.correct) {
        running += 1;
        best = Math.max(best, running);
      } else running = 0;
    });
    return { best };
  }, [attempts]);

  return (
    <section className="dashboard-page">
      <div className="dashboard-heading"><div><span className="eyebrow">SEU PROGRESSO</span><h1>Desempenho</h1><p>Acompanhe seus resultados por período e área médica.</p></div>
        <div className="dashboard-filters"><label>Período<select value={period} onChange={e => setPeriod(e.target.value)}>{periods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
          {period === "month" && <label>Mês<input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} /></label>}
          <label>Área<select value={area} onChange={e => setArea(e.target.value)}><option>Todas</option>{areas.map(x => <option key={x}>{x}</option>)}</select></label></div>
      </div>
      <div className="metric-grid"><div className="metric"><span>Questões respondidas</span><b>{filtered.length}</b></div><div className="metric"><span>Respostas corretas</span><b>{correct}</b></div><div className="metric"><span>Melhor sequência</span><b>🔥 {lifetimeGame.best}</b></div><div className="metric accent"><span>Aproveitamento</span><b>{rate}%</b></div></div>
      <div className="chart-card daily-card"><div className="chart-title"><div><h2>Evolução dia após dia</h2><small>Quantidade respondida e acertos em cada dia</small></div><span>{periodLabel}</span></div>
        {daily.length ? <div className="daily-scroll"><div className="daily-chart" style={{ width: `${Math.max(680, daily.length * 56)}px` }}>
          {daily.map(day => {
            const height = day.total ? Math.max(12, day.total / dailyMax * 100) : 3;
            const correctHeight = day.total ? day.correct / day.total * 100 : 0;
            const errors = day.total - day.correct;
            const rate = day.total ? Math.round(day.correct / day.total * 100) : 0;
            return <button className="daily-column" key={day.key} type="button" aria-label={`${day.fullLabel}: ${day.correct} acertos e ${errors} erros`}>
              <span className="daily-tooltip"><b>{day.fullLabel}</b><span>{day.total} respondidas</span><span className="tooltip-correct">● {day.correct} acertos</span><span className="tooltip-wrong">● {errors} erros</span><strong>{rate}% de aproveitamento</strong></span>
              <div className="daily-value">{day.total || ""}</div>
              <div className="daily-bar-track"><div className={`daily-bar ${day.total ? "" : "empty"}`} style={{ height: `${height}%` }}><span style={{ height: `${correctHeight}%` }} /></div></div>
              <small>{day.label}</small>
            </button>;
          })}
        </div></div> : <div className="chart-empty">Responda algumas questões para visualizar sua evolução diária.</div>}
        {daily.length > 0 && <div className="daily-legend"><span><i className="answered-dot" />Respondidas</span><span><i className="correct-dot" />Proporção de acertos</span></div>}
      </div>
      <div className="chart-card"><div className="chart-title"><h2>Desempenho por área</h2><span>{periodLabel}</span></div>
        {byArea.length ? <div className="bar-chart">{byArea.map(item => <div className="bar-row" key={item.name}><div className="bar-label"><span>{item.name}</span><small>{item.correct}/{item.total} acertos</small></div><div className="bar-track"><div className="bar-fill" style={{ width: `${item.rate}%` }} /></div><b>{item.rate}%</b></div>)}</div>
          : <div className="chart-empty">Responda algumas questões para visualizar seu desempenho.</div>}
      </div>
    </section>
  );
}
