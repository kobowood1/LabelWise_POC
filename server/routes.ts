import type { Express } from "express";
import { eq, inArray, and } from "drizzle-orm";
import { db } from "../db";
import { users, scans, userPreferences, medications, medicationInteractions } from "@db/schema";
import { z } from "zod";

export function registerRoutes(app: Express) {
  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, parseInt(req.params.id))
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      res.status(404).json({ error: "User not found" });
    }
  });

  // Get user preferences
  app.get("/api/preferences/:userId", async (req, res) => {
    try {
      const preferences = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, parseInt(req.params.userId))
      });

      if (!preferences) {
        return res.status(404).json({
          error: "Preferences not found",
          message: "No preferences found for this user"
        });
      }

      res.json(preferences);
    } catch (error) {
      res.status(500).json({
        error: "Failed to fetch preferences",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update user preferences
  app.post("/api/preferences", async (req, res) => {
    try {
      const preferencesSchema = z.object({
        userId: z.number(),
        name: z.string(),
        email: z.string().email(),
        allergies: z.array(z.string()).default([]),
        dietaryRestrictions: z.array(z.string()).default([]),
        healthConditions: z.array(z.string()).default([])
      });

      const validatedData = preferencesSchema.parse(req.body);

      // Update user information
      await db
        .update(users)
        .set({
          name: validatedData.name,
          email: validatedData.email
        })
        .where(eq(users.id, validatedData.userId));

      // Update or insert preferences
      const preferences = await db
        .insert(userPreferences)
        .values({
          userId: validatedData.userId,
          allergies: validatedData.allergies,
          dietaryRestrictions: validatedData.dietaryRestrictions,
          healthConditions: validatedData.healthConditions
        })
        .onConflictDoUpdate({
          target: [userPreferences.userId],
          set: {
            allergies: validatedData.allergies,
            dietaryRestrictions: validatedData.dietaryRestrictions,
            healthConditions: validatedData.healthConditions,
            updatedAt: new Date()
          }
        })
        .returning();

      res.json(preferences[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid preferences data",
          details: error.errors
        });
      }

      res.status(400).json({
        error: "Failed to save preferences",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // OCR endpoint with retry support
  app.post("/api/ocr", async (req, res) => {
    try {
      const multer = (await import('multer')).default;
      const Tesseract = (await import('tesseract.js')).default;
      const sharp = (await import('sharp')).default;
      const upload = multer({ storage: multer.memoryStorage() });

      upload.single('image')(req, res, async (err) => {
        if (err) {
          return res.status(400).json({ error: "File upload failed" });
        }

        if (!req.file) {
          return res.status(400).json({ error: "No image file provided" });
        }

        try {
          // Array of image processing configurations to try
          const processingConfigs = [
            // Default processing
            {
              grayscale: true,
              normalize: true,
              linear: [1.5, -0.2],
              median: 2,
              sharpen: { sigma: 1.5 },
              threshold: 128
            },
            // Alternative processing for low contrast
            {
              grayscale: true,
              normalize: true,
              linear: [2.0, -0.1],
              median: 1,
              sharpen: { sigma: 2.0 },
              threshold: 140
            },
            // Processing for high contrast
            {
              grayscale: true,
              normalize: true,
              linear: [1.2, -0.1],
              median: 3,
              sharpen: { sigma: 1.0 },
              threshold: 120
            }
          ];

          let bestResult = null;
          let highestConfidence = 0;

          for (const config of processingConfigs) {
            try {
              const processedImageBuffer = await sharp(req.file.buffer)
                .grayscale(config.grayscale)
                .normalize(config.normalize)
                .linear(config.linear[0], config.linear[1])
                .median(config.median)
                .sharpen({ sigma: config.sharpen.sigma })
                .threshold(config.threshold)
                .png()
                .toBuffer();

              const result = await Tesseract.recognize(processedImageBuffer, 'eng', {
                logger: m => {
                  if (process.env.NODE_ENV === 'development') {
                    console.log(m);
                  }
                }
              });

              const confidenceThreshold = 75;
              const words = result.data.words
                .filter(word => word.confidence > confidenceThreshold)
                .map(word => ({
                  text: word.text.trim(),
                  confidence: word.confidence,
                  box: word.bbox
                }));

              const avgConfidence = words.length > 0
                ? words.reduce((sum, word) => sum + word.confidence, 0) / words.length
                : 0;

              if (avgConfidence > highestConfidence) {
                highestConfidence = avgConfidence;
                bestResult = {
                  text: words
                    .map(word => word.text)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .replace(/[^\w\s.,:%()/-]/g, '')
                    .replace(/\b(\d+)\s*([a-zA-Z]+)\b/g, '$1$2')
                    .replace(/\b(ingredients|contains|nutrition facts)\b/gi, '\n$1\n')
                    .trim(),
                  confidence: avgConfidence,
                  boundingBoxes: words,
                  preprocessing: {
                    words_filtered: result.data.words.length - words.length,
                    total_words: result.data.words.length
                  }
                };
              }
            } catch (processError) {
              console.error('Processing configuration failed:', processError);
              continue;
            }
          }

          if (bestResult && bestResult.confidence > 30) {
            res.json(bestResult);
          } else {
            res.status(422).json({
              error: "Low confidence in OCR results",
              confidence: bestResult?.confidence || 0
            });
          }
        } catch (processError) {
          console.error('Image Processing Error:', processError);
          res.status(400).json({ error: "Image processing failed" });
        }
      });
    } catch (error) {
      console.error('OCR Error:', error);
      res.status(400).json({ error: "OCR processing failed" });
    }
  });

  // LLM analysis endpoint
  app.post("/api/analyze", async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ error: "No text provided for analysis" });
      }

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const prompt = `Analyze this food/medicine label text and provide a detailed nutritional breakdown:
      "${text}"
      
      Provide the analysis in the following JSON format, ensuring all nutritional values are numbers (not strings) and properly scaled to their respective units:
      {
        "summary": "Brief overview of the product",
        "nutritionalAnalysis": {
          "score": "number 1-10 indicating overall nutritional value",
          "breakdown": {
            "calories": "number (kcal)",
            "protein": "number (grams)",
            "carbs": "number (grams)",
            "fat": "number (grams)",
            "fiber": "number (grams)",
            "sugar": "number (grams)",
            "sodium": "number (milligrams)",
            "servingSize": "string (e.g., '1 cup', '100g')"
          }
        },
        "ingredients": ["array of ingredient strings"],
        "allergens": ["array of allergen strings"],
        "warnings": ["array of warning strings"],
        "recommendations": ["array of recommendation strings"]
      }`;

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { 
              role: "system", 
              content: "You are a medical and nutritional analysis expert. Analyze the given label text and provide detailed information in the exact JSON format specified. All numeric values should be numbers, not strings." 
            },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: 1000
        });

        if (!completion.choices || completion.choices.length === 0) {
          throw new Error("Invalid response from OpenAI API");
        }

        const content = completion.choices[0].message.content;
        if (!content) {
          throw new Error("No content in OpenAI response");
        }

        const analysis = JSON.parse(content);
        res.json(analysis);
      } catch (llmError) {
        console.error('LLM Analysis Error:', llmError);
        
        const { extractNutritionalInfo, detectAllergens } = await import('../client/src/lib/ocr.js');

        const nutritionInfo = extractNutritionalInfo(text);

        const ingredientsPattern = /ingredients[\s:\n]+([^.]+?)(?=\.|$)/i;
        const ingredientsMatch = text.match(ingredientsPattern);
        const ingredients = ingredientsMatch 
          ? ingredientsMatch[1]
              .split(/,|\n/)
              .map((i: string) => i.trim())
              .filter((i: string) => i.length > 0)
          : [];

        const commonAllergens = [
          'peanuts', 'dairy', 'milk', 'gluten', 'wheat', 
          'shellfish', 'soy', 'eggs', 'tree nuts', 'fish', 
          'sesame', 'mustard', 'celery', 'lupin', 'sulfites'
        ];
        const allergens = detectAllergens(ingredients, commonAllergens);

        let healthScore = 5;
        if (nutritionInfo.protein > 0 || nutritionInfo.carbs > 0 || nutritionInfo.fat > 0) {
          healthScore = Math.min(10, Math.max(1, Math.round(
            (nutritionInfo.protein * 2 +
             (nutritionInfo.carbs < 50 ? 2 : -1) +
             (nutritionInfo.fat < 15 ? 1 : -2) +
             5)
          )));
        }

        const warnings = [];
        if (nutritionInfo.calories > 300) warnings.push("High calorie content - consider portion control");
        if (nutritionInfo.fat > 20) warnings.push("High fat content - may affect cardiovascular health");
        if (nutritionInfo.carbs > 50) warnings.push("High carbohydrate content - monitor blood sugar impact");
        if (allergens.length > 0) warnings.push("Contains common allergens - check ingredients carefully");

        res.json({
          summary: "Analysis based on extracted text",
          nutritionalAnalysis: {
            score: healthScore,
            breakdown: nutritionInfo
          },
          ingredients,
          allergens,
          warnings,
          recommendations: [
            "Please consult with a healthcare professional for detailed advice",
            "Consider portion sizes based on your dietary needs",
            "Monitor your reaction if you have known allergies"
          ]
        });
      }
    } catch (error) {
      console.error('Analysis Error:', error);
      res.status(400).json({ error: "Analysis failed" });
    }
  });

  // Medication routes
  app.post("/api/medications", async (req, res) => {
    try {
      const medication = await db.insert(medications).values(req.body).returning();
      res.json(medication[0]);
    } catch (error) {
      res.status(400).json({ error: "Failed to add medication" });
    }
  });

  app.get("/api/medications/:userId", async (req, res) => {
    try {
      const userMeds = await db.query.medications.findMany({
        where: eq(medications.userId, parseInt(req.params.userId)),
        orderBy: (medications, { desc }) => [desc(medications.createdAt)]
      });
      res.json(userMeds);
    } catch (error) {
      res.status(404).json({ error: "Medications not found" });
    }
  });

  // Test endpoint to create sample medications
  app.post("/api/medications/test", async (req, res) => {
    try {
      const testMeds = [
        { name: "Aspirin", dosage: "81mg", frequency: "daily", userId: 1 },
        { name: "Lisinopril", dosage: "10mg", frequency: "daily", userId: 1 },
        { name: "Metformin", dosage: "500mg", frequency: "twice daily", userId: 1 }
      ];
      const results = await Promise.all(
        testMeds.map(med => db.insert(medications).values(med).returning())
      );
      res.json(results);
    } catch (error) {
      res.status(400).json({ error: "Failed to create test medications" });
    }
  });

  // Medication interaction check endpoint
  app.post("/api/medication-interactions/check", async (req, res) => {
    try {
      const { medicationId, otherMedicationIds } = req.body;
      
      // First, check for existing interactions in the database
      const interactions = await db.query.medicationInteractions.findMany({
        where: and(
          eq(medicationInteractions.medicationId, medicationId),
          inArray(medicationInteractions.interactingMedicationId, otherMedicationIds)
        )
      });

      if (interactions.length === 0) {
        // If no known interactions found, use OpenAI to analyze potential interactions
        const medication = await db.query.medications.findFirst({
          where: eq(medications.id, medicationId)
        });

        const otherMedications = await db.query.medications.findMany({
          where: inArray(medications.id, otherMedicationIds)
        });

        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const prompt = `Analyze potential interactions between these medications:
        Primary Medication: ${medication?.name} (${medication?.dosage})
        Other Medications: ${otherMedications.map(m => `${m.name} (${m.dosage})`).join(', ')}
        
        Provide analysis in JSON format:
        {
          "interactions": [{
            "medications": ["med1", "med2"],
            "severity": "mild|moderate|severe",
            "description": "Description of interaction",
            "recommendations": ["recommendation1", "recommendation2"]
          }]
        }`;

        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a medication interaction analysis expert. Analyze the potential interactions between medications and provide detailed information in the specified JSON format."
            },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7
        });

        const analysis = JSON.parse(completion.choices[0].message.content || "{}");
        
        // Store the analyzed interactions in the database
        for (const interaction of analysis.interactions) {
          const interactingMed = otherMedications.find(m => 
            m.name.toLowerCase() === interaction.medications[1].toLowerCase()
          );
          
          if (interactingMed) {
            await db.insert(medicationInteractions).values({
              medicationId,
              interactingMedicationId: interactingMed.id,
              severity: interaction.severity,
              description: interaction.description,
              recommendations: interaction.recommendations
            });
          }
        }

        res.json(analysis);
      } else {
        res.json({ interactions });
      }
    } catch (error) {
      console.error('Medication Interaction Check Error:', error);
      res.status(400).json({ error: "Failed to check medication interactions" });
    }
  });
}