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
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Image as ImageIcon,
  Save,
  Send,
  Loader2,
  Phone,
  Mail,
  ChevronDown,
  Search,
  X,
  Users,
  CheckCircle2,
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
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

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

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 2MB",
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

  const removeMember = (memberId: string) => {
    setSelectedMembers((prev) => prev.filter((id) => id !== memberId));
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
  
  const filteredMembers = members.filter((member) =>
    member.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    member.email?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
    member.phone?.includes(memberSearchQuery)
  );

  const getSelectedMemberNames = () => {
    return members
      .filter((m) => selectedMembers.includes(m.id))
      .map((m) => m.name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[hsl(220,26%,14%)] border-white/10 text-white">
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
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      <div
                        className="w-28 h-28 sm:w-32 sm:h-32 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 overflow-hidden cursor-pointer hover:border-orange-500/50 transition-colors flex-shrink-0"
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
                          className="gap-2 border-white/20 text-white/80 hover:bg-white/10 w-full sm:w-auto"
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
                          Upload your UPI QR code image (PNG, JPG, max 2MB)
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <Label className="text-white/80 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Select Members
                    </Label>
                    {members.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAllMembers}
                        className="text-orange-500 hover:text-orange-400 hover:bg-transparent text-xs"
                      >
                        {selectedMembers.length === members.length
                          ? "Deselect All"
                          : "Select All"}
                      </Button>
                    )}
                  </div>

                  <Popover open={memberDropdownOpen} onOpenChange={setMemberDropdownOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={memberDropdownOpen}
                        className="w-full justify-between bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white h-auto min-h-[44px] py-2"
                      >
                        <span className="text-left flex-1 truncate text-white/60">
                          {selectedMembers.length === 0
                            ? "Click to select members..."
                            : `${selectedMembers.length} member(s) selected`}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-[calc(100vw-4rem)] sm:w-[400px] p-0 bg-[hsl(220,26%,16%)] border-white/10"
                      align="start"
                    >
                      <div className="p-2 border-b border-white/10">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                          <Input
                            placeholder="Search members..."
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                          />
                        </div>
                      </div>
                      <ScrollArea className="h-[200px]">
                        {isLoadingMembers ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                          </div>
                        ) : filteredMembers.length === 0 ? (
                          <div className="text-center py-6 text-white/40 text-sm">
                            {memberSearchQuery ? "No members match your search" : "No members found"}
                          </div>
                        ) : (
                          <div className="p-1">
                            {filteredMembers.map((member) => (
                              <div
                                key={member.id}
                                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                                  selectedMembers.includes(member.id)
                                    ? "bg-orange-500/20 border border-orange-500/30"
                                    : "hover:bg-white/5 border border-transparent"
                                }`}
                                onClick={() => toggleMember(member.id)}
                              >
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  selectedMembers.includes(member.id)
                                    ? "bg-orange-500 border-orange-500"
                                    : "border-white/30"
                                }`}>
                                  {selectedMembers.includes(member.id) && (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">
                                    {member.name}
                                  </p>
                                  <p className="text-xs text-white/50 truncate">
                                    {member.phone || member.email}
                                  </p>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                  {member.phone && (
                                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center" title="Has WhatsApp">
                                      <Phone className="h-2.5 w-2.5 text-green-400" />
                                    </div>
                                  )}
                                  {member.email && (
                                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center" title="Has Email">
                                      <Mail className="h-2.5 w-2.5 text-blue-400" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>

                  {selectedMembers.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
                      {getSelectedMemberNames().slice(0, 5).map((name, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="bg-orange-500/20 text-orange-300 border-orange-500/30 gap-1 pr-1"
                        >
                          {name}
                          <button
                            onClick={() => {
                              const member = members.find((m) => m.name === name);
                              if (member) removeMember(member.id);
                            }}
                            className="ml-1 hover:bg-white/10 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {selectedMembers.length > 5 && (
                        <Badge variant="secondary" className="bg-white/10 text-white/70">
                          +{selectedMembers.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-white/80">Send via</Label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors">
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
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <Mail className="h-3.5 w-3.5 text-blue-400" />
                        </div>
                        <span className="text-sm text-white/80">Email</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors">
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
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Phone className="h-3.5 w-3.5 text-green-400" />
                        </div>
                        <span className="text-sm text-white/80">WhatsApp</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSend}
                    disabled={sendDetailsMutation.isPending || selectedMembers.length === 0}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    {sendDetailsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send to {selectedMembers.length > 0 ? `${selectedMembers.length} Member(s)` : "Members"}
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
