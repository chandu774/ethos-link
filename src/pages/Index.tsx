import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, Users, MessageCircle, Shield, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function Index() {
  const { user, loading } = useAuth();

  // Redirect logged-in users to dashboard
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="container mx-auto flex items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-neural">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold text-gradient-neural">Synapse</span>
        </div>
        <Link to="/auth">
          <Button className="gradient-neural text-primary-foreground hover:opacity-90">
            Get Started
          </Button>
        </Link>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            <span>Built for College Life</span>
          </div>

          <h1 className="text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
            College Communication,{" "}
            <span className="text-gradient-neural">Simplified</span>
          </h1>

          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Synapse keeps your classes organized with group chat, announcements, and deadlines.
            Stay on top of notes, updates, and study conversations in one place.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/auth">
              <Button size="lg" className="gradient-neural text-primary-foreground hover:opacity-90">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          <div className="rounded-2xl bg-card p-8 shadow-card transition-all hover:shadow-elevated hover:-translate-y-1">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl gradient-neural">
              <Brain className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">Study AI Tools</h3>
            <p className="text-muted-foreground">
              Summarize notes, explain concepts, and generate quick answers right inside your groups.
            </p>
          </div>

          <div className="rounded-2xl bg-card p-8 shadow-card transition-all hover:shadow-elevated hover:-translate-y-1">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl gradient-trust">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">Announcements</h3>
            <p className="text-muted-foreground">
              Keep exams, assignments, and class updates pinned and easy to find.
            </p>
          </div>

          <div className="rounded-2xl bg-card p-8 shadow-card transition-all hover:shadow-elevated hover:-translate-y-1">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl gradient-hero">
              <Users className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">Class Groups</h3>
            <p className="text-muted-foreground">
              Join or create class groups to share notes, ask questions, and chat in real time.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-3xl rounded-3xl gradient-hero p-12 text-center text-primary-foreground shadow-glow">
          <h2 className="text-3xl font-bold">Ready for a Smarter Class Hub?</h2>
          <p className="mt-4 text-lg opacity-90">
            Join Synapse and manage your classes with less clutter.
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
          <p className="text-sm text-muted-foreground">
            (c) 2024 Synapse. Built for students.
          </p>
        </div>
      </footer>
    </div>
  );
}
