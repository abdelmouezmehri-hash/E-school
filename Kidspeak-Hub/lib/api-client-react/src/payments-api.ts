import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface PaymentTransaction {
  id: number;
  paymentId: number;
  amount: number;
  paymentMethod: "cash" | "bank_transfer" | "cheque" | "online";
  transactionDate: string;
  notes: string | null;
  createdAt: string;
}

export interface AddTransactionBody {
  amount: number;
  paymentMethod: "cash" | "bank_transfer" | "cheque" | "online";
  transactionDate: string;
  notes?: string;
}

export interface TransactionReceipt {
  receiptNumber: string;
  studentName: string;
  parentName: string | null;
  levelName: string | null;
  amountDue: number;
  transactionAmount: number;
  totalPaid: number;
  balance: number;
  paymentMethod: string;
  transactionDate: string;
  notes: string | null;
  issuedAt: string;
}

export interface DebtStudent {
  paymentId: number;
  studentId: number;
  studentName: string;
  levelName: string | null;
  amountDue: number;
  amountPaid: number;
  balance: number;
  dueDate: string;
  status: string;
  oldestDueDate: string;
}

export interface DebtSummary {
  totalDebt: number;
  students: DebtStudent[];
}

const txQueryKey = (paymentId: number) => ["payments", paymentId, "transactions"] as const;

export const useListTransactions = (paymentId: number) =>
  useQuery<PaymentTransaction[]>({
    queryKey: txQueryKey(paymentId),
    queryFn: () => customFetch(`/api/payments/${paymentId}/transactions`),
    enabled: paymentId > 0,
  });

export const useAddTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, data }: { paymentId: number; data: AddTransactionBody }) =>
      customFetch<PaymentTransaction>(`/api/payments/${paymentId}/transactions`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_r, { paymentId }) => {
      qc.invalidateQueries({ queryKey: txQueryKey(paymentId) });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["debt-summary"] });
    },
  });
};

export const useDeleteTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, txId }: { paymentId: number; txId: number }) =>
      customFetch(`/api/payments/${paymentId}/transactions/${txId}`, { method: "DELETE" }),
    onSuccess: (_r, { paymentId }) => {
      qc.invalidateQueries({ queryKey: txQueryKey(paymentId) });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["debt-summary"] });
    },
  });
};

export const useGetTransactionReceipt = (txId: number, options?: { enabled?: boolean }) =>
  useQuery<TransactionReceipt>({
    queryKey: ["transactions", txId, "receipt"],
    queryFn: () => customFetch(`/api/transactions/${txId}/receipt`),
    enabled: options?.enabled !== false && txId > 0,
  });

export const useGetDebtSummary = () =>
  useQuery<DebtSummary>({
    queryKey: ["debt-summary"],
    queryFn: () => customFetch("/api/debt-summary"),
  });

export interface PaymentEditRecord {
  id: number;
  editedAt: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  editedBy: { id: number; name: string };
}

export const useListPaymentEdits = (paymentId: number, options?: { enabled?: boolean }) =>
  useQuery<PaymentEditRecord[]>({
    queryKey: ["payments", paymentId, "edits"] as const,
    queryFn: () => customFetch(`/api/payments/${paymentId}/edits`),
    enabled: options?.enabled !== false && paymentId > 0,
  });
