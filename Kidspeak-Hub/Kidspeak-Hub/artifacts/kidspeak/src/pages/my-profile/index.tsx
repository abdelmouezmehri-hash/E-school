import { useState, useEffect, useRef, useCallback } from "react";
import { useGetMe, useUpdateMyProfile, useChangePassword } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  User, Phone, Shield, BookOpen, Wallet, Camera, Save,
  Key, Eye, EyeOff, Lock, ChevronRight, HeartPulse, Banknote, Info,
} from "lucide-react";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
  accent = "#1B2E8F",
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="h-1 w-full" style={{ backgroundColor: accent }} />
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: accent + "15" }}>
            <Icon className="w-5 h-5" style={{ color: accent }} />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{subtitle}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">{children}</CardContent>
    </Card>
  );
}

function Field({ label, hint, children, readOnly }: { label: string; hint?: string; children: React.ReactNode; readOnly?: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        {readOnly && (
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Read-only</Badge>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

export default function MyProfile() {
  const { t, isRTL } = useLanguage();
  const pt = t.myProfile;
  const { toast } = useToast();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { data: me, isLoading } = useGetMe();
  const { mutate: updateProfile, isPending: isSaving } = useUpdateMyProfile();
  const { mutate: changePassword, isPending: isChangingPw } = useChangePassword();

  const isTeacher = (me as any)?.role === "teacher";

  const [form, setForm] = useState({
    phone: "", phone2: "", bio: "", specialization: "",
    emergencyContact1Name: "", emergencyContact1Relation: "", emergencyContact1Phone: "",
    emergencyContact2Name: "", emergencyContact2Relation: "", emergencyContact2Phone: "",
    ccpNumber: "", ccpKey: "", rip: "",
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (me) {
      setForm({
        phone: (me as any).phone ?? "",
        phone2: (me as any).phone2 ?? "",
        bio: (me as any).bio ?? "",
        specialization: (me as any).specialization ?? "",
        emergencyContact1Name: (me as any).emergencyContact1Name ?? "",
        emergencyContact1Relation: (me as any).emergencyContact1Relation ?? "",
        emergencyContact1Phone: (me as any).emergencyContact1Phone ?? "",
        emergencyContact2Name: (me as any).emergencyContact2Name ?? "",
        emergencyContact2Relation: (me as any).emergencyContact2Relation ?? "",
        emergencyContact2Phone: (me as any).emergencyContact2Phone ?? "",
        ccpNumber: (me as any).ccpNumber ?? "",
        ccpKey: (me as any).ccpKey ?? "",
        rip: (me as any).rip ?? "",
      });
      setPhotoPreview((me as any).profilePicture ?? null);
    }
  }, [me]);

  const setField = useCallback((field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPhoto(dataUrl);
      setPhotoPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    const payload: Record<string, string | null> = {
      phone: form.phone || null,
      phone2: form.phone2 || null,
      bio: form.bio || null,
      specialization: form.specialization || null,
      emergencyContact1Name: form.emergencyContact1Name || null,
      emergencyContact1Relation: form.emergencyContact1Relation || null,
      emergencyContact1Phone: form.emergencyContact1Phone || null,
      emergencyContact2Name: form.emergencyContact2Name || null,
      emergencyContact2Relation: form.emergencyContact2Relation || null,
      emergencyContact2Phone: form.emergencyContact2Phone || null,
      ccpNumber: form.ccpNumber || null,
      ccpKey: form.ccpKey || null,
      rip: form.rip || null,
    };
    if (photo) payload.profilePicture = photo;

    updateProfile(payload as any, {
      onSuccess: () => {
        toast({ title: pt.profileSaved });
        setPhoto(null);
      },
      onError: () => toast({ title: pt.profileError, variant: "destructive" }),
    });
  };

  const handleChangePassword = () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast({ title: pt.passwordMismatch, variant: "destructive" }); return;
    }
    if (pwForm.newPassword.length < 8) {
      toast({ title: pt.passwordTooShort, variant: "destructive" }); return;
    }

    changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }, {
      onSuccess: () => {
        toast({ title: pt.passwordChanged });
        setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      },
      onError: () => toast({ title: pt.passwordError, variant: "destructive" }),
    });
  };

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center text-muted-foreground">{pt.savingProfile}</div>;
  }

  const user = me as any;

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      {/* Header + Save */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{pt.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{pt.subtitle}</p>
        </div>
        <Button
          onClick={handleSaveProfile}
          disabled={isSaving}
          style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
          className="font-semibold gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? pt.savingProfile : pt.saveProfile}
        </Button>
      </div>

      {/* ── 1. Personal Info ─────────────────────────────────────────────── */}
      <Section icon={User} title={pt.personalInfo} subtitle={pt.personalInfoSubtitle} accent="#1B2E8F">
        {/* Avatar + photo upload */}
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar className="w-20 h-20 border-2" style={{ borderColor: "#1B2E8F" }}>
              {photoPreview ? (
                <img src={photoPreview} alt={user?.name} className="w-full h-full object-cover rounded-full" />
              ) : (
                <AvatarFallback
                  className="text-white text-2xl font-bold"
                  style={{ backgroundColor: "#1B2E8F" }}
                >
                  {user?.name ? getInitials(user.name) : "?"}
                </AvatarFallback>
              )}
            </Avatar>
            <button
              onClick={() => photoInputRef.current?.click()}
              className="absolute -bottom-1 -end-1 w-7 h-7 rounded-full flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: "#F5A600" }}
              title={pt.changePhoto}
            >
              <Camera className="w-3.5 h-3.5" style={{ color: "#1B2E8F" }} />
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg truncate">{user?.name}</p>
            <Badge variant="outline" className="text-xs mt-1 capitalize">
              {user?.role}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
          </div>
        </div>

        {/* Full Name (read-only) */}
        <Field label={pt.fullName} hint={pt.fullNameHint} readOnly>
          <Input value={user?.name ?? ""} readOnly className="bg-muted/40 cursor-not-allowed" />
        </Field>

        {/* Specialization */}
        <Field label={pt.specialization}>
          <Input
            value={form.specialization}
            onChange={(e) => setField("specialization", e.target.value)}
            placeholder={pt.specializationPlaceholder}
            dir={isRTL ? "rtl" : "ltr"}
          />
        </Field>

        {/* Bio */}
        <Field label={pt.bio} hint={pt.bioHint}>
          <Textarea
            value={form.bio}
            onChange={(e) => setField("bio", e.target.value)}
            placeholder={pt.bioPlaceholder}
            rows={4}
            dir={isRTL ? "rtl" : "ltr"}
          />
          {form.bio && (
            <div className="mt-2 rounded-lg p-3 text-sm italic border"
              style={{ backgroundColor: "#1B2E8F08", borderColor: "#1B2E8F20" }}>
              <p className="text-muted-foreground text-xs mb-1 font-medium not-italic">Parent preview:</p>
              <p style={{ color: "#1B2E8F" }}>{form.bio}</p>
            </div>
          )}
        </Field>
      </Section>

      {/* ── 2. Contact Info ──────────────────────────────────────────────── */}
      <Section icon={Phone} title={pt.contactInfo} subtitle={pt.contactInfoSubtitle} accent="#0891b2">
        <Field label={pt.phone1}>
          <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)}
            placeholder={pt.phonePlaceholder} type="tel" dir="ltr" />
        </Field>
        <Field label={pt.phone2}>
          <Input value={form.phone2} onChange={(e) => setField("phone2", e.target.value)}
            placeholder={pt.phonePlaceholder} type="tel" dir="ltr" />
        </Field>
      </Section>

      {/* ── 3. Emergency Contacts ────────────────────────────────────────── */}
      <Section icon={HeartPulse} title={pt.emergencyContacts} subtitle={pt.emergencyContactsSubtitle} accent="#dc6803">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Contact 1 */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#dc6803" }}>
              {pt.contact1}
            </p>
            <Field label={pt.relativeName}>
              <Input
                value={form.emergencyContact1Name}
                onChange={(e) => setField("emergencyContact1Name", e.target.value)}
                placeholder={pt.relativeNamePlaceholder}
                dir={isRTL ? "rtl" : "ltr"}
              />
            </Field>
            <Field label={pt.relationship}>
              <Input
                value={form.emergencyContact1Relation}
                onChange={(e) => setField("emergencyContact1Relation", e.target.value)}
                placeholder={pt.relationshipPlaceholder}
                dir={isRTL ? "rtl" : "ltr"}
              />
            </Field>
            <Field label={pt.contactPhone}>
              <Input
                value={form.emergencyContact1Phone}
                onChange={(e) => setField("emergencyContact1Phone", e.target.value)}
                placeholder={pt.phonePlaceholder}
                type="tel"
                dir="ltr"
              />
            </Field>
          </div>

          {/* Contact 2 */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#dc6803" }}>
              {pt.contact2}
            </p>
            <Field label={pt.relativeName}>
              <Input
                value={form.emergencyContact2Name}
                onChange={(e) => setField("emergencyContact2Name", e.target.value)}
                placeholder={pt.relativeNamePlaceholder}
                dir={isRTL ? "rtl" : "ltr"}
              />
            </Field>
            <Field label={pt.relationship}>
              <Input
                value={form.emergencyContact2Relation}
                onChange={(e) => setField("emergencyContact2Relation", e.target.value)}
                placeholder={pt.relationshipPlaceholder}
                dir={isRTL ? "rtl" : "ltr"}
              />
            </Field>
            <Field label={pt.contactPhone}>
              <Input
                value={form.emergencyContact2Phone}
                onChange={(e) => setField("emergencyContact2Phone", e.target.value)}
                placeholder={pt.phonePlaceholder}
                type="tel"
                dir="ltr"
              />
            </Field>
          </div>
        </div>
      </Section>

      {/* ── 4. Financial Information ─────────────────────────────────────── */}
      <Section icon={Banknote} title={pt.financialInfo} subtitle={pt.financialInfoSubtitle} accent="#F5A600">
        {/* Info note */}
        <div className="flex items-start gap-3 rounded-xl p-3 text-sm"
          style={{ backgroundColor: "#F5A60010", border: "1px solid #F5A60030" }}>
          <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#F5A600" }} />
          <p className="text-muted-foreground text-xs leading-relaxed">{pt.financialNote}</p>
        </div>

        {/* CCP Number + CCP Key on same row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label={pt.ccpNumber}>
              <Input
                value={form.ccpNumber}
                onChange={(e) => setField("ccpNumber", e.target.value)}
                placeholder={pt.ccpNumberPlaceholder}
                dir="ltr"
                className="font-mono"
              />
            </Field>
          </div>
          <div>
            <Field label={pt.ccpKey}>
              <Input
                value={form.ccpKey}
                onChange={(e) => setField("ccpKey", e.target.value)}
                placeholder={pt.ccpKeyPlaceholder}
                dir="ltr"
                maxLength={2}
                className="font-mono text-center"
              />
            </Field>
          </div>
        </div>

        {/* RIP — full width */}
        <Field label={pt.rip}>
          <Input
            value={form.rip}
            onChange={(e) => setField("rip", e.target.value)}
            placeholder={pt.ripPlaceholder}
            dir="ltr"
            maxLength={20}
            className="font-mono tracking-widest"
          />
          {form.rip && form.rip.replace(/\s/g, "").length !== 20 && (
            <p className="text-xs text-amber-600 mt-1">
              RIP should be 20 digits — currently {form.rip.replace(/\s/g, "").length} digits
            </p>
          )}
        </Field>
      </Section>

      {/* ── 5. Teacher Quick Links ───────────────────────────────────────── */}
      {isTeacher && (
        <Section icon={BookOpen} title={pt.teacherTools} subtitle={pt.teacherToolsSubtitle} accent="#16a34a">
          <div className="space-y-2">
            <Link href="/groups">
              <div className="flex items-center gap-3 rounded-xl border p-4 hover:shadow-sm transition-shadow cursor-pointer group">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "#16a34a15" }}>
                  <BookOpen className="w-5 h-5" style={{ color: "#16a34a" }} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{pt.myGroupsLink}</p>
                  <p className="text-xs text-muted-foreground">{pt.myGroupsDesc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
            <Link href="/groups/earnings">
              <div className="flex items-center gap-3 rounded-xl border p-4 hover:shadow-sm transition-shadow cursor-pointer group">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "#F5A60015" }}>
                  <Wallet className="w-5 h-5" style={{ color: "#F5A600" }} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{pt.myEarningsLink}</p>
                  <p className="text-xs text-muted-foreground">{pt.myEarningsDesc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          </div>
        </Section>
      )}

      {/* ── 4. Security / Change Password ───────────────────────────────── */}
      <Section icon={Shield} title={pt.security} subtitle={pt.securitySubtitle} accent="#dc2626">
        <Field label={pt.currentPassword}>
          <div className="relative">
            <Input
              type={showCurrent ? "text" : "password"}
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
              placeholder={pt.currentPasswordPlaceholder}
              className="pe-10"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>
        <Field label={pt.newPassword}>
          <div className="relative">
            <Input
              type={showNew ? "text" : "password"}
              value={pwForm.newPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
              placeholder={pt.newPasswordPlaceholder}
              className="pe-10"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>
        <Field label={pt.confirmPassword}>
          <Input
            type="password"
            value={pwForm.confirmPassword}
            onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
            placeholder={pt.confirmPasswordPlaceholder}
          />
          {pwForm.newPassword && pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
            <p className="text-xs text-destructive mt-1">{pt.passwordMismatch}</p>
          )}
        </Field>
        <Button
          onClick={handleChangePassword}
          disabled={isChangingPw || !pwForm.currentPassword || !pwForm.newPassword}
          variant="outline"
          className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-white"
        >
          <Key className="w-4 h-4" />
          {isChangingPw ? pt.changingPassword : pt.changePassword}
        </Button>
      </Section>

      {/* Bottom Save */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSaveProfile}
          disabled={isSaving}
          style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
          className="font-semibold gap-2 px-8"
          size="lg"
        >
          <Save className="w-4 h-4" />
          {isSaving ? pt.savingProfile : pt.saveProfile}
        </Button>
      </div>
    </div>
  );
}
