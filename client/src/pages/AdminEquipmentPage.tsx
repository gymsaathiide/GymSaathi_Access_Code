import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Dumbbell, Check, X } from "lucide-react";

interface Equipment {
  id: number;
  name: string;
  category: string;
  enabled: boolean;
}

export default function AdminEquipmentPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["gym-equipment"],
    queryFn: async () => {
      const res = await fetch("/api/training/gym-equipment", { credentials: "include" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch equipment");
      }
      return res.json();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ equipmentId, enabled }: { equipmentId: number; enabled: boolean }) => {
      const res = await fetch(`/api/training/gym-equipment/${equipmentId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update equipment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gym-equipment"] });
      toast({ title: "Success", description: "Equipment updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const equipment: Equipment[] = data?.equipment || [];
  const categories = [...new Set(equipment.map((e) => e.category))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <X className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="font-semibold mb-2 text-red-400">Error Loading Equipment</h3>
            <p className="text-muted-foreground mb-4">{(error as Error).message}</p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["gym-equipment"] })} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gym Equipment</h1>
        <p className="text-muted-foreground">Enable or disable equipment available at your gym. Members will only see exercises that use enabled equipment.</p>
      </div>

      {categories.map((category) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-orange-500" />
              {category}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {equipment
                .filter((e) => e.category === category)
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-card border"
                  >
                    <div className="flex items-center gap-3">
                      {item.enabled ? (
                        <Check className="h-5 w-5 text-green-500" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className={item.enabled ? "text-white" : "text-muted-foreground"}>
                        {item.name}
                      </span>
                    </div>
                    <Switch
                      checked={item.enabled}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ equipmentId: item.id, enabled: checked })
                      }
                      disabled={item.name === "Bodyweight"}
                    />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {equipment.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Equipment Found</h3>
            <p className="text-muted-foreground">Contact your superadmin to add equipment to the system.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
