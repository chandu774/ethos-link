import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  buildStoragePath,
  type CollaborationAssignment,
  type CollaborationSubmission,
  uploadCollaborationFile,
} from "@/lib/collaboration";

type PublicProfile = Pick<Tables<"profiles_public">, "id" | "name" | "username" | "avatar_url">;
export type SubmissionWithUser = CollaborationSubmission & {
  user?: PublicProfile | null;
};

export function useAssignments(groupId: string | null) {
  return useQuery({
    queryKey: ["assignments", groupId],
    queryFn: async () => {
      let query = supabase
        .from("assignments")
        .select("*")
        .order("deadline", { ascending: true });

      if (groupId) {
        query = query.eq("group_id", groupId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as CollaborationAssignment[];
    },
    enabled: true,
  });
}

export function useCreateAssignment(defaultGroupId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      title,
      description,
      deadline,
      file,
    }: {
      groupId?: string;
      title: string;
      description?: string;
      deadline: string;
      file?: File | null;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const targetGroupId = groupId || defaultGroupId;
      if (!targetGroupId) throw new Error("Please select a group");

      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;

      if (file) {
        const path = buildStoragePath(user.id, file, targetGroupId);
        await uploadCollaborationFile({
          bucket: "assignment-files",
          path,
          file,
        });
        attachmentUrl = path;
        attachmentName = file.name;
      }

      const { data, error } = await supabase
        .from("assignments")
        .insert({
          group_id: targetGroupId,
          title: title.trim(),
          description: description?.trim() || null,
          deadline,
          created_by: user.id,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
        })
        .select("*")
        .single();

      if (error) throw error;
      return data as CollaborationAssignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Assignment created");
    },
    onError: (error: Error) => {
      const maybeCode = (error as Error & { code?: string }).code;
      const message = error.message || "Failed to create assignment";
      if (maybeCode === "42P01" || message.includes("does not exist")) {
        toast.error("Assignments table is missing. Run Supabase migrations first.");
        return;
      }
      toast.error(message);
    },
  });
}

export function useAssignmentDetails(assignmentId: string | null) {
  return useQuery({
    queryKey: ["assignment-details", assignmentId],
    queryFn: async () => {
      if (!assignmentId) return null;

      const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .eq("id", assignmentId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return data as CollaborationAssignment;
    },
    enabled: !!assignmentId,
  });
}

export function useRemoveAssignmentAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("assignments")
        .update({
          attachment_url: null,
          attachment_name: null,
        })
        .eq("id", assignmentId);

      if (error) throw error;
    },
    onSuccess: (_, assignmentId) => {
      queryClient.invalidateQueries({ queryKey: ["assignment-details", assignmentId] });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Attachment deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete attachment");
    },
  });
}

export function useUpdateAssignment(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      updates,
    }: {
      assignmentId: string;
      updates: Partial<Pick<CollaborationAssignment, "title" | "description" | "deadline">>;
    }) => {
      const { error } = await supabase
        .from("assignments")
        .update(updates)
        .eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments", groupId] });
      toast.success("Assignment updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update assignment");
    },
  });
}

export function useDeleteAssignment(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from("assignments").delete().eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: (_, assignmentId) => {
      queryClient.invalidateQueries({ queryKey: ["assignments", groupId] });
      queryClient.invalidateQueries({ queryKey: ["assignment-details", assignmentId] });
      queryClient.invalidateQueries({ queryKey: ["assignment-submissions", assignmentId] });
      toast.success("Assignment deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete assignment");
    },
  });
}

export function useAssignmentSubmissions(assignmentId: string | null) {
  return useQuery({
    queryKey: ["assignment-submissions", assignmentId],
    queryFn: async () => {
      if (!assignmentId) return [] as SubmissionWithUser[];
      const { data, error } = await supabase
        .from("submissions")
        .select(`
          *,
          user:profiles_public(id, name, username, avatar_url)
        `)
        .eq("assignment_id", assignmentId)
        .order("updated_at", { ascending: false });
      if (error) throw error;

      return (data || []) as SubmissionWithUser[];
    },
    enabled: !!assignmentId,
  });
}

export function useSubmitAssignment(assignmentId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, comment }: { file?: File | null; comment?: string }) => {
      if (!user) throw new Error("Not authenticated");

      let fileUrl: string | null = null;
      let fileName: string | null = null;

      if (file) {
        const path = buildStoragePath(user.id, file, assignmentId);
        await uploadCollaborationFile({
          bucket: "submission-files",
          path,
          file,
        });
        fileUrl = path;
        fileName = file.name;
      }

      const { data, error } = await supabase
        .from("submissions")
        .upsert(
          {
            assignment_id: assignmentId,
            user_id: user.id,
            file_url: fileUrl,
            file_name: fileName,
            status: fileUrl ? "submitted" : "pending",
            comment: comment?.trim() || null,
            submitted_at: fileUrl ? new Date().toISOString() : null,
          },
          { onConflict: "assignment_id,user_id" }
        )
        .select("*")
        .single();

      if (error) throw error;
      return data as CollaborationSubmission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignment-submissions", assignmentId] });
      toast.success("Submission saved");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit assignment");
    },
  });
}

export function useRemoveSubmissionFile(assignmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (submissionId: string) => {
      const { error } = await supabase
        .from("submissions")
        .update({
          file_url: null,
          file_name: null,
          status: "pending",
          submitted_at: null,
        })
        .eq("id", submissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignment-submissions", assignmentId] });
      toast.success("Uploaded file deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete uploaded file");
    },
  });
}
