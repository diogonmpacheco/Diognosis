// Diognosis — Core app state management and main render loop
// Phase A: modular source — concatenated by build.js

function addDrug(name) {
  if (!activeStack.includes(name)) {
    activeStack.push(name);
    document.getElementById("searchInput").value = "";
    document.getElementById("searchResults").classList.remove("show");
    renderAll();
  }
}

function removeDrug(name) {
  activeStack = activeStack.filter(n => n !== name);
  delete drugDoses[name];
  renderAll();
}

function addFoodActor(id) {
  const actor = typeof getSupplementActor === "function" ? getSupplementActor(id) : null;
  const actorId = actor ? actor.id : id;
  if (!activeStack.includes(actorId)) {
    activeStack.push(actorId);
    document.getElementById("searchInput").value = "";
    document.getElementById("searchResults").classList.remove("show");
    renderAll();
  }
}

function removeFoodActor(id) {
  const actor = typeof getSupplementActor === "function" ? getSupplementActor(id) : null;
  const actorId = actor ? actor.id : id;
  activeStack = activeStack.filter(n => {
    const selectedActor = typeof getStackSupplementActor === "function" ? getStackSupplementActor(n) : null;
    return (selectedActor ? selectedActor.id : n) !== actorId;
  });
  renderAll();
}

function swapDrug(oldName, newName) {
  const idx = activeStack.indexOf(oldName);
  if (idx >= 0) activeStack[idx] = newName;
  else activeStack.push(newName);
  renderAll();
}

