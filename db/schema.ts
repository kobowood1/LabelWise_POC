import { pgTable, text, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const medications = pgTable("medications", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer().notNull().references(() => users.id),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  activeIngredients: jsonb("active_ingredients").default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const medicationInteractions = pgTable("medication_interactions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  medicationId: integer().notNull().references(() => medications.id),
  interactingMedicationId: integer().notNull().references(() => medications.id),
  severity: text("severity").notNull(), // mild, moderate, severe
  description: text("description").notNull(),
  recommendations: jsonb("recommendations").default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const userPreferences = pgTable("user_preferences", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer().notNull().references(() => users.id).unique(),
  allergies: jsonb("allergies").default([]).notNull(),
  dietaryRestrictions: jsonb("dietary_restrictions").default([]).notNull(),
  healthConditions: jsonb("health_conditions").default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const scans = pgTable("scans", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer().notNull().references(() => users.id),
  imageUrl: text("image_url").notNull(),
  extractedText: text("extracted_text").notNull(),
  analysis: jsonb("analysis").notNull(),
  allergenAlerts: jsonb("allergen_alerts").default([]).notNull(),
  isFavorite: boolean("is_favorite").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Schema types for medications
export const insertMedicationSchema = createInsertSchema(medications);
export const selectMedicationSchema = createSelectSchema(medications);
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type Medication = z.infer<typeof selectMedicationSchema>;

// Schema types for medication interactions
export const insertMedicationInteractionSchema = createInsertSchema(medicationInteractions);
export const selectMedicationInteractionSchema = createSelectSchema(medicationInteractions);
export type InsertMedicationInteraction = z.infer<typeof insertMedicationInteractionSchema>;
export type MedicationInteraction = z.infer<typeof selectMedicationInteractionSchema>;

// Schema types for users
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;

// Schema types for preferences
export const insertPreferencesSchema = createInsertSchema(userPreferences);
export const selectPreferencesSchema = createSelectSchema(userPreferences);
export type InsertPreferences = z.infer<typeof insertPreferencesSchema>;
export type Preferences = z.infer<typeof selectPreferencesSchema>;

// Schema types for scans
export const insertScanSchema = createInsertSchema(scans);
export const selectScanSchema = createSelectSchema(scans);
export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = z.infer<typeof selectScanSchema>;