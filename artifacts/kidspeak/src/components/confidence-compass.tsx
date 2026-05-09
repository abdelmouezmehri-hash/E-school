import { useState, useEffect } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";
import { Compass, Pencil, Clock } from "lucide-react";
import { format } from "date-fns";

type Metric = {
  id: number;
  studentId: number;
  eyeContact: number;
  voiceVolume: number;
  initiative: number;
  resilience: number;
  month: number;
  year: number;
  recorderName: string | null;
  createdAt: string;
};

interface Props {
  studentId: number;
  canEdit: boolean;
}

export function ConfidenceCompass({ studentId, canEdit }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const tc = t.confidenceCompass;

  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [scores, setScores] = useState({ eyeContact: 5, voiceVolume: 5, initiative: 5, resilience: 5 });

  const fetchMetrics = () => {
    setLoading(true);
    fetch(`/api/confidence-metrics?studentId=${studentId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(data => setMetrics(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMetrics(); }, [studentId]);

  const latest = metrics.length > 0 ? metrics[metrics.length - 1] : null;

  const radarData = [
    { metric: tc.eyeContact, value: latest?.eyeContact ?? 0, fullMark: 10 },
    { metric: tc.voiceVolume, value: latest?.voiceVolume ?? 0, fullMark: 10 },
    { metric: tc.initiative, value: latest?.initiative ?? 0, fullMark: 10 },
    { metric: tc.resilience, value: latest?.resilience ?? 0, fullMark: 10 },
  ];

  const openDialog = () => {
    const existing = metrics.find(m => m.month === selectedMonth && m.year === selectedYear);
    if (existing) {
      setScores({ eyeContact: existing.eyeContact, voiceVolume: existing.voiceVolume, initiative: existing.initiative, resilience: existing.resilience });
    } else {
      setScores({ eyeContact: 5, voiceVolume: 5, initiative: 5, resilience: 5 });
    }
    setIsOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/confidence-metrics", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, ...scores, month: selectedMonth, year: selectedYear }),
      });
      if (!res.ok) throw new Error();
      toast({ title: tc.updateSuccess });
      setIsOpen(false);
      fetchMetrics();
    } catch {
      toast({ title: tc.updateFailed, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <>
      <Card className="border-2" style={{ borderColor: "#7c3aed22" }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base" style={{ color: "#7c3aed" }}>
              <Compass className="w-5 h-5" />
              {tc.title}
            </CardTitle>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={openDialog}
                className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50"
              >
                <Pencil className="w-3.5 h-3.5" />
                {tc.updateMetrics}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-48 animate-pulse bg-muted rounded-lg" />
          ) : !latest ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <Compass className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{tc.noData}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Radar Chart */}
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
                    <PolarGrid strokeOpacity={0.3} />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fill: "#6b7280", fontSize: 11, fontWeight: 500 }}
                    />
                    <Tooltip
                      formatter={(val: number) => [`${val} / 10`]}
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    />
                    <Radar
                      name={tc.radarTitle}
                      dataKey="value"
                      stroke="#7c3aed"
                      fill="#7c3aed"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Score badges */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: tc.eyeContact, val: latest.eyeContact },
                  { label: tc.voiceVolume, val: latest.voiceVolume },
                  { label: tc.initiative, val: latest.initiative },
                  { label: tc.resilience, val: latest.resilience },
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-center justify-between rounded-lg bg-violet-50 px-3 py-2">
                    <span className="text-xs font-medium text-violet-800">{label}</span>
                    <span className="text-sm font-black text-violet-700">{val}<span className="text-[10px] font-normal opacity-60"> {tc.outOf}</span></span>
                  </div>
                ))}
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{tc.lastUpdated}: {tc.months[latest.month - 1]} {latest.year}</span>
                {latest.recorderName && <span>· {latest.recorderName}</span>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "#7c3aed" }}>
              <Compass className="w-5 h-5" />
              {tc.updateMetrics}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Month / Year selector */}
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium">{tc.month}</label>
                <Select
                  value={String(selectedMonth)}
                  onValueChange={v => {
                    setSelectedMonth(Number(v));
                    const ex = metrics.find(m => m.month === Number(v) && m.year === selectedYear);
                    if (ex) setScores({ eyeContact: ex.eyeContact, voiceVolume: ex.voiceVolume, initiative: ex.initiative, resilience: ex.resilience });
                    else setScores({ eyeContact: 5, voiceVolume: 5, initiative: 5, resilience: 5 });
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tc.months.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28 space-y-1.5">
                <label className="text-sm font-medium">{tc.year}</label>
                <Select
                  value={String(selectedYear)}
                  onValueChange={v => {
                    setSelectedYear(Number(v));
                    const ex = metrics.find(m => m.month === selectedMonth && m.year === Number(v));
                    if (ex) setScores({ eyeContact: ex.eyeContact, voiceVolume: ex.voiceVolume, initiative: ex.initiative, resilience: ex.resilience });
                    else setScores({ eyeContact: 5, voiceVolume: 5, initiative: 5, resilience: 5 });
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sliders */}
            {(
              [
                { key: "eyeContact", label: tc.eyeContact },
                { key: "voiceVolume", label: tc.voiceVolume },
                { key: "initiative", label: tc.initiative },
                { key: "resilience", label: tc.resilience },
              ] as const
            ).map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{label}</label>
                  <Badge className="bg-violet-100 text-violet-800 border-violet-200 font-black text-sm px-2.5">
                    {scores[key]} / 10
                  </Badge>
                </div>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[scores[key]]}
                  onValueChange={([v]) => setScores(prev => ({ ...prev, [key]: v }))}
                  className="[&_[role=slider]]:bg-violet-600"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                  <span>1</span><span>5</span><span>10</span>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline">{t.users.cancel}</Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              style={{ backgroundColor: "#7c3aed", color: "white" }}
            >
              {isSaving ? tc.updating : tc.updateMetrics}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
