import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Award,
  Search,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShieldCheck,
  Bookmark,
  BookmarkCheck,
  Clock,
  Building2,
  FileText,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface VerifiedOpportunity {
  id: string;
  title: string;
  provider: string;
  category: string;
  description: string;
  official_source_name?: string;
  official_source_url?: string;
  application_url?: string;
  eligibility_text?: string;
  course_level?: string;
  eligible_courses?: string[];
  eligible_branches?: string[];
  eligible_years?: string[];
  minimum_percentage?: number | null;
  income_limit?: number | null;
  gender_criteria?: string;
  category_criteria?: string;
  disability_criteria?: string;
  state_criteria?: string;
  age_criteria?: string;
  opening_date?: string;
  deadline?: string;
  award_amount?: string;
  required_documents?: string[];
  status: string;
  verification_status: "VERIFIED" | "PENDING_REVIEW" | "EXPIRED" | "REJECTED";
  last_verified_at?: string;
  created_at: string;
}

export interface StudentSavedRecord {
  id: string;
  student_id: string;
  opportunity_id: string;
  status: "Interested" | "Planning to Apply" | "Documents Pending" | "Applied" | "Submitted" | "Approved" | "Rejected";
  notes?: string;
  applied_date?: string;
  created_at: string;
  updated_at: string;
  opportunity?: VerifiedOpportunity;
}

export interface MatchEvaluation {
  matchScore: number;
  reasons: string[];
  isEligible: boolean;
}

