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
  email: text("email").notNull().default(""),
  isAdmin: boolean("is_admin").notNull().default(false),
});

export type SpeakingQuestionImage = { url?: string; caption?: string } | null;

export const speakingTests = pgTable("speaking_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  part: integer("part").notNull(),
  topic: text("topic").notNull(),
  description: text("description").notNull(),
  questions: text("questions").array().notNull(),
  questionImages: jsonb("question_images").$type<SpeakingQuestionImage[]>().default([]),
  imageUrl: text("image_url"),
  pdfUrl: text("pdf_url"),
  tips: text("tips").array().notNull(),
  difficulty: text("difficulty").notNull(),
  duration: integer("duration").notNull(),
  warmupDuration: integer("warmup_duration").default(60),
  prepDuration: integer("prep_duration").default(60),
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
  mode: text("mode").notNull().default("test"),
  testSections: jsonb("test_sections").$type<ListeningTestSection[]>().default([]),
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
  mode: text("mode").notNull().default("test"),
  testSections: jsonb("test_sections").$type<ReadingTestSection[]>().default([]),
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
  pdfUrl: text("pdf_url"),
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

export const notes = pgTable("notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const videoLessons = pgTable("video_lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  message: text("message").notNull(),
  link: text("link").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type LessonAttachment = { type: "file" | "link"; name: string; url: string };

export const onlineLessons = pgTable("online_lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  deadline: timestamp("deadline").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  isActive: boolean("is_active").notNull().default(true),
  attachments: jsonb("attachments").$type<LessonAttachment[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const onlineLessonQuestions = pgTable("online_lesson_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").notNull(),
  questionText: text("question_text").notNull(),
  type: text("type").notNull().default("mcq"),
  options: text("options").array(),
  correctAnswer: text("correct_answer"),
  orderIndex: integer("order_index").notNull().default(0),
});

export const onlineLessonResults = pgTable("online_lesson_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").notNull(),
  userId: varchar("user_id").notNull(),
  answers: jsonb("answers").$type<Record<string, string>>(),
  score: integer("score"),
  totalQuestions: integer("total_questions"),
  timedOut: boolean("timed_out").notNull().default(false),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});

export type ListeningTestSection = {
  sectionNumber: number;
  audioUrl?: string | null;
  mapUrl?: string | null;
  mapCaption?: string;
  questions: ListeningQuestion[];
};

export type ReadingTestSection = {
  sectionNumber: number;
  passage: string;
  pdfUrl?: string | null;
  questions: ReadingQuestion[];
};

export type FullMockSection = { type: "speaking" | "listening" | "reading" | "writing"; testId: string; sectionIndex?: number };

export const fullMockTests = pgTable("full_mock_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  sections: jsonb("sections").$type<FullMockSection[]>().notNull().default([]),
  totalDuration: integer("total_duration").notNull().default(0),
});

export type ListeningQuestion = {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number | string;
  type?: "mcq" | "tfng" | "ynng" | "completion" | "short-answer" | "matching";
  imageUrl?: string | null;
  imageCaption?: string;
};

export type ReadingQuestion = {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number | string;
  type?: "mcq" | "tfng" | "ynng" | "completion" | "short-answer" | "matching";
};

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  parentPhone: true,
  email: true,
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

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  userId: true,
  createdAt: true,
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
export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;

export const insertFullMockTestSchema = createInsertSchema(fullMockTests).omit({ id: true });
export type FullMockTest = typeof fullMockTests.$inferSelect;
export type InsertFullMockTest = z.infer<typeof insertFullMockTestSchema>;

export const insertVideoLessonSchema = createInsertSchema(videoLessons).omit({ id: true, createdAt: true });
export type VideoLesson = typeof videoLessons.$inferSelect;
export type InsertVideoLesson = z.infer<typeof insertVideoLessonSchema>;

export const insertOnlineLessonSchema = createInsertSchema(onlineLessons).omit({ id: true, createdAt: true });
export type OnlineLesson = typeof onlineLessons.$inferSelect;
export type InsertOnlineLesson = z.infer<typeof insertOnlineLessonSchema>;

export const insertOnlineLessonQuestionSchema = createInsertSchema(onlineLessonQuestions).omit({ id: true });
export type OnlineLessonQuestion = typeof onlineLessonQuestions.$inferSelect;
export type InsertOnlineLessonQuestion = z.infer<typeof insertOnlineLessonQuestionSchema>;

export const insertOnlineLessonResultSchema = createInsertSchema(onlineLessonResults).omit({ id: true, submittedAt: true });
export type OnlineLessonResult = typeof onlineLessonResults.$inferSelect;
export type InsertOnlineLessonResult = z.infer<typeof insertOnlineLessonResultSchema>;
