import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/apiClient";
import type {
  CollaborationAssignment,
  CollaborationSubmission,
} from "@/lib/collaboration";

type PublicProfile = {
  id: string;
  name: string;
  username?: string;
  avatar_url?: string;
};

export type SubmissionWithUser = CollaborationSubmission & {
  user?: PublicProfile | null;
};

export function useAssignments(groupId: string | null) {
  return useQuery({
    queryKey: ["assignments", groupId],
    queryFn: async () => {
      const data = await api.get<any[]>("/assignments");
      return (data || []).map((a: any) => ({
        id: a.id || a._id,
        group_id: a.classroom_id?._id || a.classroom_id || groupId || "",
        title: a.title,
        description: a.description,
        deadline: a.deadline,
        created_by: a.created_by?._id || a.created_by || "",
        created_at: a.created_at,
        attachment_url: a.attachment_url,
        attachment_name: a.attachment_name,
        subject: a.teaching_assignment_id?.subject_name || a.topic || "Coursework",
        max_marks: a.max_marks,
      })) as CollaborationAssignment[];
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

      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await api.upload<{ url: string }>("/storage/upload", formData);
        attachmentUrl = uploadRes.url;
        attachmentName = file.name;
      }

      const data = await api.post<any>("/assignments", {
        classroom_id: targetGroupId,
        title: title.trim(),
        description: description?.trim() || null,
        deadline,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
      });

      return {
        id: data.id || data._id,
        group_id: targetGroupId || "",
        title: data.title,
        description: data.description,
        deadline: data.deadline,
        created_by: user.id,
        created_at: data.created_at,
        attachment_url: data.attachment_url,
        attachment_name: data.attachment_name,
      } as CollaborationAssignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Assignment created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create assignment");
    },
  });
}

export function useAssignmentDetails(assignmentId: string | null) {
  return useQuery({
    queryKey: ["assignment-details", assignmentId],
    queryFn: async () => {
      if (!assignmentId) return null;
      const data = await api.get<any>(`/assignments/${assignmentId}`);
      if (!data) return null;

      return {
        id: data.id || data._id,
        group_id: data.classroom_id?._id || data.classroom_id || "",
        title: data.title,
        description: data.description,
        deadline: data.deadline,
        created_by: data.created_by?._id || data.created_by || "",
        created_at: data.created_at,
        attachment_url: data.attachment_url,
        attachment_name: data.attachment_name,
      } as CollaborationAssignment;
    },
    enabled: !!assignmentId,
  });
}

export function useRemoveAssignmentAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      await api.patch(`/assignments/${assignmentId}`, {
        attachment_url: null,
        attachment_name: null,
      });
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
      await api.patch(`/assignments/${assignmentId}`, updates);
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
      await api.delete(`/assignments/${assignmentId}`);
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
      const data = await api.get<any[]>(`/assignments/${assignmentId}/submissions`);
      return (data || []).map((s: any) => ({
        id: s.id || s._id,
        assignment_id: s.assignment_id,
        user_id: s.user_id?._id || s.user_id,
        file_url: s.attachment_url || s.file_url,
        file_name: s.file_name || "submitted_file",
        status: s.status,
        comment: s.submission_text || s.comment,
        submitted_at: s.submitted_at,
        marks_obtained: s.marks_obtained,
        feedback: s.feedback,
        user: s.user_id && typeof s.user_id === "object"
          ? {
              id: s.user_id._id || s.user_id.id,
              name: s.user_id.name || "Student",
              username: s.user_id.roll_number,
              avatar_url: s.user_id.avatar_url,
            }
          : null,
      })) as SubmissionWithUser[];
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
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await api.upload<{ url: string }>("/storage/upload", formData);
        fileUrl = uploadRes.url;
        fileName = file.name;
      }

      const data = await api.post<any>(`/assignments/${assignmentId}/submit`, {
        submission_text: comment?.trim() || null,
        attachment_url: fileUrl,
        file_name: fileName,
      });

      return {
        id: data.id || data._id,
        assignment_id: assignmentId,
        user_id: user.id,
        file_url: fileUrl,
        file_name: fileName,
        status: "submitted",
        comment: comment?.trim() || null,
        submitted_at: new Date().toISOString(),
      } as CollaborationSubmission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignment-submissions", assignmentId] });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
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
      await api.patch(`/assignments/${assignmentId}/submissions/${submissionId}`, {
        attachment_url: null,
        file_name: null,
        status: "pending",
        submitted_at: null,
      });
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
