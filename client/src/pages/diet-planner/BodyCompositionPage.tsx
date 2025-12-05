import { useState, useRef } from "react";
import { ArrowLeft, Upload, Loader2, Save, History, PenLine, Activity, Zap, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";

type LifestyleType = 'sedentary' | 'moderately_active' | 'super_active';

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
    value: 'sedentary' as LifestyleType,
    label: 'Sedentary',
    labelHindi: 'बैठी जीवनशैली',
    description: 'Mostly sitting, little or no exercise',
    icon: Activity,
    color: 'from-gray-500 to-gray-600'
  },
  {
    value: 'moderately_active' as LifestyleType,
    label: 'Moderately Active',
    labelHindi: 'मध्यम सक्रिय',
    description: 'Exercise 3-5 days/week or active job',
    icon: Zap,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    value: 'super_active' as LifestyleType,
    label: 'Super Active',
    labelHindi: 'अति सक्रिय',
    description: 'Intense training 6-7 days/week',
    icon: Flame,
    color: 'from-orange-500 to-red-500'
  }
];

const getEmptyReportData = (): ReportData => ({
  user_name: '',
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
  lifestyle: 'moderately_active',
});

interface MetricInputProps {
  label: string;
  value: number | string | undefined;
  unit?: string;
  type?: 'number' | 'text' | 'datetime-local';
  onChange: (value: number | string) => void;
}

