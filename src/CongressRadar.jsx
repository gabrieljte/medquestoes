import { useMemo, useState } from "react";
import { useSyncedStorage } from "./syncedStorage.js";

const DAY = 86400000;

const congresses = [
  { id: "neuro-2026", title: "XXXII Congresso Brasileiro de Neurologia", short: "NEURO 2026", area: "Neurologia", scope: "Brasil", city: "Rio de Janeiro, RJ", mode: "Presencial", start: "2026-10-07", end: "2026-10-10", abstractDeadline: null, registrationDeadline: null, source: "https://abneuro.org.br/eventos/" },
  { id: "sbc-wcc-2026", title: "81º Congresso Brasileiro de Cardiologia + WCC", short: "SBC + WCC 2026", area: "Cardiologia", scope: "Brasil", city: "Rio de Janeiro, RJ", mode: "Presencial", start: "2026-10-08", end: "2026-10-10", abstractDeadline: "2026-04-15", registrationDeadline: null, source: "https://www.portal.cardiol.br/noticias/81o-congresso-brasileiro-de-cardiologia-divulga-programacao-cientifica-preliminar" },
  { id: "idweek-2026", title: "IDWeek 2026", short: "IDWeek 2026", area: "Infectologia", scope: "Internacional", city: "Washington, D.C.", mode: "Presencial", start: "2026-10-21", end: "2026-10-24", abstractDeadline: "2026-08-04", registrationDeadline: "2026-09-18", source: "https://www.idsociety.org/globalassets/idsa/education-and-training/training-and-curriculum/infectious_diseases_conference_planning_guide_2026-2027.pdf" },
  { id: "cbp-2026", title: "XLIII Congresso Brasileiro de Psiquiatria", short: "CBP 2026", area: "Psiquiatria", scope: "Brasil", city: "São Paulo, SP", mode: "Presencial", start: "2026-10-28", end: "2026-10-31", abstractDeadline: "2026-04-12", registrationDeadline: null, source: "https://www.abp.org.br/eventos" },
  { id: "neuroimuno-2026", title: "II Congresso Brasileiro de Neuroimunologia", short: "Neuroimunologia 2026", area: "Neurologia", scope: "Brasil", city: "Brasil", mode: "Presencial", start: "2026-11-26", end: "2026-11-28", abstractDeadline: null, registrationDeadline: null, source: "https://abneuro.org.br/eventos/" },
  { id: "acc-wcc-2027", title: "ACC.27 Together With World Congress of Cardiology", short: "ACC.27 + WCC", area: "Cardiologia", scope: "Internacional", city: "Houston, EUA", mode: "Presencial", start: "2027-04-10", end: "2027-04-12", abstractDeadline: "2026-10-06", registrationDeadline: "2027-02-24", source: "https://accscientificsession.acc.org/Submit-Your-Science" },
  { id: "acp-2027", title: "ACP Internal Medicine Meeting 2027", short: "ACP 2027", area: "Clínica Médica", scope: "Internacional", city: "Los Angeles, EUA", mode: "Presencial", start: "2027-04-15", end: "2027-04-17", abstractDeadline: null, registrationDeadline: null, source: "https://www.acponline.org/meetings-courses/internal-medicine-meeting" },
  { id: "apa-2027", title: "APA Annual Meeting 2027", short: "APA 2027", area: "Psiquiatria", scope: "Internacional", city: "Nova York, EUA", mode: "Presencial", start: "2027-05-01", end: "2027-05-05", abstractDeadline: null, registrationDeadline: null, source: "https://www.psychiatry.org/psychiatrists/meetings" },
  { id: "ats-2027", title: "ATS International Conference 2027", short: "ATS 2027", area: "Pneumologia", scope: "Internacional", city: "Nova Orleans, EUA", mode: "Presencial", start: "2027-05-14", end: "2027-05-19", abstractDeadline: "2026-11-04", registrationDeadline: null, source: "https://site.thoracic.org/conference" },
  { id: "asco-2027", title: "ASCO Annual Meeting 2027", short: "ASCO 2027", area: "Oncologia", scope: "Internacional", city: "Chicago, EUA", mode: "Presencial + online", start: "2027-06-04", end: "2027-06-08", abstractDeadline: "2027-01-26", registrationDeadline: null, source: "https://www.asco.org/annual-meeting/dates-know" },
  { id: "eular-2027", title: "EULAR Congress 2027", short: "EULAR 2027", area: "Reumatologia", scope: "Internacional", city: "Berlim, Alemanha", mode: "Presencial", start: "2027-06-09", end: "2027-06-12", abstractDeadline: "2027-01-15", registrationDeadline: null, source: "https://congress.eular.org/" },
  { id: "acep-2027", title: "ACEP27 Scientific Assembly", short: "ACEP27", area: "Emergência", scope: "Internacional", city: "Boston, EUA", mode: "Presencial", start: "2027-10-25", end: "2027-10-28", abstractDeadline: null, registrationDeadline: null, source: "https://www.acep.org/scientific-assembly" }
];

function dateAtNoon(value) { return value ? new Date(`${value}T12:00:00`) : null; }
function daysUntil(value) {
  const target = dateAtNoon(value);
  if (!target) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.ceil((target - today) / DAY);
}
function formatDate(value, withYear = true) {
  if (!value) return "A confirmar";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", ...(withYear ? { year: "numeric" } : {}) }).format(dateAtNoon(value)).replace(/ de /g, " ");
}
function countdownLabel(value, noun = "evento") {
  const days = daysUntil(value);
  if (days === null) return "Data não divulgada";
  if (days < 0) return noun === "prazo" ? "Prazo encerrado" : "Evento realizado";
  if (days === 0) return noun === "prazo" ? "Encerra hoje" : "Começa hoje";
  if (days === 1) return "Falta 1 dia";
  return `Faltam ${days} dias`;
}
function deadlineState(value) {
  const days = daysUntil(value);
  if (days === null) return "unknown";
  if (days < 0) return "closed";
  if (days <= 30) return "urgent";
  return "open";
}
function Deadline({ label, value }) {
  return <div className={`congress-deadline congress-deadline--${deadlineState(value)}`}><span>{label}</span><b>{formatDate(value)}</b><small>{value ? countdownLabel(value, "prazo") : "Ainda não divulgado"}</small></div>;
}