export default function OpportunitiesPage() {
  const { user, profile } = useAuth();
  const [opportunities, setOpportunities] = useState<VerifiedOpportunity[]>([]);
  const [savedRecords, setSavedRecords] = useState<StudentSavedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("recommended");
  const [search, setSearch] = useState("");

  // Details Modal State
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<VerifiedOpportunity | null>(null);

  // Tracker / Save Modal State
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [savingTargetOpp, setSavingTargetOpp] = useState<VerifiedOpportunity | null>(null);
  const [existingRecordForTarget, setExistingRecordForTarget] = useState<StudentSavedRecord | null>(null);
  const [trackerStatus, setTrackerStatus] = useState<StudentSavedRecord["status"]>("Interested");
  const [trackerNotes, setTrackerNotes] = useState("");
  const [trackerAppliedDate, setTrackerAppliedDate] = useState("");
  const [updatingTracker, setUpdatingTracker] = useState(false);

  // Fetch verified opportunities and user's saved records
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Only fetch VERIFIED opportunities (Real source-based data)
      const { data: oppData, error: oppErr } = await supabase
        .from("opportunities")
        .select("*")
        .eq("verification_status", "VERIFIED")
        .order("created_at", { ascending: false });

      if (oppErr) throw oppErr;
      const verifiedList = (oppData as VerifiedOpportunity[]) || [];
      setOpportunities(verifiedList);

      // 2. Fetch student's saved tracker records
      if (user) {
        const { data: savedData, error: savedErr } = await supabase
          .from("student_saved_opportunities")
          .select("*")
          .eq("student_id", user.id);

        if (savedErr) throw savedErr;

        const records = (savedData as any[]) || [];
        // Attach the corresponding opportunity object
        const hydrated: StudentSavedRecord[] = records.map((rec) => ({
          ...rec,
          opportunity: verifiedList.find((o) => o.id === rec.opportunity_id),
        }));
        setSavedRecords(hydrated);
      }
    } catch (err: any) {
      console.error("Error loading opportunities:", err);
      toast.error("Failed to load verified opportunities: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Deterministic Profile-Based Matching Algorithm
  const evaluateMatch = (opp: VerifiedOpportunity): MatchEvaluation => {
    const reasons: string[] = [];
    let score = 65; // Base score for accredited higher education enrollment

    const studentCourse = (profile?.course || "B.Tech").toLowerCase();
    const studentBranch = (profile?.branch || "Computer Science").toLowerCase();
    const studentYear = (profile?.year || "3rd Year").toLowerCase();

    // 1. Course criteria check
    if (opp.eligible_courses && opp.eligible_courses.length > 0) {
      const courseMatch = opp.eligible_courses.some((c) =>
        c.toLowerCase().includes(studentCourse) || studentCourse.includes(c.toLowerCase())
      );
      if (courseMatch) {
        score += 15;
        reasons.push(`Enrolled in eligible degree: ${profile?.course || "B.Tech"}`);
      } else {
        reasons.push(`Eligible for courses: ${opp.eligible_courses.join(", ")}`);
      }
    } else {
      reasons.push("Open to all registered degree programs");
      score += 10;
    }

    // 2. Branch criteria check
    if (opp.eligible_branches && opp.eligible_branches.length > 0) {
      const branchMatch = opp.eligible_branches.some(
        (b) =>
          b.toLowerCase().includes("all") ||
          b.toLowerCase().includes(studentBranch) ||
          studentBranch.includes(b.toLowerCase())
      );
      if (branchMatch) {
        score += 12;
        reasons.push(`Matches discipline: ${profile?.branch || "Computer Science"}`);
      }
    } else {
      reasons.push("Open across engineering and technology departments");
      score += 8;
    }

    // 3. Year of study check
    if (opp.eligible_years && opp.eligible_years.length > 0) {
      const yearMatch = opp.eligible_years.some(
        (y) =>
          y.toLowerCase().includes("all") ||
          y.toLowerCase().includes(studentYear) ||
          studentYear.includes(y.toLowerCase())
      );
      if (yearMatch) {
        score += 8;
        reasons.push(`Academic Year: ${profile?.year || "Current Year"} eligible`);
      }
    }

    // 4. Source authenticity guarantee
    reasons.push(`Official verification: ${opp.official_source_name || "Government Scheme"}`);

    return {
      matchScore: Math.min(score, 98),
      reasons: reasons.slice(0, 3),
      isEligible: true,
    };
  };

  // Open Tracker Modal for saving or updating
  const handleOpenTrackerModal = (opp: VerifiedOpportunity) => {
    setSavingTargetOpp(opp);
    const existing = savedRecords.find((r) => r.opportunity_id === opp.id);
    setExistingRecordForTarget(existing || null);
    if (existing) {
      setTrackerStatus(existing.status);
      setTrackerNotes(existing.notes || "");
      setTrackerAppliedDate(existing.applied_date ? existing.applied_date.split("T")[0] : "");
    } else {
      setTrackerStatus("Interested");
      setTrackerNotes("");
      setTrackerAppliedDate(new Date().toISOString().split("T")[0]);
    }
    setSaveModalOpen(true);
  };

  // Save / Update Record in student_saved_opportunities
  const handleSaveTracker = async () => {
    if (!user || !savingTargetOpp) return;
    setUpdatingTracker(true);

    try {
      if (existingRecordForTarget) {
        // Update
        const { error } = await supabase
          .from("student_saved_opportunities")
          .update({
            status: trackerStatus,
            notes: trackerNotes.trim() || null,
            applied_date: trackerAppliedDate ? new Date(trackerAppliedDate).toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingRecordForTarget.id);

        if (error) throw error;
        toast.success(`Application status updated to '${trackerStatus}'.`);
      } else {
        // Insert
        const { error } = await supabase
          .from("student_saved_opportunities")
          .insert({
            student_id: user.id,
            opportunity_id: savingTargetOpp.id,
            status: trackerStatus,
            notes: trackerNotes.trim() || null,
            applied_date: trackerAppliedDate ? new Date(trackerAppliedDate).toISOString() : null,
          });

        if (error) throw error;
        toast.success(`'${savingTargetOpp.title}' saved to your Application Tracker!`);
      }

      setSaveModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error("Failed to update application tracker: " + err.message);
    } finally {
      setUpdatingTracker(false);
    }
  };

  // Delete saved record
  const handleDeleteTracker = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from("student_saved_opportunities")
        .delete()
        .eq("id", recordId);

      if (error) throw error;
      toast.info("Opportunity removed from your saved list.");
      setSavedRecords((prev) => prev.filter((r) => r.id !== recordId));
      setSaveModalOpen(false);
    } catch (err: any) {
      toast.error("Failed to delete record: " + err.message);
    }
  };

  // Filtered & Sorted Opportunities
  const filteredOpportunities = useMemo(() => {
    return opportunities
      .filter((opp) => {
        if (activeTab === "scholarships" && opp.category !== "Scholarships") return false;
        if (activeTab === "fellowships" && opp.category !== "Fellowships") return false;
        if (activeTab === "competitions" && opp.category !== "Competitions") return false;
        if (activeTab === "internships" && opp.category !== "Internships") return false;

        if (search.trim()) {
          const term = search.toLowerCase();
          const matchTitle = opp.title.toLowerCase().includes(term);
          const matchProvider = opp.provider?.toLowerCase().includes(term);
          const matchSource = opp.official_source_name?.toLowerCase().includes(term);
          if (!matchTitle && !matchProvider && !matchSource) return false;
        }
        return true;
      })
      .map((opp) => ({
        opp,
        match: evaluateMatch(opp),
        isSaved: savedRecords.some((r) => r.opportunity_id === opp.id),
      }))
      .sort((a, b) => {
        if (activeTab === "recommended") {
          return b.match.matchScore - a.match.matchScore;
        }
        return new Date(b.opp.created_at).getTime() - new Date(a.opp.created_at).getTime();
      });
  }, [opportunities, activeTab, search, savedRecords, profile]);

  const savedOpportunityIds = useMemo(() => new Set(savedRecords.map((r) => r.opportunity_id)), [savedRecords]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                Verified Official Sources Only
              </Badge>
              <span className="text-xs text-muted-foreground">• Academic Profile Matcher</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
              <span>Scholarships & Opportunity Discovery</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Official government scholarships, UGC/AICTE fellowships, and national competitions with transparent eligibility verification.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === "tracker" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("tracker")}
              className={`h-9 gap-1.5 text-xs font-semibold ${
                activeTab === "tracker" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""
              }`}
            >
              <BookmarkCheck className="h-4 w-4" />
              <span>Application Tracker ({savedRecords.length})</span>
            </Button>
          </div>
        </div>

        {/* Transparent Matching Banner */}
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-2">
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-foreground">
                Matched against your academic profile:{" "}
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  {profile?.course || "B.Tech"} · {profile?.branch || "Computer Science"} · {profile?.year || "Current Year"}
                </span>
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Your profile appears to match the listed eligibility criteria. Always verify the official portal requirements before applying.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "recommended", label: "Recommended For You", icon: TrendingUp },
              { id: "all", label: "All Opportunities", icon: Award },
              { id: "scholarships", label: "Scholarships", icon: FileText },
              { id: "fellowships", label: "Fellowships", icon: Sparkles },
              { id: "competitions", label: "Competitions", icon: Award },
              { id: "tracker", label: `My Tracker (${savedRecords.length})`, icon: BookmarkCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "outline"}
                  size="sm"
                  className={`h-8 text-xs font-medium gap-1.5 ${
                    activeTab === tab.id ? "bg-indigo-600 hover:bg-indigo-700 text-white font-bold" : ""
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </Button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or agency..."
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
        </div>

        {/* MAIN VIEW: APPLICATION TRACKER TAB */}
        {activeTab === "tracker" ? (
          <div className="space-y-4">
            {savedRecords.length === 0 ? (
              <Card className="border-dashed border-border/80">
                <CardContent className="p-12 text-center space-y-3">
                  <Bookmark className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                  <h3 className="text-base font-bold text-foreground">Your Application Tracker is Empty</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Save opportunities to track your application deadlines, submission milestones, and required documents.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab("recommended")}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                  >
                    Browse Verified Opportunities
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {savedRecords.map((record) => {
                  const opp = record.opportunity;
                  if (!opp) return null;

                  const statusColors: Record<StudentSavedRecord["status"], string> = {
                    Interested: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
                    "Planning to Apply": "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
                    "Documents Pending": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                    Applied: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
                    Submitted: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
                    Approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                    Rejected: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
                  };

                  return (
                    <Card key={record.id} className="border-border/60 bg-card shadow-sm flex flex-col justify-between">
                      <CardContent className="p-5 space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-primary">{opp.provider}</span>
                            <Badge className={`${statusColors[record.status]} border-0 text-[10px] font-bold`}>
                              {record.status}
                            </Badge>
                          </div>
                          <h3 className="text-base font-bold text-foreground leading-snug">{opp.title}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">{opp.description}</p>
                        </div>

                        <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">{opp.award_amount}</span>
                            <span className="text-muted-foreground text-[11px] flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{opp.deadline ? `Deadline: ${opp.deadline}` : "Rolling"}</span>
                            </span>
                          </div>

                          {record.notes && (
                            <div className="pt-2 border-t border-border/40 text-[11px] text-foreground">
                              <span className="font-semibold text-muted-foreground block">Your Notes:</span>
                              <p className="italic text-muted-foreground">{record.notes}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenTrackerModal(opp)}
                            className="h-8 text-xs font-semibold"
                          >
                            Update Status
                          </Button>

                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedOpp(opp);
                                setDetailsModalOpen(true);
                              }}
                              className="h-8 text-xs text-muted-foreground"
                            >
                              Guidelines
                            </Button>
                            {opp.application_url && (
                              <a
                                href={opp.application_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                              >
                                <span>Apply</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* MAIN VIEW: OPPORTUNITY DISCOVERY FEED */
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center p-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredOpportunities.length === 0 ? (
              <Card className="border-dashed border-border/80">
                <CardContent className="p-12 text-center space-y-3">
                  <ShieldCheck className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                  <h3 className="text-base font-bold text-foreground">No Verified Opportunities Found</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    There are currently no verified opportunities matching your category or search. Only officially authenticated schemes appear in this feed.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredOpportunities.map(({ opp, match, isSaved }) => (
                  <Card
                    key={opp.id}
                    className="border-border/60 bg-card/90 shadow-sm transition hover:border-indigo-500/40 hover:shadow-md flex flex-col justify-between"
                  >
                    <CardContent className="p-5 space-y-4">
                      {/* Top Meta */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-primary">{opp.provider}</span>
                            <Badge variant="outline" className="text-[10px] font-semibold">
                              {opp.category}
                            </Badge>
                          </div>
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-0 text-[10px] font-bold">
                            {match.matchScore}% Match
                          </Badge>
                        </div>

                        <h3 className="text-base font-bold text-foreground leading-snug">{opp.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{opp.description}</p>
                      </div>

                      {/* Official Source & Financial Details */}
                      <div className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground text-sm">{opp.award_amount || "Financial Support"}</span>
                          <span className="text-muted-foreground text-[11px] flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{opp.deadline ? `Deadline: ${opp.deadline}` : "Rolling Deadline"}</span>
                          </span>
                        </div>

                        {/* "Why this matches you" checklist */}
                        <div className="pt-2 border-t border-border/40 space-y-1.5">
                          <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                            <span>Why you're seeing this:</span>
                          </span>
                          <ul className="space-y-1">
                            {match.reasons.map((reason, idx) => (
                              <li key={idx} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Bottom Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <Button
                          variant={isSaved ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => handleOpenTrackerModal(opp)}
                          className="h-8 gap-1 text-xs font-semibold"
                        >
                          {isSaved ? (
                            <>
                              <BookmarkCheck className="h-3.5 w-3.5 text-indigo-600" />
                              <span>Tracked</span>
                            </>
                          ) : (
                            <>
                              <Bookmark className="h-3.5 w-3.5" />
                              <span>Save to Tracker</span>
                            </>
                          )}
                        </Button>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedOpp(opp);
                              setDetailsModalOpen(true);
                            }}
                            className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
                          >
                            Details
                          </Button>

                          {opp.application_url && (
                            <a
                              href={opp.application_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                            >
                              <span>Official Portal</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL 1: VIEW COMPLETE OFFICIAL GUIDELINES */}
        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            {selectedOpp && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {selectedOpp.category}
                    </Badge>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-0 text-[10px] font-bold">
                      Verified Official
                    </Badge>
                  </div>
                  <DialogTitle className="text-base font-bold text-foreground leading-snug">
                    {selectedOpp.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Published by {selectedOpp.provider}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3.5 py-2 text-xs">
                  <div className="space-y-1">
                    <span className="font-bold text-foreground block">Overview:</span>
                    <p className="text-muted-foreground leading-relaxed">{selectedOpp.description}</p>
                  </div>

                  <div className="bg-muted/40 p-3 rounded-xl border border-border/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Financial Support:</span>
                      <span className="font-bold text-foreground">{selectedOpp.award_amount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Application Deadline:</span>
                      <span className="font-bold text-foreground">
                        {selectedOpp.deadline ? selectedOpp.deadline : "Rolling / Announced per circular"}
                      </span>
                    </div>
                    {selectedOpp.minimum_percentage && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Minimum Prior Percentage:</span>
                        <span className="font-bold text-foreground">{selectedOpp.minimum_percentage}%</span>
                      </div>
                    )}
                    {selectedOpp.income_limit && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Family Income Ceiling:</span>
                        <span className="font-bold text-foreground">₹{selectedOpp.income_limit.toLocaleString()} / year</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold text-foreground block">Eligibility Criteria:</span>
                    <p className="text-muted-foreground leading-relaxed bg-background p-2.5 rounded-lg border border-border/60">
                      {selectedOpp.eligibility_text || "Refer to the official scheme document for comprehensive rules."}
                    </p>
                  </div>

                  {selectedOpp.required_documents && selectedOpp.required_documents.length > 0 && (
                    <div className="space-y-1">
                      <span className="font-bold text-foreground block">Required Documents:</span>
                      <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                        {selectedOpp.required_documents.map((doc, dIdx) => (
                          <li key={dIdx}>{doc}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-1 pt-2 border-t border-border/50">
                    <span className="font-bold text-foreground block">Authoritative Portal:</span>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{selectedOpp.official_source_name || "Official Portal"}</span>
                      {selectedOpp.official_source_url && (
                        <a
                          href={selectedOpp.official_source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-semibold"
                        >
                          <span>Official Portal Notice</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDetailsModalOpen(false);
                      handleOpenTrackerModal(selectedOpp);
                    }}
                    className="gap-1 font-semibold"
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>Save to Tracker</span>
                  </Button>
                  {selectedOpp.application_url && (
                    <a
                      href={selectedOpp.application_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <span>Proceed to Official Application</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* MODAL 2: APPLICATION TRACKER SAVE & UPDATE */}
        <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookmarkCheck className="h-5 w-5 text-indigo-600" />
                <span>Track Your Application</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Manage your application status and notes for {savingTargetOpp?.title}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-2 text-xs">
              <div className="space-y-1.5">
                <Label className="font-semibold text-foreground">Application Status *</Label>
                <select
                  value={trackerStatus}
                  onChange={(e) => setTrackerStatus(e.target.value as any)}
                  className="w-full h-9 rounded-md border bg-background px-3 text-xs font-bold"
                >
                  <option value="Interested">Interested (Considering)</option>
                  <option value="Planning to Apply">Planning to Apply</option>
                  <option value="Documents Pending">Documents Pending</option>
                  <option value="Applied">Applied (In Progress)</option>
                  <option value="Submitted">Submitted to Portal</option>
                  <option value="Approved">Approved / Selected 🎉</option>
                  <option value="Rejected">Rejected / Closed</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-foreground">Application / Submission Date</Label>
                <Input
                  type="date"
                  value={trackerAppliedDate}
                  onChange={(e) => setTrackerAppliedDate(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-foreground">Personal Notes (Application ID, Reminders)</Label>
                <Textarea
                  value={trackerNotes}
                  onChange={(e) => setTrackerNotes(e.target.value)}
                  placeholder="e.g. App Ref #NSP2026-9812, need income certificate from Tehsildar..."
                  rows={3}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              {existingRecordForTarget ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTracker(existingRecordForTarget.id)}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs h-8"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Remove
                </Button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSaveModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveTracker}
                  disabled={updatingTracker}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                >
                  {updatingTracker ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  <span>Save Progress</span>
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
