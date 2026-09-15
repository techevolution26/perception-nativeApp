import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Pill from "./Pill";
import Spinner from "./Spinner";
import { professionalVisual } from "./professionalVisuals";
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
    const removing = industries.includes(code);
    const nextIndustries = removing ? industries.filter((item) => item !== code) : [...industries, code];
    const nextRoles = removing
      ? roles.filter((roleCode) => taxonomy?.roles.find((role) => role.code === roleCode)?.industry_code !== code)
      : roles;
    const nextPrimary = primaryRole && nextRoles.includes(primaryRole) ? primaryRole : (nextRoles[0] ?? null);
    if (!removing) setSelectedIndustry(code);
    else if (selectedIndustry === code) setSelectedIndustry(nextIndustries[0] ?? null);
    onChange({ industries: nextIndustries, roles: nextRoles, primaryRole: nextPrimary });
  };

  const toggleRole = (code: string) => {
    if (roles.includes(code)) {
      const next = roles.filter((item) => item !== code);
      onChange({ industries, roles: next, primaryRole: primaryRole === code ? (next[0] ?? null) : primaryRole });
      return;
    }
    if (roles.length >= maxRoles) return;
    const role = taxonomy?.roles.find((item) => item.code === code);
    if (!role) return;
    const nextIndustries = industries.includes(role.industry_code) ? industries : [...industries, role.industry_code];
    const next = [...roles, code];
    if (!industries.includes(role.industry_code)) setSelectedIndustry(role.industry_code);
    onChange({ industries: nextIndustries, roles: next, primaryRole: primaryRole ?? code });
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
              <Pill
                label={industry.label}
                color={professionalVisual(industry.code).color}
              />
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
                className="flex-row items-center rounded-full border px-3 py-2"
                style={selected ? { borderColor: `${professionalVisual(role.industry_code).color}66`, backgroundColor: `${professionalVisual(role.industry_code).color}14` } : undefined}
              >
                <MaterialCommunityIcons
                  name={icon}
                  size={15}
                  color={selected ? professionalVisual(role.industry_code).color : "#8b91a0"}
                />
                <Text
                  className={`ml-1.5 font-sans-medium text-xs ${selected ? "" : "text-foreground"}`}
                  style={selected ? { color: professionalVisual(role.industry_code).color } : undefined}
                >{role.label}</Text>
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
              const role = taxonomy?.roles.find((item) => item.code === code);
              if (!role) return null;
              const visual = professionalVisual(role.industry_code);
              return (
                <Pressable key={code} onPress={() => onChange({ industries, roles, primaryRole: code })}>
                  <Pill label={role.label} color={primaryRole === code ? visual.color : undefined} tone={primaryRole === code ? undefined : "neutral"} />
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
