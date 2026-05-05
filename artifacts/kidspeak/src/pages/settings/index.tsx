import { useState, useEffect, useCallback } from "react";
import { useSettings, useUpdateSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import {
  Palette, Building2, Globe, Clock, FileText, Save,
  Instagram, Youtube, Facebook, Link as LinkIcon,
  Image, Shield, Megaphone, CheckCircle2, Type, MessageSquare,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import RoleManagementSection from "@/components/role-management-section";

// ── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  subtitle,
  children,
  accentColor = "#1B2E8F",
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="h-1 w-full" style={{ backgroundColor: accentColor }} />
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: accentColor + "15" }}>
            <Icon className="w-5 h-5" style={{ color: accentColor }} />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{subtitle}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pb-6">{children}</CardContent>
    </Card>
  );
}

// ── Logo field ────────────────────────────────────────────────────────────────
function LogoField({
  label,
  hint,
  value,
  onChange,
  dark = false,
  placeholder,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  dark?: boolean;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
      </div>
      <div className="flex gap-3 items-start">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        {value ? (
          <div
            className="w-16 h-12 rounded-lg border flex items-center justify-center shrink-0 overflow-hidden"
            style={{ backgroundColor: dark ? "#1B2E8F" : "#f8fafc" }}
          >
            <img
              src={value}
              alt="logo preview"
              className="max-w-full max-h-full object-contain p-1"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        ) : (
          <div className="w-16 h-12 rounded-lg border border-dashed flex items-center justify-center shrink-0"
            style={{ backgroundColor: dark ? "#1B2E8F" : "#f8fafc" }}>
            <Image className="w-5 h-5 text-muted-foreground/40" />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Color picker field ────────────────────────────────────────────────────────
function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border cursor-pointer p-0.5"
          style={{ accentColor: value }}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="w-32 font-mono text-sm"
          maxLength={7}
        />
        <div
          className="flex-1 h-10 rounded-lg border transition-colors"
          style={{ backgroundColor: value || "#ccc" }}
        />
      </div>
    </div>
  );
}

// ── Social field ──────────────────────────────────────────────────────────────
function SocialField({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + "15" }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1 space-y-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      </div>
    </div>
  );
}

// ── Row field (two inputs side by side) ──────────────────────────────────────
function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────────────────────
export default function Settings() {
  const { t, setPupilLabel } = useLanguage();
  const st = t.settings;
  const { toast } = useToast();

  const { data: settings, isLoading } = useSettings();
  const { mutate: updateSettings, isPending: isSaving } = useUpdateSettings();

  const [form, setForm] = useState({
    schoolName: "",
    slogan: "",
    sloganAr: "",
    registrationId: "",
    address: "",
    phone: "",
    phone2: "",
    email: "",
    website: "",
    facebook: "",
    instagram: "",
    youtube: "",
    tiktok: "",
    logoUrl: "",
    logoWhiteUrl: "",
    logoPrintUrl: "",
    faviconUrl: "",
    signatureUrl: "",
    invoiceFooterEn: "",
    invoiceFooterAr: "",
    invoicePrefix: "",
    primaryColor: "#1B2E8F",
    secondaryColor: "#F5A600",
    welcomeAnnouncement: "",
    workingDays: "",
    workingHoursStart: "",
    workingHoursEnd: "",
    pupilLabel: "Pupils",
    pupilLabelAr: "تلاميذ",
    parentContactAdmin: true,
    parentContactTeacher: true,
    parentContactPsychologist: true,
    parentHideAdminName: true,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        schoolName: settings.schoolName ?? "",
        slogan: settings.slogan ?? "",
        sloganAr: settings.sloganAr ?? "",
        registrationId: settings.registrationId ?? "",
        address: settings.address ?? "",
        phone: settings.phone ?? "",
        phone2: settings.phone2 ?? "",
        email: settings.email ?? "",
        website: settings.website ?? "",
        facebook: settings.facebook ?? "",
        instagram: settings.instagram ?? "",
        youtube: settings.youtube ?? "",
        tiktok: settings.tiktok ?? "",
        logoUrl: settings.logoUrl ?? "",
        logoWhiteUrl: settings.logoWhiteUrl ?? "",
        logoPrintUrl: settings.logoPrintUrl ?? "",
        faviconUrl: settings.faviconUrl ?? "",
        signatureUrl: settings.signatureUrl ?? "",
        invoiceFooterEn: settings.invoiceFooterEn ?? "",
        invoiceFooterAr: settings.invoiceFooterAr ?? "",
        invoicePrefix: settings.invoicePrefix ?? "RCP-",
        primaryColor: settings.primaryColor ?? "#1B2E8F",
        secondaryColor: settings.secondaryColor ?? "#F5A600",
        welcomeAnnouncement: settings.welcomeAnnouncement ?? "",
        workingDays: settings.workingDays ?? "",
        workingHoursStart: settings.workingHoursStart ?? "",
        workingHoursEnd: settings.workingHoursEnd ?? "",
        pupilLabel: (settings as any).pupilLabel ?? "Pupils",
        pupilLabelAr: (settings as any).pupilLabelAr ?? "تلاميذ",
        parentContactAdmin: (settings as any).parentContactAdmin !== false,
        parentContactTeacher: (settings as any).parentContactTeacher !== false,
        parentContactPsychologist: (settings as any).parentContactPsychologist !== false,
        parentHideAdminName: (settings as any).parentHideAdminName !== false,
      });
    }
  }, [settings]);

  const set = useCallback((field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  }, []);

  const handleSave = () => {
    updateSettings(form, {
      onSuccess: () => {
        setPupilLabel(form.pupilLabel, form.pupilLabelAr);
        toast({
          title: st.saved,
          description: new Date().toLocaleTimeString(),
        });
      },
      onError: () => {
        toast({ title: st.errorSaving, variant: "destructive" });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center text-muted-foreground">
        {st.loading}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{st.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{st.subtitle}</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
          className="font-semibold gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? st.saving : st.saveChanges}
        </Button>
      </div>

      {/* ── 1. Branding & Visual Identity ─────────────────────────────────── */}
      <Section
        icon={Palette}
        title={st.brandingTitle}
        subtitle={st.brandingSubtitle}
        accentColor="#1B2E8F"
      >
        {/* Logos */}
        <LogoField
          label={st.primaryLogo}
          hint={st.primaryLogoHint}
          value={form.logoUrl}
          onChange={(v) => set("logoUrl", v)}
          placeholder={st.logoUrlPlaceholder}
        />
        <LogoField
          label={`${st.primaryLogo} (${st.invoiceTitle === "Invoice Customization" ? "Print" : "طباعة"})`}
          hint="Used in printed invoices and PDF receipts"
          value={form.logoPrintUrl}
          onChange={(v) => set("logoPrintUrl", v)}
          placeholder={st.logoUrlPlaceholder}
        />
        <LogoField
          label={st.sidebarLogo}
          hint={st.sidebarLogoHint}
          value={form.logoWhiteUrl}
          onChange={(v) => set("logoWhiteUrl", v)}
          placeholder={st.logoUrlPlaceholder}
          dark
        />
        <LogoField
          label={st.favicon}
          hint={st.faviconHint}
          value={form.faviconUrl}
          onChange={(v) => set("faviconUrl", v)}
          placeholder={st.logoUrlPlaceholder}
        />

        {/* Divider */}
        <div className="border-t pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            {st.colorPreview}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <ColorField
              label={st.primaryColor}
              hint={st.primaryColorHint}
              value={form.primaryColor}
              onChange={(v) => set("primaryColor", v)}
            />
            <ColorField
              label={st.secondaryColor}
              hint={st.secondaryColorHint}
              value={form.secondaryColor}
              onChange={(v) => set("secondaryColor", v)}
            />
          </div>

          {/* Live preview panel */}
          <div className="mt-4 rounded-xl border overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ backgroundColor: form.primaryColor }}>
              <span className="text-white text-sm font-semibold">Kidspeak LMS</span>
              <span className="text-xs px-2 py-1 rounded-full font-medium"
                style={{ backgroundColor: form.secondaryColor, color: form.primaryColor }}>
                Active
              </span>
            </div>
            <div className="p-4 space-y-2 bg-white">
              <div className="h-2 rounded-full" style={{ backgroundColor: form.primaryColor, width: "70%" }} />
              <div className="h-2 rounded-full bg-gray-100" style={{ width: "100%" }}>
                <div className="h-2 rounded-full" style={{ backgroundColor: form.secondaryColor, width: "45%" }} />
              </div>
              <div className="flex gap-2 mt-3">
                <button className="text-xs px-3 py-1.5 rounded-lg text-white font-medium"
                  style={{ backgroundColor: form.primaryColor }}>
                  Button
                </button>
                <button className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ backgroundColor: form.secondaryColor, color: form.primaryColor }}>
                  CTA
                </button>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 2. School Profile & Contact ───────────────────────────────────── */}
      <Section
        icon={Building2}
        title={st.profileTitle}
        subtitle={st.profileSubtitle}
        accentColor="#0891b2"
      >
        <Field label={st.schoolName}>
          <Input value={form.schoolName} onChange={(e) => set("schoolName", e.target.value)} />
        </Field>

        <FieldRow>
          <Field label={st.sloganEn}>
            <Input value={form.slogan} onChange={(e) => set("slogan", e.target.value)}
              placeholder="Where Progress Meets Precision." />
          </Field>
          <Field label={st.sloganAr}>
            <Input value={form.sloganAr} onChange={(e) => set("sloganAr", e.target.value)}
              placeholder="حيث يلتقي التقدم بالدقة." dir="rtl" />
          </Field>
        </FieldRow>

        <Field label={st.registrationId}>
          <Input value={form.registrationId} onChange={(e) => set("registrationId", e.target.value)}
            placeholder="e.g. RC-16-B-1234567" />
        </Field>

        <Field label={st.address} hint={st.addressPlaceholder}>
          <Textarea value={form.address} onChange={(e) => set("address", e.target.value)}
            placeholder={st.addressPlaceholder} rows={2} />
        </Field>

        <FieldRow>
          <Field label={st.phone1}>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)}
              placeholder="+213 5X XXX XXXX" type="tel" />
          </Field>
          <Field label={st.phone2}>
            <Input value={form.phone2} onChange={(e) => set("phone2", e.target.value)}
              placeholder="+213 5X XXX XXXX" type="tel" />
          </Field>
        </FieldRow>

        <FieldRow>
          <Field label={st.officialEmail} hint={st.officialEmailHint}>
            <Input value={form.email} onChange={(e) => set("email", e.target.value)}
              placeholder="contact@kidspeak.dz" type="email" />
          </Field>
          <Field label={st.website}>
            <Input value={form.website} onChange={(e) => set("website", e.target.value)}
              placeholder="https://kidspeak.dz" type="url" />
          </Field>
        </FieldRow>

        {/* Social media */}
        <div className="border-t pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            {st.socialMedia}
          </p>
          <div className="space-y-3">
            <SocialField icon={Facebook} label={st.facebook} color="#1877F2"
              value={form.facebook} onChange={(v) => set("facebook", v)}
              placeholder="https://facebook.com/kidspeak" />
            <SocialField icon={Instagram} label={st.instagram} color="#E1306C"
              value={form.instagram} onChange={(v) => set("instagram", v)}
              placeholder="https://instagram.com/kidspeak" />
            <SocialField icon={Youtube} label={st.youtube} color="#FF0000"
              value={form.youtube} onChange={(v) => set("youtube", v)}
              placeholder="https://youtube.com/@kidspeak" />
            <SocialField
              icon={({ className, style }: any) => (
                <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.44a8.19 8.19 0 004.78 1.52V6.51a4.84 4.84 0 01-1.01-.18z" />
                </svg>
              )}
              label={st.tiktok} color="#010101"
              value={form.tiktok} onChange={(v) => set("tiktok", v)}
              placeholder="https://tiktok.com/@kidspeak" />
          </div>
        </div>
      </Section>

      {/* ── 3. Global Dashboard Settings ──────────────────────────────────── */}
      <Section
        icon={Globe}
        title={st.globalTitle}
        subtitle={st.globalSubtitle}
        accentColor="#16a34a"
      >
        {/* Welcome Announcement */}
        <Field label={st.welcomeAnnouncement} hint={st.welcomeAnnouncementHint}>
          <Textarea
            value={form.welcomeAnnouncement}
            onChange={(e) => set("welcomeAnnouncement", e.target.value)}
            placeholder={st.welcomeAnnouncementPlaceholder}
            rows={3}
          />
          {form.welcomeAnnouncement && (
            <div className="mt-2 flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
              style={{ backgroundColor: "#F5A600" + "18", borderLeft: "3px solid #F5A600" }}>
              <Megaphone className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#F5A600" }} />
              <span style={{ color: "#1B2E8F" }}>{form.welcomeAnnouncement}</span>
            </div>
          )}
        </Field>

        {/* Working Hours */}
        <div className="border-t pt-4 space-y-4">
          <Field label={st.workingDays}>
            <Input value={form.workingDays} onChange={(e) => set("workingDays", e.target.value)}
              placeholder={st.workingDaysPlaceholder} />
          </Field>
          <FieldRow>
            <Field label={st.workingHoursStart}>
              <Input type="time" value={form.workingHoursStart}
                onChange={(e) => set("workingHoursStart", e.target.value)} />
            </Field>
            <Field label={st.workingHoursEnd}>
              <Input type="time" value={form.workingHoursEnd}
                onChange={(e) => set("workingHoursEnd", e.target.value)} />
            </Field>
          </FieldRow>
          {(form.workingDays || form.workingHoursStart) && (
            <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2"
              style={{ backgroundColor: "#16a34a10" }}>
              <Clock className="w-4 h-4" style={{ color: "#16a34a" }} />
              <span className="font-medium" style={{ color: "#16a34a" }}>
                {[form.workingDays, form.workingHoursStart && form.workingHoursEnd
                  ? `${form.workingHoursStart} – ${form.workingHoursEnd}`
                  : form.workingHoursStart || form.workingHoursEnd
                ].filter(Boolean).join(" · ")}
              </span>
            </div>
          )}
        </div>

        {/* Currency (read-only) */}
        <div className="border-t pt-4">
          <Field label={st.currency}>
            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <span className="text-sm font-medium">DZD — Algerian Dinar (د.ج)</span>
              <span className="text-xs text-muted-foreground ms-auto">{st.currencyNote.slice(0, 12)}…</span>
            </div>
          </Field>
          <p className="text-xs text-muted-foreground mt-2">{st.currencyNote}</p>
        </div>
      </Section>

      {/* ── 4. Invoice Customization ───────────────────────────────────────── */}
      <Section
        icon={FileText}
        title={st.invoiceTitle}
        subtitle={st.invoiceSubtitle}
        accentColor="#F5A600"
      >
        <Field label={st.invoicePrefix}>
          <Input value={form.invoicePrefix} onChange={(e) => set("invoicePrefix", e.target.value)}
            placeholder="RCP-" className="max-w-xs font-mono" />
        </Field>

        <Field label={st.invoiceFooterEn}>
          <Textarea value={form.invoiceFooterEn} onChange={(e) => set("invoiceFooterEn", e.target.value)}
            placeholder={st.invoiceFooterPlaceholder} rows={2} />
        </Field>

        <Field label={st.invoiceFooterAr}>
          <Textarea value={form.invoiceFooterAr} onChange={(e) => set("invoiceFooterAr", e.target.value)}
            placeholder="شكراً لثقتكم بمركز كيدسبيك للغات." rows={2} dir="rtl" />
        </Field>

        {/* Signature / Stamp */}
        <div className="border-t pt-4">
          <LogoField
            label={st.signature}
            hint={st.signatureHint}
            value={form.signatureUrl}
            onChange={(v) => set("signatureUrl", v)}
            placeholder={st.logoUrlPlaceholder}
          />
        </div>

        {/* Invoice preview chip */}
        {(form.invoiceFooterEn || form.signatureUrl) && (
          <div className="rounded-xl border-2 border-dashed p-4 space-y-3 bg-gray-50">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" />
              Receipt Footer Preview
            </div>
            <div className="text-xs text-center space-y-1">
              {form.invoiceFooterEn && <p className="text-gray-700">{form.invoiceFooterEn}</p>}
              {form.invoiceFooterAr && <p className="text-gray-700" dir="rtl">{form.invoiceFooterAr}</p>}
              {form.signatureUrl && (
                <div className="pt-2 flex justify-center">
                  <img src={form.signatureUrl} alt="signature"
                    className="max-h-16 max-w-32 object-contain opacity-80" />
                </div>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* ── 5. System Terminology ───────────────────────────────────────────── */}
      <Section
        icon={Type}
        title={st.terminology}
        subtitle={st.terminologySubtitle}
        accentColor="#7c3aed"
      >
        <p className="text-xs text-muted-foreground pb-1">{st.pupilLabelHint}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={st.pupilLabelEn}>
            <Input
              value={form.pupilLabel}
              onChange={(e) => set("pupilLabel", e.target.value)}
              placeholder="Pupils"
            />
          </Field>
          <Field label={st.pupilLabelAr}>
            <Input
              value={form.pupilLabelAr}
              onChange={(e) => set("pupilLabelAr", e.target.value)}
              placeholder="تلاميذ"
              dir="rtl"
            />
          </Field>
        </div>
        <div className="flex gap-3 pt-2">
          <div className="flex items-center gap-2 rounded-lg border bg-violet-50 px-3 py-2 text-sm text-violet-700">
            <Type className="w-4 h-4" />
            <span>{form.pupilLabel || "Pupils"} / {form.pupilLabelAr || "تلاميذ"}</span>
          </div>
        </div>
      </Section>

      {/* ── 6. Parent Messaging Permissions ──────────────────────────────── */}
      <Section
        icon={MessageSquare}
        title={st.parentMessagingTitle}
        subtitle={st.parentMessagingSubtitle}
        accentColor="#059669"
      >
        {[
          { key: "parentContactAdmin", label: st.parentContactAdmin, hint: st.parentContactAdminHint },
          { key: "parentContactTeacher", label: st.parentContactTeacher, hint: st.parentContactTeacherHint },
          { key: "parentContactPsychologist", label: st.parentContactPsychologist, hint: st.parentContactPsychologistHint },
          { key: "parentHideAdminName", label: st.parentHideAdminName, hint: st.parentHideAdminNameHint },
        ].map(({ key, label, hint }) => (
          <div key={key} className="flex items-center justify-between gap-4 py-1">
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
            </div>
            <Switch
              checked={(form as any)[key]}
              onCheckedChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
            />
          </div>
        ))}
      </Section>

      {/* Bottom Save */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
          className="font-semibold gap-2 px-8"
          size="lg"
        >
          <Save className="w-4 h-4" />
          {isSaving ? st.saving : st.saveChanges}
        </Button>
      </div>

      {/* Role Management */}
      <RoleManagementSection />
    </div>
  );
}
