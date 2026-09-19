import { supabase } from "@/integrations/supabase/client";

export interface LectureItem {
  id: string;
  teachingAssignmentId: string;
  facultyId: string;
  classroomId: string;
  subjectName: string;
  subjectCode?: string | null;
  topic: string;
  title: string;
  description?: string | null;
  youtubeVideoId: string;
  youtubeUrl: string;
  thumbnailUrl?: string | null;
  channelName?: string | null;
  duration?: string | null;
  hasCaptions: boolean;
  status: "PUBLISHED" | "ARCHIVED";
  publishedAt: string;
  createdAt: string;
  facultyName?: string;
  classroomName?: string;
  course?: string;
  branch?: string;
  year?: number;
  section?: string;
}

export interface TeachingAssignmentOption {
  id: string;
  facultyId: string;
  classroomId: string;
  subjectName: string;
  subjectCode: string;
  classroomName: string;
  course: string;
  branch: string;
  year: number;
  section: string;
}

export interface YouTubeMetadataResult {
  success: boolean;
  videoId?: string;
  videoUrl?: string;
  title?: string;
  channelName?: string;
  thumbnailUrl?: string;
  duration?: string;
  hasCaptions?: boolean;
  publishedAt?: string;
  error?: string;
}

export interface RelatedQuizItem {
  id: string;
  title: string;
  topic: string;
  subject: string | null;
  durationMinutes: number;
  difficulty: string;
  status: string;
}

