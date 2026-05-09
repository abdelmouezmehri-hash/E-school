import { useState, useEffect } from "react";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useListStudents,
  useCreateStudent,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Shield,
  UserCog,
  Users as UsersIcon,
  Mail,
  Phone,
  Calendar,
  Trash2,
  Pencil,
  Brain,
  Calculator,
  Search,
  Camera,
  Palette,
  Megaphone,
  UserPlus,
  ClipboardList,
} from "lucide-react";
import { format } from "date-fns";

function safeFmt(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return format(d, fmt);
}
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/language-context";

type Role = "admin" | "teacher" | "parent" | "psychologist" | "accountant" | "photographer" | "designer" | "marketer" | "receptionist";

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  role: z.enum(["admin", "teacher", "parent", "psychologist", "accountant", "photographer", "designer", "marketer", "receptionist"]),
  customRoleId: z.number().nullable().optional(),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  bio: z.string().optional(),
  specialization: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  studentIds: z.array(z.number()).optional(),
  paymentType: z.enum(["per_session", "monthly"]).optional(),
  payPerSession: z.string().optional(),
  monthlySalary: z.string().optional(),
  ccpNumber: z.string().optional(),
  ccpKey: z.string().optional(),
  rip: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

const ROLE_META: Record<Role, { color: string; icon: React.ElementType }> = {
  admin: { color: "bg-purple-100 text-purple-700 border-purple-200", icon: Shield },
  teacher: { color: "bg-blue-100 text-blue-700 border-blue-200", icon: UserCog },
  parent: { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: UsersIcon },
  psychologist: { color: "bg-pink-100 text-pink-700 border-pink-200", icon: Brain },
  accountant: { color: "bg-amber-100 text-amber-700 border-amber-200", icon: Calculator },
  photographer: { color: "bg-cyan-100 text-cyan-700 border-cyan-200", icon: Camera },
  designer: { color: "bg-violet-100 text-violet-700 border-violet-200", icon: Palette },
  marketer: { color: "bg-pink-100 text-pink-700 border-pink-200", icon: Megaphone },
  receptionist: { color: "bg-teal-100 text-teal-700 border-teal-200", icon: ClipboardList },
};

interface CustomRole {
  id: number;
  name: string;
  nameAr: string | null;
  baseTemplate: string;
  userCount: number;
}

