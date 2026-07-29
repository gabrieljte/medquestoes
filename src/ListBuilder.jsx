import { useMemo, useState } from "react";

const statusOptions = [
  { value: "all", label: "Todas as questões" },
  { value: "unanswered", label: "Somente não respondidas" },
  { value: "answered", label: "Somente já respondidas" },
  { value: "wrong", label: "Somente as que eu errei" }
];

function statusMatches(question, status, latestAttemptByQuestion) {
  const attempt = latestAttemptByQuestion.get(String(question.id));
  if (status === "unanswered") return !attempt;
  if (status === "answered") return Boolean(attempt);
  if (status === "wrong") return Boolean(attempt && !attempt.correct);
  return true;
}

function shuffled(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1));
    [result[index], result[next]] = [result[next], result[index]];
  }
  return result;
}

export default function ListBuilder({ questions, latestAttemptByQuestion, onGenerate }) {
  const [name, setName] = useState("Minha lista");
  const [status, setStatus] = useState("unanswered");
  const [expandedAreas, setExpandedAreas] = useState(new Set(["Cardiologia"]));
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState("");

  const catalog = useMemo(() => {
    const grouped = {};
    questions.forEach(question => {
      grouped[question.area] ||= {};
      grouped[question.area][question.topic] ||= [];
      grouped[question.area][question.topic].push(question);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
      .map(([area, topics]) => ({
        area,
        topics: Object.entries(topics)
          .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
          .map(([topic, items]) => ({ topic, items }))
      }));
  }, [questions]);

  const availableFor = (items) => items.filter(question =>
    statusMatches(question, status, latestAttemptByQuestion)
  ).length;

  const selectedRows = useMemo(() => Object.entries(quantities)
    .filter(([, quantity]) => Number(quantity) > 0), [quantities]);
  const totalRequested = selectedRows.reduce((sum, [, quantity]) => sum + Number(quantity), 0);

  function toggleArea(area) {
    setExpandedAreas(current => {
      const next = new Set(current);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  }

  function updateQuantity(area, topic, value, available) {
    const key = `${area}|||${topic}`;
    const parsed = Math.max(0, Math.min(available, Number(value) || 0));
    setQuantities(current => ({ ...current, [key]: parsed }));
    setError("");
  }

  function selectArea(area, topics) {
    setQuantities(current => {
      const next = { ...current };
      const hasSelected = topics.some(({ topic }) => Number(next[`${area}|||${topic}`]) > 0);
      topics.forEach(({ topic, items }) => {
        const available = availableFor(items);
        next[`${area}|||${topic}`] = hasSelected ? 0 : Math.min(5, available);
      });
      return next;
    });
  }

  function generate() {
    if (!selectedRows.length) {
      setError("Escolha pelo menos um subtema e defina a quantidade.");
      return;
    }
    const selected = [];
    const breakdown = [];
    selectedRows.forEach(([key, quantity]) => {
      const [area, topic] = key.split("|||");
      const candidates = questions.filter(question =>
        question.area === area &&
        question.topic === topic &&
        statusMatches(question, status, latestAttemptByQuestion)
      );
      const picked = shuffled(candidates).slice(0, Number(quantity));
      selected.push(...picked);
      breakdown.push({ area, topic, quantity: picked.length });
    });
    if (!selected.length) {
      setError("Não há questões disponíveis com esse filtro de histórico.");
      return;
    }
    onGenerate({
      id: crypto.randomUUID(),
      name: name.trim() || "Minha lista",
      status,
      ids: shuffled(selected).map(question => String(question.id)),
      breakdown,
      createdAt: new Date().toISOString()
    });
  }

  return (
    <section className="list-builder-page">
      <div className="list-builder-heading">
        <span className="eyebrow">SIMULADO PERSONALIZADO</span>
        <h1>Crie sua lista de questões</h1>
        <p>Combine áreas e subtemas e escolha exatamente quantas questões quer de cada um.</p>
      </div>

      <div className="list-builder-layout">
        <div className="list-catalog">
          <div className="list-config">
            <label>Nome da lista<input value={name} onChange={event => setName(event.target.value)} /></label>
            <label>Histórico<select value={status} onChange={event => { setStatus(event.target.value); setQuantities({}); }}>
              {statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select></label>
          </div>

          <div className="area-accordion">
            {catalog.map(({ area, topics }) => {
              const expanded = expandedAreas.has(area);
              const areaSelected = topics.reduce((sum, { topic }) =>
                sum + Number(quantities[`${area}|||${topic}`] || 0), 0);
              const areaAvailable = topics.reduce((sum, { items }) => sum + availableFor(items), 0);
              return <article className={`area-group ${expanded ? "expanded" : ""}`} key={area}>
                <div className="area-group-head">
                  <button type="button" onClick={() => toggleArea(area)}>
                    <span>{expanded ? "−" : "+"}</span><b>{area}</b>
                    <small>{areaAvailable} disponíveis</small>
                  </button>
                  <button type="button" className="area-quick-select" onClick={() => selectArea(area, topics)}>
                    {areaSelected ? "Limpar área" : "5 de cada"}
                  </button>
                </div>
                {expanded && <div className="topic-picker">
                  {topics.map(({ topic, items }) => {
                    const key = `${area}|||${topic}`;
                    const available = availableFor(items);
                    const quantity = quantities[key] || 0;
                    return <div className={`topic-row ${quantity ? "selected" : ""}`} key={topic}>
                      <div><b>{topic}</b><small>{available} disponível{available === 1 ? "" : "is"} para este filtro</small></div>
                      <label>Quantidade<input type="number" min="0" max={available} value={quantity}
                        disabled={!available}
                        onChange={event => updateQuantity(area, topic, event.target.value, available)} /></label>
                    </div>;
                  })}
                </div>}
              </article>;
            })}
          </div>
        </div>

        <aside className="list-summary">
          <span className="eyebrow">RESUMO DA LISTA</span>
          <h2>{name.trim() || "Minha lista"}</h2>
          <strong>{totalRequested}</strong><p>questões selecionadas</p>
          <div className="list-summary-items">
            {selectedRows.length ? selectedRows.map(([key, quantity]) => {
              const [area, topic] = key.split("|||");
              return <div key={key}><span><b>{topic}</b><small>{area}</small></span><strong>{quantity}</strong></div>;
            }) : <small>Selecione os subtemas ao lado para montar a lista.</small>}
          </div>
          {error && <div className="list-error">{error}</div>}
          <button type="button" className="primary list-generate" onClick={generate}>Gerar lista</button>
        </aside>
      </div>
    </section>
  );
}
