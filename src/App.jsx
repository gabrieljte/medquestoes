"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadAttempts, loadQuestions, saveAttempt, saveAttempts, saveQuestions } from "./db.js";
import AuthScreen from "./AuthScreen.jsx";
import Dashboard from "./Dashboard.jsx";
import ListBuilder from "./ListBuilder.jsx";
import Library from "./Library.jsx";
import ClinicalCases from "./ClinicalCases.jsx";
import Calendar from "./Calendar.jsx";
import HomeDashboard from "./HomeDashboard.jsx";
import StudyOrganizer from "./StudyOrganizer.jsx";
import { cloudConfigured, supabase } from "./supabase.js";
import { saveCloudAttempt, saveCloudQuestions, syncAttempts, syncQuestions } from "./cloud.js";
import { omedQuestions } from "./omedQuestions.js";

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
  },
  ...omedQuestions
];

const topicMap = {
  "Cardiologia": ["Doença isquêmica", "Eletrocardiograma", "Taquiarritmias", "Insuficiência cardíaca"],
  "Neurologia": ["Doenças cerebrovasculares", "Epilepsia", "Cefaleias", "Demências"],
  "Oncologia": ["Rastreamento", "Cuidados paliativos", "Tumores sólidos"],
  "Cirurgia Geral": ["Abdome agudo", "Trauma", "Pré e pós-operatório"],
  "Medicina de Família e Comunidade": ["Prevenção", "Atenção primária", "Saúde coletiva"],
  "Pneumologia": [],
  "Pediatria": [],
  "Infectologia": [],
  "Ginecologia e Obstetrícia": [],
  "Psiquiatria": [],
  "Reumatologia": [],
  "Endocrinologia": [],
  "Nefrologia": [],
  "Hematologia": []
};

for (const question of omedQuestions) {
  if (!topicMap[question.area]) topicMap[question.area] = [];
  if (!topicMap[question.area].includes(question.topic)) topicMap[question.area].push(question.topic);
}

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
      difficulty: "Média", tag: "Importada", text, options: opts, answer, explanation: explanation || "Comentário ainda não informado."
    });
  }
  return parsed;
}

