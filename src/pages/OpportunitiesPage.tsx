import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Award,
  Search,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Sparkles,
  HelpCircle,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import { DEMO_OPPORTUNITIES, DemoOpportunity } from "@/data/demoData";
import { toast } from "sonner";

export default function OpportunitiesPage() {
  const [activeType, setActiveType] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = DEMO_OPPORTUNITIES.filter((opp) => {
    if (activeType !== "all" && opp.type !== activeType) return false;
    if (
      search &&
      !opp.title.toLowerCase().includes(search.toLowerCase()) &&
      !opp.organization.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                Career & Fellowship Matching
              </Badge>
              <span className="text-xs text-muted-foreground">• Academic Profile Matcher</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Opportunities & Scholarships
            </h1>
            <p className="text-sm text-muted-foreground">
              Curated scholarships, research programs, and student fellowships matched to your academic performance and major.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            {[
              { id: "all", label: "All Opportunities" },
              { id: "scholarship", label: "Scholarships" },
              { id: "fellowship", label: "Fellowships" },
              { id: "mentorship", label: "Mentorships" },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeType === tab.id ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs capitalize"
                onClick={() => setActiveType(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search opportunities..."
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
        </div>

        {/* Opportunities List */}
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((opp) => (
            <Card
              key={opp.id}
              className="border-border/60 bg-card/80 shadow-sm transition hover:border-primary/40 hover:shadow-md flex flex-col justify-between"
            >
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-primary">{opp.organization}</span>
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 text-[10px] font-bold">
                      {opp.matchScore}% Match
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-foreground leading-snug">{opp.title}</h3>
                  <p className="text-xs text-muted-foreground">{opp.description}</p>
                </div>

                <div className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">{opp.award}</span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Deadline: {opp.deadline}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-border/40 space-y-1">
                    <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary" />
                      <span>Why this matches you:</span>
                    </span>
                    <ul className="space-y-1 pl-1">
                      {opp.whyMatch.map((reason, idx) => (
                        <li key={idx} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap gap-1">
                    {opp.tags.map((tag, tIdx) => (
                      <Badge key={tIdx} variant="secondary" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <Button
                    size="sm"
                    className="h-8 gap-1 text-xs bg-primary text-primary-foreground font-medium"
                    onClick={() => {
                      toast.success(`Application portal for '${opp.title}' opened!`);
                    }}
                  >
                    <span>Apply Now</span>
                    <ExternalLink className="h-3 w-3" />
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

