import type { Express } from "express";
import { db } from "../db";
import { users, scans, userPreferences } from "@db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export function registerRoutes(app: Express) {
  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const user = await db.insert(users).values(req.body).returning();
      res.json(user[0]);
    } catch (error) {
      res.status(400).json({ error: "Failed to create user" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, parseInt(req.params.id))
      });
      res.json(user);
    } catch (error) {
      res.status(404).json({ error: "User not found" });
    }
  });

  // Preferences routes
  app.post("/api/preferences", async (req, res) => {
    try {
      const preferences = await db.insert(userPreferences).values(req.body).returning();
      res.json(preferences[0]);
    } catch (error) {
      res.status(400).json({ error: "Failed to save preferences" });
    }
  });

  app.get("/api/preferences/:userId", async (req, res) => {
    try {
      const prefs = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, parseInt(req.params.userId))
      });
      res.json(prefs);
    } catch (error) {
      res.status(404).json({ error: "Preferences not found" });
    }
  });

  // Scan routes
  app.post("/api/scans", async (req, res) => {
    try {
      const scan = await db.insert(scans).values(req.body).returning();
      res.json(scan[0]);
    } catch (error) {
      res.status(400).json({ error: "Failed to save scan" });
    }
  });

  app.get("/api/scans/:userId", async (req, res) => {
    try {
      const userScans = await db.query.scans.findMany({
        where: eq(scans.userId, parseInt(req.params.userId)),
        orderBy: (scans, { desc }) => [desc(scans.createdAt)]
      });
      res.json(userScans);
    } catch (error) {
      res.status(404).json({ error: "Scans not found" });
    }
  });

  // OCR endpoint
  app.post("/api/ocr", async (req, res) => {
    try {
      const multer = (await import('multer')).default;
      const Tesseract = (await import('tesseract.js')).default;
      const upload = multer({ storage: multer.memoryStorage() });

      upload.single('image')(req, res, async (err) => {
        if (err) {
          return res.status(400).json({ error: "File upload failed" });
        }

        if (!req.file) {
          return res.status(400).json({ error: "No image file provided" });
        }

        const image = req.file.buffer;
        const result = await Tesseract.recognize(image, 'eng');
        
        res.json({
          text: result.data.text,
          confidence: result.data.confidence,
          boundingBoxes: result.data.words.map(word => ({
            text: word.text,
            box: word.bbox
          }))
        });
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

      try {
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const prompt = `Analyze this food/medicine label text and provide a detailed breakdown:
        "${text}"
        
        Provide the analysis in the following JSON format:
        {
          "summary": "Brief overview of the product",
          "nutritionalAnalysis": {
            "score": 5,
            "breakdown": {
              "calories": 0,
              "protein": 0,
              "carbs": 0,
              "fat": 0
            }
          },
          "ingredients": [],
          "allergens": [],
          "warnings": [],
          "recommendations": []
        }`;

        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { 
              role: "system", 
              content: "You are a medical and nutritional analysis expert. Analyze the given label text and provide detailed information in the exact JSON format specified. All numeric values should be numbers, not strings." 
            },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        });

        const content = completion.choices[0].message.content;
        if (!content) {
          throw new Error("No content in OpenAI response");
        }

        const analysis = JSON.parse(content);
        res.json(analysis);
      } catch (llmError) {
        console.error('LLM Analysis Error:', llmError);
        
        // Enhanced fallback analysis
        const { extractNutritionalInfo } = await import('../client/src/lib/ocr.js');
        const { detectAllergens } = await import('../client/src/lib/ocr.js');

        // Extract nutritional information using enhanced regex
        const nutritionInfo = extractNutritionalInfo(text);

        // Extract ingredients with better pattern matching
        const ingredientsPattern = /ingredients[\s:\n]+([^.]+?)(?=\.|$)/i;
        const ingredientsMatch = text.match(ingredientsPattern);
        const ingredients: string[] = ingredientsMatch 
          ? ingredientsMatch[1]
              .split(/,|\n/)
              .map((i: string) => i.trim())
              .filter((i: string) => i.length > 0)
          : [];

        // Enhanced allergen detection
        const commonAllergens = [
          'peanuts', 'dairy', 'milk', 'gluten', 'wheat', 
          'shellfish', 'soy', 'eggs', 'tree nuts', 'fish', 
          'sesame', 'mustard', 'celery', 'lupin', 'sulfites'
        ];
        const allergens = detectAllergens(ingredients, commonAllergens);

        // Improved health score calculation
        let healthScore = 5; // Default neutral score
        if (nutritionInfo.protein > 0 || nutritionInfo.carbs > 0 || nutritionInfo.fat > 0) {
          healthScore = Math.min(10, Math.max(1, Math.round(
            (nutritionInfo.protein * 2 + // Protein is good
             (nutritionInfo.carbs < 50 ? 2 : -1) + // Moderate carbs are okay
             (nutritionInfo.fat < 15 ? 1 : -2) + // Lower fat is better
             5) // Base score
          )));
        }

        // Enhanced warnings based on nutritional content
        const warnings: string[] = [];
        if (nutritionInfo.calories > 300) warnings.push("High calorie content - consider portion control");
        if (nutritionInfo.fat > 20) warnings.push("High fat content - may affect cardiovascular health");
        if (nutritionInfo.carbs > 50) warnings.push("High carbohydrate content - monitor blood sugar impact");
        if (allergens.length > 0) warnings.push("Contains common allergens - check ingredients carefully");

        // Enhanced recommendations
        const recommendations: string[] = [];
        if (healthScore < 5) {
          recommendations.push("Consider healthier alternatives with better nutritional balance");
          if (nutritionInfo.protein < 10) {
            recommendations.push("May need to supplement with protein-rich foods");
          }
        } else if (healthScore > 7) {
          recommendations.push("Good nutritional profile - suitable as part of a balanced diet");
        }

        if (allergens.length > 0) {
          recommendations.push("Consult healthcare provider if allergic to any listed ingredients");
        }

        const fallbackAnalysis = {
          summary: `Product analysis based on ${ingredients.length} identified ingredients. Contains ${nutritionInfo.calories} calories per serving.`,
          nutritionalAnalysis: {
            score: healthScore,
            breakdown: {
              calories: nutritionInfo.calories,
              protein: nutritionInfo.protein,
              carbs: nutritionInfo.carbs,
              fat: nutritionInfo.fat
            }
          },
          ingredients,
          allergens,
          warnings,
          recommendations
        };

        res.json(fallbackAnalysis);
      }
    } catch (error) {
      console.error('Analysis Error:', error);
      res.status(400).json({ error: "Analysis failed" });
    }
  });
}
