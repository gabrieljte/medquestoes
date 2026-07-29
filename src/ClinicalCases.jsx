import { useMemo, useState } from "react";

const STORAGE_KEY = "medquestoes-osce-progress";

const cases = [
  {
    id: "iam-inferior", area: "Cardiologia", title: "Dor torácica e instabilidade",
    intro: "Homem, 62 anos, tabagista, apresenta dor retroesternal há 50 minutos, sudorese e náusea.",
    steps: [
      { vitals: "PA 88/58 · FC 48 · SpO₂ 94% · FR 20", prompt: "Quais são suas primeiras medidas nos minutos iniciais?", answer: "Avaliar ABC, monitorizar, obter acesso venoso, ECG em até 10 minutos, glicemia e desfibrilador disponível. Oxigênio apenas se hipoxemia; analgesia e antiagregação conforme contraindicações.", update: "O ECG fica disponível enquanto o paciente permanece monitorizado." },
      { vitals: "ECG: supra em DII, DIII e aVF · BAV 2:1", prompt: "Qual o diagnóstico, território e exame complementar eletrocardiográfico imediato?", answer: "IAM com supra inferior, provavelmente coronária direita. Registrar derivações direitas, especialmente V4R, para pesquisar infarto do ventrículo direito; considerar derivações posteriores se houver suspeita.", update: "V4R mostra supra de ST. Há turgência jugular e pulmões limpos." },
      { vitals: "PA 82/54 · FC 44 · V4R positivo", prompt: "Como tratar a instabilidade e qual medicamento deve ser evitado agora?", answer: "Ativar reperfusão imediata, preferencialmente angioplastia primária. Fazer volume cauteloso se congestão ausente, tratar bradicardia sintomática conforme algoritmo e evitar nitrato por hipotensão/infarto de VD.", update: "Após volume cauteloso e suporte da frequência, PA sobe para 101/66. Hemodinâmica pronta." },
      { vitals: "PA 104/68 · FC 67 · dor reduzida", prompt: "O que completa a estabilização e o plano após a reperfusão?", answer: "Reperfusão sem demora, antitrombóticos conforme protocolo, vigilância de bloqueios/arritmias, ecocardiograma e prevenção secundária com tratamento dos fatores de risco e reabilitação.", update: "Fluxo coronário restaurado. Paciente estável em unidade coronariana." }
    ]
  },
  {
    id: "sepse-pneumonia", area: "Urgência e Emergência", title: "Choque séptico de foco pulmonar",
    intro: "Mulher, 71 anos, chega confusa após três dias de febre, tosse produtiva e piora da dispneia.",
    steps: [
      { vitals: "PA 78/46 · FC 122 · SpO₂ 87% · FR 32 · T 39,1°C", prompt: "Quais prioridades você executa simultaneamente?", answer: "ABC, oxigênio e suporte ventilatório conforme necessidade, acessos, lactato, culturas sem atrasar antibiótico, antimicrobiano precoce e cristaloide guiado por perfusão, além de busca do foco.", update: "Após oxigênio, SpO₂ 93%. Lactato 4,6 mmol/L e infiltrado lobar direito." },
      { vitals: "PA 82/50 após fluidos iniciais · diurese baixa", prompt: "Como reconhecer o choque e qual vasopressor escolher?", answer: "Hipotensão e hipoperfusão persistentes apesar de reposição apropriada sugerem choque séptico. Noradrenalina é o vasopressor inicial preferencial, titulada para perfusão/pressão adequada.", update: "Noradrenalina iniciada. PAM chega a 67 mmHg." },
      { vitals: "PAM 67 · lactato 3,2 · extremidades ainda frias", prompt: "Como reavaliar fluidos e resposta sem administrar volume indiscriminadamente?", answer: "Usar exame seriado, perfusão, diurese, lactato e testes dinâmicos de responsividade a fluidos. Repetir pequenos desafios apenas se houver provável benefício e vigiar congestão.", update: "Elevação passiva das pernas não aumenta débito; ultrassom mostra sinais de congestão incipiente." },
      { vitals: "PAM 70 · SpO₂ 95% · lactato 2,0", prompt: "Quais medidas encerram a fase de estabilização inicial?", answer: "Confirmar antibiótico adequado e controle do foco, desescalar quando houver microbiologia, ajustar ventilação/vasopressor, acompanhar rim e glicemia e iniciar medidas de UTI e prevenção de complicações.", update: "Perfusão e consciência melhoram. Paciente estabilizada na UTI." }
    ]
  },
  {
    id: "asma-grave", area: "Pneumologia", title: "Exacerbação grave de asma",
    intro: "Mulher, 24 anos, asmática, chega falando palavras isoladas após exposição intensa a poeira.",
    steps: [
      { vitals: "PA 132/78 · FC 132 · SpO₂ 86% · FR 38", prompt: "Qual tratamento deve começar imediatamente?", answer: "Oxigênio titulado, broncodilatador beta-2 inalatório repetido associado a ipratrópio na crise grave e corticosteroide sistêmico precoce, com monitorização contínua.", update: "SpO₂ sobe para 93%, mas esforço respiratório permanece intenso." },
      { vitals: "PFE 28% do previsto · fala entrecortada", prompt: "Como classificar e quais sinais indicariam falência respiratória iminente?", answer: "Exacerbação grave. Sonolência, tórax silencioso, exaustão, bradicardia/hipotensão ou PaCO₂ normalizando/elevando apesar da taquipneia sugerem falência iminente.", update: "Após tratamento intensivo, surgem sonolência e redução difusa dos sons respiratórios." },
      { vitals: "FR 30 com esforço menor por fadiga · PaCO₂ 48", prompt: "Qual é a próxima decisão e como preparar a via aérea?", answer: "Acionar equipe experiente e preparar intubação/ventilação invasiva por falência iminente. Pré-oxigenar, escolher indução apropriada e ventilar com tempo expiratório longo para reduzir hiperinsuflação dinâmica.", update: "Via aérea protegida; pressão e oxigenação permanecem adequadas." },
      { vitals: "SpO₂ 96% ventilada · sem auto-PEEP progressiva", prompt: "Como seguir até estabilização e prevenir nova crise?", answer: "Continuar broncodilatação e corticoide, identificar gatilho, desmamar suporte quando houver melhora e revisar terapia controladora contendo corticosteroide inalatório, técnica, adesão e plano de ação.", update: "Broncoespasmo reverte progressivamente e a paciente é extubada com segurança." }
    ]
  },
  {
    id: "avc-agudo", area: "Neurologia", title: "Déficit focal súbito",
    intro: "Homem, 68 anos, apresenta afasia e hemiparesia direita iniciadas há 70 minutos, testemunhadas pela família.",
    steps: [
      { vitals: "PA 184/106 · FC 92 irregular · glicemia 118 · SpO₂ 96%", prompt: "Quais dados e ações não podem atrasar a imagem?", answer: "Definir último momento bem, NIHSS/exame focal, glicemia, medicamentos/anticoagulação e contraindicações, estabilizar ABC e encaminhar imediatamente para TC sem contraste e imagem vascular conforme protocolo.", update: "TC não mostra hemorragia; angio-TC mostra oclusão proximal de cerebral média esquerda." },
      { vitals: "NIHSS 16 · PA 184/106 · janela de 90 min", prompt: "Quais estratégias de reperfusão devem ser consideradas?", answer: "Avaliar trombólise intravenosa após reduzir PA à meta exigida e checar contraindicações, além de trombectomia mecânica pela oclusão de grande vaso. Uma terapia não deve atrasar a outra.", update: "PA controlada, trombólise iniciada e equipe de trombectomia ativada." },
      { vitals: "Pós-trombectomia · reperfusão adequada · NIHSS 7", prompt: "Quais cuidados imediatos reduzem complicações?", answer: "Unidade de AVC, metas pressóricas do protocolo, avaliação de deglutição antes de via oral, controle de temperatura/glicose, vigilância neurológica e imagem se piora; evitar antitrombótico nas primeiras 24 h após trombólise.", update: "Deglutição inicialmente insegura; dieta suspensa e terapia iniciada." },
      { vitals: "24 h: TC sem hemorragia · NIHSS 4", prompt: "Como concluir investigação e prevenção secundária?", answer: "Investigar etiologia, incluindo fibrilação atrial, vasos e coração; iniciar antitrombótico no momento seguro conforme mecanismo, estatina/controle vascular e reabilitação multiprofissional.", update: "Fibrilação atrial confirmada. Plano de anticoagulação futura e reabilitação definidos." }
    ]
  },
  {
    id: "cetoacidose", area: "Endocrinologia", title: "Diabetes descompensado",
    intro: "Mulher, 19 anos, com diabetes tipo 1, apresenta vômitos, dor abdominal e respiração profunda após interromper insulina.",
    steps: [
      { vitals: "PA 92/58 · FC 124 · FR 30 · glicemia 486", prompt: "Quais exames confirmam a síndrome e qual medida vem primeiro?", answer: "Gasometria, eletrólitos, cetonemia, função renal, ânion gap e busca do precipitante. Iniciar cristaloide e monitorização; insulina e potássio dependem do valor inicial do potássio.", update: "pH 7,12, bicarbonato 9, cetonas elevadas, K 3,1 mEq/L." },
      { vitals: "K 3,1 · diurese presente · choque revertendo", prompt: "Você inicia insulina agora? Explique a sequência.", answer: "Não. Com potássio abaixo de 3,3 mEq/L, repor potássio primeiro e adiar insulina para evitar arritmia/fraqueza grave. Iniciar insulina quando o potássio estiver seguro.", update: "Após reposição, K chega a 3,6; insulina intravenosa é iniciada." },
      { vitals: "Glicemia 210 · ânion gap ainda elevado", prompt: "A insulina deve ser interrompida porque a glicose caiu?", answer: "Não. Adicionar glicose ao fluido e manter insulina para fechar o ânion gap/resolver cetose, ajustando potássio e velocidade. Glicemia normal não significa resolução da cetoacidose.", update: "Ânion gap fecha, bicarbonato 19, paciente volta a se alimentar." },
      { vitals: "pH normalizado · K 4,0 · consciente", prompt: "Como fazer a transição e evitar recorrência?", answer: "Aplicar insulina basal subcutânea com sobreposição adequada antes de suspender a infusão, revisar técnica/acesso, orientar dias de doença, nunca suspender basal e tratar o precipitante.", update: "Transição concluída sem rebote. Paciente estável e educada para alta." }
    ]
  },
  {
    id: "anafilaxia", area: "Urgência e Emergência", title: "Reação alérgica rapidamente progressiva",
    intro: "Adolescente, 17 anos, desenvolve urticária, rouquidão e tontura minutos após ingerir alimento com amendoim.",
    steps: [
      { vitals: "PA 76/42 · FC 138 · SpO₂ 89% · estridor", prompt: "Qual medicamento, via e local são prioritários?", answer: "Adrenalina intramuscular na face anterolateral da coxa imediatamente, em dose adequada ao peso/idade. Posicionar, ofertar oxigênio, obter acesso e preparar manejo avançado de via aérea.", update: "Adrenalina aplicada; oxigênio iniciado. Persistem hipotensão e estridor após alguns minutos." },
      { vitals: "PA 82/48 · SpO₂ 92% · estridor persistente", prompt: "Qual é a próxima conduta?", answer: "Repetir adrenalina IM no intervalo recomendado, iniciar cristaloide rápido e chamar equipe de via aérea. Anti-histamínico e corticoide são adjuvantes e não substituem adrenalina.", update: "Após segunda dose e volume, PA 105/65 e estridor desaparece." },
      { vitals: "PA 108/68 · SpO₂ 97% · sem sibilos", prompt: "A melhora permite alta imediata?", answer: "Não. Observar pelo risco de recorrência bifásica, por tempo individualizado conforme gravidade, doses de adrenalina, comorbidades e acesso a emergência.", update: "Permanece assintomática durante observação." },
      { vitals: "Estável, exame respiratório normal", prompt: "O que deve constar no plano de alta?", answer: "Educação para evitar o gatilho, plano escrito, prescrição/treino de adrenalina autoinjetável quando disponível, identificação de anafilaxia e encaminhamento para alergologia.", update: "Paciente e família demonstram corretamente o uso do autoinjetor." }
    ]
  }
];

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

