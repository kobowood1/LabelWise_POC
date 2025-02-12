import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, Package, Heart, Apple, AlertCircle, ThermometerSun, Award } from "lucide-react";

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

interface AnalysisResultsProps {
  analysis: AnalysisResult;
  className?: string;
}

export default function AnalysisResults({ analysis, className }: AnalysisResultsProps) {
  const sections = [
    {
      title: "Product Overview",
      content: analysis.productOverview,
      icon: Package,
      className: "bg-primary/5"
    },
    {
      title: "Nutritional Information",
      content: analysis.nutritionalInformation,
      icon: Apple,
      className: "bg-green-50"
    },
    {
      title: "Ingredients Analysis",
      content: analysis.ingredientsAnalysis,
      icon: Info,
      className: "bg-blue-50"
    },
    {
      title: "Health Implications",
      content: analysis.healthImplications,
      icon: Heart,
      className: "bg-red-50"
    },
    {
      title: "Allergen Information",
      content: analysis.allergenInformation,
      icon: AlertTriangle,
      className: "bg-yellow-50"
    },
    {
      title: "Usage Instructions",
      content: analysis.usageInstructions,
      icon: Info,
      className: "bg-indigo-50"
    },
    {
      title: "Warnings",
      content: analysis.warnings,
      icon: AlertCircle,
      className: "bg-orange-50"
    },
    {
      title: "Storage Information",
      content: analysis.storageInformation,
      icon: ThermometerSun,
      className: "bg-purple-50"
    },
    {
      title: "Additional Details",
      content: analysis.additionalDetails,
      icon: Award,
      className: "bg-gray-50"
    }
  ];

  // Function to split content into paragraphs and parse potential lists
  const formatContent = (content: string) => {
    return content.split(/\n+/).map((paragraph, index) => {
      // Check if the paragraph starts with a bullet point or number
      if (paragraph.match(/^[-•*]|\d+\./)) {
        const items = paragraph
          .split(/\n/)
          .map(item => item.replace(/^[-•*]\s*|\d+\.\s*/, '').trim())
          .filter(Boolean);

        return (
          <ul key={index} className="list-disc list-inside space-y-1">
            {items.map((item, itemIndex) => (
              <li key={itemIndex}>{item}</li>
            ))}
          </ul>
        );
      }
      return <p key={index} className="mb-2">{paragraph}</p>;
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {sections.map(({ title, content, icon: Icon, className }, index) => {
        if (!content) return null;

        return (
          <Card key={index} className={className}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                <span>{title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {formatContent(content)}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}