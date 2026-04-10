import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  parentPhone: text("parent_phone").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
});

export const speakingTests = pgTable("speaking_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  part: integer("part").notNull(),
  topic: text("topic").notNull(),
  description: text("description").notNull(),
  questions: text("questions").array().notNull(),
  tips: text("tips").array().notNull(),
  difficulty: text("difficulty").notNull(),
  duration: integer("duration").notNull(),
});

export const listeningTests = pgTable("listening_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  section: integer("section").notNull(),
  topic: text("topic").notNull(),
  description: text("description").notNull(),
  questions: jsonb("questions").notNull().$type<ListeningQuestion[]>(),
  audioUrl: text("audio_url"),
  difficulty: text("difficulty").notNull(),
  duration: integer("duration").notNull(),
});

export const readingTests = pgTable("reading_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  passage: text("passage").notNull(),
  pdfUrl: text("pdf_url"),
  topic: text("topic").notNull(),
  description: text("description").notNull(),
  questions: jsonb("questions").notNull().$type<ReadingQuestion[]>(),
  difficulty: text("difficulty").notNull(),
  duration: integer("duration").notNull(),
});

export const writingTests = pgTable("writing_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  task: integer("task").notNull(),
  topic: text("topic").notNull(),
  description: text("description").notNull(),
  prompt: text("prompt").notNull(),
  tips: text("tips").array().notNull(),
  sampleAnswer: text("sample_answer"),
  difficulty: text("difficulty").notNull(),
  duration: integer("duration").notNull(),
});

export const siteContent = pgTable("site_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const testResults = pgTable("test_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  testType: text("test_type").notNull(),
  testId: varchar("test_id").notNull(),
  score: integer("score"),
  totalQuestions: integer("total_questions"),
  answers: jsonb("answers").$type<Record<string, any>>(),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

export type ListeningQuestion = {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
};

export type ReadingQuestion = {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
};

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  parentPhone: true,
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const insertSpeakingTestSchema = createInsertSchema(speakingTests).omit({
  id: true,
});

export const insertListeningTestSchema = createInsertSchema(listeningTests).omit({
  id: true,
});

export const insertReadingTestSchema = createInsertSchema(readingTests).omit({
  id: true,
});

export const insertWritingTestSchema = createInsertSchema(writingTests).omit({
  id: true,
});

export const insertSiteContentSchema = createInsertSchema(siteContent).omit({
  id: true,
});

export const insertTestResultSchema = createInsertSchema(testResults).omit({
  id: true,
  completedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SpeakingTest = typeof speakingTests.$inferSelect;
export type InsertSpeakingTest = z.infer<typeof insertSpeakingTestSchema>;
export type ListeningTest = typeof listeningTests.$inferSelect;
export type InsertListeningTest = z.infer<typeof insertListeningTestSchema>;
export type ReadingTest = typeof readingTests.$inferSelect;
export type InsertReadingTest = z.infer<typeof insertReadingTestSchema>;
export type WritingTest = typeof writingTests.$inferSelect;
export type InsertWritingTest = z.infer<typeof insertWritingTestSchema>;
export type SiteContent = typeof siteContent.$inferSelect;
export type InsertSiteContent = z.infer<typeof insertSiteContentSchema>;
export type TestResult = typeof testResults.$inferSelect;
export type InsertTestResult = z.infer<typeof insertTestResultSchema>;
