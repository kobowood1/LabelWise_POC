import { pgTable, text, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique().notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const userPreferences = pgTable("user_preferences", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  allergies: jsonb("allergies").default([]).notNull(),
  dietaryRestrictions: jsonb("dietary_restrictions").default([]).notNull(),
  healthConditions: jsonb("health_conditions").default([]).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const scans = pgTable("scans", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  imageUrl: text("image_url").notNull(),
  extractedText: text("extracted_text").notNull(),
  analysis: jsonb("analysis").notNull(),
  allergenAlerts: jsonb("allergen_alerts").default([]).notNull(),
  isFavorite: boolean("is_favorite").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;

export const insertPreferencesSchema = createInsertSchema(userPreferences);
export const selectPreferencesSchema = createSelectSchema(userPreferences);
export type InsertPreferences = z.infer<typeof insertPreferencesSchema>;
export type Preferences = z.infer<typeof selectPreferencesSchema>;

export const insertScanSchema = createInsertSchema(scans);
export const selectScanSchema = createSelectSchema(scans);
export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = z.infer<typeof selectScanSchema>;
