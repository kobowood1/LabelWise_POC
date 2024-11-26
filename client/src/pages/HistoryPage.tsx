import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUserScans } from "../lib/api";
import { Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function HistoryPage() {
  const { data: scans, isLoading } = useQuery({
    queryKey: ["scans"],
    queryFn: () => getUserScans(1), // TODO: Get actual user ID
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Scan History</h1>
        <Button variant="outline">
          <Calendar className="mr-2 h-4 w-4" />
          Filter by Date
        </Button>
      </header>

      <div className="grid gap-6">
        {scans?.map((scan: any) => (
          <Card key={scan.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Scan from {format(new Date(scan.createdAt), "PPP")}</span>
                <Button variant="ghost" size="sm">
                  View Details
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div>
                <img
                  src={scan.imageUrl}
                  alt="Scanned label"
                  className="rounded-lg w-full h-48 object-cover"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Analysis Results</h3>
                  <p className="text-sm text-muted-foreground">
                    {scan.analysis.summary}
                  </p>
                </div>
                {scan.allergenAlerts.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-red-500">Allergen Alerts</h3>
                    <ul className="list-disc list-inside text-sm">
                      {scan.allergenAlerts.map((alert: string, index: number) => (
                        <li key={index}>{alert}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
