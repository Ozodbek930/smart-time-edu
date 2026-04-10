import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema,
  loginSchema,
  insertSpeakingTestSchema,
  insertListeningTestSchema,
  insertReadingTestSchema,
  insertWritingTestSchema,
  insertTestResultSchema,
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
    const allowed = [".mp3", ".wav", ".ogg", ".m4a", ".pdf"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only audio (MP3/WAV/OGG/M4A) and PDF files are allowed"));
    }
  },
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
    const test = await storage.getSpeakingTest(req.params.id);
    if (!test) return res.status(404).json({ message: "Test not found" });
    res.json(test);
  });

  app.get("/api/listening-tests", async (_req, res) => {
    const tests = await storage.getListeningTests();
    res.json(tests);
  });

  app.get("/api/listening-tests/:id", async (req, res) => {
    const test = await storage.getListeningTest(req.params.id);
    if (!test) return res.status(404).json({ message: "Test not found" });
    res.json(test);
  });

  app.get("/api/reading-tests", async (_req, res) => {
    const tests = await storage.getReadingTests();
    res.json(tests);
  });

  app.get("/api/reading-tests/:id", async (req, res) => {
    const test = await storage.getReadingTest(req.params.id);
    if (!test) return res.status(404).json({ message: "Test not found" });
    res.json(test);
  });

  app.get("/api/writing-tests", async (_req, res) => {
    const tests = await storage.getWritingTests();
    res.json(tests);
  });

  app.get("/api/writing-tests/:id", async (req, res) => {
    const test = await storage.getWritingTest(req.params.id);
    if (!test) return res.status(404).json({ message: "Test not found" });
    res.json(test);
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
    const test = await storage.updateSpeakingTest(req.params.id, req.body);
    if (!test) return res.status(404).json({ message: "Test not found" });
    res.json(test);
  });

  app.delete("/api/admin/speaking-tests/:id", requireAdmin, async (req, res) => {
    const deleted = await storage.deleteSpeakingTest(req.params.id);
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
    const test = await storage.updateListeningTest(req.params.id, req.body);
    if (!test) return res.status(404).json({ message: "Test not found" });
    res.json(test);
  });

  app.delete("/api/admin/listening-tests/:id", requireAdmin, async (req, res) => {
    const deleted = await storage.deleteListeningTest(req.params.id);
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
    const test = await storage.updateReadingTest(req.params.id, req.body);
    if (!test) return res.status(404).json({ message: "Test not found" });
    res.json(test);
  });

  app.delete("/api/admin/reading-tests/:id", requireAdmin, async (req, res) => {
    const deleted = await storage.deleteReadingTest(req.params.id);
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
    const test = await storage.updateWritingTest(req.params.id, req.body);
    if (!test) return res.status(404).json({ message: "Test not found" });
    res.json(test);
  });

  app.delete("/api/admin/writing-tests/:id", requireAdmin, async (req, res) => {
    const deleted = await storage.deleteWritingTest(req.params.id);
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

  return httpServer;
}
