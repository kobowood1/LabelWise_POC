interface AnalysisRequest {
  text: string;
  userPreferences?: {
    allergies: string[];
    dietaryRestrictions: string[];
    healthConditions: string[];
  };
}

interface AnalysisResponse {
  summary: string;
  nutritionalAnalysis: {
    score: number;
    breakdown: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  };
  warnings: string[];
  recommendations: string[];
  allergenAlerts: string[];
}

export async function analyzeLabelContent(
  request: AnalysisRequest
): Promise<AnalysisResponse> {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Analysis failed');
    }

    return await response.json();
  } catch (error) {
    console.error('LLM Analysis Error:', error);
    throw new Error('Failed to analyze label content');
  }
}

export function generateHealthRecommendations(
  analysis: AnalysisResponse,
  userPreferences?: AnalysisRequest['userPreferences']
): string[] {
  const recommendations: string[] = [];

  // Base recommendations on nutritional content
  if (analysis.nutritionalAnalysis.breakdown.calories > 300) {
    recommendations.push('This item is relatively high in calories. Consider portion control.');
  }

  if (analysis.nutritionalAnalysis.breakdown.fat > 20) {
    recommendations.push('High fat content detected. Moderate consumption recommended.');
  }

  // Add recommendations based on user health conditions
  if (userPreferences?.healthConditions?.includes('diabetes')) {
    if (analysis.nutritionalAnalysis.breakdown.carbs > 30) {
      recommendations.push('High carbohydrate content - monitor blood sugar levels.');
    }
  }

  // Add general health recommendations
  if (analysis.nutritionalAnalysis.score < 5) {
    recommendations.push('Consider healthier alternatives with better nutritional value.');
  }

  return recommendations;
}

export function formatAnalysisForDisplay(
  analysis: AnalysisResponse
): {
  title: string;
  content: string;
  severity: 'info' | 'warning' | 'error';
}[] {
  return [
    {
      title: 'Nutritional Summary',
      content: analysis.summary,
      severity: 'info',
    },
    ...analysis.allergenAlerts.map(alert => ({
      title: 'Allergen Alert',
      content: alert,
      severity: 'error' as const,
    })),
    ...analysis.warnings.map(warning => ({
      title: 'Warning',
      content: warning,
      severity: 'warning' as const,
    })),
  ];
}
