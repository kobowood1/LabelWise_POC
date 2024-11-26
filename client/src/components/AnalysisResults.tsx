import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";

interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
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
          <CardTitle>Nutritional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Calories</span>
              <span>{analysis.nutritionInfo.calories}kcal</span>
            </div>
            <Progress value={analysis.nutritionInfo.calories / 20} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <span className="text-sm font-medium">Protein</span>
              <Progress value={analysis.nutritionInfo.protein} />
              <span className="text-xs text-muted-foreground">
                {analysis.nutritionInfo.protein}g
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium">Carbs</span>
              <Progress value={analysis.nutritionInfo.carbs} />
              <span className="text-xs text-muted-foreground">
                {analysis.nutritionInfo.carbs}g
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium">Fat</span>
              <Progress value={analysis.nutritionInfo.fat} />
              <span className="text-xs text-muted-foreground">
                {analysis.nutritionInfo.fat}g
              </span>
            </div>
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