import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [school, setSchool] = useState("");
  const [department, setDepartment] = useState("");
  const [major, setMajor] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [bio, setBio] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!school.trim() || !major.trim() || !gradYear.trim()) {
      toast.error("Please add your school, major, and grad year.");
      return;
    }

    setIsSubmitting(true);
    try {
      const collegeSummary = `School: ${school.trim()} | Department: ${department.trim() || "N/A"} | Major: ${major.trim()} | Grad Year: ${gradYear.trim()}`;
      const nextBio = bio.trim() || profile?.bio?.trim() || collegeSummary;

      const { error } = await supabase
        .from("profiles")
        .update({
          bio: nextBio,
          onboarding_completed: true,
        })
        .eq("id", user!.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Your student profile is ready!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving onboarding:", error);
      toast.error("Failed to save your profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-neural shadow-glow">
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Set Up Your Student Profile</h1>
          <p className="mt-2 text-muted-foreground">
            Add your class details so Synapse can organize your groups and updates.
          </p>
        </div>

        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle className="text-xl">College Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="school">School</Label>
              <Input
                id="school"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="e.g., State University"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g., Engineering"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="major">Major</Label>
              <Input
                id="major"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="e.g., Computer Science"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grad-year">Graduation Year</Label>
              <Input
                id="grad-year"
                value={gradYear}
                onChange={(e) => setGradYear(e.target.value)}
                placeholder="e.g., 2026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio (optional)</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share what you are working on this semester..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gradient-neural text-primary-foreground"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