let viewMode = "search";
let activeTab = "overview";
let audienceMode = "clinician";
let languageMode = "en";
let currentInteractionFindings = [];
let currentClinicalConcerns = [];
let currentPublicFindingPresentations = [];
let renderComputationCache = null;
let lazyRenderState = { evidenceKey:"", reviewKey:"" };
let manualSectionToggleKeys = {};
const DIOGNOSIS_TABS = ["overview","mechanisms","genes-metabolites","timing-levels","evidence","review"];
const AUDIENCE_MODES = ["patient","clinician"];
const LANGUAGE_MODES = ["en","pt","es","zh","hi","ar","fr"];
const LANGUAGE_LABELS = {
  en:"English",
  pt:"Português",
  es:"Español",
  zh:"中文",
  hi:"हिन्दी",
  ar:"العربية",
  fr:"Français",
};
const UI_TEXT = {
  en:{
    languageLabel:"Language",
    searchPlaceholder:"Search medications, supplements, foods...",
    searchMode:"Search",
    browseMode:"Browse by Category",
    audienceLabel:"Audience",
    patientAudience:"Patient",
    clinicianAudience:"Clinician",
    tabOverview:"Overview",
    tabMechanisms:"Mechanisms",
    tabGenes:"Genes + Metabolites",
    tabTiming:"Timing + Levels",
    tabEvidence:"Evidence",
    tabReview:"Review",
    findingTitlePatient:"Safety Notes",
    findingTitleClinician:"Interaction Findings",
    mainSafetyNote:"Main Safety Note",
    highestPriority:"Highest Priority",
    viewNote:"View note",
    viewFinding:"View finding",
    nextStep:"Next step",
    nextReview:"Next review",
    add2:"Add 2+",
    highPriorityInteractionFound:"High-priority interaction found",
    monitoringMayBeNeeded:"Some monitoring may be needed",
    noMajorInteractionSignalFound:"No major interaction signal found",
    checkedNoSevere:"Checked {count} substances. Diognosis did not find a severe pairwise interaction, but genotype, transporter, metabolite, and dose context may still matter.",
    severeFindingsSummary:"{count} severe finding{plural}{pairs}. Review the findings before changing doses or adding more substances.",
    startSevereFindings:"Start with the severe findings, then review genotype-adjusted levels.",
    reviewLevelChanges:"Review level changes and genotype notes for dose-sensitive substances.",
    addAnotherSubstanceHeadline:"Add another substance to check interactions",
    singleSubstanceContext:"Single-substance pharmacogenomic, metabolite, and PK context appears below when available. Interaction risk needs at least two substances.",
    addSecondSubstance:"Add a second medication, supplement, herb, food, or recreational substance.",
    alsoCheckPrefix:"Also check:",
    noFindingsPatient:"No safety notes for this list yet. Gene, metabolite, timing, and dose context may still matter.",
    noFindingsClinical:"No interaction findings for this stack yet. Evidence, genetics, metabolite, and timing context may still matter.",
    findingCount:"{count} concern{plural}",
    groupedConcernsMore:"Showing 8 of {count} grouped concerns. Detailed technical context is available in Review.",
    overviewGroupsConcerns:"Overview groups related pathway, metabolite, timing, and evidence signals into clinical concerns. Technical details remain available in Review.",
    whatThisMeans:"What this means",
    whatChanged:"What changed",
    whyItMatters:"Why it matters",
    whatToAsk:"What to ask",
    whatToReview:"What to review",
    evidence:"Evidence",
    supportingDetail:"Supporting detail",
    currentStack:"current stack",
    whyThisMatters:"Why this matters",
    whatChanges:"What changes",
    nextReviewStep:"Next review step",
    noMatches:"No matches found",
    medEmpty:"Add medications, supplements, or foods above to see how they interact",
    patientBleedingSerious:"This combination may raise bleeding or clotting-related risk and may need closer monitoring.",
    patientBleedingMonitor:"This combination may affect bleeding or clotting-related monitoring.",
    patientRhythmSerious:"This combination may increase heart-rhythm risk and should be checked carefully.",
    patientRhythmMonitor:"This combination may add heart-rhythm monitoring concerns.",
    patientSerotonin:"This combination may add serotonin-related side-effect risk.",
    patientSedation:"This combination may increase sleepiness, confusion, breathing, or fall risk.",
    patientExposure:"This may change how strongly a medication works or how long it stays active.",
    patientImportant:"This is the most important safety note found for the current list.",
    patientSafetyNote:"This is a safety note to review for the current list.",
    patientDifferentPlan:"The combination may need a different plan, extra monitoring, or professional review before use.",
    patientContextMatters:"The same medication can behave differently depending on the full list, dose, timing, and gene results.",
    patientAskGeneric:"Ask a doctor or pharmacist whether this medication list needs a different plan, dose, timing, or monitoring.",
    patientAskAbout:"Ask a doctor or pharmacist about {topic}.",
  },
  pt:{
    languageLabel:"Idioma",
    searchPlaceholder:"Pesquisar medicamentos, suplementos e alimentos...",
    searchMode:"Pesquisar",
    browseMode:"Ver por categoria",
    audienceLabel:"Público",
    patientAudience:"Paciente",
    clinicianAudience:"Clínico",
    tabOverview:"Resumo",
    tabMechanisms:"Mecanismos",
    tabGenes:"Genes + Metabólitos",
    tabTiming:"Tempo + Níveis",
    tabEvidence:"Evidência",
    tabReview:"Revisão",
    findingTitlePatient:"Notas de segurança",
    findingTitleClinician:"Achados de interação",
    mainSafetyNote:"Principal nota de segurança",
    highestPriority:"Maior prioridade",
    viewNote:"Ver nota",
    viewFinding:"Ver achado",
    nextStep:"Próximo passo",
    nextReview:"Próxima revisão",
    add2:"Adicione 2+",
    highPriorityInteractionFound:"Interação importante encontrada",
    monitoringMayBeNeeded:"Pode ser necessário acompanhamento",
    noMajorInteractionSignalFound:"Nenhum sinal importante de interação encontrado",
    checkedNoSevere:"Foram verificados {count} itens. O Diognosis não encontrou uma interação grave direta, mas genes, vias de transporte, metabólitos e dose ainda podem importar.",
    severeFindingsSummary:"{count} achado(s) grave(s){pairs}. Revise estes achados antes de mudar doses ou adicionar mais itens.",
    startSevereFindings:"Comece pelos achados graves e depois revise os níveis ajustados por genes.",
    reviewLevelChanges:"Revise mudanças de níveis e notas genéticas para medicamentos sensíveis à dose.",
    addAnotherSubstanceHeadline:"Adicione outro item para verificar interações",
    singleSubstanceContext:"Contexto de genes, metabólitos e níveis aparece abaixo quando disponível. Para risco de interação, são necessários pelo menos dois itens.",
    addSecondSubstance:"Adicione um segundo medicamento, suplemento, erva, alimento ou substância recreativa.",
    alsoCheckPrefix:"Verifique também:",
    noFindingsPatient:"Ainda não há notas de segurança para esta lista. Genes, metabólitos, tempo e dose ainda podem importar.",
    noFindingsClinical:"Ainda não há achados de interação para esta lista. Evidência, genética, metabólitos e tempo ainda podem importar.",
    findingCount:"{count} alerta(s)",
    groupedConcernsMore:"Mostrando 8 de {count} alertas agrupados. O detalhe técnico está disponível em Revisão.",
    overviewGroupsConcerns:"O resumo agrupa sinais relacionados a vias, metabólitos, tempo e evidência. Detalhes técnicos permanecem em Revisão.",
    whatThisMeans:"O que isto significa",
    whatChanged:"O que mudou",
    whyItMatters:"Por que importa",
    whatToAsk:"O que perguntar",
    whatToReview:"O que revisar",
    evidence:"Evidência",
    supportingDetail:"Detalhe de apoio",
    currentStack:"lista atual",
    whyThisMatters:"Por que isto importa",
    whatChanges:"O que muda",
    nextReviewStep:"Próximo passo de revisão",
    noMatches:"Nenhum resultado encontrado",
    medEmpty:"Adicione medicamentos, suplementos ou alimentos acima para ver como interagem",
    patientBleedingSerious:"Esta combinação pode aumentar risco ligado a sangramento ou coagulação e pode precisar de acompanhamento mais próximo.",
    patientBleedingMonitor:"Esta combinação pode afetar o acompanhamento de sangramento ou coagulação.",
    patientRhythmSerious:"Esta combinação pode aumentar risco de ritmo cardíaco e deve ser verificada com cuidado.",
    patientRhythmMonitor:"Esta combinação pode acrescentar preocupações de acompanhamento do ritmo cardíaco.",
    patientSerotonin:"Esta combinação pode aumentar risco de efeitos relacionados à serotonina.",
    patientSedation:"Esta combinação pode aumentar sonolência, confusão, problemas de respiração ou risco de queda.",
    patientExposure:"Isto pode mudar a força ou a duração do efeito de um medicamento.",
    patientImportant:"Esta é a nota de segurança mais importante encontrada para a lista atual.",
    patientSafetyNote:"Esta é uma nota de segurança para revisar na lista atual.",
    patientDifferentPlan:"A combinação pode precisar de outro plano, acompanhamento extra ou revisão profissional antes do uso.",
    patientContextMatters:"O mesmo medicamento pode agir de forma diferente conforme a lista completa, dose, horário e resultados genéticos.",
    patientAskGeneric:"Pergunte a um médico ou farmacêutico se esta lista precisa de outro plano, dose, horário ou acompanhamento.",
    patientAskAbout:"Pergunte a um médico ou farmacêutico sobre {topic}.",
  },
  es:{
    languageLabel:"Idioma",
    searchPlaceholder:"Buscar medicamentos, suplementos y alimentos...",
    searchMode:"Buscar",
    browseMode:"Ver por categoría",
    audienceLabel:"Audiencia",
    patientAudience:"Paciente",
    clinicianAudience:"Clínico",
    tabOverview:"Resumen",
    tabMechanisms:"Mecanismos",
    tabGenes:"Genes + Metabolitos",
    tabTiming:"Tiempo + Niveles",
    tabEvidence:"Evidencia",
    tabReview:"Revisión",
    findingTitlePatient:"Notas de seguridad",
    findingTitleClinician:"Hallazgos de interacción",
    mainSafetyNote:"Nota principal de seguridad",
    highestPriority:"Prioridad principal",
    viewNote:"Ver nota",
    viewFinding:"Ver hallazgo",
    nextStep:"Siguiente paso",
    nextReview:"Siguiente revisión",
    add2:"Añada 2+",
    highPriorityInteractionFound:"Se encontró una interacción importante",
    monitoringMayBeNeeded:"Puede ser necesario seguimiento",
    noMajorInteractionSignalFound:"No se encontró una señal importante de interacción",
    checkedNoSevere:"Se revisaron {count} sustancias. Diognosis no encontró una interacción directa grave, pero genes, transportadores, metabolitos y dosis aún pueden importar.",
    severeFindingsSummary:"{count} hallazgo(s) grave(s){pairs}. Revise estos hallazgos antes de cambiar dosis o añadir más sustancias.",
    startSevereFindings:"Empiece por los hallazgos graves y luego revise los niveles ajustados por genes.",
    reviewLevelChanges:"Revise cambios de niveles y notas genéticas para sustancias sensibles a la dosis.",
    addAnotherSubstanceHeadline:"Añada otra sustancia para revisar interacciones",
    singleSubstanceContext:"El contexto de genes, metabolitos y niveles aparece abajo cuando está disponible. El riesgo de interacción necesita al menos dos sustancias.",
    addSecondSubstance:"Añada un segundo medicamento, suplemento, hierba, alimento o sustancia recreativa.",
    alsoCheckPrefix:"Revise también:",
    noFindingsPatient:"Aún no hay notas de seguridad para esta lista. Genes, metabolitos, tiempo y dosis aún pueden importar.",
    noFindingsClinical:"Aún no hay hallazgos de interacción para esta lista. Evidencia, genética, metabolitos y tiempo aún pueden importar.",
    findingCount:"{count} nota(s)",
    groupedConcernsMore:"Se muestran 8 de {count} notas agrupadas. El detalle técnico está disponible en Revisión.",
    overviewGroupsConcerns:"El resumen agrupa señales relacionadas con vías, metabolitos, tiempo y evidencia. Los detalles técnicos siguen en Revisión.",
    whatThisMeans:"Qué significa",
    whatChanged:"Qué cambió",
    whyItMatters:"Por qué importa",
    whatToAsk:"Qué preguntar",
    whatToReview:"Qué revisar",
    evidence:"Evidencia",
    supportingDetail:"Detalle de apoyo",
    currentStack:"lista actual",
    whyThisMatters:"Por qué esto importa",
    whatChanges:"Qué cambia",
    nextReviewStep:"Siguiente paso de revisión",
    noMatches:"No se encontraron resultados",
    medEmpty:"Añada medicamentos, suplementos o alimentos arriba para ver cómo interactúan",
    patientBleedingSerious:"Esta combinación puede aumentar el riesgo relacionado con sangrado o coagulación y puede necesitar seguimiento más cercano.",
    patientBleedingMonitor:"Esta combinación puede afectar el seguimiento de sangrado o coagulación.",
    patientRhythmSerious:"Esta combinación puede aumentar el riesgo de ritmo cardíaco y debe revisarse con cuidado.",
    patientRhythmMonitor:"Esta combinación puede añadir preocupaciones de seguimiento del ritmo cardíaco.",
    patientSerotonin:"Esta combinación puede aumentar el riesgo de efectos relacionados con la serotonina.",
    patientSedation:"Esta combinación puede aumentar somnolencia, confusión, problemas respiratorios o riesgo de caídas.",
    patientExposure:"Esto puede cambiar la fuerza o la duración del efecto de un medicamento.",
    patientImportant:"Esta es la nota de seguridad más importante encontrada para la lista actual.",
    patientSafetyNote:"Esta es una nota de seguridad para revisar en la lista actual.",
    patientDifferentPlan:"La combinación puede necesitar otro plan, seguimiento adicional o revisión profesional antes de usarla.",
    patientContextMatters:"El mismo medicamento puede comportarse de forma diferente según la lista completa, dosis, horario y resultados genéticos.",
    patientAskGeneric:"Pregunte a un médico o farmacéutico si esta lista necesita otro plan, dosis, horario o seguimiento.",
    patientAskAbout:"Pregunte a un médico o farmacéutico sobre {topic}.",
  },
  zh:{
    languageLabel:"语言",
    searchPlaceholder:"搜索药物、补充剂、食物...",
    searchMode:"搜索",
    browseMode:"按类别浏览",
    audienceLabel:"受众",
    patientAudience:"患者",
    clinicianAudience:"临床",
    tabOverview:"概览",
    tabMechanisms:"机制",
    tabGenes:"基因 + 代谢物",
    tabTiming:"时间 + 水平",
    tabEvidence:"证据",
    tabReview:"审核",
    findingTitlePatient:"安全提示",
    findingTitleClinician:"相互作用发现",
    mainSafetyNote:"主要安全提示",
    highestPriority:"最高优先级",
    viewNote:"查看提示",
    viewFinding:"查看发现",
    nextStep:"下一步",
    nextReview:"下一项审核",
    add2:"添加 2 个以上",
    highPriorityInteractionFound:"发现重要相互作用",
    monitoringMayBeNeeded:"可能需要监测",
    noMajorInteractionSignalFound:"未发现主要相互作用信号",
    checkedNoSevere:"已检查 {count} 个项目。Diognosis 未发现严重的直接相互作用，但基因、转运、代谢物和剂量仍可能重要。",
    severeFindingsSummary:"{count} 条严重发现{pairs}。更改剂量或添加项目之前，请先复查。",
    startSevereFindings:"先查看严重发现，再查看按基因调整后的水平。",
    reviewLevelChanges:"查看水平变化和对剂量敏感药物的基因提示。",
    addAnotherSubstanceHeadline:"添加另一个项目以检查相互作用",
    singleSubstanceContext:"有可用信息时，下方会显示基因、代谢物和药物水平背景。相互作用风险至少需要两个项目。",
    addSecondSubstance:"添加第二种药物、补充剂、草药、食物或娱乐性物质。",
    alsoCheckPrefix:"还要查看：",
    noFindingsPatient:"此列表目前没有安全提示。基因、代谢物、时间和剂量仍可能重要。",
    noFindingsClinical:"此列表目前没有相互作用发现。证据、遗传、代谢物和时间背景仍可能重要。",
    findingCount:"{count} 条提示",
    groupedConcernsMore:"显示 {count} 条分组提示中的 8 条。技术细节在“审核”中。",
    overviewGroupsConcerns:"概览会把通路、代谢物、时间和证据相关信号分组。技术细节仍在“审核”中。",
    whatThisMeans:"这意味着什么",
    whatChanged:"发生了什么变化",
    whyItMatters:"为什么重要",
    whatToAsk:"该问什么",
    whatToReview:"要复查什么",
    evidence:"证据",
    supportingDetail:"支持细节",
    currentStack:"当前列表",
    whyThisMatters:"为什么重要",
    whatChanges:"会改变什么",
    nextReviewStep:"下一步审核",
    noMatches:"未找到匹配项",
    medEmpty:"在上方添加药物、补充剂或食物，以查看它们如何相互作用",
    patientBleedingSerious:"这种组合可能增加出血或凝血相关风险，可能需要更密切监测。",
    patientBleedingMonitor:"这种组合可能影响出血或凝血相关监测。",
    patientRhythmSerious:"这种组合可能增加心律风险，应仔细核对。",
    patientRhythmMonitor:"这种组合可能增加心律监测方面的注意事项。",
    patientSerotonin:"这种组合可能增加与血清素相关的副作用风险。",
    patientSedation:"这种组合可能增加嗜睡、意识混乱、呼吸问题或跌倒风险。",
    patientExposure:"这可能改变药物作用强度或持续时间。",
    patientImportant:"这是当前列表中最重要的安全提示。",
    patientSafetyNote:"这是当前列表中需要复查的安全提示。",
    patientDifferentPlan:"这种组合在使用前可能需要不同方案、额外监测或专业人员复查。",
    patientContextMatters:"同一种药物的表现可能因完整用药列表、剂量、时间和基因结果而不同。",
    patientAskGeneric:"请咨询医生或药师：此列表是否需要不同方案、剂量、时间安排或监测。",
    patientAskAbout:"请咨询医生或药师关于 {topic}。",
  },
  hi:{
    languageLabel:"भाषा",
    searchPlaceholder:"दवाएं, सप्लीमेंट, भोजन खोजें...",
    searchMode:"खोजें",
    browseMode:"श्रेणी से देखें",
    audienceLabel:"दर्शक",
    patientAudience:"मरीज़",
    clinicianAudience:"क्लिनिशियन",
    tabOverview:"सारांश",
    tabMechanisms:"तरीके",
    tabGenes:"जीन + मेटाबोलाइट",
    tabTiming:"समय + स्तर",
    tabEvidence:"साक्ष्य",
    tabReview:"समीक्षा",
    findingTitlePatient:"सुरक्षा नोट",
    findingTitleClinician:"इंटरैक्शन निष्कर्ष",
    mainSafetyNote:"मुख्य सुरक्षा नोट",
    highestPriority:"सबसे अधिक प्राथमिकता",
    viewNote:"नोट देखें",
    viewFinding:"निष्कर्ष देखें",
    nextStep:"अगला कदम",
    nextReview:"अगली समीक्षा",
    add2:"2+ जोड़ें",
    highPriorityInteractionFound:"महत्वपूर्ण इंटरैक्शन मिला",
    monitoringMayBeNeeded:"निगरानी की ज़रूरत हो सकती है",
    noMajorInteractionSignalFound:"कोई बड़ा इंटरैक्शन संकेत नहीं मिला",
    checkedNoSevere:"{count} चीज़ें जांची गईं। Diognosis को कोई गंभीर सीधा इंटरैक्शन नहीं मिला, लेकिन जीन, ट्रांसपोर्टर, मेटाबोलाइट और खुराक अब भी मायने रख सकते हैं।",
    severeFindingsSummary:"{count} गंभीर नोट{pairs}। खुराक बदलने या और चीज़ें जोड़ने से पहले इन्हें देखें।",
    startSevereFindings:"पहले गंभीर नोट देखें, फिर जीन के अनुसार बदले स्तर देखें।",
    reviewLevelChanges:"खुराक-संवेदनशील दवाओं के लिए स्तर बदलाव और जीन नोट देखें।",
    addAnotherSubstanceHeadline:"इंटरैक्शन देखने के लिए एक और चीज़ जोड़ें",
    singleSubstanceContext:"उपलब्ध होने पर जीन, मेटाबोलाइट और स्तर की जानकारी नीचे दिखेगी। इंटरैक्शन जोखिम के लिए कम से कम दो चीज़ें चाहिए।",
    addSecondSubstance:"दूसरी दवा, सप्लीमेंट, जड़ी-बूटी, भोजन या मनोरंजक पदार्थ जोड़ें।",
    alsoCheckPrefix:"यह भी देखें:",
    noFindingsPatient:"इस सूची के लिए अभी कोई सुरक्षा नोट नहीं है। जीन, मेटाबोलाइट, समय और खुराक अब भी मायने रख सकते हैं।",
    noFindingsClinical:"इस सूची के लिए अभी कोई इंटरैक्शन निष्कर्ष नहीं है। साक्ष्य, जीन, मेटाबोलाइट और समय अब भी मायने रख सकते हैं।",
    findingCount:"{count} सुरक्षा नोट",
    groupedConcernsMore:"{count} समूहित नोटों में से 8 दिखाए जा रहे हैं। तकनीकी विवरण समीक्षा में हैं।",
    overviewGroupsConcerns:"सारांश रास्तों, मेटाबोलाइट, समय और साक्ष्य संकेतों को समूहित करता है। तकनीकी विवरण समीक्षा में रहते हैं।",
    whatThisMeans:"इसका मतलब",
    whatChanged:"क्या बदला",
    whyItMatters:"यह क्यों मायने रखता है",
    whatToAsk:"क्या पूछें",
    whatToReview:"क्या समीक्षा करें",
    evidence:"साक्ष्य",
    supportingDetail:"सहायक विवरण",
    currentStack:"मौजूदा सूची",
    whyThisMatters:"यह क्यों मायने रखता है",
    whatChanges:"क्या बदलता है",
    nextReviewStep:"अगला समीक्षा कदम",
    noMatches:"कोई परिणाम नहीं मिला",
    medEmpty:"ऊपर दवाएं, सप्लीमेंट या भोजन जोड़ें ताकि इंटरैक्शन देख सकें",
    patientBleedingSerious:"यह संयोजन खून बहने या थक्का बनने से जुड़े जोखिम को बढ़ा सकता है और अधिक निगरानी की ज़रूरत हो सकती है।",
    patientBleedingMonitor:"यह संयोजन खून बहने या थक्का बनने की निगरानी को प्रभावित कर सकता है।",
    patientRhythmSerious:"यह संयोजन हृदय-ताल जोखिम बढ़ा सकता है और सावधानी से जांचना चाहिए।",
    patientRhythmMonitor:"यह संयोजन हृदय-ताल निगरानी की चिंता जोड़ सकता है।",
    patientSerotonin:"यह संयोजन सेरोटोनिन से जुड़े दुष्प्रभाव का जोखिम बढ़ा सकता है।",
    patientSedation:"यह संयोजन नींद, भ्रम, सांस या गिरने का जोखिम बढ़ा सकता है।",
    patientExposure:"यह बदल सकता है कि दवा कितनी असरदार है या कितनी देर तक सक्रिय रहती है।",
    patientImportant:"यह मौजूदा सूची में मिला सबसे महत्वपूर्ण सुरक्षा नोट है।",
    patientSafetyNote:"यह मौजूदा सूची के लिए समीक्षा योग्य सुरक्षा नोट है।",
    patientDifferentPlan:"इस संयोजन के लिए उपयोग से पहले अलग योजना, अतिरिक्त निगरानी या पेशेवर समीक्षा की ज़रूरत हो सकती है।",
    patientContextMatters:"एक ही दवा पूरी सूची, खुराक, समय और जीन परिणामों के आधार पर अलग तरह से काम कर सकती है।",
    patientAskGeneric:"डॉक्टर या फार्मासिस्ट से पूछें कि क्या इस सूची के लिए अलग योजना, खुराक, समय या निगरानी चाहिए।",
    patientAskAbout:"डॉक्टर या फार्मासिस्ट से {topic} के बारे में पूछें।",
  },
  ar:{
    languageLabel:"اللغة",
    searchPlaceholder:"ابحث عن أدوية أو مكملات أو أطعمة...",
    searchMode:"بحث",
    browseMode:"تصفح حسب الفئة",
    audienceLabel:"الجمهور",
    patientAudience:"المريض",
    clinicianAudience:"الطبيب",
    tabOverview:"ملخص",
    tabMechanisms:"الآليات",
    tabGenes:"الجينات + المستقلبات",
    tabTiming:"التوقيت + المستويات",
    tabEvidence:"الأدلة",
    tabReview:"المراجعة",
    findingTitlePatient:"ملاحظات السلامة",
    findingTitleClinician:"نتائج التداخلات",
    mainSafetyNote:"أهم ملاحظة سلامة",
    highestPriority:"الأولوية الأعلى",
    viewNote:"عرض الملاحظة",
    viewFinding:"عرض النتيجة",
    nextStep:"الخطوة التالية",
    nextReview:"المراجعة التالية",
    add2:"أضف 2+",
    highPriorityInteractionFound:"تم العثور على تداخل مهم",
    monitoringMayBeNeeded:"قد تكون هناك حاجة إلى متابعة",
    noMajorInteractionSignalFound:"لم يتم العثور على إشارة تداخل مهمة",
    checkedNoSevere:"تم فحص {count} عناصر. لم يجد Diognosis تداخلا مباشرا شديدا، لكن الجينات والناقلات والمستقلبات والجرعة قد تبقى مهمة.",
    severeFindingsSummary:"{count} ملاحظة شديدة{pairs}. راجع هذه النتائج قبل تغيير الجرعات أو إضافة عناصر أخرى.",
    startSevereFindings:"ابدأ بالملاحظات الشديدة، ثم راجع المستويات المعدلة حسب الجينات.",
    reviewLevelChanges:"راجع تغيرات المستويات وملاحظات الجينات للأدوية الحساسة للجرعة.",
    addAnotherSubstanceHeadline:"أضف عنصرا آخر لفحص التداخلات",
    singleSubstanceContext:"تظهر معلومات الجينات والمستقلبات والمستويات أدناه عند توفرها. يحتاج خطر التداخل إلى عنصرين على الأقل.",
    addSecondSubstance:"أضف دواء أو مكملا أو عشبة أو طعاما أو مادة ترفيهية ثانية.",
    alsoCheckPrefix:"راجع أيضا:",
    noFindingsPatient:"لا توجد ملاحظات سلامة لهذه القائمة حتى الآن. قد تبقى الجينات والمستقلبات والتوقيت والجرعة مهمة.",
    noFindingsClinical:"لا توجد نتائج تداخل لهذه القائمة حتى الآن. قد تبقى الأدلة والجينات والمستقلبات والتوقيت مهمة.",
    findingCount:"{count} ملاحظة",
    groupedConcernsMore:"يتم عرض 8 من أصل {count} ملاحظات مجمعة. التفاصيل التقنية متاحة في المراجعة.",
    overviewGroupsConcerns:"يلخص العرض إشارات المسارات والمستقلبات والتوقيت والأدلة. تبقى التفاصيل التقنية في المراجعة.",
    whatThisMeans:"ماذا يعني هذا",
    whatChanged:"ما الذي تغير",
    whyItMatters:"لماذا يهم",
    whatToAsk:"ماذا تسأل",
    whatToReview:"ما الذي يجب مراجعته",
    evidence:"الأدلة",
    supportingDetail:"تفاصيل داعمة",
    currentStack:"القائمة الحالية",
    whyThisMatters:"لماذا يهم هذا",
    whatChanges:"ما الذي يتغير",
    nextReviewStep:"خطوة المراجعة التالية",
    noMatches:"لم يتم العثور على نتائج",
    medEmpty:"أضف أدوية أو مكملات أو أطعمة أعلاه لمعرفة كيفية تداخلها",
    patientBleedingSerious:"قد يزيد هذا الجمع خطر النزيف أو التخثر وقد يحتاج إلى متابعة أقرب.",
    patientBleedingMonitor:"قد يؤثر هذا الجمع في متابعة النزيف أو التخثر.",
    patientRhythmSerious:"قد يزيد هذا الجمع خطر اضطراب نظم القلب ويجب فحصه بعناية.",
    patientRhythmMonitor:"قد يضيف هذا الجمع مخاوف تتعلق بمتابعة نظم القلب.",
    patientSerotonin:"قد يزيد هذا الجمع خطر الآثار الجانبية المرتبطة بالسيروتونين.",
    patientSedation:"قد يزيد هذا الجمع النعاس أو التشوش أو مشاكل التنفس أو خطر السقوط.",
    patientExposure:"قد يغير هذا قوة تأثير الدواء أو مدة بقائه فعالا.",
    patientImportant:"هذه أهم ملاحظة سلامة وجدت في القائمة الحالية.",
    patientSafetyNote:"هذه ملاحظة سلامة يجب مراجعتها في القائمة الحالية.",
    patientDifferentPlan:"قد يحتاج هذا الجمع إلى خطة مختلفة أو متابعة إضافية أو مراجعة مهنية قبل الاستخدام.",
    patientContextMatters:"قد يتصرف الدواء نفسه بشكل مختلف حسب القائمة الكاملة والجرعة والتوقيت ونتائج الجينات.",
    patientAskGeneric:"اسأل الطبيب أو الصيدلي إن كانت هذه القائمة تحتاج إلى خطة أو جرعة أو توقيت أو متابعة مختلفة.",
    patientAskAbout:"اسأل الطبيب أو الصيدلي عن {topic}.",
  },
  fr:{
    languageLabel:"Langue",
    searchPlaceholder:"Rechercher médicaments, compléments, aliments...",
    searchMode:"Rechercher",
    browseMode:"Par catégorie",
    audienceLabel:"Public",
    patientAudience:"Patient",
    clinicianAudience:"Clinicien",
    tabOverview:"Résumé",
    tabMechanisms:"Mécanismes",
    tabGenes:"Gènes + Métabolites",
    tabTiming:"Temps + Niveaux",
    tabEvidence:"Preuves",
    tabReview:"Revue",
    findingTitlePatient:"Notes de sécurité",
    findingTitleClinician:"Résultats d'interaction",
    mainSafetyNote:"Note de sécurité principale",
    highestPriority:"Priorité la plus haute",
    viewNote:"Voir la note",
    viewFinding:"Voir le résultat",
    nextStep:"Étape suivante",
    nextReview:"Revue suivante",
    add2:"Ajouter 2+",
    highPriorityInteractionFound:"Interaction importante détectée",
    monitoringMayBeNeeded:"Une surveillance peut être nécessaire",
    noMajorInteractionSignalFound:"Aucun signal majeur d'interaction détecté",
    checkedNoSevere:"{count} éléments vérifiés. Diognosis n'a pas trouvé d'interaction directe grave, mais les gènes, transporteurs, métabolites et doses peuvent encore compter.",
    severeFindingsSummary:"{count} résultat(s) grave(s){pairs}. Revoyez ces résultats avant de changer les doses ou d'ajouter d'autres éléments.",
    startSevereFindings:"Commencez par les résultats graves, puis revoyez les niveaux ajustés selon les gènes.",
    reviewLevelChanges:"Revoyez les changements de niveaux et les notes génétiques pour les médicaments sensibles à la dose.",
    addAnotherSubstanceHeadline:"Ajoutez un autre élément pour vérifier les interactions",
    singleSubstanceContext:"Le contexte génétique, métabolique et PK apparaît ci-dessous lorsqu'il est disponible. Le risque d'interaction demande au moins deux éléments.",
    addSecondSubstance:"Ajoutez un second médicament, complément, aliment, plante ou substance récréative.",
    alsoCheckPrefix:"À vérifier aussi :",
    noFindingsPatient:"Aucune note de sécurité pour cette liste pour l'instant. Les gènes, métabolites, horaires et doses peuvent encore compter.",
    noFindingsClinical:"Aucun résultat d'interaction pour cette liste pour l'instant. Les preuves, gènes, métabolites et horaires peuvent encore compter.",
    findingCount:"{count} note(s)",
    groupedConcernsMore:"Affichage de 8 notes groupées sur {count}. Le détail technique est disponible dans Revue.",
    overviewGroupsConcerns:"Le résumé regroupe les signaux liés aux voies, métabolites, temps et preuves. Les détails techniques restent dans Revue.",
    whatThisMeans:"Ce que cela signifie",
    whatChanged:"Ce qui a changé",
    whyItMatters:"Pourquoi c'est important",
    whatToAsk:"Que demander",
    whatToReview:"Que revoir",
    evidence:"Preuves",
    supportingDetail:"Détail d'appui",
    currentStack:"liste actuelle",
    whyThisMatters:"Pourquoi c'est important",
    whatChanges:"Ce qui change",
    nextReviewStep:"Étape de revue suivante",
    noMatches:"Aucun résultat trouvé",
    medEmpty:"Ajoutez des médicaments, compléments ou aliments ci-dessus pour voir leurs interactions",
    patientBleedingSerious:"Cette association peut augmenter le risque lié au saignement ou à la coagulation et peut nécessiter une surveillance plus étroite.",
    patientBleedingMonitor:"Cette association peut affecter la surveillance du saignement ou de la coagulation.",
    patientRhythmSerious:"Cette association peut augmenter le risque de trouble du rythme cardiaque et doit être vérifiée avec soin.",
    patientRhythmMonitor:"Cette association peut ajouter des points de surveillance du rythme cardiaque.",
    patientSerotonin:"Cette association peut augmenter le risque d'effets liés à la sérotonine.",
    patientSedation:"Cette association peut augmenter somnolence, confusion, problèmes respiratoires ou risque de chute.",
    patientExposure:"Cela peut changer la force d'action d'un médicament ou la durée pendant laquelle il reste actif.",
    patientImportant:"C'est la note de sécurité la plus importante trouvée pour la liste actuelle.",
    patientSafetyNote:"C'est une note de sécurité à revoir pour la liste actuelle.",
    patientDifferentPlan:"Cette association peut nécessiter un autre plan, une surveillance supplémentaire ou une revue professionnelle avant utilisation.",
    patientContextMatters:"Le même médicament peut agir différemment selon la liste complète, la dose, le moment et les résultats génétiques.",
    patientAskGeneric:"Demandez à un médecin ou pharmacien si cette liste nécessite un autre plan, une autre dose, un autre horaire ou une surveillance.",
    patientAskAbout:"Demandez à un médecin ou pharmacien au sujet de {topic}.",
  },
};
const TAB_ALIASES = {
  safety:"overview",
  summary:"overview",
  overview:"overview",
  pgx:"genes-metabolites",
  genetics:"genes-metabolites",
  "genes-metabolites":"genes-metabolites",
  genes:"genes-metabolites",
  metabolites:"genes-metabolites",
  pk:"timing-levels",
  levels:"timing-levels",
  "timing-levels":"timing-levels",
  network:"mechanisms",
  mechanism:"mechanisms",
  mechanisms:"mechanisms",
  evidence:"evidence",
  advanced:"review",
  contributor:"review",
  contributors:"review",
  review:"review",
};

