import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { AIConversation } from "../models/AIConversation";

export async function chat(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { messages, conversationId } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      res.status(503).json({
        error: "AI service is not configured. Server environment variable GEMINI_API_KEY is missing.",
      });
      return;
    }

    const systemPrompt = `You are Synapse AI, an intelligent, empathetic academic companion and AI Tutor.
Help students grasp difficult concepts with intuitive explanations, analogies, and practice questions.
Maintain context and adapt your tone to the student.`;

    const contents = (messages || [])
      .filter((m: any) => m?.role === "user" || m?.role === "assistant")
      .map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(response.status).json({ error: `Gemini API error: ${errText}` });
      return;
    }

    const data = await response.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I'm here to help!";

    // Persist conversation if user logged in
    if (req.user) {
      if (conversationId) {
        await AIConversation.findByIdAndUpdate(conversationId, {
          $push: {
            messages: [
              { role: "user", content: messages[messages.length - 1]?.content || "", timestamp: new Date().toISOString() },
              { role: "assistant", content: replyText, timestamp: new Date().toISOString() },
            ],
          },
        });
      } else {
        await AIConversation.create({
          user_id: req.user._id,
          summary: messages[0]?.content?.slice(0, 50) || "Study Session",
          messages: [
            ...messages.map((m: any) => ({ role: m.role, content: m.content, timestamp: new Date().toISOString() })),
            { role: "assistant", content: replyText, timestamp: new Date().toISOString() },
          ],
        });
      }
    }

    res.json({ reply: replyText });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to process AI chat." });
  }
}

export async function generateQuiz(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { subject, topic, concepts, difficulty, questionCount } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      res.status(503).json({
        error: "AI service is not configured. Server environment variable GEMINI_API_KEY is missing.",
      });
      return;
    }

    const count = Number(questionCount) || 5;
    const prompt = `Generate a rigorous academic quiz of exactly ${count} multiple choice questions on the subject "${subject}", topic "${topic}", covering concepts: ${Array.isArray(concepts) ? concepts.join(", ") : topic}. Difficulty: ${difficulty || "Medium"}.

Return ONLY valid JSON in this exact structure:
[
  {
    "question_text": "Question statement here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_option_index": 0,
    "explanation": "Why Option A is correct",
    "concept": "Name of concept tested"
  }
]`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(response.status).json({ error: `Gemini API error: ${errText}` });
      return;
    }

    const data = await response.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const questions = JSON.parse(text);
    res.json({ questions });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to generate quiz." });
  }
}

export async function getConversations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const conversations = await AIConversation.find({ user_id: req.user?._id }).sort({ updated_at: -1 });
    res.json(conversations);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch conversations." });
  }
}

export async function deleteConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await AIConversation.findOneAndDelete({ _id: id, user_id: req.user?._id });
    res.json({ message: "Conversation deleted." });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete conversation." });
  }
}