export default function Home() {
  const [tab, setTab] = useState("inicio");
  const [questions, setQuestions] = useState(seed);
  const [area, setArea] = useState("Todas");
  const [topic, setTopic] = useState("Todos");
  const [difficulty, setDifficulty] = useState("Todas");
  const [tag, setTag] = useState("Todas");
  const [answerStatus, setAnswerStatus] = useState("Não respondidas");
  const [activeList, setActiveList] = useState(() => {
    try { return JSON.parse(localStorage.getItem("medquestoes-active-list") || "null"); }
    catch { return null; }
  });
  const [listExitOpen, setListExitOpen] = useState(false);
  const [simulationNow, setSimulationNow] = useState(Date.now());
  const [reviewedQuestionId, setReviewedQuestionId] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [responses, setResponses] = useState({});
  const [stats, setStats] = useState({ answered: 0, correct: 0 });
  const [notice, setNotice] = useState("");
  const [databaseReady, setDatabaseReady] = useState(false);
  const [attempts, setAttempts] = useState([]);
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem("medquestoes-sidebar-collapsed") === "true"
  );
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("medquestoes-theme");
    if (savedTheme === "dark" || savedTheme === "light") return savedTheme;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [importArea, setImportArea] = useState("Cardiologia");
  const [importTopic, setImportTopic] = useState("Doença isquêmica");
  const [draft, setDraft] = useState({ text: "", a: "", b: "", c: "", d: "", answer: "A", explanation: "" });
  const fileRef = useRef(null);

  useEffect(() => {
    Promise.all([loadQuestions(seed), loadAttempts()])
      .then(([saved, savedAttempts]) => {
        setQuestions(saved);
        setAttempts(savedAttempts);
        setStats({ answered: savedAttempts.length, correct: savedAttempts.filter(a => a.correct).length });
        setDatabaseReady(true);
      })
      .catch(() => setNotice("Não foi possível abrir o banco de dados local."));
  }, []);

  useEffect(() => {
    localStorage.setItem("medquestoes-theme", theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
      if (nextSession) setOfflineMode(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id || !databaseReady) return;
    let active = true;
    setSyncing(true);
    setSyncError("");
    Promise.all([
      syncQuestions(questions, session.user.id),
      syncAttempts(attempts, session.user.id)
    ]).then(async ([cloudQuestions, cloudAttempts]) => {
      if (!active) return;
      await saveQuestions(cloudQuestions);
      await saveAttempts(cloudAttempts);
      setQuestions(cloudQuestions);
      setAttempts(cloudAttempts);
      setStats({ answered: cloudAttempts.length, correct: cloudAttempts.filter(a => a.correct).length });
    }).catch((error) => {
      console.error("Falha na sincronização:", error);
      if (active) setSyncError(navigator.onLine ? "Falha ao sincronizar" : "Sem internet");
    }).finally(() => {
      if (active) setSyncing(false);
    });
    return () => { active = false; };
  }, [session?.user?.id, databaseReady]);

  const latestAttemptByQuestion = useMemo(() => {
    const latest = new Map();
    [...attempts]
      .sort((a, b) => new Date(a.answeredAt) - new Date(b.answeredAt))
      .forEach(attempt => latest.set(String(attempt.questionId), attempt));
    return latest;
  }, [attempts]);
  const attemptCountByQuestion = useMemo(() => {
    const counts = new Map();
    attempts.forEach(attempt => {
      const id = String(attempt.questionId);
      counts.set(id, (counts.get(id) || 0) + 1);
    });
    return counts;
  }, [attempts]);
  const answeredIds = useMemo(() => new Set(latestAttemptByQuestion.keys()), [latestAttemptByQuestion]);
  const answeredCount = questions.filter(question => answeredIds.has(String(question.id))).length;
  const studyProgress = questions.length ? Math.round(answeredCount / questions.length * 100) : 0;

  const filtered = useMemo(() => {
    if (activeList?.ids?.length) {
      const byId = new Map(questions.map(question => [String(question.id), question]));
      return activeList.ids.map(id => byId.get(String(id))).filter(Boolean);
    }
    return questions.filter(q => {
    const attempt = latestAttemptByQuestion.get(String(q.id));
    const matchesStatus =
      answerStatus === "Todas" ||
      (answerStatus === "Não respondidas" && (!attempt || String(q.id) === reviewedQuestionId)) ||
      (answerStatus === "Já respondidas" && Boolean(attempt)) ||
      (answerStatus === "Respondidas incorretamente" && attempt && !attempt.correct);
    return (area === "Todas" || q.area === area) &&
      (topic === "Todos" || q.topic === topic) &&
      (difficulty === "Todas" || q.difficulty === difficulty) &&
      (tag === "Todas" || (q.tag || "Banco geral") === tag) &&
      matchesStatus &&
      (!search || q.text.toLowerCase().includes(search.toLowerCase()));
    });
  }, [questions, area, topic, difficulty, tag, answerStatus, search, latestAttemptByQuestion, reviewedQuestionId, activeList]);

  const activeListAttemptByQuestion = useMemo(() => {
    const latest = new Map();
    if (!activeList?.ids?.length) return latest;
    const ids = new Set(activeList.ids.map(String));
    const startedAt = new Date(activeList.startedAt || activeList.createdAt || 0).getTime();
    [...attempts]
      .filter(attempt =>
        ids.has(String(attempt.questionId)) &&
        new Date(attempt.answeredAt).getTime() >= startedAt
      )
      .sort((a, b) => new Date(a.answeredAt) - new Date(b.answeredAt))
      .forEach(attempt => latest.set(String(attempt.questionId), attempt));
    return latest;
  }, [attempts, activeList]);

  const activeListStats = useMemo(() => {
    const sessionAttempts = [...activeListAttemptByQuestion.values()]
      .sort((a, b) => new Date(a.answeredAt) - new Date(b.answeredAt));
    const answered = sessionAttempts.length;
    const correct = sessionAttempts.filter(attempt => attempt.correct).length;
    const wrong = answered - correct;
    let runningStreak = 0;
    let bestStreak = 0;
    const breakdownMap = new Map();
    sessionAttempts.forEach(attempt => {
      if (attempt.correct) {
        runningStreak += 1;
        bestStreak = Math.max(bestStreak, runningStreak);
      } else {
        runningStreak = 0;
      }
      const key = `${attempt.area}|||${attempt.topic}`;
      const current = breakdownMap.get(key) || {
        area: attempt.area,
        topic: attempt.topic,
        answered: 0,
        correct: 0
      };
      current.answered += 1;
      current.correct += attempt.correct ? 1 : 0;
      breakdownMap.set(key, current);
    });
    const total = activeList?.ids?.length || 0;
    return {
      total,
      answered,
      correct,
      wrong,
      unanswered: Math.max(0, total - answered),
      bestStreak,
      percentage: answered ? Math.round((correct / answered) * 100) : 0,
      progress: total ? Math.min(100, Math.round((answered / total) * 100)) : 0,
      completed: Boolean(total && answered >= total),
      breakdown: [...breakdownMap.values()]
    };
  }, [activeList, activeListAttemptByQuestion]);

  const isSimulation = activeList?.kind === "simulado";
  const simulationSecondsLeft = isSimulation && activeList?.endsAt
    ? Math.max(0, Math.ceil((new Date(activeList.endsAt).getTime() - simulationNow) / 1000))
    : 0;
  const sessionFinished = Boolean(
    activeList && (activeListStats.completed || (isSimulation && simulationSecondsLeft <= 0))
  );
  const simulationClock = `${String(Math.floor(simulationSecondsLeft / 60)).padStart(2, "0")}:${String(simulationSecondsLeft % 60).padStart(2, "0")}`;

  useEffect(() => {
    if (!isSimulation || sessionFinished) return undefined;
    const timer = window.setInterval(() => setSimulationNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isSimulation, sessionFinished, activeList?.endsAt]);

  const gameStats = useMemo(() => {
    const ordered = [...attempts].sort((a, b) => new Date(a.answeredAt) - new Date(b.answeredAt));
    let currentStreak = 0;
    let bestStreak = 0;
    let running = 0;
    let correct = 0;
    ordered.forEach(item => {
      if (item.correct) {
        correct += 1;
        running += 1;
        bestStreak = Math.max(bestStreak, running);
      } else {
        running = 0;
      }
    });
    for (let index = ordered.length - 1; index >= 0 && ordered[index]?.correct; index -= 1) currentStreak += 1;
    const xp = correct * 10 + (ordered.length - correct) * 3 + bestStreak * 2;
    const stage = currentStreak >= 12 ? 4 : currentStreak >= 8 ? 3 : currentStreak >= 5 ? 2 : currentStreak >= 3 ? 1 : 0;
    return {
      currentStreak, bestStreak, correct, xp,
      level: Math.floor(xp / 100) + 1,
      progress: xp % 100,
      stage
    };
  }, [attempts]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleQuestions = filtered.slice((page - 1) * pageSize, page * pageSize);
  const pageItems = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
    const selected = [...new Set([1, totalPages, page - 1, page, page + 1])]
      .filter(value => value >= 1 && value <= totalPages)
      .sort((a, b) => a - b);
    const items = [];
    selected.forEach((value, index) => {
      if (index && value - selected[index - 1] > 1) items.push(`gap-${value}`);
      items.push(value);
    });
    return items;
  }, [page, totalPages]);

  useEffect(() => {
    setHasSearched(false);
    setPage(1);
    setReviewedQuestionId(null);
  }, [area, topic, difficulty, tag, answerStatus, search]);

  useEffect(() => {
    if (activeList?.ids?.length) setHasSearched(true);
  }, [activeList]);

  function changeArea(value) { setArea(value); setTopic("Todos"); }
  function retryQuestion(questionId) {
    setResponses(current => ({
      ...current,
      [questionId]: { selected: null, answered: false, retrying: true }
    }));
    setNotice("Nova tentativa iniciada. A resposta anterior continuará no histórico.");
  }
  function clearFilters() {
    setActiveList(null);
    localStorage.removeItem("medquestoes-active-list");
    setArea("Todas"); setTopic("Todos"); setDifficulty("Todas"); setTag("Todas"); setAnswerStatus("Não respondidas"); setSearch("");
    setHasSearched(false); setPage(1);
  }
  function applyFilters() {
    setPage(1);
    setHasSearched(true);
  }
  function goToPage(nextPage) {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function startCustomList(list) {
    const now = Date.now();
    const sessionList = {
      ...list,
      startedAt: new Date(now).toISOString(),
      endsAt: list.kind === "simulado"
        ? new Date(now + Math.max(5, Number(list.durationMinutes) || 60) * 60000).toISOString()
        : null
    };
    setListExitOpen(false);
    setSimulationNow(now);
    setActiveList(sessionList);
    localStorage.setItem("medquestoes-active-list", JSON.stringify(sessionList));
    setResponses(current => {
      const next = { ...current };
      sessionList.ids.forEach(id => {
        next[id] = { selected: null, answered: false, retrying: true };
      });
      return next;
    });
    setPage(1);
    setHasSearched(true);
    setTab("questoes");
    setNotice(`Lista “${list.name}” criada com ${list.ids.length} questões.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function closeCustomList() {
    setListExitOpen(false);
    setActiveList(null);
    localStorage.removeItem("medquestoes-active-list");
    setHasSearched(false);
    setPage(1);
    setTab("inicio");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function confirmPauseCustomList() {
    setListExitOpen(true);
  }
  function pauseCustomList() {
    setListExitOpen(false);
    setTab("inicio");
    setNotice(`${activeList.kind === "simulado" ? "Simulado" : "Lista"} “${activeList.name}” pausado${activeList.kind === "simulado" ? "" : "a"}. Seu progresso foi mantido.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function finishSimulation() {
    if (!isSimulation) return;
    const finished = { ...activeList, endsAt: new Date().toISOString() };
    setActiveList(finished);
    localStorage.setItem("medquestoes-active-list", JSON.stringify(finished));
    setSimulationNow(Date.now() + 1000);
    setListExitOpen(false);
    setNotice("Simulado finalizado. O gabarito e o resumo já estão disponíveis.");
  }
  function toggleSidebar() {
    setSidebarCollapsed(current => {
      const next = !current;
      localStorage.setItem("medquestoes-sidebar-collapsed", String(next));
      return next;
    });
  }
  function selectOption(questionId, option) {
    if (sessionFinished) return;
    const localResponse = responses[questionId];
    if (localResponse?.answered) return;
    if (
      latestAttemptByQuestion.has(String(questionId)) &&
      !localResponse?.retrying &&
      !(activeList && !activeListAttemptByQuestion.has(String(questionId)))
    ) return;
    setResponses(r => ({ ...r, [questionId]: { ...r[questionId], selected: option, answered: false } }));
  }
  async function answer(question) {
    if (sessionFinished) return;
    const response = responses[question.id];
    if (response?.selected == null || response.answered) return;
    const attempt = {
      id: crypto.randomUUID(),
      questionId: String(question.id),
      area: question.area,
      topic: question.topic,
      selectedAnswer: response.selected,
      correct: response.selected === question.answer,
      answeredAt: new Date().toISOString()
    };
    setResponses(r => ({ ...r, [question.id]: { ...response, answered: true, retrying: false } }));
    setReviewedQuestionId(String(question.id));
    setAttempts(items => [...items, attempt]);
    setStats(s => ({ answered: s.answered + 1, correct: s.correct + (attempt.correct ? 1 : 0) }));
    const nextStreak = attempt.correct ? gameStats.currentStreak + 1 : 0;
    if (attempt.correct && [3, 5, 8, 12].includes(nextStreak)) {
      setNotice(`🔥 Sequência de ${nextStreak} acertos! O fogo está aumentando.`);
    } else if (!attempt.correct && gameStats.currentStreak >= 3) {
      setNotice(`A sequência de ${gameStats.currentStreak} terminou. Bora acender o fogo de novo!`);
    }
    await saveAttempt(attempt);
    if (session?.user?.id) {
      saveCloudAttempt(attempt, session.user.id).catch(() => setNotice("Resposta salva localmente e aguardando sincronização."));
    }
  }
  async function persist(items) {
    await saveQuestions(items);
    setQuestions(qs => [...qs, ...items]);
    if (session?.user?.id) {
      saveCloudQuestions(items, session.user.id).catch(() => setNotice("Questões salvas localmente e aguardando sincronização."));
    }
  }
  async function addManual(e) {
    e.preventDefault();
    const item = { id: Date.now(), area: importArea, topic: importTopic, difficulty: "Média", text: draft.text,
      options: [draft.a, draft.b, draft.c, draft.d], answer: letters.indexOf(draft.answer), explanation: draft.explanation || "Sem comentário." };
    await persist([item]); setDraft({ text: "", a: "", b: "", c: "", d: "", answer: "A", explanation: "" });
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
      await persist(items); setNotice(`${items.length} questão(ões) importada(s) com sucesso.`);
    } catch (err) {
      setNotice("Não foi possível reconhecer questões automaticamente. Confira o formato do arquivo.");
    }
  }

  if (!authReady) return <main className="loading-page">Abrindo MedQuestões...</main>;
  if (!session && !offlineMode) return <AuthScreen onOffline={() => setOfflineMode(true)} />;

  return (
    <main className={`app-shell theme-${theme} heat-${gameStats.stage} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="nav-sidebar">
        <button className="sidebar-toggle" type="button" onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? "Abrir menu lateral" : "Fechar menu lateral"}
          title={sidebarCollapsed ? "Abrir menu" : "Recolher menu"}>
          {sidebarCollapsed ? "›" : "‹"}
        </button>
        <div className="brand"><span className="logo">✚</span><div><b>MedQuestões</b><small>Banco de questões médicas</small></div></div>
        <nav aria-label="Navegação principal">
          <button title="Início" className={tab === "inicio" ? "active" : ""} onClick={() => setTab("inicio")}><span>🏠</span><b>Início</b></button>
          <button title="Questões" className={tab === "questoes" ? "active" : ""} onClick={() => setTab("questoes")}><span>📝</span><b>Questões</b></button>
          <button title="Listas" className={tab === "listas" ? "active" : ""} onClick={() => setTab("listas")}><span>📋</span><b>Listas</b></button>
          <button title="Simulados" className={tab === "simulados" ? "active" : ""} onClick={() => setTab("simulados")}><span>⏱️</span><b>Simulados</b></button>
          <button title="Biblioteca" className={tab === "biblioteca" ? "active" : ""} onClick={() => setTab("biblioteca")}><span>📚</span><b>Biblioteca</b></button>
          <button title="Casos clínicos" className={tab === "casos" ? "active" : ""} onClick={() => setTab("casos")}><span>🩺</span><b>Casos clínicos</b></button>
          <button title="Organização" className={tab === "organizacao" ? "active" : ""} onClick={() => setTab("organizacao")}><span>🗂️</span><b>Organização</b></button>
          <button title="Calendário" className={tab === "calendario" ? "active" : ""} onClick={() => setTab("calendario")}><span>📅</span><b>Calendário</b></button>
          <button title="Desempenho" className={tab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}><span>📊</span><b>Desempenho</b></button>
          <button title="Adicionar" className={tab === "adicionar" ? "active" : ""} onClick={() => setTab("adicionar")}><span>➕</span><b>Adicionar</b></button>
        </nav>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme(current => current === "light" ? "dark" : "light")}
          aria-label={theme === "light" ? "Ativar tema escuro" : "Ativar tema claro"}
          title={theme === "light" ? "Ativar tema escuro" : "Ativar tema claro"}
        >
          <span>{theme === "light" ? "☀️" : "🌙"}</span>
          <b>{theme === "light" ? "Tema claro" : "Tema escuro"}</b>
        </button>
        <div className="sidebar-bottom">
          <div className={`game-hud ${gameStats.currentStreak >= 3 ? "on-fire" : ""}`}>
            <div className="streak-counter"><span>🔥</span><b>{gameStats.currentStreak}</b><small>sequência</small></div>
            <div className="level-box"><span>Nível {gameStats.level}</span><div><i style={{ width: `${gameStats.progress}%` }} /></div><small>{gameStats.progress}/100 XP</small></div>
          </div>
          <div className="account-box">
            <span className={`db-status ${databaseReady && !syncError ? "online" : ""}`} title={syncError}>{syncing ? "↻ Sincronizando" : syncError ? `● ${syncError}` : session ? "● Sincronizado" : "● Modo offline"}</span>
            <small>{session?.user?.email || "Neste dispositivo"}</small>
            <button onClick={() => session ? supabase.auth.signOut() : setOfflineMode(false)}>{session ? "Sair" : "Entrar"}</button>
          </div>
        </div>
      </aside>

      <div className="app-content">
      {tab === "inicio" ? (
        <HomeDashboard
          questionCount={questions.length}
          answeredCount={answeredCount}
          attempts={attempts}
          gameStats={gameStats}
          activeList={activeList}
          activeListStats={activeListStats}
          isSimulation={isSimulation}
          simulationClock={simulationClock}
          onNavigate={setTab}
          onResume={() => setTab("questoes")}
        />
      ) : tab === "questoes" ? (
        <>
          <section className={`${hasSearched ? "workspace" : "filter-landing"} ${activeList ? "workspace--active-list" : ""}`}>
            {!activeList && <aside className="filters">
              <div className="side-title"><b>Encontre suas questões</b><button onClick={clearFilters}>Limpar</button></div>
              {!hasSearched && <div className="filter-intro"><span className="eyebrow">BANCO MÉDICO</span><h1>O que você quer estudar hoje?</h1><p>Escolha os filtros e carregue somente as questões que deseja resolver.</p></div>}
              <label>Buscar questão<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Digite uma palavra-chave..." /></label>
              <label>Área do conhecimento<select value={area} onChange={e => changeArea(e.target.value)}><option>Todas</option>{Object.keys(topicMap).map(x => <option key={x}>{x}</option>)}</select></label>
              <label>Subtema<select value={topic} onChange={e => setTopic(e.target.value)}><option>Todos</option>{(area === "Todas" ? [...new Set(Object.values(topicMap).flat())] : topicMap[area]).map(x => <option key={x}>{x}</option>)}</select></label>
              <label>Dificuldade<select value={difficulty} onChange={e => setDifficulty(e.target.value)}><option>Todas</option><option>Fácil</option><option>Média</option><option>Difícil</option></select></label>
              <label>Banco de questões<select value={tag} onChange={e => setTag(e.target.value)}><option>Todas</option><option>OMED</option><option>Banco geral</option><option>Importada</option></select></label>
              <label>Situação<select value={answerStatus} onChange={e => setAnswerStatus(e.target.value)}><option>Não respondidas</option><option>Já respondidas</option><option>Respondidas incorretamente</option><option>Todas</option></select></label>
              <div className="result-count"><b>{filtered.length}</b><span>questões encontradas</span></div>
              <div className="study-progress"><div><span>Progresso do banco</span><b>{answeredCount}/{questions.length} · {studyProgress}%</b></div><span><i style={{ width: `${studyProgress}%` }} /></span></div>
              <button className="primary filter-submit" onClick={applyFilters}>Buscar questões</button>
            </aside>}
            {hasSearched && <section className={`question-area ${activeList ? "question-area--active-list" : ""}`}>
              {activeList && <div className="active-list-banner">
                <div><span>{isSimulation ? "SIMULADO" : "LISTA ATIVA"}</span><b>{activeList.name}</b><small>{activeListStats.answered} de {activeListStats.total} respondidas · {activeListStats.progress}% concluído</small></div>
                {isSimulation && <div className={`simulation-timer ${simulationSecondsLeft <= 300 ? "ending" : ""}`}><span>⏱️</span><div><small>Tempo restante</small><b>{simulationClock}</b></div></div>}
                <div className="active-list-progress" aria-hidden="true"><i style={{ width: `${activeListStats.progress}%` }} /></div>
              </div>}
              {(filtered.length > pageSize || activeList) && <div className="question-toolbar">
                <span>{activeList ? <><b>{activeListStats.answered}/{activeListStats.total}</b> respondidas</> : <><b>{filtered.length}</b> questões · 10 por página</>}</span>
                <div className="page-squares" aria-label="Paginação">
                  <button disabled={page === 1} onClick={() => goToPage(page - 1)} aria-label="Página anterior">‹</button>
                  {pageItems.map(item => typeof item === "number"
                    ? <button key={item} className={item === page ? "active" : ""} onClick={() => goToPage(item)}>{item}</button>
                    : <span key={item}>…</span>
                  )}
                  <button disabled={page === totalPages} onClick={() => goToPage(page + 1)} aria-label="Próxima página">›</button>
                  {activeList && <button type="button" className="active-list-close" onClick={confirmPauseCustomList} aria-label="Pausar e sair da lista" title="Pausar e sair da lista">×</button>}
                </div>
              </div>}
              {filtered.length ? <>
                {visibleQuestions.map((q, questionIndex) => {
                const savedAttempt = activeList
                  ? activeListAttemptByQuestion.get(String(q.id))
                  : latestAttemptByQuestion.get(String(q.id));
                const response = responses[q.id] || (savedAttempt ? { selected: savedAttempt.selectedAnswer, answered: true } : {});
                const revealAnswer = Boolean(
                  (response.answered && (!activeList || activeList.feedbackMode !== "end" || sessionFinished)) ||
                  (isSimulation && sessionFinished)
                );
                return <article className="question-card" key={q.id}>
                  <div className="question-meta">{q.tag && <span className="source-tag">{q.tag}</span>}<span>{q.area}</span><span>{q.topic}</span><span className={`difficulty ${q.difficulty}`}>{q.difficulty}</span>{attemptCountByQuestion.has(String(q.id)) && <span className="attempt-badge">{attemptCountByQuestion.get(String(q.id))}× respondida</span>}<small>Questão {(page - 1) * pageSize + questionIndex + 1} de {filtered.length}</small></div>
                  <h2>{q.text}</h2>
                  <div className="options">{q.options.map((opt, i) => {
                    let optionState = response.selected === i ? "selected" : "";
                    if (revealAnswer && i === q.answer) optionState = "correct";
                    if (revealAnswer && response.selected === i && i !== q.answer) optionState = "wrong";
                    return <button key={i} className={optionState} onClick={() => selectOption(q.id, i)}><b>{letters[i]}</b><span>{opt}</span>{revealAnswer && i === q.answer && <i>✓</i>}</button>;
                  })}</div>
                  {revealAnswer && <div className={`feedback ${response.answered && response.selected === q.answer ? "good" : "bad"}`}><b>{!response.answered ? `Não respondida. Alternativa ${letters[q.answer]}.` : response.selected === q.answer ? "Resposta correta!" : `Resposta incorreta. Alternativa ${letters[q.answer]}.`}</b><p>{q.explanation}</p></div>}
                  <div className="actions"><button className="ghost" onClick={() => setNotice("Questão sinalizada para revisão.")}>⚑ Marcar para revisar</button>{activeList && sessionFinished && !response.answered
                    ? <span className="answer-recorded">⏱️ Não respondida</span>
                    : activeList && response.answered
                    ? <span className="answer-recorded">{revealAnswer ? "✓ Resposta corrigida" : "🔒 Resposta registrada"}</span>
                    : response.answered && answerStatus === "Não respondidas"
                    ? <button className="primary" onClick={() => setReviewedQuestionId(null)}>Continuar →</button>
                    : response.answered
                      ? <button className="retry-button" onClick={() => retryQuestion(q.id)}>↻ Responder novamente</button>
                      : <button className="primary" disabled={response.selected == null} onClick={() => answer(q)}>{response.retrying ? "Confirmar nova resposta" : "Confirmar resposta"}</button>}</div>
                </article>;
              })}
                {activeList && sessionFinished && (page === totalPages || isSimulation) && <section className="list-performance-summary">
                  <div className="list-performance-heading">
                    <span>🏁</span>
                    <div><small>{isSimulation ? "SIMULADO FINALIZADO" : "LISTA CONCLUÍDA"}</small><h2>Resumo do seu desempenho</h2><p>{activeList.name}</p></div>
                  </div>
                  <div className="list-performance-metrics">
                    <div><span>Acertos</span><b>{activeListStats.correct}</b><small>de {activeListStats.total}</small></div>
                    <div><span>Erros</span><b>{activeListStats.wrong}</b><small>questões</small></div>
                    {isSimulation && <div><span>Em branco</span><b>{activeListStats.unanswered}</b><small>questões</small></div>}
                    <div className="accent"><span>Aproveitamento</span><b>{activeListStats.percentage}%</b><small>{activeListStats.percentage >= 70 ? "Ótimo resultado" : "Continue revisando"}</small></div>
                    <div><span>Melhor sequência</span><b>🔥 {activeListStats.bestStreak}</b><small>acertos seguidos</small></div>
                  </div>
                  <div className="list-performance-breakdown">
                    <div className="list-performance-breakdown__title"><b>Desempenho por conteúdo</b><span>Acertos / respondidas</span></div>
                    {activeListStats.breakdown.map(item => {
                      const percentage = Math.round((item.correct / item.answered) * 100);
                      return <div className="list-performance-row" key={`${item.area}-${item.topic}`}>
                        <div><b>{item.area} <em>›</em> {item.topic}</b><span><i style={{ width: `${percentage}%` }} /></span></div>
                        <strong>{item.correct}/{item.answered} · {percentage}%</strong>
                      </div>;
                    })}
                  </div>
                  <button type="button" className="primary list-performance-finish" onClick={closeCustomList}>Encerrar e voltar ao início</button>
                </section>}
              </> : <div className="empty"><b>Nenhuma questão encontrada</b><p>Ajuste os filtros ou adicione novas questões ao banco.</p></div>}
            </section>}
          </section>
        </>
      ) : tab === "listas" ? (
        <ListBuilder key="listas" mode="lista" questions={questions} latestAttemptByQuestion={latestAttemptByQuestion} onGenerate={startCustomList} />
      ) : tab === "simulados" ? (
        <ListBuilder key="simulados" mode="simulado" questions={questions} latestAttemptByQuestion={latestAttemptByQuestion} onGenerate={startCustomList} />
      ) : tab === "biblioteca" ? (
        <Library areas={Object.keys(topicMap)} />
      ) : tab === "casos" ? (
        <ClinicalCases />
      ) : tab === "organizacao" ? (
        <StudyOrganizer />
      ) : tab === "calendario" ? (
        <Calendar />
      ) : tab === "dashboard" ? (
        <Dashboard attempts={attempts} />
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
      <footer>MedQuestões • Ferramenta de apoio aos estudos — conteúdo não substitui orientação clínica.</footer>
      </div>
      {listExitOpen && activeList && <div className="list-exit-modal" role="presentation" onMouseDown={() => setListExitOpen(false)}>
        <section
          className="list-exit-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="list-exit-title"
          onMouseDown={event => event.stopPropagation()}
        >
          <button type="button" className="list-exit-dialog__close" onClick={() => setListExitOpen(false)} aria-label="Fechar confirmação">×</button>
          <span className="list-exit-dialog__icon" aria-hidden="true">{isSimulation ? "⏱️" : "⏸️"}</span>
          <small>{isSimulation ? "SIMULADO EM ANDAMENTO" : "LISTA EM ANDAMENTO"}</small>
          <h2 id="list-exit-title">Deseja pausar {isSimulation ? "o simulado" : "esta lista"}?</h2>
          <p>Você voltará ao menu, mas todas as respostas e o progresso de <b>{activeList.name}</b> continuarão salvos.{isSimulation && " O cronômetro continuará correndo."}</p>
          <div className="list-exit-dialog__progress">
            <div><span>Seu progresso</span><b>{activeListStats.answered} de {activeListStats.total} respondidas</b></div>
            <span><i style={{ width: `${activeListStats.progress}%` }} /></span>
          </div>
          <div className="list-exit-dialog__actions">
            <button type="button" className="list-exit-continue" onClick={() => setListExitOpen(false)}>Continuar respondendo</button>
            <button type="button" className="primary" onClick={pauseCustomList}>Pausar e sair</button>
            {isSimulation && <button type="button" className="list-exit-finish" onClick={finishSimulation}>Finalizar agora e corrigir</button>}
          </div>
        </section>
      </div>}
      {notice && <div className="toast">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    </main>
  );
}
