const ACTIONS = [
  { tab: "questoes", icon: "📝", title: "Resolver questões", text: "Filtre o banco por especialidade e subtema." },
  { tab: "listas", icon: "📋", title: "Criar uma lista", text: "Monte uma sessão personalizada de estudos." },
  { tab: "simulados", icon: "⏱️", title: "Fazer um simulado", text: "Treine com cronômetro e correção no final." },
  { tab: "casos", icon: "🩺", title: "Casos clínicos", text: "Conduza pacientes em estações estilo OSCE." },
  { tab: "biblioteca", icon: "📚", title: "Abrir biblioteca", text: "Revise imagens e materiais que você salvou." },
  { tab: "dashboard", icon: "📊", title: "Ver desempenho", text: "Acompanhe sua evolução por período e área." }
];

export default function HomeDashboard({
  questionCount,
  answeredCount,
  attempts,
  gameStats,
  activeList,
  activeListStats,
  isSimulation,
  simulationClock,
  onNavigate,
  onResume
}) {
  const correct = attempts.filter(attempt => attempt.correct).length;
  const accuracy = attempts.length ? Math.round((correct / attempts.length) * 100) : 0;
  const bankProgress = questionCount ? Math.round((answeredCount / questionCount) * 100) : 0;
  const today = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date());

  return (
    <section className="home-dashboard">
      <header className="home-welcome">
        <div>
          <span className="eyebrow">VISÃO GERAL</span>
          <h1>O que vamos estudar hoje?</h1>
          <p>{today.charAt(0).toUpperCase() + today.slice(1)} · Escolha uma atividade quando estiver pronto.</p>
        </div>
        <button type="button" className="primary" onClick={() => onNavigate("questoes")}>
          📝 Começar questões
        </button>
      </header>

      {activeList && (
        <section className="home-active-session">
          <div className="home-active-session__icon">{isSimulation ? "⏱️" : "📋"}</div>
          <div>
            <span>{isSimulation ? "SIMULADO EM ANDAMENTO" : "LISTA EM ANDAMENTO"}</span>
            <h2>{activeList.name}</h2>
            <p>{activeListStats.answered} de {activeListStats.total} respondidas · {activeListStats.progress}% concluído{isSimulation ? ` · ${simulationClock} restantes` : ""}</p>
            <div><i style={{ width: `${activeListStats.progress}%` }} /></div>
          </div>
          <button type="button" onClick={onResume}>Retomar agora →</button>
        </section>
      )}

      <div className="home-metrics">
        <article><span>Questões respondidas</span><b>{answeredCount}</b><small>de {questionCount} no banco</small></article>
        <article><span>Aproveitamento geral</span><b>{accuracy}%</b><small>{correct} respostas corretas</small></article>
        <article><span>Sequência atual</span><b>🔥 {gameStats.currentStreak}</b><small>recorde de {gameStats.bestStreak}</small></article>
        <article className="home-metric-progress"><span>Progresso do banco</span><b>{bankProgress}%</b><small>{questionCount - answeredCount} questões inéditas</small><div><i style={{ width: `${bankProgress}%` }} /></div></article>
      </div>

      <div className="home-section-title">
        <div><span className="eyebrow">ACESSO RÁPIDO</span><h2>Escolha como estudar</h2></div>
        <small>O banco permanece em espera até você escolher uma atividade.</small>
      </div>

      <div className="home-actions">
        {ACTIONS.map(action => (
          <button type="button" key={action.tab} onClick={() => onNavigate(action.tab)}>
            <span>{action.icon}</span>
            <div><b>{action.title}</b><small>{action.text}</small></div>
            <i>→</i>
          </button>
        ))}
      </div>

      <aside className="home-tip">
        <span>💡</span>
        <div><b>Sugestão para hoje</b><p>Comece revisando questões erradas ou monte uma lista curta de 10 questões de um único subtema.</p></div>
        <button type="button" onClick={() => onNavigate("listas")}>Montar lista</button>
      </aside>
    </section>
  );
}
