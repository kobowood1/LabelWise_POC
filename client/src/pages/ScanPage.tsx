import { useState } from "react";
import ImageCapture from "../components/ImageCapture";
import { useToast } from "@/hooks/use-toast";
import AnalysisResults from "@/components/AnalysisResults";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

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

      {isProcessing && <LoadingOverlay progress={progress} />}

      {results && (
        <AnalysisResults analysis={results} />
      )}
    </div>
  );
}