import { eq, and } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  speakingTests,
  listeningTests,
  readingTests,
  writingTests,
  siteContent,
  testResults,
  notes,
  fullMockTests,
  videoLessons,
  onlineLessons,
  onlineLessonQuestions,
  onlineLessonResults,
  type User,
  type InsertUser,
  type SpeakingTest,
  type InsertSpeakingTest,
  type ListeningTest,
  type InsertListeningTest,
  type ReadingTest,
  type InsertReadingTest,
  type WritingTest,
  type InsertWritingTest,
  type SiteContent,
  type InsertSiteContent,
  type TestResult,
  type InsertTestResult,
  type Note,
  type FullMockTest,
  type InsertFullMockTest,
  type VideoLesson,
  type InsertVideoLesson,
  type OnlineLesson,
  type InsertOnlineLesson,
  type OnlineLessonQuestion,
  type InsertOnlineLessonQuestion,
  type OnlineLessonResult,
  type InsertOnlineLessonResult,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<boolean>;

  getSpeakingTests(): Promise<SpeakingTest[]>;
  getSpeakingTest(id: string): Promise<SpeakingTest | undefined>;
  createSpeakingTest(test: InsertSpeakingTest): Promise<SpeakingTest>;
  updateSpeakingTest(id: string, test: Partial<InsertSpeakingTest>): Promise<SpeakingTest | undefined>;
  deleteSpeakingTest(id: string): Promise<boolean>;

  getListeningTests(): Promise<ListeningTest[]>;
  getListeningTest(id: string): Promise<ListeningTest | undefined>;
  createListeningTest(test: InsertListeningTest): Promise<ListeningTest>;
  updateListeningTest(id: string, test: Partial<InsertListeningTest>): Promise<ListeningTest | undefined>;
  deleteListeningTest(id: string): Promise<boolean>;

  getReadingTests(): Promise<ReadingTest[]>;
  getReadingTest(id: string): Promise<ReadingTest | undefined>;
  createReadingTest(test: InsertReadingTest): Promise<ReadingTest>;
  updateReadingTest(id: string, test: Partial<InsertReadingTest>): Promise<ReadingTest | undefined>;
  deleteReadingTest(id: string): Promise<boolean>;

  getWritingTests(): Promise<WritingTest[]>;
  getWritingTest(id: string): Promise<WritingTest | undefined>;
  createWritingTest(test: InsertWritingTest): Promise<WritingTest>;
  updateWritingTest(id: string, test: Partial<InsertWritingTest>): Promise<WritingTest | undefined>;
  deleteWritingTest(id: string): Promise<boolean>;

  getSiteContent(): Promise<SiteContent[]>;
  getSiteContentByKey(key: string): Promise<SiteContent | undefined>;
  upsertSiteContent(item: InsertSiteContent): Promise<SiteContent>;

  getTestResults(): Promise<TestResult[]>;
  getTestResultsByUser(userId: string): Promise<TestResult[]>;
  getTestResultsByFullmock(fullmockId: string, userId: string): Promise<TestResult[]>;
  createTestResult(result: InsertTestResult): Promise<TestResult>;
  deleteTestResult(id: string): Promise<void>;

  getVideoLessons(): Promise<VideoLesson[]>;
  getActiveVideoLessons(): Promise<VideoLesson[]>;
  createVideoLesson(lesson: InsertVideoLesson): Promise<VideoLesson>;
  deleteVideoLesson(id: string): Promise<boolean>;
  toggleVideoLesson(id: string, isActive: boolean): Promise<VideoLesson | undefined>;

  getOnlineLessons(): Promise<OnlineLesson[]>;
  getActiveOnlineLessons(): Promise<OnlineLesson[]>;
  getOnlineLesson(id: string): Promise<OnlineLesson | undefined>;
  createOnlineLesson(lesson: InsertOnlineLesson): Promise<OnlineLesson>;
  updateOnlineLesson(id: string, data: Partial<InsertOnlineLesson>): Promise<OnlineLesson | undefined>;
  deleteOnlineLesson(id: string): Promise<boolean>;

  getOnlineLessonQuestions(lessonId: string): Promise<OnlineLessonQuestion[]>;
  createOnlineLessonQuestion(q: InsertOnlineLessonQuestion): Promise<OnlineLessonQuestion>;
  deleteOnlineLessonQuestion(id: string): Promise<boolean>;
  reorderOnlineLessonQuestion(id: string, orderIndex: number): Promise<OnlineLessonQuestion | undefined>;

  getOnlineLessonResults(lessonId: string): Promise<OnlineLessonResult[]>;
  getOnlineLessonResultByUser(lessonId: string, userId: string): Promise<OnlineLessonResult | undefined>;
  createOnlineLessonResult(result: InsertOnlineLessonResult): Promise<OnlineLessonResult>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getSpeakingTests(): Promise<SpeakingTest[]> {
    return db.select().from(speakingTests);
  }

  async getSpeakingTest(id: string): Promise<SpeakingTest | undefined> {
    const [test] = await db.select().from(speakingTests).where(eq(speakingTests.id, id));
    return test;
  }

  async createSpeakingTest(test: InsertSpeakingTest): Promise<SpeakingTest> {
    const [created] = await db.insert(speakingTests).values(test).returning();
    return created;
  }

  async updateSpeakingTest(id: string, test: Partial<InsertSpeakingTest>): Promise<SpeakingTest | undefined> {
    const [updated] = await db.update(speakingTests).set(test).where(eq(speakingTests.id, id)).returning();
    return updated;
  }

  async deleteSpeakingTest(id: string): Promise<boolean> {
    const result = await db.delete(speakingTests).where(eq(speakingTests.id, id)).returning();
    return result.length > 0;
  }

  async getListeningTests(): Promise<ListeningTest[]> {
    return db.select().from(listeningTests);
  }

  async getListeningTest(id: string): Promise<ListeningTest | undefined> {
    const [test] = await db.select().from(listeningTests).where(eq(listeningTests.id, id));
    return test;
  }

  async createListeningTest(test: InsertListeningTest): Promise<ListeningTest> {
    const [created] = await db.insert(listeningTests).values(test as any).returning();
    return created;
  }

  async updateListeningTest(id: string, test: Partial<InsertListeningTest>): Promise<ListeningTest | undefined> {
    const [updated] = await db.update(listeningTests).set(test as any).where(eq(listeningTests.id, id)).returning();
    return updated;
  }

  async deleteListeningTest(id: string): Promise<boolean> {
    const result = await db.delete(listeningTests).where(eq(listeningTests.id, id)).returning();
    return result.length > 0;
  }

  async getReadingTests(): Promise<ReadingTest[]> {
    return db.select().from(readingTests);
  }

  async getReadingTest(id: string): Promise<ReadingTest | undefined> {
    const [test] = await db.select().from(readingTests).where(eq(readingTests.id, id));
    return test;
  }

  async createReadingTest(test: InsertReadingTest): Promise<ReadingTest> {
    const [created] = await db.insert(readingTests).values(test as any).returning();
    return created;
  }

  async updateReadingTest(id: string, test: Partial<InsertReadingTest>): Promise<ReadingTest | undefined> {
    const [updated] = await db.update(readingTests).set(test as any).where(eq(readingTests.id, id)).returning();
    return updated;
  }

  async deleteReadingTest(id: string): Promise<boolean> {
    const result = await db.delete(readingTests).where(eq(readingTests.id, id)).returning();
    return result.length > 0;
  }

  async getWritingTests(): Promise<WritingTest[]> {
    return db.select().from(writingTests);
  }

  async getWritingTest(id: string): Promise<WritingTest | undefined> {
    const [test] = await db.select().from(writingTests).where(eq(writingTests.id, id));
    return test;
  }

  async createWritingTest(test: InsertWritingTest): Promise<WritingTest> {
    const [created] = await db.insert(writingTests).values(test).returning();
    return created;
  }

  async updateWritingTest(id: string, test: Partial<InsertWritingTest>): Promise<WritingTest | undefined> {
    const [updated] = await db.update(writingTests).set(test).where(eq(writingTests.id, id)).returning();
    return updated;
  }

  async deleteWritingTest(id: string): Promise<boolean> {
    const result = await db.delete(writingTests).where(eq(writingTests.id, id)).returning();
    return result.length > 0;
  }

  async getSiteContent(): Promise<SiteContent[]> {
    return db.select().from(siteContent);
  }

  async getSiteContentByKey(key: string): Promise<SiteContent | undefined> {
    const [item] = await db.select().from(siteContent).where(eq(siteContent.key, key));
    return item;
  }

  async upsertSiteContent(item: InsertSiteContent): Promise<SiteContent> {
    const existing = await this.getSiteContentByKey(item.key);
    if (existing) {
      const [updated] = await db.update(siteContent).set({ value: item.value }).where(eq(siteContent.key, item.key)).returning();
      return updated;
    }
    const [created] = await db.insert(siteContent).values(item).returning();
    return created;
  }

  async getTestResults(): Promise<TestResult[]> {
    return db.select().from(testResults);
  }

  async getTestResultsByUser(userId: string): Promise<TestResult[]> {
    return db.select().from(testResults).where(eq(testResults.userId, userId));
  }

  async getTestResultsByFullmock(fullmockId: string, userId: string): Promise<TestResult[]> {
    return db.select().from(testResults).where(
      and(eq(testResults.fullmockId, fullmockId), eq(testResults.userId, userId))
    );
  }

  async createTestResult(result: InsertTestResult): Promise<TestResult> {
    const [created] = await db.insert(testResults).values(result).returning();
    return created;
  }

  async deleteTestResult(id: string): Promise<void> {
    await db.delete(testResults).where(eq(testResults.id, id));
  }

  async getNotesByUser(userId: string): Promise<Note[]> {
    return db.select().from(notes).where(eq(notes.userId, userId)).orderBy(notes.createdAt);
  }

  async createNote(userId: string, content: string): Promise<Note> {
    const [created] = await db.insert(notes).values({ userId, content }).returning();
    return created;
  }

  async deleteNote(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(notes).where(eq(notes.id, id)).returning();
    return result.length > 0;
  }

  async getFullMockTests(): Promise<FullMockTest[]> {
    return db.select().from(fullMockTests);
  }

  async getFullMockTest(id: string): Promise<FullMockTest | undefined> {
    const [test] = await db.select().from(fullMockTests).where(eq(fullMockTests.id, id));
    return test;
  }

  async createFullMockTest(data: InsertFullMockTest): Promise<FullMockTest> {
    const [created] = await db.insert(fullMockTests).values(data).returning();
    return created;
  }

  async updateFullMockTest(id: string, data: Partial<InsertFullMockTest>): Promise<FullMockTest | undefined> {
    const [updated] = await db.update(fullMockTests).set(data).where(eq(fullMockTests.id, id)).returning();
    return updated;
  }

  async deleteFullMockTest(id: string): Promise<boolean> {
    const result = await db.delete(fullMockTests).where(eq(fullMockTests.id, id)).returning();
    return result.length > 0;
  }

  async getVideoLessons(): Promise<VideoLesson[]> {
    return db.select().from(videoLessons).orderBy(videoLessons.createdAt);
  }

  async getActiveVideoLessons(): Promise<VideoLesson[]> {
    return db.select().from(videoLessons).where(eq(videoLessons.isActive, true)).orderBy(videoLessons.createdAt);
  }

  async createVideoLesson(lesson: InsertVideoLesson): Promise<VideoLesson> {
    const [created] = await db.insert(videoLessons).values(lesson).returning();
    return created;
  }

  async deleteVideoLesson(id: string): Promise<boolean> {
    const result = await db.delete(videoLessons).where(eq(videoLessons.id, id)).returning();
    return result.length > 0;
  }

  async toggleVideoLesson(id: string, isActive: boolean): Promise<VideoLesson | undefined> {
    const [updated] = await db.update(videoLessons).set({ isActive }).where(eq(videoLessons.id, id)).returning();
    return updated;
  }

  async getOnlineLessons(): Promise<OnlineLesson[]> {
    return db.select().from(onlineLessons).orderBy(onlineLessons.createdAt);
  }

  async getActiveOnlineLessons(): Promise<OnlineLesson[]> {
    return db.select().from(onlineLessons).where(eq(onlineLessons.isActive, true)).orderBy(onlineLessons.deadline);
  }

  async getOnlineLesson(id: string): Promise<OnlineLesson | undefined> {
    const [lesson] = await db.select().from(onlineLessons).where(eq(onlineLessons.id, id));
    return lesson;
  }

  async createOnlineLesson(lesson: InsertOnlineLesson): Promise<OnlineLesson> {
    const [created] = await db.insert(onlineLessons).values(lesson).returning();
    return created;
  }

  async updateOnlineLesson(id: string, data: Partial<InsertOnlineLesson>): Promise<OnlineLesson | undefined> {
    const [updated] = await db.update(onlineLessons).set(data).where(eq(onlineLessons.id, id)).returning();
    return updated;
  }

  async deleteOnlineLesson(id: string): Promise<boolean> {
    const result = await db.delete(onlineLessons).where(eq(onlineLessons.id, id)).returning();
    return result.length > 0;
  }

  async getOnlineLessonQuestions(lessonId: string): Promise<OnlineLessonQuestion[]> {
    return db.select().from(onlineLessonQuestions)
      .where(eq(onlineLessonQuestions.lessonId, lessonId))
      .orderBy(onlineLessonQuestions.orderIndex);
  }

  async createOnlineLessonQuestion(q: InsertOnlineLessonQuestion): Promise<OnlineLessonQuestion> {
    const [created] = await db.insert(onlineLessonQuestions).values(q).returning();
    return created;
  }

  async deleteOnlineLessonQuestion(id: string): Promise<boolean> {
    const result = await db.delete(onlineLessonQuestions).where(eq(onlineLessonQuestions.id, id)).returning();
    return result.length > 0;
  }

  async reorderOnlineLessonQuestion(id: string, orderIndex: number): Promise<OnlineLessonQuestion | undefined> {
    const [updated] = await db.update(onlineLessonQuestions).set({ orderIndex }).where(eq(onlineLessonQuestions.id, id)).returning();
    return updated;
  }

  async getOnlineLessonResults(lessonId: string): Promise<OnlineLessonResult[]> {
    return db.select().from(onlineLessonResults).where(eq(onlineLessonResults.lessonId, lessonId)).orderBy(onlineLessonResults.submittedAt);
  }

  async getOnlineLessonResultByUser(lessonId: string, userId: string): Promise<OnlineLessonResult | undefined> {
    const [result] = await db.select().from(onlineLessonResults)
      .where(eq(onlineLessonResults.lessonId, lessonId))
      .orderBy(onlineLessonResults.submittedAt);
    return result?.userId === userId ? result : undefined;
  }

  async createOnlineLessonResult(result: InsertOnlineLessonResult): Promise<OnlineLessonResult> {
    const [created] = await db.insert(onlineLessonResults).values(result).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
