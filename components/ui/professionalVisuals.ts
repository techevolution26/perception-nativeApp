import type { MaterialCommunityIcons } from "@expo/vector-icons";

export interface ProfessionalVisual {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  color: string;
  soft: string;
  accent: string;
}

const DEFAULT: ProfessionalVisual = {
  icon: "briefcase-outline",
  color: "#f2a33c",
  soft: "#f2a33c",
  accent: "#f2a33c",
};

const INDUSTRY_VISUALS: Record<string, ProfessionalVisual> = {
  technology: { icon: "code-tags", color: "#4f8cff", soft: "#4f8cff", accent: "#4f8cff" },
  science: { icon: "atom", color: "#8b5cf6", soft: "#8b5cf6", accent: "#8b5cf6" },
  engineering: { icon: "cog-outline", color: "#64748b", soft: "#64748b", accent: "#64748b" },
  healthcare: { icon: "medical-bag", color: "#ef476f", soft: "#ef476f", accent: "#ef476f" },
  education: { icon: "school-outline", color: "#f59e0b", soft: "#f59e0b", accent: "#f59e0b" },
  finance: { icon: "chart-line", color: "#0f9d78", soft: "#0f9d78", accent: "#0f9d78" },
  business: { icon: "briefcase-outline", color: "#d97706", soft: "#d97706", accent: "#d97706" },
  legal: { icon: "scale-balance", color: "#64748b", soft: "#64748b", accent: "#64748b" },
  government: { icon: "bank-outline", color: "#2563eb", soft: "#2563eb", accent: "#2563eb" },
  nonprofit: { icon: "account-heart-outline", color: "#e11d48", soft: "#e11d48", accent: "#e11d48" },
  media: { icon: "newspaper-variant-outline", color: "#db2777", soft: "#db2777", accent: "#db2777" },
  creative: { icon: "palette-outline", color: "#c026d3", soft: "#c026d3", accent: "#c026d3" },
  agriculture: { icon: "sprout-outline", color: "#2f9e44", soft: "#2f9e44", accent: "#2f9e44" },
  food: { icon: "silverware-fork-knife", color: "#ea580c", soft: "#ea580c", accent: "#ea580c" },
  manufacturing: { icon: "factory", color: "#475569", soft: "#475569", accent: "#475569" },
  construction: { icon: "hard-hat", color: "#ca8a04", soft: "#ca8a04", accent: "#ca8a04" },
  energy: { icon: "lightning-bolt", color: "#eab308", soft: "#eab308", accent: "#eab308" },
  telecommunications: { icon: "access-point-network", color: "#0891b2", soft: "#0891b2", accent: "#0891b2" },
  transportation: { icon: "truck-outline", color: "#0284c7", soft: "#0284c7", accent: "#0284c7" },
  logistics: { icon: "warehouse", color: "#7c3aed", soft: "#7c3aed", accent: "#7c3aed" },
  automotive: { icon: "car-outline", color: "#dc2626", soft: "#dc2626", accent: "#dc2626" },
  aerospace: { icon: "airplane", color: "#2563eb", soft: "#2563eb", accent: "#2563eb" },
  maritime: { icon: "ferry", color: "#0284c7", soft: "#0284c7", accent: "#0284c7" },
  mining: { icon: "pickaxe", color: "#92400e", soft: "#92400e", accent: "#92400e" },
  real_estate: { icon: "home-city-outline", color: "#059669", soft: "#059669", accent: "#059669" },
  retail: { icon: "storefront-outline", color: "#c026d3", soft: "#c026d3", accent: "#c026d3" },
  hospitality: { icon: "bed-outline", color: "#be185d", soft: "#be185d", accent: "#be185d" },
  sports: { icon: "run", color: "#16a34a", soft: "#16a34a", accent: "#16a34a" },
  environment: { icon: "tree-outline", color: "#15803d", soft: "#15803d", accent: "#15803d" },
  security: { icon: "shield-outline", color: "#334155", soft: "#334155", accent: "#334155" },
  professional_services: { icon: "briefcase-outline", color: "#7c3aed", soft: "#7c3aed", accent: "#7c3aed" },
  religion: { icon: "church-outline", color: "#7c3aed", soft: "#7c3aed", accent: "#7c3aed" },
  beauty_wellness: { icon: "heart-outline", color: "#db2777", soft: "#db2777", accent: "#db2777" },
};

export function professionalVisual(industryCode?: string | null): ProfessionalVisual {
  return (industryCode && INDUSTRY_VISUALS[industryCode]) ?? DEFAULT;
}
