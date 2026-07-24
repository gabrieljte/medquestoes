"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const seed = [
  {
    id: 1, area: "Cardiologia", topic: "Doença isquêmica", difficulty: "Média",
    text: "Homem, 58 anos, apresenta dor retroesternal em aperto há 40 minutos, acompanhada de sudorese. O ECG mostra supradesnivelamento de ST em DII, DIII e aVF. Qual é a artéria mais provavelmente acometida?",
    options: ["Descendente anterior", "Coronária direita", "Circunflexa", "Tronco da coronária esquerda"],
    answer: 1, explanation: "O infarto de parede inferior (DII, DIII e aVF) é mais frequentemente causado por oclusão da artéria coronária direita."
  },
  {
    id: 2, area: "Cardiologia", topic: "Eletrocardiograma", difficulty: "Fácil",
    text: "Qual intervalo do eletrocardiograma representa a condução do impulso dos átrios até os ventrículos?",
    options: ["Intervalo PR", "Complexo QRS", "Intervalo QT", "Segmento ST"],
    answer: 0, explanation: "O intervalo PR vai do início da onda P ao início do QRS e representa a condução atrioventricular."
  },
  {
    id: 3, area: "Cardiologia", topic: "Taquiarritmias", difficulty: "Difícil",
    text: "Paciente estável apresenta taquicardia regular de QRS estreito a 180 bpm. Manobras vagais não reverteram o ritmo. Qual a próxima conduta?",
    options: ["Amiodarona IV", "Adenosina IV", "Cardioversão imediata", "Atropina IV"],
    answer: 1, explanation: "Na taquicardia supraventricular regular e estável, após falha de manobras vagais, indica-se adenosina intravenosa."
  },
  {
    id: 4, area: "Neurologia", topic: "Doenças cerebrovasculares", difficulty: "Média",
    text: "Paciente chega 90 minutos após início súbito de hemiparesia direita e afasia. TC de crânio não mostra hemorragia. Sem contraindicações. Qual tratamento deve ser considerado?",
    options: ["AAS isoladamente", "Trombólise intravenosa", "Heparina plena", "Observação por 24 horas"],
    answer: 1, explanation: "Na janela terapêutica, sem hemorragia ou contraindicações, deve-se avaliar trombólise intravenosa."
  },
  {
    id: 5, area: "Neurologia", topic: "Epilepsia", difficulty: "Fácil",
    text: "Uma crise tônico-clônica com duração superior a cinco minutos deve ser tratada inicialmente com:",
    options: ["Benzodiazepínico", "Haloperidol", "Manitol", "Levodopa"],
    answer: 0, explanation: "Benzodiazepínicos são a primeira linha para abortar o estado de mal epiléptico."
  },
  {
    id: 6, area: "Oncologia", topic: "Rastreamento", difficulty: "Média",
    text: "No rastreamento populacional, qual característica torna um teste particularmente útil?",
    options: ["Alta especificidade apenas", "Alta sensibilidade", "Alto custo", "Resultado demorado"],
    answer: 1, explanation: "Um teste de rastreamento deve ter alta sensibilidade para reduzir falsos negativos."
  },
  {
    id: 7, area: "Cirurgia Geral", topic: "Abdome agudo", difficulty: "Média",
    text: "Dor que começou periumbilical e migrou para a fossa ilíaca direita, com anorexia e náuseas, sugere principalmente:",
    options: ["Colecistite", "Pancreatite", "Apendicite aguda", "Diverticulite"],
    answer: 2, explanation: "A migração da dor para a fossa ilíaca direita é uma apresentação clássica de apendicite aguda."
  },
  {
    id: 8, area: "Medicina de Família e Comunidade", topic: "Prevenção", difficulty: "Fácil",
    text: "A vacinação é classificada como qual nível de prevenção?",
    options: ["Primordial", "Primária", "Secundária", "Terciária"],
    answer: 1, explanation: "A vacinação é proteção específica e integra a prevenção primária."
  }
];

