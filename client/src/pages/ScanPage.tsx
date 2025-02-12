import { useState } from "react";
import ImageCapture from "../components/ImageCapture";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { performOCR, analyzeLabelContent } from "../lib/api";
import { Loader2 } from "lucide-react";

interface AnalysisResult {
  summary: string;
  nutritionalAnalysis: {
    score: number;
    breakdown: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
      sugar: number;
      sodium: number;
      servingSize: string;
    };
  };
  ingredients: string[];
  allergens: string[];
  warnings: string[];
  recommendations: string[];
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ScanPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const handleImageCapture = async (image: File) => {
    // Validate image size and type
    if (image.size > MAX_IMAGE_SIZE) {
      toast({
        title: "Error",
        description: "Image size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    if (!ALLOWED_TYPES.includes(image.type)) {
      toast({
        title: "Error",
        description: "Please upload a valid image (JPEG, PNG, or WebP)",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Process image with OCR
      const ocrResult = await performOCR(image);

      if (!ocrResult.text) {
        throw new Error("No text could be extracted from the image");
      }

      // Analyze extracted text
      const analysis = await analyzeLabelContent(ocrResult.text);
      setResults(analysis);

      toast({
        title: "Success",
        description: "Label processed successfully",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to process image";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Scan processing error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderAnalysisResults = () => {
    if (!results) return null;

    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-muted p-4">
          <h3 className="font-semibold mb-2">Summary</h3>
          <p>{results.summary}</p>
        </div>

        <div className="rounded-lg bg-muted p-4">
          <h3 className="font-semibold mb-2">Nutritional Information</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>Calories: {results.nutritionalAnalysis.breakdown.calories}</div>
            <div>Protein: {results.nutritionalAnalysis.breakdown.protein}g</div>
            <div>Carbs: {results.nutritionalAnalysis.breakdown.carbs}g</div>
            <div>Fat: {results.nutritionalAnalysis.breakdown.fat}g</div>
          </div>
        </div>

        {results.warnings.length > 0 && (
          <div className="rounded-lg bg-yellow-50 p-4">
            <h3 className="font-semibold mb-2">Warnings</h3>
            <ul className="list-disc pl-4">
              {results.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {results.allergens.length > 0 && (
          <div className="rounded-lg bg-red-50 p-4">
            <h3 className="font-semibold mb-2">Allergens</h3>
            <ul className="list-disc pl-4">
              {results.allergens.map((allergen, index) => (
                <li key={index}>{allergen}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Scan Label</h1>

      <ImageCapture onImageCapture={handleImageCapture} />

      {isProcessing && (
        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Processing image...</span>
          </CardContent>
        </Card>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            {renderAnalysisResults()}
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setResults(null)}>New Scan</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}