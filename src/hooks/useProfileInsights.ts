import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface ProfileNoteItem {
  id: string;
  title: string;
  subject: string;
  file_url: string;
  created_at: string;
  download_url: string | null;
}

export interface ProfileAssignmentItem {
  id: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
  assignment_title: string;
  assignment_deadline: string | null;
}

export interface ProfileActivityItem {
  id: string;
  type: "note" | "assignment" | "group";
  title: string;
  subtitle: string;
  created_at: string;
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
      if (index >= 0) return path.slice(index + pattern.length);
    }
  } catch {
    return fileRef;
  }

  return fileRef;
}

async function toSignedNoteUrl(fileRef: string) {
  const path = getStoragePathFromRef(fileRef, "notes");
  const { data } = await supabase.storage.from("notes").createSignedUrl(path, 60 * 60);
  return data?.signedUrl || null;
}

function dayKey(dateLike: string) {
  const d = new Date(dateLike);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

function computeStreak(activityDates: string[]) {
  if (!activityDates.length) return 0;

  const unique = new Set(activityDates.map(dayKey));
  const now = new Date();
  const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let streak = 0;

  const todayKey = dayKey(current.toISOString());
  const yesterday = new Date(current);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = dayKey(yesterday.toISOString());

  if (!unique.has(todayKey) && !unique.has(yesterdayKey)) return 0;

  let cursor = unique.has(todayKey) ? current : yesterday;
  while (unique.has(dayKey(cursor.toISOString()))) {
    streak += 1;
    cursor = new Date(cursor);
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

export function useProfileInsights() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["profile-insights", user?.id],
    queryFn: async () => {
      if (!user) {
        return {
          notes: [] as ProfileNoteItem[],
          assignments: [] as ProfileAssignmentItem[],
          activities: [] as ProfileActivityItem[],
          stats: {
            notesUploaded: 0,
            assignmentsSubmitted: 0,
            groupsJoined: 0,
            activityStreak: 0,
          },
        };
      }

      const [notesRes, submissionsRes, membershipsRes] = await Promise.all([
        supabase
          .from("notes")
          .select("id, title, subject, file_url, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(60),
        supabase
          .from("submissions")
          .select("id, status, submitted_at, created_at, assignment:assignments(title, deadline)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(60),
        supabase
          .from("group_members")
          .select("id, joined_at, group:groups(name)")
          .eq("user_id", user.id)
          .order("joined_at", { ascending: false })
          .limit(60),
      ]);

      if (notesRes.error) throw notesRes.error;
      if (submissionsRes.error) throw submissionsRes.error;
      if (membershipsRes.error) throw membershipsRes.error;

      const notesWithUrls = await Promise.all(
        (notesRes.data || []).map(async (note) => ({
          ...note,
          download_url: await toSignedNoteUrl(note.file_url),
        }))
      );

      const notes: ProfileNoteItem[] = notesWithUrls;

      const assignments: ProfileAssignmentItem[] = (submissionsRes.data || []).map((row: any) => ({
        id: row.id,
        status: row.status || "pending",
        submitted_at: row.submitted_at,
        created_at: row.created_at,
        assignment_title: row.assignment?.title || "Assignment",
        assignment_deadline: row.assignment?.deadline || null,
      }));

      const groupActivities: ProfileActivityItem[] = (membershipsRes.data || []).map((row: any) => ({
        id: `group-${row.id}`,
        type: "group",
        title: "Joined group",
        subtitle: row.group?.name || "Study group",
        created_at: row.joined_at,
      }));

      const noteActivities: ProfileActivityItem[] = notes.map((note) => ({
        id: `note-${note.id}`,
        type: "note",
        title: "Uploaded note",
        subtitle: `${note.title} · ${note.subject}`,
        created_at: note.created_at,
      }));

      const assignmentActivities: ProfileActivityItem[] = assignments.map((assignment) => ({
        id: `assignment-${assignment.id}`,
        type: "assignment",
        title: assignment.status === "submitted" ? "Submitted assignment" : "Updated assignment",
        subtitle: assignment.assignment_title,
        created_at: assignment.submitted_at || assignment.created_at,
      }));

      const activities = [...noteActivities, ...assignmentActivities, ...groupActivities].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const stats = {
        notesUploaded: notes.length,
        assignmentsSubmitted: assignments.filter((item) => item.status === "submitted").length,
        groupsJoined: membershipsRes.data?.length || 0,
        activityStreak: computeStreak(activities.map((item) => item.created_at)),
      };

      return {
        notes,
        assignments,
        activities,
        stats,
      };
    },
    enabled: !!user,
  });

  return useMemo(() => query, [query]);
}
