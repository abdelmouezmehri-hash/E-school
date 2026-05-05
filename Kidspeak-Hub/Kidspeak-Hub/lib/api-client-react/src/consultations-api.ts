import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface Consultation {
  id: number;
  parentId: number;
  parentName: string | null;
  parentEmail: string | null;
  studentId: number | null;
  studentName: string | null;
  type: "free" | "paid";
  status: "pending" | "approved" | "rejected" | "completed";
  parentNotes: string | null;
  price: number | null;
  adminDescription: string | null;
  psychologistSummary: string | null;
  scheduledDate: string | null;
  initiatedBy: "parent" | "psychologist";
  psychologistId: number | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  completedAt: string | null;
}

export interface CreateConsultationBody {
  type: "free" | "paid";
  studentId?: number | null;
  parentNotes?: string;
  scheduledDate?: string;
}

export interface ApproveConsultationBody {
  price?: number;
  adminDescription?: string;
  scheduledDate?: string;
}

export interface CompleteConsultationBody {
  psychologistSummary?: string;
}

// ── List consultations (role-aware) ──
export function useListConsultations() {
  return useQuery<Consultation[]>({
    queryKey: ["consultations"],
    queryFn: () => customFetch("/api/consultations"),
  });
}

// ── Create consultation (parent) ──
export function useCreateConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateConsultationBody) =>
      customFetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consultations"] }),
  });
}

// ── Approve consultation (admin) ──
export function useApproveConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ApproveConsultationBody }) =>
      customFetch(`/api/consultations/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consultations"] }),
  });
}

// ── Reject consultation (admin) ──
export function useRejectConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      customFetch(`/api/consultations/${id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminDescription: reason }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consultations"] }),
  });
}

// ── Schedule consultation (psychologist initiates for a parent) ──
export function useScheduleConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { parentId: number; studentId?: number; type: "free" | "paid"; scheduledDate: string; adminDescription?: string; price?: number }) =>
      customFetch("/api/consultations/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consultations"] }),
  });
}

// ── Complete consultation (psychologist) ──
export function useCompleteConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CompleteConsultationBody }) =>
      customFetch(`/api/consultations/${id}/complete`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consultations"] }),
  });
}
