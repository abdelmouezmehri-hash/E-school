import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface Message {
  id: number;
  subject: string;
  content: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  fromUserId: number | null;
  toUserId: number | null;
  recipientType: string;
  recipientLabel: string | null;
  recipientCount: number | null;
  batchId: string | null;
  replyToId: number | null;
  linkedStudentId: number | null;
  linkedStudentName: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  fromName?: string | null;
  toName?: string | null;
}

export interface Conversation {
  partnerId: number;
  partnerName: string;
  partnerRole: string;
  partnerEmail: string;
  latestMessage: Message;
  unreadCount: number;
}

export interface ContactUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface GroupOption {
  id: number;
  name: string;
}

export interface UnreadCountResponse {
  count: number;
}

export interface SendMessagePayload {
  recipientType: "individual" | "group" | "level" | "role" | "all_parents" | "global";
  toUserId?: number;
  groupId?: number;
  levelId?: number;
  role?: string;
  subject?: string;
  content: string;
  linkedStudentId?: number | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  replyToId?: number | null;
}

export function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: ["messages", "conversations"],
    queryFn: () => customFetch("/api/messages/conversations"),
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

export function useMessageThread(userId: number | null) {
  return useQuery<Message[]>({
    queryKey: ["messages", "thread", userId],
    queryFn: () => customFetch(`/api/messages/thread/${userId}`),
    enabled: userId !== null,
    refetchInterval: 15000,
    staleTime: 5000,
  });
}

export function useMarkThreadRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) =>
      customFetch(`/api/messages/thread/${userId}/read-all`, { method: "PATCH" }),
    onSuccess: (_data: unknown, userId: number) => {
      qc.invalidateQueries({ queryKey: ["messages", "conversations"] });
      qc.invalidateQueries({ queryKey: ["messages", "thread", userId] });
      qc.invalidateQueries({ queryKey: ["messages", "unread-count"] });
    },
  });
}

export function useInboxMessages() {
  return useQuery<Message[]>({
    queryKey: ["messages", "inbox"],
    queryFn: () => customFetch("/api/messages?folder=inbox"),
  });
}

export function useSentMessages() {
  return useQuery<Message[]>({
    queryKey: ["messages", "sent"],
    queryFn: () => customFetch("/api/messages?folder=sent"),
  });
}

export function useUnreadCount() {
  return useQuery<UnreadCountResponse>({
    queryKey: ["messages", "unread-count"],
    queryFn: () => customFetch("/api/messages/unread-count"),
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useContacts() {
  return useQuery<ContactUser[]>({
    queryKey: ["messages-contacts"],
    queryFn: () => customFetch("/api/messages/contacts"),
  });
}

export function useMessageGroups() {
  return useQuery<GroupOption[]>({
    queryKey: ["messages-groups"],
    queryFn: () => customFetch("/api/messages/groups"),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SendMessagePayload) =>
      customFetch("/api/messages", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

export function useMarkMessageRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/messages/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

// Legacy compat: keep useListMessages pointing to inbox
export function useListMessages() {
  return useInboxMessages();
}

// Legacy compat
export function useListParents() {
  return useQuery<ContactUser[]>({
    queryKey: ["messages-contacts"],
    queryFn: () => customFetch("/api/messages/contacts"),
  });
}
