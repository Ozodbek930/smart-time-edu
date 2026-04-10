import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

export interface WritingFeedback {
  overallBand: number;
  criteria: {
    taskAchievement: { band: number; feedback: string };
    coherenceCohesion: { band: number; feedback: string };
    lexicalResource: { band: number; feedback: string };
    grammaticalRange: { band: number; feedback: string };
  };
  strengths: string[];
  improvements: string[];
  summary: string;
}

export async function evaluateWriting(
  task: number,
  prompt: string,
  essay: string
): Promise<WritingFeedback> {
  const taskName = task === 1 ? "Task 1 (Report/Letter)" : "Task 2 (Essay)";
  const minWords = task === 1 ? 150 : 250;
  const criteria =
    task === 1
      ? "Task Achievement"
      : "Task Response";

  const systemPrompt = `You are an expert IELTS examiner. Evaluate the student's IELTS Writing ${taskName} response using the official IELTS 9-band scoring system.

IELTS Writing ${taskName} Task:
${prompt}

Student's Essay:
${essay}

Evaluate using the 4 official IELTS criteria. Each criterion is scored from 0-9 (can use 0.5 increments: 5, 5.5, 6, 6.5, etc.):
1. ${criteria} (TA/TR): Does the student fully address all parts of the task? (minimum ${minWords} words)
2. Coherence and Cohesion (CC): Is the essay logically organized with good paragraphing and linking?
3. Lexical Resource (LR): Is the vocabulary range wide, accurate, and appropriate?
4. Grammatical Range and Accuracy (GRA): Is there a wide range of grammatical structures used accurately?

The Overall Band Score = average of the 4 criteria, rounded to nearest 0.5.

Respond ONLY with a valid JSON object in this exact format:
{
  "overallBand": 6.5,
  "criteria": {
    "taskAchievement": {
      "band": 6.5,
      "feedback": "Specific feedback about task achievement in 2-3 sentences."
    },
    "coherenceCohesion": {
      "band": 7.0,
      "feedback": "Specific feedback about coherence and cohesion in 2-3 sentences."
    },
    "lexicalResource": {
      "band": 6.0,
      "feedback": "Specific feedback about vocabulary in 2-3 sentences."
    },
    "grammaticalRange": {
      "band": 6.5,
      "feedback": "Specific feedback about grammar in 2-3 sentences."
    }
  },
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "summary": "Overall summary of the essay in 2-3 sentences."
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: systemPrompt,
    config: { maxOutputTokens: 8192 },
  });

  const text = response.text || "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI response");
  }

  return JSON.parse(jsonMatch[0]) as WritingFeedback;
}
