import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type CollaborationGroup = Tables<"groups">;
export type CollaborationAssignment = Tables<"assignments">;
export type CollaborationSubmission = Tables<"submissions">;
export type CollaborationTask = Tables<"tasks">;
export type CollaborationNotification = Tables<"notifications">;
export type CollaborationNote = Tables<"notes">;
export type CollaborationNoteLike = Tables<"note_likes">;
export type CollaborationAssignmentMessage = Tables<"assignment_messages">;
export type CollaborationGroupMember = Tables<"group_members"> & {
  profile?: Pick<Tables<"profiles">, "id" | "name" | "username" | "avatar_url"> | null;
};
export type CollaborationMessage = Tables<"group_messages"> & {
  sender?: Pick<Tables<"profiles">, "id" | "name" | "username" | "avatar_url"> | null;
};

export function buildStoragePath(userId: string, file: File, prefix: string) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "-");
  return `${prefix}/${userId}/${Date.now()}-${baseName}.${extension}`;
}

export async function uploadCollaborationFile({
  bucket,
  path,
  file,
}: {
  bucket: "assignment-files" | "submission-files" | "shared-files" | "notes-files" | "notes";
  path: string;
  file: File;
}) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function isPreviewableFile(url: string | null | undefined) {
  if (!url) return false;
  return /\.(png|jpe?g|gif|webp|svg|pdf)$/i.test(url);
}

export function formatDeadline(date: string | null | undefined) {
  if (!date) return "No deadline";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}
