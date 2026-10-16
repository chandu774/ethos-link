import api from "@/lib/apiClient";

export interface CollaborationGroup {
  id: string;
  name: string;
  description?: string | null;
  creator_id?: string;
  is_private?: boolean;
  avatar_url?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CollaborationAssignment {
  id: string;
  group_id?: string;
  title: string;
  description?: string | null;
  deadline: string;
  created_by?: string;
  created_at: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  max_marks?: number;
  subject?: string;
}

export interface CollaborationSubmission {
  id: string;
  assignment_id: string;
  user_id: string;
  file_url?: string | null;
  file_name?: string | null;
  status: "pending" | "submitted" | "graded";
  comment?: string | null;
  submitted_at?: string | null;
  marks_obtained?: number | null;
  feedback?: string | null;
}

export interface CollaborationTask {
  id: string;
  title: string;
  description?: string | null;
  status: "pending" | "in_progress" | "completed";
  deadline?: string | null;
  due_date?: string | null;
  created_by?: string;
  group_id?: string | null;
  assigned_to?: string | null;
  created_at: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  official_assignment_id?: string | null;
  subject?: string | null;
}

export interface CollaborationNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  action_url?: string | null;
  is_read: boolean;
  created_at: string;
  metadata?: any;
}

export interface CollaborationNote {
  id: string;
  title: string;
  description?: string | null;
  subject: string;
  file_url: string;
  classroom_id?: string | null;
  group_id?: string | null;
  user_id: string;
  created_at: string;
}

export interface CollaborationNoteLike {
  id: string;
  note_id: string;
  user_id: string;
}

export interface CollaborationAssignmentMessage {
  id: string;
  assignment_id: string;
  user_id: string;
  message: string;
  created_at: string;
}

export interface CollaborationGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    id: string;
    name: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export interface CollaborationMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  reply_to_message_id?: string | null;
  file_url?: string | null;
  type?: string;
  metadata?: any;
  sender?: {
    id: string;
    name: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export function buildStoragePath(userId: string, file: File, prefix: string) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "-");
  return `${prefix}/${userId}/${Date.now()}-${baseName}.${extension}`;
}

export async function uploadCollaborationFile({
  bucket: _bucket,
  path: _path,
  file,
}: {
  bucket: "assignment-files" | "submission-files" | "shared-files" | "notes-files" | "notes";
  path: string;
  file: File;
}) {
  const formData = new FormData();
  formData.append("file", file);
  const data = await api.upload<{ url: string }>("/storage/upload", formData);
  return data.url;
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
