import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  speakingTests,
  listeningTests,
  readingTests,
  writingTests,
  siteContent,
  testResults,
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
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

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
  createTestResult(result: InsertTestResult): Promise<TestResult>;
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
    const [created] = await db.insert(listeningTests).values(test).returning();
    return created;
  }

  async updateListeningTest(id: string, test: Partial<InsertListeningTest>): Promise<ListeningTest | undefined> {
    const [updated] = await db.update(listeningTests).set(test).where(eq(listeningTests.id, id)).returning();
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
    const [created] = await db.insert(readingTests).values(test).returning();
    return created;
  }

  async updateReadingTest(id: string, test: Partial<InsertReadingTest>): Promise<ReadingTest | undefined> {
    const [updated] = await db.update(readingTests).set(test).where(eq(readingTests.id, id)).returning();
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

  async createTestResult(result: InsertTestResult): Promise<TestResult> {
    const [created] = await db.insert(testResults).values(result).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
