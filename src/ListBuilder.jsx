import { useMemo, useState } from "react";

const SAVED_LISTS_KEY = "medquestoes-saved-lists";
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

function loadSavedLists() {
  try { return JSON.parse(localStorage.getItem(SAVED_LISTS_KEY) || "[]"); }
  catch { return []; }
}

export default function ListBuilder({ questions, latestAttemptByQuestion, onGenerate }) {
  const [name, setName] = useState("Minha lista");
  const [status, setStatus] = useState("unanswered");
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [areaSearch, setAreaSearch] = useState("");
  const [savedLists, setSavedLists] = useState(loadSavedLists);
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

  const normalizedSearch = areaSearch.trim().toLocaleLowerCase("pt-BR");
  const searchResults = useMemo(() => {
    if (!normalizedSearch) return catalog;
    return catalog
      .map(group => ({
        ...group,
        areaMatches: group.area.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
        topics: group.topics.filter(({ topic }) =>
          topic.toLocaleLowerCase("pt-BR").includes(normalizedSearch)
        )
      }))
      .filter(group => group.areaMatches || group.topics.length);
  }, [catalog, normalizedSearch]);

  const availableFor = (items) => items.filter(question =>
    statusMatches(question, status, latestAttemptByQuestion)
  ).length;

  const selectedRows = useMemo(() => Object.entries(quantities)
    .filter(([, quantity]) => Number(quantity) > 0), [quantities]);
  const totalRequested = selectedRows.reduce((sum, [, quantity]) => sum + Number(quantity), 0);
  const selectedCatalog = selectedAreas
    .map(area => catalog.find(group => group.area === area))
    .filter(Boolean);

  function persistLists(next) {
    setSavedLists(next);
    localStorage.setItem(SAVED_LISTS_KEY, JSON.stringify(next));
  }

  function addArea(area, topic) {
    setSelectedAreas(current => current.includes(area) ? current : [...current, area]);
    if (topic) {
      const group = catalog.find(item => item.area === area);
      const row = group?.topics.find(item => item.topic === topic);
      const available = row ? availableFor(row.items) : 0;
      setQuantities(current => ({
        ...current,
        [`${area}|||${topic}`]: Math.max(Number(current[`${area}|||${topic}`] || 0), Math.min(5, available))
      }));
    }
    setPickerOpen(false);
    setAreaSearch("");
    setError("");
  }

  function removeArea(area) {
    setSelectedAreas(current => current.filter(item => item !== area));
    setQuantities(current => Object.fromEntries(
      Object.entries(current).filter(([key]) => !key.startsWith(`${area}|||`))
    ));
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
      setError("Adicione uma especialidade e escolha pelo menos um subtema.");
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
    const list = {
      id: crypto.randomUUID(),
      name: name.trim() || "Minha lista",
      status,
      ids: shuffled(selected).map(question => String(question.id)),
      breakdown,
      createdAt: new Date().toISOString()
    };
    persistLists([list, ...savedLists]);
    onGenerate(list);
  }

  function deleteList(event, listId) {
    event.stopPropagation();
    persistLists(savedLists.filter(list => list.id !== listId));
  }

  return (
    <section className="list-builder-page">
      <div className="list-builder-heading">
        <span className="eyebrow">SIMULADO PERSONALIZADO</span>
        <h1>Crie sua lista de questões</h1>
        <p>Pesquise especialidades, escolha os subtemas e defina a quantidade de cada um.</p>
      </div>

      <div className="list-builder-layout has-created-lists">
        <aside className="created-lists">
          <div className="created-lists-head"><span className="eyebrow">SUAS LISTAS</span><h2>Listas criadas</h2></div>
          <div className="created-lists-body">
            {savedLists.length ? savedLists.map(list => (
              <button type="button" className="saved-list-card" key={list.id} onClick={() => onGenerate(list)}>
                <span><b>{list.name}</b><small>{list.ids.length} questões · {new Date(list.createdAt).toLocaleDateString("pt-BR")}</small></span>
                <i onClick={event => deleteList(event, list.id)} aria-label={`Excluir ${list.name}`}>×</i>
              </button>
            )) : <div className="created-lists-empty"><span>☷</span><p>As listas que você criar aparecerão aqui.</p></div>}
          </div>
        </aside>

        <div className="list-catalog">
          <div className="list-config">
            <label>Nome da lista<input value={name} onChange={event => setName(event.target.value)} /></label>
            <label>Histórico<select value={status} onChange={event => { setStatus(event.target.value); setQuantities({}); }}>
              {statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select></label>
          </div>

          <div className="specialty-picker-wrap">
            <button type="button" className="add-specialty-button" onClick={() => setPickerOpen(open => !open)}>
              <span>+</span><div><b>Adicionar especialidade</b><small>Pesquise uma área ou subtema</small></div>
            </button>
            {pickerOpen && <div className="specialty-picker">
              <div className="specialty-search"><span>⌕</span><input autoFocus value={areaSearch}
                onChange={event => setAreaSearch(event.target.value)}
                placeholder="Ex.: Cardiologia ou doença isquêmica" />
                <button type="button" onClick={() => setPickerOpen(false)}>×</button>
              </div>
              <div className="specialty-results">
                {searchResults.length ? searchResults.map(group => (
                  <div className="specialty-result-group" key={group.area}>
                    <button type="button" className="specialty-area-result" onClick={() => addArea(group.area)}>
                      <b>{group.area}</b><small>Adicionar especialidade</small>
                    </button>
                    {group.topics.map(({ topic, items }) => (
                      <button type="button" className="specialty-topic-result" key={topic} onClick={() => addArea(group.area, topic)}>
                        <span>—</span><div><b>{topic}</b><small>{group.area} · {availableFor(items)} disponíveis</small></div>
                      </button>
                    ))}
                  </div>
                )) : <div className="no-specialty-result">Nenhuma especialidade ou subtema encontrado.</div>}
              </div>
            </div>}
          </div>

          <div className="selected-specialties">
            {selectedCatalog.length ? selectedCatalog.map(({ area, topics }) => {
              const areaSelected = topics.reduce((sum, { topic }) =>
                sum + Number(quantities[`${area}|||${topic}`] || 0), 0);
              return <article className="area-group expanded" key={area}>
                <div className="area-group-head">
                  <div className="selected-area-title"><span>−</span><b>{area}</b><small>{areaSelected} selecionadas</small></div>
                  <button type="button" className="area-quick-select" onClick={() => selectArea(area, topics)}>
                    {areaSelected ? "Limpar área" : "5 de cada"}
                  </button>
                  <button type="button" className="remove-area-button" onClick={() => removeArea(area)}>×</button>
                </div>
                <div className="topic-picker">
                  {topics.map(({ topic, items }) => {
                    const key = `${area}|||${topic}`;
                    const available = availableFor(items);
                    const quantity = quantities[key] || 0;
                    return <div className={`topic-row ${quantity ? "selected" : ""}`} key={topic}>
                      <div><b><span>—</span> {topic}</b><small>Subtema de {area} · {available} disponível{available === 1 ? "" : "is"}</small></div>
                      <label>Quantidade<input type="number" min="0" max={available} value={quantity}
                        disabled={!available}
                        onChange={event => updateQuantity(area, topic, event.target.value, available)} /></label>
                    </div>;
                  })}
                </div>
              </article>;
            }) : <div className="no-selected-specialties"><span>+</span><b>Nenhuma especialidade adicionada</b><p>Use o botão acima para pesquisar e adicionar somente o que deseja estudar.</p></div>}
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
            }) : <small>Adicione especialidades e selecione os subtemas para montar a lista.</small>}
          </div>
          {error && <div className="list-error">{error}</div>}
          <button type="button" className="primary list-generate" onClick={generate}>Gerar e salvar lista</button>
        </aside>
      </div>
    </section>
  );
}
