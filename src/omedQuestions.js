import { omedSupplemental } from "./omedSupplemental.js";
import { omedClinicalQuestions } from "./omedClinicalQuestions.js";
import { omedProfileQuestions } from "./omedProfileQuestions.js";
import { mentalHealthQuestions } from "./mentalHealthQuestions.js";

const coreOmedQuestions = [
  {
    id: "omed-pneumo-01", area: "Pneumologia", topic: "Derrame pleural", difficulty: "Média", tag: "OMED",
    text: "Homem de 49 anos, com pneumonia bacteriana em tratamento, mantém febre e dor ventilatório-dependente. A toracocentese mostra líquido pleural turvo, pH 7,08 e glicose de 35 mg/dL. Qual é a conduta mais adequada?",
    options: ["Manter apenas antibioticoterapia e repetir radiografia em 72 horas", "Realizar drenagem pleural associada à antibioticoterapia", "Iniciar diurético de alça", "Indicar pleurodese química imediatamente"],
    answer: 1, explanation: "Derrame parapneumônico com pH menor que 7,2 e glicose baixa é complicado e exige drenagem, além do tratamento antimicrobiano."
  },
  {
    id: "omed-pneumo-02", area: "Pneumologia", topic: "Tromboembolismo pulmonar", difficulty: "Difícil", tag: "OMED",
    text: "Paciente no pós-operatório apresenta dispneia súbita, hipotensão, hipoxemia e sinais ecocardiográficos de sobrecarga aguda do ventrículo direito. Não há contraindicação hemorrágica. Qual medida deve ser priorizada?",
    options: ["Aguardar o resultado do dímero-D", "Iniciar trombólise sistêmica", "Solicitar cintilografia pulmonar antes de tratar", "Prescrever anticoagulante oral e dar alta"],
    answer: 1, explanation: "No TEP de alto risco com instabilidade hemodinâmica, a reperfusão por trombólise sistêmica é indicada quando não há contraindicação."
  },
  {
    id: "omed-pneumo-03", area: "Pneumologia", topic: "DPOC", difficulty: "Média", tag: "OMED",
    text: "Homem de 68 anos com DPOC chega com exacerbação, retenção de CO₂ e uso de musculatura acessória. Está consciente e colaborativo. Qual estratégia ventilatória deve ser considerada inicialmente?",
    options: ["Ventilação não invasiva", "Intubação imediata em todos os casos", "Oxigênio em alto fluxo visando saturação de 100%", "Apenas fisioterapia respiratória"],
    answer: 0, explanation: "Na exacerbação hipercápnica, a ventilação não invasiva reduz trabalho respiratório e necessidade de intubação. O alvo usual de saturação é 88–92%."
  },
  {
    id: "omed-cardio-01", area: "Cardiologia", topic: "Síndrome coronariana aguda", difficulty: "Média", tag: "OMED",
    text: "Homem de 57 anos apresenta dor torácica há 90 minutos. O ECG mostra supradesnivelamento de ST em DII, DIII e aVF. Qual território e artéria culpada são mais prováveis?",
    options: ["Parede anterior e descendente anterior", "Parede inferior e coronária direita", "Parede lateral e tronco da coronária esquerda", "Parede septal e circunflexa"],
    answer: 1, explanation: "Supra em DII, DIII e aVF caracteriza IAM inferior, mais frequentemente relacionado à coronária direita."
  },
  {
    id: "omed-cardio-02", area: "Cardiologia", topic: "Dissecção aórtica", difficulty: "Difícil", tag: "OMED",
    text: "Paciente hipertenso apresenta dor torácica súbita irradiada para o dorso e diferença de pulsos. A angiotomografia mostra dissecção envolvendo a aorta ascendente. Qual é a classificação e a conduta?",
    options: ["Stanford A; avaliação cirúrgica de emergência", "Stanford B; tratamento exclusivamente ambulatorial", "Stanford A; trombólise sistêmica", "Stanford B; anticoagulação plena"],
    answer: 0, explanation: "Toda dissecção que envolve a aorta ascendente é Stanford A e, em regra, requer tratamento cirúrgico urgente."
  },
  {
    id: "omed-cardio-03", area: "Cardiologia", topic: "Hipertensão resistente", difficulty: "Média", tag: "OMED",
    text: "Mulher mantém pressão elevada apesar do uso correto de IECA, bloqueador de canal de cálcio e diurético tiazídico em doses adequadas. Adesão e medidas residenciais foram confirmadas. Qual fármaco é a quarta opção preferencial?",
    options: ["Espironolactona", "Propranolol", "Clonidina", "Hidralazina"],
    answer: 0, explanation: "Após excluir pseudorresistência e causas secundárias, a espironolactona é a quarta droga preferencial na hipertensão resistente."
  },
  {
    id: "omed-ped-01", area: "Pediatria", topic: "Diarreia e desidratação", difficulty: "Média", tag: "OMED",
    text: "Lactente com diarreia aquosa está irritado, bebe avidamente e apresenta olhos fundos e prega cutânea com retorno lento. Qual abordagem é mais adequada?",
    options: ["Plano A exclusivamente domiciliar", "Terapia de reidratação oral supervisionada pelo Plano B", "Plano C com cirurgia imediata", "Suspender líquidos até cessar a diarreia"],
    answer: 1, explanation: "Dois ou mais sinais de alguma desidratação indicam Plano B, com solução de reidratação oral e reavaliação no serviço."
  },
  {
    id: "omed-ped-02", area: "Pediatria", topic: "Crupe", difficulty: "Média", tag: "OMED",
    text: "Criança de 18 meses apresenta tosse ladrante, estridor em repouso e tiragens moderadas, sem sialorreia. Qual esquema inicial é o mais apropriado?",
    options: ["Amoxicilina e alta imediata", "Dexametasona, adrenalina nebulizada e observação", "Salbutamol isolado", "Intubação obrigatória em todos os casos"],
    answer: 1, explanation: "Estridor em repouso indica crupe moderado ou grave: dexametasona, adrenalina nebulizada e observação após a medicação."
  },
  {
    id: "omed-ped-03", area: "Pediatria", topic: "Convulsão febril", difficulty: "Fácil", tag: "OMED",
    text: "Criança de 20 meses apresenta crise tônico-clônica generalizada de 3 minutos durante febre, sem recorrência e com recuperação completa. Qual classificação é a mais provável?",
    options: ["Convulsão febril simples", "Convulsão febril complexa", "Estado de mal epiléptico", "Epilepsia focal"],
    answer: 0, explanation: "Crise generalizada, com menos de 15 minutos, única em 24 horas e recuperação completa caracteriza convulsão febril simples."
  },
  {
    id: "omed-infecto-01", area: "Infectologia", topic: "Tuberculose", difficulty: "Média", tag: "OMED",
    text: "Homem com tosse há quatro semanas, emagrecimento e sudorese noturna procura a UBS. Onde disponível, qual é o teste inicial preferencial para investigação bacteriológica de tuberculose pulmonar?",
    options: ["PPD", "Teste rápido molecular para tuberculose", "Sorologia para tuberculose", "IGRA"],
    answer: 1, explanation: "O teste rápido molecular detecta o DNA do M. tuberculosis e resistência à rifampicina, sendo o teste inicial preferencial onde disponível."
  },
  {
    id: "omed-infecto-02", area: "Infectologia", topic: "Dengue", difficulty: "Difícil", tag: "OMED",
    text: "Paciente com suspeita de dengue apresenta queda da febre, dor abdominal intensa, vômitos persistentes, extremidades frias, enchimento capilar lento e hematócrito crescente. Qual é a interpretação correta?",
    options: ["Fase de recuperação sem sinais de alarme", "Choque por extravasamento plasmático, exigindo reposição volêmica imediata", "Infecção bacteriana obrigatória", "Quadro leve que permite alta sem observação"],
    answer: 1, explanation: "A defervescência acompanhada de sinais de alarme, hemoconcentração e hipoperfusão indica fase crítica com extravasamento plasmático."
  },
  {
    id: "omed-infecto-03", area: "Infectologia", topic: "Sepse", difficulty: "Média", tag: "OMED",
    text: "Idoso com pneumonia apresenta hipotensão e sinais de hipoperfusão. Após coleta de culturas, qual conduta não deve ser atrasada?",
    options: ["Antibioticoterapia intravenosa precoce", "Colonoscopia", "Corticoterapia oral isolada", "Aguardar 48 horas para confirmar a cultura"],
    answer: 0, explanation: "Na sepse, antimicrobianos adequados e ressuscitação hemodinâmica devem ser iniciados precocemente; a coleta de culturas não deve atrasar o tratamento."
  },
  {
    id: "omed-cir-01", area: "Cirurgia Geral", topic: "Vias biliares", difficulty: "Média", tag: "OMED",
    text: "Paciente apresenta febre, dor em hipocôndrio direito e icterícia. Evolui com hipotensão e alteração do nível de consciência. Qual é a prioridade terapêutica após estabilização inicial e antibiótico?",
    options: ["Descompressão urgente da via biliar", "Colecistectomia eletiva em seis meses", "Apenas analgesia", "Biópsia hepática"],
    answer: 0, explanation: "Pentade de Reynolds sugere colangite grave. Além de suporte e antibiótico, é necessária drenagem urgente da via biliar."
  },
  {
    id: "omed-cir-02", area: "Cirurgia Geral", topic: "Trauma", difficulty: "Difícil", tag: "OMED",
    text: "Após trauma torácico, paciente apresenta dispneia intensa, hipotensão, ausência de murmúrio vesicular à direita e turgência jugular. Qual é a próxima conduta?",
    options: ["Aguardar radiografia de tórax", "Descompressão imediata do hemitórax seguida de drenagem", "Solicitar tomografia antes de intervir", "Administrar diurético"],
    answer: 1, explanation: "O pneumotórax hipertensivo é diagnóstico clínico e deve ser descomprimido imediatamente, sem aguardar imagem."
  },
  {
    id: "omed-cir-03", area: "Cirurgia Geral", topic: "Abdome agudo", difficulty: "Média", tag: "OMED",
    text: "Homem apresenta dor abdominal súbita intensa, rigidez involuntária e ar livre subdiafragmático na radiografia. Qual síndrome está presente?",
    options: ["Abdome agudo perfurativo", "Abdome agudo vascular crônico", "Obstrução intestinal simples", "Pancreatite edematosa sem complicação"],
    answer: 0, explanation: "Dor súbita, peritonite e pneumoperitônio são achados típicos de perfuração de víscera oca."
  },
  {
    id: "omed-mfc-01", area: "Medicina de Família e Comunidade", topic: "Delineamentos de estudo", difficulty: "Média", tag: "OMED",
    text: "Pesquisadores selecionam pacientes com câncer de pulmão e indivíduos sem a doença e investigam retrospectivamente a exposição ao tabagismo. Qual é o delineamento?",
    options: ["Coorte prospectiva", "Caso-controle", "Ensaio clínico randomizado", "Estudo ecológico"],
    answer: 1, explanation: "O estudo parte do desfecho, separando casos e controles, e procura retrospectivamente a exposição: desenho caso-controle."
  },
  {
    id: "omed-mfc-02", area: "Medicina de Família e Comunidade", topic: "Testes diagnósticos", difficulty: "Difícil", tag: "OMED",
    text: "Um teste de rastreamento é aplicado em população de baixa prevalência. Mantidas sensibilidade e especificidade, qual medida tende a diminuir?",
    options: ["Valor preditivo positivo", "Sensibilidade", "Especificidade", "Razão de verossimilhança positiva"],
    answer: 0, explanation: "Com menor prevalência, há proporcionalmente mais falsos positivos entre os resultados positivos, reduzindo o valor preditivo positivo."
  },
  {
    id: "omed-mfc-03", area: "Medicina de Família e Comunidade", topic: "Atributos da APS", difficulty: "Fácil", tag: "OMED",
    text: "Uma equipe acompanha a mesma pessoa ao longo de vários anos, inclusive entre episódios de adoecimento. Qual atributo essencial da APS é demonstrado?",
    options: ["Longitudinalidade", "Regionalização", "Descentralização", "Participação social"],
    answer: 0, explanation: "Longitudinalidade é a relação continuada entre equipe e usuário ao longo do tempo."
  },
  {
    id: "omed-neuro-01", area: "Neurologia", topic: "AVC isquêmico", difficulty: "Média", tag: "OMED",
    text: "Paciente chega 80 minutos após início de afasia e hemiparesia. A glicemia é normal. Qual é o primeiro exame de imagem na avaliação aguda?",
    options: ["TC de crânio sem contraste", "Radiografia de crânio", "PET cerebral", "Eletroencefalograma"],
    answer: 0, explanation: "A TC sem contraste é realizada inicialmente para excluir hemorragia e permitir decisão rápida sobre reperfusão."
  },
  {
    id: "omed-neuro-02", area: "Neurologia", topic: "Status epilepticus", difficulty: "Média", tag: "OMED",
    text: "Adulto mantém crise tônico-clônica generalizada há seis minutos. Qual é o tratamento farmacológico inicial?",
    options: ["Benzodiazepínico", "Haloperidol", "Levodopa", "Acetazolamida"],
    answer: 0, explanation: "Crise com duração de cinco minutos ou mais deve ser tratada como estado de mal epiléptico, iniciando benzodiazepínico."
  },
  {
    id: "omed-neuro-03", area: "Neurologia", topic: "Cefaleias", difficulty: "Difícil", tag: "OMED",
    text: "Homem hipertenso relata a pior cefaleia da vida, de início abrupto durante esforço, associada a vômitos e rigidez de nuca. Qual hipótese deve ser excluída prioritariamente?",
    options: ["Cefaleia tensional", "Hemorragia subaracnóidea", "Neuralgia do trigêmeo", "Cefaleia por abuso de analgésico"],
    answer: 1, explanation: "Cefaleia em trovoada, vômitos e meningismo são sinais clássicos de hemorragia subaracnóidea."
  },
  {
    id: "omed-go-01", area: "Ginecologia e Obstetrícia", topic: "Pré-eclâmpsia", difficulty: "Média", tag: "OMED",
    text: "Gestante de 31 semanas apresenta PA 162×108 mmHg, cefaleia persistente e escotomas. A proteinúria é negativa. Qual afirmação é correta?",
    options: ["A ausência de proteinúria exclui pré-eclâmpsia", "O quadro é compatível com pré-eclâmpsia com sinais de gravidade", "Trata-se obrigatoriamente de hipertensão crônica", "Não há necessidade de avaliação hospitalar"],
    answer: 1, explanation: "Proteinúria não é obrigatória quando há hipertensão após 20 semanas associada a disfunção orgânica; sintomas neurológicos e PA grave são sinais de gravidade."
  },
  {
    id: "omed-go-02", area: "Ginecologia e Obstetrícia", topic: "Gravidez ectópica", difficulty: "Média", tag: "OMED",
    text: "Mulher com atraso menstrual, dor pélvica e sangramento apresenta teste de gravidez positivo. Está hemodinamicamente instável e há líquido livre abdominal. Qual é a conduta?",
    options: ["Tratamento cirúrgico de emergência", "Metotrexato ambulatorial", "Repetir beta-hCG em uma semana", "Prescrever anticoncepcional combinado"],
    answer: 0, explanation: "Instabilidade e suspeita de ruptura tornam a gravidez ectópica uma emergência cirúrgica."
  },
  {
    id: "omed-go-03", area: "Ginecologia e Obstetrícia", topic: "Doença inflamatória pélvica", difficulty: "Média", tag: "OMED",
    text: "Mulher sexualmente ativa apresenta dor pélvica, febre, corrimento e dor à mobilização do colo uterino. Qual é a conduta mais adequada diante da suspeita clínica?",
    options: ["Iniciar tratamento antimicrobiano empírico", "Aguardar obrigatoriamente cultura positiva", "Indicar histerectomia", "Tratar apenas com antifúngico"],
    answer: 0, explanation: "A DIP é um diagnóstico predominantemente clínico e o tratamento empírico precoce reduz sequelas como infertilidade e dor crônica."
  },
  {
    id: "omed-prenatal-01", area: "Ginecologia e Obstetrícia", topic: "Assistência pré-natal", difficulty: "Fácil", tag: "OMED",
    text: "Gestante sem comorbidades inicia acompanhamento com 10 semanas. Qual medida melhor representa um indicador central de qualidade da assistência?",
    options: ["Captação precoce no primeiro trimestre", "Realizar todas as consultas apenas no terceiro trimestre", "Evitar estratificação de risco", "Solicitar exames somente quando surgirem sintomas"],
    answer: 0, explanation: "A captação até 12 semanas permite estratificação precoce, rastreamentos e profilaxias no momento adequado."
  },
  {
    id: "omed-prenatal-02", area: "Ginecologia e Obstetrícia", topic: "Diabetes gestacional", difficulty: "Média", tag: "OMED",
    text: "Gestante com hiperglicemia detectada durante o pré-natal inicia tratamento não farmacológico. Qual é a primeira abordagem habitual?",
    options: ["Orientação alimentar, atividade física apropriada e monitorização glicêmica", "Suspensão completa de carboidratos", "Parto imediato", "Uso obrigatório de estatina"],
    answer: 0, explanation: "Na ausência de hiperglicemia grave, o manejo inicial inclui plano alimentar, exercício seguro e monitorização, com escalonamento se as metas não forem alcançadas."
  },
  {
    id: "omed-prenatal-03", area: "Ginecologia e Obstetrícia", topic: "Vacinação na gestação", difficulty: "Média", tag: "OMED",
    text: "Durante o pré-natal, qual tipo de vacina é geralmente contraindicado por conter agente vivo atenuado?",
    options: ["Vacina tríplice viral", "Vacina inativada contra influenza", "dTpa", "Vacina recombinante contra hepatite B"],
    answer: 0, explanation: "Vacinas de vírus vivos atenuados, como a tríplice viral, são geralmente contraindicadas durante a gestação."
  },
  {
    id: "omed-psiq-01", area: "Psiquiatria", topic: "Transtorno bipolar", difficulty: "Média", tag: "OMED",
    text: "Paciente apresenta há oito dias redução da necessidade de sono, grandiosidade, pressão de fala e gastos excessivos, com grave prejuízo funcional. Qual diagnóstico é mais provável?",
    options: ["Episódio maníaco", "Episódio hipomaníaco", "Transtorno de ansiedade generalizada", "Distimia"],
    answer: 0, explanation: "Duração de pelo menos sete dias e prejuízo funcional grave caracterizam mania; um episódio maníaco define transtorno bipolar tipo I."
  },
  {
    id: "omed-reumato-01", area: "Reumatologia", topic: "Artrite reumatoide", difficulty: "Média", tag: "OMED",
    text: "Mulher apresenta poliartrite simétrica de pequenas articulações das mãos e rigidez matinal prolongada há quatro meses. Qual estratégia modifica a evolução da doença?",
    options: ["Iniciar precocemente um fármaco modificador de doença", "Usar somente analgésico quando houver dor", "Imobilizar definitivamente as mãos", "Prescrever antibiótico de amplo espectro"],
    answer: 0, explanation: "A introdução precoce de DMARD, frequentemente metotrexato quando apropriado, reduz dano estrutural e incapacidade."
  },
  {
    id: "omed-endo-01", area: "Endocrinologia", topic: "Tireotoxicose", difficulty: "Difícil", tag: "OMED",
    text: "Paciente com hipertireoidismo apresenta febre alta, agitação, vômitos e taquiarritmia após uma cirurgia. Qual síndrome deve ser reconhecida?",
    options: ["Crise tireotóxica", "Coma mixedematoso", "Insuficiência adrenal crônica estável", "Síndrome de secreção inapropriada de ADH"],
    answer: 0, explanation: "Descompensação sistêmica aguda com febre, alteração neurológica e disfunção cardiovascular em hipertireoidismo sugere tempestade tireotóxica."
  },
  {
    id: "omed-nefro-01", area: "Nefrologia", topic: "Indicações de diálise", difficulty: "Média", tag: "OMED",
    text: "Paciente com doença renal avançada apresenta confusão, asterixis e atrito pericárdico. Qual é a conduta definitiva mais adequada?",
    options: ["Iniciar terapia dialítica", "Apenas restringir sódio", "Aumentar ingestão proteica", "Aguardar a creatinina dobrar"],
    answer: 0, explanation: "Encefalopatia e pericardite urêmicas são indicações clínicas de diálise, independentemente de um valor isolado de creatinina."
  },
  {
    id: "omed-hemato-01", area: "Hematologia", topic: "Síndrome de lise tumoral", difficulty: "Difícil", tag: "OMED",
    text: "Após quimioterapia para linfoma de alto grau, paciente evolui com hipercalemia, hiperfosfatemia, hipocalcemia e elevação do ácido úrico. Qual é o diagnóstico?",
    options: ["Síndrome de lise tumoral", "Coagulação intravascular disseminada isolada", "Anemia hemolítica autoimune", "Síndrome nefrótica"],
    answer: 0, explanation: "A liberação maciça do conteúdo intracelular após destruição tumoral causa o padrão metabólico clássico da síndrome de lise tumoral."
  },
  {
    id: "omed-onco-01", area: "Oncologia", topic: "Oncogênese", difficulty: "Média", tag: "OMED",
    text: "Uma criança herda uma cópia defeituosa de um gene supressor tumoral e desenvolve tumor após perda somática da segunda cópia. Qual conceito explica o fenômeno?",
    options: ["Hipótese dos dois eventos de Knudson", "Efeito fundador infeccioso", "Dominância mitocondrial", "Seleção negativa de anticorpos"],
    answer: 0, explanation: "A hipótese de Knudson propõe a inativação das duas cópias de um gene supressor tumoral; o primeiro evento pode ser germinativo e o segundo somático."
  }
];

