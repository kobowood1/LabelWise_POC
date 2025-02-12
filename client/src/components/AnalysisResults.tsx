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

  // Function to clean markdown and format text
  const cleanText = (text: string): string => {
    return text
      .replace(/^###\s*/gm, '') // Remove markdown headers
      .replace(/^\d+\.\s*/gm, '') // Remove numbered list markers
      .replace(/^\s*[-*]\s*/gm, '') // Remove bullet points
      .replace(/`([^`]+)`/g, '$1') // Remove code blocks
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markers
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic markers
      .replace(/_{2,}/g, '') // Remove horizontal rules
      .replace(/#+\s*/g, '') // Remove any remaining header markers
      .trim();
  };

  // Function to split content into paragraphs and parse potential lists
  const formatContent = (content: string) => {
    const cleanedContent = cleanText(content);

    return cleanedContent.split(/\n+/).map((paragraph, index) => {
      // Check if the paragraph starts with a bullet point or number
      if (paragraph.match(/^[-•*]|\d+\./)) {
        const items = paragraph
          .split(/\n/)
          .map(item => item.replace(/^[-•*]\s*|\d+\.\s*/, '').trim())
          .filter(Boolean);

        return (
          <ul key={index} className="list-disc list-inside space-y-1 ml-4">
            {items.map((item, itemIndex) => (
              <li key={itemIndex} className="text-gray-700">{item}</li>
            ))}
          </ul>
        );
      }
      return <p key={index} className="mb-2 text-gray-700">{paragraph}</p>;
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {sections.map(({ title, content, icon: Icon, className }, index) => {
        if (!content) return null;

        return (
          <Card key={index} className={className}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
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