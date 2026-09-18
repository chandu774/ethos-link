import { useState } from "react";
import { FacultyLayout } from "@/components/layout/FacultyLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  ClipboardList,
  Calendar,
  Clock,
  Award,
  CheckCircle2,
  FileCheck2,
  Lock,
  Edit2,
  UserCheck,
} from "lucide-react";
import { useSynapse } from "@/hooks/useSynapse";
import { DEMO_FACULTY_ASSIGNMENTS } from "@/data/facultyDemoData";
import { toast } from "sonner";

export default function FacultyAssignmentsPage() {
  const synapse = useSynapse();

  const [createOpen, setCreateOpen] = useState(false);
  const [editDeadlineOpen, setEditDeadlineOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("Normalization");
  const [dueDate, setDueDate] = useState("Monday, 11:59 PM");
  const [maxMarks, setMaxMarks] = useState("20");
  const [estimatedEffort, setEstimatedEffort] = useState("30 min");
  const [classroom, setClassroom] = useState("DBMS - CSE 3A");

  // Edit deadline state
  const [newDeadline, setNewDeadline] = useState("");

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter an assignment title");
      return;
    }

    synapse.createTeacherAssignment("c1", {
      title,
      description,
      dueDate,
      maxScore: Number(maxMarks) || 20,
    });

    toast.success(`Official assignment '${title}' created and auto-synchronized to student tasks!`);
    setCreateOpen(false);
    setTitle("");
    setDescription("");
  };

  const handleUpdateDeadline = () => {
    if (!newDeadline.trim()) return;
    toast.success(`Official deadline updated to '${newDeadline}'. Student tasks synchronized automatically!`);
    setEditDeadlineOpen(false);
    setNewDeadline("");
  };

  return (
    <FacultyLayout>
      <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-xs">
                Official Coursework Studio
              </Badge>
              <span className="text-xs text-muted-foreground">• Two-Way Task Synchronization</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
              Coursework & Assignments
            </h1>
            <p className="text-sm text-muted-foreground">
              Only faculty can publish official assignments. Deadlines synchronize directly into student task managers with tamper protection.
            </p>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-2 shadow-sm shadow-indigo-600/25">
                <Plus className="h-4 w-4" />
                Create Official Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <form onSubmit={handleCreateAssignment}>
                <DialogHeader>
                  <DialogTitle>Create Official Classroom Assignment</DialogTitle>
                  <DialogDescription>
                    This will be published to the classroom and automatically populate enrolled students' Tasks with a locked deadline.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="asg-title">Assignment Title</Label>
                    <Input
                      id="asg-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. DBMS Assignment 3: Relational Decomposition"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="asg-topic">Topic / Unit</Label>
                      <Input
                        id="asg-topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. Normalization"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="asg-marks">Maximum Marks</Label>
                      <Input
                        id="asg-marks"
                        type="number"
                        value={maxMarks}
                        onChange={(e) => setMaxMarks(e.target.value)}
                        placeholder="20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="asg-due">Due Date & Time</Label>
                      <Input
                        id="asg-due"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        placeholder="Monday, 11:59 PM"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="asg-effort">Estimated Effort</Label>
                      <Input
                        id="asg-effort"
                        value={estimatedEffort}
                        onChange={(e) => setEstimatedEffort(e.target.value)}
                        placeholder="30 min"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="asg-desc">Description & Instructions</Label>
                    <Textarea
                      id="asg-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Specify deliverables, format requirements, and rubric criteria..."
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                    Publish & Sync to Student Tasks
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Assignments List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Active Classroom Assignments</h2>
            <Badge variant="outline" className="text-xs">3 Active</Badge>
          </div>

          <div className="grid gap-6">
            {DEMO_FACULTY_ASSIGNMENTS.map((asg) => (
              <Card key={asg.id} className="shadow-card border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-xs">
                          {asg.classroom}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Topic: {asg.topic}
                        </Badge>
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Lock className="h-3 w-3 text-amber-500" />
                          Locked for Students
                        </Badge>
                      </div>
                      <CardTitle className="text-lg font-bold">{asg.title}</CardTitle>
                      <CardDescription>{asg.description}</CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1"
                        onClick={() => {
                          setSelectedAssignmentId(asg.id);
                          setNewDeadline(asg.dueDate);
                          setEditDeadlineOpen(true);
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Modify Deadline
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Meta badges */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground p-3 rounded-xl bg-muted/40 border">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                      Due: {asg.dueDate}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Award className="h-3.5 w-3.5 text-amber-500" />
                      Marks: {asg.maxMarks}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                      Estimated: {asg.estimatedEffort}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Submissions: {asg.submissionsCount} / {asg.totalStudents} ({asg.gradedCount} graded)
                    </span>
                  </div>

                  {/* Submission Tracking Preview */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Recent Student Submissions</span>
                      <span className="text-[11px] font-normal text-muted-foreground">Auto-updates upon student submission</span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3 text-xs">
                      <div className="p-3 rounded-xl border bg-card/60 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-foreground">Alex Chen</div>
                          <div className="text-muted-foreground">Submitted Today 2:15 PM</div>
                        </div>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-[10px]">
                          Submitted ✓
                        </Badge>
                      </div>

                      <div className="p-3 rounded-xl border bg-card/60 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-foreground">Rahul Kumar</div>
                          <div className="text-muted-foreground">Submitted Yesterday</div>
                        </div>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-[10px]">
                          Submitted ✓
                        </Badge>
                      </div>

                      <div className="p-3 rounded-xl border bg-card/60 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-foreground">Ananya Sharma</div>
                          <div className="text-muted-foreground">Pending submission</div>
                        </div>
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 text-[10px]">
                          In Progress
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Edit Deadline Dialog */}
        <Dialog open={editDeadlineOpen} onOpenChange={setEditDeadlineOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Official Assignment Deadline</DialogTitle>
              <DialogDescription>
                Changing this deadline will automatically update the deadline in all enrolled students' Task managers in real time.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <Label htmlFor="new-deadline">New Deadline Date & Time</Label>
              <Input
                id="new-deadline"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                placeholder="e.g. Wednesday, 11:59 PM"
              />
            </div>
            <DialogFooter>
              <Button onClick={handleUpdateDeadline} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Update & Push to Student Tasks
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FacultyLayout>
  );
}