function AddStudentForParentModal({
  isOpen,
  onClose,
  parentId,
  guardianName,
  guardianPhone,
  isRTL,
}: {
  isOpen: boolean;
  onClose: () => void;
  parentId: number | null;
  guardianName: string;
  guardianPhone: string;
  isRTL: boolean;
}) {
  const { mutate: createStudent, isPending } = useCreateStudent();
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createStudent(
      {
        name: name.trim(),
        dateOfBirth: dob || null,
        parentId: parentId ?? undefined,
        guardianName: guardianName || undefined,
        guardianPhone: guardianPhone || undefined,
      } as any,
      {
        onSuccess: () => {
          toast({ title: isRTL ? "تم إضافة التلميذ" : "Student added" });
          setName("");
          setDob("");
          onClose();
        },
        onError: () => {
          toast({ title: isRTL ? "حدث خطأ" : "Error", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isRTL ? "إضافة تلميذ لهذا الولي" : "Add student for this parent"}</DialogTitle>
          {guardianName && (
            <DialogDescription>
              {isRTL ? `الولي: ${guardianName}` : `Parent: ${guardianName}`}
            </DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{isRTL ? "اسم التلميذ *" : "Student name *"}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isRTL ? "الاسم الكامل" : "Full name"}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{isRTL ? "تاريخ الميلاد" : "Date of birth"}</label>
            <Input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? (isRTL ? "جاري الحفظ..." : "Saving...") : (isRTL ? "إضافة التلميذ" : "Add student")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersList() {
  const { t, language } = useLanguage();
  const isRTL = language === "ar";
  const [isOpen, setIsOpen] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [prefilledParentId, setPrefilledParentId] = useState<number | null>(null);
  const [prefilledGuardianName, setPrefilledGuardianName] = useState("");
  const [prefilledGuardianPhone, setPrefilledGuardianPhone] = useState("");
  const { toast } = useToast();

  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  useEffect(() => {
    fetch("/api/custom-roles", { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setCustomRoles(data))
      .catch(() => {});
  }, []);

  const { data: users = [], refetch, isLoading } = useListUsers();
  const { data: students = [] } = useListStudents();
  const { mutate: createUser, isPending: isCreating } = useCreateUser();
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser();
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema as any) as Resolver<UserFormValues>,
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "teacher",
      customRoleId: null,
      phone: "",
      phone2: "",
      bio: "",
      specialization: "",
      status: "active",
      studentIds: [],
      paymentType: undefined,
      payPerSession: "",
      monthlySalary: "",
      ccpNumber: "",
      ccpKey: "",
      rip: "",
    },
  });

  const watchedRole = form.watch("role");
  const isEditing = !!editUser;

  const openCreate = () => {
    form.reset({
      name: "",
      email: "",
      password: "",
      role: "teacher",
      customRoleId: null,
      phone: "",
      phone2: "",
      bio: "",
      specialization: "",
      status: "active",
      studentIds: [],
      paymentType: undefined,
      payPerSession: "",
      monthlySalary: "",
      ccpNumber: "",
      ccpKey: "",
      rip: "",
    });
    setEditUser(null);
    setIsOpen(true);
  };

  const openEdit = (user: any) => {
    form.reset({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role as Role,
      customRoleId: user.customRoleId ?? null,
      phone: user.phone ?? "",
      phone2: user.phone2 ?? "",
      bio: user.bio ?? "",
      specialization: user.specialization ?? "",
      status: (user.status ?? "active") as "active" | "inactive",
      studentIds: user.role === "parent"
        ? (students as any[]).filter((s: any) => s.parentId === user.id).map((s: any) => s.id)
        : [],
      paymentType: user.paymentType ?? undefined,
      payPerSession: user.payPerSession != null ? String(user.payPerSession) : "",
      monthlySalary: user.monthlySalary != null ? String(user.monthlySalary) : "",
      ccpNumber: user.ccpNumber ?? "",
      ccpKey: user.ccpKey ?? "",
      rip: user.rip ?? "",
    });
    setEditUser(user);
    setIsOpen(true);
  };

  const onSubmit = (data: UserFormValues) => {
    const payload: any = {
      name: data.name,
      email: data.email,
      role: data.role,
      customRoleId: data.customRoleId ?? null,
      phone: data.phone || undefined,
      phone2: data.phone2 || undefined,
      bio: data.bio || undefined,
      specialization: data.specialization || undefined,
      status: data.status,
      studentIds: data.role === "parent" ? (data.studentIds ?? []) : undefined,
    };
    if (data.password) payload.password = data.password;
    if (data.role === "teacher" || data.role === "psychologist") {
      payload.paymentType = data.paymentType ?? null;
      payload.payPerSession = data.payPerSession ? parseFloat(data.payPerSession) : null;
      payload.monthlySalary = data.monthlySalary ? parseFloat(data.monthlySalary) : null;
      payload.ccpNumber = data.ccpNumber || null;
      payload.ccpKey = data.ccpKey || null;
      payload.rip = data.rip || null;
    }

    if (isEditing) {
      updateUser(
        { id: editUser.id, data: payload },
        {
          onSuccess: () => {
            toast({ title: t.users.editUser + " — saved" });
            setIsOpen(false);
            refetch();
          },
          onError: (err: any) => {
            toast({ title: "Error", description: err.error, variant: "destructive" });
          },
        }
      );
    } else {
      if (!data.password) {
        form.setError("password", { message: "Password is required for new users" });
        return;
      }
      createUser(
        { data: { ...payload, password: data.password } },
        {
          onSuccess: () => {
            toast({ title: t.users.addUser + " — created" });
            setIsOpen(false);
            form.reset();
            refetch();
          },
          onError: (err: any) => {
            toast({ title: "Error", description: err.error, variant: "destructive" });
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (!deleteConfirmId) return;
    deleteUser(
      { id: deleteConfirmId },
      {
        onSuccess: () => {
          toast({ title: t.users.deleteUser });
          setDeleteConfirmId(null);
          refetch();
        },
        onError: (err: any) => {
          toast({
            title: "Error",
            description: err.error || "Failed to delete user",
            variant: "destructive",
          });
          setDeleteConfirmId(null);
        },
      }
    );
  };

  const getCustomRoleName = (user: any) => {
    if (!user.customRoleId) return null;
    const cr = customRoles.find((r) => r.id === user.customRoleId);
    if (!cr) return (user as any).customRoleName ?? null;
    return language === "ar" && cr.nameAr ? cr.nameAr : cr.name;
  };

  const getRoleBadge = (user: any) => {
    const role = user.role ?? user;
    const roleStr = typeof role === "string" ? role : role;
    const meta = ROLE_META[roleStr as Role];
    if (!meta) return <Badge variant="outline">{roleStr}</Badge>;
    const Icon = meta.icon;
    const customName = typeof user === "object" ? getCustomRoleName(user) : null;
    const baseLabel = t.users.roles[roleStr as keyof typeof t.users.roles] ?? roleStr;
    return (
      <div className="flex flex-col gap-0.5">
        {customName ? (
          <Badge variant="outline" className={`gap-1 ${meta.color} font-semibold`}>
            <Icon className="w-3 h-3" />
            {customName}
          </Badge>
        ) : (
          <Badge variant="outline" className={`gap-1 ${meta.color}`}>
            <Icon className="w-3 h-3" />
            {baseLabel}
          </Badge>
        )}
        {customName && (
          <span className="text-xs text-muted-foreground ms-1">{baseLabel}</span>
        )}
      </div>
    );
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const roleCounts: Record<string, number> = {};
  users.forEach((u) => {
    roleCounts[u.role] = (roleCounts[u.role] ?? 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.users.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {users.length} total users across {Object.keys(roleCounts).length} roles
          </p>
        </div>
        <Button
          style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
          className="font-semibold"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4 me-2" />
          {t.users.addUser}
        </Button>
      </div>

      {/* Role overview chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setRoleFilter("all")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            roleFilter === "all"
              ? "text-white border-transparent"
              : "bg-transparent hover:bg-muted"
          }`}
          style={roleFilter === "all" ? { backgroundColor: "#1B2E8F", borderColor: "#1B2E8F" } : {}}
        >
          {t.users.allRoles} ({users.length})
        </button>
        {Object.entries(roleCounts).map(([role, count]) => (
          <button
            key={role}
            onClick={() => setRoleFilter(role === roleFilter ? "all" : role)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              roleFilter === role
                ? "text-white border-transparent"
                : "bg-transparent hover:bg-muted"
            }`}
            style={roleFilter === role ? { backgroundColor: "#1B2E8F", borderColor: "#1B2E8F" } : {}}
          >
            {t.users.roles[role as keyof typeof t.users.roles] ?? role} ({count})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          className="ps-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* User grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t.users.loadingUsers}</div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{t.users.noUsersFound}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => {
            const status = (user as any).status ?? "active";
            return (
              <Card key={user.id} className={status === "inactive" ? "opacity-60" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11 shrink-0">
                        <AvatarFallback
                          className="font-bold text-base"
                          style={{ backgroundColor: "#e8ecf8", color: "#1B2E8F" }}
                        >
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold leading-tight">{user.name}</h3>
                        <div className="mt-1">{getRoleBadge(user)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 -mt-1 -me-1">
                      {user.role === "parent" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 h-8 w-8"
                          title={isRTL ? "إضافة تلميذ لهذا الولي" : "Add student for this parent"}
                          onClick={() => {
                            setPrefilledParentId(user.id);
                            setPrefilledGuardianName(user.name);
                            setPrefilledGuardianPhone(user.phone ?? "");
                            setIsAddStudentOpen(true);
                          }}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8"
                        onClick={() => openEdit(user)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                        onClick={() => setDeleteConfirmId(user.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-sm text-muted-foreground border-t pt-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {user.email?.includes("@kidspeak.local")
                          ? ((user as any).phone
                              ? (language === "ar" ? `تسجيل الدخول: ${(user as any).phone}` : `Login: ${(user as any).phone}`)
                              : user.email)
                          : user.email}
                      </span>
                    </div>
                    {(user as any).phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{(user as any).phone}</span>
                      </div>
                    )}
                    {(user as any).phone2 && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <span className="text-emerald-700">{(user as any).phone2}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {t.users.joined} {safeFmt(user.createdAt, "MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {status === "active" ? t.users.active : t.users.inactive}
                      </span>
                    </div>
                    {user.role === "teacher" && (user as any).paymentType && (
                      <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded px-2 py-1">
                        {(user as any).paymentType === "per_session" ? (
                          <>
                            <span className="font-medium">{t.users.perSession}:</span>
                            <span>{t.currency.format((user as any).payPerSession ?? 0)}</span>
                          </>
                        ) : (
                          <>
                            <span className="font-medium">{t.users.monthly}:</span>
                            <span>{t.currency.format((user as any).monthlySalary ?? 0)}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? t.users.editUser : t.users.createNewUser}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.users.fullName}</label>
              <Input placeholder="Jane Smith" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.users.emailAddress}</label>
              <Input type="email" placeholder="jane@school.com" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.users.phone}</label>
              <Input placeholder="+213 5XX XXX XXX" {...form.register("phone")} />
            </div>

            {/* Phone 2 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.users.phone2}</label>
              <Input placeholder="+213 5XX XXX XXX" {...form.register("phone2")} />
            </div>

            {/* Specialization (non-parent, non-admin) */}
            {watchedRole !== "parent" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Specialization / التخصص</label>
                <Input placeholder="e.g. Phonetics Specialist, Child Psychology" {...form.register("specialization")} />
              </div>
            )}

            {/* Bio (non-parent, non-admin) */}
            {watchedRole !== "parent" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Professional Bio / السيرة المهنية</label>
                <p className="text-xs text-muted-foreground">Visible to parents on their child's profile page</p>
                <Textarea rows={3} placeholder="Short introduction about experience and teaching approach..." {...form.register("bio")} />
              </div>
            )}

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t.users.password}
                {isEditing && (
                  <span className="text-muted-foreground text-xs ms-1">(leave blank to keep current)</span>
                )}
              </label>
              <Input
                type="text"
                placeholder={isEditing ? "••••••••" : "min 6 characters"}
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            {/* Role — shows custom roles first, then standard roles */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.users.role}</label>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <Select
                    onValueChange={(v) => {
                      // Detect if this is a custom role selection (value = "custom:{id}")
                      if (v.startsWith("custom:")) {
                        const id = parseInt(v.replace("custom:", ""));
                        const cr = customRoles.find((r) => r.id === id);
                        if (cr) {
                          field.onChange(cr.baseTemplate as Role);
                          form.setValue("customRoleId", id);
                        }
                      } else {
                        field.onChange(v as Role);
                        form.setValue("customRoleId", null);
                      }
                    }}
                    value={
                      form.watch("customRoleId")
                        ? `custom:${form.watch("customRoleId")}`
                        : field.value
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.users.role} />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Custom roles section */}
                      {customRoles.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b mb-1">
                            {t.roleManagement.title}
                          </div>
                          {customRoles.map((cr) => {
                            const meta = ROLE_META[cr.baseTemplate as Role];
                            const Icon = meta?.icon ?? UserCog;
                            const displayName = language === "ar" && cr.nameAr ? cr.nameAr : cr.name;
                            return (
                              <SelectItem key={`custom:${cr.id}`} value={`custom:${cr.id}`}>
                                <span className="flex items-center gap-2">
                                  <Icon className="w-3.5 h-3.5" />
                                  <span>{displayName}</span>
                                  <span className="text-xs text-muted-foreground ms-1">({(t.users.roles as any)[cr.baseTemplate] ?? cr.baseTemplate})</span>
                                </span>
                              </SelectItem>
                            );
                          })}
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-t border-b my-1">
                            {t.users.filterByRole}
                          </div>
                        </>
                      )}
                      {/* Standard roles */}
                      {(Object.keys(ROLE_META) as Role[]).map((r) => (
                        <SelectItem key={r} value={r}>
                          {t.users.roles[r as keyof typeof t.users.roles] ?? r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.users.status}</label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t.users.active}</SelectItem>
                      <SelectItem value="inactive">{t.users.inactive}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Teacher compensation — only for teacher role */}
            {watchedRole === "teacher" && (
              <div className="space-y-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  {t.users.paymentType}
                </p>
                <div className="space-y-1.5">
                  <Controller
                    control={form.control}
                    name="paymentType"
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select compensation type..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="per_session">{t.users.perSession}</SelectItem>
                          <SelectItem value="monthly">{t.users.monthly}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                {form.watch("paymentType") === "per_session" && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t.users.payPerSession}</label>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="e.g. 500"
                      {...form.register("payPerSession")}
                    />
                  </div>
                )}
                {form.watch("paymentType") === "monthly" && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t.users.monthlySalary}</label>
                    <Input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="e.g. 30000"
                      {...form.register("monthlySalary")}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Algerian banking details — teachers only */}
            {watchedRole === "teacher" && (
              <div className="space-y-3 p-3 rounded-lg border" style={{ backgroundColor: "#F5A60008", borderColor: "#F5A60030" }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#F5A600" }}>
                  المعلومات المالية / Financial Information
                </p>
                <p className="text-xs text-muted-foreground -mt-1">
                  CCP & RIP details for salary payments (Algeria)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-medium">CCP Number / رقم الحساب البريدي</label>
                    <Input className="font-mono text-sm" placeholder="e.g. 00799999 9999" {...form.register("ccpNumber")} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Clé / المفتاح</label>
                    <Input className="font-mono text-center text-sm" placeholder="42" maxLength={2} {...form.register("ccpKey")} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">RIP / رقم الهوية البنكية</label>
                  <Input className="font-mono tracking-widest text-sm" placeholder="20-digit RIP" maxLength={20} {...form.register("rip")} />
                </div>
              </div>
            )}

            {/* Linked students — only for parent role */}
            {watchedRole === "parent" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t.users.linkedStudents}</label>
                <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                  {students.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No students available</p>
                  ) : (
                    students.map((student) => (
                      <label
                        key={student.id}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <Controller
                          control={form.control}
                          name="studentIds"
                          render={({ field }) => (
                            <input
                              type="checkbox"
                              checked={(field.value ?? []).includes(student.id)}
                              onChange={(e) => {
                                const current = field.value ?? [];
                                if (e.target.checked) {
                                  field.onChange([...current, student.id]);
                                } else {
                                  field.onChange(current.filter((id) => id !== student.id));
                                }
                              }}
                              className="rounded"
                            />
                          )}
                        />
                        {student.name}
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  {t.users.cancel}
                </Button>
              </DialogClose>
              <Button
                type="submit"
                style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
                className="font-semibold"
                disabled={isCreating || isUpdating}
              >
                {isCreating || isUpdating
                  ? isEditing
                    ? t.users.saving
                    : t.users.creating
                  : isEditing
                  ? t.users.saveUser
                  : t.users.addUser}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.users.deleteUser}</DialogTitle>
          </DialogHeader>
          <div className="py-3 text-sm text-muted-foreground">{t.users.deleteConfirm}</div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.users.cancel}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? t.users.deleting : t.users.confirmDelete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddStudentForParentModal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        parentId={prefilledParentId}
        guardianName={prefilledGuardianName}
        guardianPhone={prefilledGuardianPhone}
        isRTL={isRTL}
      />
    </div>
  );
}
