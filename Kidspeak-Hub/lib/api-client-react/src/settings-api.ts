import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface SchoolSettings {
  id: number;
  schoolName: string;
  slogan: string | null;
  sloganAr: string | null;
  registrationId: string | null;
  address: string | null;
  phone: string | null;
  phone2: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  tiktok: string | null;
  logoUrl: string | null;
  logoWhiteUrl: string | null;
  logoPrintUrl: string | null;
  faviconUrl: string | null;
  signatureUrl: string | null;
  invoiceFooterEn: string | null;
  invoiceFooterAr: string | null;
  currency: string | null;
  currencySymbolAr: string | null;
  invoicePrefix: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  welcomeAnnouncement: string | null;
  workingDays: string | null;
  workingHoursStart: string | null;
  workingHoursEnd: string | null;
  parentContactAdmin: boolean | null;
  parentContactTeacher: boolean | null;
  parentContactPsychologist: boolean | null;
  parentHideAdminName: boolean | null;
  updatedAt: string;
}

export type UpdateSettingsBody = Partial<Omit<SchoolSettings, "id" | "updatedAt">>;

export const settingsQueryKey = () => ["/api/settings"] as const;

export const useSettings = () =>
  useQuery({
    queryKey: settingsQueryKey(),
    queryFn: () => customFetch<SchoolSettings>("/api/settings"),
    staleTime: 1000 * 60 * 5,
  });

export const useUpdateSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateSettingsBody) =>
      customFetch<SchoolSettings>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (updated) => {
      qc.setQueryData(settingsQueryKey(), updated);
    },
  });
};
