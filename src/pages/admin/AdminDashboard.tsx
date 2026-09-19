import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  GraduationCap,
  BookOpen,
  Building2,
  ShieldCheck,
  UserPlus,
  ArrowUpRight,
  TrendingUp,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    facultyCount: 0,
    studentCount: 0,
    classroomCount: 0,
    teachingCount: 0,
    departments: ["Computer Science & Engineering", "Information Technology", "Electronics & Comm."],
  });
  const [recentFaculty, setRecentFaculty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const [
          { count: facultyCount },
          { count: studentCount },
          { count: classroomCount },
          { count: teachingCount },
          { data: facultyList },
        ] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "faculty"),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
          supabase.from("classrooms").select("id", { count: "exact", head: true }),
          supabase.from("teaching_assignments").select("id", { count: "exact", head: true }),
          supabase
            .from("profiles")
            .select("id, name, email, faculty_id, department, designation, created_at")
            .eq("role", "faculty")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        setStats({
          facultyCount: facultyCount ?? 0,
          studentCount: studentCount ?? 0,
          classroomCount: classroomCount ?? 0,
          teachingCount: teachingCount ?? 0,
          departments: ["Computer Science & Engineering", "Information Technology", "Electronics & Comm."],
        });
        setRecentFaculty(facultyList || []);
      } catch (err) {
        console.error("Failed to load admin stats:", err);
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, []);

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Institutional Command Center</h1>
              <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-xs">
                Admin Console
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Centralized authority for faculty provisioning, student hierarchy, and institutional health.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button asChild variant="outline" size="sm" className="text-xs font-semibold gap-1.5 border-rose-200 dark:border-rose-900">
              <Link to="/admin/classrooms">
                <Building2 className="h-4 w-4 text-rose-600" />
                Manage Classrooms
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/25 text-xs font-semibold gap-1.5">
              <Link to="/admin/faculty">
                <UserPlus className="h-4 w-4" />
                Provision Faculty
              </Link>
            </Button>
          </div>
        </div>

        {/* 3 Key Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link to="/admin/faculty" className="block">
            <Card className="border shadow-sm hover:border-rose-500/30 transition-all cursor-pointer h-full">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Total Faculty</p>
                  <div className="text-2xl font-bold">{stats.facultyCount}</div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Provisioned by Admin</span>
                  </div>
                </div>
                <div className="h-11 w-11 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <Users className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/classrooms" className="block">
            <Card className="border shadow-sm hover:border-rose-500/30 transition-all cursor-pointer h-full">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Classrooms & Cohorts</p>
                  <div className="text-2xl font-bold">{stats.classroomCount}</div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                    <Building2 className="h-3 w-3" />
                    <span>Real Cohorts</span>
                  </div>
                </div>
                <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Building2 className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/teaching-assignments" className="block">
            <Card className="border shadow-sm hover:border-rose-500/30 transition-all cursor-pointer h-full">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Teaching Allocations</p>
                  <div className="text-2xl font-bold">{stats.teachingCount}</div>
                  <div className="flex items-center gap-1 text-[11px] text-indigo-600 font-medium">
                    <BookOpen className="h-3 w-3" />
                    <span>Subject-Scoped</span>
                  </div>
                </div>
                <div className="h-11 w-11 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <BookOpen className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* 2-Column Institutional Structure & Hierarchy Validation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Faculty Roster (2 cols) */}
          <Card className="lg:col-span-2 border shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Institutional Faculty Roster</CardTitle>
                <CardDescription className="text-xs">
                  Faculty members provisioned by central administration.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs">
                <Link to="/admin/faculty">
                  View All <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y text-sm">
                {recentFaculty.length > 0 ? (
                  recentFaculty.map((fac) => (
                    <div key={fac.id} className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 font-bold flex items-center justify-center text-xs">
                          {fac.name ? fac.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2) : "FC"}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{fac.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {fac.designation || "Faculty"} • {fac.department || "Computer Science"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-[11px] font-mono border-indigo-500/30 text-indigo-600">
                          {fac.faculty_id || "FAC-101"}
                        </Badge>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{fac.email}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center space-y-3">
                    <div className="h-10 w-10 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">No faculty accounts provisioned yet</p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        Provision institutional faculty accounts so instructors can create classrooms and enroll students.
                      </p>
                    </div>
                    <Button asChild size="sm" className="bg-rose-600 hover:bg-rose-700 text-white text-xs mt-2">
                      <Link to="/admin/faculty">
                        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                        Provision Faculty Account
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Strict Role Hierarchy Info Card (1 col) */}
          <Card className="border shadow-sm bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-rose-600" />
                <CardTitle className="text-base">Role Hierarchy Model</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Governing access and creation hierarchy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-rose-500/30">
                <div className="relative">
                  <div className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-rose-600 ring-4 ring-rose-600/20" />
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400">1. Administrator</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Provisions faculty accounts, manages institutional departments and system settings.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-indigo-600 ring-4 ring-indigo-600/20" />
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">2. Faculty</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Creates classrooms, publishes assignments/quizzes, and creates/imports student accounts.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-emerald-600 ring-4 ring-emerald-600/20" />
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">3. Student</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Logs in via Roll Number + initial password, forced to change password upon 1st sign-in.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/50 text-[11px] text-muted-foreground space-y-1">
                <div className="font-semibold text-rose-600 dark:text-rose-400">Security Rule Active:</div>
                <div>Public user registration for administrators and students is strictly disabled.</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
