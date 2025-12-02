import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

const orderFormSchema = z.object({
  memberId: z.string().min(1, "Please select a member"),
  orderNumber: z.string().optional(),
  status: z.string().default("pending"),
});

type OrderFormData = z.infer<typeof orderFormSchema>;

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

interface OrderFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending?: boolean;
}

export function OrderForm({ open, onClose, onSubmit, isPending }: OrderFormProps) {
  const { user } = useAuth();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  const isMember = user?.role === 'member';

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      memberId: "",
      status: "pending",
    },
  });

  // Only fetch members list if admin/trainer
  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["/api/members"],
    enabled: !isMember,
  });

  // Fetch current user's member data if they're a member
  const { data: meData } = useQuery<any>({
    queryKey: ["/api/me"],
    enabled: isMember,
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });

  // If member, auto-set memberId from user context
  useEffect(() => {
    if (isMember && meData?.member?.id) {
      form.setValue('memberId', meData.member.id);
    }
  }, [isMember, meData, form]);

  const addItem = () => {
    if (!selectedProductId || quantity <= 0) return;
    
    const product = products.find((p: any) => p.id === selectedProductId);
    if (!product) return;

    const existingItemIndex = orderItems.findIndex((item) => item.productId === selectedProductId);
    
    if (existingItemIndex >= 0) {
      const updated = [...orderItems];
      updated[existingItemIndex].quantity += quantity;
      setOrderItems(updated);
    } else {
      setOrderItems([...orderItems, {
        productId: product.id,
        productName: product.name,
        quantity,
        price: product.discountPrice || product.price,
      }]);
    }

    setSelectedProductId("");
    setQuantity(1);
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = (data: OrderFormData) => {
    if (orderItems.length === 0) {
      form.setError("memberId", { message: "Please add at least one item to the order" });
      return;
    }

    const payload = {
      memberId: data.memberId,
      subtotal: totalAmount,
      totalAmount: totalAmount,
      status: data.status,
      paymentStatus: "unpaid",
      items: orderItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: Number(item.price) || 0,
      })),
    };

    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-order-form">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">Create New Order</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {!isMember && (
              <FormField
                control={form.control}
                name="memberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Member</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-member">
                          <SelectValue placeholder="Select a member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {members.map((member: any) => (
                          <SelectItem key={member.id} value={member.id} data-testid={`select-member-${member.id}`}>
                            {member.name} ({member.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="space-y-2">
              <FormLabel>Add Products</FormLabel>
              <Card className="p-4">
                <div className="flex flex-wrap gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger data-testid="select-product">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.filter((p: any) => p.isActive && p.stock > 0).map((product: any) => (
                          <SelectItem key={product.id} value={product.id} data-testid={`select-product-${product.id}`}>
                            {product.name} - ${product.discountPrice || product.price} (Stock: {product.stock})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    placeholder="Qty"
                    className="w-24"
                    data-testid="input-quantity"
                  />
                  <Button type="button" onClick={addItem} data-testid="button-add-item">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </div>

            {orderItems.length > 0 && (
              <div className="space-y-2">
                <FormLabel>Order Items</FormLabel>
                <Card className="p-4">
                  <div className="space-y-2">
                    {orderItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between gap-4 p-2 bg-muted rounded" data-testid={`order-item-${index}`}>
                        <div className="flex-1">
                          <p className="font-medium" data-testid={`text-item-name-${index}`}>{item.productName}</p>
                          <p className="text-sm text-muted-foreground">
                            ${item.price.toFixed(2)} × {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-semibold" data-testid={`text-item-total-${index}`}>
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                            data-testid={`button-remove-item-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <p className="font-semibold">Total Amount:</p>
                      <p className="text-xl font-bold" data-testid="text-total-amount">
                        ${totalAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || orderItems.length === 0} data-testid="button-submit">
                {isPending ? "Creating..." : "Create Order"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
