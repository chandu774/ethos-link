import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, Users, MessageCircle, Shield, ArrowRight, Sparkles, NotebookTabs, ClipboardList, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function Index() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect logged-in users to role-based dashboard
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    if (role === "administrator") return <Navigate to="/admin/dashboard" replace />;
    if (role === "faculty") return <Navigate to="/faculty/dashboard" replace />;
    return <Navigate to="/student/dashboard" replace />;
  }
  return (
    <div className="min-h-screen bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.16),_transparent_32%),radial-gradient(circle_at_top_right,_hsl(var(--accent)/0.16),_transparent_28%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--background)))]"
      />
      {/* Header */}
      <header className="container mx-auto flex items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-neural">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold text-gradient-neural">Synapse</span>
        </div>
        <Link to="/login">
          <Button className="gradient-neural text-primary-foreground hover:opacity-90">
            Sign In
          </Button>
        </Link>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pb-16 pt-14 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="max-w-3xl text-center lg:text-left">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            <span>Built for class life, not generic productivity</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            Intelligent Infrastructure for{" "}
            <span className="text-gradient-neural">Academic Mastery</span>
          </h1>

          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Synapse unites students and instructors on a single intelligent platform: empowering learners with personalized AI guidance and providing faculty with proactive class-wide intervention signals.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 max-w-xl">
            {/* Student Card */}
            <div className="rounded-2xl border-2 border-primary/40 bg-card p-5 shadow-card hover:border-primary transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-foreground">STUDENT PORTAL</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">Learner</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Personalized dashboard, interactive lectures with sign language, tasks synced from instructors, and adaptive concept mastery.
                </p>
              </div>
              <div className="space-y-2 pt-2">
                <Button
                  className="w-full gradient-neural text-primary-foreground font-semibold shadow-md shadow-primary/20"
                  onClick={() => navigate("/login")}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Student Sign In
                </Button>
                <Link to="/login" className="block text-center text-xs text-muted-foreground hover:text-primary underline">
                  Sign in with Roll Number
                </Link>
              </div>
            </div>

            {/* Faculty Card */}
            <div className="rounded-2xl border-2 border-indigo-500/40 bg-card p-5 shadow-card hover:border-indigo-500 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-foreground">FACULTY PORTAL</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold">Instructor</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Classroom management, official assignments auto-synced to students, topic difficulty heatmaps, and evidence-backed support alerts.
                </p>
              </div>
              <div className="space-y-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full border-indigo-500/40 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold"
                  onClick={() => navigate("/login")}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Faculty Sign In
                </Button>
                <Link to="/login" className="block text-center text-xs text-muted-foreground hover:text-indigo-500 underline">
                  Sign in with Faculty ID
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-3 text-left sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-card">
              <p className="text-2xl font-semibold text-foreground">1 hub</p>
              <p className="mt-1 text-sm text-muted-foreground">for deadlines, group chat, and shared files</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-card">
              <p className="text-2xl font-semibold text-foreground">Less context switching</p>
              <p className="mt-1 text-sm text-muted-foreground">between class logistics and actual studying</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-card">
              <p className="text-2xl font-semibold text-foreground">Faster teamwork</p>
              <p className="mt-1 text-sm text-muted-foreground">when everyone works in the same shared space</p>
            </div>
          </div>
          </div>

          <div className="rounded-[28px] border border-border/60 bg-card/90 p-5 shadow-elevated">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Today in Synapse</p>
                  <p className="text-xs text-muted-foreground">One screen for what matters next</p>
                </div>
                <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Student flow
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { icon: MessageCircle, title: "Class chat", text: "Ask questions, coordinate study sessions, and keep group updates in one thread." },
                  { icon: NotebookTabs, title: "Shared notes", text: "Collect lecture summaries and files where your classmates can actually find them." },
                  { icon: ClipboardList, title: "Assignments", text: "Track deadlines and discussion around the same group context." },
                  { icon: Brain, title: "AI study help", text: "Get quick explanations and support without leaving your workspace." },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-2xl border border-border/50 bg-background/70 p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl gradient-neural">
                          <Icon className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Why it works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">A student stack that actually fits together</h2>
          <p className="mt-3 text-muted-foreground">
            Synapse works best when your academic workflow is connected instead of split between disconnected tools.
          </p>
        </div>
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          <div className="rounded-2xl bg-card p-8 shadow-card transition-all hover:shadow-elevated hover:-translate-y-1">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl gradient-neural">
              <Brain className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">Study AI Tools</h3>
            <p className="text-muted-foreground">
              Summarize notes, explain concepts, and get unblocked without leaving your study context.
            </p>
          </div>

          <div className="rounded-2xl bg-card p-8 shadow-card transition-all hover:shadow-elevated hover:-translate-y-1">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl gradient-trust">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">Announcements</h3>
            <p className="text-muted-foreground">
              Keep exams, assignments, and class updates visible instead of buried in scattered messages.
            </p>
          </div>

          <div className="rounded-2xl bg-card p-8 shadow-card transition-all hover:shadow-elevated hover:-translate-y-1">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl gradient-hero">
              <Users className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">Class Groups</h3>
            <p className="text-muted-foreground">
              Join or create study groups where conversations, notes, and deadlines stay connected.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-3xl rounded-3xl gradient-hero p-12 text-center text-primary-foreground shadow-glow">
          <h2 className="text-3xl font-bold">Ready for a Smarter Class Hub?</h2>
          <p className="mt-4 text-lg opacity-90">
            Join Synapse and replace fragmented student workflows with one clearer space.
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="mt-8">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto border-t px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md gradient-neural">
              <Brain className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-medium text-foreground">Synapse</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/login" className="hover:text-primary transition-colors">Institutional Login</Link>
            <span>•</span>
            <Link to="/login" className="hover:text-rose-500 transition-colors">Admin Console</Link>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 Synapse Institutional Platform.
          </p>
        </div>
      </footer>
    </div>
  );
}
