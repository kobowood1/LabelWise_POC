import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { addMedication, getUserMedications, checkMedicationInteractions } from "../lib/api";
import { Pill, AlertTriangle, Plus } from "lucide-react";

export default function MedicationInteractions() {
  const { toast } = useToast();
  const [selectedMeds, setSelectedMeds] = useState<number[]>([]);
  const [interactions, setInteractions] = useState<any>(null);

  const { data: medications, isLoading } = useQuery({
    queryKey: ["medications"],
    queryFn: () => getUserMedications(1), // Using userId 1 for testing
  });

  const checkInteractionsMutation = useMutation({
    mutationFn: async (medicationId: number) => {
      const otherMeds = selectedMeds.filter(id => id !== medicationId);
      return checkMedicationInteractions(medicationId, otherMeds);
    },
    onSuccess: (data) => {
      setInteractions(data);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to check medication interactions",
        variant: "destructive",
      });
    },
  });

  const addTestMedsMutation = useMutation({
    mutationFn: () => fetch("/api/medications/test", { method: "POST" }).then(res => res.json()),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Test medications added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add test medications",
        variant: "destructive",
      });
    },
  });

  const handleCheckInteractions = (medicationId: number) => {
    if (selectedMeds.length < 2) {
      toast({
        title: "Warning",
        description: "Please select at least two medications to check interactions",
        variant: "warning",
      });
      return;
    }
    checkInteractionsMutation.mutate(medicationId);
  };

  const toggleMedication = (medicationId: number) => {
    setSelectedMeds(prev => 
      prev.includes(medicationId)
        ? prev.filter(id => id !== medicationId)
        : [...prev, medicationId]
    );
    setInteractions(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Pill className="mr-2 h-5 w-5" />
              Medication Interactions
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addTestMedsMutation.mutate()}
              disabled={addTestMedsMutation.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Test Medications
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading medications...</div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4">
                {medications?.map((med: any) => (
                  <div key={med.id} className="flex items-center space-x-4">
                    <Checkbox
                      checked={selectedMeds.includes(med.id)}
                      onCheckedChange={() => toggleMedication(med.id)}
                    />
                    <div>
                      <p className="font-medium">{med.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {med.dosage} - {med.frequency}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {selectedMeds.length >= 2 && (
                <Button
                  onClick={() => handleCheckInteractions(selectedMeds[0])}
                  disabled={checkInteractionsMutation.isPending}
                >
                  Check Interactions
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {interactions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Interaction Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {interactions.interactions?.map((interaction: any, index: number) => (
              <div key={index} className="mb-4 p-4 rounded-lg border">
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`px-2 py-1 rounded text-sm ${
                    interaction.severity === 'severe' ? 'bg-red-100 text-red-800' :
                    interaction.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {interaction.severity.toUpperCase()}
                  </span>
                </div>
                <p className="mb-2">{interaction.description}</p>
                <div className="space-y-1">
                  {interaction.recommendations.map((rec: string, i: number) => (
                    <p key={i} className="text-sm text-muted-foreground">• {rec}</p>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
