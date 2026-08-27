const ACTIONS = [
  { tab: "questoes", icon: "✚", accent: "mint", title: "Banco de questões", text: "Estudo livre por especialidade e subtema.", meta: "Treino personalizado" },
  { tab: "listas", icon: "≡", accent: "blue", title: "Listas inteligentes", text: "Combine conteúdos e defina a quantidade.", meta: "Sessão sob medida" },
  { tab: "simulados", icon: "◷", accent: "orange", title: "Simulados", text: "Cronômetro, gabarito ao final e análise.", meta: "Experiência de prova" },
  { tab: "casos", icon: "♟", accent: "purple", title: "Casos clínicos", text: "Conduza pacientes em estações progressivas.", meta: "Raciocínio clínico" },
  { tab: "organizacao", icon: "✓", accent: "rose", title: "Plano de estudos", text: "Metas, materiais, prazos e progresso.", meta: "Organização acadêmica" },
  { tab: "biblioteca", icon: "▦", accent: "cyan", title: "Biblioteca", text: "Seu acervo de imagens e referências.", meta: "Revisão visual" }
];

function dayKey(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function HomeDashboard({ questionCount, answeredCount, attempts, gameStats, activeList, activeListStats, isSimulation, simulationClock, onNavigate, onResume }) {
  const correct = attempts.filter(attempt => attempt.correct).length;
  const accuracy = attempts.length ? Math.round(correct / attempts.length * 100) : 0;
  const bankProgress = questionCount ? Math.round(answeredCount / questionCount * 100) : 0;
  const todayKey = dayKey(new Date());
  const todayAttempts = attempts.filter(attempt => dayKey(attempt.answeredAt) === todayKey);
  const todayCorrect = todayAttempts.filter(attempt => attempt.correct).length;
  const dailyGoal = 20;
  const dailyProgress = Math.min(100, Math.round(todayAttempts.length / dailyGoal * 100));
  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = dayKey(date);
    return { key, label: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", ""), total: attempts.filter(attempt => dayKey(attempt.answeredAt) === key).length };
  });
  const weekMax = Math.max(1, ...lastSevenDays.map(day => day.total));
  const weekTotal = lastSevenDays.reduce((total, day) => total + day.total, 0);
  const areaStats = attempts.reduce((grouped, attempt) => {
    grouped[attempt.area] ||= { total: 0, wrong: 0 };
    grouped[attempt.area].total += 1;
    if (!attempt.correct) grouped[attempt.area].wrong += 1;
    return grouped;
  }, {});
  const focusArea = Object.entries(areaStats).filter(([, value]) => value.total >= 2).sort(([, first], [, second]) => (second.wrong / second.total) - (first.wrong / first.total))[0];
  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <section className="home-dashboard academy-home">
      <header className="academy-hero">
        <div className="academy-hero__copy">
          <span className="academy-pill"><i /> MEDQUESTÕES ACADEMY</span>
          <p className="academy-date">{today.charAt(0).toUpperCase() + today.slice(1)}</p>
          <h1>Transforme constância<br />em <em>domínio clínico.</em></h1>
          <p className="academy-hero__description">Sua central de treinamento médico: questões, simulados, casos clínicos e um plano de estudos que acompanha sua evolução.</p>
          <div className="academy-hero__actions">
            <button type="button" className="academy-primary" onClick={() => onNavigate("questoes")}><span>▶</span> Começar sessão</button>
            <button type="button" className="academy-secondary" onClick={() => onNavigate("listas")}>Montar lista <span>→</span></button>
          </div>
          <div className="academy-proof"><span>✓ Progresso sincronizado</span><span>✓ {questionCount.toLocaleString("pt-BR")} questões</span><span>✓ Correção comentada</span></div>
        </div>
        <aside className="daily-goal-card">
          <div className="daily-goal-card__top"><span>META DIÁRIA</span><b>{dailyProgress >= 100 ? "Concluída" : "Em andamento"}</b></div>
          <div className="daily-goal-ring" style={{ "--goal": `${dailyProgress * 3.6}deg` }}><div><strong>{todayAttempts.length}</strong><span>de {dailyGoal}</span><small>questões</small></div></div>
          <div className="daily-goal-stats"><div><span>Acertos hoje</span><b>{todayCorrect}</b></div><div><span>Aproveitamento</span><b>{todayAttempts.length ? Math.round(todayCorrect / todayAttempts.length * 100) : 0}%</b></div></div>
          <button type="button" onClick={() => onNavigate("questoes")}>{dailyProgress >= 100 ? "Continuar avançando" : `Faltam ${Math.max(0, dailyGoal - todayAttempts.length)} questões`} <span>→</span></button>
        </aside>
      </header>

      {activeList && <section className="home-active-session academy-session"><div className="home-active-session__icon">{isSimulation ? "◷" : "≡"}</div><div><span>{isSimulation ? "SIMULADO EM ANDAMENTO" : "CONTINUE DE ONDE PAROU"}</span><h2>{activeList.name}</h2><p>{activeListStats.answered} de {activeListStats.total} respondidas · {activeListStats.progress}% concluído{isSimulation ? ` · ${simulationClock} restantes` : ""}</p><div><i style={{ width: `${activeListStats.progress}%` }} /></div></div><button type="button" onClick={onResume}>Retomar sessão →</button></section>}

      <section className="academy-overview">
        <div className="academy-overview__heading"><div><span className="academy-section-label">SEU MOMENTO</span><h2>Painel de evolução</h2></div><button type="button" onClick={() => onNavigate("dashboard")}>Ver análise completa <span>↗</span></button></div>
        <div className="academy-overview__grid">
          <article className="academy-metric academy-metric--primary"><span>Desempenho geral</span><div><b>{accuracy}%</b><i className={accuracy >= 70 ? "positive" : ""}>{accuracy >= 70 ? "Boa evolução" : "Em construção"}</i></div><small>{correct} acertos em {attempts.length} tentativas</small><div className="academy-meter"><i style={{ width: `${accuracy}%` }} /></div></article>
          <article className="academy-metric"><span>Questões únicas</span><div><b>{answeredCount}</b><i>{bankProgress}% do banco</i></div><small>{Math.max(0, questionCount - answeredCount)} inéditas esperando por você</small><div className="academy-meter"><i style={{ width: `${bankProgress}%` }} /></div></article>
          <article className="academy-metric academy-metric--streak"><span>Sequência atual</span><div><b>{gameStats.currentStreak}</b><i>🔥 recorde {gameStats.bestStreak}</i></div><small>Acertos consecutivos na sessão</small><div className="academy-level"><span>Nível {gameStats.level}</span><b>{gameStats.progress}/100 XP</b></div></article>
        </div>
      </section>

      <section className="academy-command">
        <article className="academy-week-card"><div className="academy-card-heading"><div><span className="academy-section-label">RITMO DE ESTUDO</span><h3>Últimos 7 dias</h3></div><strong>{weekTotal}<small> questões</small></strong></div><div className="academy-week-chart">{lastSevenDays.map(day => <div key={day.key} className={day.key === todayKey ? "today" : ""}><span><i style={{ height: `${Math.max(7, day.total / weekMax * 100)}%` }} /></span><b>{day.label}</b><small>{day.total || ""}</small></div>)}</div></article>
        <article className="academy-recommendation"><span className="academy-section-label">RECOMENDAÇÃO INTELIGENTE</span><div className="academy-recommendation__icon">◎</div><h3>{focusArea ? `Reforce ${focusArea[0]}` : "Construa sua linha de base"}</h3><p>{focusArea ? `Você errou ${focusArea[1].wrong} de ${focusArea[1].total} tentativas nessa área. Uma lista curta agora pode consolidar os pontos frágeis.` : "Responda algumas questões para que o painel identifique automaticamente onde concentrar sua revisão."}</p><button type="button" onClick={() => onNavigate(focusArea ? "listas" : "questoes")}>{focusArea ? "Criar lista de revisão" : "Começar diagnóstico"} <span>→</span></button></article>
      </section>

      <section className="academy-study-modes"><div className="academy-overview__heading"><div><span className="academy-section-label">TRILHAS DE APRENDIZADO</span><h2>Como você quer estudar agora?</h2></div><small>Escolha um formato e entre no fluxo.</small></div><div className="academy-mode-grid">{ACTIONS.map(action => <button type="button" className={`academy-mode academy-mode--${action.accent}`} key={action.tab} onClick={() => onNavigate(action.tab)}><span className="academy-mode__icon">{action.icon}</span><div><small>{action.meta}</small><b>{action.title}</b><p>{action.text}</p></div><i>↗</i></button>)}</div></section>
    </section>
  );
}
