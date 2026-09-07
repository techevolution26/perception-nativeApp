import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Pill from "./Pill";
import Spinner from "./Spinner";
import { apiFetch, ApiError } from "../../lib/api";

export interface ProfessionalIndustry { code: string; label: string; }
export interface ProfessionalRole { code: string; label: string; industry_code: string; icon: string; }
export interface ProfessionalTaxonomy { industries: ProfessionalIndustry[]; roles: ProfessionalRole[]; }

interface Props {
  industries: string[];
  roles: string[];
  primaryRole: string | null;
  onChange: (value: { industries: string[]; roles: string[]; primaryRole: string | null }) => void;
  maxRoles?: number;
}

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export default function ProfessionalIdentityPicker({ industries, roles, primaryRole, onChange, maxRoles = 8 }: Props) {
  const [taxonomy, setTaxonomy] = useState<ProfessionalTaxonomy | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(industries[0] ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<ProfessionalTaxonomy>("/api/professional-taxonomy", { auth: false })
      .then((data) => { if (active) setTaxonomy(data); })
      .catch((err: unknown) => { if (active) setError(err instanceof ApiError ? err.message : "Unable to load professional options."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visibleRoles = useMemo(() => {
    if (!taxonomy) return [];
    if (!selectedIndustry) return taxonomy.roles;
    return taxonomy.roles.filter((role) => role.industry_code === selectedIndustry);
  }, [taxonomy, selectedIndustry]);

  const toggleIndustry = (code: string) => {
    const next = industries.includes(code) ? industries.filter((item) => item !== code) : [...industries, code];
    if (!industries.includes(code)) setSelectedIndustry(code);
    else if (selectedIndustry === code) setSelectedIndustry(next[0] ?? null);
    onChange({ industries: next, roles, primaryRole });
  };

  const toggleRole = (code: string) => {
    if (roles.includes(code)) {
      const next = roles.filter((item) => item !== code);
      onChange({ industries, roles: next, primaryRole: primaryRole === code ? (next[0] ?? null) : primaryRole });
      return;
    }
    if (roles.length >= maxRoles) return;
    const next = [...roles, code];
    onChange({ industries, roles: next, primaryRole: primaryRole ?? code });
  };

  if (loading) return <Spinner className="mt-4" />;
  if (error || !taxonomy) return <Text className="mt-3 font-sans text-sm text-foreground-muted">{error ?? "Professional options are unavailable."}</Text>;

  return (
    <View className="mt-3 gap-4">
      <View>
        <Text className="mb-2 font-sans-medium text-xs uppercase tracking-wider text-foreground-subtle">Industries</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {taxonomy.industries.map((industry) => (
            <Pressable key={industry.code} onPress={() => toggleIndustry(industry.code)}>
              <Pill label={industry.label} tone={industries.includes(industry.code) ? "accent" : undefined} />
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View>
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="font-sans-medium text-xs uppercase tracking-wider text-foreground-subtle">Professional roles</Text>
          <Text className="font-sans text-xs text-foreground-subtle">{roles.length}/{maxRoles}</Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {visibleRoles.map((role) => {
            const icon = role.icon as IconName;
            const selected = roles.includes(role.code);
            return (
              <Pressable
                key={role.code}
                onPress={() => toggleRole(role.code)}
                className={`flex-row items-center rounded-full border px-3 py-2 ${selected ? "border-accent/40 bg-accent-soft" : "border-border-hairline bg-surface-sunken"}`}
              >
                <MaterialCommunityIcons name={icon} size={15} color={selected ? "#f2a33c" : "#8b91a0"} />
                <Text className={`ml-1.5 font-sans-medium text-xs ${selected ? "text-accent" : "text-foreground"}`}>{role.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {roles.length > 0 && (
        <View>
          <Text className="mb-2 font-sans-medium text-xs uppercase tracking-wider text-foreground-subtle">Primary professional focus</Text>
          <View className="flex-row flex-wrap gap-2">
            {roles.map((code) => {
              const role = taxonomy.roles.find((item) => item.code === code);
              if (!role) return null;
              return <Pressable key={code} onPress={() => onChange({ industries, roles, primaryRole: code })}><Pill label={role.label} tone={primaryRole === code ? "accent" : undefined} /></Pressable>;
            })}
          </View>
        </View>
      )}
    </View>
  );
}
