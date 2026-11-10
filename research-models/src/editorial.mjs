import { snapshot } from "./snapshot.ts";
import { DEFAULT_CAPACITY, DEFAULT_CLUSTER, MONTHLY_BITES, PREVENTIVE_DOSES, COMMUNITY } from "./models.ts";

const fmt = new Intl.NumberFormat("en");
const count = n => fmt.format(n);
const share = (part, total) => (100 * part / total).toFixed(1) + "%";
const spatialShare = share(snapshot.spatial.vaccinationsInTopCells, snapshot.spatial.vaccinationsInEligibleCells);
const catalogue = "https://www.straypaw.org/research/datasets";

export const siteName = "StrayPaw Research Models";
export const portfolio = "https://kapoorjay.com";
export const straypaw = "https://www.straypaw.org";

export const references = {
  archive: ["StrayPaw Research · Data catalogue", "Historical records and data access", catalogue],
  ranchi: ["Mission Rabies · StrayPaw historical archive", "Ranchi mass rabies vaccination drive, 2014–2015", "https://www.straypaw.org/programmes/4fdb16ca-de99-473c-a480-6f300f0e687a"],
  jamshedpur: ["Humane World for Animals / HSI · StrayPaw historical archive", "Jamshedpur CNVR clinical records, 2013–2016", catalogue + "#jamshedpur-cnvr"],
  who: ["World Health Organization", "Veterinary vaccines for rabies", "https://www.who.int/teams/control-of-neglected-tropical-diseases/rabies/vaccinations-and-immunization/veterinary-vaccines"],
  ferguson: ["Ferguson et al. · PLOS Biology · 2025", "Improved effectiveness of vaccination campaigns against rabies by reducing spatial heterogeneity in coverage", "https://doi.org/10.1371/journal.pbio.3002872"],
  cdcSurveillance: ["CDC · Surveillance Manual · 2025", "Chapter 20: Analysis of Surveillance Data", "https://www.cdc.gov/surv-manual/php/table-of-contents/chapter-20-analysis-of-surveillance-data.html"],
  hernan: ["Hernán, Clayton & Keiding · International Journal of Epidemiology · 2011", "The Simpson’s paradox unraveled", "https://doi.org/10.1093/ije/dyr041"],
  dogs: ["Shamsaddini et al. · Scientific Reports · 2022", "Dynamic modeling of female neutering interventions for free-roaming dog population management in an urban setting of southeastern Iran", "https://doi.org/10.1038/s41598-022-08697-w"],
  cdcEvaluation: ["CDC · Program Evaluation · 2024", "CDC Approach to Program Evaluation", "https://www.cdc.gov/evaluation/php/about/index.html"],
  whatIf: ["Hernán & Robins", "Causal Inference: What If", "https://miguelhernan.org/whatifbook"],
};

