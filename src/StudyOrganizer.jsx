import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "medquestoes-study-organizer-v1";
const EMPTY_DRAFT = {
  subject: "",
  goal: "",
  deadline: "",
  status: "Planejado",
  progress: 0,
  materials: "",
  links: "",
  notes: ""
};
const STATUSES = [
  { name: "Planejado", icon: "🗂️" },
  { name: "Estudando", icon: "📖" },
  { name: "Revisar", icon: "🔁" },
  { name: "Concluído", icon: "✅" }
];

function loadPlans() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function formatDate(value) {
  if (!value) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`)).replace(".", "");
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function linkLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function StudyOrganizer() {
  const [plans, setPlans] = useState(loadPlans);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  }, [plans]);

  const visiblePlans = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return plans
      .filter(plan => filter === "Todos" || plan.status === filter)
      .filter(plan => !term || [plan.subject, plan.goal, plan.materials, plan.notes]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(term))
      .sort((a, b) => {
        if (!a.deadline && !b.deadline) return b.updatedAt.localeCompare(a.updatedAt);
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      });
  }, [plans, filter, search]);

  const completed = plans.filter(plan => plan.status === "Concluído").length;
  const inProgress = plans.filter(plan => plan.status === "Estudando").length;
  const review = plans.filter(plan => plan.status === "Revisar").length;

  function updateDraft(event) {
    const { name, value } = event.target;
    setDraft(current => ({ ...current, [name]: name === "progress" ? Number(value) : value }));
    setFormError("");
  }

  function resetForm() {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setFormError("");
  }

  function submit(event) {
    event.preventDefault();
    if (!draft.subject.trim() || !draft.goal.trim()) {
      setFormError("Preencha a matéria e até onde você pretende estudar.");
      return;
    }
    const now = new Date().toISOString();
    const links = draft.links.split(/\r?\n/).map(normalizeUrl).filter(Boolean);
    const nextPlan = {
      id: editingId || crypto.randomUUID(),
      subject: draft.subject.trim(),
      goal: draft.goal.trim(),
      deadline: draft.deadline,
      status: draft.status,
      progress: draft.status === "Concluído" ? 100 : Number(draft.progress),
      materials: draft.materials.trim(),
      links,
      notes: draft.notes.trim(),
      createdAt: editingId
        ? plans.find(plan => plan.id === editingId)?.createdAt || now
        : now,
      updatedAt: now
    };
    setPlans(current => editingId
      ? current.map(plan => plan.id === editingId ? nextPlan : plan)
      : [nextPlan, ...current]);
    resetForm();
  }

  function editPlan(plan) {
    setEditingId(plan.id);
    setDraft({
      subject: plan.subject,
      goal: plan.goal,
      deadline: plan.deadline || "",
      status: plan.status,
      progress: plan.progress || 0,
      materials: plan.materials || "",
      links: (plan.links || []).join("\n"),
      notes: plan.notes || ""
    });
    setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleDone(plan) {
    const done = plan.status === "Concluído";
    setPlans(current => current.map(item => item.id === plan.id
      ? {
          ...item,
          status: done ? "Estudando" : "Concluído",
          progress: done ? Math.min(item.progress || 0, 90) : 100,
          updatedAt: new Date().toISOString()
        }
      : item));
  }

  function deletePlan(id) {
    setPlans(current => current.filter(plan => plan.id !== id));
    setDeleteConfirmId(null);
    if (editingId === id) resetForm();
  }

  return (
    <section className="study-organizer">
      <header className="study-organizer-heading">
        <div><span className="eyebrow">ORGANIZAÇÃO DOS ESTUDOS</span><h1>Meu plano de estudos</h1><p>Guarde o que estudar, até onde chegar e todos os materiais que encontrou.</p></div>
        <div className="study-organizer-stats">
          <span><b>{plans.length}</b> metas</span>
          <span><b>{inProgress}</b> estudando</span>
          <span><b>{review}</b> revisar</span>
          <span><b>{completed}</b> concluídas</span>
        </div>
      </header>

      <div className="study-organizer-layout">
        <form className="study-plan-form" onSubmit={submit}>
          <div className="study-plan-form__title"><span>{editingId ? "✏️" : "＋"}</span><div><b>{editingId ? "Editar meta" : "Nova meta de estudo"}</b><small>Organize um conteúdo por vez</small></div></div>
          <label>Matéria<input name="subject" value={draft.subject} onChange={updateDraft} placeholder="Ex.: Cardiologia" /></label>
          <label>Até onde estudar<textarea name="goal" value={draft.goal} onChange={updateDraft} rows="3" placeholder="Ex.: Síndrome coronariana aguda até tratamento do IAM com supra" /></label>
          <div className="study-plan-form__row">
            <label>Prazo<input type="date" name="deadline" value={draft.deadline} onChange={updateDraft} /></label>
            <label>Status<select name="status" value={draft.status} onChange={updateDraft}>{STATUSES.map(status => <option key={status.name}>{status.name}</option>)}</select></label>
          </div>
          <label className="study-progress-input">Progresso <span>{draft.progress}%</span><input type="range" min="0" max="100" step="5" name="progress" value={draft.progress} onChange={updateDraft} /></label>
          <label>Materiais<textarea name="materials" value={draft.materials} onChange={updateDraft} rows="3" placeholder="Livro, capítulo, resumo, guideline, vídeo..." /></label>
          <label>Links encontrados <small>(um por linha)</small><textarea name="links" value={draft.links} onChange={updateDraft} rows="3" placeholder={"https://...\nhttps://..."} /></label>
          <label>Observações<textarea name="notes" value={draft.notes} onChange={updateDraft} rows="3" placeholder="Dúvidas, pontos importantes, o que revisar depois..." /></label>
          {formError && <div className="study-plan-form__error">{formError}</div>}
          <div className="study-plan-form__actions">
            {editingId && <button type="button" onClick={resetForm}>Cancelar</button>}
            <button type="submit" className="primary">{editingId ? "Salvar alterações" : "Adicionar ao plano"}</button>
          </div>
        </form>

        <section className="study-plans">
          <div className="study-plans-toolbar">
            <label><span>🔎</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar matéria ou conteúdo..." /></label>
            <div>{["Todos", ...STATUSES.map(status => status.name)].map(status => <button type="button" key={status} className={filter === status ? "active" : ""} onClick={() => setFilter(status)}>{status}</button>)}</div>
          </div>

          <div className="study-plans-grid">
            {visiblePlans.length ? visiblePlans.map(plan => {
              const meta = STATUSES.find(status => status.name === plan.status) || STATUSES[0];
              return (
                <article className={`study-plan-card status-${plan.status.toLocaleLowerCase("pt-BR").replace("í", "i")}`} key={plan.id}>
                  <div className="study-plan-card__top">
                    <span>{meta.icon} {plan.status}</span>
                    <small>📅 {formatDate(plan.deadline)}</small>
                  </div>
                  <h2>{plan.subject}</h2>
                  <div className="study-plan-card__goal"><span>ATÉ ONDE ESTUDAR</span><p>{plan.goal}</p></div>
                  <div className="study-plan-card__progress"><div><span>Progresso</span><b>{plan.progress || 0}%</b></div><span><i style={{ width: `${plan.progress || 0}%` }} /></span></div>
                  {plan.materials && <div className="study-plan-card__section"><b>📚 Materiais</b><p>{plan.materials}</p></div>}
                  {plan.links?.length > 0 && <div className="study-plan-card__links"><b>🔗 Links</b><div>{plan.links.map(link => <a key={link} href={link} target="_blank" rel="noreferrer">{linkLabel(link)} ↗</a>)}</div></div>}
                  {plan.notes && <div className="study-plan-card__section"><b>🗒️ Observações</b><p>{plan.notes}</p></div>}
                  <div className="study-plan-card__actions">
                    <button type="button" onClick={() => toggleDone(plan)}>{plan.status === "Concluído" ? "Reabrir" : "✓ Concluir"}</button>
                    <button type="button" onClick={() => editPlan(plan)}>Editar</button>
                    {deleteConfirmId === plan.id ? <>
                      <button type="button" onClick={() => setDeleteConfirmId(null)}>Cancelar</button>
                      <button type="button" className="danger" onClick={() => deletePlan(plan.id)}>Confirmar</button>
                    </> : <button type="button" className="danger" onClick={() => setDeleteConfirmId(plan.id)}>Excluir</button>}
                  </div>
                </article>
              );
            }) : <div className="study-plans-empty"><span>📚</span><b>Nenhuma meta encontrada</b><p>Adicione uma matéria e defina exatamente até onde deseja estudar.</p></div>}
          </div>
        </section>
      </div>
    </section>
  );
}