const topicMap = {
  "Cardiologia": ["Doença isquêmica", "Eletrocardiograma", "Taquiarritmias", "Insuficiência cardíaca"],
  "Neurologia": ["Doenças cerebrovasculares", "Epilepsia", "Cefaleias", "Demências"],
  "Oncologia": ["Rastreamento", "Cuidados paliativos", "Tumores sólidos"],
  "Cirurgia Geral": ["Abdome agudo", "Trauma", "Pré e pós-operatório"],
  "Medicina de Família e Comunidade": ["Prevenção", "Atenção primária", "Saúde coletiva"]
};

const letters = ["A", "B", "C", "D", "E"];

function parseQuestions(raw, fallbackArea, fallbackTopic) {
  const blocks = raw.replace(/\r/g, "").split(/\n\s*(?:---+|\d+[.)]\s+(?=\S))/).map(s => s.trim()).filter(Boolean);
  const parsed = [];
  for (const block of blocks) {
    const lines = block.split("\n").map(s => s.trim()).filter(Boolean);
    const optStart = lines.findIndex(l => /^[A-Ea-e][).:-]\s+/.test(l));
    if (optStart < 1) continue;
    const text = lines.slice(0, optStart).join(" ").replace(/^\d+[.)]\s*/, "");
    const opts = [];
    let answer = -1;
    let explanation = "";
    for (const line of lines.slice(optStart)) {
      const m = line.match(/^([A-Ea-e])[).:-]\s+(.+)/);
      if (m) opts.push(m[2]);
      const g = line.match(/^(?:Gabarito|Resposta)\s*:\s*([A-Ea-e])/i);
      if (g) answer = letters.indexOf(g[1].toUpperCase());
      const e = line.match(/^(?:Comentário|Explicação)\s*:\s*(.+)/i);
      if (e) explanation = e[1];
    }
    const full = block.match(/(?:Gabarito|Resposta)\s*:\s*([A-Ea-e])/i);
    if (full) answer = letters.indexOf(full[1].toUpperCase());
    const fullExp = block.match(/(?:Comentário|Explicação)\s*:\s*(.+)/i);
    if (fullExp) explanation = fullExp[1].trim();
    if (text && opts.length >= 2) parsed.push({
      id: Date.now() + parsed.length, area: fallbackArea, topic: fallbackTopic,
      difficulty: "Média", text, options: opts, answer, explanation: explanation || "Comentário ainda não informado."
    });
  }
  return parsed;
}

