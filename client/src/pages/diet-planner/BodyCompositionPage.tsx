import { useState, useRef } from "react";
import {
  ArrowLeft,
  Upload,
  Loader2,
  Save,
  History,
  PenLine,
  Activity,
  Zap,
  Flame,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "wouter";

type LifestyleType = "sedentary" | "moderately_active" | "super_active";
type StatusLevel = "low" | "standard" | "high" | "excellent";

interface ReportData {
  id?: string;
  user_name?: string;
  report_date?: string;
  weight?: number;
  bmi?: number;
  body_fat_percentage?: number;
  fat_mass?: number;
  fat_free_body_weight?: number;
  muscle_mass?: number;
  muscle_rate?: number;
  skeletal_muscle?: number;
  bone_mass?: number;
  protein_mass?: number;
  protein?: number;
  water_weight?: number;
  body_water?: number;
  subcutaneous_fat?: number;
  visceral_fat?: number;
  bmr?: number;
  body_age?: number;
  ideal_body_weight?: number;
  lifestyle?: LifestyleType;
}

const LIFESTYLE_OPTIONS = [
  {
    value: "sedentary" as LifestyleType,
    label: "Sedentary",
    labelHindi: "बैठी जीवनशैली",
    description: "Mostly sitting, little or no exercise",
    icon: Activity,
    color: "from-gray-500 to-gray-600",
  },
  {
    value: "moderately_active" as LifestyleType,
    label: "Moderately Active",
    labelHindi: "मध्यम सक्रिय",
    description: "Exercise 3-5 days/week or active job",
    icon: Zap,
    color: "from-blue-500 to-cyan-500",
  },
  {
    value: "super_active" as LifestyleType,
    label: "Super Active",
    labelHindi: "अति सक्रिय",
    description: "Intense training 6-7 days/week",
    icon: Flame,
    color: "from-orange-500 to-red-500",
  },
];

const getEmptyReportData = (): ReportData => ({
  user_name: "",
  report_date: new Date().toISOString().slice(0, 16),
  weight: undefined,
  bmi: undefined,
  body_fat_percentage: undefined,
  fat_mass: undefined,
  fat_free_body_weight: undefined,
  muscle_mass: undefined,
  muscle_rate: undefined,
  skeletal_muscle: undefined,
  bone_mass: undefined,
  protein_mass: undefined,
  protein: undefined,
  water_weight: undefined,
  body_water: undefined,
  subcutaneous_fat: undefined,
  visceral_fat: undefined,
  bmr: undefined,
  body_age: undefined,
  ideal_body_weight: undefined,
  lifestyle: "moderately_active",
});

function getMetricStatus(
  metric: string,
  value: number | undefined,
): { status: StatusLevel; color: string } {
  if (value === undefined || value === null)
    return { status: "standard", color: "text-muted-foreground" };

  switch (metric) {
    case "weight":
      return { status: "high", color: "text-orange-500" };
    case "bmi":
      if (value < 18.5) return { status: "low", color: "text-yellow-500" };
      if (value <= 24.9) return { status: "standard", color: "text-green-500" };
      return { status: "high", color: "text-orange-500" };
    case "body_fat_percentage":
      if (value < 10) return { status: "low", color: "text-yellow-500" };
      if (value <= 20) return { status: "standard", color: "text-green-500" };
      return { status: "high", color: "text-orange-500" };
    case "muscle_mass":
    case "skeletal_muscle":
      if (value > 40) return { status: "excellent", color: "text-green-500" };
      if (value > 30) return { status: "standard", color: "text-green-500" };
      return { status: "low", color: "text-yellow-500" };
    case "bone_mass":
      if (value >= 2.5 && value <= 4)
        return { status: "standard", color: "text-green-500" };
      return { status: "low", color: "text-yellow-500" };
    case "protein":
      if (value > 16) return { status: "excellent", color: "text-green-500" };
      if (value >= 14) return { status: "standard", color: "text-green-500" };
      return { status: "low", color: "text-yellow-500" };
    case "body_water":
      if (value >= 50) return { status: "excellent", color: "text-green-500" };
      if (value >= 45) return { status: "standard", color: "text-green-500" };
      return { status: "low", color: "text-yellow-500" };
    case "subcutaneous_fat":
      if (value > 25) return { status: "high", color: "text-orange-500" };
      if (value >= 15) return { status: "standard", color: "text-green-500" };
      return { status: "low", color: "text-yellow-500" };
    case "visceral_fat":
      if (value > 12) return { status: "high", color: "text-orange-500" };
      if (value >= 1) return { status: "standard", color: "text-green-500" };
      return { status: "low", color: "text-yellow-500" };
    case "body_age":
      return { status: "high", color: "text-orange-500" };
    default:
      return { status: "standard", color: "text-muted-foreground" };
  }
}

interface MetricCardProps {
  label: string;
  value: number | string | undefined;
  unit?: string;
  type?: "number" | "text" | "datetime-local";
  onChange: (value: number | string) => void;
  showStatus?: boolean;
  statusMetric?: string;
  fullWidth?: boolean;
}

function MetricCard({
  label,
  value,
  unit,
  type = "number",
  onChange,
  showStatus = false,
  statusMetric,
  fullWidth = false,
}: MetricCardProps) {
  const { status, color } = statusMetric
    ? getMetricStatus(statusMetric, value as number)
    : { status: "standard", color: "" };

  return (
    <div
      className={`bg-card border border-border rounded-xl p-4 ${fullWidth ? "col-span-full" : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm text-muted-foreground">{label}</Label>
        {showStatus && status !== "standard" && (
          <span className={`text-xs font-medium capitalize ${color}`}>
            {status === "excellent"
              ? "Excellent"
              : status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        )}
      </div>
      {showStatus && (
        <div className="flex gap-2 mb-2">
          <span
            className={`text-xs ${status === "low" ? color : "text-muted-foreground/50"}`}
          >
            Low
          </span>
          <span
            className={`text-xs ${status === "standard" ? "text-green-500" : "text-muted-foreground/50"}`}
          >
            Standard
          </span>
          <span
            className={`text-xs ${status === "high" ? color : "text-muted-foreground/50"}`}
          >
            High
          </span>
          {(statusMetric === "muscle_mass" ||
            statusMetric === "protein" ||
            statusMetric === "body_water") && (
            <span
              className={`text-xs ${status === "excellent" ? "text-green-500" : "text-muted-foreground/50"}`}
            >
              Excellent
            </span>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          type={type}
          value={value ?? ""}
          onChange={(e) => {
            if (type === "number") {
              onChange(e.target.value ? parseFloat(e.target.value) : 0);
            } else {
              onChange(e.target.value);
            }
          }}
          className="bg-background/50 border-0"
        />
        {unit && (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

export default function BodyCompositionPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedData, setParsedData] = useState<ReportData | null>(null);
  const [entryMode, setEntryMode] = useState<"upload" | "manual">("manual");
  const [formData, setFormData] = useState<ReportData>(getEmptyReportData());
  const [showSuccess, setShowSuccess] = useState(false);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image (JPG, PNG, WEBP) or PDF file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setParsedData(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;

        try {
          const response = await fetch(
            "/api/diet-planner/parse-body-composition",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                imageData: base64Data,
                fileName: file.name,
              }),
            },
          );

          const data = await response.json();

          if (!response.ok || !data.success) {
            toast({
              title: "Processing Error",
              description: data.error || "Failed to process the report",
              variant: "destructive",
            });
            setIsProcessing(false);
            return;
          }

          const parsed = data.data;
          const parsedWithDefaults: ReportData = {
            ...parsed,
            report_date:
              parsed.report_date || new Date().toISOString().slice(0, 16),
            lifestyle: "moderately_active",
          };

          setParsedData(parsedWithDefaults);
          setFormData(parsedWithDefaults);

          toast({
            title: "Success!",
            description:
              "Body composition report processed successfully. Review and save the data below.",
          });
        } catch (fetchError) {
          console.error("Fetch error:", fetchError);
          toast({
            title: "Connection Error",
            description: "Could not connect to the AI service",
            variant: "destructive",
          });
        }

        setIsProcessing(false);
      };

      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to read file",
          variant: "destructive",
        });
        setIsProcessing(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setIsProcessing(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!formData.weight && !formData.bmi && !formData.body_fat_percentage) {
      toast({
        title: "Missing Data",
        description: "Please enter at least Weight, BMI, or Body Fat %",
        variant: "destructive",
      });
      return;
    }

    if (!formData.lifestyle) {
      toast({
        title: "Lifestyle Required",
        description:
          "Please select your lifestyle to help us calculate your daily calorie targets",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/diet-planner/body-composition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save body composition data");
      }

      const lifestyleLabel =
        LIFESTYLE_OPTIONS.find((o) => o.value === formData.lifestyle)?.label ||
        "Moderately Active";
      toast({
        title: "Saved!",
        description: `Body report saved! Redirecting to Diet Planner...`,
      });

      setTimeout(() => {
        navigate("/member/diet-planner");
      }, 1000);
    } catch (error: any) {
      console.error("Error saving:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save body composition data",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNewReport = () => {
    setParsedData(null);
    setFormData(getEmptyReportData());
    setShowSuccess(false);
  };

  const updateField = (field: keyof ReportData, value: number | string) => {
    setFormData({ ...formData, [field]: value });
  };

  const renderForm = (
    data: ReportData,
    updateFn: (field: keyof ReportData, value: number | string) => void,
  ) => (
    <div className="space-y-6">
      <Card className="border-2 border-cyan-500/30 bg-cyan-500/5">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricCard
              label="Name"
              value={data.user_name || ""}
              onChange={(v) => updateFn("user_name", v as string)}
              type="text"
            />
            <MetricCard
              label="Date & Time"
              value={data.report_date || ""}
              onChange={(v) => updateFn("report_date", v as string)}
              type="datetime-local"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="Weight"
          value={data.weight}
          unit="kg"
          onChange={(v) => updateFn("weight", v as number)}
          showStatus
          statusMetric="weight"
        />
        <MetricCard
          label="BMI"
          value={data.bmi}
          onChange={(v) => updateFn("bmi", v as number)}
          showStatus
          statusMetric="bmi"
        />
        <MetricCard
          label="Body Fat"
          value={data.body_fat_percentage}
          unit="%"
          onChange={(v) => updateFn("body_fat_percentage", v as number)}
          showStatus
          statusMetric="body_fat_percentage"
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">
          Detailed Body Composition
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            label="Fat Mass"
            value={data.fat_mass}
            unit="kg"
            onChange={(v) => updateFn("fat_mass", v as number)}
            showStatus
            statusMetric="fat_mass"
          />
          <MetricCard
            label="Fat-Free Body Weight"
            value={data.fat_free_body_weight}
            unit="kg"
            onChange={(v) => updateFn("fat_free_body_weight", v as number)}
            showStatus
            statusMetric="fat_free_body_weight"
          />
          <MetricCard
            label="Muscle Mass"
            value={data.muscle_mass}
            unit="kg"
            onChange={(v) => updateFn("muscle_mass", v as number)}
            showStatus
            statusMetric="muscle_mass"
          />
          <MetricCard
            label="Muscle Rate"
            value={data.muscle_rate}
            unit="%"
            onChange={(v) => updateFn("muscle_rate", v as number)}
            showStatus
            statusMetric="muscle_rate"
          />
          <MetricCard
            label="Skeletal Muscle"
            value={data.skeletal_muscle}
            unit="kg"
            onChange={(v) => updateFn("skeletal_muscle", v as number)}
            showStatus
            statusMetric="skeletal_muscle"
          />
          <MetricCard
            label="Bone Mass"
            value={data.bone_mass}
            unit="kg"
            onChange={(v) => updateFn("bone_mass", v as number)}
            showStatus
            statusMetric="bone_mass"
          />
          <MetricCard
            label="Protein Mass"
            value={data.protein_mass}
            unit="kg"
            onChange={(v) => updateFn("protein_mass", v as number)}
            showStatus
            statusMetric="protein_mass"
          />
          <MetricCard
            label="Protein"
            value={data.protein}
            unit="%"
            onChange={(v) => updateFn("protein", v as number)}
            showStatus
            statusMetric="protein"
          />
          <MetricCard
            label="Water Weight"
            value={data.water_weight}
            unit="kg"
            onChange={(v) => updateFn("water_weight", v as number)}
            showStatus
            statusMetric="water_weight"
          />
          <MetricCard
            label="Body Water"
            value={data.body_water}
            unit="%"
            onChange={(v) => updateFn("body_water", v as number)}
            showStatus
            statusMetric="body_water"
          />
          <MetricCard
            label="Subcutaneous Fat"
            value={data.subcutaneous_fat}
            unit="%"
            onChange={(v) => updateFn("subcutaneous_fat", v as number)}
            showStatus
            statusMetric="subcutaneous_fat"
          />
          <MetricCard
            label="Visceral Fat"
            value={data.visceral_fat}
            unit="level"
            onChange={(v) => updateFn("visceral_fat", v as number)}
            showStatus
            statusMetric="visceral_fat"
          />
          <MetricCard
            label="BMR (Basal Metabolic Rate)"
            value={data.bmr}
            unit="kcal"
            onChange={(v) => updateFn("bmr", v as number)}
          />
          <MetricCard
            label="Body Age"
            value={data.body_age}
            unit="years"
            onChange={(v) => updateFn("body_age", v as number)}
            showStatus
            statusMetric="body_age"
          />
          <MetricCard
            label="Ideal Body Weight"
            value={data.ideal_body_weight}
            unit="kg"
            onChange={(v) => updateFn("ideal_body_weight", v as number)}
            fullWidth
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">
          Your Lifestyle <span className="text-red-500">*</span>
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose your typical daily activity level. This helps us calculate your
          daily calorie and macro targets.
        </p>

        <RadioGroup
          value={data.lifestyle || ""}
          onValueChange={(value) => updateFn("lifestyle", value)}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {LIFESTYLE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = data.lifestyle === option.value;
            return (
              <div
                key={option.value}
                className={`relative rounded-xl p-4 border-2 cursor-pointer transition-all ${
                  isSelected
                    ? "border-cyan-500 bg-cyan-500/10"
                    : "border-border hover:border-cyan-500/50"
                }`}
                onClick={() => updateFn("lifestyle", option.value)}
              >
                <RadioGroupItem value={option.value} className="sr-only" />
                <div className="flex flex-col items-center text-center gap-2">
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${option.color} flex items-center justify-center`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{option.label}</h4>
                    <p className="text-xs text-muted-foreground">
                      {option.labelHindi}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
            );
          })}
        </RadioGroup>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          You can change your lifestyle anytime by uploading a new report.
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-20 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/member">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Body Composition Analysis</h1>
        </div>
        <Link href="/member/diet-planner/history">
          <Button variant="outline" className="gap-2">
            <History className="w-4 h-4" />
            View History
          </Button>
        </Link>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      {showSuccess ? (
        <div className="text-center py-12 space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
            <Save className="w-10 h-10 text-green-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-green-500">
              Report Saved Successfully!
            </h2>
            <p className="text-muted-foreground mt-2">
              Your body composition data has been saved.
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <Link href="/member/diet-planner">
              <Button size="lg">Go to Diet Planner</Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              onClick={handleAddNewReport}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Add New Report
            </Button>
          </div>
        </div>
      ) : parsedData ? (
        <div className="space-y-6">
          {renderForm(formData, updateField)}

          <div className="flex gap-4 sticky bottom-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-cyan-500 hover:bg-cyan-600"
              size="lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleAddNewReport}
              size="lg"
              className="flex-1 gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Add New Report
            </Button>
          </div>
        </div>
      ) : (
        <Tabs
          value={entryMode}
          onValueChange={(v) => setEntryMode(v as "upload" | "manual")}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <PenLine className="w-4 h-4" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload Report
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-6">
            {renderForm(formData, updateField)}

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-cyan-500 hover:bg-cyan-600"
              size="lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Body Composition
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardContent className="p-8">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center">
                    <Upload className="w-10 h-10 text-cyan-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">
                      Upload Body Composition Report
                    </h3>
                    <p className="text-muted-foreground">
                      Upload an image or PDF of your body composition report.
                      Our AI will extract the data automatically.
                    </p>
                  </div>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    size="lg"
                    className="gap-2 bg-cyan-500 hover:bg-cyan-600"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Select File
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Supported: JPG, PNG, WEBP, PDF (max 10MB)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
