import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";

export default function HomePage() {
  const [, navigate] = useLocation();

  return (
    <div className="space-y-8">
      <section className="hero relative h-[400px] rounded-lg overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d"
          alt="Medical professional"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-center text-white space-y-4 p-6">
            <h1 className="text-4xl font-bold">Smart Label Analysis</h1>
            <p className="text-xl">Understand your nutrition and medication labels instantly</p>
            <Button 
              size="lg" 
              onClick={() => navigate("/scan")}
              className="bg-primary hover:bg-primary/90"
            >
              Start Scanning
            </Button>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Instant Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Get detailed insights about ingredients and nutritional information in seconds.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Receive personalized alerts about allergens and dietary restrictions.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Track History</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Save and review your previous scans for easy reference.</p>
          </CardContent>
        </Card>
      </div>

      <section className="mt-12">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <img
            src="https://images.unsplash.com/photo-1493770348161-369560ae357d"
            alt="Healthy lifestyle"
            className="rounded-lg"
          />
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">Make Informed Decisions</h2>
            <p className="text-lg">
              Our advanced AI-powered analysis helps you understand what's in your food
              and medications, making it easier to maintain a healthy lifestyle.
            </p>
            <Button onClick={() => navigate("/profile")}>Create Profile</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
