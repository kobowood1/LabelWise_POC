interface OCRResult {
  text: string;
  confidence: number;
  boundingBoxes: Array<{
    text: string;
    box: [number, number, number, number];
  }>;
}

export async function performOCR(image: File): Promise<OCRResult> {
  // Create form data for image upload
  const formData = new FormData();
  formData.append('image', image);

  try {
    const response = await fetch('/api/ocr', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('OCR processing failed');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to process image text');
  }
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

  // Extract numerical values
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

  return nutritionData;
}

export function detectAllergens(ingredients: string[], userAllergies: string[]) {
  const allergenKeywords = {
    'peanuts': ['peanut', 'arachis'],
    'dairy': ['milk', 'cream', 'lactose', 'whey', 'casein'],
    'gluten': ['wheat', 'barley', 'rye', 'gluten'],
    'shellfish': ['shrimp', 'crab', 'lobster', 'shellfish'],
    // Add more allergen keywords as needed
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
