import { ArrowLeft, Moon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

export default function DinnerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(220,26%,10%)] to-[hsl(220,26%,14%)]">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/member/diet-planner">
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 flex items-center justify-center">
              <Moon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Dinner</h1>
              <p className="text-white/60 text-sm mt-1">End your day healthy</p>
            </div>
          </div>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
                <span className="text-5xl">🌙</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Coming Soon</h2>
              <p className="text-white/60 text-lg">Dinner items will be shown here.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
