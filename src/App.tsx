import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { StudentRoute } from "@/components/auth/StudentRoute";
import { FacultyRoute } from "@/components/auth/FacultyRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const CreateUsername = lazy(() => import("./pages/CreateUsername"));
const StudentLogin = lazy(() => import("./pages/student/StudentLogin"));
const StudentChangePassword = lazy(() => import("./pages/student/StudentChangePassword"));

const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminFacultyPage = lazy(() => import("./pages/admin/AdminFacultyPage"));
const AdminStudentsPage = lazy(() => import("./pages/admin/AdminStudentsPage"));
const AdminClassroomsPage = lazy(() => import("./pages/admin/AdminClassroomsPage"));
const AdminClassroomDetailPage = lazy(() => import("./pages/admin/AdminClassroomDetailPage"));
const AdminTeachingAssignmentsPage = lazy(() => import("./pages/admin/AdminTeachingAssignmentsPage"));
const AdminOpportunitiesPage = lazy(() => import("./pages/admin/AdminOpportunitiesPage"));
const AdminLecturesPage = lazy(() => import("./pages/admin/AdminLecturesPage"));

// Student Pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MyLearning = lazy(() => import("./pages/MyLearning"));
const TasksPage = lazy(() => import("./pages/TasksPage"));
const ClassroomsPage = lazy(() => import("./pages/ClassroomsPage"));
const ClassroomDetail = lazy(() => import("./pages/ClassroomDetail"));
const CoursesPage = lazy(() => import("./pages/CoursesPage"));
const Assignments = lazy(() => import("./pages/Assignments"));
const AssignmentDetail = lazy(() => import("./pages/AssignmentDetail"));
const NotesPage = lazy(() => import("./pages/NotesPage"));
const Lectures = lazy(() => import("./pages/Lectures"));
const LectureDetail = lazy(() => import("./pages/LectureDetail"));
const Assessments = lazy(() => import("./pages/Assessments"));
const QuizRunner = lazy(() => import("./pages/QuizRunner"));
const AttendanceRecovery = lazy(() => import("./pages/AttendanceRecovery"));
const ProgressPage = lazy(() => import("./pages/ProgressPage"));
const AITutorPage = lazy(() => import("./pages/AITutorPage"));
const OpportunitiesPage = lazy(() => import("./pages/OpportunitiesPage"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Chat = lazy(() => import("./pages/Chat"));
const AIChat = lazy(() => import("./pages/AIChat"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Faculty Pages
const FacultyDashboardPage = lazy(() => import("./pages/faculty/FacultyDashboardPage"));
const FacultyStudentsPage = lazy(() => import("./pages/faculty/FacultyStudentsPage"));
const FacultyStudentDetail = lazy(() => import("./pages/faculty/FacultyStudentDetail"));
const FacultyAssignmentsPage = lazy(() => import("./pages/faculty/FacultyAssignmentsPage"));
const FacultyQuizzesPage = lazy(() => import("./pages/faculty/FacultyQuizzesPage"));
const FacultyAnalyticsPage = lazy(() => import("./pages/faculty/FacultyAnalyticsPage"));
const FacultyAttendancePage = lazy(() => import("./pages/faculty/FacultyAttendancePage"));
const FacultyClassroomsPage = lazy(() => import("./pages/faculty/FacultyClassroomsPage"));
const FacultyTeachingDetailPage = lazy(() => import("./pages/faculty/FacultyTeachingDetailPage"));
const FacultyLecturesPage = lazy(() => import("./pages/faculty/FacultyLecturesPage"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

function RoleRedirect({ studentPath, facultyPath }: { studentPath: string; facultyPath: string }) {
  const { role, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (role === "administrator") return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to={role === "faculty" ? facultyPath : studentPath} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                {/* Public Entry Points */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Auth />} />
                <Route path="/auth" element={<Navigate to="/login" replace />} />
                <Route path="/student/login" element={<Navigate to="/login" replace />} />
                <Route path="/faculty/login" element={<Navigate to="/login" replace />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/staff/login" element={<Navigate to="/login" replace />} />

                <Route
                  path="/create-username"
                  element={
                    <ProtectedRoute>
                      <CreateUsername />
                    </ProtectedRoute>
                  }
                />

                {/* ======================================================== */}
                {/* STUDENT APPLICATION ROUTES (/student/*) */}
                {/* ======================================================== */}
                <Route
                  path="/student/change-password"
                  element={
                    <StudentRoute>
                      <StudentChangePassword />
                    </StudentRoute>
                  }
                />
                <Route
                  path="/student/dashboard"
                  element={
                    <StudentRoute>
                      <Dashboard />
                    </StudentRoute>
                  }
                />
                <Route
                  path="/student/classrooms"
                  element={
                    <StudentRoute>
                      <ClassroomsPage />
                    </StudentRoute>
                  }
                />
                <Route
                  path="/student/classrooms/:classroomId"
                  element={
                    <StudentRoute>
                      <ClassroomDetail />
                    </StudentRoute>
                  }
                />
                <Route
                  path="/student/learning"
                  element={
                    <StudentRoute>
                      <MyLearning />
                    </StudentRoute>
                  }
                />
                <Route
                  path="/student/tasks"
                  element={
                    <StudentRoute>
                      <TasksPage />
                    </StudentRoute>
                  }
                />
                <Route
                  path="/student/assignments"
                  element={
                    <StudentRoute>
                      <Assignments />
                    </StudentRoute>
                  }
                />
                <Route
                  path="/student/assignments/:assignmentId"
                  element={
                    <StudentRoute>
                      <Assignments />
                    </StudentRoute>
                  }
                />
                <Route
                  path="/student/lectures"
                  element={
                    <StudentRoute>
                      <Lectures />
                    </StudentRoute>
                  }
                />
                <Route
                  path="/student/lectures/:lectureId"
                  element={
                    <StudentRoute>
                      <LectureDetail />
                    </StudentRoute>
                  }
                />
                <Route
                  path="/student/quizzes"
                  element={
                    <StudentRoute>
                      <Assessments />
                    </StudentRoute>
                  }
                />
                <Route
                  path="/student/quizzes/:quizId"
                  element={
                    <StudentRoute>
                      <QuizRunner />
                    </StudentRoute>
                  }
                />
                <Route
                  path="/student/progress"
                  element={
                    <StudentRoute>
                      <ProgressPage />
                    </StudentRoute>
                  }
                />
                <Route
                  path="/student/notes"
                  element={
                    <StudentRoute>
                      <NotesPage />
                    </StudentRoute>
                  }
                />
                <Route
                  path="/student/ai-tutor"
                  element={
                    <StudentRoute>
                      <AITutorPage />
                    </StudentRoute>
                  }
                />
                <Route
                  path="/student/opportunities"
                  element={
                    <StudentRoute>
                      <OpportunitiesPage />
                    </StudentRoute>
                  }
                />
                <Route
                  path="/student/profile"
                  element={
                    <StudentRoute>
                      <Profile />
                    </StudentRoute>
                  }
                />
                <Route
                  path="/student/attendance-recovery"
                  element={
                    <StudentRoute>
                      <AttendanceRecovery />
                    </StudentRoute>
                  }
                />
                <Route
                  path="/student/chat"
                  element={
                    <StudentRoute>
                      <Chat />
                    </StudentRoute>
                  }
                />

                {/* ======================================================== */}
                {/* FACULTY APPLICATION ROUTES (/faculty/*) */}
                {/* ======================================================== */}
                <Route
                  path="/faculty/dashboard"
                  element={
                    <FacultyRoute>
                      <FacultyDashboardPage />
                    </FacultyRoute>
                  }
                />
                <Route
                  path="/faculty/teaching/:assignmentId"
                  element={
                    <FacultyRoute>
                      <FacultyTeachingDetailPage />
                    </FacultyRoute>
                  }
                />
                <Route
                  path="/faculty/classrooms"
                  element={
                    <FacultyRoute>
                      <FacultyClassroomsPage />
                    </FacultyRoute>
                  }
                />
                <Route
                  path="/faculty/classrooms/:classroomId"
                  element={
                    <FacultyRoute>
                      <ClassroomDetail />
                    </FacultyRoute>
                  }
                />
                <Route
                  path="/faculty/students"
                  element={
                    <FacultyRoute>
                      <FacultyStudentsPage />
                    </FacultyRoute>
                  }
                />
                <Route
                  path="/faculty/students/:studentId"
                  element={
                    <FacultyRoute>
                      <FacultyStudentDetail />
                    </FacultyRoute>
                  }
                />
                <Route
                  path="/faculty/assignments"
                  element={
                    <FacultyRoute>
                      <FacultyAssignmentsPage />
                    </FacultyRoute>
                  }
                />
                <Route
                  path="/faculty/quizzes"
                  element={
                    <FacultyRoute>
                      <FacultyQuizzesPage />
                    </FacultyRoute>
                  }
                />
                <Route
                  path="/faculty/lectures"
                  element={
                    <FacultyRoute>
                      <FacultyLecturesPage />
                    </FacultyRoute>
                  }
                />
                <Route
                  path="/faculty/attendance"
                  element={
                    <FacultyRoute>
                      <FacultyAttendancePage />
                    </FacultyRoute>
                  }
                />
                <Route
                  path="/faculty/analytics"
                  element={
                    <FacultyRoute>
                      <FacultyAnalyticsPage />
                    </FacultyRoute>
                  }
                />
                <Route
                  path="/faculty/ai-insights"
                  element={
                    <FacultyRoute>
                      <FacultyAnalyticsPage />
                    </FacultyRoute>
                  }
                />
                <Route
                  path="/faculty/profile"
                  element={
                    <FacultyRoute>
                      <Profile />
                    </FacultyRoute>
                  }
                />

                {/* ======================================================== */}
                {/* ADMINISTRATOR APPLICATION ROUTES (/admin/*) */}
                {/* ======================================================== */}
                <Route
                  path="/admin/dashboard"
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/faculty"
                  element={
                    <AdminRoute>
                      <AdminFacultyPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/classrooms"
                  element={
                    <AdminRoute>
                      <AdminClassroomsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/classrooms/:classroomId"
                  element={
                    <AdminRoute>
                      <AdminClassroomDetailPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/students"
                  element={<Navigate to="/admin/classrooms" replace />}
                />
                <Route
                  path="/admin/teaching-assignments"
                  element={
                    <AdminRoute>
                      <AdminTeachingAssignmentsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/opportunities"
                  element={
                    <AdminRoute>
                      <AdminOpportunitiesPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/lectures"
                  element={
                    <AdminRoute>
                      <AdminLecturesPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/departments"
                  element={
                    <AdminRoute>
                      <AdminClassroomsPage />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={<Navigate to="/admin/dashboard" replace />}
                />

                {/* ======================================================== */}
                {/* BACKWARD COMPATIBLE & ROLE-AWARE REDIRECTS */}
                {/* ======================================================== */}
                <Route
                  path="/dashboard"
                  element={<RoleRedirect studentPath="/student/dashboard" facultyPath="/faculty/dashboard" />}
                />
                <Route
                  path="/faculty"
                  element={<Navigate to="/faculty/dashboard" replace />}
                />
                <Route
                  path="/my-learning"
                  element={<RoleRedirect studentPath="/student/learning" facultyPath="/faculty/dashboard" />}
                />
                <Route
                  path="/tasks"
                  element={<RoleRedirect studentPath="/student/tasks" facultyPath="/faculty/assignments" />}
                />
                <Route
                  path="/classrooms"
                  element={<RoleRedirect studentPath="/student/classrooms" facultyPath="/faculty/classrooms" />}
                />
                <Route
                  path="/classrooms/:classroomId"
                  element={<RoleRedirect studentPath="/student/classrooms" facultyPath="/faculty/classrooms" />}
                />
                <Route
                  path="/courses"
                  element={<RoleRedirect studentPath="/student/classrooms" facultyPath="/faculty/classrooms" />}
                />
                <Route
                  path="/assignments"
                  element={<RoleRedirect studentPath="/student/assignments" facultyPath="/faculty/assignments" />}
                />
                <Route
                  path="/assignments/:assignmentId"
                  element={<RoleRedirect studentPath="/student/assignments" facultyPath="/faculty/assignments" />}
                />
                <Route
                  path="/notes"
                  element={<RoleRedirect studentPath="/student/notes" facultyPath="/faculty/dashboard" />}
                />
                <Route
                  path="/lectures"
                  element={<RoleRedirect studentPath="/student/lectures" facultyPath="/faculty/lectures" />}
                />
                <Route
                  path="/lectures/:lectureId"
                  element={<RoleRedirect studentPath="/student/lectures" facultyPath="/faculty/lectures" />}
                />
                <Route
                  path="/assessments"
                  element={<RoleRedirect studentPath="/student/quizzes" facultyPath="/faculty/quizzes" />}
                />
                <Route
                  path="/assessments/:quizId"
                  element={<RoleRedirect studentPath="/student/quizzes" facultyPath="/faculty/quizzes" />}
                />
                <Route
                  path="/attendance-recovery"
                  element={<RoleRedirect studentPath="/student/attendance-recovery" facultyPath="/faculty/attendance" />}
                />
                <Route
                  path="/attendance/recovery"
                  element={<RoleRedirect studentPath="/student/attendance-recovery" facultyPath="/faculty/attendance" />}
                />
                <Route
                  path="/progress"
                  element={<RoleRedirect studentPath="/student/progress" facultyPath="/faculty/analytics" />}
                />
                <Route
                  path="/ai-tutor"
                  element={<RoleRedirect studentPath="/student/ai-tutor" facultyPath="/faculty/ai-insights" />}
                />
                <Route
                  path="/opportunities"
                  element={<RoleRedirect studentPath="/student/opportunities" facultyPath="/faculty/dashboard" />}
                />
                <Route
                  path="/profile"
                  element={<RoleRedirect studentPath="/student/profile" facultyPath="/faculty/profile" />}
                />
                <Route
                  path="/profile/:id"
                  element={<RoleRedirect studentPath="/student/profile" facultyPath="/faculty/profile" />}
                />
                <Route
                  path="/chat"
                  element={<RoleRedirect studentPath="/student/chat" facultyPath="/faculty/dashboard" />}
                />
                <Route
                  path="/notifications"
                  element={<RoleRedirect studentPath="/student/dashboard" facultyPath="/faculty/dashboard" />}
                />
                <Route
                  path="/ai-chat"
                  element={<RoleRedirect studentPath="/student/ai-tutor" facultyPath="/faculty/ai-insights" />}
                />
                <Route
                  path="/connections"
                  element={<RoleRedirect studentPath="/student/chat" facultyPath="/faculty/dashboard" />}
                />
                <Route
                  path="/groups"
                  element={<RoleRedirect studentPath="/student/dashboard" facultyPath="/faculty/dashboard" />}
                />
                <Route
                  path="/groups/:groupId"
                  element={<RoleRedirect studentPath="/student/dashboard" facultyPath="/faculty/dashboard" />}
                />

                {/* 404 Catch-All */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
