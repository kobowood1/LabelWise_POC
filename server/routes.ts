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
        // First attempt: Try GPT-4
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const prompt = `Analyze this food/medicine label text and provide a detailed breakdown:
        "${text}"
        
        Provide the analysis in the following JSON format:
        {
          "summary": "Brief overview of the product",
          "nutritionalAnalysis": {
            "score": "health score out of 10",
            "breakdown": {
              "calories": "number",
              "protein": "grams",
              "carbs": "grams",
              "fat": "grams"
            }
          },
          "ingredients": ["list of ingredients"],
          "allergens": ["potential allergens"],
          "warnings": ["health warnings"],
          "recommendations": ["health recommendations"]
        }`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { 
              role: "system", 
              content: "You are a medical and nutritional analysis expert. Analyze the given label text and provide detailed information." 
            },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        });

        const analysis = JSON.parse(completion.choices[0].message.content);
        res.json(analysis);
      } catch (llmError) {
        console.error('LLM Analysis Error:', llmError);
        
        // Fallback: Use regex-based analysis
        const { extractNutritionalInfo } = await import('../client/src/lib/ocr.js');
        const { detectAllergens } = await import('../client/src/lib/ocr.js');

        // Extract nutritional information using regex
        const nutritionInfo = extractNutritionalInfo(text);

        // Extract ingredients using regex
        const ingredientsMatch = text.match(/ingredients:(.+?)(\.|$)/i);
        const ingredients = ingredientsMatch 
          ? ingredientsMatch[1].split(',').map(i => i.trim())
          : [];

        // Detect potential allergens
        const commonAllergens = ['peanuts', 'dairy', 'gluten', 'shellfish', 'soy', 'eggs', 'tree nuts'];
        const allergens = detectAllergens(ingredients, commonAllergens);

        // Calculate a basic health score
        const healthScore = Math.min(10, Math.max(1, Math.round(
          (nutritionInfo.protein * 2 - nutritionInfo.fat * 0.5) / 10 + 5
        )));

        // Generate basic warnings based on nutritional content
        const warnings = [];
        if (nutritionInfo.calories > 300) warnings.push("High calorie content");
        if (nutritionInfo.fat > 20) warnings.push("High fat content");
        if (nutritionInfo.carbs > 50) warnings.push("High carbohydrate content");

        // Generate basic recommendations
        const recommendations = [];
        if (healthScore < 5) {
          recommendations.push("Consider healthier alternatives");
        }
        if (allergens.length > 0) {
          recommendations.push("Check with healthcare provider if allergic to any ingredients");
        }

        const fallbackAnalysis = {
          summary: `Product contains ${ingredients.length} ingredients with ${nutritionInfo.calories} calories`,
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
