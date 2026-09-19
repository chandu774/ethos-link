import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../components/theme-provider';

import Index from '../pages/Index';
import Dashboard from '../pages/Dashboard';
import MyLearning from '../pages/MyLearning';
import TasksPage from '../pages/TasksPage';
import CoursesPage from '../pages/CoursesPage';
import Lectures from '../pages/Lectures';
import LectureDetail from '../pages/LectureDetail';
import Assessments from '../pages/Assessments';
import QuizRunner from '../pages/QuizRunner';
import AttendanceRecovery from '../pages/AttendanceRecovery';
import ProgressPage from '../pages/ProgressPage';
import AITutorPage from '../pages/AITutorPage';
import FacultyDashboard from '../pages/FacultyDashboard';
import OpportunitiesPage from '../pages/OpportunitiesPage';
import Profile from '../pages/Profile';
import Chat from '../pages/Chat';
import ClassroomsPage from '../pages/ClassroomsPage';
import ClassroomDetail from '../pages/ClassroomDetail';

// New Student & Faculty specific pages
import StudentProfile from '../pages/student/StudentProfile';
import FacultyDashboardPage from '../pages/faculty/FacultyDashboardPage';
import FacultyStudentsPage from '../pages/faculty/FacultyStudentsPage';
import FacultyStudentDetail from '@/pages/faculty/FacultyStudentDetail';
import FacultyAssignmentsPage from '@/pages/faculty/FacultyAssignmentsPage';
import FacultyQuizzesPage from '@/pages/faculty/FacultyQuizzesPage';
import FacultyAnalyticsPage from '@/pages/faculty/FacultyAnalyticsPage';
import FacultyClassroomsPage from '@/pages/faculty/FacultyClassroomsPage';
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminFacultyPage from '@/pages/admin/AdminFacultyPage';
import AdminStudentsPage from '@/pages/admin/AdminStudentsPage';
import Auth from '@/pages/Auth';
import StudentLogin from '@/pages/student/StudentLogin';
import StudentChangePassword from '@/pages/student/StudentChangePassword';
import Assignments from '@/pages/Assignments';

const queryClient = new QueryClient();

function renderPage(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="*" element={ui} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('All Pages Mounting Verification', () => {
  it('Index mounts cleanly', () => {
    expect(renderPage(<Index />).container).toBeDefined();
  });
  it('Dashboard mounts cleanly', () => {
    expect(renderPage(<Dashboard />).container).toBeDefined();
  });
  it('MyLearning mounts cleanly', () => {
    expect(renderPage(<MyLearning />).container).toBeDefined();
  });
  it('TasksPage mounts cleanly', () => {
    expect(renderPage(<TasksPage />).container).toBeDefined();
  });
  it('CoursesPage mounts cleanly', () => {
    expect(renderPage(<CoursesPage />).container).toBeDefined();
  });
  it('Lectures mounts cleanly', () => {
    expect(renderPage(<Lectures />).container).toBeDefined();
  });
  it('LectureDetail mounts cleanly', () => {
    expect(renderPage(<LectureDetail />).container).toBeDefined();
  });
  it('Assessments mounts cleanly', () => {
    expect(renderPage(<Assessments />).container).toBeDefined();
  });
  it('QuizRunner mounts cleanly', () => {
    expect(renderPage(<QuizRunner />).container).toBeDefined();
  });
  it('AttendanceRecovery mounts cleanly', () => {
    expect(renderPage(<AttendanceRecovery />).container).toBeDefined();
  });
  it('ProgressPage mounts cleanly', () => {
    expect(renderPage(<ProgressPage />).container).toBeDefined();
  });
  it('AITutorPage mounts cleanly', () => {
    expect(renderPage(<AITutorPage />).container).toBeDefined();
  });
  it('FacultyDashboard mounts cleanly', () => {
    expect(renderPage(<FacultyDashboard />).container).toBeDefined();
  });
  it('OpportunitiesPage mounts cleanly', () => {
    expect(renderPage(<OpportunitiesPage />).container).toBeDefined();
  });
  it('Profile mounts cleanly', () => {
    expect(renderPage(<Profile />).container).toBeDefined();
  });
  it('Chat mounts cleanly', () => {
    expect(renderPage(<Chat />).container).toBeDefined();
  });
  it('ClassroomsPage mounts cleanly', () => {
    expect(renderPage(<ClassroomsPage />).container).toBeDefined();
  });
  it('ClassroomDetail mounts cleanly', () => {
    expect(renderPage(<ClassroomDetail />).container).toBeDefined();
  });
  it('StudentProfile mounts cleanly', () => {
    expect(renderPage(<StudentProfile />).container).toBeDefined();
  });
  it('FacultyDashboardPage mounts cleanly', () => {
    expect(renderPage(<FacultyDashboardPage />).container).toBeDefined();
  });
  it('FacultyStudentsPage mounts cleanly', () => {
    expect(renderPage(<FacultyStudentsPage />).container).toBeDefined();
  });
  it('FacultyStudentDetail mounts cleanly', () => {
    expect(renderPage(<FacultyStudentDetail />).container).toBeDefined();
  });
  it('FacultyAssignmentsPage mounts cleanly', () => {
    expect(renderPage(<FacultyAssignmentsPage />).container).toBeDefined();
  });
  it('FacultyQuizzesPage mounts cleanly', () => {
    expect(renderPage(<FacultyQuizzesPage />).container).toBeDefined();
  });
  it('FacultyAnalyticsPage mounts cleanly', () => {
    expect(renderPage(<FacultyAnalyticsPage />).container).toBeDefined();
  });
  it('FacultyClassroomsPage mounts cleanly', () => {
    expect(renderPage(<FacultyClassroomsPage />).container).toBeDefined();
  });
  it('AdminLogin mounts cleanly', () => {
    expect(renderPage(<AdminLogin />).container).toBeDefined();
  });
  it('AdminDashboard mounts cleanly', () => {
    expect(renderPage(<AdminDashboard />).container).toBeDefined();
  });
  it('AdminFacultyPage mounts cleanly', () => {
    expect(renderPage(<AdminFacultyPage />).container).toBeDefined();
  });
  it('AdminStudentsPage mounts cleanly', () => {
    expect(renderPage(<AdminStudentsPage />).container).toBeDefined();
  });
  it('Auth unified login page mounts cleanly', () => {
    expect(renderPage(<Auth />).container).toBeDefined();
  });
  it('StudentLogin mounts cleanly', () => {
    expect(renderPage(<StudentLogin />).container).toBeDefined();
  });
  it('StudentChangePassword mounts cleanly', () => {
    expect(renderPage(<StudentChangePassword />).container).toBeDefined();
  });
  it('Assignments mounts cleanly', () => {
    expect(renderPage(<Assignments />).container).toBeDefined();
  });
});
