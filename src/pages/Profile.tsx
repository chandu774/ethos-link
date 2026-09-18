import StudentProfile from "./student/StudentProfile";
import { useAuth } from "@/contexts/AuthContext";
import { FacultyLayout } from "@/components/layout/FacultyLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Mail, ShieldCheck, BookOpen } from "lucide-react";

export default function Profile() {
  const { role, profile } = useAuth();

  if (role === "faculty") {
    return (
      <FacultyLayout>
        <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl border bg-card shadow-card flex flex-col sm:flex-row sm:items-center gap-5">
            <Avatar className="h-20 w-20 border-2 border-indigo-500/30 shadow-md">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-indigo-600/10 text-indigo-600 text-2xl font-bold">
                AT
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">{profile?.name || "Dr. Aris Thorne"}</h1>
                <Badge className="bg-indigo-600 text-white text-xs">Verified Faculty</Badge>
              </div>
              <p className="text-sm font-medium text-foreground/80 flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-indigo-600" />
                Associate Professor • Department of Computer Science & Engineering
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {profile?.email || "dr.thorne@synapse.edu"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" />
                  Lead Instructor: DBMS (CS301)
                </span>
              </div>
            </div>
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base font-bold">Faculty Credentials & Assigned Cohorts</CardTitle>
              <CardDescription>Academic appointment and teaching allocations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1">
                  <div className="text-xs text-muted-foreground">Designation</div>
                  <div className="font-semibold text-foreground">Associate Professor of Computer Science</div>
                </div>
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1">
                  <div className="text-xs text-muted-foreground">Primary Subject Area</div>
                  <div className="font-semibold text-foreground">Database Management Systems & Systems Architecture</div>
                </div>
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1">
                  <div className="text-xs text-muted-foreground">Active Cohort 1</div>
                  <div className="font-semibold text-foreground">CS301: DBMS - CSE 3A (62 Students)</div>
                </div>
                <div className="p-3.5 rounded-xl border bg-card/40 space-y-1">
                  <div className="text-xs text-muted-foreground">Active Cohort 2</div>
                  <div className="font-semibold text-foreground">CS302: OS - CSE 3A (58 Students)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </FacultyLayout>
    );
  }

  return <StudentProfile />;
}
