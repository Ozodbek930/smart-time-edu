import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { sendRegistrationEmail } from "./email";
import { evaluateWriting } from "./gemini";
import {
  insertUserSchema,
  loginSchema,
  insertSpeakingTestSchema,
  insertListeningTestSchema,
  insertReadingTestSchema,
  insertWritingTestSchema,
  insertTestResultSchema,
  insertVideoLessonSchema,
  insertOnlineLessonSchema,
  insertOnlineLessonQuestionSchema,
  insertOnlineLessonResultSchema,
} from "@shared/schema";
import session from "express-session";
import MemoryStore from "memorystore";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const fileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: fileStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".mp3", ".wav", ".ogg", ".m4a", ".webm", ".mp4", ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext) || file.mimetype.startsWith("audio/") || file.mimetype.startsWith("video/webm") || file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio, image, and PDF files are allowed"));
    }
  },
});

const uploadAny = multer({
  storage: fileStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const MemStore = MemoryStore(session);

  app.use("/uploads", express.static(uploadsDir));

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "smart-time-education-secret",
      resave: false,
      saveUninitialized: false,
      store: new MemStore({ checkPeriod: 86400000 }),
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax",
      },
    })
  );

  app.post("/api/auth/register", async (req, res) => {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const existing = await storage.getUserByUsername(parsed.data.username);
    if (existing) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const user = await storage.createUser(parsed.data);
    const { password, ...safeUser } = user;

    if (user.email) {
      sendRegistrationEmail(user.email, user.fullName).catch((err) => {
        console.error("Failed to send registration email:", err.message);
      });
    }

    res.status(201).json(safeUser);
  });

  app.post("/api/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input" });
    }

    const user = await storage.getUserByUsername(parsed.data.username);
    if (!user || user.password !== parsed.data.password) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    req.session.userId = user.id;
    const { password, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const { password, ...safeUser } = user;
    res.json(safeUser);
  });

  app.get("/api/speaking-tests", async (_req, res) => {
    const tests = await storage.getSpeakingTests();
    res.json(tests);
  });

  app.get("/api/speaking-tests/:id", async (req, res) => {
    const test = await storage.getSpeakingTest(String(req.params.id));
    if (!test) return res.status(404).json({ message: "Test not found" });
    res.json(test);
  });

  app.get("/api/listening-tests", async (_req, res) => {
    const tests = await storage.getListeningTests();
    res.json(tests);
  });

  app.get("/api/listening-tests/:id", async (req, res) => {
    const test = await storage.getListeningTest(String(req.params.id));
    if (!test) return res.status(404).json({ message: "Test not found" });
    res.json(test);
  });

  app.get("/api/reading-tests", async (_req, res) => {
    const tests = await storage.getReadingTests();
    res.json(tests);
  });

  app.get("/api/reading-tests/:id", async (req, res) => {
    const test = await storage.getReadingTest(String(req.params.id));
    if (!test) return res.status(404).json({ message: "Test not found" });
    res.json(test);
  });

  app.get("/api/writing-tests", async (_req, res) => {
    const tests = await storage.getWritingTests();
    res.json(tests);
  });

  app.get("/api/writing-tests/:id", async (req, res) => {
    const test = await storage.getWritingTest(String(req.params.id));
    if (!test) return res.status(404).json({ message: "Test not found" });
    res.json(test);
  });

  app.post("/api/writing/evaluate", requireAuth, async (req, res) => {
    const { task, prompt, essay } = req.body;
    if (!essay || essay.trim().length < 50) {
      return res.status(400).json({ message: "Essay is too short to evaluate" });
    }
    try {
      const feedback = await evaluateWriting(Number(task) || 2, prompt || "", essay);
      res.json(feedback);
    } catch (err: any) {
      console.error("Gemini writing evaluation error:", err.message);
      res.status(500).json({ message: "AI evaluation failed. Please try again." });
    }
  });

  app.get("/api/site-content", async (_req, res) => {
    const content = await storage.getSiteContent();
    res.json(content);
  });

  app.post("/api/test-results", requireAuth, async (req, res) => {
    const data = { ...req.body, userId: req.session.userId };
    const parsed = insertTestResultSchema.safeParse(data);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input" });
    }
    const result = await storage.createTestResult(parsed.data);
    res.status(201).json(result);
  });

  app.get("/api/test-results/my", requireAuth, async (req, res) => {
    const results = await storage.getTestResultsByUser(req.session.userId!);
    res.json(results);
  });

  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    const allUsers = await storage.getAllUsers();
    const safeUsers = allUsers.map(({ password, ...u }) => u);
    res.json(safeUsers);
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const id = String(req.params.id);
    const target = await storage.getUser(id);
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.isAdmin) return res.status(403).json({ message: "Cannot delete admin accounts" });
    const deleted = await storage.deleteUser(id);
    if (!deleted) return res.status(500).json({ message: "Failed to delete user" });
    res.json({ message: "User deleted" });
  });

  app.get("/api/fullmock-results/:fullmockId", requireAuth, async (req, res) => {
    const fullmockId = String(req.params.fullmockId);
    const results = await storage.getTestResultsByFullmock(fullmockId, req.session.userId!);
    res.json(results);
  });

  app.get("/api/admin/test-results", requireAdmin, async (_req, res) => {
    const results = await storage.getTestResults();
    res.json(results);
  });

  app.get("/api/admin/site-content", requireAdmin, async (_req, res) => {
    const content = await storage.getSiteContent();
    res.json(content);
  });

  app.put("/api/admin/site-content", requireAdmin, async (req, res) => {
    const { key, value } = req.body;
    if (!key || typeof value !== "string") {
      return res.status(400).json({ message: "Key and value required" });
    }
    const item = await storage.upsertSiteContent({ key, value });
    res.json(item);
  });

  app.post("/api/admin/speaking-tests", requireAdmin, async (req, res) => {
    const parsed = insertSpeakingTestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
    const test = await storage.createSpeakingTest(parsed.data);
    res.status(201).json(test);
  });

  app.put("/api/admin/speaking-tests/:id", requireAdmin, async (req, res) => {
    const test = await storage.updateSpeakingTest(String(req.params.id), req.body);
    if (!test) return res.status(404).json({ message: "Test not found" });
    res.json(test);
  });

  app.delete("/api/admin/speaking-tests/:id", requireAdmin, async (req, res) => {
    const deleted = await storage.deleteSpeakingTest(String(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Test not found" });
    res.json({ message: "Deleted" });
  });

  app.post("/api/admin/listening-tests", requireAdmin, async (req, res) => {
    const parsed = insertListeningTestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
    const test = await storage.createListeningTest(parsed.data);
    res.status(201).json(test);
  });

  app.put("/api/admin/listening-tests/:id", requireAdmin, async (req, res) => {
    const test = await storage.updateListeningTest(String(req.params.id), req.body);
    if (!test) return res.status(404).json({ message: "Test not found" });
    res.json(test);
  });

  app.delete("/api/admin/listening-tests/:id", requireAdmin, async (req, res) => {
    const deleted = await storage.deleteListeningTest(String(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Test not found" });
    res.json({ message: "Deleted" });
  });

  app.post("/api/admin/reading-tests", requireAdmin, async (req, res) => {
    const parsed = insertReadingTestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
    const test = await storage.createReadingTest(parsed.data);
    res.status(201).json(test);
  });

  app.put("/api/admin/reading-tests/:id", requireAdmin, async (req, res) => {
    const test = await storage.updateReadingTest(String(req.params.id), req.body);
    if (!test) return res.status(404).json({ message: "Test not found" });
    res.json(test);
  });

  app.delete("/api/admin/reading-tests/:id", requireAdmin, async (req, res) => {
    const deleted = await storage.deleteReadingTest(String(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Test not found" });
    res.json({ message: "Deleted" });
  });

  app.post("/api/admin/writing-tests", requireAdmin, async (req, res) => {
    const parsed = insertWritingTestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
    const test = await storage.createWritingTest(parsed.data);
    res.status(201).json(test);
  });

  app.put("/api/admin/writing-tests/:id", requireAdmin, async (req, res) => {
    const test = await storage.updateWritingTest(String(req.params.id), req.body);
    if (!test) return res.status(404).json({ message: "Test not found" });
    res.json(test);
  });

  app.delete("/api/admin/writing-tests/:id", requireAdmin, async (req, res) => {
    const deleted = await storage.deleteWritingTest(String(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Test not found" });
    res.json({ message: "Deleted" });
  });

  app.post("/api/admin/upload", requireAdmin, upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, filename: req.file.originalname });
  });

  app.post("/api/speaking/upload", requireAuth, upload.single("recording"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  app.get("/api/fullmock-tests", async (req, res) => {
    const tests = await storage.getFullMockTests();
    res.json(tests);
  });

  app.get("/api/fullmock-tests/:id", async (req, res) => {
    const test = await storage.getFullMockTest(req.params.id);
    if (!test) return res.status(404).json({ message: "Not found" });
    res.json(test);
  });

  app.post("/api/admin/fullmock-tests", requireAdmin, async (req, res) => {
    const { title, description, sections, totalDuration } = req.body;
    if (!title) return res.status(400).json({ message: "Title required" });
    const test = await storage.createFullMockTest({ title, description: description || "", sections: sections || [], totalDuration: totalDuration || 0 });
    res.status(201).json(test);
  });

  app.put("/api/admin/fullmock-tests/:id", requireAdmin, async (req, res) => {
    const { title, description, sections, totalDuration } = req.body;
    const updated = await storage.updateFullMockTest(req.params.id, { title, description, sections, totalDuration });
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete("/api/admin/fullmock-tests/:id", requireAdmin, async (req, res) => {
    const deleted = await storage.deleteFullMockTest(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  });

  app.get("/api/notes", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const userNotes = await storage.getNotesByUser(userId);
    res.json(userNotes);
  });

  app.post("/api/notes", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const { content } = req.body;
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ message: "Content is required" });
    }
    const note = await storage.createNote(userId, content.trim());
    res.status(201).json(note);
  });

  app.delete("/api/notes/:id", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const deleted = await storage.deleteNote(req.params.id, userId);
    if (!deleted) return res.status(404).json({ message: "Note not found" });
    res.json({ message: "Deleted" });
  });

  app.get("/api/video-lessons", async (_req, res) => {
    const lessons = await storage.getActiveVideoLessons();
    res.json(lessons);
  });

  app.get("/api/admin/video-lessons", requireAdmin, async (_req, res) => {
    const lessons = await storage.getVideoLessons();
    res.json(lessons);
  });

  app.post("/api/admin/video-lessons", requireAdmin, async (req, res) => {
    const parsed = insertVideoLessonSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const lesson = await storage.createVideoLesson(parsed.data);
    res.status(201).json(lesson);
  });

  app.patch("/api/admin/video-lessons/:id/toggle", requireAdmin, async (req, res) => {
    const { isActive } = req.body;
    const updated = await storage.toggleVideoLesson(req.params.id, !!isActive);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete("/api/admin/video-lessons/:id", requireAdmin, async (req, res) => {
    const deleted = await storage.deleteVideoLesson(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  });

  // Online Lessons - public
  app.get("/api/online-lessons", async (_req, res) => {
    const lessons = await storage.getActiveOnlineLessons();
    res.json(lessons);
  });

  app.get("/api/online-lessons/:id", async (req, res) => {
    const lesson = await storage.getOnlineLesson(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Not found" });
    const questions = await storage.getOnlineLessonQuestions(req.params.id);
    const questionsForStudent = questions.map(({ correctAnswer: _ca, ...q }) => q);
    res.json({ ...lesson, questions: questionsForStudent });
  });

  app.post("/api/online-lessons/:id/submit", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const lesson = await storage.getOnlineLesson(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Not found" });

    const questions = await storage.getOnlineLessonQuestions(req.params.id);
    const { answers, timedOut } = req.body as { answers: Record<string, string>; timedOut?: boolean };

    let score = 0;
    for (const q of questions) {
      if (q.type === "mcq" && q.correctAnswer !== null && q.correctAnswer !== undefined) {
        if (answers[q.id] === q.correctAnswer) score++;
      }
    }

    const result = await storage.createOnlineLessonResult({
      lessonId: req.params.id,
      userId,
      answers,
      score,
      totalQuestions: questions.length,
      timedOut: timedOut ?? false,
    });

    res.status(201).json(result);
  });

  // Online Lessons - admin
  app.get("/api/admin/online-lessons", requireAdmin, async (_req, res) => {
    const lessons = await storage.getOnlineLessons();
    res.json(lessons);
  });

  app.post("/api/admin/online-lessons", requireAdmin, async (req, res) => {
    const parsed = insertOnlineLessonSchema.safeParse({
      ...req.body,
      deadline: req.body.deadline ? new Date(req.body.deadline) : undefined,
    });
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const lesson = await storage.createOnlineLesson(parsed.data);
    res.status(201).json(lesson);
  });

  app.patch("/api/admin/online-lessons/:id", requireAdmin, async (req, res) => {
    const data = { ...req.body };
    if (data.deadline) data.deadline = new Date(data.deadline);
    const updated = await storage.updateOnlineLesson(req.params.id, data);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete("/api/admin/online-lessons/:id", requireAdmin, async (req, res) => {
    const deleted = await storage.deleteOnlineLesson(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  });

  app.get("/api/admin/online-lessons/:id/questions", requireAdmin, async (req, res) => {
    const questions = await storage.getOnlineLessonQuestions(req.params.id);
    res.json(questions);
  });

  app.post("/api/admin/online-lessons/:id/questions", requireAdmin, async (req, res) => {
    const questions = await storage.getOnlineLessonQuestions(req.params.id);
    const parsed = insertOnlineLessonQuestionSchema.safeParse({
      ...req.body,
      lessonId: req.params.id,
      orderIndex: questions.length,
    });
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const q = await storage.createOnlineLessonQuestion(parsed.data);
    res.status(201).json(q);
  });

  app.delete("/api/admin/online-lesson-questions/:id", requireAdmin, async (req, res) => {
    const deleted = await storage.deleteOnlineLessonQuestion(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  });

  app.get("/api/admin/online-lessons/:id/results", requireAdmin, async (req, res) => {
    const results = await storage.getOnlineLessonResults(req.params.id);
    const usersData = await storage.getAllUsers();
    const usersMap = Object.fromEntries(usersData.map((u) => [u.id, u]));
    const enriched = results.map((r) => ({ ...r, user: usersMap[r.userId] ?? null }));
    res.json(enriched);
  });

  app.post("/api/admin/online-lessons/:id/upload-material", requireAdmin, uploadAny.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const lesson = await storage.getOnlineLesson(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Not found" });
    const fileUrl = `/uploads/${req.file.filename}`;
    const attachment = { type: "file" as const, name: req.file.originalname, url: fileUrl };
    const current = (lesson.attachments as any[]) ?? [];
    const updated = await storage.updateOnlineLesson(req.params.id, { attachments: [...current, attachment] });
    res.json(updated);
  });

  app.post("/api/admin/online-lessons/:id/add-link", requireAdmin, async (req, res) => {
    const { name, url } = req.body;
    if (!name || !url) return res.status(400).json({ message: "Name and URL required" });
    const lesson = await storage.getOnlineLesson(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Not found" });
    const attachment = { type: "link" as const, name, url };
    const current = (lesson.attachments as any[]) ?? [];
    const updated = await storage.updateOnlineLesson(req.params.id, { attachments: [...current, attachment] });
    res.json(updated);
  });

  app.delete("/api/admin/online-lessons/:id/attachments/:index", requireAdmin, async (req, res) => {
    const lesson = await storage.getOnlineLesson(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Not found" });
    const idx = parseInt(req.params.index);
    const current = (lesson.attachments as any[]) ?? [];
    const updated = await storage.updateOnlineLesson(req.params.id, {
      attachments: current.filter((_, i) => i !== idx),
    });
    res.json(updated);
  });

  return httpServer;
}