const evidenceByArea = {
  "Cardiologia": "edital OMED Ciclo Clínico; diretrizes cardiovasculares vigentes",
  "Pneumologia": "edital OMED; GINA 2025; GOLD 2026",
  "Nefrologia": "edital OMED; KDIGO 2024",
  "Urgência e Emergência": "edital OMED; AHA Guidelines for CPR and ECC 2025",
  "Pediatria": "edital OMED; protocolos do Ministério da Saúde e da Sociedade Brasileira de Pediatria",
  "Neonatologia": "edital OMED; diretrizes de reanimação neonatal e Sociedade Brasileira de Pediatria",
  "Obstetrícia": "edital OMED; diretrizes nacionais de assistência à gestação e ao parto",
  "Ginecologia": "edital OMED; recomendações FEBRASGO",
  "Infectologia": "edital OMED; PCDT do Ministério da Saúde",
  "Oncologia": "edital OMED; Diretrizes Diagnósticas e Terapêuticas do Ministério da Saúde",
  "Medicina de Família e Comunidade": "edital OMED; protocolos e linhas de cuidado do Ministério da Saúde"
};

function addEvidence(question) {
  const source = evidenceByArea[question.area] || "edital OMED Ciclo Clínico; protocolos e diretrizes oficiais da área";
  if (question.explanation?.includes("Fonte-base:")) return question;
  return {
    ...question,
    explanation: `${question.explanation} Fonte-base: ${source}.`
  };
}

function normalizeQuestionText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const omedQuestions = [...new Map(
  [...coreOmedQuestions, ...omedSupplemental, ...omedClinicalQuestions, ...omedProfileQuestions, ...mentalHealthQuestions]
    .map(addEvidence)
    .map(question => [normalizeQuestionText(question.text), question])
).values()];
