import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { updatePreferences } from "../lib/api";
import MedicationInteractions from "../components/MedicationInteractions";
import React from 'react';

interface PreferencesFormData {
  name: string;
  email: string;
  allergies: string[];
  dietaryRestrictions: string[];
  healthConditions: string[];
}

export default function ProfilePage() {
  const { toast } = useToast();

  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ['user'],
    queryFn: () => fetch('/api/users/5').then(res => res.json()),
  });

  const { data: preferences, isLoading: isPreferencesLoading } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => fetch('/api/preferences/5').then(res => res.json()),
    enabled: !!userData,
  });

  const form = useForm<PreferencesFormData>({
    defaultValues: {
      name: "",
      email: "",
      allergies: [],
      dietaryRestrictions: [],
      healthConditions: [],
    },
  });

  // Update form when data is loaded
  React.useEffect(() => {
    if (userData && preferences) {
      form.reset({
        name: userData.name,
        email: userData.email,
        allergies: preferences.allergies || [],
        dietaryRestrictions: preferences.dietaryRestrictions || [],
        healthConditions: preferences.healthConditions || [],
      });
    }
  }, [userData, preferences, form]);

  const updatePreferencesMutation = useMutation({
    mutationFn: (data: PreferencesFormData) => 
      updatePreferences({ ...data, userId: 5 }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  if (isUserLoading || isPreferencesLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <img
          src="https://images.unsplash.com/photo-1527613426441-4da17471b66d"
          alt="Medical professional"
          className="w-16 h-16 rounded-full object-cover"
        />
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(data => updatePreferencesMutation.mutate(data))} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Health Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="allergies"
                render={() => (
                  <FormItem>
                    <FormLabel>Allergies</FormLabel>
                    <div className="grid grid-cols-2 gap-4">
                      {["Peanuts", "Dairy", "Gluten", "Shellfish"].map((allergy) => (
                        <FormField
                          key={allergy}
                          control={form.control}
                          name="allergies"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(allergy)}
                                  onCheckedChange={(checked) => {
                                    const values = field.value || [];
                                    if (checked) {
                                      field.onChange([...values, allergy]);
                                    } else {
                                      field.onChange(values.filter((v: string) => v !== allergy));
                                    }
                                  }}
                                />
                              </FormControl>
                              <span>{allergy}</span>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            className="w-full"
            disabled={updatePreferencesMutation.isPending}
          >
            {updatePreferencesMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </Form>

      <div className="mt-8">
        <MedicationInteractions />
      </div>
    </div>
  );
}