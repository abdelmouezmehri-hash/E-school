import { useState } from "react";
import { useListEvaluations, useListStudents, useCreateEvaluation } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

function safeFmt(dateStr: string | null | undefined, fmt: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return format(d, fmt);
}
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const evaluationSchema = z.object({
  studentId: z.coerce.number().min(1, "Please select a student"),
  weekNumber: z.coerce.number().min(1).max(52),
  sessionDate: z.string().min(1, "Date is required"),
  speakingScore: z.number().min(1).max(10),
  confidenceScore: z.number().min(1).max(10),
  participationScore: z.number().min(1).max(10),
  teacherNotes: z.string().optional(),
});

type EvalFormValues = z.infer<typeof evaluationSchema>;

export default function Evaluations() {
  const { toast } = useToast();
  const [filterStudentId, setFilterStudentId] = useState<string>("all");
  
  const { data: students = [] } = useListStudents();
  const { data: evaluations = [], refetch } = useListEvaluations({
    studentId: filterStudentId !== "all" ? parseInt(filterStudentId) : undefined
  });
  
  const { mutate: createEval, isPending } = useCreateEvaluation();

  const form = useForm<EvalFormValues>({
    resolver: zodResolver(evaluationSchema as any) as Resolver<EvalFormValues>,
    defaultValues: {
      weekNumber: 1,
      sessionDate: new Date().toISOString().split('T')[0],
      speakingScore: 5,
      confidenceScore: 5,
      participationScore: 5,
      teacherNotes: "",
    }
  });

  const onSubmit = (data: EvalFormValues) => {
    createEval({ data }, {
      onSuccess: () => {
        toast({ title: "Evaluation saved successfully" });
        form.reset({
          ...form.getValues(),
          speakingScore: 5,
          confidenceScore: 5,
          participationScore: 5,
          teacherNotes: ""
        });
        refetch();
      },
      onError: (error) => {
        toast({ title: "Error saving evaluation", description: error.message, variant: "destructive" });
      }
    });
  };

  const ScoreBadge = ({ score }: { score: number }) => (
    <div className={`px-2 py-1 rounded text-xs font-bold w-10 text-center
      ${score >= 8 ? 'bg-teal-100 text-teal-800' : score >= 5 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}
    `}>
      {score}/10
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Evaluations</h1>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="list">Recent Evaluations</TabsTrigger>
          <TabsTrigger value="new">New Evaluation</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6 space-y-4">
          <div className="flex justify-end mb-4">
            <Select value={filterStudentId} onValueChange={setFilterStudentId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filter by student" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {evaluations.length === 0 ? (
              <div className="p-8 text-center border rounded-lg bg-card/50 text-muted-foreground">
                No evaluations found.
              </div>
            ) : (
              evaluations.map(evaluation => {
                const student = students.find(s => s.id === evaluation.studentId);
                return (
                  <Card key={evaluation.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        <div className="p-6 flex-1 border-b md:border-b-0 md:border-r">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-bold text-lg">{student?.name || `Student #${evaluation.studentId}`}</h3>
                              <p className="text-sm text-muted-foreground">
                                Week {evaluation.weekNumber} • {safeFmt(evaluation.sessionDate, "MMM d, yyyy")}
                              </p>
                            </div>
                            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">
                              {Math.round(evaluation.progressScore)}% overall
                            </div>
                          </div>
                          {evaluation.teacherNotes && (
                            <p className="mt-4 text-sm bg-muted/30 p-3 rounded-md italic">
                              "{evaluation.teacherNotes}"
                            </p>
                          )}
                        </div>
                        <div className="p-6 md:w-[250px] bg-muted/10 space-y-4 shrink-0">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Speaking</span>
                            <ScoreBadge score={evaluation.speakingScore} />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Confidence</span>
                            <ScoreBadge score={evaluation.confidenceScore} />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Participation</span>
                            <ScoreBadge score={evaluation.participationScore} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="new" className="mt-6">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Record Session Evaluation</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="studentId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {students.map(s => (
                              <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="weekNumber" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Week #</FormLabel>
                          <FormControl><Input type="number" min="1" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="sessionDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <div className="space-y-6 pt-4 border-t">
                    <FormField control={form.control} name="speakingScore" render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between mb-2">
                          <FormLabel>Speaking Fluency</FormLabel>
                          <span className="font-bold text-primary">{field.value}/10</span>
                        </div>
                        <FormControl>
                          <Slider 
                            min={1} max={10} step={1} 
                            value={[field.value]} 
                            onValueChange={(vals) => field.onChange(vals[0])} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="confidenceScore" render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between mb-2">
                          <FormLabel>Confidence Level</FormLabel>
                          <span className="font-bold text-primary">{field.value}/10</span>
                        </div>
                        <FormControl>
                          <Slider 
                            min={1} max={10} step={1} 
                            value={[field.value]} 
                            onValueChange={(vals) => field.onChange(vals[0])} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="participationScore" render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between mb-2">
                          <FormLabel>Class Participation</FormLabel>
                          <span className="font-bold text-primary">{field.value}/10</span>
                        </div>
                        <FormControl>
                          <Slider 
                            min={1} max={10} step={1} 
                            value={[field.value]} 
                            onValueChange={(vals) => field.onChange(vals[0])} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="pt-4 border-t">
                    <FormField control={form.control} name="teacherNotes" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teacher Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Observations, areas for improvement..." className="min-h-[100px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? "Saving..." : "Save Evaluation"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
