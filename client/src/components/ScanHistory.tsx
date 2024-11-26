import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, ChevronRight } from "lucide-react";

interface Scan {
  id: number;
  imageUrl: string;
  createdAt: string;
  analysis: {
    summary: string;
    allergenAlerts: string[];
    nutritionScore: number;
  };
}

interface ScanHistoryProps {
  scans: Scan[];
  onViewDetails: (scanId: number) => void;
}

export default function ScanHistory({ scans, onViewDetails }: ScanHistoryProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Recent Scans</h2>
        <Button variant="outline">
          <Calendar className="mr-2 h-4 w-4" />
          View Calendar
        </Button>
      </div>

      <div className="grid gap-4">
        {scans.map((scan) => (
          <Card key={scan.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-stretch">
                <div className="relative w-48 min-h-[200px]">
                  <img
                    src={scan.imageUrl || "https://images.unsplash.com/photo-1627652284604-b17cd9520b9e"}
                    alt="Scanned label"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1 p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">
                        Scan from {format(new Date(scan.createdAt), "PPP")}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {scan.analysis.summary}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(scan.id)}
                    >
                      <span className="mr-2">View Details</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-4">
                    {scan.analysis.allergenAlerts.length > 0 && (
                      <div className="flex items-center space-x-2 text-red-600 mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">Allergen Alerts</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant={
                        scan.analysis.nutritionScore > 7 ? "default" :
                        scan.analysis.nutritionScore > 4 ? "secondary" : "destructive"
                      }>
                        Nutrition Score: {scan.analysis.nutritionScore}/10
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
