import { sleep } from './utils';

interface OCRResult {
  text: string;
  confidence: number;
  boundingBoxes: Array<{
    text: string;
    box: [number, number, number, number];
  }>;
  preprocessing?: {
    words_filtered: number;
    total_words: number;
  };
}

export class OCRError extends Error {
  constructor(message: string, public readonly details?: any) {
    super(message);
    this.name = 'OCRError';
  }
}

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export async function performOCR(image: File): Promise<OCRResult> {
  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const formData = new FormData();
      formData.append('image', image);

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new OCRError(
          'OCR processing failed',
          errorData || { status: response.status }
        );
      }

      const result = await response.json();

      // Validate OCR result structure
      if (!result.text || typeof result.confidence !== 'number') {
        throw new OCRError('Invalid OCR result format');
      }

      // If confidence is too low, throw error to trigger retry
      if (result.confidence < 30) {
        throw new OCRError('Low confidence OCR result', { confidence: result.confidence });
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      attempt++;

      if (attempt < MAX_RETRIES) {
        // Exponential backoff with jitter
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1) * (0.5 + Math.random());
        console.warn(`OCR attempt ${attempt} failed, retrying in ${Math.round(delay)}ms...`);
        await sleep(delay);
      }
    }
  }

  throw new OCRError(`OCR failed after ${MAX_RETRIES} attempts`, lastError);
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\n\r]+/g, ' ')
    .replace(/[^\w\s.,:%/-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractNumber(text: string, pattern: RegExp): number {
  const match = text.match(pattern);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  return isNaN(value) ? 0 : value;
}

export function extractNutritionalInfo(ocrText: string) {
  if (!ocrText || typeof ocrText !== 'string') {
    throw new Error('Invalid input: OCR text is required');
  }

  // Normalize text for better pattern matching
  const normalizedText = normalizeText(ocrText);

  // Enhanced regex patterns for detailed nutritional information
  const patterns = {
    calories: /(?:calories|energy)[:\s]+(\d+(?:\.\d+)?)\s*(?:kcal)?/i,
    protein: /(?:protein|proteins)[:\s]+(\d+(?:\.\d+)?)\s*(?:g|grams)/i,
    carbs: /(?:carbohydrates?|carbs|total carbs)[:\s]+(\d+(?:\.\d+)?)\s*(?:g|grams)/i,
    fat: /(?:total fat|fat content|fats?)[:\s]+(\d+(?:\.\d+)?)\s*(?:g|grams)/i,
    fiber: /(?:dietary fiber|fiber|fibre)[:\s]+(\d+(?:\.\d+)?)\s*(?:g|grams)/i,
    sugar: /(?:sugars?|total sugar)[:\s]+(\d+(?:\.\d+)?)\s*(?:g|grams)/i,
    sodium: /(?:sodium|salt)[:\s]+(\d+(?:\.\d+)?)\s*(?:mg|milligrams|g|grams)/i,
    ingredients: /ingredients[:\s]+([^.]+?)(?=(?:\.|nutrition|contains|allergen|$))/i,
    servingSize: /serving\s+size[:\s]+([^.]+?)(?=(?:\.|per|contains|$))/i,
  };

  // Extract and parse ingredients with better handling
  const ingredientsMatch = normalizedText.match(patterns.ingredients);
  const ingredients = ingredientsMatch
    ? ingredientsMatch[1]
        .split(/,|;|\(|\)/)
        .map(i => i.trim())
        .filter(i =>
          i.length > 0 &&
          !i.match(/^\d+$/) && // Filter out standalone numbers
          !i.match(/^(?:and|or|contains|may contain)$/i) // Filter out connecting words
        )
    : [];

  // Extract numerical values with validation
  const nutritionData = {
    calories: extractNumber(normalizedText, patterns.calories),
    protein: extractNumber(normalizedText, patterns.protein),
    carbs: extractNumber(normalizedText, patterns.carbs),
    fat: extractNumber(normalizedText, patterns.fat),
    sugar: extractNumber(normalizedText, patterns.sugar),
    fiber: extractNumber(normalizedText, patterns.fiber),
    sodium: extractNumber(normalizedText, patterns.sodium),
    ingredients: ingredients,
    servingSize: normalizedText.match(patterns.servingSize)?.[1]?.trim() || ''
  };

  // Validate extracted data
  if (Object.values(nutritionData).every(val =>
    (typeof val === 'number' && val === 0) ||
    (Array.isArray(val) && val.length === 0) ||
    (typeof val === 'string' && val === '')
  )) {
    console.warn('No nutritional information could be extracted from the text');
  }

  return nutritionData;
}

export function detectAllergens(ingredients: string[], userAllergies: string[]) {
  if (!Array.isArray(ingredients) || !Array.isArray(userAllergies)) {
    throw new Error('Invalid input: ingredients and userAllergies must be arrays');
  }

  const allergenKeywords = {
    'peanuts': ['peanut', 'arachis'],
    'tree nuts': ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut', 'macadamia'],
    'dairy': ['milk', 'cream', 'lactose', 'whey', 'casein', 'butter', 'cheese', 'yogurt'],
    'eggs': ['egg', 'albumin', 'ovoglobulin', 'livetin'],
    'soy': ['soy', 'soya', 'edamame', 'tofu'],
    'wheat': ['wheat', 'flour', 'bread', 'pasta'],
    'gluten': ['wheat', 'barley', 'rye', 'malt', 'gluten'],
    'fish': ['fish', 'cod', 'salmon', 'tuna', 'halibut'],
    'shellfish': ['shrimp', 'crab', 'lobster', 'prawn', 'crayfish'],
    'sesame': ['sesame', 'tahini'],
    'mustard': ['mustard', 'mustard seed'],
    'celery': ['celery', 'celeriac'],
    'lupin': ['lupin', 'lupini'],
    'sulfites': ['sulfite', 'sulphite', 'metabisulfite']
  };

  const detectedAllergens = new Set<string>();

  for (const ingredient of ingredients) {
    for (const [allergen, keywords] of Object.entries(allergenKeywords)) {
      if (keywords.some(keyword =>
        ingredient.toLowerCase().includes(keyword.toLowerCase())
      )) {
        if (userAllergies.includes(allergen)) {
          detectedAllergens.add(allergen);
        }
      }
    }
  }

  return Array.from(detectedAllergens);
}