import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Calendar,
  Users,
  Video,
  FileText,
  ArrowRight,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { DEMO_COURSES } from "@/data/demoData";
import { cn } from "@/lib/utils";

export default function CoursesPage() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                Enrolled Curriculum
              </Badge>
              <span className="text-xs text-muted-foreground">• Fall Semester 2026</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Active Courses
            </h1>
            <p className="text-sm text-muted-foreground">
              Direct access to course lectures, concept progress, and assignments.
            </p>
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {DEMO_COURSES.map((course) => (
            <Card
              key={course.id}
              className="border-border/60 bg-card/80 shadow-sm transition hover:border-primary/40 hover:shadow-md"
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary text-primary-foreground font-bold text-[10px]">
                        {course.code}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{course.semester}</span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{course.name}</h3>
                    <p className="text-xs text-muted-foreground">{course.instructor} • {course.department}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/40">
                  <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                    <span className="text-[11px] text-muted-foreground">Course Mastery</span>
                    <p className="text-base font-bold text-foreground">{course.overallMastery}%</p>
                    <Progress value={course.overallMastery} className="mt-1.5 h-1.5" />
                  </div>

                  <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                    <span className="text-[11px] text-muted-foreground">Attendance</span>
                    <p className="text-base font-bold text-foreground">{course.attendanceRate}%</p>
                    <Progress
                      value={course.attendanceRate}
                      className={cn("mt-1.5 h-1.5", course.attendanceRate < 80 && "[&>div]:bg-amber-500")}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Video className="h-3.5 w-3.5 text-primary" /> {course.totalLectures} Lectures
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" /> {course.pendingAssignments} Due
                    </span>
                  </div>

                  <Button
                    size="sm"
                    className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground font-medium"
                    onClick={() => {
                      if (course.code === "CS301") navigate("/lectures/lec-dbms-norm");
                      else navigate("/my-learning");
                    }}
                  >
                    <span>View Lectures</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

