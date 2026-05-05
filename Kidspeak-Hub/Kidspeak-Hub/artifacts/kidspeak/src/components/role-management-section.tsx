import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  UserCog,
  Brain,
  Calculator,
  Camera,
  Palette,
} from "lucide-react";
import { ALL_PERMISSIONS, PERMISSION_LABELS, PERMISSION_GROUPS, type PermissionKey } from "@/lib/permissions";

export interface CustomRole {
  id: number;
  name: string;
  nameAr: string | null;
  baseTemplate: string;
  description: string | null;
  permissions: string[];
  userCount: number;
  createdAt: string;
}

const TEMPLATE_META: Record<string, { icon: React.ElementType; color: string }> = {
  teacher: { icon: UserCog, color: "bg-blue-100 text-blue-700" },
  psychologist: { icon: Brain, color: "bg-pink-100 text-pink-700" },
  accountant: { icon: Calculator, color: "bg-amber-100 text-amber-700" },
  photographer: { icon: Camera, color: "bg-cyan-100 text-cyan-700" },
  designer: { icon: Palette, color: "bg-violet-100 text-violet-700" },
};

interface RoleFormState {
  name: string;
  nameAr: string;
  baseTemplate: string;
  description: string;
}

const BLANK_FORM: RoleFormState = { name: "", nameAr: "", baseTemplate: "teacher", description: "" };

