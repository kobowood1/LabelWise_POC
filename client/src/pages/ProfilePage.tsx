import { useForm } from "react-hook-form";
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

export default function ProfilePage() {
  const { toast } = useToast();
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      allergies: [] as string[],
      dietaryRestrictions: [] as string[],
      healthConditions: [] as string[],
    },
  });

  const onSubmit = async (data: any) => {
    try {
      await updatePreferences(data);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

          <Button type="submit" className="w-full">
            Save Changes
          </Button>
        </form>
      </Form>
    </div>
  );
}
