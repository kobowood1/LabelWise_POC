import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";

interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  servingSize: string;
  ingredients: string[];
  score: number;
}

interface AnalysisResult {
  nutritionInfo: NutritionInfo;
  allergens: string[];
  warnings: string[];
  recommendations: string[];
}

interface AnalysisResultsProps {
  analysis: AnalysisResult;
  userAllergies?: string[];
}

export default function AnalysisResults({ analysis, userAllergies = [] }: AnalysisResultsProps) {
  const allergenMatch = analysis.allergens.some(allergen => 
    userAllergies.includes(allergen.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {allergenMatch && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">Allergen Alert!</span>
            </div>
            <p className="mt-2 text-sm text-red-600">
              This product contains allergens that match your profile.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Nutritional Information</span>
            <Badge variant={analysis.nutritionInfo.score >= 7 ? "default" : analysis.nutritionInfo.score >= 4 ? "secondary" : "destructive"}>
              Score: {analysis.nutritionInfo.score}/10
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Calories</span>
                <span>{analysis.nutritionInfo.calories || 0}kcal</span>
              </div>
              <Progress
                value={(analysis.nutritionInfo.calories || 0) / 2000 * 100}
                className="h-2"
              />
              <span className="text-xs text-muted-foreground">
                {Math.round(((analysis.nutritionInfo.calories || 0) / 2000) * 100)}% of daily value
              </span>
            </div>
            {analysis.nutritionInfo.servingSize && (
              <div className="text-sm text-muted-foreground">
                Serving Size: {analysis.nutritionInfo.servingSize}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Protein", value: analysis.nutritionInfo.protein || 0, unit: "g", max: 50 },
              { label: "Carbs", value: analysis.nutritionInfo.carbs || 0, unit: "g", max: 300 },
              { label: "Fat", value: analysis.nutritionInfo.fat || 0, unit: "g", max: 65 },
              { label: "Sugar", value: analysis.nutritionInfo.sugar || 0, unit: "g", max: 50 },
              { label: "Fiber", value: analysis.nutritionInfo.fiber || 0, unit: "g", max: 25 },
              { label: "Sodium", value: analysis.nutritionInfo.sodium || 0, unit: "mg", max: 2300 }
            ].map(({ label, value, unit, max }) => (
              <div key={label} className="space-y-1">
                <span className="text-sm font-medium">{label}</span>
                <Progress
                  value={(value / max) * 100}
                  className={`h-2 ${value > max * 0.8 ? 'bg-red-200' : ''}`}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{value}{unit}</span>
                  <span>{Math.round((value / max) * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ingredients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {analysis.nutritionInfo.ingredients.map((ingredient, index) => (
              <Badge key={index} variant="secondary">
                {ingredient}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {analysis.warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="mr-2 h-5 w-5" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              {analysis.warnings.map((warning, index) => (
                <li key={index} className="text-sm">{warning}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2">
            {analysis.recommendations.map((recommendation, index) => (
              <li key={index} className="text-sm">{recommendation}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
