import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { Opportunity } from "../models/Opportunity";
import { StudentSavedOpportunity } from "../models/StudentSavedOpportunity";

export async function getOpportunities(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { verifiedOnly } = req.query;
    const filter: any = {};
    if (verifiedOnly !== "false" && req.user?.role !== "administrator") {
      filter.verified = true;
    }

    const opportunities = await Opportunity.find(filter).sort({ created_at: -1 });

    let savedSet = new Set<string>();
    if (req.user) {
      const saved = await StudentSavedOpportunity.find({ student_id: req.user._id });
      savedSet = new Set(saved.map((s) => s.opportunity_id.toString()));
    }

    const enriched = opportunities.map((o) => ({
      ...o.toJSON(),
      is_saved: savedSet.has(o._id.toString()),
    }));

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch opportunities." });
  }
}

export async function createOpportunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = req.body;
    const title = data.title;
    const company = data.company || data.provider;

    if (!title || !company) {
      res.status(400).json({ error: "Title and company/provider are required." });
      return;
    }

    const opportunity = await Opportunity.create({
      ...data,
      title: title.trim(),
      company: company.trim(),
      provider: company.trim(),
      stipend: data.stipend || data.award_amount,
      award_amount: data.award_amount || data.stipend,
      type: data.type || data.category || "Scholarships",
      category: data.category || data.type || "Scholarships",
      link: data.link || data.application_url,
      application_url: data.application_url || data.link,
      verified: data.verified !== undefined ? data.verified : true,
      verification_status: data.verification_status || (data.verified ? "VERIFIED" : "PENDING_REVIEW"),
      skills: Array.isArray(data.skills) ? data.skills : [],
    });

    res.status(201).json(opportunity);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create opportunity." });
  }
}

export async function updateOpportunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updated = await Opportunity.findByIdAndUpdate(id, { ...req.body }, { new: true });
    if (!updated) {
      res.status(404).json({ error: "Opportunity not found." });
      return;
    }
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update opportunity." });
  }
}

export async function getSavedOpportunities(req: AuthRequest, res: Response): Promise<void> {
  try {
    const studentId = req.user?._id;
    const saved = await StudentSavedOpportunity.find({ student_id: studentId })
      .populate("opportunity_id")
      .sort({ updated_at: -1 });

    const formatted = saved.map((s) => ({
      ...s.toJSON(),
      opportunity: s.opportunity_id,
    }));
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch saved opportunities." });
  }
}

export async function saveOpportunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const studentId = req.user?._id;
    const { status, notes, applied_date } = req.body;

    const saved = await StudentSavedOpportunity.findOneAndUpdate(
      { student_id: studentId, opportunity_id: id },
      {
        status: status || "Interested",
        notes: notes !== undefined ? notes : undefined,
        applied_date: applied_date ? new Date(applied_date) : undefined,
        updated_at: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json(saved);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to save opportunity." });
  }
}

export async function removeSavedOpportunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const studentId = req.user?._id;
    await StudentSavedOpportunity.findOneAndDelete({
      $or: [
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : undefined },
        { opportunity_id: id.match(/^[0-9a-fA-F]{24}$/) ? id : undefined },
      ].filter(Boolean),
      student_id: studentId,
    });
    res.json({ message: "Saved opportunity removed." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to remove saved opportunity." });
  }
}

export async function toggleSaveOpportunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const studentId = req.user?._id;

    const existing = await StudentSavedOpportunity.findOne({ student_id: studentId, opportunity_id: id });
    if (existing) {
      await StudentSavedOpportunity.findByIdAndDelete(existing._id);
      res.json({ saved: false });
    } else {
      await StudentSavedOpportunity.create({ student_id: studentId, opportunity_id: id });
      res.json({ saved: true });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to toggle save opportunity." });
  }
}

export async function deleteOpportunity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await Opportunity.findByIdAndDelete(id);
    await StudentSavedOpportunity.deleteMany({ opportunity_id: id });
    res.json({ message: "Opportunity deleted." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete opportunity." });
  }
}