export default function Home() {
  const [tab, setTab] = useState("questoes");
  const [questions, setQuestions] = useState(seed);
  const [area, setArea] = useState("Todas");
  const [topic, setTopic] = useState("Todos");
  const [difficulty, setDifficulty] = useState("Todas");
  const [search, setSearch] = useState("");
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [stats, setStats] = useState({ answered: 0, correct: 0 });
  const [notice, setNotice] = useState("");
  const [importArea, setImportArea] = useState("Cardiologia");
  const [importTopic, setImportTopic] = useState("Doença isquêmica");
  const [draft, setDraft] = useState({ text: "", a: "", b: "", c: "", d: "", answer: "A", explanation: "" });
  const fileRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("medquestoes-user");
    if (saved) setQuestions(q => [...q, ...JSON.parse(saved)]);
  }, []);

  const filtered = useMemo(() => questions.filter(q =>
    (area === "Todas" || q.area === area) &&
    (topic === "Todos" || q.topic === topic) &&
    (difficulty === "Todas" || q.difficulty === difficulty) &&
    (!search || q.text.toLowerCase().includes(search.toLowerCase()))
  ), [questions, area, topic, difficulty, search]);

  const q = filtered[Math.min(current, Math.max(0, filtered.length - 1))];

  function resetQuestion() { setSelected(null); setAnswered(false); }
  function changeArea(value) { setArea(value); setTopic("Todos"); setCurrent(0); resetQuestion(); }
  function answer() {
    if (selected === null || answered) return;
    setAnswered(true);
    setStats(s => ({ answered: s.answered + 1, correct: s.correct + (selected === q.answer ? 1 : 0) }));
  }
  function next() { setCurrent(i => filtered.length ? (i + 1) % filtered.length : 0); resetQuestion(); }
  function persist(items) {
    const userItems = [...questions.filter(x => x.id > 100000), ...items];
    localStorage.setItem("medquestoes-user", JSON.stringify(userItems));
    setQuestions(qs => [...qs, ...items]);
  }
  function addManual(e) {
    e.preventDefault();
    const item = { id: Date.now(), area: importArea, topic: importTopic, difficulty: "Média", text: draft.text,
      options: [draft.a, draft.b, draft.c, draft.d], answer: letters.indexOf(draft.answer), explanation: draft.explanation || "Sem comentário." };
    persist([item]); setDraft({ text: "", a: "", b: "", c: "", d: "", answer: "A", explanation: "" });
    setNotice("Questão adicionada ao banco com sucesso.");
  }
  async function importFile(file) {
    if (!file) return;
    setNotice("Lendo arquivo...");
    let raw = "";
    try {
      if (file.name.toLowerCase().endsWith(".pdf")) {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.3.93/legacy/build/pdf.worker.min.mjs`;
        const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const content = await (await pdf.getPage(i)).getTextContent();
          raw += content.items.map(x => x.str).join(" ") + "\n";
        }
      } else raw = await file.text();
      const items = parseQuestions(raw, importArea, importTopic);
      if (!items.length) throw new Error("Nenhuma questão reconhecida");
      persist(items); setNotice(`${items.length} questão(ões) importada(s) com sucesso.`);
    } catch (err) {
      setNotice("Não foi possível reconhecer questões automaticamente. Confira o formato do arquivo.");
    }
  }

  return (
    <main>
      <header>
        <div className="brand"><span className="logo">✚</span><div><b>MedQuestões</b><small>Banco de questões médicas</small></div></div>
        <nav>
          <button className={tab === "questoes" ? "active" : ""} onClick={() => setTab("questoes")}>Questões</button>
          <button className={tab === "adicionar" ? "active" : ""} onClick={() => setTab("adicionar")}>Adicionar</button>
        </nav>
        <div className="avatar">AM</div>
      </header>

      {tab === "questoes" ? (
        <>
          <section className="hero">
            <div><span className="eyebrow">PLATAFORMA DE ESTUDOS</span><h1>Estude de forma <em>mais inteligente.</em></h1><p>Filtre, resolva e acompanhe seu desempenho em questões médicas.</p></div>
            <div className="hero-stats"><div><b>{questions.length}</b><span>questões no banco</span></div><div><b>{stats.correct}</b><span>acertos</span></div><div><b>{stats.answered ? Math.round(stats.correct / stats.answered * 100) : 0}%</b><span>aproveitamento</span></div></div>
          </section>
          <section className="workspace">
            <aside className="filters">
              <div className="side-title"><b>Filtros</b><button onClick={() => {setArea("Todas");setTopic("Todos");setDifficulty("Todas");setSearch("");}}>Limpar</button></div>
              <label>Buscar questão<input value={search} onChange={e => {setSearch(e.target.value);setCurrent(0);}} placeholder="Digite uma palavra-chave..." /></label>
              <label>Área do conhecimento<select value={area} onChange={e => changeArea(e.target.value)}><option>Todas</option>{Object.keys(topicMap).map(x => <option key={x}>{x}</option>)}</select></label>
              <label>Subtema<select value={topic} onChange={e => {setTopic(e.target.value);setCurrent(0);resetQuestion();}}><option>Todos</option>{(area === "Todas" ? [...new Set(Object.values(topicMap).flat())] : topicMap[area]).map(x => <option key={x}>{x}</option>)}</select></label>
              <label>Dificuldade<select value={difficulty} onChange={e => setDifficulty(e.target.value)}><option>Todas</option><option>Fácil</option><option>Média</option><option>Difícil</option></select></label>
              <div className="result-count"><b>{filtered.length}</b><span>questões encontradas</span></div>
            </aside>
            <section className="question-area">
              {q ? <article className="question-card">
                <div className="question-meta"><span>{q.area}</span><span>{q.topic}</span><span className={`difficulty ${q.difficulty}`}>{q.difficulty}</span><small>Questão {current + 1} de {filtered.length}</small></div>
                <h2>{q.text}</h2>
                <div className="options">{q.options.map((opt, i) => {
                  let state = selected === i ? "selected" : "";
                  if (answered && i === q.answer) state = "correct";
                  if (answered && selected === i && i !== q.answer) state = "wrong";
                  return <button key={i} className={state} onClick={() => !answered && setSelected(i)}><b>{letters[i]}</b><span>{opt}</span>{answered && i === q.answer && <i>✓</i>}</button>;
                })}</div>
                {answered && <div className={`feedback ${selected === q.answer ? "good" : "bad"}`}><b>{selected === q.answer ? "Resposta correta!" : `Resposta incorreta. Alternativa ${letters[q.answer]}.`}</b><p>{q.explanation}</p></div>}
                <div className="actions"><button className="ghost" onClick={() => setNotice("Questão sinalizada para revisão.")}>⚑ Marcar para revisar</button><div><button className="next" onClick={next}>Pular</button><button className="primary" disabled={selected === null} onClick={answered ? next : answer}>{answered ? "Próxima questão →" : "Confirmar resposta"}</button></div></div>
              </article> : <div className="empty"><b>Nenhuma questão encontrada</b><p>Ajuste os filtros ou adicione novas questões ao banco.</p></div>}
            </section>
          </section>
        </>
      ) : (
        <section className="add-page">
          <div className="page-heading"><span className="eyebrow">EXPANDA SEU BANCO</span><h1>Adicionar questões</h1><p>Cadastre manualmente ou importe um arquivo com várias questões.</p></div>
          {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
          <div className="add-grid">
            <div className="panel import-panel">
              <div className="panel-head"><span>↑</span><div><h2>Importar arquivo</h2><p>Aceita arquivos TXT e PDF</p></div></div>
              <div className="row"><label>Área<select value={importArea} onChange={e => {setImportArea(e.target.value);setImportTopic(topicMap[e.target.value][0]);}}>{Object.keys(topicMap).map(x => <option key={x}>{x}</option>)}</select></label><label>Subtema<select value={importTopic} onChange={e => setImportTopic(e.target.value)}>{topicMap[importArea].map(x => <option key={x}>{x}</option>)}</select></label></div>
              <div className="dropzone" onClick={() => fileRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => {e.preventDefault();importFile(e.dataTransfer.files[0]);}}>
                <span className="file-icon">⇧</span><b>Arraste um arquivo aqui</b><p>ou clique para selecionar</p><small>TXT ou PDF • processamento no seu navegador</small>
                <input ref={fileRef} hidden type="file" accept=".txt,.pdf,text/plain,application/pdf" onChange={e => importFile(e.target.files[0])} />
              </div>
              <div className="format">
                <b>Formato recomendado para TXT</b>
                <pre>{`1. Enunciado da questão?\nA) Alternativa A\nB) Alternativa B\nC) Alternativa C\nD) Alternativa D\nGabarito: B\nExplicação: Comentário opcional\n---`}</pre>
              </div>
            </div>
            <form className="panel manual-panel" onSubmit={addManual}>
              <div className="panel-head"><span>✎</span><div><h2>Cadastro manual</h2><p>Adicione uma questão por vez</p></div></div>
              <label>Enunciado<textarea required value={draft.text} onChange={e => setDraft({...draft,text:e.target.value})} placeholder="Digite o enunciado da questão..." /></label>
              <div className="manual-options">{["a","b","c","d"].map((key,i) => <label key={key}><span>{letters[i]}</span><input required value={draft[key]} onChange={e => setDraft({...draft,[key]:e.target.value})} placeholder={`Alternativa ${letters[i]}`} /></label>)}</div>
              <div className="row"><label>Gabarito<select value={draft.answer} onChange={e => setDraft({...draft,answer:e.target.value})}>{letters.slice(0,4).map(x => <option key={x}>{x}</option>)}</select></label><label>Área atual<input readOnly value={`${importArea} • ${importTopic}`} /></label></div>
              <label>Comentário da resposta<textarea value={draft.explanation} onChange={e => setDraft({...draft,explanation:e.target.value})} placeholder="Explique por que a alternativa está correta..." /></label>
              <button className="primary submit">Adicionar ao banco</button>
            </form>
          </div>
        </section>
      )}
      {notice && tab === "questoes" && <div className="toast">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      <footer>MedQuestões • Ferramenta de apoio aos estudos — conteúdo não substitui orientação clínica.</footer>
    </main>
  );
}