function resolveTabAlias(name) {
  const raw = String(name || "").trim();
  if (DIOGNOSIS_TABS.includes(raw)) return raw;
  const key = raw.toLowerCase();
  return TAB_ALIASES[key] || "overview";
}

function setActiveTab(name) {
  activeTab = resolveTabAlias(name);
  return activeTab;
}

function normalizeAudienceMode(value) {
  const key = String(value || "").trim().toLowerCase();
  if (key === "patient" || key === "simple" || key === "public") return "patient";
  if (key === "clinician" || key === "clinical" || key === "professional" || key === "reviewer") return "clinician";
  return null;
}

function normalizeLanguageMode(value) {
  const key = String(value || "").trim().toLowerCase().replace(/_/g, "-");
  if (!key) return null;
  if (LANGUAGE_MODES.includes(key)) return key;
  if (key === "en-us" || key === "en-gb" || key === "english") return "en";
  if (key === "pt-br" || key === "pt-pt" || key === "portuguese" || key === "portugues" || key === "português") return "pt";
  if (key === "es-es" || key === "es-mx" || key === "spanish" || key === "espanol" || key === "español") return "es";
  if (key === "zh-cn" || key === "zh-hans" || key === "chinese" || key === "mandarin" || key === "simplified-chinese") return "zh";
  if (key === "hindi" || key === "indian" || key === "hi-in") return "hi";
  if (key === "arabic" || key === "ar-sa" || key === "ar-ae") return "ar";
  if (key === "french" || key === "fr-fr" || key === "fr-ca") return "fr";
  return null;
}

function uiText(key, vars = {}) {
  const table = UI_TEXT[languageMode] || UI_TEXT.en;
  let text = table[key] ?? UI_TEXT.en[key] ?? key;
  Object.entries(vars || {}).forEach(([name, value]) => {
    text = text.replace(new RegExp(`\\{${name}\\}`, "g"), String(value ?? ""));
  });
  return text;
}

function isEnglishLanguage() {
  return languageMode === "en";
}

function isRtlLanguage() {
  return languageMode === "ar";
}

function formatConcernCount(count) {
  return uiText("findingCount", {
    count,
    plural: count === 1 ? "" : "s",
  });
}

function isPatientAudience() {
  return audienceMode === "patient";
}

function setAudienceMode(mode, options = {}) {
  audienceMode = normalizeAudienceMode(mode) || "clinician";
  if (isPatientAudience() && activeTab !== "overview") setActiveTab("overview");
  lazyRenderState = { evidenceKey:"", reviewKey:"" };
  syncAudienceModeUI();
  if (options.render !== false) renderAll();
}

function setLanguageMode(mode, options = {}) {
  languageMode = normalizeLanguageMode(mode) || "en";
  lazyRenderState = { evidenceKey:"", reviewKey:"" };
  syncLanguageModeUI();
  syncAudienceModeUI();
  if (options.render !== false) renderAll();
}

function syncAudienceModeUI() {
  if (document.body) document.body.dataset.audience = audienceMode;
  for (const mode of AUDIENCE_MODES) {
    const btn = document.getElementById(`audience-${mode}`);
    if (!btn) continue;
    btn.classList.toggle("active", mode === audienceMode);
    btn.setAttribute("aria-pressed", mode === audienceMode ? "true" : "false");
  }
  const findingTitle = document.getElementById("findingTitle");
  if (findingTitle) findingTitle.textContent = isPatientAudience() ? uiText("findingTitlePatient") : uiText("findingTitleClinician");
}

function syncLanguageModeUI() {
  if (document.documentElement) {
    document.documentElement.lang = languageMode;
    document.documentElement.dir = isRtlLanguage() ? "rtl" : "ltr";
  }
  if (document.body) document.body.dataset.language = languageMode;
  const select = document.getElementById("languageSelect");
  if (select) select.value = languageMode;
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.placeholder = uiText("searchPlaceholder");
  const searchModeBtn = document.getElementById("searchModeBtn");
  if (searchModeBtn) searchModeBtn.textContent = uiText("searchMode");
  const browseModeBtn = document.getElementById("browseModeBtn");
  if (browseModeBtn) browseModeBtn.textContent = uiText("browseMode");
  const audienceLabel = document.getElementById("audienceLabel");
  if (audienceLabel) audienceLabel.textContent = uiText("audienceLabel");
  const patientBtn = document.getElementById("audience-patient");
  if (patientBtn) patientBtn.textContent = uiText("patientAudience");
  const clinicianBtn = document.getElementById("audience-clinician");
  if (clinicianBtn) clinicianBtn.textContent = uiText("clinicianAudience");
  const languageLabel = document.getElementById("languageLabel");
  if (languageLabel) languageLabel.textContent = uiText("languageLabel");
  const tabLabels = {
    "tabbtn-overview":"tabOverview",
    "tabbtn-mechanisms":"tabMechanisms",
    "tabbtn-genes-metabolites":"tabGenes",
    "tabbtn-timing-levels":"tabTiming",
    "tabbtn-evidence":"tabEvidence",
    "tabbtn-review":"tabReview",
  };
  Object.entries(tabLabels).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = uiText(key);
  });
}

function setViewMode(m) {
  viewMode = m;
  document.getElementById("searchModeBtn").className = "mode-btn" + (m==="search"?" active":"");
  document.getElementById("browseModeBtn").className = "mode-btn" + (m==="browse"?" active":"");
  document.getElementById("browseWrap").className = "browse-wrap" + (m==="browse"?" show":"");
  if (m==="browse") renderBrowse();
}

function setTab(name) {
  const resolvedTab = setActiveTab(name);
  DIOGNOSIS_TABS.forEach(t => {
    const panel = document.getElementById("tab-" + t);
    const btn = document.getElementById("tabbtn-" + t);
    if (panel) panel.classList.toggle("active", t === resolvedTab);
    if (btn) btn.classList.toggle("active", t === resolvedTab);
  });
  renderLazyTab(resolvedTab);
  updateEmptyTabs();
}

