import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface UpdateMyProfileBody {
  name?: string;
  phone?: string | null;
  phone2?: string | null;
  bio?: string | null;
  specialization?: string | null;
  profilePicture?: string | null;
}

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

export const useUpdateMyProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateMyProfileBody) =>
      customFetch<Record<string, unknown>>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/auth/me"] });
    },
  });
};

export const useChangePassword = () =>
  useMutation({
    mutationFn: (data: ChangePasswordBody) =>
      customFetch<{ message: string }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  });
