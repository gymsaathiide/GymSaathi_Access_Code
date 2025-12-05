import { useState, useEffect } from "react";
import { ArrowLeft, Trash2, Loader2, Calendar, Weight, Activity, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface BodyReport {
  id: string;
  user_name?: string;
  report_date: string;
  weight?: number;
  bmi?: number;
  body_fat_percentage?: number;
  muscle_mass?: number;
  bmr?: number;
  body_age?: number;
  lifestyle?: string;
  created_at: string;
}

const LIFESTYLE_LABELS: Record<string, string> = {
  sedentary: 'Sedentary',
  moderately_active: 'Moderately Active',
  super_active: 'Super Active'
};

export default function HistoryPage() {
  const { toast } = useToast();
  const [reports, setReports] = useState<BodyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'single' | 'multiple'>('single');
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/diet-planner/body-composition/history', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error loading history:', error);
      toast({
        title: "Error",
        description: "Failed to load body composition history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === reports.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reports.map(r => r.id)));
    }
  };

  const openDeleteDialog = (mode: 'single' | 'multiple', id?: string) => {
    setDeleteMode(mode);
    if (mode === 'single' && id) {
      setSingleDeleteId(id);
    }
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      if (deleteMode === 'single' && singleDeleteId) {
        const response = await fetch(`/api/diet-planner/body-composition/${singleDeleteId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (response.ok) {
          setReports(prev => prev.filter(r => r.id !== singleDeleteId));
          toast({
            title: "Deleted",
            description: "Report deleted successfully"
          });
        } else {
          throw new Error('Failed to delete');
        }
      } else if (deleteMode === 'multiple') {
        const idsToDelete = Array.from(selectedIds);
        const response = await fetch('/api/diet-planner/body-composition/delete-multiple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ids: idsToDelete })
        });
        
        if (response.ok) {
          const data = await response.json();
          setReports(prev => prev.filter(r => !selectedIds.has(r.id)));
          setSelectedIds(new Set());
          toast({
            title: "Deleted",
            description: `${data.deletedCount} report(s) deleted successfully`
          });
        } else {
          throw new Error('Failed to delete');
        }
      }
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: "Error",
        description: "Failed to delete report(s)",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setSingleDeleteId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown date';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/member/diet-planner/body-report">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Body Report History</h1>
            <p className="text-muted-foreground text-sm">
              {reports.length} report{reports.length !== 1 ? 's' : ''} saved
            </p>
          </div>
        </div>
      </div>

      {reports.length > 0 && (
        <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedIds.size === reports.length && reports.length > 0}
              onCheckedChange={selectAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
            </span>
          </div>
          
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => openDeleteDialog('multiple')}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected ({selectedIds.size})
            </Button>
          )}
        </div>
      )}

      {reports.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Activity className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Reports Yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload your first body composition report to get started.
            </p>
            <Link href="/member/diet-planner/body-report">
              <Button>Upload Report</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report, index) => (
            <Card
              key={report.id}
              className={`transition-all ${
                selectedIds.has(report.id) ? 'border-cyan-500 bg-cyan-500/5' : ''
              } ${index === 0 ? 'border-green-500/50' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={selectedIds.has(report.id)}
                    onCheckedChange={() => toggleSelect(report.id)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {formatDate(report.created_at)}
                      </span>
                      {index === 0 && (
                        <Badge variant="outline" className="text-green-500 border-green-500">
                          Latest
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                      {report.weight && (
                        <div className="flex items-center gap-2">
                          <Weight className="w-4 h-4 text-orange-500" />
                          <div>
                            <p className="text-lg font-bold">{report.weight}</p>
                            <p className="text-xs text-muted-foreground">kg</p>
                          </div>
                        </div>
                      )}
                      
                      {report.bmi && (
                        <div>
                          <p className="text-lg font-bold">{report.bmi}</p>
                          <p className="text-xs text-muted-foreground">BMI</p>
                        </div>
                      )}
                      
                      {report.body_fat_percentage && (
                        <div>
                          <p className="text-lg font-bold">{report.body_fat_percentage}%</p>
                          <p className="text-xs text-muted-foreground">Body Fat</p>
                        </div>
                      )}
                      
                      {report.bmr && (
                        <div>
                          <p className="text-lg font-bold">{report.bmr}</p>
                          <p className="text-xs text-muted-foreground">BMR kcal</p>
                        </div>
                      )}
                    </div>
                    
                    {report.lifestyle && (
                      <div className="mt-3">
                        <Badge variant="secondary" className="text-xs">
                          {LIFESTYLE_LABELS[report.lifestyle] || report.lifestyle}
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-red-500"
                    onClick={() => openDeleteDialog('single', report.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Delete {deleteMode === 'single' ? 'Report' : `${selectedIds.size} Reports`}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. {deleteMode === 'single' 
                ? 'This body composition report will be permanently deleted.'
                : `${selectedIds.size} body composition report(s) will be permanently deleted.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
