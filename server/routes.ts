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
          // Enhanced image processing configurations
          const processingConfigs = [
            // Optimized for standard nutrition labels
            {
              grayscale: true,
              normalize: true,
              linear: [1.6, -0.15],
              median: 1,
              sharpen: { sigma: 1.2, m1: 1.5, m2: 20, x1: 2, y2: 30, y3: 0.7 },
              threshold: 135,
              contrast: 1.2
            },
            // Enhanced for low contrast labels
            {
              grayscale: true,
              normalize: true,
              linear: [2.0, -0.1],
              median: 1,
              sharpen: { sigma: 1.8, m1: 2.0, m2: 30, x1: 3, y2: 40, y3: 0.8 },
              threshold: 145,
              contrast: 1.4
            },
            // Optimized for high contrast labels
            {
              grayscale: true,
              normalize: true,
              linear: [1.3, -0.1],
              median: 2,
              sharpen: { sigma: 1.0, m1: 1.2, m2: 15, x1: 1.5, y2: 20, y3: 0.6 },
              threshold: 125,
              contrast: 1.1
            }
          ];

          let bestResult = null;
          let highestConfidence = 0;

          for (const config of processingConfigs) {
            try {
              let processedImage = sharp(req.file.buffer)
                .grayscale(config.grayscale)
                .normalize(config.normalize)
                .linear(config.linear[0], config.linear[1])
                .median(config.median)
                .sharpen({
                  sigma: config.sharpen.sigma,
                  m1: config.sharpen.m1,
                  m2: config.sharpen.m2,
                  x1: config.sharpen.x1,
                  y2: config.sharpen.y2,
                  y3: config.sharpen.y3
                })
                .threshold(config.threshold)
                .gamma(1.2) // Improve contrast in mid-tones
                .modulate({ brightness: 1.1, saturation: 0.8 }) // Fine-tune brightness
                .jpeg({ quality: 95 }); // Use JPEG for better OCR results

              const processedImageBuffer = await processedImage.toBuffer();

              const result = await Tesseract.recognize(processedImageBuffer, 'eng', {
                logger: m => {
                  if (process.env.NODE_ENV === 'development') {
                    console.log(m);
                  }
                },
                tessjs_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:%/-() ',
                tessedit_pageseg_mode: '6', // Assume uniform text block
                preserve_interword_spaces: '1',
                language_model_penalty_non_dict_word: '0.5',
                language_model_penalty_font: '0.6'
              });

              // Enhanced word filtering and confidence calculation
              const confidenceThreshold = 65; // Lowered threshold for better recall
              const words = result.data.words
                .filter(word => {
                  const isNumeric = /\d/.test(word.text);
                  const confidenceThreshold = isNumeric ? 60 : 70; // Lower threshold for numbers
                  return word.confidence > confidenceThreshold;
                })
                .map(word => ({
                  text: word.text.trim(),
                  confidence: word.confidence,
                  box: word.bbox,
                  isNumeric: /\d/.test(word.text)
                }));

              // Calculate weighted confidence score
              const avgConfidence = words.length > 0
                ? words.reduce((sum, word) => {
                    const weight = word.isNumeric ? 1.2 : 1.0; // Give higher weight to numeric values
                    return sum + (word.confidence * weight);
                  }, 0) / words.length
                : 0;

              if (avgConfidence > highestConfidence) {
                highestConfidence = avgConfidence;
                bestResult = {
                  text: words
                    .map(word => word.text)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .replace(/[^\w\s.,:%()/-]/g, '')
                    .replace(/(\d+)\s*([a-zA-Z]+)/g, '$1$2') // Join numbers with their units
                    .replace(/\b(ingredients|contains|nutrition facts)\b/gi, '\n$1\n')
                    .trim(),
                  confidence: avgConfidence,
                  boundingBoxes: words.map(({ text, confidence, box }) => ({ text, confidence, box })),
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
      const { image } = req.body;

      if (!image) {
        return res.status(400).json({ error: "No image provided for analysis" });
      }

      // Ensure image is a valid base64 string
      let base64Image = image;
      if (image.startsWith('data:image')) {
        base64Image = image;
      } else {
        base64Image = `data:image/jpeg;base64,${image}`;
      }

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      try {
        console.log('Starting OpenAI analysis...');

        const messages = [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please analyze this food/medicine label in detail. Provide:
                1. Product Overview
                2. Complete Nutritional Information (all nutrients listed)
                3. Ingredients Analysis
                4. Health Implications
                5. Allergen Information
                6. Usage Instructions/Recommendations
                7. Any Warnings or Special Notes
                8. Storage Information
                9. Additional Details (certifications, claims, etc.)

                Format the response in clear sections with detailed explanations.`
              },
              {
                type: "image_url",
                image_url: {
                  url: base64Image
                }
              }
            ]
          }
        ];

        console.log('Configured OpenAI request...');

        // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: messages,
          max_tokens: 1000,
          temperature: 0.7
        });

        console.log('Received OpenAI response...');

        if (!completion.choices || completion.choices.length === 0) {
          throw new Error("Invalid response from OpenAI API");
        }

        const analysisText = completion.choices[0].message.content || '';
        console.log('Analysis text received:', analysisText.substring(0, 100) + '...');

        // Parse the analysis into structured sections
        const sections = analysisText.split(/\d+\./).filter(Boolean).map(section => section.trim());

        const structuredAnalysis = {
          productOverview: sections[0] || "",
          nutritionalInformation: sections[1] || "",
          ingredientsAnalysis: sections[2] || "",
          healthImplications: sections[3] || "",
          allergenInformation: sections[4] || "",
          usageInstructions: sections[5] || "",
          warnings: sections[6] || "",
          storageInformation: sections[7] || "",
          additionalDetails: sections[8] || "",
          rawAnalysis: analysisText
        };

        res.json(structuredAnalysis);
      } catch (llmError: any) {
        console.error('LLM Analysis Error:', llmError);
        console.error('Error details:', llmError.response?.data || llmError);

        // If the model is not available, try falling back to GPT-4
        if (llmError.code === 'model_not_found') {
          try {
            console.log('Attempting fallback to GPT-4...');
            const fallbackCompletion = await openai.chat.completions.create({
              model: "gpt-4",
              messages: messages,
              max_tokens: 1000,
              temperature: 0.7
            });

            const fallbackAnalysisText = fallbackCompletion.choices[0].message.content || '';
            const fallbackSections = fallbackAnalysisText.split(/\d+\./).filter(Boolean).map(section => section.trim());

            const fallbackStructuredAnalysis = {
              productOverview: fallbackSections[0] || "",
              nutritionalInformation: fallbackSections[1] || "",
              ingredientsAnalysis: fallbackSections[2] || "",
              healthImplications: fallbackSections[3] || "",
              allergenInformation: fallbackSections[4] || "",
              usageInstructions: fallbackSections[5] || "",
              warnings: fallbackSections[6] || "",
              storageInformation: fallbackSections[7] || "",
              additionalDetails: fallbackSections[8] || "",
              rawAnalysis: fallbackAnalysisText
            };

            return res.json(fallbackStructuredAnalysis);
          } catch (fallbackError: any) {
            console.error('Fallback analysis failed:', fallbackError);
            throw fallbackError;
          }
        }

        res.status(422).json({
          error: "Analysis failed",
          message: llmError.message,
          details: llmError.response?.data || llmError
        });
      }
    } catch (error) {
      console.error('Analysis Error:', error);
      res.status(400).json({ error: "Analysis failed", details: error });
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
          model: "o1-mini",
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