export default function CongressRadar() {
  const [area, setArea] = useState("Todas");
  const [scope, setScope] = useState("Todos");
  const [view, setView] = useState("Todos");
  const [search, setSearch] = useState("");
  const [watched, setWatched] = useSyncedStorage("medquestoes-congress-watchlist-v1", []);
  const watchedSet = useMemo(() => new Set(watched), [watched]);
  const areas = useMemo(() => [...new Set(congresses.map(item => item.area))].sort(), []);
  const visible = useMemo(() => congresses.filter(item => {
    const open = [item.abstractDeadline, item.registrationDeadline].some(date => ["open", "urgent"].includes(deadlineState(date)));
    const matchesView = view === "Todos" || (view === "Acompanhando" && watchedSet.has(item.id)) || (view === "Prazos abertos" && open);
    const haystack = `${item.title} ${item.short} ${item.area} ${item.city}`.toLowerCase();
    return daysUntil(item.end) >= 0 && (area === "Todas" || item.area === area) && (scope === "Todos" || item.scope === scope) && matchesView && haystack.includes(search.trim().toLowerCase());
  }), [area, scope, view, search, watchedSet]);
  const nextDeadline = useMemo(() => congresses.flatMap(item => [item.abstractDeadline && { date: item.abstractDeadline, type: "Submissão", title: item.short }, item.registrationDeadline && { date: item.registrationDeadline, type: "Inscrição", title: item.short }].filter(Boolean)).filter(item => daysUntil(item.date) >= 0).sort((a, b) => dateAtNoon(a.date) - dateAtNoon(b.date))[0], []);
  const toggleWatch = id => setWatched(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);

  return <section className="congress-page">
    <div className="congress-heading"><div><span className="eyebrow">CURRÍCULO MÉDICO</span><h1>Radar de congressos</h1><p>Eventos, submissões e inscrições importantes para você planejar o currículo com antecedência.</p></div><div className="congress-radar-mark" aria-hidden="true"><i /><i /><i /><span>⌁</span></div></div>
    <div className="congress-overview">
      <article><span>Próximo congresso</span><b>{visible[0]?.short || "Nenhum no filtro"}</b><small>{visible[0] ? countdownLabel(visible[0].start) : "Ajuste os filtros"}</small></article>
      <article className="congress-overview--deadline"><span>Próximo prazo confirmado</span><b>{nextDeadline?.title || "A confirmar"}</b><small>{nextDeadline ? `${nextDeadline.type} · ${formatDate(nextDeadline.date)} · ${countdownLabel(nextDeadline.date, "prazo")}` : "Novas datas serão divulgadas"}</small></article>
      <article><span>No seu radar</span><b>{watched.length}</b><small>{watched.length === 1 ? "congresso acompanhado" : "congressos acompanhados"}</small></article>
    </div>
    <div className="congress-toolbar">
      <label className="congress-search"><span>⌕</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar congresso, área ou cidade..." /></label>
      <label>Especialidade<select value={area} onChange={event => setArea(event.target.value)}><option>Todas</option>{areas.map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Abrangência<select value={scope} onChange={event => setScope(event.target.value)}><option>Todos</option><option>Brasil</option><option>Internacional</option></select></label>
      <div className="congress-view-tabs">{["Todos", "Prazos abertos", "Acompanhando"].map(item => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>{item}</button>)}</div>
    </div>
    <div className="congress-list">{visible.map(item => <article className={`congress-card ${watchedSet.has(item.id) ? "is-watched" : ""}`} key={item.id}>
      <div className="congress-card__date"><b>{formatDate(item.start, false).split(" ")[0]}</b><span>{formatDate(item.start, false).split(" ")[1]}</span><small>{dateAtNoon(item.start).getFullYear()}</small></div>
      <div className="congress-card__main"><div className="congress-card__topline"><span>{item.area}</span><span>{item.scope}</span><small>{countdownLabel(item.start)}</small></div><h2>{item.title}</h2><p><span>⌖</span>{item.city}<i>•</i>{item.mode}<i>•</i>{formatDate(item.start)} — {formatDate(item.end)}</p><div className="congress-deadlines"><Deadline label="Envio de trabalhos" value={item.abstractDeadline} /><Deadline label="Inscrição / lote" value={item.registrationDeadline} /></div></div>
      <div className="congress-card__actions"><button type="button" className={`congress-watch ${watchedSet.has(item.id) ? "active" : ""}`} onClick={() => toggleWatch(item.id)} aria-pressed={watchedSet.has(item.id)}>{watchedSet.has(item.id) ? "★ No meu radar" : "☆ Acompanhar"}</button><a href={item.source} target="_blank" rel="noreferrer">Site oficial <span>↗</span></a></div>
    </article>)}{!visible.length && <div className="congress-empty"><span>◌</span><h2>Nada por aqui ainda</h2><p>Tente outro filtro ou acompanhe congressos para montar seu radar pessoal.</p></div>}</div>
    <p className="congress-disclaimer">Datas conferidas em fontes oficiais em setembro de 2026. Prazos marcados como “a confirmar” ainda não foram publicados; confira o site oficial antes de organizar viagem ou submissão.</p>
  </section>;
}