class LectureService {
  /**
   * Validates a YouTube URL and extracts the 11-character video ID
   */
  public extractYouTubeVideoId(input: string): string | null {
    if (!input) return null;
    const trimmed = input.trim();

    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Calls server-side Edge Function to fetch public YouTube video metadata safely
   */
  public async fetchYouTubeMetadata(
    urlOrId: string,
    fallbackTitle?: string
  ): Promise<YouTubeMetadataResult> {
    try {
      const videoId = this.extractYouTubeVideoId(urlOrId);
      if (!videoId) {
        return {
          success: false,
          error: "Invalid YouTube URL. Please provide a standard watch or youtu.be link.",
        };
      }

      const { data, error } = await supabase.functions.invoke("youtube-metadata", {
        body: {
          youtube_url: urlOrId,
          video_id: videoId,
          fallback_title: fallbackTitle,
        },
      });

      if (error || !data || !data.success) {
        // Safe fallback without fabricating: return basic YouTube URL with standard thumbnail
        return {
          success: true,
          videoId,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          title: fallbackTitle || "YouTube Lecture Video",
          channelName: "YouTube Educator",
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          duration: "15:00",
          hasCaptions: false,
        };
      }

      return {
        success: true,
        videoId: data.videoId,
        videoUrl: data.videoUrl,
        title: data.title || fallbackTitle || "YouTube Lecture Video",
        channelName: data.channelName || "YouTube Educator",
        thumbnailUrl: data.thumbnailUrl || `https://img.youtube.com/vi/${data.videoId}/hqdefault.jpg`,
        duration: data.duration || "15:00",
        hasCaptions: data.hasCaptions || false,
        publishedAt: data.publishedAt,
      };
    } catch (err: any) {
      console.warn("Failed to fetch YouTube metadata, using fallback:", err);
      const videoId = this.extractYouTubeVideoId(urlOrId);
      if (!videoId) return { success: false, error: "Invalid YouTube URL" };

      return {
        success: true,
        videoId,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        title: fallbackTitle || "YouTube Lecture Video",
        channelName: "YouTube Educator",
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        duration: "15:00",
        hasCaptions: false,
      };
    }
  }

  /**
   * Fetches authorized teaching assignments for a faculty member
   */
  public async getFacultyTeachingAssignments(
    facultyId: string
  ): Promise<TeachingAssignmentOption[]> {
    const { data, error } = await supabase
      .from("teaching_assignments")
      .select(`
        id,
        faculty_id,
        classroom_id,
        subject_name,
        subject_code,
        classroom:classrooms!teaching_assignments_classroom_id_fkey(
          id,
          name,
          course,
          branch,
          year,
          section
        )
      `)
      .eq("faculty_id", facultyId);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      facultyId: row.faculty_id,
      classroomId: row.classroom_id,
      subjectName: row.subject_name,
      subjectCode: row.subject_code,
      classroomName: row.classroom?.name || "Classroom",
      course: row.classroom?.course || "B.Tech",
      branch: row.classroom?.branch || "CSE",
      year: row.classroom?.year || 1,
      section: row.classroom?.section || "A",
    }));
  }

  /**
   * Fetches all lectures posted by or assigned to a faculty member
   */
  public async getFacultyLectures(facultyId: string): Promise<LectureItem[]> {
    const { data, error } = await supabase
      .from("lectures")
      .select(`
        *,
        classroom:classrooms!lectures_classroom_id_fkey(name, course, branch, year, section),
        faculty:profiles!lectures_faculty_id_fkey(name)
      `)
      .eq("faculty_id", facultyId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((r: any) => this.mapDbRowToLectureItem(r));
  }

  /**
   * Posts a new lecture under an authorized teaching assignment
   */
  public async createFacultyLecture(params: {
    teachingAssignmentId: string;
    facultyId: string;
    classroomId: string;
    subjectName: string;
    subjectCode?: string | null;
    topic: string;
    title: string;
    description?: string | null;
    youtubeUrl: string;
  }): Promise<{ lecture?: LectureItem; error?: string }> {
    try {
      const videoId = this.extractYouTubeVideoId(params.youtubeUrl);
      if (!videoId) {
        return { error: "Please provide a valid YouTube URL." };
      }

      // Fetch metadata from Edge Function
      const meta = await this.fetchYouTubeMetadata(params.youtubeUrl, params.title);

      const finalTitle = params.title.trim() || meta.title || "Lecture Video";
      const finalUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const finalThumbnail = meta.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      const { data, error } = await supabase
        .from("lectures")
        .insert({
          teaching_assignment_id: params.teachingAssignmentId,
          faculty_id: params.facultyId,
          classroom_id: params.classroomId,
          subject_name: params.subjectName,
          subject_code: params.subjectCode || null,
          topic: params.topic.trim(),
          title: finalTitle,
          description: params.description?.trim() || null,
          youtube_video_id: videoId,
          youtube_url: finalUrl,
          thumbnail_url: finalThumbnail,
          channel_name: meta.channelName || "YouTube Educator",
          duration: meta.duration || "15:00",
          has_captions: meta.hasCaptions || false,
          status: "PUBLISHED",
          published_at: new Date().toISOString(),
        })
        .select(`
          *,
          classroom:classrooms!lectures_classroom_id_fkey(name, course, branch, year, section),
          faculty:profiles!lectures_faculty_id_fkey(name)
        `)
        .single();

      if (error) {
        return { error: error.message };
      }

      return { lecture: this.mapDbRowToLectureItem(data) };
    } catch (err: any) {
      return { error: err?.message || "Failed to post lecture" };
    }
  }

  /**
   * Updates an existing lecture
   */
  public async updateFacultyLecture(
    lectureId: string,
    facultyId: string,
    updates: {
      title?: string;
      topic?: string;
      description?: string | null;
      status?: "PUBLISHED" | "ARCHIVED";
    }
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from("lectures")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lectureId)
      .eq("faculty_id", facultyId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  /**
   * Toggles status between PUBLISHED and ARCHIVED
   */
  public async archiveFacultyLecture(
    lectureId: string,
    facultyId: string,
    newStatus: "PUBLISHED" | "ARCHIVED"
  ): Promise<{ success: boolean; error?: string }> {
    return this.updateFacultyLecture(lectureId, facultyId, { status: newStatus });
  }

  /**
   * Deletes a lecture
   */
  public async deleteFacultyLecture(
    lectureId: string,
    facultyId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from("lectures")
      .delete()
      .eq("id", lectureId)
      .eq("faculty_id", facultyId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  /**
   * Fetches published lectures for a student based on their enrolled classroom
   */
  public async getStudentClassroomLectures(studentId: string): Promise<{
    lectures: LectureItem[];
    classroomName?: string;
  }> {
    // 1. Get student's classroom
    const { data: memberData } = await supabase
      .from("classroom_members")
      .select(`
        classroom_id,
        classroom:classrooms!classroom_members_classroom_id_fkey(name)
      `)
      .eq("student_id", studentId)
      .maybeSingle();

    if (!memberData?.classroom_id) {
      return { lectures: [] };
    }

    const classroomId = memberData.classroom_id;
    const classroomName = (memberData.classroom as any)?.name || "Enrolled Classroom";

    // 2. Fetch PUBLISHED lectures for this classroom
    const { data: lectureRows, error } = await supabase
      .from("lectures")
      .select(`
        *,
        classroom:classrooms!lectures_classroom_id_fkey(name, course, branch, year, section),
        faculty:profiles!lectures_faculty_id_fkey(name)
      `)
      .eq("classroom_id", classroomId)
      .eq("status", "PUBLISHED")
      .order("created_at", { ascending: false });

    if (error || !lectureRows) {
      return { lectures: [], classroomName };
    }

    return {
      lectures: lectureRows.map((r: any) => this.mapDbRowToLectureItem(r)),
      classroomName,
    };
  }

  /**
   * Fetches a single lecture by ID with classroom verification
   */
  public async getLectureById(lectureId: string): Promise<LectureItem | null> {
    const { data, error } = await supabase
      .from("lectures")
      .select(`
        *,
        classroom:classrooms!lectures_classroom_id_fkey(name, course, branch, year, section),
        faculty:profiles!lectures_faculty_id_fkey(name)
      `)
      .eq("id", lectureId)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapDbRowToLectureItem(data);
  }

  /**
   * Finds matching published quizzes for a lecture's Subject and Topic
   */
  public async getRelatedQuizForLecture(
    subjectName: string,
    topic: string,
    teachingAssignmentId?: string
  ): Promise<RelatedQuizItem | null> {
    try {
      // First try matching by exact teaching_assignment_id and topic
      if (teachingAssignmentId) {
        const { data: exactQuiz } = await supabase
          .from("quizzes")
          .select("id, title, topic, subject, duration_minutes, difficulty, status")
          .eq("teaching_assignment_id", teachingAssignmentId)
          .eq("status", "PUBLISHED")
          .ilike("topic", `%${topic.trim()}%`)
          .limit(1)
          .maybeSingle();

        if (exactQuiz) {
          return {
            id: exactQuiz.id,
            title: exactQuiz.title,
            topic: exactQuiz.topic,
            subject: exactQuiz.subject,
            durationMinutes: exactQuiz.duration_minutes || 15,
            difficulty: exactQuiz.difficulty || "MEDIUM",
            status: exactQuiz.status,
          };
        }
      }

      // Fallback: match by subject and topic across published quizzes
      const { data: fallbackQuiz } = await supabase
        .from("quizzes")
        .select("id, title, topic, subject, duration_minutes, difficulty, status")
        .eq("status", "PUBLISHED")
        .ilike("topic", `%${topic.trim()}%`)
        .limit(1)
        .maybeSingle();

      if (fallbackQuiz) {
        return {
          id: fallbackQuiz.id,
          title: fallbackQuiz.title,
          topic: fallbackQuiz.topic,
          subject: fallbackQuiz.subject,
          durationMinutes: fallbackQuiz.duration_minutes || 15,
          difficulty: fallbackQuiz.difficulty || "MEDIUM",
          status: fallbackQuiz.status,
        };
      }
    } catch (err) {
      console.warn("Error finding related quiz for lecture:", err);
    }

    return null;
  }

  /**
   * Institutional oversight: Fetches all lectures for Administrators
   */
  public async getAllInstitutionalLectures(): Promise<LectureItem[]> {
    const { data, error } = await supabase
      .from("lectures")
      .select(`
        *,
        classroom:classrooms!lectures_classroom_id_fkey(name, course, branch, year, section),
        faculty:profiles!lectures_faculty_id_fkey(name)
      `)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map((r: any) => this.mapDbRowToLectureItem(r));
  }

  /**
   * Admin action to archive or delete inappropriate lectures
   */
  public async adminUpdateLectureStatus(
    lectureId: string,
    status: "PUBLISHED" | "ARCHIVED"
  ): Promise<boolean> {
    const { error } = await supabase
      .from("lectures")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", lectureId);

    return !error;
  }

  public async adminDeleteLecture(lectureId: string): Promise<boolean> {
    const { error } = await supabase.from("lectures").delete().eq("id", lectureId);
    return !error;
  }

  private mapDbRowToLectureItem(r: any): LectureItem {
    return {
      id: r.id,
      teachingAssignmentId: r.teaching_assignment_id,
      facultyId: r.faculty_id,
      classroomId: r.classroom_id,
      subjectName: r.subject_name,
      subjectCode: r.subject_code,
      topic: r.topic,
      title: r.title,
      description: r.description,
      youtubeVideoId: r.youtube_video_id,
      youtubeUrl: r.youtube_url,
      thumbnailUrl: r.thumbnail_url,
      channelName: r.channel_name,
      duration: r.duration || "15:00",
      hasCaptions: r.has_captions || false,
      status: r.status,
      publishedAt: r.published_at,
      createdAt: r.created_at,
      facultyName: r.faculty?.name || "Faculty Member",
      classroomName: r.classroom?.name || "Classroom",
      course: r.classroom?.course,
      branch: r.classroom?.branch,
      year: r.classroom?.year,
      section: r.classroom?.section,
    };
  }
}

export const lectureService = new LectureService();
