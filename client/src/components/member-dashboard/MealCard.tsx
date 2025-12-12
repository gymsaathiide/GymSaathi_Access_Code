import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MealCardProps {
  mealType: string;
  mealName: string;
  imageUrl?: string;
  isCompleted?: boolean;
  onEdit?: () => void;
  onShare?: () => void;
}

export function MealCard({ mealType, mealName, imageUrl, isCompleted = false, onEdit, onShare }: MealCardProps) {
  return (
    <div className={cn('meal-card', isCompleted && 'meal-card-completed')}>
      {isCompleted && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center mr-1">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
      
      <div className="meal-image bg-gray-200 flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt={mealName} className="w-full h-full object-cover rounded-xl" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-gray-800 text-sm capitalize">{mealType}</h4>
        <p className="text-gray-500 text-xs truncate">{mealName}</p>
        
        <div className="flex gap-2 mt-2">
          <button onClick={onEdit} className="meal-btn meal-btn-primary">
            Edit
          </button>
          <button onClick={onShare} className="meal-btn meal-btn-secondary">
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
