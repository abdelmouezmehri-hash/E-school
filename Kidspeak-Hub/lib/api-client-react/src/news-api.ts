import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export type NewsCategory = "school_update" | "educational_tip" | "event_gallery";

export interface NewsItem {
  id: number;
  title: string;
  titleAr: string | null;
  content: string;
  contentAr: string | null;
  imageUrl: string | null;
  category: NewsCategory;
  authorId: number | null;
  authorName: string | null;
  createdAt: string;
}

export function useListNews(category?: NewsCategory | null) {
  return useQuery<NewsItem[]>({
    queryKey: ["news", category],
    queryFn: () => customFetch(`/api/news${category ? `?category=${category}` : ""}`),
  });
}

export function useCreateNews() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      titleAr?: string;
      content: string;
      contentAr?: string;
      imageUrl?: string;
      category?: NewsCategory;
    }) =>
      customFetch("/api/news", { method: "POST", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["news"] }),
  });
}

export function useDeleteNews() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/news/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["news"] }),
  });
}
