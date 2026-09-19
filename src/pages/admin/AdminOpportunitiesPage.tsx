import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Award,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Plus,
  Edit,
  AlertTriangle,
  FileText,
  Building2,
  Calendar,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface OpportunityItem {
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
  verification_notes?: string;
  created_at: string;
  updated_at: string;
}

export default function AdminOpportunitiesPage() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("PENDING_REVIEW");
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("ALL");

  // Discovery / Refresh State
  const [discovering, setDiscovering] = useState(false);
  const [discoveryDialogOpen, setDiscoveryDialogOpen] = useState(false);
  const [customBulletinText, setCustomBulletinText] = useState("");
  const [customSourceName, setCustomSourceName] = useState("");
  const [customSourceUrl, setCustomSourceUrl] = useState("");

  // Edit / Details Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OpportunityItem | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // New Opportunity Modal State
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newForm, setNewForm] = useState<Partial<OpportunityItem>>({
    title: "",
    provider: "",
    category: "Scholarships",
    description: "",
    official_source_name: "",
    official_source_url: "",
    application_url: "",
    eligibility_text: "",
    course_level: "Undergraduate",
    eligible_courses: ["B.Tech", "BE"],
    eligible_branches: ["Computer Science"],
    eligible_years: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
    minimum_percentage: 60,
    income_limit: 800000,
    gender_criteria: "ALL",
    category_criteria: "ALL",
    disability_criteria: "NONE",
    state_criteria: "ALL_INDIA",
    award_amount: "₹50,000 per annum",
    status: "OPEN",
    verification_status: "VERIFIED",
  });

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOpportunities((data as OpportunityItem[]) || []);
    } catch (err: any) {
      console.error("Error fetching opportunities:", err);
      toast.error("Failed to load opportunities: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  // Quick Action: Verify Opportunity
  const handleVerify = async (item: OpportunityItem) => {
    try {
      const { error } = await supabase
        .from("opportunities")
        .update({
          verification_status: "VERIFIED",
          last_verified_at: new Date().toISOString(),
          verified_by: user?.id || null,
          verification_notes: `Manually verified by admin on ${new Date().toLocaleDateString()}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw error;
      toast.success(`'${item.title}' is now VERIFIED and visible to students.`);
      fetchOpportunities();
    } catch (err: any) {
      toast.error("Failed to verify opportunity: " + err.message);
    }
  };

  // Quick Action: Reject Opportunity
  const handleReject = async (item: OpportunityItem) => {
    const reason = window.prompt("Reason for rejection (e.g. invalid source, unverified criteria, duplicate):", "Ineligible source or unverified bulletin");
    if (reason === null) return;

    try {
      const { error } = await supabase
        .from("opportunities")
        .update({
          verification_status: "REJECTED",
          verification_notes: `Rejected by admin: ${reason}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw error;
      toast.info(`'${item.title}' marked as REJECTED.`);
      fetchOpportunities();
    } catch (err: any) {
      toast.error("Failed to reject opportunity: " + err.message);
    }
  };

  // Quick Action: Mark Expired
  const handleMarkExpired = async (item: OpportunityItem) => {
    try {
      const { error } = await supabase
        .from("opportunities")
        .update({
          verification_status: "EXPIRED",
          status: "CLOSED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw error;
      toast.info(`'${item.title}' marked as EXPIRED.`);
      fetchOpportunities();
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  // Run Backend Discovery Job
  const handleTriggerDiscovery = async (customNotice?: { text: string; sourceName: string; sourceUrl: string }) => {
    setDiscovering(true);
    const toastId = toast.loading("Ingesting and verifying official opportunity sources with AI...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
      const DISCOVER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/opportunity-discover`;

      const resp = await fetch(DISCOVER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(
          customNotice
            ? {
                noticeText: customNotice.text,
                sourceName: customNotice.sourceName,
                sourceUrl: customNotice.sourceUrl,
              }
            : {}
        ),
      });

      if (!resp.ok) {
        throw new Error(`Edge function returned status ${resp.status}`);
      }

      const resData = await resp.json();
      toast.dismiss(toastId);
      toast.success(`Discovered and processed ${resData.count || 0} opportunity items.`);
      setDiscoveryDialogOpen(false);
      setCustomBulletinText("");
      fetchOpportunities();
    } catch (err: any) {
      toast.dismiss(toastId);
      console.error("Discovery error:", err);
      toast.error("Discovery job failed: " + err.message);
    } finally {
      setDiscovering(false);
    }
  };

  // Save Edits
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from("opportunities")
        .update({
          title: editingItem.title,
          provider: editingItem.provider,
          category: editingItem.category,
          description: editingItem.description,
          official_source_name: editingItem.official_source_name,
          official_source_url: editingItem.official_source_url,
          application_url: editingItem.application_url,
          apply_url: editingItem.application_url,
          eligibility_text: editingItem.eligibility_text,
          award_amount: editingItem.award_amount,
          amount_or_stipend: editingItem.award_amount,
          deadline: editingItem.deadline || null,
          course_level: editingItem.course_level,
          minimum_percentage: editingItem.minimum_percentage || null,
          income_limit: editingItem.income_limit || null,
          gender_criteria: editingItem.gender_criteria || "ALL",
          verification_status: editingItem.verification_status,
          verification_notes: editingItem.verification_notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingItem.id);

      if (error) throw error;
      toast.success("Opportunity updated successfully.");
      setEditModalOpen(false);
      fetchOpportunities();
    } catch (err: any) {
      toast.error("Failed to save changes: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Create New Opportunity
  const handleCreateNew = async () => {
    if (!newForm.title || !newForm.provider) {
      toast.error("Title and Provider are required.");
      return;
    }

    try {
      const { error } = await supabase.from("opportunities").insert({
        ...newForm,
        organization: newForm.provider,
        type: newForm.category || "Scholarships",
        apply_url: newForm.application_url,
        amount_or_stipend: newForm.award_amount,
        last_verified_at: newForm.verification_status === "VERIFIED" ? new Date().toISOString() : null,
        verified_by: newForm.verification_status === "VERIFIED" ? user?.id : null,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      toast.success("Opportunity created successfully.");
      setNewModalOpen(false);
      fetchOpportunities();
    } catch (err: any) {
      toast.error("Failed to create: " + err.message);
    }
  };

  // Stats calculation
  const totalCount = opportunities.length;
  const pendingCount = opportunities.filter((o) => o.verification_status === "PENDING_REVIEW").length;
  const verifiedCount = opportunities.filter((o) => o.verification_status === "VERIFIED").length;
  const expiredCount = opportunities.filter((o) => o.verification_status === "EXPIRED").length;
  const rejectedCount = opportunities.filter((o) => o.verification_status === "REJECTED").length;

  // Filtered Opportunities
  const filtered = opportunities.filter((item) => {
    if (selectedStatusTab !== "ALL" && item.verification_status !== selectedStatusTab) {
      return false;
    }
    if (selectedCategoryTab !== "ALL" && item.category !== selectedCategoryTab) {
      return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(term);
      const matchProvider = item.provider?.toLowerCase().includes(term);
      const matchSource = item.official_source_name?.toLowerCase().includes(term);
      if (!matchTitle && !matchProvider && !matchSource) return false;
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-xs font-semibold text-rose-600 dark:text-rose-400">
                Official Verification Center
              </Badge>
              <span className="text-xs text-muted-foreground">• Source-Based Ingestion</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
              <span>Scholarships & Opportunity Verification</span>
              <ShieldCheck className="h-6 w-6 text-indigo-600" />
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Review, verify, and approve government and institutional opportunities before they appear in student feeds.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDiscoveryDialogOpen(true)}
              disabled={discovering}
              className="h-9 gap-1.5 text-xs border-indigo-200 hover:border-indigo-400 text-indigo-700 dark:text-indigo-300 font-semibold"
            >
              {discovering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span>Scan Official Bulletins</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setNewModalOpen(true)}
              className="h-9 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Opportunity</span>
            </Button>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card
            onClick={() => setSelectedStatusTab("ALL")}
            className={`cursor-pointer transition hover:border-foreground/30 ${
              selectedStatusTab === "ALL" ? "border-indigo-600 ring-1 ring-indigo-600" : ""
            }`}
          >
            <CardContent className="p-4 space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Total Ingested</span>
              <div className="text-2xl font-bold text-foreground">{totalCount}</div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setSelectedStatusTab("PENDING_REVIEW")}
            className={`cursor-pointer transition hover:border-amber-500/50 ${
              selectedStatusTab === "PENDING_REVIEW" ? "border-amber-500 ring-1 ring-amber-500" : ""
            }`}
          >
            <CardContent className="p-4 space-y-1">
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Pending Review</span>
              </span>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setSelectedStatusTab("VERIFIED")}
            className={`cursor-pointer transition hover:border-emerald-500/50 ${
              selectedStatusTab === "VERIFIED" ? "border-emerald-500 ring-1 ring-emerald-500" : ""
            }`}
          >
            <CardContent className="p-4 space-y-1">
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                <span>Active & Verified</span>
              </span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{verifiedCount}</div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setSelectedStatusTab("EXPIRED")}
            className={`cursor-pointer transition hover:border-slate-500/50 ${
              selectedStatusTab === "EXPIRED" ? "border-slate-500 ring-1 ring-slate-500" : ""
            }`}
          >
            <CardContent className="p-4 space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                <span>Expired / Rejected</span>
              </span>
              <div className="text-2xl font-bold text-muted-foreground">{expiredCount + rejectedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Tabs */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "PENDING_REVIEW", label: `Pending Review (${pendingCount})` },
                { id: "VERIFIED", label: `Verified Live (${verifiedCount})` },
                { id: "EXPIRED", label: `Expired (${expiredCount})` },
                { id: "REJECTED", label: `Rejected (${rejectedCount})` },
                { id: "ALL", label: `All (${totalCount})` },
              ].map((tab) => (
                <Button
                  key={tab.id}
                  variant={selectedStatusTab === tab.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatusTab(tab.id)}
                  className={`h-8 text-xs font-semibold ${
                    selectedStatusTab === tab.id
                      ? tab.id === "PENDING_REVIEW"
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : tab.id === "VERIFIED"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white"
                      : ""
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title, ministry, source..."
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 border-b border-border/50 pb-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Category:</span>
            {["ALL", "Scholarships", "Fellowships", "Competitions", "Internships"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategoryTab(cat)}
                className={`text-xs px-2.5 py-1 rounded-md transition font-medium ${
                  selectedCategoryTab === cat
                    ? "bg-muted text-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Opportunity Verification Table */}
        <Card className="border-border/60">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <ShieldCheck className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                <h3 className="text-base font-bold text-foreground">No opportunities in this view</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {selectedStatusTab === "PENDING_REVIEW"
                    ? "No pending opportunities awaiting review. Click 'Scan Official Bulletins' to run the discovery crawler."
                    : "No records found matching your filters."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-[320px]">Opportunity & Provider</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Official Source</TableHead>
                    <TableHead>Award & Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Verification Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const isPending = item.verification_status === "PENDING_REVIEW";
                    const isVerified = item.verification_status === "VERIFIED";

                    return (
                      <TableRow key={item.id} className="text-xs hover:bg-muted/40 transition">
                        <TableCell className="align-top py-3.5">
                          <div className="space-y-1">
                            <span className="font-bold text-foreground text-sm leading-snug line-clamp-2">
                              {item.title}
                            </span>
                            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                              <Building2 className="h-3 w-3 shrink-0" />
                              <span>{item.provider}</span>
                            </div>
                            {item.verification_notes && (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 p-1.5 rounded border border-amber-500/20 line-clamp-2">
                                {item.verification_notes}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="align-top py-3.5">
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {item.category}
                          </Badge>
                        </TableCell>

                        <TableCell className="align-top py-3.5 space-y-1">
                          <span className="font-medium text-foreground block">
                            {item.official_source_name || "Official Portal"}
                          </span>
                          {item.official_source_url && (
                            <a
                              href={item.official_source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                            >
                              <span>Official Link</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </TableCell>

                        <TableCell className="align-top py-3.5 space-y-1">
                          <span className="font-bold text-foreground block">
                            {item.award_amount || "Financial Support"}
                          </span>
                          <span className="text-muted-foreground text-[11px] flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{item.deadline ? `Due: ${item.deadline}` : "Rolling Deadline"}</span>
                          </span>
                        </TableCell>

                        <TableCell className="align-top py-3.5">
                          {isPending && (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-0 text-[10px] font-bold">
                              PENDING REVIEW
                            </Badge>
                          )}
                          {isVerified && (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-0 text-[10px] font-bold">
                              VERIFIED LIVE
                            </Badge>
                          )}
                          {item.verification_status === "EXPIRED" && (
                            <Badge variant="secondary" className="text-[10px]">
                              EXPIRED
                            </Badge>
                          )}
                          {item.verification_status === "REJECTED" && (
                            <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-0 text-[10px] font-bold">
                              REJECTED
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="align-top py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {isPending && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleVerify(item)}
                                  className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Verify & Publish</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReject(item)}
                                  className="h-7 text-[11px] text-rose-600 hover:bg-rose-50 border-rose-200"
                                >
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              </>
                            )}

                            {isVerified && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkExpired(item)}
                                className="h-7 text-[11px] text-muted-foreground hover:bg-muted"
                              >
                                Expire
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingItem(item);
                                setEditModalOpen(true);
                              }}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* DIALOG 1: SCAN / DISCOVER OFFICIAL BULLETINS */}
        <Dialog open={discoveryDialogOpen} onOpenChange={setDiscoveryDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <span>Scan Official Opportunity Sources</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Extract structured eligibility criteria from official government circulars, NSP, AICTE, and UGC notices. All newly discovered opportunities enter PENDING REVIEW.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="bg-indigo-50/50 dark:bg-indigo-950/30 p-3 rounded-xl border border-indigo-200/50 space-y-1">
                <span className="font-bold text-indigo-900 dark:text-indigo-200">Registered Official Portals:</span>
                <ul className="text-indigo-700 dark:text-indigo-300 list-disc pl-4 space-y-0.5 text-[11px]">
                  <li>National Scholarship Portal (scholarships.gov.in)</li>
                  <li>AICTE Students Development Schemes (aicte-india.org)</li>
                  <li>DRDO RAC Fellowships & Scholarships (drdo.gov.in)</li>
                  <li>UGC & NTA National Fellowships (ugcnet.nta.nic.in)</li>
                </ul>
              </div>

              <div className="space-y-2 pt-1 border-t border-border/50">
                <span className="font-bold text-foreground block">Or Ingest Custom Circular / Gazette Text:</span>
                <div className="space-y-1">
                  <Label className="text-[11px]">Source Name (e.g. State Portal / Ministry Circular)</Label>
                  <Input
                    value={customSourceName}
                    onChange={(e) => setCustomSourceName(e.target.value)}
                    placeholder="e.g. Telangana ePASS / PMRF Bulletin"
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Official Source URL</Label>
                  <Input
                    value={customSourceUrl}
                    onChange={(e) => setCustomSourceUrl(e.target.value)}
                    placeholder="https://official-portal.gov.in"
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Circular / Notice Text</Label>
                  <Textarea
                    value={customBulletinText}
                    onChange={(e) => setCustomBulletinText(e.target.value)}
                    placeholder="Paste official notification text here..."
                    rows={4}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDiscoveryDialogOpen(false)}
                disabled={discovering}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  handleTriggerDiscovery(
                    customBulletinText.trim()
                      ? {
                          text: customBulletinText.trim(),
                          sourceName: customSourceName.trim() || "Official Bulletin",
                          sourceUrl: customSourceUrl.trim() || "https://scholarships.gov.in",
                        }
                      : undefined
                  )
                }
                disabled={discovering}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {discovering ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                <span>Run Ingestion Crawler</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG 2: EDIT OPPORTUNITY */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-indigo-600" />
                <span>Edit Opportunity & Verification Status</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Refine eligibility criteria and update status for student visibility.
              </DialogDescription>
            </DialogHeader>

            {editingItem && (
              <div className="space-y-3 py-2 text-xs">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Title *</Label>
                  <Input
                    value={editingItem.title}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] font-semibold">Provider / Ministry *</Label>
                    <Input
                      value={editingItem.provider}
                      onChange={(e) => setEditingItem({ ...editingItem, provider: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Category *</Label>
                    <select
                      value={editingItem.category}
                      onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                      className="w-full h-8 rounded-md border bg-background px-2 text-xs"
                    >
                      <option value="Scholarships">Scholarships</option>
                      <option value="Fellowships">Fellowships</option>
                      <option value="Competitions">Competitions</option>
                      <option value="Internships">Internships</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Description</Label>
                  <Textarea
                    value={editingItem.description}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    rows={2}
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] font-semibold">Official Source Name</Label>
                    <Input
                      value={editingItem.official_source_name || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, official_source_name: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Official Source URL</Label>
                    <Input
                      value={editingItem.official_source_url || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, official_source_url: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] font-semibold">Application Portal URL</Label>
                    <Input
                      value={editingItem.application_url || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, application_url: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Award Amount</Label>
                    <Input
                      value={editingItem.award_amount || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, award_amount: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Eligibility Summary Text</Label>
                  <Textarea
                    value={editingItem.eligibility_text || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, eligibility_text: e.target.value })}
                    rows={2}
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[11px] font-semibold">Deadline</Label>
                    <Input
                      type="date"
                      value={editingItem.deadline || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, deadline: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Min %</Label>
                    <Input
                      type="number"
                      value={editingItem.minimum_percentage || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, minimum_percentage: Number(e.target.value) || null })}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Income Limit (INR)</Label>
                    <Input
                      type="number"
                      value={editingItem.income_limit || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, income_limit: Number(e.target.value) || null })}
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                <div className="space-y-1 pt-2 border-t border-border/50">
                  <Label className="text-[11px] font-bold text-foreground">Verification Status *</Label>
                  <select
                    value={editingItem.verification_status}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        verification_status: e.target.value as any,
                      })
                    }
                    className="w-full h-9 rounded-md border bg-background px-3 text-xs font-bold"
                  >
                    <option value="PENDING_REVIEW">PENDING_REVIEW (Hidden from students)</option>
                    <option value="VERIFIED">VERIFIED (Live in student feed)</option>
                    <option value="EXPIRED">EXPIRED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(false)}
                disabled={savingEdit}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                <span>Save Changes</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG 3: ADD NEW OPPORTUNITY */}
        <Dialog open={newModalOpen} onOpenChange={setNewModalOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-600" />
                <span>Create Official Opportunity</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Add an authoritative scholarship, fellowship, or student competition.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Title *</Label>
                <Input
                  value={newForm.title}
                  onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                  placeholder="e.g. AICTE Pragati Scholarship"
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-semibold">Provider / Ministry *</Label>
                  <Input
                    value={newForm.provider}
                    onChange={(e) => setNewForm({ ...newForm, provider: e.target.value })}
                    placeholder="e.g. Ministry of Education"
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold">Category *</Label>
                  <select
                    value={newForm.category}
                    onChange={(e) => setNewForm({ ...newForm, category: e.target.value })}
                    className="w-full h-8 rounded-md border bg-background px-2 text-xs"
                  >
                    <option value="Scholarships">Scholarships</option>
                    <option value="Fellowships">Fellowships</option>
                    <option value="Competitions">Competitions</option>
                    <option value="Internships">Internships</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Description</Label>
                <Textarea
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  placeholder="Summary of opportunity intent..."
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-semibold">Official Source Name</Label>
                  <Input
                    value={newForm.official_source_name || ""}
                    onChange={(e) => setNewForm({ ...newForm, official_source_name: e.target.value })}
                    placeholder="e.g. National Scholarship Portal"
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold">Official Source URL</Label>
                  <Input
                    value={newForm.official_source_url || ""}
                    onChange={(e) => setNewForm({ ...newForm, official_source_url: e.target.value })}
                    placeholder="https://scholarships.gov.in"
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-semibold">Application Portal URL</Label>
                  <Input
                    value={newForm.application_url || ""}
                    onChange={(e) => setNewForm({ ...newForm, application_url: e.target.value })}
                    placeholder="https://scholarships.gov.in"
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold">Award Amount</Label>
                  <Input
                    value={newForm.award_amount || ""}
                    onChange={(e) => setNewForm({ ...newForm, award_amount: e.target.value })}
                    placeholder="e.g. ₹50,000 / year"
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Eligibility Summary Text</Label>
                <Textarea
                  value={newForm.eligibility_text || ""}
                  onChange={(e) => setNewForm({ ...newForm, eligibility_text: e.target.value })}
                  placeholder="Summary of eligibility criteria..."
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-semibold">Deadline</Label>
                  <Input
                    type="date"
                    value={newForm.deadline || ""}
                    onChange={(e) => setNewForm({ ...newForm, deadline: e.target.value })}
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold">Verification Status</Label>
                  <select
                    value={newForm.verification_status}
                    onChange={(e) => setNewForm({ ...newForm, verification_status: e.target.value as any })}
                    className="w-full h-8 rounded-md border bg-background px-2 text-xs font-bold"
                  >
                    <option value="VERIFIED">VERIFIED (Live immediately)</option>
                    <option value="PENDING_REVIEW">PENDING_REVIEW (Draft)</option>
                  </select>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNewModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateNew}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Create Opportunity
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
