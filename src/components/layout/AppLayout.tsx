import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { StudentLayout } from "./StudentLayout";
import { FacultyLayout } from "./FacultyLayout";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { role } = useAuth();

  if (role === "faculty") {
    return <FacultyLayout>{children}</FacultyLayout>;
  }

  return <StudentLayout>{children}</StudentLayout>;
}
