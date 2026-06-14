// MedCheck Engine — static review diagnostics surfaced in the Review tab

const REVIEW_DIAGNOSTICS = {
  scenarioSnapshots: [
    { id:"ot-paroxetine-codeine-context", name:"Paroxetine + codeine external-context firewall", stack:["Paroxetine","Codeine"], focus:"black-box, FAERS, ClinPGx, target-safety context", status:"guarded" },
    { id:"ot-simvastatin-clarithromycin-context", name:"Simvastatin + clarithromycin external context", stack:["Simvastatin","Clarithromycin"], focus:"FAERS and target-safety context", status:"guarded" },
    { id:"ot-capecitabine-dpyd-clinpgx-context", name:"Capecitabine + DPYD ClinPGx context", stack:["Capecitabine"], genotype:["DPYD"], focus:"unreviewed ClinPGx context does not alter risk", status:"guarded" },
    { id:"ot-clozapine-warning-withdrawal-target-context", name:"Clozapine warning/withdrawal context", stack:["Clozapine"], focus:"drug warning and target-safety cards", status:"guarded" },
    { id:"ot-warfarin-pgx-warning-context", name:"Warfarin PGx warning context", stack:["Warfarin"], genotype:["VKORC1","CYP2C9"], focus:"boxed-warning plus PGx context", status:"guarded" },
    { id:"ot-abacavir-hlab-context", name:"Abacavir HLA-B*57:01 context", stack:["Abacavir"], genotype:["HLA-B*57:01"], focus:"boxed warning plus ClinPGx context", status:"guarded" },
    { id:"ot-clopidogrel-cyp2c19-context", name:"Clopidogrel CYP2C19 context", stack:["Clopidogrel"], genotype:["CYP2C19"], focus:"boxed warning plus poor-metabolizer context", status:"guarded" },
    { id:"ot-tamoxifen-cyp2d6-target-context", name:"Tamoxifen CYP2D6 target context", stack:["Tamoxifen"], genotype:["CYP2D6"], focus:"ClinPGx and target-safety context", status:"guarded" },
  ],
  metaboliteCoverageGaps: [
    { parent:"Diclofenac", metabolite:"4'-Hydroxy-diclofenac", gene:"CYP2C9", activity:"inactive", priority:"toxic/safety-relevant metabolite" },
    { parent:"Cannabis (CBD)", metabolite:"7-Hydroxy-CBD (7-OH-CBD)", gene:"CYP2C19", activity:"active", priority:"active metabolite context" },
    { parent:"Cannabis (THC)", metabolite:"11-Hydroxy-THC (11-OH-THC)", gene:"CYP2C9", activity:"active", priority:"active metabolite context" },
    { parent:"Diazepam", metabolite:"Nordiazepam (desmethyldiazepam)", gene:"CYP2C19", activity:"active", priority:"active metabolite context" },
    { parent:"Diazepam", metabolite:"Oxazepam", gene:"CYP2C19", activity:"active", priority:"active metabolite context" },
    { parent:"Ketamine", metabolite:"Dehydronorketamine (DHNK)", gene:"CYP2B6", activity:"active", priority:"active metabolite context" },
    { parent:"PCP", metabolite:"PPC (1-(1-phenylcyclohexyl)-4-hydroxypiperidine)", gene:"CYP2B6", activity:"active", priority:"active metabolite context" },
    { parent:"Sertraline", metabolite:"N-Desmethylsertraline", gene:"CYP2B6", activity:"active", priority:"active metabolite context" },
    { parent:"Valproic Acid", metabolite:"2-ene-VPA", gene:"CYP2C9", activity:"active", priority:"active metabolite context" },
  ],
};
