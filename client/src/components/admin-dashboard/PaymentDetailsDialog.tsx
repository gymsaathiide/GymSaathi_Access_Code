import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Image as ImageIcon,
  Save,
  Send,
  Loader2,
  Check,
  X,
  Phone,
  Mail,
} from "lucide-react";

interface PaymentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PaymentDetails {
  id?: string;
  qrUrl?: string;
  upiId?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  holderName?: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
}

interface PaymentDetailsResponse {
  paymentDetails: PaymentDetails | null;
}

interface MembersResponse {
  members: Member[];
}

export function PaymentDetailsDialog({
  open,
  onOpenChange,
}: PaymentDetailsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<PaymentDetails>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [sendChannels, setSendChannels] = useState({ email: true, whatsapp: true });

  const { data: paymentDetailsData, isLoading: isLoadingDetails } = useQuery<PaymentDetailsResponse>({
    queryKey: ["/api/admin/payment-details"],
    enabled: open,
  });

  const { data: membersData, isLoading: isLoadingMembers } = useQuery<MembersResponse>({
    queryKey: ["/api/members"],
    enabled: open,
  });

  useEffect(() => {
    if (paymentDetailsData?.paymentDetails) {
      setFormData(paymentDetailsData.paymentDetails);
      if (paymentDetailsData.paymentDetails.qrUrl) {
        setPreviewImage(paymentDetailsData.paymentDetails.qrUrl);
      }
    }
  }, [paymentDetailsData]);

  const saveDetailsMutation = useMutation({
    mutationFn: async (data: PaymentDetails) => {
      const res = await fetch("/api/admin/payment-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save payment details");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payment details saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-details"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadQrMutation = useMutation({
    mutationFn: async (base64Image: string) => {
      const res = await fetch("/api/admin/payment-details/upload-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ base64Image }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to upload QR code");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setFormData((prev) => ({ ...prev, qrUrl: data.qrUrl }));
      setPreviewImage(data.qrUrl);
      toast({
        title: "Success",
        description: "QR code uploaded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-details"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendDetailsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/payment-details/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          memberIds: selectedMembers,
          channels: sendChannels,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send payment details");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message,
      });
      setSelectedMembers([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file (PNG, JPG, GIF)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPreviewImage(base64);
      uploadQrMutation.mutate(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!formData.upiId && !formData.bankAccountNumber) {
      toast({
        title: "Validation Error",
        description: "Please provide at least UPI ID or Bank Account Number",
        variant: "destructive",
      });
      return;
    }
    saveDetailsMutation.mutate(formData);
  };

  const handleSend = () => {
    if (selectedMembers.length === 0) {
      toast({
        title: "Select Members",
        description: "Please select at least one member to send payment details",
        variant: "destructive",
      });
      return;
    }
    if (!sendChannels.email && !sendChannels.whatsapp) {
      toast({
        title: "Select Channel",
        description: "Please select at least one channel (Email or WhatsApp)",
        variant: "destructive",
      });
      return;
    }
    sendDetailsMutation.mutate();
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const selectAllMembers = () => {
    const members = membersData?.members || [];
    if (selectedMembers.length === members.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members.map((m: Member) => m.id));
    }
  };

  const members: Member[] = membersData?.members || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[hsl(220,26%,14%)] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            My Payment Details
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Add your UPI and bank details to share with members for payment collection
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manage" className="mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-white/5">
            <TabsTrigger
              value="manage"
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
            >
              Manage Details
            </TabsTrigger>
            <TabsTrigger
              value="send"
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
            >
              Send to Members
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="mt-4 space-y-4">
            {isLoadingDetails ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="border border-dashed border-white/20 rounded-lg p-4">
                    <Label className="text-white/80 mb-2 block">UPI QR Code</Label>
                    <div className="flex items-start gap-4">
                      <div
                        className="w-32 h-32 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 overflow-hidden cursor-pointer hover:border-orange-500/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {previewImage ? (
                          <img
                            src={previewImage}
                            alt="QR Code"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-center">
                            <ImageIcon className="h-8 w-8 text-white/30 mx-auto mb-1" />
                            <span className="text-xs text-white/40">No QR</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <Button
                          variant="outline"
                          className="gap-2 border-white/20 text-white/80 hover:bg-white/10"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadQrMutation.isPending}
                        >
                          {uploadQrMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          Upload QR Code
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                        <p className="text-xs text-white/40 mt-2">
                          Upload your UPI QR code image (PNG, JPG, max 5MB)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="upiId" className="text-white/80">
                        UPI ID
                      </Label>
                      <Input
                        id="upiId"
                        placeholder="yourname@upi"
                        value={formData.upiId || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, upiId: e.target.value }))
                        }
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      />
                    </div>

                    <div className="border-t border-white/10 pt-4 mt-2">
                      <h4 className="text-sm font-medium text-white/60 mb-3">
                        Bank Account Details (Optional)
                      </h4>
                      <div className="grid gap-3">
                        <div>
                          <Label htmlFor="holderName" className="text-white/80">
                            Account Holder Name
                          </Label>
                          <Input
                            id="holderName"
                            placeholder="Account holder name"
                            value={formData.holderName || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                holderName: e.target.value,
                              }))
                            }
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="bankAccountNumber" className="text-white/80">
                              Account Number
                            </Label>
                            <Input
                              id="bankAccountNumber"
                              placeholder="1234567890"
                              value={formData.bankAccountNumber || ""}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  bankAccountNumber: e.target.value,
                                }))
                              }
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                            />
                          </div>
                          <div>
                            <Label htmlFor="ifscCode" className="text-white/80">
                              IFSC Code
                            </Label>
                            <Input
                              id="ifscCode"
                              placeholder="ABCD0001234"
                              value={formData.ifscCode || ""}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  ifscCode: e.target.value.toUpperCase(),
                                }))
                              }
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={saveDetailsMutation.isPending}
                    className="gap-2 bg-orange-500 hover:bg-orange-600"
                  >
                    {saveDetailsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Details
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="send" className="mt-4 space-y-4">
            {!formData.upiId && !formData.bankAccountNumber ? (
              <div className="text-center py-8 text-white/60">
                <p>Please add your payment details first before sending to members.</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-white/80">Select Members</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAllMembers}
                      className="text-orange-500 hover:text-orange-400 hover:bg-transparent"
                    >
                      {selectedMembers.length === members.length
                        ? "Deselect All"
                        : "Select All"}
                    </Button>
                  </div>

                  <ScrollArea className="h-48 rounded-lg border border-white/10 bg-white/5">
                    {isLoadingMembers ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                      </div>
                    ) : members.length === 0 ? (
                      <div className="text-center py-8 text-white/40">
                        No members found
                      </div>
                    ) : (
                      <div className="p-2">
                        {members.map((member: Member) => (
                          <div
                            key={member.id}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                              selectedMembers.includes(member.id)
                                ? "bg-orange-500/20"
                                : "hover:bg-white/5"
                            }`}
                            onClick={() => toggleMember(member.id)}
                          >
                            <Checkbox
                              checked={selectedMembers.includes(member.id)}
                              className="border-white/30 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">
                                {member.name}
                              </p>
                              <p className="text-xs text-white/50 truncate">
                                {member.email || member.phone}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {member.phone && (
                                <Phone className="h-3 w-3 text-white/30" />
                              )}
                              {member.email && (
                                <Mail className="h-3 w-3 text-white/30" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  <div className="text-sm text-white/50">
                    {selectedMembers.length} member(s) selected
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-white/80">Send via</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={sendChannels.email}
                        onCheckedChange={(checked) =>
                          setSendChannels((prev) => ({
                            ...prev,
                            email: checked as boolean,
                          }))
                        }
                        className="border-white/30 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                      />
                      <Mail className="h-4 w-4 text-white/60" />
                      <span className="text-sm text-white/80">Email</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={sendChannels.whatsapp}
                        onCheckedChange={(checked) =>
                          setSendChannels((prev) => ({
                            ...prev,
                            whatsapp: checked as boolean,
                          }))
                        }
                        className="border-white/30 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                      />
                      <Phone className="h-4 w-4 text-white/60" />
                      <span className="text-sm text-white/80">WhatsApp</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSend}
                    disabled={
                      sendDetailsMutation.isPending || selectedMembers.length === 0
                    }
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    {sendDetailsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send Payment Details
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
