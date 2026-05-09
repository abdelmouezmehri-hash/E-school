import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface ExpenseTemplate {
  id: number;
  branchId: number | null;
  name: string;
  category: "rent" | "utilities" | "salaries" | "materials" | "maintenance" | "other";
  defaultAmount: number;
  isActive: boolean;
  createdAt: string;
}

export interface GenerateExpensesResult {
  created: Array<{
    id: number;
    templateId: number | null;
    description: string;
    category: string;
    amount: number;
    expenseDate: string;
  }>;
  skipped: number[];
}

const templatesQueryKey = () => ["/api/expense-templates"] as const;

export const useListExpenseTemplates = () =>
  useQuery({
    queryKey: templatesQueryKey(),
    queryFn: () => customFetch<ExpenseTemplate[]>("/api/expense-templates"),
  });

export const useCreateExpenseTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; category: string; defaultAmount: number; branchId?: number }) =>
      customFetch<ExpenseTemplate>("/api/expense-templates", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: templatesQueryKey() }),
  });
};

export const useUpdateExpenseTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; category?: string; defaultAmount?: number; isActive?: boolean } }) =>
      customFetch<ExpenseTemplate>(`/api/expense-templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: templatesQueryKey() }),
  });
};

export const useDeleteExpenseTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ message: string }>(`/api/expense-templates/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: templatesQueryKey() }),
  });
};

export const useGenerateExpenses = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { month: string; amounts: Array<{ templateId: number; amount: number }> }) =>
      customFetch<GenerateExpensesResult>("/api/expense-templates/generate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/expenses"] });
      qc.invalidateQueries({ queryKey: templatesQueryKey() });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/revenue"] });
    },
  });
};