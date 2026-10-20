import { PlanCatalog, type CommercialFeature, type PlanId } from "./plan-catalog";
export const COMMERCIAL_FEATURE_LABELS: Readonly<Record<CommercialFeature, string>> = Object.freeze({
  caravans: "Caravanas e controle de vagas", registrations: "Inscrições e passageiros", proofs: "Comprovantes e documentos privados", checkin: "Check-in com histórico", csv_import: "Importação CSV com deduplicação e rollback", finance: "Financeiro Geral e exportação do resumo", branding: "Identidade visual da organizadora", report_library: "Central de relatórios operacionais", worklists: "Roteiros da equipe e modelos reutilizáveis",
});
export const PLAN_PRESENTATION: Readonly<Record<PlanId, { audience: string; previous: string; features: readonly CommercialFeature[]; benefits: readonly string[] }>> = Object.freeze({
  essencial: { audience: "Para organizar suas primeiras caravanas com praticidade.", previous: "Operação principal completa", features: ["finance", "csv_import", "branding"], benefits: ["Caravanas, passageiros, comprovantes e check-in", "Histórico e acessos da equipe preservados"] },
  pro: { audience: "Para quem está crescendo e precisa de mais controle.", previous: "Tudo do Essencial, mais", features: ["report_library"], benefits: ["Salve fechamentos por período de viagens", "Compartilhe fotografias operacionais com a equipe", "Exporte relatórios sem lista de passageiros"] },
  premium: { audience: "Para organizadoras com operações maiores e necessidades avançadas.", previous: "Tudo do Pro, mais", features: ["worklists"], benefits: ["Reutilize modelos de preparação entre viagens", "Acompanhe tarefas compartilhadas por caravana", "Reabra tarefas e preserve o histórico de alterações"] },
});
export function commercialPresentationConsistent() {
  return Object.entries(PLAN_PRESENTATION).every(([id, presentation]) => presentation.features.every(feature => PlanCatalog[id as PlanId].features.includes(feature)));
}
