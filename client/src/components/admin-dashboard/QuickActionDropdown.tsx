import { useState } from "react";
import { Zap, CreditCard, Headphones, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { PaymentDetailsDialog } from "./PaymentDetailsDialog";
import { HelpdeskDialog } from "./HelpdeskDialog";

interface QuickActionDropdownProps {
  className?: string;
}

export function QuickActionDropdown({ className }: QuickActionDropdownProps) {
  const [isPaymentDetailsOpen, setIsPaymentDetailsOpen] = useState(false);
  const [isHelpdeskOpen, setIsHelpdeskOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={`gap-2 bg-orange-500 hover:bg-orange-600 text-white border-orange-500 hover:border-orange-600 ${className}`}
          >
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Quick Action</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-[hsl(220,26%,16%)] border-white/10">
          <DropdownMenuItem
            onClick={() => setIsPaymentDetailsOpen(true)}
            className="cursor-pointer text-white/80 hover:text-white hover:bg-white/10 gap-3"
          >
            <CreditCard className="h-4 w-4 text-orange-500" />
            <div>
              <div className="font-medium">My Payment Details</div>
              <div className="text-xs text-white/50">Manage UPI & Bank info</div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setIsHelpdeskOpen(true)}
            className="cursor-pointer text-white/80 hover:text-white hover:bg-white/10 gap-3"
          >
            <Headphones className="h-4 w-4 text-green-500" />
            <div>
              <div className="font-medium">GymSaathi Helpdesk</div>
              <div className="text-xs text-white/50">24x7 Support</div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PaymentDetailsDialog
        open={isPaymentDetailsOpen}
        onOpenChange={setIsPaymentDetailsOpen}
      />

      <HelpdeskDialog
        open={isHelpdeskOpen}
        onOpenChange={setIsHelpdeskOpen}
      />
    </>
  );
}
