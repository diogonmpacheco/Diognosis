// Diognosis — safe rendering helpers for generated/imported strings

function safeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeAttr(value) {
  return safeHtml(value).replace(/`/g, "&#96;");
}

function safeUrl(value, fallback = "#") {
  const raw = safeText(value);
  if (!raw) return fallback;
  try {
    const base = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "https://diognosis.local";
    const url = new URL(raw, base);
    if (url.protocol === "https:" || url.protocol === "http:" || url.protocol === "mailto:") return url.href;
  } catch (error) {
    return fallback;
  }
  return fallback;
}

function safeChoice(value, allowedValues = [], fallback = "") {
  const normalized = safeText(value);
  return allowedValues.includes(normalized) ? normalized : fallback;
}

function safeText(value, fallback = "") {
  const text = String(value ?? fallback ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

function safeTextList(values = [], separator = " · ") {
  return values
    .map(value => safeText(value))
    .filter(Boolean)
    .map(value => safeHtml(value))
    .join(separator);
}

const PUBLIC_INTERNAL_REF_PATTERN = /ev_(?:top100_live_coverage_adapter|top250_live_coverage_adapter|top100_gold_enrichment_adapter|ninety_percent_live_coverage_adapter|ddi_expansion_pack_adapter|metabolite_expansion_pack_adapter|pgx_transporter_expansion_adapter|drug_count_expansion_batch)/i;

function hasInternalCoverageRef(refs = []) {
  return (refs || []).some(ref => PUBLIC_INTERNAL_REF_PATTERN.test(String(ref || "")));
}

function publicDisplayText(value, fallback = "") {
  let text = safeText(value, fallback);
  if (!text) return "";
  text = text
    .replace(/\bPhase\s*\d+\s+[^:;.]{0,140}:\s*/gi, "")
    .replace(/\bPhase\s*\d+\b/gi, "")
    .replace(/\btop[-\s]?(?:100|250)\s+(?:gold\s+)?(?:live\s+)?/gi, "")
    .replace(/\btop(?:100|250)\b/gi, "coverage")
    .replace(/\b(?:90%|ninety[-\s]?percent)\s+(?:live\s+)?/gi, "")
    .replace(/\bInternal Diognosis\b/gi, "Diognosis")
    .replace(/\bsource[-_\s]?specific\b/gi, "source linked")
    .replace(/\bpending[-_\s]?review\b/gi, "pending review")
    .replace(/\b(?:live\s+)?(?:coverage|enrichment)\s+adapters?\b/gi, "coverage context")
    .replace(/\b(?:route|class|class route|transporter route|pending review|gold pair|half life class|route half life|drug count|metabolite|DDI|PGx\/transporter|transporter)\s+adapters?\b/gi, "coverage context")
    .replace(/\badapters?\b/gi, "context")
    .replace(/\bexpansion(?: pack)?\b/gi, "coverage")
    .replace(/\bsource_specific\b/gi, "source linked")
    .replace(/\broute_adapter\b/gi, "route context")
    .replace(/\bclass_route\b/gi, "class route")
    .replace(/\bbulk_[a-z0-9_ -]+\b/gi, "grouped coverage")
    .replace(/\bclinicalConcernKey\b/g, "clinical concern key")
    .replace(/\bdetail-only\b/gi, "supporting detail")
    .replace(/\bsource ids?\b/gi, "source details")
    .replace(/\braw warning paths?\b/gi, "technical details")
    .replace(/\bengine rows?\b/gi, "details")
    .replace(/\bmodel-only\b/gi, "modeled")
    .replace(/_/g, " ")
    .replace(/\bcoverage context context\b/gi, "coverage context")
    .replace(/\bcoverage coverage\b/gi, "coverage")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return text || fallback || "";
}

function safePublicHtml(value, fallback = "") {
  return safeHtml(publicDisplayText(value, fallback));
}

function isSyntheticContextName(value) {
  const text = String(value || "");
  return /\btop[-\s]?100\s+gold\b/i.test(text) ||
    /\blive\s+(?:clearance|metabolite|route|coverage)\s+context\b/i.test(text) ||
    /\bprimary\s+live\s+metabolite\s+context\b/i.test(text) ||
    /\b(?:CYP|UGT|ABCB|ABCG|SLCO|SLC|OATP|OAT|OCT|MATE|P-gp|BCRP)[A-Z0-9/ -]*\s+live\s+context\b/i.test(text);
}

function isPublicSyntheticContextRow(row = {}) {
  if (!row) return false;
  if (row.publicFacing === false || row.syntheticContext === true) return true;
  const refs = row.evidenceRefs || row.evidence?.refs || [];
  if (!hasInternalCoverageRef(refs)) return false;
  const text = [
    row.n,
    row.name,
    row.actor,
    row.metaboliteName,
    row.role,
    row.a,
    row.note,
  ].filter(Boolean).join(" ");
  return isSyntheticContextName(text) ||
    /\b(?:clearance|activation|active[-\s]?moiety|toxicity|exposure|transport|route)\s+context\b/i.test(text);
}

function publicMetaboliteLabel(rowOrName, parent = "") {
  const row = rowOrName && typeof rowOrName === "object" ? rowOrName : { n:rowOrName };
  if (isPublicSyntheticContextRow(row)) {
    return parent ? `${parent} exposure context` : "Exposure context";
  }
  return publicDisplayText(row.n || row.name || row.actor || row.metaboliteName || rowOrName || "Metabolite");
}

function publicEvidenceTitle(study = {}) {
  if (!study) return "Evidence entry";
  if (hasInternalCoverageRef([study.id])) {
    if (/top100_gold/i.test(study.id)) return "Top-priority live coverage context";
    if (/ninety_percent/i.test(study.id)) return "Broad live coverage context";
    if (/top(?:100|250)_live/i.test(study.id)) return "Live route and timing coverage context";
    if (/ddi_expansion/i.test(study.id)) return "Interaction coverage context";
    if (/metabolite_expansion/i.test(study.id)) return "Metabolite and active-moiety coverage context";
    if (/pgx_transporter/i.test(study.id)) return "PGx and transporter coverage context";
    if (/drug_count/i.test(study.id)) return "New substance coverage context";
  }
  return publicDisplayText(study.title || study.id || "Evidence entry");
}

function publicEvidenceReferenceLabel(ref) {
  const study = typeof getStudy === "function" ? getStudy(ref) : (typeof STUDY_DB !== "undefined" ? STUDY_DB?.[ref] : null);
  if (study?.pmid) return `PMID:${study.pmid}`;
  if (study?.doi) return "DOI";
  if (hasInternalCoverageRef([ref])) return publicEvidenceTitle({ id:ref });
  return study ? publicEvidenceTitle(study) : "source-linked evidence";
}