export default function ClinicalCases() {
  const [area, setArea] = useState("Todas");
  const [selectedId, setSelectedId] = useState(cases[0].id);
  const [stepIndex, setStepIndex] = useState(0);
  const [response, setResponse] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [history, setHistory] = useState(loadHistory);

  const areas = [...new Set(cases.map(item => item.area))].sort();
  const visibleCases = useMemo(() => cases.filter(item => area === "Todas" || item.area === area), [area]);
  const selected = cases.find(item => item.id === selectedId) || visibleCases[0] || cases[0];
  const step = selected.steps[stepIndex];

  function chooseCase(id) {
    setSelectedId(id); setStepIndex(0); setResponse(""); setRevealed(false); setScore(0); setCompleted(false);
  }

  function assess(correct) {
    const nextScore = score + (correct ? 1 : 0);
    if (stepIndex === selected.steps.length - 1) {
      const nextHistory = { ...history, [selected.id]: { score: nextScore, total: selected.steps.length, completedAt: new Date().toISOString() } };
      setHistory(nextHistory);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
      setScore(nextScore); setCompleted(true);
    } else {
      setScore(nextScore); setStepIndex(index => index + 1); setResponse(""); setRevealed(false);
    }
  }

  return (
    <section className="cases-page">
      <div className="cases-heading"><div><span className="eyebrow">TREINO OSCE</span><h1>Casos clínicos progressivos</h1><p>Pense em voz alta, revele a resposta-modelo e avance até estabilizar o paciente.</p></div>
        <label>Especialidade<select value={area} onChange={event => { const value = event.target.value; setArea(value); const next = cases.find(item => value === "Todas" || item.area === value); if (next) chooseCase(next.id); }}><option>Todas</option>{areas.map(item => <option key={item}>{item}</option>)}</select></label></div>
      <div className="cases-layout">
        <aside className="case-list">{visibleCases.map(item => <button key={item.id} className={selected.id === item.id ? "active" : ""} onClick={() => chooseCase(item.id)}><span>{item.area}</span><b>{item.title}</b><small>{history[item.id] ? `${history[item.id].score}/${history[item.id].total} na última tentativa` : `${item.steps.length} etapas`}</small></button>)}</aside>
        <article className="case-station">
          <div className="case-station-top"><div><span>{selected.area}</span><h2>{selected.title}</h2></div><strong>Etapa {Math.min(stepIndex + 1, selected.steps.length)}/{selected.steps.length}</strong></div>
          <div className="case-progress"><i style={{ width: `${completed ? 100 : (stepIndex / selected.steps.length) * 100}%` }} /></div>
          {!completed ? <>
            <div className="case-intro"><b>Cenário</b><p>{selected.intro}</p></div>
            <div className="case-vitals"><span>MONITORIZAÇÃO ATUAL</span><b>{step.vitals}</b></div>
            {stepIndex > 0 && <div className="case-update"><span>↻ Evolução</span><p>{selected.steps[stepIndex - 1].update}</p></div>}
            <div className="case-question"><span>SUA ESTAÇÃO</span><h3>{step.prompt}</h3><textarea value={response} onChange={event => setResponse(event.target.value)} placeholder="Escreva como você conduziria este momento..." rows={5} disabled={revealed} />
              {!revealed ? <button className="primary" disabled={!response.trim()} onClick={() => setRevealed(true)}>Revelar resposta-modelo</button> :
                <div className="case-model"><span>RESPOSTA-MODELO</span><p>{step.answer}</p><div><button onClick={() => assess(false)}>Preciso revisar</button><button className="primary" onClick={() => assess(true)}>Acertei esta etapa</button></div></div>}
            </div>
          </> : <div className="case-complete"><span>✓</span><h2>Paciente estabilizado</h2><p>{selected.steps.at(-1).update}</p><strong>{score}/{selected.steps.length} etapas dominadas</strong><button className="primary" onClick={() => chooseCase(selected.id)}>Refazer o caso</button></div>}
        </article>
      </div>
      <p className="cases-disclaimer">Simulação educacional. Não substitui protocolos locais, supervisão ou avaliação clínica real.</p>
    </section>
  );
}
