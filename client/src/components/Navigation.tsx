import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Camera, User, History, Home } from "lucide-react";

export default function Navigation() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4">
        <NavigationMenu className="py-4">
          <NavigationMenuList className="flex items-center justify-between w-full">
            <NavigationMenuItem>
              <Link href="/">
                <Button variant="ghost" className="text-xl font-bold">
                  LabelWise
                </Button>
              </Link>
            </NavigationMenuItem>

            <div className="flex items-center space-x-4">
              <NavigationMenuItem>
                <Link href="/">
                  <Button variant="ghost">
                    <Home className="mr-2 h-4 w-4" />
                    Home
                  </Button>
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link href="/scan">
                  <Button variant="ghost">
                    <Camera className="mr-2 h-4 w-4" />
                    Scan
                  </Button>
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link href="/history">
                  <Button variant="ghost">
                    <History className="mr-2 h-4 w-4" />
                    History
                  </Button>
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link href="/profile">
                  <Button variant="ghost">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Button>
                </Link>
              </NavigationMenuItem>
            </div>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  );
}
