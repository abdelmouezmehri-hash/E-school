import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface EnrollmentRequest {
  id: number;
  parentId: number;
  parentName: string | null;
  studentName: string;
  dateOfBirth: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  adminNotes: string | null;
  createdAt: string;
}

export function useListEnrollmentRequests() {
  return useQuery<EnrollmentRequest[]>({
    queryKey: ["enrollment-requests"],
    queryFn: () => customFetch("/api/enrollment-requests"),
  });
}

export function useCreateEnrollmentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { studentName: string; dateOfBirth?: string; notes?: string }) =>
      customFetch("/api/enrollment-requests", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["enrollment-requests"] }),
  });
}

export function useApproveEnrollmentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adminNotes, levelId }: { id: number; adminNotes?: string; levelId?: number }) =>
      customFetch(`/api/enrollment-requests/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ adminNotes, levelId }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enrollment-requests"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useRejectEnrollmentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adminNotes }: { id: number; adminNotes?: string }) =>
      customFetch(`/api/enrollment-requests/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ adminNotes }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["enrollment-requests"] }),
  });
}
