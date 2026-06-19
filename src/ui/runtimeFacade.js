// Diognosis — stable V1 handoff facade for wrapper/redesign apps

function currentV1HandoffState() {
  const substances = activeStack.map(name => {
    const actor = typeof getStackSupplementActor === "function" ? getStackSupplementActor(name) : null;
    const drug = typeof getStackDrug === "function" ? getStackDrug(name) : getDrug(name);
    return {
      id: actor?.id || drug?.id || toGraphId(name),
      name: actor?.name || drug?.name || publicDisplayText(name),
      kind: actor ? (actor.type || "actor") : (drug ? "drug" : "unrecognized"),
      className: drug?.cls || actor?.type || "",
    };
  });
  const findings = getCurrentPublicFindingPresentations()
    .slice(0, 12)
    .map(item => ({
      title: publicDisplayText(item.title),
      priority: publicDisplayText(item.priorityLabel || item.severity || ""),
      tab: item.targetTab || "overview",
      elementId: item.targetElementId || "",
    }));
  return {
    version: {
      engine: DIOGNOSIS_VERSION.engine,
      drugDb: DIOGNOSIS_VERSION.drugDb,
      schema: DIOGNOSIS_VERSION.schema,
      released: DIOGNOSIS_VERSION.released,
      drugCount: typeof DIOGNOSIS_STATS !== "undefined" && DIOGNOSIS_STATS.drugs ? DIOGNOSIS_STATS.drugs : DIOGNOSIS_VERSION.drugCount,
    },
    audience: audienceMode,
    reviewer: isReviewerMode(),
    activeTab,
    substances,
    summary: {
      title: publicDisplayText(document.querySelector("#summaryBar .summary-title")?.textContent || ""),
      nextStep: publicDisplayText(document.querySelector("#summaryBar .summary-next")?.textContent || ""),
    },
    counts: {
      findings: findings.length,
      clinicalConcerns: currentClinicalConcerns.length,
    },
    findings,
    shareUrl: currentStackShareUrl(),
  };
}

function installV1RuntimeFacade() {
  if (typeof window === "undefined") return;
  window.DIOGNOSIS_V1 = {
    getState: currentV1HandoffState,
    addSubstance: addDrug,
    removeSubstance: removeDrug,
    setAudience: setAudienceMode,
    setTab,
    render: renderAll,
  };
}
