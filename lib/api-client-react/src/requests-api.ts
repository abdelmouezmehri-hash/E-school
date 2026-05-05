import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface ActivityRequest {
  id: number;
  title: string;
  description: string;
  date: string;
  requiredItems: string[];
  cost: number | null;
  authorId: number | null;
  authorName: string | null;
  createdAt: string;
  approvedCount: number;
  declinedCount: number;
  totalResponses: number;
}

export interface ActivityConsent {
  id: number;
  parentId: number;
  parentName: string | null;
  status: "approved" | "declined";
  respondedAt: string;
}

export function useListRequests() {
  return useQuery<ActivityRequest[]>({
    queryKey: ["requests"],
    queryFn: () => customFetch("/api/requests"),
  });
}

export function useRequestConsents(requestId: number) {
  return useQuery<ActivityConsent[]>({
    queryKey: ["request-consents", requestId],
    queryFn: () => customFetch(`/api/requests/${requestId}/consents`),
    enabled: !!requestId,
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description: string; date: string; requiredItems: string[]; cost?: number }) =>
      customFetch("/api/requests", { method: "POST", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["requests"] }),
  });
}

export function useDeleteRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customFetch(`/api/requests/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["requests"] }),
  });
}

export function useSubmitConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, status }: { requestId: number; status: "approved" | "declined" }) =>
      customFetch(`/api/requests/${requestId}/consent`, { method: "POST", body: JSON.stringify({ status }), headers: { "Content-Type": "application/json" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["requests"] }),
  });
}
