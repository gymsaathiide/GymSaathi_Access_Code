import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, Copy, ExternalLink, Headphones, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HelpdeskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HELPDESK_NUMBERS = [
  {
    label: "Toll-Free",
    number: "(011) 6926-8182",
    rawNumber: "01169268182",
  },
  {
    label: "Mobile",
    number: "+91 98707 53186",
    rawNumber: "+919870753186",
  },
];

export function HelpdeskDialog({ open, onOpenChange }: HelpdeskDialogProps) {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Phone number copied to clipboard",
    });
  };

  const initiateCall = (number: string) => {
    window.open(`tel:${number}`, "_self");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[hsl(220,26%,14%)] border-white/10 text-white">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-green-500/20">
              <Headphones className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">
                GymSaathi Helpdesk
              </DialogTitle>
              <DialogDescription className="text-white/60 flex items-center gap-1.5 mt-1">
                <Clock className="h-3.5 w-3.5" />
                Available 24x7 for your support
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <p className="text-sm text-white/60">
            Need help with your gym management? Our support team is available
            round the clock to assist you.
          </p>

          <div className="space-y-3">
            {HELPDESK_NUMBERS.map((item) => (
              <div
                key={item.rawNumber}
                className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:border-green-500/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Phone className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider">
                      {item.label}
                    </p>
                    <p className="text-lg font-semibold text-white">
                      {item.number}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(item.rawNumber)}
                    className="hover:bg-white/10 text-white/60 hover:text-white"
                    title="Copy number"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => initiateCall(item.rawNumber)}
                    className="hover:bg-green-500/20 text-green-500 hover:text-green-400"
                    title="Call now"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={() => initiateCall(HELPDESK_NUMBERS[1].rawNumber)}
              className="w-full gap-2 bg-green-600 hover:bg-green-700"
            >
              <Phone className="h-4 w-4" />
              Call Now
            </Button>
            <p className="text-xs text-center text-white/40">
              Tap to initiate a call on mobile devices
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