function MetricInput({ label, value, unit, type = 'number', onChange }: MetricInputProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type={type}
          value={value ?? ''}
          onChange={(e) => {
            if (type === 'number') {
              onChange(e.target.value ? parseFloat(e.target.value) : 0);
            } else {
              onChange(e.target.value);
            }
          }}
          className="pr-12"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [entryMode, setEntryMode] = useState<'upload' | 'manual'>('manual');
  const [manualData, setManualData] = useState<ReportData>(getEmptyReportData());

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
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
    setReportData(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;

        try {
          const response = await fetch('/api/diet-planner/parse-body-composition', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              imageData: base64Data,
              fileName: file.name,
            }),
          });

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

          setReportData(data.data);
          toast({
            title: "Success!",
            description: "Body composition report processed successfully",
          });
        } catch (fetchError) {
          console.error('Fetch error:', fetchError);
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
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handleSaveManualEntry = async () => {
    if (!manualData.weight && !manualData.bmi && !manualData.body_fat_percentage) {
      toast({
        title: "Missing Data",
        description: "Please enter at least Weight, BMI, or Body Fat %",
        variant: "destructive",
      });
      return;
    }

    if (!manualData.lifestyle) {
      toast({
        title: "Lifestyle Required",
        description: "Please select your lifestyle to help us calculate your daily calorie targets",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/diet-planner/body-composition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(manualData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save body composition data');
      }

      const lifestyleLabel = LIFESTYLE_OPTIONS.find(o => o.value === manualData.lifestyle)?.label || 'Moderately Active';
      toast({
        title: "Saved!",
        description: `Body report saved! Your lifestyle is set to ${lifestyleLabel}. This will be used to calculate your calories and macros.`,
      });
      setManualData(getEmptyReportData());
      setReportData(data.report);
    } catch (error: any) {
      console.error('Error saving manual entry:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save body composition data",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateManualField = (field: keyof ReportData, value: number | string) => {
    setManualData({ ...manualData, [field]: value });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/member">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Body Composition Analysis</h1>
            <p className="text-muted-foreground text-sm">Track your body metrics and progress</p>
          </div>
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

      {!reportData && (
        <Tabs value={entryMode} onValueChange={(v) => setEntryMode(v as 'upload' | 'manual')} className="space-y-6">
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                    <PenLine className="w-5 h-5 text-white" />
                  </div>
                  Enter Your Measurements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MetricInput
                    label="Name"
                    value={manualData.user_name || ''}
                    onChange={(v) => updateManualField('user_name', v as string)}
                    type="text"
                  />
                  <MetricInput
                    label="Date & Time"
                    value={manualData.report_date || ''}
                    onChange={(v) => updateManualField('report_date', v as string)}
                    type="datetime-local"
                  />
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MetricInput
                      label="Weight"
                      value={manualData.weight}
                      unit="kg"
                      onChange={(v) => updateManualField('weight', v as number)}
                    />
                    <MetricInput
                      label="BMI"
                      value={manualData.bmi}
                      onChange={(v) => updateManualField('bmi', v as number)}
                    />
                    <MetricInput
                      label="Body Fat"
                      value={manualData.body_fat_percentage}
                      unit="%"
                      onChange={(v) => updateManualField('body_fat_percentage', v as number)}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Detailed Body Composition</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <MetricInput label="Fat Mass" value={manualData.fat_mass} unit="kg" onChange={(v) => updateManualField('fat_mass', v as number)} />
                    <MetricInput label="Muscle Mass" value={manualData.muscle_mass} unit="kg" onChange={(v) => updateManualField('muscle_mass', v as number)} />
                    <MetricInput label="Skeletal Muscle" value={manualData.skeletal_muscle} unit="kg" onChange={(v) => updateManualField('skeletal_muscle', v as number)} />
                    <MetricInput label="Bone Mass" value={manualData.bone_mass} unit="kg" onChange={(v) => updateManualField('bone_mass', v as number)} />
                    <MetricInput label="Body Water" value={manualData.body_water} unit="%" onChange={(v) => updateManualField('body_water', v as number)} />
                    <MetricInput label="Visceral Fat" value={manualData.visceral_fat} unit="level" onChange={(v) => updateManualField('visceral_fat', v as number)} />
                    <MetricInput label="BMR (Basal Metabolic Rate)" value={manualData.bmr} unit="kcal" onChange={(v) => updateManualField('bmr', v as number)} />
                    <MetricInput label="Body Age" value={manualData.body_age} unit="years" onChange={(v) => updateManualField('body_age', v as number)} />
                    <MetricInput label="Ideal Body Weight" value={manualData.ideal_body_weight} unit="kg" onChange={(v) => updateManualField('ideal_body_weight', v as number)} />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Your Lifestyle <span className="text-red-500">*</span></h3>
                  <p className="text-sm text-muted-foreground mb-4">Choose your typical daily activity level. This helps us calculate your daily calorie and macro targets.</p>
                  
                  <RadioGroup
                    value={manualData.lifestyle || ''}
                    onValueChange={(value) => updateManualField('lifestyle', value)}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    {LIFESTYLE_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const isSelected = manualData.lifestyle === option.value;
                      return (
                        <div
                          key={option.value}
                          className={`relative rounded-xl p-4 border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-orange-500 bg-orange-500/10'
                              : 'border-border hover:border-orange-500/50'
                          }`}
                          onClick={() => updateManualField('lifestyle', option.value)}
                        >
                          <RadioGroupItem value={option.value} className="sr-only" />
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${option.color} flex items-center justify-center`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{option.label}</h4>
                              <p className="text-xs text-muted-foreground">{option.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>

                <Button 
                  onClick={handleSaveManualEntry} 
                  disabled={isSaving}
                  className="w-full"
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardContent className="p-8">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center">
                    <Upload className="w-10 h-10 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Upload Body Composition Report</h3>
                    <p className="text-muted-foreground">Upload an image or PDF of your body composition report. Our AI will extract the data automatically.</p>
                  </div>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    size="lg"
                    className="gap-2"
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
                  <p className="text-xs text-muted-foreground">Supported: JPG, PNG, WEBP, PDF (max 10MB)</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle>Report Saved Successfully!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {reportData.weight && (
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">{reportData.weight} kg</p>
                  <p className="text-sm text-muted-foreground">Weight</p>
                </div>
              )}
              {reportData.bmi && (
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">{reportData.bmi}</p>
                  <p className="text-sm text-muted-foreground">BMI</p>
                </div>
              )}
              {reportData.body_fat_percentage && (
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">{reportData.body_fat_percentage}%</p>
                  <p className="text-sm text-muted-foreground">Body Fat</p>
                </div>
              )}
              {reportData.bmr && (
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">{reportData.bmr}</p>
                  <p className="text-sm text-muted-foreground">BMR (kcal)</p>
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <Link href="/member/diet-planner">
                <Button className="flex-1">Go to Diet Planner</Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={() => {
                  setReportData(null);
                  setManualData(getEmptyReportData());
                }}
              >
                Add Another Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
