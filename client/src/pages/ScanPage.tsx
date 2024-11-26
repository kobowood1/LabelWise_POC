import { useState } from "react";
import ImageCapture from "../components/ImageCapture";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { performOCR, analyzeLabelContent } from "../lib/api";
import { Loader2 } from "lucide-react";

export default function ScanPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const handleImageCapture = async (image: File) => {
    setIsProcessing(true);
    try {
      // Process image with OCR
      const ocrResult = await performOCR(image);
      
      // Analyze extracted text
      const analysis = await analyzeLabelContent(ocrResult.text);
      
      setResults(analysis);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
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
            {/* Display analysis results here */}
            <pre className="bg-muted p-4 rounded-lg">
              {JSON.stringify(results, null, 2)}
            </pre>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setResults(null)}>New Scan</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
