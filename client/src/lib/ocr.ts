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

export function extractNutritionalInfo(ocrText: string) {
  // Define regex patterns for common nutritional information
  const patterns = {
    calories: /calories[:\s]+(\d+)/i,
    protein: /protein[:\s]+(\d+)g/i,
    carbs: /carbohydrates?[:\s]+(\d+)g/i,
    fat: /fat[:\s]+(\d+)g/i,
    ingredients: /ingredients:(.+?)\./i,
  };

  // Extract values using regex
  return {
    calories: parseInt(ocrText.match(patterns.calories)?.[1] || '0'),
    protein: parseInt(ocrText.match(patterns.protein)?.[1] || '0'),
    carbs: parseInt(ocrText.match(patterns.carbs)?.[1] || '0'),
    fat: parseInt(ocrText.match(patterns.fat)?.[1] || '0'),
    ingredients: ocrText.match(patterns.ingredients)?.[1]
      ?.split(',')
      .map(i => i.trim()) || [],
  };
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
