import { Loader2, Sparkles, Brain } from "lucide-react";
import { Progress } from "./progress";

interface LoadingOverlayProps {
  progress: number;
}

export function LoadingOverlay({ progress }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative w-16 h-16">
            <Loader2 className="w-16 h-16 animate-spin text-primary" />
            <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-primary">Label Wise is analyzing your image</h3>
            <p className="text-sm text-muted-foreground">Using advanced AI to extract detailed information</p>
          </div>
          <div className="w-full max-w-xs">
            <Progress value={progress} className="h-2" />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="w-4 h-4" />
            <span>Processing step {Math.floor(progress / 20) + 1} of 5</span>
          </div>
        </div>
      </div>
    </div>
  );
}
