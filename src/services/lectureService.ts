import api from "@/lib/apiClient";

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
   * Calls backend YouTube controller to fetch public YouTube video metadata safely
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

      const res = await api.post<any>("/youtube/metadata", {
        youtube_url: urlOrId,
        video_id: videoId,
        fallback_title: fallbackTitle,
      });

      if (!res || !res.success) {
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
        videoId: res.videoId || videoId,
        videoUrl: res.videoUrl || `https://www.youtube.com/watch?v=${videoId}`,
        title: res.title || fallbackTitle || "YouTube Lecture Video",
        channelName: res.channelName || "YouTube Educator",
        thumbnailUrl: res.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        duration: res.duration || "15:00",
        hasCaptions: res.hasCaptions || false,
        publishedAt: res.publishedAt,
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
    _facultyId?: string
  ): Promise<TeachingAssignmentOption[]> {
    try {
      const data = await api.get<any[]>("/classrooms/faculty/assigned");
      if (!data || !Array.isArray(data)) return [];

      return data.map((row: any) => ({
        id: row.id || row._id,
        facultyId: row.faculty_id?._id || row.faculty_id || "",
        classroomId: row.classroom_id?._id || row.classroom_id?.id || row.classroom_id || "",
        subjectName: row.subject_name || "General Subject",
        subjectCode: row.subject_code || "GEN101",
        classroomName: row.classroom_id?.name || row.classroom?.name || "Classroom",
        course: row.classroom_id?.course || row.classroom?.course || "B.Tech",
        branch: row.classroom_id?.branch || row.classroom?.branch || "CSE",
        year: Number(row.classroom_id?.year || row.classroom?.year || 1),
        section: row.classroom_id?.section || row.classroom?.section || "A",
      }));
    } catch (err) {
      console.error("Error fetching teaching assignments:", err);
      return [];
    }
  }

  /**
   * Fetches all lectures posted by or assigned to a faculty member
   */
  public async getFacultyLectures(facultyId?: string): Promise<LectureItem[]> {
    try {
      const data = await api.get<any[]>("/lectures", {
        headers: facultyId ? {} : undefined,
      });
      if (!data || !Array.isArray(data)) return [];
      return data.map((r: any) => this.mapDbRowToLectureItem(r));
    } catch (err) {
      console.error("Error fetching faculty lectures:", err);
      return [];
    }
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

      // Fetch metadata from backend
      const meta = await this.fetchYouTubeMetadata(params.youtubeUrl, params.title);

      const finalTitle = params.title.trim() || meta.title || "Lecture Video";
      const finalUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const finalThumbnail = meta.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      const data = await api.post<any>("/lectures", {
        teaching_assignment_id: params.teachingAssignmentId,
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
        topics: [params.topic.trim()],
        concepts_taught: [params.topic.trim()],
      });

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
    _facultyId: string,
    updates: {
      title?: string;
      topic?: string;
      description?: string | null;
      status?: "PUBLISHED" | "ARCHIVED";
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const body: any = { ...updates };
      if (updates.status) {
        body.is_archived = updates.status === "ARCHIVED";
      }
      if (updates.topic) {
        body.topics = [updates.topic];
      }
      await api.patch(`/lectures/${lectureId}`, body);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to update lecture" };
    }
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
    _facultyId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await api.delete(`/lectures/${lectureId}`);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to delete lecture" };
    }
  }

  /**
   * Fetches published lectures for a student based on their enrolled classroom
   */
  public async getStudentClassroomLectures(_studentId?: string): Promise<{
    lectures: LectureItem[];
    classroomName?: string;
  }> {
    try {
      const data = await api.get<any[]>("/lectures");
      if (!data || !Array.isArray(data)) {
        return { lectures: [] };
      }

      const classroomName = data[0]?.classroom_id?.name || "Enrolled Classroom";
      return {
        lectures: data.map((r: any) => this.mapDbRowToLectureItem(r)),
        classroomName,
      };
    } catch (err) {
      console.error("Error fetching student lectures:", err);
      return { lectures: [] };
    }
  }

  /**
   * Fetches a single lecture by ID with classroom verification
   */
  public async getLectureById(lectureId: string): Promise<LectureItem | null> {
    try {
      const data = await api.get<any>(`/lectures/${lectureId}`);
      if (!data) return null;
      return this.mapDbRowToLectureItem(data);
    } catch (err) {
      console.error("Error fetching lecture by id:", err);
      return null;
    }
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
      const params = new URLSearchParams();
      if (subjectName) params.append("subject", subjectName);
      if (topic) params.append("topic", topic);
      if (teachingAssignmentId) params.append("teachingAssignmentId", teachingAssignmentId);

      const quizzes = await api.get<any[]>(`/quizzes?${params.toString()}`);
      if (quizzes && quizzes.length > 0) {
        const q = quizzes[0];
        return {
          id: q.id || q._id,
          title: q.title,
          topic: q.topic || "",
          subject: q.subject || null,
          durationMinutes: q.duration_minutes || 15,
          difficulty: q.difficulty || "MEDIUM",
          status: q.status || "PUBLISHED",
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
    try {
      const data = await api.get<any[]>("/lectures?includeArchived=true");
      if (!data || !Array.isArray(data)) return [];
      return data.map((r: any) => this.mapDbRowToLectureItem(r));
    } catch (err) {
      console.error("Error fetching institutional lectures:", err);
      return [];
    }
  }

  /**
   * Admin action to archive or delete inappropriate lectures
   */
  public async adminUpdateLectureStatus(
    lectureId: string,
    status: "PUBLISHED" | "ARCHIVED"
  ): Promise<boolean> {
    try {
      await api.patch(`/lectures/${lectureId}`, {
        is_archived: status === "ARCHIVED",
      });
      return true;
    } catch {
      return false;
    }
  }

  public async adminDeleteLecture(lectureId: string): Promise<boolean> {
    try {
      await api.delete(`/lectures/${lectureId}`);
      return true;
    } catch {
      return false;
    }
  }

  private mapDbRowToLectureItem(r: any): LectureItem {
    const isArchived = Boolean(r.is_archived || r.status === "ARCHIVED");
    const cl = r.classroom_id || r.classroom;
    const ta = r.teaching_assignment_id;
    const fac = r.faculty_id || r.faculty;

    return {
      id: r.id || r._id,
      teachingAssignmentId: ta?._id || ta?.id || r.teaching_assignment_id || "",
      facultyId: fac?._id || fac?.id || r.faculty_id || "",
      classroomId: cl?._id || cl?.id || r.classroom_id || "",
      subjectName: ta?.subject_name || r.subject_name || "General Subject",
      subjectCode: ta?.subject_code || r.subject_code || null,
      topic: Array.isArray(r.topics) && r.topics.length > 0 ? r.topics[0] : (r.topic || "Core Topic"),
      title: r.title || "Lecture Video",
      description: r.description || null,
      youtubeVideoId: r.youtube_video_id || "",
      youtubeUrl: r.youtube_url || "",
      thumbnailUrl: r.thumbnail_url || `https://img.youtube.com/vi/${r.youtube_video_id}/hqdefault.jpg`,
      channelName: r.channel_name || "YouTube Educator",
      duration: r.duration || "15:00",
      hasCaptions: Boolean(r.has_captions),
      status: isArchived ? "ARCHIVED" : "PUBLISHED",
      publishedAt: r.published_at || r.created_at || new Date().toISOString(),
      createdAt: r.created_at || new Date().toISOString(),
      facultyName: fac?.full_name || fac?.name || "Faculty Member",
      classroomName: cl?.name || "Classroom",
      course: cl?.course,
      branch: cl?.branch,
      year: cl?.year ? Number(cl.year) : undefined,
      section: cl?.section,
    };
  }
}

export const lectureService = new LectureService();
