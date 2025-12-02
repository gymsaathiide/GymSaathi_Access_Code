import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { CheckCircle2, XCircle, Info, ShoppingCart } from "lucide-react";

export function Toaster() {
  const { toasts } = useToast();

  const getIcon = (variant: string | undefined, title?: React.ReactNode) => {
    const titleStr = String(title || '').toLowerCase();
    
    if (titleStr.includes('added to cart') || titleStr.includes('cart')) {
      return <ShoppingCart className="h-5 w-5 shrink-0" />;
    }
    if (variant === 'success' || titleStr.includes('success') || titleStr.includes('confirmed')) {
      return <CheckCircle2 className="h-5 w-5 shrink-0" />;
    }
    if (variant === 'destructive' || titleStr.includes('error')) {
      return <XCircle className="h-5 w-5 shrink-0" />;
    }
    return <Info className="h-5 w-5 shrink-0" />;
  };

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-3">
              {getIcon(variant, title)}
              <div className="grid gap-0.5">
                {title && <ToastTitle className="font-semibold">{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="text-white/90 text-sm">{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose className="text-white/70 hover:text-white" />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
