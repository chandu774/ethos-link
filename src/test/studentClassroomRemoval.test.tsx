import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { FacultyLayout } from "@/components/layout/FacultyLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";

const queryClient = new QueryClient();

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            {ui}
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe("Student-Side Classrooms Removal Verification", () => {
  it("verifies Student sidebar does NOT contain 'Classrooms' or link to '/student/classrooms'", () => {
    const { container, queryByText } = renderWithProviders(
      <StudentLayout>
        <div>Student Content</div>
      </StudentLayout>
    );

    // 1. Text check
    expect(queryByText("Classrooms")).toBeNull();

    // 2. Link check
    const classroomLinks = container.querySelectorAll('a[href*="/student/classrooms"]');
    expect(classroomLinks.length).toBe(0);

    // 3. Verify legitimate student nav links remain present
    expect(container.querySelector('a[href="/student/dashboard"]')).not.toBeNull();
    expect(container.querySelector('a[href="/student/learning"]')).not.toBeNull();
    expect(container.querySelector('a[href="/student/assignments"]')).not.toBeNull();
    expect(container.querySelector('a[href="/student/quizzes"]')).not.toBeNull();
    expect(container.querySelector('a[href="/student/lectures"]')).not.toBeNull();
    expect(container.querySelector('a[href="/student/ai-tutor"]')).not.toBeNull();
    expect(container.querySelector('a[href="/student/profile"]')).not.toBeNull();
  });

  it("verifies Faculty navigation STILL contains 'My Classrooms' pointing to '/faculty/classrooms'", () => {
    const { container } = renderWithProviders(
      <FacultyLayout>
        <div>Faculty Content</div>
      </FacultyLayout>
    );

    const facultyClassroomLink = container.querySelector('a[href="/faculty/classrooms"]');
    expect(facultyClassroomLink).not.toBeNull();
  });

  it("verifies Admin navigation STILL contains 'Classrooms' pointing to '/admin/classrooms'", () => {
    const { container } = renderWithProviders(
      <AdminLayout>
        <div>Admin Content</div>
      </AdminLayout>
    );

    const adminClassroomLink = container.querySelector('a[href="/admin/classrooms"]');
    expect(adminClassroomLink).not.toBeNull();
  });
});
