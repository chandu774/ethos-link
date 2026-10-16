import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/apiClient";

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

      const [notesRes, assignmentsRes, groupsRes] = await Promise.all([
        api.get<any[]>("/notes").catch(() => []),
        api.get<any[]>("/assignments").catch(() => []),
        api.get<any[]>("/chat/groups").catch(() => []),
      ]);

      const notes: ProfileNoteItem[] = (notesRes || [])
        .filter((n: any) => (n.user_id?._id || n.user_id) === user.id)
        .map((n: any) => ({
          id: n.id || n._id,
          title: n.title,
          subject: n.subject,
          file_url: n.file_url,
          created_at: n.created_at || new Date().toISOString(),
          download_url: n.file_url,
        }));

      const assignments: ProfileAssignmentItem[] = (assignmentsRes || []).map((a: any) => ({
        id: a.id || a._id,
        status: a.has_submitted ? "submitted" : "pending",
        submitted_at: a.submission?.submitted_at || null,
        created_at: a.created_at || new Date().toISOString(),
        assignment_title: a.title,
        assignment_deadline: a.deadline || null,
      }));

      const noteActivities: ProfileActivityItem[] = notes.map((note) => ({
        id: `note-${note.id}`,
        type: "note",
        title: "Uploaded note",
        subtitle: `${note.title} · ${note.subject}`,
        created_at: note.created_at,
      }));

      const assignmentActivities: ProfileActivityItem[] = assignments.map((asgn) => ({
        id: `assignment-${asgn.id}`,
        type: "assignment",
        title: asgn.status === "submitted" ? "Submitted assignment" : "Coursework assigned",
        subtitle: asgn.assignment_title,
        created_at: asgn.submitted_at || asgn.created_at,
      }));

      const groupActivities: ProfileActivityItem[] = (groupsRes || []).map((g: any) => ({
        id: `group-${g.id || g._id}`,
        type: "group",
        title: "Joined group",
        subtitle: g.name || "Study group",
        created_at: g.created_at || new Date().toISOString(),
      }));

      const activities = [...noteActivities, ...assignmentActivities, ...groupActivities].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const stats = {
        notesUploaded: notes.length,
        assignmentsSubmitted: assignments.filter((item) => item.status === "submitted").length,
        groupsJoined: groupsRes?.length || 0,
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