export const models = [
  {
    slug: "the-70-percent-paradox", title: "The 70% Paradox", field: "Spatial epidemiology", id: "spatial", color: "blue",
    question: "Two cities vaccinate 70% of their dogs. Are they equally protected?",
    setup: "Slide to move the same 280 vaccinations around City B. Watch how far an infection travels.",
    evidenceValue: spatialShare,
    evidenceLabel: "of the Ranchi vaccination records in eligible cells were in the busiest fifth of those cells.",
    evidenceMethod: `The Mission Rabies campaign contributes ${count(snapshot.spatial.recordedVaccinations)} historical vaccination records. We grouped them by archived H3 cell and used cells containing at least 20 vaccination records. The top ${snapshot.spatial.topCells} of ${snapshot.spatial.eligibleCells} eligible cells contained ${count(snapshot.spatial.vaccinationsInTopCells)} of ${count(snapshot.spatial.vaccinationsInEligibleCells)} eligible records. To set the starting slider, divide the observed share by the top cells’ share of eligible cells, subtract 1, multiply by 0.75, and clamp to 0–1. That gives ${DEFAULT_CLUSTER}% after rounding. This mapping is a display choice. Record concentration reflects where vaccinations were documented and lacks the local dog population denominators needed to measure coverage. No individual locations are used in the interactive figure.`,
    evidenceLink: references.ranchi[2],
    discovery: "A citywide average can hide a neighborhood where infection has room to spread.",
    questionNote: "What changes when two places vaccinate the same fraction of dogs but leave different patterns of susceptibility? WHO discusses a roughly 70% coverage target for dog vaccination campaigns. Ferguson and colleagues analyzed vaccination and contact-tracing data from the Serengeti district and found that spatial gaps in coverage were associated with poorer rabies control. The experiment isolates the geometry of that idea.",
    equations: [
      ["Coverage", "280 / 400 = 70% in both cities"],
      ["Layout score", "scoreᵢ = (1 − c)uᵢ + c xᵢ", "Vaccinate the 280 lowest scores. uᵢ is a fixed pseudorandom rank, xᵢ is a normalized horizontal position with a small row offset, and c is the slider value."],
      ["One infectious generation", "P(infection | k infectious neighbors) = 1 − (1 − 0.42)ᵏ", "Here k counts infectious neighbors making contact with the susceptible dog in that generation. An infectious dog then leaves the transmitting population."],
    ],
    parameters: "A 20 × 20 grid has up to eight local neighbors per dog, including diagonals, with no wrapping at the edges. Vaccination gives immediate complete protection in the model. Each run starts with one dog drawn from the susceptible dogs in that layout. The two cities share the same random ordering for choosing that dog and the same edge-specific transmission draws. The 0.42 probability is an illustrative teaching value.",
    limitations: "The model stops when transmission ends. An outbreak size includes the initial infection. The displayed range is the empirical 10th–90th percentile of 64 runs on the same layouts, not a confidence interval. These grids represent separate cities without movement between them. The model omits incubation, roaming, waning immunity and repeated incursions.",
    implication: "A municipal report can pair the citywide coverage estimate with ward-level denominators and mapped vaccination gaps. The quality of both the dog population estimate and the location records matters.",
    refs: ["ranchi", "who", "ferguson"],
  },
  {
    slug: "the-surveillance-paradox", title: "The Surveillance Paradox", field: "Disease surveillance", id: "surveillance", color: "orange",
    question: "What if more reported cases means the system is getting better?",
    setup: "Move the slider to improve reporting. Then reveal how many cases actually occurred in the simulation.",
    evidenceValue: count(snapshot.surveillance.biteCaseCounts.reduce((a, b) => a + b, 0)),
    evidenceLabel: "historical animal-care records classified as Dog bite across 2024 and 2025.",
    evidenceMethod: `StrayPaw’s historical field register includes ${snapshot.surveillance.biteCaseCounts[0]} animal-care cases classified as Dog bite in 2024 and ${snapshot.surveillance.biteCaseCounts[1]} in 2025. These are animal-care records, so they cannot estimate human bite incidence or all bites in a city. To give the experiment a register-scale starting point, divide the 24-month mean by the scenario’s assumed average reporting probability of 47.5%, then round. The resulting ${MONTHLY_BITES} latent cases per month are simulated. We do not estimate real reporting completeness from this register.`,
    evidenceLink: catalogue,
    discovery: "More reports can reflect better detection. The reports alone cannot tell you what happened to the true rate.",
    questionNote: "When incident reports rise, can you distinguish more incidents from better detection? CDC’s surveillance manual emphasizes that interpretation requires knowing how the reporting system works and what changed. Here we know the true count because we created it.",
    equations: [
      ["Observation model", "Yₘ | Nₘ, pₘ ∼ Binomial(Nₘ, pₘ)", "Each of the Nₘ simulated incidents in month m has an independent chance pₘ of reaching the register."],
      ["Expected reports", "E[Yₘ] = Nₘ pₘ", "A rise in either the true count or detection probability can increase the expected number of reports."],
    ],
    parameters: `The simulation holds actual bite-related animal-care cases at ${MONTHLY_BITES} per month. Reporting starts at 15% in January and changes linearly to the slider’s December value. An independent random draw decides whether each incident is recorded. The same draws are reused as the slider moves.`,
    limitations: "No false reports, duplicates, delayed entries, changing population or severity differences are simulated. Actual dog-bite reports can mix all of those effects. The hidden series is known only inside this simulation.",
    implication: "Record intake-channel launches and changes in reporting coverage alongside counts. Where possible, compare routine reports with independent surveys or audits and track reporting delays.",
    refs: ["archive", "cdcSurveillance"],
  },
  {
    slug: "simpsons-paradox", title: "Simpson’s Paradox", field: "Aggregation & causal inference", id: "simpson", color: "blue",
    question: "How can both groups improve while the overall result gets worse?",
    setup: "Separate the overall follow-up rate by case type to see what changed inside the average.",
    discovery: "Both simulated follow-up rates rose. Cases with the lower rate made up a bigger share of the total.",
    evidenceValue: "27% → 38%",
    evidenceLabel: "TVT share of the two selected case types in StrayPaw’s historical register, 2024 to 2025.",
    evidenceMethod: "We selected two well-represented categories whose mix shifted between two complete calendar years. The denominator includes only road accidents and TVT (transmissible venereal tumour). Case counts are observed in StrayPaw. Completed follow-ups and their rates are constructed to demonstrate the reversal. The choice of the two categories is part of the example.",
    evidenceLink: catalogue,
    questionNote: "Can an overall follow-up rate fall while rates for both types of cases rise? Yes. The categories in this example have different starting rates and their shares shift over time. Hernán and colleagues show why the causal meaning of such a reversal depends on the process that produced the data.",
    equations: [
      ["Overall rate", "Rₜ = Σg completed(g,t) / Σg cases(g,t)", "A weighted average of the two case types. Each weight is the type’s share of the combined number of cases that year."],
      ["Changing weights", "TVT share = 105 / 383 → 83 / 216", "TVT gets more weight in 2025, even as its illustrative follow-up rate improves."],
    ],
    parameters: "Road-accident records number 278 in 2024 and 133 in 2025. TVT records number 105 and 83. Apply illustrative completion probabilities of 90% and 92% to road accidents and 40% and 42% to TVT. Round the completed counts to whole cases before aggregating. The overall simulated rates are 292/383 and 157/216.",
    limitations: "Case type is a descriptive grouping here. For a causal question, stratifying on a variable can reduce confounding or introduce bias, depending on the causal structure. Rates from a few cases can also vary substantially by chance. This example is arithmetic and makes no claim about sampling precision.",
    implication: "Keep numerator and denominator visible in aggregate and stratified reports. If comparing performance over time, show changing case mix and consider a rate standardized to an explicitly chosen common mix.",
    refs: ["archive", "hernan"],
  },
  {
    slug: "the-sterilization-paradox", title: "The Sterilization Paradox", field: "Population dynamics", id: "population", color: "orange",
    question: "How can thousands of surgeries produce almost no immediate decline?",
    setup: "Slide to change monthly female sterilizations. Watch the first year and the years that follow.",
    evidenceValue: count(DEFAULT_CAPACITY),
    evidenceLabel: "median recorded female sterilizations per active month in the Jamshedpur archive.",
    evidenceMethod: `The initial slider uses the median of ${snapshot.sterilization.activeMonths} months with at least one linked female sterilization entry in the 2013–2016 HSI archive. It gives the model a historically grounded surgery cadence. The archive is a clinical register. It does not establish true program capacity, the city’s starting dog population, or the number that remained after treatment. The population trajectory, baseline and demographic parameters are modeled.`,
    evidenceLink: references.jamshedpur[2],
    discovery: "Sterilization changes future births. Survival, aging and incoming dogs still shape the population you see today.",
    questionNote: "Why can surgery totals rise much faster than a city’s dog count falls? The experiment tracks dogs through maturation, births, deaths and immigration. A published model by Shamsaddini and colleagues studied how female neutering could affect free-roaming dog numbers under local demographic assumptions in southeastern Iran. This model uses its own illustrative parameters.",
    equations: [
      ["Monthly population balance", "Nₜ₊₁ = Nₜ + birthsₜ + arrivalsₜ − deathsₜ", "Surgery moves an adult female between compartments. Maturation moves a juvenile to an adult compartment. Both transfers conserve total dogs."],
      ["Births after surgery", "Bₜ = 0.16 (Fₜ − Sₜ) max(0, 1 − Nₜ / 18,000)", "F is fertile adult females and S is the smaller of capacity and the number available. Density is computed at the start of the month."],
    ],
    parameters: "The initial 10,000 dogs include 3,600 fertile adult females, 400 sterilized adult females, 4,000 adult males and 2,000 juveniles. Surgery precedes births. Each month 1.2% of existing adults and 7.5% of existing juveniles die. One sixth of surviving juveniles mature. There are 105 adult arrivals per month. Maturing and arriving dogs are split evenly between fertile females and males. The baseline uses the same rules at zero additional surgeries.",
    limitations: "Counts are deterministic expectations, so fractional dogs can appear in the calculations. Labels round for display. Births depend on fertile females and density. The model omits seasonality, age-specific adult mortality, spatial structure and emigration, and holds immigration and mortality rates fixed.",
    implication: "Compare procedure records with repeat population estimates and indicators such as juvenile share, sterilization coverage and incoming dogs. A surgery ledger answers a different question from a population survey.",
    refs: ["jamshedpur", "dogs"],
  },
  {
    slug: "the-prevention-paradox", title: "The Prevention Paradox", field: "Intervention evaluation", id: "prevention", color: "blue",
    question: "How do you measure the outbreak that never happened?",
    setup: "Run both futures with the same starting infections. One community gets vaccinated first.",
    evidenceValue: count(COMMUNITY),
    evidenceLabel: "animal records in the Mohanpur census register set the size of each simulated community.",
    evidenceMethod: `We use the count of ${COMMUNITY} animals in the Mohanpur census card as the modeled community size, and set the campaign to reach half (${PREVENTIVE_DOSES} animals). The card provides a register count, not a verified population estimate. The 50% campaign, introductions, timing and outbreak outcomes are hypothetical. This is not a reconstruction of a Mohanpur outbreak.`,
    evidenceLink: catalogue,
    discovery: "To estimate what prevention changed, you need a credible comparison for the future you never got to see.",
    questionNote: "A quiet year after a campaign tells you what happened under the campaign. What would have happened without it is the counterfactual. CDC distinguishes tracking outcomes from attributing them to a program. Hernán and Robins introduce causal effects through comparisons of potential outcomes.",
    equations: [
      ["Weekly infection probability", "pₜ = 1 − exp(−1.85 Iₜ / N)", "Iₜ is the number infectious this week and N is the modeled community size. Each susceptible individual has probability pₜ of becoming infectious next week. The currently infectious group then recovers and is immune."],
      ["Paired modeled difference", "Δ = C₁₈(no campaign) − C₁₈(campaign)", "C is cumulative infection, including the three imported infections. Both worlds share indexed random draws for each individual and week."],
    ],
    parameters: `Each closed, well-mixed community contains ${COMMUNITY} individuals, with the same three infections introduced into both. The campaign gives ${PREVENTIVE_DOSES} other individuals complete immunity before introduction. The infectious period is one weekly step. The transmission coefficient 1.85 is illustrative. The chart stops after 18 weeks.`,
    limitations: "One pair shows one possible difference. The comparison is conditional on the simplified disease and population model, and chance can produce a small outbreak even without the campaign. This is a generic teaching epidemic with recovery. It provides no estimate of the effect of any real campaign.",
    implication: "Design evaluation alongside the rollout. A credible comparison might use randomized rollout or comparable areas, depending on feasibility, the design’s assumptions and the possibility of spillovers.",
    refs: ["archive", "cdcEvaluation", "whatIf"],
  },
].map((model, index) => ({ ...model, number: String(index + 1).padStart(2, "0") }));
