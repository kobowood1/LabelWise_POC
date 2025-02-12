import { useState } from "react";
import ImageCapture from "../components/ImageCapture";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Brain } from "lucide-react";
import AnalysisResults from "@/components/AnalysisResults";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface AnalysisResult {
  productOverview: string;
  nutritionalInformation: string;
  ingredientsAnalysis: string;
  healthImplications: string;
  allergenInformation: string;
  usageInstructions: string;
  warnings: string;
  storageInformation: string;
  additionalDetails: string;
  rawAnalysis: string;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ScanPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [progress, setProgress] = useState(0);
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
    setProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 1000);

      // Convert image to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Image = reader.result as string;

        // Send the base64 image to the server for analysis
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: base64Image
          }),
        });

        clearInterval(progressInterval);
        setProgress(100);

        if (!response.ok) {
          throw new Error("Failed to analyze image");
        }

        const analysis = await response.json();
        setResults(analysis);

        toast({
          title: "Success",
          description: "Label analyzed successfully",
        });
      };

      reader.readAsDataURL(image);
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
      setProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Scan Label</h1>

      <ImageCapture onImageCapture={handleImageCapture} />

      {isProcessing && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
            <div className="relative w-16 h-16">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
              <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-primary">Label Wise is analyzing your image</h3>
              <p className="text-sm text-muted-foreground">Using advanced AI to extract detailed information</p>
            </div>
            <div className="w-full max-w-xs">
              <Progress value={progress} className="h-2" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Brain className="w-4 h-4" />
              <span>Processing step {Math.floor(progress / 20) + 1} of 5</span>
            </div>
          </CardContent>
        </Card>
      )}

      {results && (
        <AnalysisResults analysis={results} />
      )}
    </div>
  );
}