function focusPriorityFinding(tabName = "overview", elementId = "") {
  const resolvedTab = resolveTabAlias(tabName);
  setTab(resolvedTab);
  const fallbackIds = {
    overview:"findingSection",
    mechanisms:"mechanismWhySection",
    "genes-metabolites":"genotypeSection",
    "timing-levels":"persistenceTimelineSection",
    evidence:"evidenceSection",
    review:"reviewSummarySection",
  };
  const runFocus = () => {
    const target = elementId ? document.getElementById(elementId) : null;
    const el = target || document.getElementById(fallbackIds[resolvedTab]) || document.getElementById(`tab-${resolvedTab}`);
    if (!el) return;
    if (typeof el.scrollIntoView === "function") el.scrollIntoView({ behavior:"smooth", block:"center" });
    el.classList.remove("focus-pulse");
    void el.offsetWidth;
    el.classList.add("focus-pulse");
    window.setTimeout(() => el.classList.remove("focus-pulse"), 2200);
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(runFocus);
  else runFocus();
}

function publicDomToken(value) {
  return String(value || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function getRenderCacheKey() {
  return JSON.stringify({
    stack: activeStack,
    genotype: activeGenotype || {},
    genetics: userGenetics || {},
    doses: typeof drugDoses !== "undefined" ? drugDoses : {},
    audience: audienceMode,
    language: languageMode,
  });
}

function getRenderComputationCache() {
  const key = getRenderCacheKey();
  if (renderComputationCache && renderComputationCache.key === key) return renderComputationCache;
  const safeGenotype = activeGenotype || {};
  const risk = activeStack.length >= 2 && typeof calcRisk === "function"
    ? calcRisk()
    : { interactions:[], factors:[], score:0, level:"MINIMAL RISK" };
  const activeMoietyRows = typeof computeActiveMoietyBalance === "function"
    ? computeActiveMoietyBalance(activeStack, safeGenotype)
    : [];
  const riskMarkerRows = typeof computeRiskMarkerFindings === "function"
    ? computeRiskMarkerFindings(activeStack, safeGenotype, { activeMoietyRows })
    : [];
  const phenoconversionRows = typeof computePhenoconversionState === "function"
    ? computePhenoconversionState(activeStack, safeGenotype, { activeMoietyRows })
    : [];
  const timelineRows = typeof computePersistenceTimeline === "function"
    ? computePersistenceTimeline(activeStack, safeGenotype)
    : [];
  const findings = typeof buildInteractionFindings === "function"
    ? buildInteractionFindings(activeStack, safeGenotype, {
        interactions: risk.interactions || [],
        activeMoietyRows,
        riskMarkerRows,
        phenoconversionRows,
        timelineRows,
      })
    : [];
  const clinicalConcerns = typeof buildClinicalConcerns === "function"
    ? buildClinicalConcerns(findings, {
        stack:activeStack,
        genotypeState:safeGenotype,
        interactions:risk.interactions || [],
        activeMoietyRows,
        riskMarkerRows,
        phenoconversionRows,
        timelineRows,
      })
    : findings;
  renderComputationCache = {
    key,
    risk,
    activeMoietyRows,
    riskMarkerRows,
    phenoconversionRows,
    timelineRows,
    pendingReviewContext:null,
    pendingCoreContext:null,
    pendingCalculationContext:null,
    findings,
    clinicalConcerns,
  };
  return renderComputationCache;
}

function currentRenderFingerprint() {
  return getRenderCacheKey();
}

function renderLazyTab(tabId = activeTab) {
  const key = currentRenderFingerprint();
  if (tabId === "evidence") {
    if (lazyRenderState.evidenceKey === key) return;
    if (typeof renderEvidenceExplorer === "function") renderEvidenceExplorer();
    lazyRenderState.evidenceKey = key;
    return;
  }
  if (tabId === "review") {
    if (lazyRenderState.reviewKey === key) return;
    if (typeof renderReviewSummary === "function") renderReviewSummary();
    if (typeof renderReviewWorkbench === "function") renderReviewWorkbench();
    if (typeof renderQualityDashboard === "function") renderQualityDashboard();
    if (typeof renderWarningPathReview === "function") renderWarningPathReview();
    if (typeof renderScenarioSnapshotsReview === "function") renderScenarioSnapshotsReview();
    if (typeof renderMetaboliteCoverageGapsReview === "function") renderMetaboliteCoverageGapsReview();
    if (typeof renderContributeReview === "function") renderContributeReview();
    lazyRenderState.reviewKey = key;
  }
}

function renderSummaryBar() {
  const bar = document.getElementById("summaryBar");
  const tabBar = document.getElementById("tabBar");
  if (!bar || !tabBar) return;

  const overviewBtn = document.getElementById("tabbtn-overview");
  const tabPanels = DIOGNOSIS_TABS
    .map(t => document.getElementById("tab-" + t))
    .filter(Boolean);
  if (activeStack.length < 1) {
    bar.style.display = "none";
    tabBar.style.display = "none";
    tabPanels.forEach(panel => { panel.style.display = "none"; });
    if (overviewBtn) overviewBtn.innerHTML = uiText("tabOverview");
    return;
  }

  bar.style.display = "";
  if (isPatientAudience()) setActiveTab("overview");
  tabBar.style.display = isPatientAudience() ? "none" : "";
  tabPanels.forEach(panel => { panel.style.display = ""; });
  setTab(activeTab);

  let riskClass = "neutral";
  let scoreValue = "—";
  let scoreLabel = uiText("add2");
  let headline = "";
  let summaryCopy = "";
  let nextStep = "";
  let severeCount = 0;
  let interactionScore = 0;
  let genotypePriority = null;
  let priorityInteraction = null;
  let priorityStory = null;
  if (activeStack.length >= 2) {
    const risk = typeof getRenderComputationCache === "function"
      ? getRenderComputationCache().risk
      : calcRisk();
    interactionScore = risk.score;
    const severeInteractions = risk.interactions.filter(i => i.severity === "severe" || i.severity === "critical");
    const moderateInteractions = risk.interactions.filter(i => i.severity === "moderate");
    priorityInteraction = severeInteractions[0] || moderateInteractions[0] || risk.interactions[0] || null;
    const severePairs = uniqueInteractionPairLabels(severeInteractions);
    const moderatePairs = uniqueInteractionPairLabels(moderateInteractions);
    severeCount = severePairs.length;
    riskClass = severeCount || interactionScore >= 60 ? "high" : interactionScore >= 30 ? "moderate" : "low";
    scoreValue = interactionScore;
    scoreLabel = risk.level.split(" ")[0];
    const topSevere = severePairs.slice(0, 2).join(", ");
    headline = severeCount > 0 ? uiText("highPriorityInteractionFound") :
      interactionScore >= 30 ? uiText("monitoringMayBeNeeded") :
      uiText("noMajorInteractionSignalFound");
    summaryCopy = severeCount > 0
      ? uiText("severeFindingsSummary", {
          count:severeCount,
          plural:severeCount > 1 ? "s" : "",
          pairs:topSevere ? `: ${topSevere}` : "",
        })
      : uiText("checkedNoSevere", { count:activeStack.length });
    nextStep = severeCount > 0
      ? uiText("startSevereFindings")
      : uiText("reviewLevelChanges");
    if (priorityInteraction) {
      priorityStory = buildInteractionPriorityStory(priorityInteraction);
    }
  } else {
    genotypePriority = typeof getHighestGenotypePrioritySignal === "function" ? getHighestGenotypePrioritySignal() : null;
    headline = uiText("addAnotherSubstanceHeadline");
    summaryCopy = uiText("singleSubstanceContext");
    nextStep = uiText("addSecondSubstance");
  }

  if (!genotypePriority && typeof getHighestGenotypePrioritySignal === "function") {
    genotypePriority = getHighestGenotypePrioritySignal();
  }
  if (genotypePriority && genotypePriority.score > interactionScore) {
    riskClass = genotypePriority.score >= 70 ? "high" : genotypePriority.score >= 45 ? "moderate" : "low";
    scoreValue = genotypePriority.score;
    scoreLabel = genotypePriority.label;
    headline = genotypePriority.headline;
    summaryCopy = genotypePriority.summary;
    nextStep = genotypePriority.nextStep;
    priorityStory = genotypePriority.story || buildGenotypePriorityStory(genotypePriority);
    if (isPatientAudience() && !isEnglishLanguage()) {
      headline = uiText("highPriorityInteractionFound");
      summaryCopy = uiText("patientDifferentPlan");
      nextStep = uiText("patientAskGeneric");
    }
  }
  if (genotypePriority && genotypePriority.score >= 70 && genotypePriority.score <= interactionScore && summaryCopy) {
    summaryCopy = isEnglishLanguage()
      ? `${summaryCopy} ${uiText("alsoCheckPrefix")} ${genotypePriority.summary}`
      : summaryCopy;
    nextStep = uiText("startSevereFindings");
  }
  if (!priorityStory) {
    priorityStory = buildDefaultPriorityStory(activeStack.length);
  }

  const primaryPresentation = getCurrentPublicFindingPresentations()[0] || null;
  const isGenotypePriority = genotypePriority && genotypePriority.score > interactionScore;
  const jumpTab = primaryPresentation ? primaryPresentation.targetTab : (isGenotypePriority ? (genotypePriority.targetTab || "genes-metabolites") : "overview");
  const jumpTarget = primaryPresentation ? primaryPresentation.targetElementId : (isGenotypePriority ? (genotypePriority.targetElementId || "genotypeSection") : "findingSection");

  const summaryKicker = isPatientAudience() ? uiText("mainSafetyNote") : uiText("highestPriority");
  const jumpLabel = isPatientAudience() ? uiText("viewNote") : uiText("viewFinding");
  const nextLabel = isPatientAudience() ? uiText("nextStep") : uiText("nextReview");

    bar.innerHTML = `<div class="summary-card">
    <div class="summary-main">
      <div>
        <div class="summary-kicker">${safePublicHtml(summaryKicker)}</div>
        <div class="summary-title">${safePublicHtml(headline)}</div>
        <div class="summary-copy">${summaryCopy ? `${safePublicHtml(summaryCopy)} ` : ""}<button type="button" class="summary-jump" onclick="focusPriorityFinding('${safeAttr(jumpTab)}','${safeAttr(jumpTarget)}')">${safePublicHtml(jumpLabel)}</button></div>
      </div>
      <div class="summary-risk ${riskClass}">
        <div class="num">${scoreValue}</div>
        <div class="lbl">${safePublicHtml(scoreLabel)}</div>
      </div>
    </div>
    ${renderPriorityStory(priorityStory)}
    <div class="summary-next"><span class="summary-next-pill">${safePublicHtml(nextLabel)}</span><span>${safePublicHtml(nextStep)}</span></div>
  </div>`;
  const badge = severeCount > 0 ? `<span class="tab-badge">${severeCount}</span>` : "";
  if (overviewBtn) overviewBtn.innerHTML = uiText("tabOverview") + badge;
}

function renderInteractionFindingsOverview(risk) {
  const section = document.getElementById("findingSection");
  const body = document.getElementById("findingBody");
  const count = document.getElementById("findingCount");
  if (!section || !body) return [];
  const findings = typeof getRenderComputationCache === "function"
    ? getRenderComputationCache().findings
    : (typeof buildInteractionFindings === "function"
      ? buildInteractionFindings(activeStack, activeGenotype || {}, { interactions:risk?.interactions || [] })
      : []);
  const overviewFindings = typeof getRenderComputationCache === "function"
    ? getRenderComputationCache().clinicalConcerns || findings
    : (typeof buildClinicalConcerns === "function" ? buildClinicalConcerns(findings, { stack:activeStack, genotypeState:activeGenotype || {} }) : findings);
  currentInteractionFindings = findings;
  currentClinicalConcerns = overviewFindings;
  currentPublicFindingPresentations = buildPublicFindingPresentations(overviewFindings);
  if (!currentPublicFindingPresentations.length) {
    if (activeStack.length < 2) {
      hideSectionAndClear("findingSection", "findingBody", "findingCount");
      return currentPublicFindingPresentations;
    }
    section.style.display = "";
    body.innerHTML = `<div class="finding-empty">${safePublicHtml(isPatientAudience() ? uiText("noFindingsPatient") : uiText("noFindingsClinical"))}</div>`;
    if (count) count.textContent = "";
    return currentPublicFindingPresentations;
  }
  section.style.display = "";
  if (count) count.textContent = formatConcernCount(currentPublicFindingPresentations.length);
  body.innerHTML = currentPublicFindingPresentations.slice(0, 8).map(renderPublicFindingCard).join("") +
    (currentPublicFindingPresentations.length > 8
      ? `<div class="finding-empty">${safePublicHtml(uiText("groupedConcernsMore", { count:currentPublicFindingPresentations.length }))}</div>`
      : `<div class="finding-empty">${safePublicHtml(uiText("overviewGroupsConcerns"))}</div>`);
  return currentPublicFindingPresentations;
}

function renderInteractionFindingCard(finding) {
  return renderPublicFindingCard(buildPublicFindingPresentationFromFinding(finding));
}

function buildPublicFindingPresentations(overviewFindings = []) {
  const presentations = (overviewFindings || [])
    .map(buildPublicFindingPresentationFromFinding)
    .filter(hasCompletePublicFindingPresentation);
  const genotypeSignal = typeof getHighestGenotypePrioritySignal === "function" ? getHighestGenotypePrioritySignal() : null;
  const genotypePresentation = buildPublicFindingPresentationFromGenotypeSignal(genotypeSignal);
  if (shouldAddGenotypePublicFinding(genotypePresentation, presentations, genotypeSignal)) {
    presentations.push(genotypePresentation);
    presentations.sort((a, b) => publicFindingSeverityScore(b.severity) - publicFindingSeverityScore(a.severity));
  }
  return presentations;
}

function hasCompletePublicFindingPresentation(presentation) {
  return !!(presentation &&
    presentation.whatChanged &&
    presentation.whyItMatters &&
    presentation.whatToReview &&
    presentation.evidenceSummary);
}

function buildPublicFindingPresentationFromFinding(finding = {}) {
  const id = String(finding.id || finding.title || "finding");
  const sourceIds = [
    id,
    ...(finding.sourceFindings || []).map(row => row.id),
    ...(finding.groupedFindings || []).map(row => row.id),
  ].filter(Boolean);
  const title = publicDisplayText(finding.title || "Interaction finding");
  const affectedSubstances = publicFindingAffectedSubstances(finding);
  const evidenceRefs = [...new Set(finding.evidenceRefs || [])];
  const detail = publicFindingDetailTarget(finding);
  const presentation = {
    id,
    sourceIds,
    sourceFinding:finding,
    severity:safeChoice(finding.severity, ["critical","severe","moderate","monitor","info"], "info"),
    title,
    affectedSubstances,
    whatChanged:publicDisplayText(finding.summary || title || "This stack changes expected exposure, activation, timing, or safety context."),
    whyItMatters:publicDisplayText(publicFindingWhy(finding)),
    whatToReview:publicDisplayText(publicFindingReviewAction(finding)),
    evidenceSummary:publicEvidenceSummaryForFinding(finding),
    targetTab:"overview",
    targetElementId:publicFindingElementId(id),
    detailTab:detail.tab,
    detailElementId:detail.elementId,
    tags:(finding.tags || []).slice(0, 6),
  };
  return presentation;
}

function buildPublicFindingPresentationFromGenotypeSignal(signal) {
  if (!signal) return null;
  const id = `pgx-${publicDomToken(signal.kind || "signal")}-${publicDomToken(signal.headline || signal.summary)}`;
  const severity = signal.score >= 70 ? "severe" : signal.score >= 45 ? "moderate" : "monitor";
  return {
    id,
    sourceIds:[id],
    sourceFinding:null,
    severity,
    title:publicDisplayText(signal.headline || "Pharmacogenomic finding"),
    affectedSubstances:publicFindingSignalSubstances(signal),
    whatChanged:publicDisplayText(signal.changes || signal.summary || "A selected genotype changes expected exposure or active-metabolite behavior."),
    whyItMatters:publicDisplayText(signal.why || "A medication in the current list depends on this gene or risk marker."),
    whatToReview:publicDisplayText(signal.review || signal.nextStep || "Review whether dose, monitoring, or an alternative should change."),
    evidenceSummary:publicEvidenceSummaryFromRefs(signal.evidenceRefs || []),
    targetTab:"overview",
    targetElementId:publicFindingElementId(id),
    detailTab:signal.targetTab || "genes-metabolites",
    detailElementId:signal.targetElementId || "genotypeSection",
    tags:["PGx"],
    signal,
  };
}

function shouldAddGenotypePublicFinding(genotypePresentation, presentations = [], signal = null) {
  if (!genotypePresentation || !signal || signal.score < 30) return false;
  if (!presentations.length) return true;
  const signalText = publicFindingSearchText(genotypePresentation);
  const overlapsPrimary = presentations.some(presentation => {
    const text = publicFindingSearchText(presentation);
    const sharedSubstance = (genotypePresentation.affectedSubstances || []).some(name =>
      name && text.includes(name.toLowerCase())
    );
    const headlineTokens = (signal.headline || "").split(/\s+/).filter(token => token.length >= 4);
    const sharedHeadline = headlineTokens.some(token => text.includes(token.toLowerCase()));
    return sharedSubstance && sharedHeadline;
  });
  if (overlapsPrimary) return false;
  return signal.score >= 70 && !presentations.some(presentation => publicFindingSearchText(presentation).includes(signalText.slice(0, 40)));
}

function publicFindingAffectedSubstances(finding = {}) {
  const actors = (finding.affectedActors || [])
    .filter(actor => actor && (actor.type === "parent_drug" || activeStack.includes(actor.id)))
    .map(actor => publicDisplayText(actor.id))
    .filter(Boolean);
  const sourceDrugs = (finding.sourceFindings || [])
    .flatMap(row => [row.drug1, row.drug2, row.parent, row.victim, row.perpetrator])
    .map(value => publicDisplayText(value))
    .filter(Boolean);
  const substances = [...new Set([...actors, ...sourceDrugs])];
  if (substances.length) return substances.slice(0, 6);
  return activeStack.map(value => publicDisplayText(value)).filter(Boolean).slice(0, 6);
}

function publicFindingSignalSubstances(signal = {}) {
  const text = `${signal.headline || ""} ${signal.summary || ""}`.toLowerCase();
  const substances = activeStack
    .map(value => publicDisplayText(value))
    .filter(name => name && text.includes(name.toLowerCase()));
  return substances.length ? substances.slice(0, 6) : activeStack.map(value => publicDisplayText(value)).filter(Boolean).slice(0, 3);
}

function publicFindingWhy(finding = {}) {
  if (finding.whyPath?.summary) return shortenOverviewWhyText(finding.whyPath.summary);
  return shortenOverviewWhyText(buildFindingWhyText(finding));
}

function publicFindingReviewAction(finding = {}) {
  const candidates = [
    finding.clinicalAction,
    finding.action,
    finding.management,
    ...(finding.sourceFindings || []).flatMap(row => [row.clinicalAction, row.management, row.action, row.review]),
  ].filter(Boolean);
  if (candidates.length) return candidates[0];
  if (finding.severity === "critical" || finding.severity === "severe") {
    return "Review whether this combination should be avoided, substituted, dose-adjusted, or monitored before use.";
  }
  if (finding.severity === "moderate") {
    return "Review dose, timing, monitoring, and whether the combination is still appropriate.";
  }
  return "Review this supporting context with symptoms, doses, timing, and the rest of the medication list.";
}

function publicEvidenceSummaryForFinding(finding = {}) {
  if (finding.evidenceLadder) {
    const ladder = finding.evidenceLadder;
    const tier = ladder.strongestTier && ladder.strongestTier !== "unknown"
      ? ladder.strongestTier.replace(/_/g, " ").toLowerCase()
      : "";
    const source = ladder.sourceLinked ? "source-linked" : "modeled";
    const count = ladder.studyCount ? `${ladder.studyCount} source${ladder.studyCount === 1 ? "" : "s"}` : "";
    const review = ladder.professionalReviewStatus === "reviewed" ? "reviewed" : "clinical review needed";
    return publicDisplayText([source, tier, count, review].filter(Boolean).join(" · "));
  }
  return publicEvidenceSummaryFromRefs(finding.evidenceRefs || []);
}

function publicEvidenceSummaryFromRefs(refs = []) {
  const count = [...new Set(refs || [])].length;
  if (count) return `${count} linked source${count === 1 ? "" : "s"} · clinical review needed`;
  return "modeled signal · clinical review needed";
}

function publicFindingDetailTarget(finding = {}) {
  const id = publicDomToken(finding.id || finding.title || "finding");
  if (finding.whyPath) return { tab:"mechanisms", elementId:`mechanism-${id}` };
  if ((finding.evidenceRefs || []).length) return { tab:"evidence", elementId:"evidenceLadderLedger" };
  if (/timing|washout|persistence/i.test(`${finding.type || ""} ${finding.title || ""}`)) {
    return { tab:"timing-levels", elementId:"persistenceTimelineSection" };
  }
  if (/genotype|pgx|active|metabolite|phenoconversion/i.test(`${finding.type || ""} ${finding.title || ""}`)) {
    return { tab:"genes-metabolites", elementId:"genotypeSection" };
  }
  return { tab:"review", elementId:"reviewSummarySection" };
}

function publicFindingElementId(id) {
  return `overview-finding-${publicDomToken(id)}`;
}

function publicFindingSeverityScore(severity) {
  return { critical:5, severe:4, moderate:3, monitor:2, info:1 }[severity] || 0;
}

function publicFindingSearchText(presentation = {}) {
  return [
    presentation.id,
    presentation.title,
    presentation.whatChanged,
    presentation.whyItMatters,
    presentation.whatToReview,
    ...(presentation.affectedSubstances || []),
    ...(presentation.sourceIds || []),
  ].join(" ").toLowerCase();
}

function getCurrentPublicFindingPresentations() {
  if (currentPublicFindingPresentations.length) return currentPublicFindingPresentations;
  const cache = typeof getRenderComputationCache === "function" ? getRenderComputationCache() : {};
  currentPublicFindingPresentations = buildPublicFindingPresentations(cache.clinicalConcerns || []);
  return currentPublicFindingPresentations;
}

function findRelatedPublicFindingPresentation(context = {}) {
  const presentations = getCurrentPublicFindingPresentations();
  if (!presentations.length) return null;
  const sourceId = context.finding?.id || context.id || "";
  if (sourceId) {
    const exact = presentations.find(presentation => (presentation.sourceIds || []).includes(sourceId) || presentation.id === sourceId);
    if (exact) return exact;
  }
  const refs = new Set(context.evidenceRefs || context.finding?.evidenceRefs || []);
  const terms = [
    ...(context.terms || []),
    context.title,
    context.finding?.title,
    context.finding?.summary,
  ].map(value => publicDisplayText(value)).filter(Boolean);
  let best = null;
  let bestScore = 0;
  for (const presentation of presentations) {
    const text = publicFindingSearchText(presentation);
    let score = 0;
    for (const term of terms) {
      const normalized = term.toLowerCase();
      if (!normalized || normalized.length < 3) continue;
      if (text.includes(normalized)) score += normalized.length > 8 ? 3 : 1;
    }
    const findingRefs = new Set(presentation.sourceFinding?.evidenceRefs || presentation.signal?.evidenceRefs || []);
    for (const ref of refs) if (findingRefs.has(ref)) score += 4;
    if (score > bestScore) {
      best = presentation;
      bestScore = score;
    }
  }
  return bestScore >= 2 ? best : null;
}

function renderRelatedFindingButton(context = {}, label = "Related finding") {
  const presentation = findRelatedPublicFindingPresentation(context);
  if (!presentation) return "";
  return `<button type="button" class="related-finding-btn" onclick="focusPriorityFinding('overview','${safeAttr(presentation.targetElementId)}')">${safePublicHtml(label)}</button>`;
}

function renderPublicFindingCard(presentation) {
  if (!presentation) return "";
  const severity = safeChoice(presentation.severity, ["critical","severe","moderate","monitor","info"], "info");
  const finding = presentation.sourceFinding || {};
  const actorHtml = (presentation.affectedSubstances || []).slice(0, 8).map(actor => `
    <span class="finding-actor">${safePublicHtml(actor)}</span>
  `).join("");
  const tags = (presentation.tags || []).slice(0, 6).map(tag => `<span class="finding-tag">${safePublicHtml(tag)}</span>`).join("");
  const grouped = finding.groupedFindings?.length
    ? `<span class="finding-tag">${finding.groupedFindings.length + 1} grouped signals</span>`
    : "";
  const supportingSignals = renderConcernSupportingSignals(finding);
  const sourceLabel = safePublicHtml(String(finding.source || finding.type || "finding").replace(/_/g, " "));
  const patient = isPatientAudience();
  const changedText = patient ? patientFindingStepText(presentation, "changed") : presentation.whatChanged;
  const whyText = patient ? patientFindingStepText(presentation, "why") : presentation.whyItMatters;
  const reviewText = patient ? patientFindingStepText(presentation, "review") : presentation.whatToReview;
  const detailButton = !patient && presentation.detailTab && presentation.detailElementId
    ? `<button type="button" class="related-finding-btn secondary" onclick="focusPriorityFinding('${safeAttr(presentation.detailTab)}','${safeAttr(presentation.detailElementId)}')">${safePublicHtml(uiText("supportingDetail"))}</button>`
    : "";
  const evidenceStep = patient ? "" : renderFindingStep(uiText("evidence"), presentation.evidenceSummary);
  const technicalDetail = patient ? "" : `<details class="finding-support-details">
      <summary>${safePublicHtml(uiText("supportingDetail"))}</summary>
      ${supportingSignals}
      <div class="finding-meta">
        <span class="finding-tag type">${sourceLabel}</span>
        <span class="finding-tag">confidence: ${safePublicHtml(finding.confidence || presentation.signal?.label || "unknown")}</span>
        <span class="finding-tag">${safePublicHtml(publicEvidenceSummaryForFinding(finding || {}))}</span>
        ${grouped}
        ${tags}
      </div>
    </details>`;
  return `<div id="${safeAttr(presentation.targetElementId)}" class="finding-card primary-finding-card ${severity}" data-finding-id="${safeAttr(presentation.id)}">
    <div class="finding-top">
      <div>
        <div class="finding-title">${safePublicHtml(presentation.title)}</div>
        <div class="finding-subtitle">${safePublicHtml((presentation.affectedSubstances || []).join(" + ") || uiText("currentStack"))}</div>
      </div>
      <span class="finding-sev ${severity}">${safePublicHtml(severity)}</span>
    </div>
    ${actorHtml ? `<div class="finding-actors">${actorHtml}</div>` : ""}
    <div class="finding-explain">
      ${renderFindingStep(patient ? uiText("whatThisMeans") : uiText("whatChanged"), changedText)}
      ${renderFindingStep(uiText("whyItMatters"), whyText)}
      ${renderFindingStep(patient ? uiText("whatToAsk") : uiText("whatToReview"), reviewText)}
      ${evidenceStep}
    </div>
    <div class="finding-actions">${detailButton}</div>
    ${technicalDetail}
  </div>`;
}

function patientFindingStepText(presentation = {}, field = "changed") {
  const text = publicDisplayText([
    presentation.title,
    presentation.whatChanged,
    presentation.whyItMatters,
    presentation.whatToReview,
    ...(presentation.tags || []),
  ].join(" "));
  const severity = safeChoice(presentation.severity, ["critical","severe","moderate","monitor","info"], "info");
  const serious = severity === "critical" || severity === "severe";
  const lower = text.toLowerCase();
  if (field === "changed") {
    if (/bleed|inr|anticoag|warfarin|platelet|clot/.test(lower)) {
      return serious
        ? uiText("patientBleedingSerious")
        : uiText("patientBleedingMonitor");
    }
    if (/qt|torsades|arrhythm|heart rhythm|bradycard/.test(lower)) {
      return serious
        ? uiText("patientRhythmSerious")
        : uiText("patientRhythmMonitor");
    }
    if (/serotonin|ssri|snri|maoi/.test(lower)) {
      return uiText("patientSerotonin");
    }
    if (/sedation|fall|cns|opioid|benzodiazepine|drows/.test(lower)) {
      return uiText("patientSedation");
    }
    if (/auc|exposure|level|concentration|metabol|cyp|enzyme|genotype|pgx|clearance/.test(lower)) {
      return uiText("patientExposure");
    }
    return serious
      ? uiText("patientImportant")
      : uiText("patientSafetyNote");
  }
  if (field === "why") {
    if (/avoid|contraindicat|severe|critical|high risk/.test(lower) || serious) {
      return uiText("patientDifferentPlan");
    }
    return uiText("patientContextMatters");
  }
  const review = String(presentation.whatToReview || "").replace(/\s+/g, " ").trim();
  if (!isEnglishLanguage()) return uiText("patientAskGeneric");
  if (/ask|call|contact/i.test(review)) return shortenPatientReviewText(review);
  const cleaned = review
    .replace(/^review whether\s+/i, "whether ")
    .replace(/^review\s+/i, "")
    .replace(/\bpharmacogenomics?\b/gi, "gene result")
    .replace(/\bgenotype\b/gi, "gene result")
    .replace(/\bAUC\b/g, "level")
    .replace(/\bphenoconversion\b/gi, "pathway change");
  const base = cleaned || "this medication list needs a different plan, dose, timing, or monitoring";
  return shortenPatientReviewText(uiText("patientAskAbout", { topic:base }));
}

function shortenPatientReviewText(text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (raw.length <= 180) return raw;
  return raw.slice(0, 177).trim() + "...";
}

function renderFindingStep(label, value) {
  return `<div class="finding-step">
    <div class="finding-step-label">${safePublicHtml(label)}</div>
    <div class="finding-step-text">${safePublicHtml(value)}</div>
  </div>`;
}

function renderConcernSupportingSignals(finding) {
  const signals = finding.supportingSignals || [];
  if (!signals.length) return "";
  const shown = signals.slice(0, 4);
  return `<div class="concern-supporting">
    <div class="concern-supporting-title">Supporting signals</div>
    <ul>
      ${shown.map(signal => `<li>
        <span>${safePublicHtml(signal.label || "Related signal")}</span>
        <small>${safePublicHtml(compactReviewStatus(signal.sourceStatus || "modeled support"))}</small>
      </li>`).join("")}
    </ul>
    ${signals.length > shown.length ? `<div class="concern-supporting-more">+${signals.length - shown.length} more in Mechanisms / Review</div>` : ""}
  </div>`;
}

function compactReviewStatus(value) {
  return publicDisplayText(value || "")
    .replace(/\bpending professional review\b/gi, "review needed")
    .replace(/\bneeds review\b/gi, "review needed")
    .replace(/\breview prompt\b/gi, "modeled support")
    .replace(/\bsource linked, pending review\b/gi, "source-linked support")
    .trim();
}

function renderEvidenceLadderCompact(ladder) {
  if (!ladder) return "";
  const sourceStatus = typeof sourceSupportStatusLabel === "function"
    ? compactReviewStatus(sourceSupportStatusLabel(ladder.sourceSupportStatus))
    : String(ladder.sourceSupportStatus || "source status unknown").replace(/_/g, " ");
  const tier = ladder.strongestTier && ladder.strongestTier !== "unknown"
    ? `${publicDisplayText(ladder.strongestTier.replace(/_/g, " ").toLowerCase())}${ladder.studyCount ? ` · ${safePublicHtml(String(ladder.studyCount))} source${ladder.studyCount === 1 ? "" : "s"}` : ""}`
    : sourceStatus;
  const clinical = String(ladder.clinicalActionConfidence || "insufficient").replace(/_/g, " ");
  const review = ladder.professionalReviewStatus === "reviewed"
    ? "reviewed"
    : ladder.professionalReviewStatus === "pending"
    ? "clinical review needed"
    : "review status unknown";
  return `<div class="evidence-ladder-compact">
    <span>Evidence: ${safePublicHtml(tier)}</span>
    <span>Source status: ${safePublicHtml(sourceStatus)}</span>
    <span>Mechanistic confidence: ${safePublicHtml(ladder.mechanisticConfidence || "unknown")}</span>
    <span>Clinical action status: ${safePublicHtml(clinical)}</span>
    <span>${safePublicHtml(review)}</span>
  </div>`;
}

function buildFindingWhyText(finding) {
  const actors = (finding.affectedActors || []).map(actor =>
      `${publicDisplayText(actor.id)}${actor.direction ? ` (${publicDisplayText(actor.direction)})` : ""}`
  ).join(" -> ");
  const grouped = finding.groupedFindings?.length
    ? ` Grouped with ${finding.groupedFindings.length} related signal${finding.groupedFindings.length === 1 ? "" : "s"} from the same actor pair.`
    : "";
  return `${publicDisplayText(finding.summary || finding.title || "This stack produced a normalized review finding.")}${actors ? ` Actors: ${actors}.` : ""}${grouped}`;
}

function renderOverviewWhySummary(finding) {
  const path = finding?.whyPath;
  const text = path
    ? (path.summary || (typeof formatWarningPath === "function" ? formatWarningPath(path) : ""))
    : buildFindingWhyText(finding);
  return `<div class="finding-why-body"><strong>Why:</strong> ${safePublicHtml(shortenOverviewWhyText(text || buildFindingWhyText(finding)))}</div>`;
}

function shortenOverviewWhyText(text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (raw.length <= 220) return raw;
  return raw.slice(0, 217).trim() + "...";
}

function uniqueInteractionPairLabels(interactions = []) {
  const seen = new Set();
  const labels = [];
  for (const ix of interactions) {
    const drugs = [ix.drug1, ix.drug2].filter(Boolean);
    if (!drugs.length) continue;
    const key = drugs.map(d => String(d).toLowerCase()).sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(drugs.join(" + "));
  }
  return labels;
}

function buildInteractionPriorityStory(ix) {
  if (!ix) return null;
  const pair = [ix.drug1, ix.drug2].filter(Boolean).join(" + ");
  const pathway = ix.enzyme || ix.affectedPathway || ix.category || "shared pathway";
  const mechanism = ix.mechanism || ix.effect || "a modeled interaction";
  const action = ix.clinicalAction || ix.management || (
    ix.severity === "severe" || ix.severity === "critical"
      ? "Review whether this combination should be avoided, substituted, dose-adjusted, or monitored before use."
      : "Review dose, timing, monitoring, and whether the combination is still appropriate."
  );
  return {
    why:publicDisplayText(`${pair || "This stack"} has the strongest substance-interaction signal in the current profile.`),
    changes:publicDisplayText(`The concern is ${mechanism}${pathway ? ` through ${pathway}` : ""}.`),
    review:publicDisplayText(action),
  };
}

function buildGenotypePriorityStory(signal) {
  if (!signal) return null;
  return {
    why:signal.why || "A selected genotype changes the interpretation of a medication already in the list.",
    changes:signal.changes || signal.summary || "The genotype changes expected exposure, active metabolite formation, or hypersensitivity risk.",
    review:signal.review || signal.nextStep || "Review the pharmacogenomics panel before relying on the standard medication assumption.",
  };
}

function buildDefaultPriorityStory(count) {
  if (count < 1) return null;
  if (count < 2) {
    return {
      why:"Diognosis can already show pharmacogenomic, metabolite, and dose context for one medication when available.",
      changes:"Pairwise interaction risk needs at least two substances, but genotype or metabolite context can still matter.",
      review:"Add another substance or set known genotype results to personalize the review.",
    };
  }
  return {
    why:"No severe pairwise signal is currently ahead of the rest of the profile.",
    changes:"Lower-priority genotype, transporter, metabolite, receptor, and dose context may still affect interpretation.",
    review:"Review the findings tabs if the patient has narrow-therapeutic-index drugs, unusual symptoms, or known genotype results.",
  };
}

function getPriorityEvidenceLayer(refs = [], inlineEvidence = null, source = "") {
  const studies = [...new Set(refs || [])].map(ref => typeof getStudy === "function" ? getStudy(ref) : STUDY_DB[ref]).filter(Boolean);
  const types = new Set(studies.map(s => s.type));
  const sourceText = `${source || ""} ${(inlineEvidence?.sources || []).join(" ")} ${inlineEvidence?.confidence || ""}`.toLowerCase();
  const hasGuidance = types.has(EVIDENCE_TIER.GUIDELINE) || types.has(EVIDENCE_TIER.FDA_LABEL) || /cpic|guideline|fda|label/.test(sourceText);
  const hasHuman = [
    EVIDENCE_TIER.META_ANALYSIS,
    EVIDENCE_TIER.RCT,
    EVIDENCE_TIER.CLINICAL_PK,
    EVIDENCE_TIER.OBSERVATIONAL,
    EVIDENCE_TIER.CASE_REPORT,
  ].some(type => types.has(type)) || /clinical|observational|rct|meta/.test(sourceText);
  const hasOnlyMechanistic = types.has(EVIDENCE_TIER.IN_VITRO) || types.has(EVIDENCE_TIER.ANIMAL) || /in vitro|animal|mechanistic/.test(sourceText);
  if (hasGuidance) {
    return { label:"Strong clinical guidance", className:"strong", note:studies.length ? `${studies.length} linked source${studies.length === 1 ? "" : "s"}, including guideline or label evidence.` : "Guideline or product-label evidence is attached." };
  }
  if (hasHuman) {
    return { label:"Human clinical evidence", className:"moderate", note:studies.length ? `${studies.length} linked human source${studies.length === 1 ? "" : "s"}.` : "Human clinical evidence is referenced inline." };
  }
  if (hasOnlyMechanistic) {
    return { label:"Mechanistic evidence", className:"limited", note:"Mechanistic evidence supports the pathway; clinical magnitude may be less certain." };
  }
  return { label:"Modeled review signal", className:"limited", note:"This is a conservative model signal; use the detailed tabs and evidence links for context." };
}

function renderPriorityStory(story) {
  if (!story) return "";
  const patient = isPatientAudience();
  const why = patient && !isEnglishLanguage() ? uiText("patientContextMatters") : story.why;
  const changes = patient && !isEnglishLanguage() ? uiText("patientExposure") : story.changes;
  const review = patient && !isEnglishLanguage() ? uiText("patientAskGeneric") : story.review;
  return `<div class="summary-story">
    <div class="summary-story-row"><strong>${safePublicHtml(uiText("whyThisMatters"))}</strong>${safePublicHtml(why)}</div>
    <div class="summary-story-row"><strong>${safePublicHtml(patient ? uiText("whatThisMeans") : uiText("whatChanges"))}</strong>${safePublicHtml(changes)}</div>
    <div class="summary-story-row"><strong>${safePublicHtml(patient ? uiText("whatToAsk") : uiText("nextReviewStep"))}</strong>${safePublicHtml(review)}</div>
  </div>`;
}

function updateEmptyTabs() {
  DIOGNOSIS_TABS.forEach(t => {
    const panel = document.getElementById("tab-" + t);
    if (!panel || typeof panel.querySelectorAll !== "function") return;
    const sections = Array.from(panel.querySelectorAll(".section"));
    const anyVisible = sections
      .some(section => section.style.display !== "none");
    let note = panel.querySelector(".tab-empty");
    if (!anyVisible) {
      if (!note) {
        note = document.createElement("div");
        note.className = "tab-empty";
        panel.appendChild(note);
      }
      note.textContent = activeStack.length < 2
        ? "Add a second substance to populate this view."
        : "No data available for this substance set.";
      note.style.display = "";
    } else if (note) {
      note.style.display = "none";
    }
  });
}

function applyAudienceModeVisibility() {
  if (!isPatientAudience()) return;
  [
    "riskSection",
    "altSection",
  ].forEach(sectionId => {
    const section = document.getElementById(sectionId);
    if (section) section.style.display = "none";
  });
}

function arrangeAdvancedSections() {
  const placements = {
    overview:["riskSection","findingSection","altSection"],
    mechanisms:["mechanismWhySection","mechanisticSection","transporterSection","pdSection","cascadeSection","phenoAccumSection","graphSection"],
    "genes-metabolites":["genotypeSection","phenoconversionSection","activeMoietySection","metabSection"],
    "timing-levels":["foldSection","pkSimSection","persistenceTimelineSection","washoutSection","burdenSection"],
    evidence:["externalContextSection","evidenceSection"],
    review:["reviewSummarySection","reviewWorkbenchSection","scenarioSnapshotSection","metaboliteGapSection","warningPathSection","matrixSection","interSection","comboSection","qualitySection","contributeSection"],
  };
  Object.entries(placements).forEach(([tabId, sectionIds]) => {
    const panel = document.getElementById("tab-" + tabId);
    if (!panel || typeof panel.appendChild !== "function") return;
    sectionIds.forEach(sectionId => {
      const section = document.getElementById(sectionId);
      if (section) panel.appendChild(section);
    });
  });
}

function onSearch(q) {
  const el = document.getElementById("searchResults");
  if (!q || q.length < 1) { el.classList.remove("show"); return; }
  const seen = new Set();
  const seenAliasMatches = new Set();
  const rawMatches = DRUG_DB
    .map(d => ({ drug:d, match:scoreDrugSearch(d, q) }))
    .filter(row => row.match.score > 0)
    .sort((a,b) =>
      b.match.score - a.match.score ||
      drugSearchRichness(b.drug) - drugSearchRichness(a.drug) ||
      a.drug.name.localeCompare(b.drug.name)
    );
  const matches = rawMatches.filter(row => {
    const d = row.drug;
    if (seen.has(d.name)) return false;
    const aliasKey = getSearchAliasDedupeKey(row);
    if (aliasKey && seenAliasMatches.has(aliasKey)) return false;
    seen.add(d.name);
    if (aliasKey) seenAliasMatches.add(aliasKey);
    return true;
  });
  const actorMatches = findSupplementActorMatches(q);
  if (!matches.length && !actorMatches.length) { el.innerHTML = `<div class="sr-item"><span class="sr-name" style="color:var(--text2)">${safePublicHtml(uiText("noMatches"))}</span></div>`; el.classList.add("show"); return; }

  // Group by practical browse category, while preserving exact class on the row.
  const groups = {};
  matches.forEach(row => {
    const d = row.drug;
    const cat = getBrowseCategory(d);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(row);
  });

  let html = "";
  for (const [cls, rows] of Object.entries(groups)) {
    if (matches.length > 5) html += `<div class="sr-cat">${cls}</div>`;
    rows.forEach(row => {
      const d = row.drug;
      const added = activeStack.includes(d.name);
      const matchedAlias = row.match.term && row.match.term !== d.name && row.match.term !== d.id ? row.match.term : "";
      const secondary = typeof getDrugSecondaryLabel === "function" ? getDrugSecondaryLabel(d) : "";
      const displayName = matchedAlias ? `${highlight(matchedAlias, q)} -> ${d.name}` : highlight(d.name, q);
      const matchNote = row.match.reason && row.match.reason !== "name" ? `<span class="sr-match">${row.match.reason}</span>` : "";
      const secondaryHtml = secondary || matchNote ? `<span class="sr-secondary">${[secondary, matchNote].filter(Boolean).join(" ")}</span>` : "";
      html += `<div class="sr-item" onclick="${added ? `removeDrug('${d.name.replace(/'/g,"\\'")}')` : `addDrug('${d.name.replace(/'/g,"\\'")}')` }">
        <span><span class="sr-name">${displayName}</span>${secondaryHtml}</span>
        <span>${added ? '<span class="sr-added">✓ Added</span>' : `<span class="sr-class">${d.cls}</span>`}</span>
      </div>`;
    });
  }
  if (actorMatches.length) {
    html += `<div class="sr-cat">Food / Supplement</div>`;
    actorMatches.forEach(row => {
      const actor = row.actor;
      const added = activeStack.some(item => {
        const selectedActor = typeof getStackSupplementActor === "function" ? getStackSupplementActor(item) : null;
        return selectedActor && selectedActor.id === actor.id;
      });
      const secondary = formatActorSources(actor);
      const matchedAlias = row.match.term && row.match.term !== actor.name && row.match.term !== actor.id ? row.match.term : "";
      const displayName = matchedAlias ? `${highlight(matchedAlias, q)} -> ${actor.name}` : highlight(actor.name, q);
      html += `<div class="sr-item" onclick="${added ? `removeFoodActor('${actor.id}')` : `addFoodActor('${actor.id}')`}">
        <span><span class="sr-name">${displayName}</span>${secondary ? `<span class="sr-secondary">${secondary}</span>` : ""}</span>
        <span>${added ? '<span class="sr-added">✓ Added</span>' : '<span class="sr-class">Food/Supplement</span>'}</span>
      </div>`;
    });
  }
  el.innerHTML = html;
  el.classList.add("show");
}

function findSupplementActorMatches(query) {
  const actorMaps = [
    typeof FOOD_ACTORS !== "undefined" ? FOOD_ACTORS : {},
    typeof ENDOGENOUS_ACTORS !== "undefined" ? ENDOGENOUS_ACTORS : {},
  ];
  const seen = new Set();
  return actorMaps
    .flatMap(actorMap => Object.values(actorMap || {}))
    .filter(actor => actor && (actor.type === ACTOR_TYPE.FOOD || (actor.type === ACTOR_TYPE.ENDOGENOUS && actor.sources)))
    .map(actor => ({ actor, match:scoreSupplementActorSearch(actor, query) }))
    .filter(row => row.match.score > 0)
    .filter(row => {
      if (seen.has(row.actor.id)) return false;
      seen.add(row.actor.id);
      return true;
    })
    .sort((a,b) =>
      b.match.score - a.match.score ||
      supplementActorSearchRichness(b.actor) - supplementActorSearchRichness(a.actor) ||
      a.actor.name.localeCompare(b.actor.name)
    )
    .slice(0, 12);
}

function scoreSupplementActorSearch(actor, query) {
  const norm = typeof normalizeDrugLookupKey === "function"
    ? normalizeDrugLookupKey
    : value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const q = norm(query);
  if (!q) return { score:0, term:"", reason:"" };
  const tokens = q.split(" ").filter(Boolean);
  const terms = typeof getSupplementActorSearchTerms === "function"
    ? getSupplementActorSearchTerms(actor)
    : [actor.name, actor.id, ...(actor.sources || [])];
  const searchable = terms.map(term => ({ raw:String(term || ""), key:norm(term) })).filter(term => term.key);
  const joined = searchable.map(term => term.key).join(" ");
  const actorKey = norm(actor.name);
  let best = { score:0, term:"", reason:"" };
  const setBest = (score, term, reason) => {
    if (score > best.score) best = { score, term, reason };
  };

  if (actorKey === q) setBest(112, actor.name, "name");
  if (actorKey.startsWith(q)) setBest(90, actor.name, "name prefix");
  searchable.forEach(term => {
    const isPrimary = term.raw === actor.name || term.raw === actor.id;
    if (term.key === q) setBest(isPrimary ? 112 : 96, term.raw, isPrimary ? "name" : "source");
    else if (term.key.startsWith(q)) setBest(isPrimary ? 90 : 80, term.raw, isPrimary ? "name prefix" : "source prefix");
    else if (term.key.includes(q)) setBest(isPrimary ? 72 : 64, term.raw, isPrimary ? "partial name" : "partial source");
  });
  if (tokens.length > 1 && tokens.every(token => joined.includes(token))) setBest(62, actor.name, "matched words");
  return best;
}

function supplementActorSearchRichness(actor) {
  return (actor.routes || []).length * 3 +
    (actor.inh || []).length * 2 +
    (actor.ind || []).length * 2 +
    (actor.sources || []).length +
    (actor.note ? 2 : 0);
}

function formatActorSources(actor) {
  const sources = (actor.sources || []).slice(0, 3).map(source => String(source || "").replace(/_/g, " "));
  return sources.length ? sources.join(", ") : "";
}

function getSearchAliasDedupeKey(row) {
  const drug = row?.drug;
  const term = row?.match?.term;
  const reason = row?.match?.reason || "";
  if (!drug || !term || reason === "name" || reason === "name prefix" || reason === "medication class") return "";
  if (term === drug.name || term === drug.id || term === drug.cls) return "";
  const norm = typeof normalizeDrugLookupKey === "function"
    ? normalizeDrugLookupKey
    : value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `alias:${norm(term)}`;
}

function drugSearchRichness(drug) {
  return (drug.routes || []).length * 3 +
    (drug.inh || []).length * 2 +
    (drug.ind || []).length * 2 +
    (drug.metInh || []).length * 2 +
    (drug.evidenceRefs || []).length +
    (drug.note ? 2 : 0);
}

function scoreDrugSearch(drug, query) {
  const norm = typeof normalizeDrugLookupKey === "function"
    ? normalizeDrugLookupKey
    : value => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const q = norm(query);
  if (!q) return { score:0, term:"", reason:"" };
  const tokens = q.split(" ").filter(Boolean);
  const terms = typeof getDrugSearchTerms === "function" ? getDrugSearchTerms(drug) : [drug.name, drug.cls, ...(BRAND_NAMES[drug.name] || [])];
  const searchable = terms.map(term => ({ raw:String(term || ""), key:norm(term) })).filter(term => term.key);
  const joined = searchable.map(term => term.key).join(" ");
  const genericKey = norm(drug.name);
  let best = { score:0, term:"", reason:"" };
  const setBest = (score, term, reason) => {
    if (score > best.score) best = { score, term, reason };
  };

  if (genericKey === q) setBest(120, drug.name, "name");
  if (genericKey.startsWith(q)) setBest(95, drug.name, "name prefix");
  searchable.forEach(term => {
    const isGeneric = term.raw === drug.name || term.raw === drug.id;
    if (term.key === q) setBest(isGeneric ? 120 : 110, term.raw, isGeneric ? "name" : "brand or alias");
    else if (term.key.startsWith(q)) setBest(isGeneric ? 95 : 88, term.raw, isGeneric ? "name prefix" : "brand or alias prefix");
    else if (term.key.includes(q)) setBest(isGeneric ? 76 : 72, term.raw, isGeneric ? "partial name" : "partial brand or alias");
  });
  if (tokens.length > 1 && tokens.every(token => joined.includes(token))) setBest(68, drug.name, "matched words");
  if (String(drug.cls || "").toLowerCase().includes(query.toLowerCase())) setBest(52, drug.cls, "medication class");
  if (tokens.length === 1 && q.length >= 4) {
    searchable.forEach(term => {
      for (const part of term.key.split(" ")) {
        if (part.length >= 4 && levenshteinWithin(part, q, q.length > 6 ? 2 : 1)) {
          setBest(42, term.raw, "possible spelling match");
        }
      }
    });
  }
  return best;
}

function levenshteinWithin(a, b, maxDistance) {
  if (Math.abs(a.length - b.length) > maxDistance) return false;
  const prev = Array.from({ length:b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = curr[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      rowMin = Math.min(rowMin, curr[j]);
    }
    if (rowMin > maxDistance) return false;
    for (let j = 0; j < curr.length; j++) prev[j] = curr[j];
  }
  return prev[b.length] <= maxDistance;
}

function highlight(text, q) {
  if (!q) return text;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`, "gi");
  return text.replace(re, "<strong style='color:var(--accent)'>$1</strong>");
}

function textHasAny(text, terms) {
  const haystack = String(text || "").toLowerCase();
  return terms.some(term => haystack.includes(term));
}

function drugNameHasAny(drug, terms) {
  const name = String(drug?.name || "").toLowerCase();
  return terms.some(term => name.includes(term));
}

function getBrowseCategoryText(drug) {
  return [
    drug?.name,
    drug?.id,
    drug?.cls,
    drug?.timing,
    drug?.note,
    ...(drug?.brandNames || []),
    ...Object.keys(drug?.props || {}),
  ].filter(Boolean).join(" ").toLowerCase();
}

function normalizeBrowseCategoryText(text) {
  return ` ${String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()} `;
}

function browseTextHasAny(text, terms) {
  const haystack = normalizeBrowseCategoryText(text);
  return terms.some(term => {
    const needle = normalizeBrowseCategoryText(term).trim();
    return needle && haystack.includes(` ${needle} `);
  });
}

function browseRuleMatches(text, rule) {
  if (browseTextHasAny(text, rule.terms || [])) return true;
  const raw = String(text || "").toLowerCase();
  return (rule.contains || []).some(term => raw.includes(String(term || "").toLowerCase()));
}

const BROWSE_CATEGORY_RULES = [
  {
    category:"Recreational & Social",
    terms:["recreational", "psychedelic", "hallucinogen", "empathogen", "dissociative", "cannabinoid", "alcohol", "cannabis", "mdma", "ghb", "cocaine", "heroin", "poppers", "kratom", "ayahuasca", "ketamine", "psilocybin", "lsd", "dmt", "2c-b", "2c-i", "mephedrone", "ibogaine"],
    contains:["cannabinoid"],
  },
  {
    category:"Dermatology, Eye & Local Care",
    terms:["ophthalmic", "glaucoma", "dry eye", "intravitreal", "ocular", "eye", "otic", "topical", "dermatology", "dermatologic", "acne", "psoriasis", "eczema", "rosacea", "keratolytic", "retinoid", "sunscreen", "wound", "local anesthetic", "prilocaine", "benzoyl peroxide", "adapalene", "tazarotene", "crisaborole", "mupirocin", "bacitracin"],
    contains:["fluocinolone", "fluocinonide", "fluorometholone", "difluprednate", "flurandrenolide", "loteprednol", "clobetasol", "halobetasol", "desonide", "desoximetasone", "alclometasone", "amcinonide", "betamethasone", "triamcinolone", "hydroquinone", "homatropine", "lodoxamide", "apraclonidine", "pemirolast", "bimatoprost", "travoprost", "latanoprost", "olopatadine", "tropicamide", "pilocarpine", "becaplermin", "eflornithine", "ingenol", "methoxsalen", "amlexanox"],
  },
  {
    category:"Renal, Electrolytes & Urologic",
    terms:["renal", "kidney", "urologic", "urology", "overactive bladder", "bph", "phosphate binder", "potassium binder", "electrolyte", "sodium solution", "sodium bicarbonate", "calcium salt", "calcium carbonate", "hypertonic", "isotonic", "crystalloid", "resuscitation fluid", "plasma expander", "colloid", "dialysis", "diuretic", "loop diuretic", "thiazide", "uricosuric", "urate", "gout", "xanthine oxidase", "xo inhibitor", "probenecid", "carbonic anhydrase", "mra", "mineralocorticoid", "antimuscarinic"],
    contains:["gliflozin", "benzbromarone", "lesinurad", "ethacrynic", "acetazolamide", "methazolamide", "amiloride", "bumetanide", "torsemide", "deferasirox", "alfuzosin", "silodosin", "mirabegron", "vibegron", "darifenacin", "fesoterodine", "flavoxate", "oxybutynin", "tolterodine", "trospium", "bethanechol", "cevimeline", "uric acid"],
  },
  {
    category:"Mental Health & Neurology",
    terms:["ssri", "snri", "tca", "maoi", "rima", "antidepressant", "atypical ad", "nassa", "anxiolytic", "antipsychotic", "atypical ap", "typical ap", "mood stabilizer", "anticonvulsant", "antiepileptic", "antiseizure", "barbiturate", "triptan", "ditan", "cgrp", "migraine", "dopamine", "dopa", "parkinson", "parkinsonism", "comt inhibitor", "dementia", "acetylcholinesterase", "multiple sclerosis", "s1p receptor", "potassium channel blocker", "orexin", "vmat2", "wakefulness", "wake-promoting", "wake-promoting agent", "hypnotic", "zolpidem", "z-drug", "melatonin", "adhd", "stimulant", "methylxanthine", "nri", "amphetamine", "modafinil", "histamine h3 inverse agonist", "nicotine dependence"],
    contains:["xanthine", "aminophylline", "phenobarbital", "phenytoin", "ethosuximide", "deutetrabenazine", "bromocriptine", "carbidopa", "levodopa", "clozapine", "quetiapine", "dextromethorphan", "doxylamine", "esketamine", "flupenthixol", "mianserin", "blonanserin", "levomepromazine", "mesoridazine", "sertindole", "sibutramine", "ulotaront", "viloxazine", "xanomeline", "pridopidine", "tiagabine", "perampanel", "mephenytoin", "benztropine", "dalfampridine", "istradefylline", "etrasimod", "acamprosate", "bupropion hydrochloride", "flibanserin", "pitolisant", "suvorexant", "lemborexant", "daridorexant", "lofexidine", "clonidine"],
  },
  {
    category:"Cardiovascular & Blood",
    terms:["statin", "fibrate", "lipid-lowering", "pcsk9", "cholesterol", "omega-3", "beta-blocker", "ace inhibitor", "arb", "ccb", "calcium channel blocker", "antihypertensive", "blood pressure", "alpha-blocker", "antianginal", "antiarrhythmic", "cardiac glycoside", "heart rate", "if current", "myosin inhibitor", "inotrope", "vasopressor", "pressor", "antiplatelet", "anticoag", "anticoagulant", "doac", "direct thrombin", "factor xa", "heparin", "low molecular weight heparin", "thrombolytic", "tissue plasminogen", "antifibrinolytic", "coagulation factor", "hemophilia", "pde5 inhibitor", "nitrate", "vasodilator", "prostacyclin", "endothelin", "sgc stimulator", "thrombopoietin", "erythroid maturation", "itp"],
    contains:["sartan", "pril", "olol", "dipine", "dihydropyridine", "azosin", "afil", "aliskiren", "antihypertensive", "bepridil", "vernakalant", "aficamten", "mavacamten", "atrasentan", "anagrelide", "fostamatinib", "luspatercept", "pentoxifylline", "fluindione", "warfarin"],
  },
  {
    category:"Pain, Sedation & Anesthesia",
    terms:["opioid", "analgesic", "nsaid", "muscle relaxant", "anesthetic", "anesthetics", "sedative", "hypnotic", "neuromuscular blocker", "nmb", "relaxant binding", "malignant hyperthermia", "benzodiazepine", "volatile anesthetic", "volatile anesthetics", "icu sedative", "alpha-2 agonist", "dexmedetomidine", "lidocaine", "ketorolac", "acetaminophen", "botulinum toxin"],
    contains:["profen", "fenac", "coxib", "fentanil", "morph", "codeine", "tramadol", "meperidine", "ketobemidone", "propoxyphene", "dipyrone", "nitazene", "oliceridine", "piritramide", "tilidine", "opium", "botulinum", "tolperisone", "carisoprodol", "chlorzoxazone"],
  },
  {
    category:"Infectious Disease",
    terms:["antibiotic", "antimicrobial", "macrolide", "fluoroquinolone", "penicillin", "cephalosporin", "carbapenem", "beta-lactam", "rifamycin", "sulfonamide", "nitrofuran", "nitroimidazole", "lincosamide", "glycopeptide", "tetracycline", "antistaphylococcal", "antitubercular", "antimycobacterial", "antiviral", "antifungal", "azole", "echinocandin", "antimalarial", "aminoquinoline", "antiretroviral", "nrti", "protease inhibitor", "integrase inhibitor", "ccr5", "hcv", "ns5b", "aminoglycoside", "sulfone", "anthelmintic", "antiparasitic", "antiprotozoal", "orthopoxvirus", "vaccine"],
    contains:["cillin", "cef", "ceft", "penem", "floxacin", "cycline", "thromycin", "conazole", "fungin", "vir", "quine", "artem", "artesunate", "avibactam", "clavulanate", "clofazimine", "mafenide", "clotrimazole", "miconazole", "ciclopirox", "chlorhexidine", "isoniazid", "trimethoprim", "polymyxin", "lumefantrine", "rimantadine", "stavudine"],
  },
  {
    category:"Oncology, Immunology & Transplant",
    terms:["oncology", "antineoplastic", "chemotherapy", "alkylating", "antimetabolite", "taxane", "taxanes", "platinum", "topoisomerase", "proteasome", "parp", "pi3k", "bcl-2", "braf", "mek inhibitor", "egfr", "bcr-abl", "vegfr", "fgfr", "alk tyrosine", "kinase inhibitor", "btk inhibitor", "cdk4/6", "hdac", "ezh2", "kit/pdgfra", "cyp17", "antibody-drug conjugate", "bispecific", "checkpoint", "pd-1", "pd-l1", "ctla-4", "immunosuppressant", "transplant", "dmard", "jak", "jak1", "tyk2", "mtor", "calcineurin", "tnf", "interleukin", "il-1 receptor", "il-1 trap", "monoclonal antibody", "biologic", "immune globulin", "blys", "rankl", "sclerostin", "complement", "p-selectin", "type i interferon", "t-cell", "pyrimidine synthesis", "dhodh", "cd123-directed cytotoxin"],
    contains:["tinib", "ciclib", "platin", "rubicin", "tecan", "mustine", "parib", "rafenib", "taxel", "trexed", "trastuzumab", "bevacizumab", "nivolumab", "pembrolizumab", "ipilimumab", "atezolizumab", "durvalumab", "avelumab", "rituximab", "cetuximab", "ifosfamide", "dactinomycin", "fludarabine", "cytarabine", "gemcitabine", "capecitabine", "fluoropyrimidine", "thioguan", "thiopurine", "mercaptopurine", "asparaginase", "l-asparagine", "chop", "fec100", "vinblastine", "vindesine", "teniposide", "trabectedin", "tipifarnib", "vandetanib", "mitotane", "bisantrene", "belzutifan", "lonafarnib", "anastrozole", "letrozole", "exemestane", "fulvestrant", "bicalutamide", "goserelin", "leuprolide", "mycophenolate", "iguratimod", "anakinra", "rilonacept", "tagraxofusp", "glucarpidase", "dexrazoxane", "amifostine"],
  },
  {
    category:"GI, Endocrine & Metabolic",
    terms:["ppi", "proton pump", "h2 blocker", "gi", "ibd", "5-asa", "alpha-glucosidase", "antidiarrheal", "prokinetic", "antiemetic", "5-ht3", "laxative", "binding resin", "bile acid sequestrant", "pancreatic enzyme", "antacid", "alkalinizing", "biguanide", "sglt2", "sglt2i", "dpp-4", "dpp-4i", "glp-1", "sulfonylurea", "meglitinide", "tzd", "thiazolidinedione", "insulin", "amylin", "diabetes", "antidiabetic", "thyroid", "antithyroid", "bisphosphonate", "calcimimetic", "parathyroid", "vitamin d analog", "hif-ph", "anemia", "erythropoiesis", "iron", "metabolic", "somatostatin", "tyrosinemia", "tetrahydrobiopterin", "phenylalanine", "glucosylceramide", "growth hormone", "igf-1", "glucocorticoid", "glucocorticoids", "corticosteroid", "corticosteroids"],
    contains:["gliptin", "glutide", "glinide", "glyburide", "gliclazide", "gliquidone", "acarbose", "miglitol", "orlistat", "vonoprazan", "resmetirom", "seladelpar", "troglitazone", "sepiapterin", "prazole", "tidine", "salazine", "mesalazine", "balsalazide", "diphenoxylate", "atropine", "colestipol", "methylcellulose", "dicyclomine", "hyoscyamine", "methimazole", "risedronate", "ibandronate", "alendronate", "teriparatide", "abaloparatide", "calcipotriene", "lanreotide", "octreotide", "aprepitant", "fosaprepitant", "casopitant", "dolasetron", "ondansetron", "tropisetron", "pyridoxine"],
  },
  {
    category:"Respiratory, Allergy & Cough",
    terms:["antihistamine", "beta-2 agonist", "bronchodilator", "laba", "lama", "decongestant", "antitussive", "expectorant", "leukotriene", "5-lipoxygenase", "pde4", "muscarinic", "cftr", "respiratory", "asthma", "copd", "allergy", "cough", "nasal", "inhaled", "fluticasone", "budesonide", "beclomethasone", "albuterol"],
    contains:["aclidinium", "formoterol", "salmeterol", "vilanterol", "umeclidinium", "glycopyrronium", "glycopyrrolate", "levalbuterol", "terbutaline", "epinephrine auto-injector", "oxymetazoline", "azelastine", "alcaftadine", "bepotastine", "chlorpheniramine", "clemastine", "desloratadine", "levocetirizine", "epinastine", "nedocromil", "cromolyn", "cyproheptadine", "benzonatate", "guaifenesin", "noscapine", "ivacaftor", "elexacaftor", "tezacaftor", "pirfenidone"],
  },
  {
    category:"Hormones & Reproductive",
    terms:["estrogen", "estradiol", "progestin", "progesterone", "contraceptive", "serm", "progesterone receptor", "5-ari", "androgen", "testosterone", "antiandrogen", "gnrh", "uterotonic", "fertility", "reproductive", "pregnancy", "clomiphene", "ulipristal", "levonorgestrel", "norethindrone", "drospirenone"],
    contains:["estrone", "estropipate", "hydroxyprogesterone", "hydroxytestosterone", "androstenedione", "dronabinol", "desoxycortone", "cortisone", "fludrocortisone", "dutasteride", "finasteride", "dinoprostone", "elagolix", "ospemifene", "raloxifene", "toremifene"],
  },
  {
    category:"Metabolites & Active Moieties",
    terms:["metabolite", "active metabolite", "carboxylic acid", "glucuronide", "sulfate", "sulfoxide", "hydroxy", "desmethyl", "desethyl", "norfluoxetine", "noroxycodone", "noroxymorphone", "n-des", "o-des", "r-eddp", "s-eddp", "sn-38", "simvastatin acid", "lovastatin acid", "atorvastatin lactone", "thiol metabolite", "quinone", "solanidine", "cotinine", "ritalinic acid"],
    contains:["hydroxy", "dehydro", "desmethyl", "desethyl", "nor", "glucuronide", "sulfate", "sulfoxide", "carboxy", "n-oxide", "eddp", "ar-c", "dt-678", "sn-38", "cotinine", "bufuralol", "debrisoquine", "spartein", "coproporphyrin", "bilirubin", "gimeracil", "oteracil", "endoxifen", "pentoxifylline m5", "rhodamine", "toluidine blue", "uracil"],
  },
  {
    category:"Rare Disease & Advanced Therapies",
    terms:["enzyme replacement", "gene therapy", "aav", "oligonucleotide", "antisense", "exon-skipping", "sma", "sod1", "cftr modulator", "rare disease", "lysosomal", "gaucher", "hemoglobin s", "sickle", "fgf23", "smn2", "phenylalanine ammonia lyase"],
  },
  {
    category:"Diagnostics, Antidotes & Procedures",
    terms:["diagnostic", "imaging agent", "contrast", "radiopharmaceutical", "antidote", "reversal agent", "chelator", "detox", "methemoglobinemia", "dye", "surgery", "procedure", "current context", "clinical context"],
    contains:["fomepizole", "calcein", "dimercaprol"],
  },
  {
    category:"Supplements, Foods & Environment",
    terms:["supplement", "vitamin", "mineral", "herbal", "food", "environment", "environmental", "toxicant", "solvent", "industrial", "grapefruit", "pomegranate", "black pepper", "vitamin k", "charbroiled", "smoked foods", "folic acid", "leucovorin", "calcium", "iron", "zinc", "fluoride"],
    contains:["folate", "methylfolate", "glucose", "arachidonic", "berberine", "bergamottin", "coptisine", "forskolin", "pyridoxal", "silibinin", "ammonium lactate"],
  },
  {
    category:"Source Candidates Pending Review",
    terms:["source candidate drug/substance", "pending identity review", "review candidate"],
  },
];

const BROWSE_CATEGORY_ORDER = [
  "Mental Health & Neurology",
  "Cardiovascular & Blood",
  "Pain, Sedation & Anesthesia",
  "Infectious Disease",
  "Oncology, Immunology & Transplant",
  "GI, Endocrine & Metabolic",
  "Respiratory, Allergy & Cough",
  "Hormones & Reproductive",
  "Dermatology, Eye & Local Care",
  "Renal, Electrolytes & Urologic",
  "Metabolites & Active Moieties",
  "Rare Disease & Advanced Therapies",
  "Diagnostics, Antidotes & Procedures",
  "Supplements, Foods & Environment",
  "Recreational & Social",
  "Source Candidates Pending Review",
];

function getBrowseCategory(drug) {
  const text = getBrowseCategoryText(drug);
  const match = BROWSE_CATEGORY_RULES.find(rule => browseRuleMatches(text, rule));
  return match ? match.category : "Source Candidates Pending Review";
}

const MEDICATION_CLASS_GUIDES = [
  {
    title:"Anticoagulants and antiplatelets",
    note:"Bleeding, CYP2C9/VKORC1, antiplatelet activation, NSAIDs, SSRIs, azoles, and transporter overlap.",
    tags:["bleeding","CYP2C19","CYP2C9","transporters"],
    drugs:["Warfarin","Fluconazole","Ibuprofen"],
    tab:"overview"
  },
  {
    title:"Psychiatry and neurology",
    note:"CYP2D6/CYP2C19 shifts, active-metabolite failures, QT, serotonin toxicity, sedation, and anticholinergic burden.",
    tags:["CYP2D6","CYP2C19","serotonin/QT","burden"],
    drugs:["Paroxetine","Fluoxetine"],
    tab:"overview"
  },
  {
    title:"Cardiology and QT risk",
    note:"Antiarrhythmics, narrow therapeutic index drugs, CYP2D6 metabolism, QT stacking, and electrolyte-sensitive combinations.",
    tags:["QT","NTI","CYP2D6"],
    drugs:["Flecainide","Fluoxetine"],
    genotype:{ CYP2D6:GENOTYPE_PHENOTYPE.PM },
    tab:"genes-metabolites"
  },
  {
    title:"Antibiotics, antifungals, antivirals",
    note:"Macrolides, azoles, rifamycins, boosters, CYP3A4, CYP2C9, P-gp, and OATP pathway risk.",
    tags:["CYP3A4","CYP2C9","P-gp"],
    drugs:["Simvastatin","Clarithromycin"],
    tab:"timing-levels"
  },
  {
    title:"Oncology, immunology, transplant",
    note:"Narrow windows, prodrug activation, genotype actionability, transporters, and strong inhibitor or inducer sensitivity.",
    tags:["NTI","prodrugs","PGx"],
    drugs:["Tacrolimus","Fluconazole"],
    tab:"timing-levels"
  }
];

function renderBrowse() {
  const el = document.getElementById("browseWrap");
  const groups = {};
  DRUG_DB.forEach(d => {
    const cat = getBrowseCategory(d);
    if (!groups[cat]) groups[cat] = [];
    if (!groups[cat].find(x => x.name === d.name)) groups[cat].push(d);
  });

  const sortedCats = [...new Set([...BROWSE_CATEGORY_ORDER, ...Object.keys(groups)])];

  el.innerHTML = renderBrowseClassGuides() + sortedCats.filter(c => groups[c]).map(cat => `
    <div class="browse-cat">
      <div class="browse-cat-title" onclick="toggleBrowseCat(this)">
        ${cat} <span style="font-weight:400;font-size:12px;color:var(--text2)">(${groups[cat].length})</span>
        <span class="arrow">▶</span>
      </div>
      <div class="browse-items" data-cat="${cat}">
        ${groups[cat].sort((a,b)=>a.name.localeCompare(b.name)).map(d => {
          const alias = typeof getDrugSecondaryLabel === "function" ? getDrugSecondaryLabel(d, 2) : "";
          return `<div class="browse-chip ${activeStack.includes(d.name)?'added':''}" onclick="toggleDrug('${d.name.replace(/'/g,"\\'")}')">${d.name}<span class="browse-chip-class">${d.cls}</span>${alias ? `<span class="browse-chip-alias">${alias}</span>` : ""}</div>`;
        }).join("")}
      </div>
    </div>
  `).join("");
}

function renderBrowseClassGuides() {
  return `<div class="class-guide-list">
    ${MEDICATION_CLASS_GUIDES.map((guide, idx) => `<div class="class-guide-card" onclick="loadMedicationClassGuide(${idx})">
      <div class="class-guide-title">${guide.title}</div>
      <div class="class-guide-note">${guide.note}</div>
      <div class="class-guide-tags">${guide.tags.map(tag => `<span class="class-guide-tag">${tag}</span>`).join("")}</div>
      <div class="class-guide-action">Load example: ${guide.drugs.join(" + ")}</div>
    </div>`).join("")}
  </div>`;
}

function loadMedicationClassGuide(index) {
  const guide = MEDICATION_CLASS_GUIDES[index];
  if (!guide) return;
  activeStack = guide.drugs
    .map(name => typeof resolveUrlDrugName === "function" ? resolveUrlDrugName(name) : name)
    .filter(Boolean);
  for (const [gene, phenotype] of Object.entries(guide.genotype || {})) {
    if (GENOTYPE_EFFECTS[gene] && GENOTYPE_EFFECTS[gene][phenotype]) setGenotypeState(gene, phenotype);
  }
  setActiveTab(guide.tab || "overview");
  renderAll();
}

function toggleBrowseCat(el) {
  el.classList.toggle("open");
  el.nextElementSibling.classList.toggle("show");
}

function toggleDrug(name) {
  if (activeStack.includes(name)) removeDrug(name);
  else addDrug(name);
}

function toggleSection(id) {
  const body = document.getElementById(id + "Body");
  if (!body) return;
  body.classList.toggle("open");
  manualSectionToggleKeys[id] = getRenderCacheKey();
}

function applyRawMetaboliteMapDefault() {
  const body = document.getElementById("metabBody");
  if (!body) return;
  const key = getRenderCacheKey();
  if (manualSectionToggleKeys.metab === key) return;
  const rows = typeof getRenderComputationCache === "function"
    ? getRenderComputationCache().activeMoietyRows
    : [];
  if (rows.length) body.classList.remove("open");
  else body.classList.add("open");
}

function hideSectionAndClear(sectionId, bodyId, countId = null) {
  const section = document.getElementById(sectionId);
  const body = bodyId ? document.getElementById(bodyId) : null;
  const count = countId ? document.getElementById(countId) : null;
  if (section) section.style.display = "none";
  if (body) body.innerHTML = "";
  if (count) count.textContent = "";
}

function currentStackShareUrl(tab = activeTab) {
  const params = [];
  if (activeStack.length) {
    params.push(["substances", activeStack.map(name => {
      const actor = typeof getStackSupplementActor === "function" ? getStackSupplementActor(name) : null;
      const drug = typeof getStackDrug === "function" ? getStackDrug(name) : getDrug(name);
      return actor?.id || drug?.id || toGraphId(name);
    }).join(",")]);
  }
  for (const token of activeGenotypeUrlTokens()) params.push(["genotype", token]);
  if (isPatientAudience()) params.push(["audience", audienceMode]);
  if (!isEnglishLanguage()) params.push(["lang", languageMode]);
  if (tab) params.push(["tab", tab]);
  const query = params
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeUrlStateValueLocal(value)}`)
    .join("&");
  return `https://diogonmpacheco.github.io/Diognosis/index.html${query ? `?${query}` : ""}`;
}

function activeGenotypeUrlTokens() {
  const tokens = [];
  const genotypeState = typeof activeGenotype !== "undefined" ? activeGenotype : {};
  for (const [gene, phenotype] of Object.entries(genotypeState || {})) {
    if (GENOTYPE_EFFECTS[gene] && phenotype && phenotype !== GENOTYPE_PHENOTYPE.NM) {
      tokens.push(`${gene}:${genotypeTokenForUrl(phenotype)}`);
    } else if (typeof GENOTYPE_RISK_EFFECTS !== "undefined" && GENOTYPE_RISK_EFFECTS[gene] && phenotype === GENOTYPE_RISK_STATUS.PRESENT) {
      tokens.push(riskMarkerTokenForUrl(gene));
    }
  }
  return tokens;
}

function genotypeTokenForUrl(phenotype) {
  if (phenotype === GENOTYPE_PHENOTYPE.PM) return "PM";
  if (phenotype === GENOTYPE_PHENOTYPE.IM) return "IM";
  if (phenotype === GENOTYPE_PHENOTYPE.UM) return "UM";
  return String(phenotype || "");
}

function riskMarkerTokenForUrl(gene) {
  if (gene === "G6PD deficiency") return "G6PD:deficiency";
  if (gene === "RYR1/CACNA1S MH variant") return "RYR1:present";
  return `${gene}:present`;
}

function encodeUrlStateValueLocal(value) {
  return encodeURIComponent(value).replace(/%2C/g, ",").replace(/%3A/g, ":");
}

function buildDiognosisIssueUrl({ type = "data", title = "Diognosis feedback", focus = "", details = "", evidenceRefs = [] } = {}) {
  const stack = activeStack.length ? activeStack.join(" + ") : "No active stack";
  const shareLink = currentStackShareUrl(activeTab || "overview");
  const currentUrl = typeof window !== "undefined" && window.location ? window.location.href : "";
  const labels = type === "bug" ? "bug" : "data-review";
  const body = [
    "## Diognosis context",
    `- Stack: ${stack}`,
    `- Share link: ${shareLink}`,
    currentUrl ? `- Current URL: ${currentUrl}` : "",
    focus ? `- Focus: ${focus}` : "",
    evidenceRefs && evidenceRefs.length ? `- Evidence refs: ${evidenceRefs.join(", ")}` : "",
    "",
    "## What should change?",
    details || "Describe the suspected issue, missing evidence, stale source, or confusing behavior.",
    "",
    "## Public sources",
    "Add PMID, DOI, DailyMed/FDA, CPIC/DPWG, guideline, label, or other public source identifiers.",
    "",
    "## Review note",
    "Diognosis is educational, source-linked, pre-v1, and pending professional clinical review. Diognosis outputs are not medical advice or clinical decision support. Do not include private patient data."
  ].filter(Boolean).join("\n");
  const params = new URLSearchParams({
    title,
    body,
    labels,
  });
  return `https://github.com/diogonmpacheco/Diognosis/issues/new?${params.toString()}`;
}

function renderFeedbackLink(label, options = {}) {
  const href = buildDiognosisIssueUrl(options);
  return `<a class="feedback-link" href="${escapeHtml(href)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${escapeHtml(label)}</a>`;
}

// ── RENDER ALL ──
function renderAll() {
  syncLanguageModeUI();
  syncAudienceModeUI();
  const activeDrugNames = typeof getActiveDrugNames === "function" ? getActiveDrugNames() : activeStack.filter(name => getDrug(name));
  arrangeAdvancedSections();
  renderMedList();
  renderGenetics();
  if (activeStack.length >= 1) {
    renderFoldBars();
    renderMetabolites();
    renderPathwayDiversions();
    renderCascade();                // Phase 3: graph traversal
    renderExternalSafetyContext();  // External context, not severity-bearing
    renderGenotypePanel();          // Phase 5 #2: genotype-stratified evidence
    if (typeof renderPhenoconversionDashboard === "function") renderPhenoconversionDashboard();
    if (typeof renderActiveMoietyBalance === "function") renderActiveMoietyBalance();
    applyRawMetaboliteMapDefault();
    renderMechanisticPredictions(); // Experimental model predictions
    renderPhenotypeAccumulation();  // Phase 5 #6: serotonin/QTc/anticholinergic
    renderPKSimulation();           // Phase 5 #1: 1-compartment PK curves
    if (typeof renderPersistenceTimeline === "function") renderPersistenceTimeline();
    renderInteractionGraph();       // Phase 5 #4: D3 force-directed graph
    renderWashoutCalendar();        // Phase 5 #9: safe-to-switch dates
    renderAdverseBurden();          // Phase 5 #10: ACB + Beers + fall risk
    document.getElementById("foldSection").style.display = activeDrugNames.length ? "" : "none";
    document.getElementById("metabSection").style.display = activeDrugNames.length ? "" : "none";
    document.getElementById("pdSection").style.display = activeDrugNames.length ? "" : "none";
  } else {
    currentInteractionFindings = [];
    hideSectionAndClear("findingSection", "findingBody", "findingCount");
    hideSectionAndClear("phenoconversionSection", "phenoconversionBody", "phenoconversionCount");
    hideSectionAndClear("activeMoietySection", "activeMoietyBody", "activeMoietyCount");
    hideSectionAndClear("persistenceTimelineSection", "persistenceTimelineBody", "persistenceTimelineCount");
    hideSectionAndClear("foldSection", "foldBody");
    hideSectionAndClear("metabSection", "metabBody");
    hideSectionAndClear("pdSection", "pdBody");
    hideSectionAndClear("cascadeSection", "cascadeBody");
    hideSectionAndClear("evidenceSection", "evidenceBody", "evidenceCount");
    hideSectionAndClear("pendingReviewEnrichmentSection", "pendingReviewEnrichmentBody", "pendingReviewEnrichmentCount");
    hideSectionAndClear("externalContextSection", "externalContextBody", "externalContextCount");
    hideSectionAndClear("reviewWorkbenchSection", "reviewWorkbenchBody", "reviewWorkbenchCount");
    hideSectionAndClear("reviewSummarySection", "reviewSummaryBody", "reviewSummaryCount");
    hideSectionAndClear("mechanismWhySection", "mechanismWhyBody", "mechanismWhyCount");
    hideSectionAndClear("scenarioSnapshotSection", "scenarioSnapshotBody", "scenarioSnapshotCount");
    hideSectionAndClear("metaboliteGapSection", "metaboliteGapBody", "metaboliteGapCount");
    hideSectionAndClear("contributeSection", "contributeBody");
    hideSectionAndClear("warningPathSection", "warningPathBody", "warningPathCount");
    hideSectionAndClear("qualitySection", "qualityBody", "qualityCount");
    hideSectionAndClear("genotypeSection", "genotypeBody");
    hideSectionAndClear("mechanisticSection", "mechanisticBody", "mechanisticCount");
    hideSectionAndClear("phenoAccumSection", "phenoAccumBody");
    hideSectionAndClear("pkSimSection", "pkSimBody");
    hideSectionAndClear("persistenceTimelineSection", "persistenceTimelineBody", "persistenceTimelineCount");
    hideSectionAndClear("graphSection", "graphBody");
    hideSectionAndClear("washoutSection", "washoutBody");
    hideSectionAndClear("burdenSection", "burdenBody");
  }
  if (activeStack.length >= 2) {
    const risk = typeof getRenderComputationCache === "function"
      ? getRenderComputationCache().risk
      : calcRisk();
    renderRiskGauge(risk);
    renderInteractionFindingsOverview(risk);
    if (typeof renderMechanismWhyPaths === "function") renderMechanismWhyPaths();
    renderInteractions(risk.interactions);
    renderCombinationProducts();
    renderTransporterDDI();
    renderMatrix(risk.interactions);
    renderAlternatives();
    document.getElementById("riskSection").style.display = "";
    document.getElementById("findingSection").style.display = "";
    document.getElementById("interSection").style.display = "";
    document.getElementById("comboSection").style.display = "";
    document.getElementById("transporterSection").style.display = "";
    document.getElementById("matrixSection").style.display = "";
    document.getElementById("altSection").style.display = "";
  } else {
    if (activeDrugNames.length) {
      renderInteractionFindingsOverview({ interactions:[] });
      if (typeof renderMechanismWhyPaths === "function") renderMechanismWhyPaths();
    }
    else {
      currentInteractionFindings = [];
      hideSectionAndClear("findingSection", "findingBody", "findingCount");
      hideSectionAndClear("mechanismWhySection", "mechanismWhyBody", "mechanismWhyCount");
      hideSectionAndClear("warningPathSection", "warningPathBody", "warningPathCount");
    }
    hideSectionAndClear("riskSection", "riskBody");
    hideSectionAndClear("interSection", "interBody", "interCount");
    hideSectionAndClear("comboSection", "comboBody", "comboCount");
    hideSectionAndClear("transporterSection", "transporterBody", "transporterCount");
    hideSectionAndClear("matrixSection", "matrixBody");
    hideSectionAndClear("altSection", "altBody");
  }
  renderSummaryBar();
  applyAudienceModeVisibility();
  updateEmptyTabs();
  if (viewMode === "browse") renderBrowse();
}

function renderMedList() {
  const el = document.getElementById("medList");
  const countEl = document.getElementById("medCount");
  if (!activeStack.length) {
    el.innerHTML = `<div class="empty-state"><div class="icon">💊</div>${safePublicHtml(uiText("medEmpty"))}</div>`;
    countEl.textContent = "";
    return;
  }
  countEl.textContent = `${activeStack.length} substance${activeStack.length>1?"s":""}`;
  el.innerHTML = activeStack.map(name => {
    const actor = typeof getStackSupplementActor === "function" ? getStackSupplementActor(name) : null;
    const drug = typeof getStackDrug === "function" ? getStackDrug(name) : getDrug(name);
    const actorId = actor?.id || "";
    const escaped = (drug ? drug.name : name).replace(/'/g,"\\'");
    const tiers = DOSE_TIERS[name];
    let doseHtml = "";
    if (drug && tiers) {
      const current = getDoseTier(name);
      const opts = Object.entries(tiers.tiers).map(([k,v]) =>
        `<option value="${k}"${k===current?" selected":""}>${v.label}</option>`
      ).join("");
      doseHtml = `<select class="dose-select" onclick="event.stopPropagation()" onchange="setDoseTier('${escaped}',this.value)">${opts}</select>`;
    }
    const secondary = drug
      ? (typeof getDrugSecondaryLabel === "function" ? getDrugSecondaryLabel(drug, 2) : "")
      : (actor ? formatActorSources(actor) : "");
    const primary = drug ? getDrugDisplayName(drug) : (actor ? actor.name : name);
    const labelHtml = `<span class="med-chip-name"><span class="med-chip-primary">${primary}</span>${secondary ? `<span class="med-chip-secondary">${secondary}</span>` : ""}</span>`;
    const removeAction = actor && !drug ? `removeFoodActor('${actorId}')` : `removeDrug('${escaped}')`;
    return `<span class="med-chip" title="${secondary ? secondary.replace(/"/g, "&quot;") : ""}">${labelHtml}${doseHtml}<span class="x" onclick="${removeAction}">×</span></span>`;
  }).join("") + renderActorExposureSummary();
}

function renderActorExposureSummary() {
  if (!activeStack.length || typeof computeActorExposureDeltas !== "function") return "";
  const rows = computeActorExposureDeltas(activeStack)
    .filter(row => row.direction !== "baseline")
    .slice(0, 8);
  if (!rows.length) return "";
  return `<div class="exposure-summary">${rows.map(row => {
    const up = row.direction === "increase";
    const low = row.confidence === "low" || row.qualitative || !row.fold;
    const chipClass = low ? "low" : (up ? "up" : "down");
    const arrow = up ? "↑" : row.direction === "decrease" ? "↓" : "↔";
    const value = row.fold ? `${arrow} ${row.fold.toFixed(row.fold >= 10 ? 1 : 2)}×` : `${arrow} direction only`;
    const parent = row.type === "metabolite" ? ` from ${row.parent}` : "";
    return `<div class="exposure-line">
      <span class="exposure-name">${row.name}</span>
      <span class="exposure-type">${row.type}</span>
      <span class="exposure-chip ${chipClass}">${value}</span>
      <span>${safePublicHtml(row.driver || "current stack")}${safePublicHtml(parent)}${row.note ? ` · ${safePublicHtml(row.note)}` : ""}</span>
    </div>`;
  }).join("")}</div>`;
}

function renderRiskGauge(risk) {
  const el = document.getElementById("riskBody");
  const pct = Math.min(100, risk.score);
  const barColor = risk.score >= 60 ? "var(--red)" : risk.score >= 30 ? "var(--amber)" : "var(--green)";
  el.innerHTML = `
    <div class="gauge-wrap">
      <div class="gauge-label" style="color:${risk.color}">${risk.level}</div>
      <div class="gauge-bar"><div class="gauge-fill" style="width:${pct}%;background:${barColor}"></div></div>
      <div class="gauge-score">Risk score: ${risk.score}/100</div>
      <div class="risk-factors">
        ${risk.factors.map(f => `<span class="risk-tag ${safeAttr(f.color)}">${safePublicHtml(f.label)}</span>`).join("")}
      </div>
    </div>`;
}
