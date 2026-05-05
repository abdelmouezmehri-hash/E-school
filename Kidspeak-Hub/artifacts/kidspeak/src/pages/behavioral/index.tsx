import { useState } from "react";
import {
  useListObservations,
  useCreateObservation,
  useDeleteObservation,
  useListStudents,
} from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Brain, Plus, Trash2, Clock } from "lucide-react";
import { format } from "date-fns";

function safeFmt(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return format(d, fmt);
}

type ObsType = "fear" | "shyness" | "participation" | "general";

const TYPE_COLORS: Record<ObsType, string> = {
  fear: "bg-red-100 text-red-700 border-red-200",
  shyness: "bg-orange-100 text-orange-700 border-orange-200",
  participation: "bg-emerald-100 text-emerald-700 border-emerald-200",
  general: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function BehavioralMonitoring() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [obsType, setObsType] = useState<ObsType>("general");
  const [obsContent, setObsContent] = useState("");

  const { data: students = [] } = useListStudents();
  const {
    data: observations = [],
    refetch,
    isLoading,
  } = useListObservations(
    selectedStudentId ? { studentId: selectedStudentId } : undefined
  );
  const { mutate: createObs, isPending: isCreating } = useCreateObservation();
  const { mutate: deleteObs } = useDeleteObservation();

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const handleCreate = () => {
    if (!selectedStudentId || !obsContent.trim()) return;
    createObs(
      {
        data: {
          studentId: selectedStudentId,
          content: obsContent.trim(),
          observationType: obsType,
        },
      },
      {
        onSuccess: () => {
          toast({ title: t.behavioral.saveObservation });
          setIsAddOpen(false);
          setObsContent("");
          setObsType("general");
          refetch();
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to save observation.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteObs(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Observation deleted" });
          refetch();
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="w-7 h-7" style={{ color: "#1B2E8F" }} />
            {t.behavioral.title}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t.behavioral.subtitle}</p>
        </div>
        {selectedStudentId && (
          <Button
            style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
            className="font-semibold"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus className="w-4 h-4 me-2" />
            {t.behavioral.addObservation}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Student list */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t.nav.students}</CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {students.length === 0 && (
              <p className="text-sm text-muted-foreground px-3 py-2">
                {t.behavioral.noFlaggedStudents}
              </p>
            )}
            {students.map((student) => (
              <button
                key={student.id}
                onClick={() => setSelectedStudentId(student.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-start transition-colors ${
                  selectedStudentId === student.id
                    ? "text-white"
                    : "hover:bg-muted"
                }`}
                style={
                  selectedStudentId === student.id
                    ? { backgroundColor: "#1B2E8F" }
                    : {}
                }
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback
                    className="text-xs font-bold"
                    style={
                      selectedStudentId === student.id
                        ? { backgroundColor: "rgba(255,255,255,0.2)", color: "#fff" }
                        : { backgroundColor: "#e8ecf8", color: "#1B2E8F" }
                    }
                  >
                    {student.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate">{student.name}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Observations panel */}
        <div className="space-y-4">
          {!selectedStudentId ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Brain className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Select a student to view observations</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {selectedStudent?.name}
                </h2>
                <span className="text-sm text-muted-foreground">
                  {observations.length} observation{observations.length !== 1 ? "s" : ""}
                </span>
              </div>

              {isLoading ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Loading observations...
                  </CardContent>
                </Card>
              ) : observations.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <p>{t.behavioral.noObservations}</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setIsAddOpen(true)}
                    >
                      <Plus className="w-4 h-4 me-2" />
                      {t.behavioral.addObservation}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {observations.map((obs) => (
                    <Card key={obs.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={`text-xs capitalize ${
                                  TYPE_COLORS[obs.observationType as ObsType] ??
                                  "bg-gray-100"
                                }`}
                              >
                                {t.behavioral.types[obs.observationType as ObsType] ??
                                  obs.observationType}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {safeFmt(obs.createdAt, "MMM d, yyyy")}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed">{obs.content}</p>
                            <p className="text-xs text-muted-foreground">
                              {t.behavioral.observedBy}{" "}
                              <span className="font-medium">{obs.authorName}</span>
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(obs.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Observation Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.behavioral.addObservation}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.behavioral.observationType}</label>
              <Select value={obsType} onValueChange={(v) => setObsType(v as ObsType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["fear", "shyness", "participation", "general"] as ObsType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {t.behavioral.types[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t.behavioral.observationContent}</label>
              <Textarea
                placeholder={t.behavioral.writeObservation}
                value={obsContent}
                onChange={(e) => setObsContent(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t.users.cancel}</Button>
            </DialogClose>
            <Button
              style={{ backgroundColor: "#F5A600", color: "#1B2E8F" }}
              className="font-semibold"
              onClick={handleCreate}
              disabled={isCreating || !obsContent.trim()}
            >
              {isCreating ? t.behavioral.saving : t.behavioral.saveObservation}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
