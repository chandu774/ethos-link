import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { buildStoragePath } from "@/lib/collaboration";

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
  subject: string;
  file_url: string;
  group_id: string;
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

function getStoragePathFromRef(fileRef: string, bucket: string) {
  if (!/^https?:\/\//i.test(fileRef)) return fileRef;

  try {
    const url = new URL(fileRef);
    const path = decodeURIComponent(url.pathname);
    const patterns = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
      `/storage/v1/object/authenticated/${bucket}/`,
      `/object/public/${bucket}/`,
      `/object/sign/${bucket}/`,
      `/object/authenticated/${bucket}/`,
    ];

    for (const pattern of patterns) {
      const index = path.indexOf(pattern);
      if (index >= 0) {
        const objectPath = path.slice(index + pattern.length);
        return objectPath || fileRef;
      }
    }
  } catch {
    return fileRef;
  }

  return fileRef;
}

async function toSignedUrl(fileRef: string) {
  const objectPath = getStoragePathFromRef(fileRef, "notes");
  const { data, error } = await supabase.storage.from("notes").createSignedUrl(objectPath, 60 * 60);
  if (error) return fileRef;
  return data?.signedUrl || fileRef;
}

export function useNotes({
  groupId,
  pageSize = DEFAULT_PAGE_SIZE,
}: {
  groupId?: string | null;
  pageSize?: number;
}) {
  return useInfiniteQuery({
    queryKey: ["notes", groupId || "all", pageSize],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from("notes")
        .select(
          `
            id,
            title,
            subject,
            file_url,
            group_id,
            user_id,
            created_at,
            uploader:profiles_public(id, name, username, avatar_url)
          `
        )
        .order("created_at", { ascending: false });

      if (groupId) {
        query = query.eq("group_id", groupId);
      }

      const from = pageParam * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await query.range(from, to);
      if (error) throw error;

      const rows = (data || []) as NoteRow[];
      const withUrls = await Promise.all(
        rows.map(async (row) => ({
          ...row,
          download_url: await toSignedUrl(row.file_url),
        }))
      );
      return withUrls;
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
      subject,
      groupId,
      file,
    }: {
      title: string;
      subject: string;
      groupId: string;
      file: File;
    }) => {
      if (!user) throw new Error("Please login first.");
      if (!title.trim()) throw new Error("Title is required.");
      if (!subject.trim()) throw new Error("Subject is required.");
      if (!groupId) throw new Error("Select a group.");
      if (!file) throw new Error("Attach a file.");
      if (!isAllowedFile(file)) throw new Error("Invalid file type or file is larger than 15MB.");

      const path = buildStoragePath(user.id, file, `${groupId}`);
      const { error: uploadError } = await supabase.storage.from("notes").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("notes")
        .insert({
          title: title.trim(),
          subject: subject.trim(),
          file_url: path,
          group_id: groupId,
          user_id: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note uploaded");
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
      if (note.user_id !== user.id) {
        throw new Error("Only the uploader can delete this note.");
      }

      const objectPath = getStoragePathFromRef(note.file_url, "notes");
      const { error: storageError } = await supabase.storage.from("notes").remove([objectPath]);
      if (storageError) throw storageError;

      const { error } = await supabase.from("notes").delete().eq("id", note.id);
      if (error) throw error;
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