export default function RoleManagementSection() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const rm = t.roleManagement;

  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomRole | null>(null);
  const [form, setForm] = useState<RoleFormState>(BLANK_FORM);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const loadRoles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/custom-roles", { credentials: "include" });
      if (res.ok) setRoles(await res.json());
    } finally { setIsLoading(false); }
  };

  useEffect(() => { loadRoles(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(BLANK_FORM);
    setSelectedPermissions([]);
    setIsDialogOpen(true);
  };

  const openEdit = (role: CustomRole) => {
    setEditTarget(role);
    setForm({ name: role.name, nameAr: role.nameAr ?? "", baseTemplate: role.baseTemplate, description: role.description ?? "" });
    setSelectedPermissions(role.permissions ?? []);
    setIsDialogOpen(true);
  };

  const togglePermission = (key: string, checked: boolean) => {
    setSelectedPermissions((prev) =>
      checked ? [...prev, key] : prev.filter((p) => p !== key)
    );
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    try {
      const url = editTarget ? `/api/custom-roles/${editTarget.id}` : "/api/custom-roles";
      const method = editTarget ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, permissions: selectedPermissions }),
      });
      if (res.ok) {
        toast({ title: rm.saveRole });
        setIsDialogOpen(false);
        loadRoles();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Error", description: err.error || "Failed", variant: "destructive" });
      }
    } finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/custom-roles/${deleteTarget.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      toast({ title: rm.deleteRole });
      setDeleteTarget(null);
      loadRoles();
    } else {
      const err = await res.json().catch(() => ({}));
      toast({ title: "Error", description: err.error || rm.deleteHasUsers, variant: "destructive" });
      setDeleteTarget(null);
    }
  };

  const getTemplateLabel = (tpl: string) => {
    const key = `template${tpl.charAt(0).toUpperCase() + tpl.slice(1)}` as keyof typeof rm;
    return (rm[key] as string) ?? tpl;
  };

  return (
    <>
      <Card className="overflow-hidden">
        <div className="h-1 w-full" style={{ backgroundColor: "#F5A600" }} />
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#F5A60015" }}>
                <ShieldCheck className="w-5 h-5" style={{ color: "#F5A600" }} />
              </div>
              <div>
                <CardTitle className="text-base">{rm.title}</CardTitle>
                <CardDescription className="text-xs mt-0.5">{rm.subtitle}</CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={openCreate}
              style={{ backgroundColor: "#1B2E8F", color: "white" }}
              className="font-semibold gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {rm.addRole}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">{rm.saving}</p>
          ) : roles.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed p-8 text-center space-y-2">
              <ShieldCheck className="w-8 h-8 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{rm.noRoles}</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold text-xs">{rm.roleName.replace(" (English)", "")}</TableHead>
                    <TableHead className="font-semibold text-xs">{rm.baseTemplate}</TableHead>
                    <TableHead className="font-semibold text-xs text-center">
                      {language === "ar" ? "الصلاحيات" : "Permissions"}
                    </TableHead>
                    <TableHead className="font-semibold text-xs text-center">{rm.usersCount}</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => {
                    const meta = TEMPLATE_META[role.baseTemplate];
                    const Icon = meta?.icon ?? UserCog;
                    return (
                      <TableRow key={role.id} className="hover:bg-muted/20">
                        <TableCell>
                          <div>
                            <p className="font-semibold text-sm">{role.name}</p>
                            {role.nameAr && (
                              <p className="text-xs text-muted-foreground" dir="rtl">{role.nameAr}</p>
                            )}
                            {role.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{role.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`gap-1 ${meta?.color ?? ""} border-0 text-xs`}>
                            <Icon className="w-3 h-3" />
                            {getTemplateLabel(role.baseTemplate)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center justify-center px-2 h-6 rounded-full text-xs font-bold ${
                            (role.permissions?.length ?? 0) > 0 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                          }`}>
                            {role.permissions?.length ?? 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            role.userCount > 0 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                          }`}>
                            {role.userCount}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-blue-600"
                              onClick={() => openEdit(role)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTarget(role)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" style={{ color: "#1B2E8F" }} />
              {editTarget ? rm.editRole : rm.addRole}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{rm.roleName} *</label>
              <Input
                placeholder={rm.namePlaceholder}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            {/* Name AR */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{rm.roleNameAr}</label>
              <Input
                placeholder={rm.nameArPlaceholder}
                dir="rtl"
                value={form.nameAr}
                onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
              />
            </div>
            {/* Base Template */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{rm.baseTemplate} *</label>
              <p className="text-xs text-muted-foreground">{rm.baseTemplateHint}</p>
              <Select value={form.baseTemplate} onValueChange={(v) => setForm((f) => ({ ...f, baseTemplate: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["teacher", "psychologist", "accountant", "photographer", "designer"] as const).map((tpl) => {
                    const meta = TEMPLATE_META[tpl];
                    const Icon = meta.icon;
                    return (
                      <SelectItem key={tpl} value={tpl}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5" />
                          {getTemplateLabel(tpl)}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{rm.description}</label>
              <Textarea
                placeholder={rm.descriptionPlaceholder}
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* ── Permissions ── */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold">
                    {language === "ar" ? "الصلاحيات" : "Permissions"}
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {language === "ar"
                      ? "اختر الصفحات التي يمكن لهذا الدور الوصول إليها"
                      : "Select which pages this role can access"}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedPermissions(ALL_PERMISSIONS.slice())}
                    className="text-xs text-[#1B2E8F] underline hover:no-underline"
                  >
                    {language === "ar" ? "تحديد الكل" : "All"}
                  </button>
                  <span className="text-muted-foreground text-xs">·</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPermissions([])}
                    className="text-xs text-muted-foreground underline hover:no-underline"
                  >
                    {language === "ar" ? "إلغاء الكل" : "None"}
                  </button>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-3 bg-gray-50/50">
                {PERMISSION_GROUPS.map((group) => {
                  const groupPerms = ALL_PERMISSIONS.filter(
                    (p) => PERMISSION_LABELS[p as PermissionKey].group === group
                  );
                  return (
                    <div key={group}>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                        {group}
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {groupPerms.map((perm) => {
                          const label = PERMISSION_LABELS[perm as PermissionKey];
                          const checked = selectedPermissions.includes(perm);
                          return (
                            <label
                              key={perm}
                              className="flex items-center gap-2 cursor-pointer text-sm py-0.5 select-none"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => togglePermission(perm, e.target.checked)}
                                className="rounded border-gray-300 accent-[#1B2E8F] w-3.5 h-3.5"
                              />
                              <span className={checked ? "text-gray-800 font-medium" : "text-gray-500"}>
                                {language === "ar" ? label.ar : label.en}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-muted-foreground">
                {selectedPermissions.length} / {ALL_PERMISSIONS.length}{" "}
                {language === "ar" ? "صلاحية محددة" : "permissions selected"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{rm.cancel}</Button></DialogClose>
            <Button
              style={{ backgroundColor: "#1B2E8F", color: "white" }}
              className="font-semibold"
              onClick={handleSave}
              disabled={isSaving || !form.name.trim()}
            >
              {isSaving ? rm.saving : rm.saveRole}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{rm.deleteRole}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.userCount && deleteTarget.userCount > 0
                ? rm.deleteHasUsers
                : `${rm.deleteConfirm} "${deleteTarget?.name}"`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{rm.cancel}</AlertDialogCancel>
            {(!deleteTarget?.userCount || deleteTarget.userCount === 0) && (
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
              >
                {rm.deleteRole}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
