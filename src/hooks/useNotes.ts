import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/apiClient";

const DEFAULT_PAGE_SIZE = 12;
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

interface PublicProfile {
  id: string | null;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface NoteRow {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  file_url: string;
  classroom_id: string | null;
  group_id: string | null;
  user_id: string;
  created_at: string;
  uploader?: PublicProfile | null;
}

export interface NoteItem extends NoteRow {
  download_url: string | null;
}

function isAllowedFile(file: File) {
  return ALLOWED_FILE_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE_BYTES;
}

export function useNotes({
  classroomId,
  subject,
  pageSize = DEFAULT_PAGE_SIZE,
}: {
  classroomId?: string | null;
  subject?: string | null;
  pageSize?: number;
}) {
  return useInfiniteQuery({
    queryKey: ["notes", classroomId || "all", subject || "all", pageSize],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (classroomId) params.append("classroomId", classroomId);
      if (subject && subject !== "all") params.append("subject", subject);
      params.append("page", String(pageParam + 1));
      params.append("limit", String(pageSize));

      const data = await api.get<any[]>(`/notes?${params.toString()}`);
      return (data || []).map((row: any) => ({
        id: row.id || row._id,
        title: row.title,
        description: row.description || null,
        subject: row.subject,
        file_url: row.file_url,
        classroom_id: row.classroom_id?._id || row.classroom_id || null,
        group_id: row.group_id || null,
        user_id: row.user_id?._id || row.user_id,
        created_at: row.created_at,
        uploader: row.user_id && typeof row.user_id === "object"
          ? {
              id: row.user_id._id || row.user_id.id,
              name: row.user_id.name || "Student",
              username: row.user_id.roll_number,
              avatar_url: row.user_id.avatar_url,
            }
          : null,
        download_url: row.file_url,
      })) as NoteItem[];
    },
    getNextPageParam: (lastPage, allPages) => (lastPage.length < pageSize ? undefined : allPages.length),
  });
}

export function useUploadNote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      description,
      subject,
      classroomId,
      file,
    }: {
      title: string;
      description?: string | null;
      subject: string;
      classroomId?: string | null;
      file: File;
    }) => {
      if (!user) throw new Error("Please login first.");
      if (!title.trim()) throw new Error("Title is required.");
      if (!subject.trim()) throw new Error("Subject is required.");
      if (!file) throw new Error("Attach a file.");
      if (!isAllowedFile(file)) throw new Error("Invalid file type or file is larger than 15MB.");

      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await api.upload<{ url: string }>("/storage/upload", formData);

      const data = await api.post<any>("/notes", {
        title: title.trim(),
        description: description?.trim() || null,
        subject: subject.trim(),
        file_url: uploadRes.url,
        classroom_id: classroomId || undefined,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Note shared with your classroom");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload note");
    },
  });
}

export function useDeleteNote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (note: Pick<NoteItem, "id" | "user_id" | "file_url">) => {
      if (!user) throw new Error("Please login first.");
      await api.delete(`/notes/${note.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete note");
    },
  });
}
