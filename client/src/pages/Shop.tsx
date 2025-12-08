import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ProductForm } from "@/components/ProductForm";
import { OrderForm } from "@/components/OrderForm";
import { ProductCard } from "@/components/ProductCard";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Minus,
  Package,
  AlertTriangle,
  XCircle,
  Edit,
  Trash2,
  Search,
  TrendingUp,
  Clock,
  IndianRupee,
  Eye,
  Check,
  FolderOpen,
  Settings,
  ShoppingCart,
  ShoppingBag,
  Wrench,
} from "lucide-react";
import { format } from "date-fns";

interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  stock: number;
  image?: string;
}

export default function Shop() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { cart, addToCart: contextAddToCart, updateQuantity: contextUpdateQuantity, removeFromCart: contextRemoveFromCart, clearCart, cartTotal, cartItemCount } = useCart();
  const canManageProducts = user?.role === "admin";
  const [activeTab, setActiveTab] = useState("products");
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productStatusFilter, setProductStatusFilter] = useState<string>("all");
  
  // Mobile Store State
  const [mobileViewMode, setMobileViewMode] = useState<"store" | "admin">("store");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("cash");
  const [mobileProductDetail, setMobileProductDetail] = useState<any>(null);
  const [mobileSearchQuery, setMobileSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: products = [], isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: ["/api/orders"],
    enabled: user?.role === "admin",
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<
    any[]
  >({
    queryKey: ["/api/product-categories"],
  });

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku &&
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus =
      productStatusFilter === "all"
        ? true
        : productStatusFilter === "active"
          ? product.isActive
          : !product.isActive;
    return matchesSearch && matchesStatus;
  });

  const filteredOrders = orders.filter((order) =>
    statusFilter === "all" ? true : order.status === statusFilter,
  );

  // Cart functions using context
  const addToCart = (product: any) => {
    const rawPrice = product.discountPrice || product.price;
    const price = parseFloat(rawPrice);
    if (isNaN(price) || price < 0) {
      toast({ 
        title: "Error", 
        description: "Invalid product price. Please try again.", 
        variant: "destructive" 
      });
      return;
    }
    contextAddToCart({
      productId: product.id,
      productName: product.name,
      price: price,
      stock: product.stock,
      image: product.imageUrl,
    });
  };

  const updateCartQuantity = (productId: string, newQuantity: number) => {
    const item = cart.find((i) => i.productId === productId);
    if (item) {
      const delta = newQuantity - item.quantity;
      contextUpdateQuantity(productId, delta);
    }
  };

  const removeFromCart = (productId: string) => {
    contextRemoveFromCart(productId);
  };

  const createOrderFromCartMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/orders", data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/revenue-trend"] });
      clearCart();
      setIsCartOpen(false);
      toast({
        title: "Order Placed Successfully!",
        description: `Order #${response.orderNumber || 'NEW'} confirmed! Processing your order now.`,
        variant: "success",
        duration: 5000,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Order Failed",
        description: error.message || "We couldn't place your order. Please try again.",
        variant: "destructive",
        duration: 4000,
      });
    },
  });

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: "Cart is Empty",
        description: "Please add items to cart before checkout",
        variant: "destructive",
      });
      return;
    }

    // Get member ID from member data or user context
    // For trainers, memberId may be null - backend will auto-create a member record
    const memberId = memberData?.member?.id;
    
    // Members need a memberId, trainers can proceed without (backend handles it)
    if (!memberId && user?.role !== "trainer") {
      toast({
        title: "Error",
        description: "Unable to identify member. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    // Calculate totals
    const subtotal = cartTotal;
    const taxRate = storeSettings?.defaultTaxPercent ? parseFloat(storeSettings.defaultTaxPercent) : 0;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    createOrderFromCartMutation.mutate({
      memberId: memberId,
      subtotal: subtotal,
      taxAmount: taxAmount,
      totalAmount: total,
      status: "pending",
      paymentType: selectedPaymentMethod,
      paymentStatus: "unpaid",
      items: cart.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: Number(item.price) || 0,
      })),
    });
  };

  const { data: analytics } = useQuery<any>({
    queryKey: ["/api/store/analytics"],
    enabled: user?.role === "admin",
  });

  const { data: storeSettings } = useQuery<any>({
    queryKey: ["/api/store-settings"],
  });

  // Get member data for store mode (needed for checkout)
  const { data: memberData } = useQuery<any>({
    queryKey: ["/api/me"],
    enabled: !!user,
  });

  // Get members list for admin/trainer to select member when creating orders
  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["/api/members"],
    enabled: user?.role === "admin" || user?.role === "trainer",
  });

  // Mobile store filtered products (active only, with search and category)
  const mobileStoreProducts = products
    .filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(mobileSearchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || product.categoryId === selectedCategory;
      const isAvailable = storeSettings?.showOutOfStock ? true : product.stock > 0;
      return matchesSearch && matchesCategory && isAvailable && product.isActive;
    });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/store-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/store-settings"],
        exact: false,
      });
      toast({
        title: "Success",
        description: "Store settings updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const totalProducts = products.length;
  const lowStockProducts = products.filter(
    (p) => p.stock <= p.lowStockAlert && p.stock > 0,
  ).length;
  const outOfStockProducts = products.filter((p) => p.stock === 0).length;

  const recentOrders = orders.slice(0, 5);

  const lowStockItems = products
    .filter((p) => p.stock <= p.lowStockAlert && p.stock > 0)
    .slice(0, 5);

  const createProductMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/products"],
        exact: false,
      });
      setProductFormOpen(false);
      toast({
        title: "Success",
        description: "Product created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/products"],
        exact: false,
      });
      setProductFormOpen(false);
      setSelectedProduct(null);
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/products"],
        exact: false,
      });
      setDeleteProductId(null);
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/orders"],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/products"],
        exact: false,
      });
      setOrderFormOpen(false);
      toast({
        title: "Success",
        description: "Order created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/orders"],
        exact: false,
      });
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive",
      });
    },
  });

  const updateOrderPaymentMutation = useMutation({
    mutationFn: ({
      id,
      paymentStatus,
      paymentType,
    }: {
      id: string;
      paymentStatus: string;
      paymentType?: string;
    }) =>
      apiRequest("PATCH", `/api/orders/${id}/payment`, {
        paymentStatus,
        paymentType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/orders"],
        exact: false,
      });
      toast({
        title: "Success",
        description: "Payment status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update payment status",
        variant: "destructive",
      });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", "/api/product-categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/product-categories"],
        exact: false,
      });
      toast({
        title: "Success",
        description: "Category created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create category",
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/product-categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/product-categories"],
        exact: false,
      });
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update category",
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/product-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/product-categories"],
        exact: false,
      });
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive",
      });
    },
  });

  const handleProductSubmit = (data: any) => {
    if (selectedProduct) {
      updateProductMutation.mutate({ id: selectedProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setProductFormOpen(true);
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setProductFormOpen(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "confirmed":
        return "default";
      case "packed":
        return "outline";
      case "shipped":
        return "default";
      case "delivered":
        return "default";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getPaymentBadgeVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "default";
      case "unpaid":
        return "destructive";
      case "partial":
        return "secondary";
      case "refunded":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStockBadgeVariant = (product: any) => {
    if (product.stock === 0) return "destructive";
    if (product.stock <= product.lowStockAlert) return "secondary";
    return "default";
  };

  const getStockStatus = (product: any) => {
    if (product.stock === 0) return "Out of Stock";
    if (product.stock <= product.lowStockAlert) return "Low Stock";
    return "In Stock";
  };

  // Mobile Store View
  if (isMobile && mobileViewMode === "store") {
    return (
      <div className="space-y-4 pb-20">
        {/* Mobile Store Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Store</h1>
          <div className="flex items-center gap-2">
            {canManageProducts && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileViewMode("admin")}
                className="text-xs"
              >
                <Wrench className="h-3 w-3 mr-1" />
                Admin
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsCartOpen(true)}
              className="relative"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Search & Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={mobileSearchQuery}
              onChange={(e) => setMobileSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat: any) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mobile Product Grid */}
        {productsLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading products...</div>
        ) : mobileStoreProducts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No products available</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {mobileStoreProducts.map((product) => {
              const cartItem = cart.find(item => item.productId === product.id);
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  cartItem={cartItem}
                  onAddToCart={() => addToCart(product)}
                  onUpdateQuantity={(delta) => updateCartQuantity(product.id, cartItem ? cartItem.quantity + delta : 1)}
                  onView={() => setMobileProductDetail(product)}
                />
              );
            })}
          </div>
        )}

        {/* Mobile Cart Sheet */}
        <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart ({cartItemCount} items)
              </SheetTitle>
            </SheetHeader>
            
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mb-2" />
                <p>Your cart is empty</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <ScrollArea className="flex-1 -mx-6 px-6">
                  <div className="space-y-3 pb-4">
                    {cart.map((item) => (
                      <div key={item.productId} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="h-16 w-16 bg-muted rounded-md overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.productName}</p>
                          <p className="text-sm text-muted-foreground">₹{item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateCartQuantity(item.productId, item.quantity + 1)} disabled={item.quantity >= item.stock}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.productId)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <div className="border-t pt-4 space-y-4 -mx-6 px-6 pb-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>₹{cartTotal.toFixed(2)}</span>
                  </div>
                  <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Payment Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    className="w-full" 
                    size="lg" 
                    onClick={handleCheckout} 
                    disabled={createOrderFromCartMutation.isPending}
                  >
                    {createOrderFromCartMutation.isPending ? "Placing Order..." : "Place Order"}
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Mobile Product Detail Dialog */}
        <Dialog open={!!mobileProductDetail} onOpenChange={(open) => !open && setMobileProductDetail(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            {mobileProductDetail && (
              <>
                <div className="aspect-square bg-muted rounded-lg overflow-hidden -mx-6 -mt-6">
                  {mobileProductDetail.imageUrl ? (
                    <img src={mobileProductDetail.imageUrl} alt={mobileProductDetail.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <DialogHeader className="pt-4">
                  <DialogTitle>{mobileProductDetail.name}</DialogTitle>
                  {mobileProductDetail.description && (
                    <DialogDescription>{mobileProductDetail.description}</DialogDescription>
                  )}
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-bold">₹{parseFloat(mobileProductDetail.discountPrice || mobileProductDetail.price).toFixed(2)}</span>
                    {mobileProductDetail.discountPrice && (
                      <span className="text-muted-foreground line-through">₹{parseFloat(mobileProductDetail.price).toFixed(2)}</span>
                    )}
                  </div>
                  <Badge variant={mobileProductDetail.stock > 0 ? "default" : "destructive"}>
                    {mobileProductDetail.stock > 0 ? `${mobileProductDetail.stock} in stock` : "Out of Stock"}
                  </Badge>
                  <Button className="w-full" size="lg" disabled={mobileProductDetail.stock === 0} onClick={() => { addToCart(mobileProductDetail); setMobileProductDetail(null); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-semibold" data-testid="text-page-title">
            Shop Management
          </h1>
          {isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileViewMode("store")}
              className="text-xs"
            >
              <ShoppingBag className="h-3 w-3 mr-1" />
              Store
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {canManageProducts && activeTab === "products" && (
            <Button onClick={handleAddProduct} data-testid="button-add-product" className="flex-1 sm:flex-none">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          )}
          {activeTab === "orders" && user?.role === "admin" && (
            <Button
              onClick={() => setOrderFormOpen(true)}
              data-testid="button-create-order"
              className="flex-1 sm:flex-none"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Order
            </Button>
          )}
        </div>
      </div>

      {canManageProducts && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Revenue (This Month)
                </CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{analytics?.revenueThisMonth?.toFixed(2) || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Orders Today
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.ordersToday || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Orders
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {analytics?.pendingOrders || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Completed Orders
                </CardTitle>
                <Check className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {analytics?.completedOrders || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No recent orders
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentOrders.map((order: any) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between border-b pb-2 last:border-0"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {order.orderNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.memberName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">
                            ₹{parseFloat(order.totalAmount).toFixed(2)}
                          </p>
                          <div className="flex gap-1">
                            <Badge
                              variant={getStatusBadgeVariant(order.status)}
                              className="text-xs"
                            >
                              {order.status}
                            </Badge>
                            <Badge
                              variant={getPaymentBadgeVariant(
                                order.paymentStatus || "unpaid",
                              )}
                              className="text-xs"
                            >
                              {order.paymentStatus || "unpaid"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  Low Stock Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lowStockItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    All products are well stocked
                  </p>
                ) : (
                  <div className="space-y-3">
                    {lowStockItems.map((product: any) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between border-b pb-2 last:border-0"
                      >
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            SKU: {product.sku || "N/A"}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="text-xs">
                            {product.stock} left
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        data-testid="tabs-shop"
        className="w-full"
      >
        <TabsList data-testid="tabs-list" className="w-full sm:w-auto grid grid-cols-4 sm:inline-flex h-auto">
          <TabsTrigger value="products" data-testid="tab-products" className="text-xs sm:text-sm py-2">
            Products
          </TabsTrigger>
          {canManageProducts && (
            <TabsTrigger value="categories" data-testid="tab-categories" className="text-xs sm:text-sm py-2">
              Categories
            </TabsTrigger>
          )}
          {user?.role === "admin" && (
            <TabsTrigger value="orders" data-testid="tab-orders" className="text-xs sm:text-sm py-2">
              Orders
            </TabsTrigger>
          )}
          {canManageProducts && (
            <TabsTrigger value="settings" data-testid="tab-settings" className="text-xs sm:text-sm py-2">
              Settings
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="products" className="space-y-4 sm:space-y-6 mt-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <Card data-testid="card-total-products">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Products
                </CardTitle>
                <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground hidden sm:block" />
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div
                  className="text-xl sm:text-2xl font-bold"
                  data-testid="text-total-products"
                >
                  {totalProducts}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-low-stock">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Low Stock</CardTitle>
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600 hidden sm:block" />
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div
                  className="text-xl sm:text-2xl font-bold text-yellow-600"
                  data-testid="text-low-stock"
                >
                  {lowStockProducts}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-out-of-stock">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Out of Stock
                </CardTitle>
                <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 hidden sm:block" />
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div
                  className="text-xl sm:text-2xl font-bold text-red-600"
                  data-testid="text-out-of-stock"
                >
                  {outOfStockProducts}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
                data-testid="input-search-products"
              />
            </div>
            <Select
              value={productStatusFilter}
              onValueChange={setProductStatusFilter}
            >
              <SelectTrigger
                className="w-full sm:w-[150px]"
                data-testid="select-product-status-filter"
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {productsLoading ? (
            <p data-testid="status-loading">Loading products...</p>
          ) : filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No products found
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showAdminActions={canManageProducts}
                  onEdit={() => handleEditProduct(product)}
                  onDelete={() => setDeleteProductId(product.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Product Categories</h2>
            <Button
              onClick={() => {
                const name = prompt("Enter category name:");
                if (name && name.trim()) {
                  createCategoryMutation.mutate({
                    name: name.trim(),
                    isActive: 1,
                  });
                }
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>

          {categoriesLoading ? (
            <p>Loading categories...</p>
          ) : categories.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No categories found. Create your first category to organize
                products.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((category: any) => (
                <Card
                  key={category.id}
                  className={!category.isActive ? "opacity-60" : ""}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <Badge
                        variant={category.isActive ? "default" : "secondary"}
                      >
                        {category.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const name = prompt(
                            "Edit category name:",
                            category.name,
                          );
                          if (
                            name &&
                            name.trim() &&
                            name.trim() !== category.name
                          ) {
                            updateCategoryMutation.mutate({
                              id: category.id,
                              data: { name: name.trim() },
                            });
                          }
                        }}
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          updateCategoryMutation.mutate({
                            id: category.id,
                            data: { isActive: category.isActive ? 0 : 1 },
                          });
                        }}
                      >
                        {category.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to delete this category?",
                            )
                          ) {
                            deleteCategoryMutation.mutate(category.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="space-y-4 sm:space-y-6 mt-4">
          {/* Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger
              className="w-full sm:w-[200px]"
              data-testid="select-status-filter"
            >
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="packed">Packed</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {ordersLoading ? (
            <p data-testid="status-loading">Loading orders...</p>
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No orders found
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3">
                {filteredOrders.map((order) => (
                  <Card key={order.id} data-testid={`row-order-${order.id}`}>
                    <CardContent className="p-3 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm" data-testid={`text-order-number-${order.id}`}>
                            {order.orderNumber}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-member-${order.id}`}>
                            {order.memberName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold" data-testid={`text-amount-${order.id}`}>
                            ₹{parseFloat(order.totalAmount).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-date-${order.id}`}>
                            {format(new Date(order.orderDate), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      
                      {/* Status Badges */}
                      <div className="flex gap-2">
                        <Badge
                          variant={getStatusBadgeVariant(order.status)}
                          className="text-xs"
                          data-testid={`badge-status-${order.id}`}
                        >
                          {order.status}
                        </Badge>
                        <Badge
                          variant={getPaymentBadgeVariant(order.paymentStatus || "unpaid")}
                          className="text-xs"
                          data-testid={`badge-payment-${order.id}`}
                        >
                          {order.paymentStatus || "unpaid"}
                        </Badge>
                      </div>
                      
                      {/* Actions */}
                      {(user?.role === "admin" || user?.role === "trainer") && (
                        <div className="flex flex-col gap-2 pt-2 border-t">
                          <Select
                            value={order.status}
                            onValueChange={(status) =>
                              updateOrderStatusMutation.mutate({ id: order.id, status })
                            }
                            disabled={updateOrderStatusMutation.isPending}
                          >
                            <SelectTrigger className="w-full text-xs" data-testid={`select-status-${order.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="packed">Packed</SelectItem>
                              <SelectItem value="shipped">Shipped</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          {order.paymentStatus !== "paid" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs"
                              onClick={() =>
                                updateOrderPaymentMutation.mutate({
                                  id: order.id,
                                  paymentStatus: "paid",
                                })
                              }
                              disabled={updateOrderPaymentMutation.isPending}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View */}
              <Card className="hidden sm:block overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order Number</TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Order Date</TableHead>
                        {(user?.role === "admin" || user?.role === "trainer") && (
                          <TableHead>Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell>{order.memberName}</TableCell>
                          <TableCell>₹{parseFloat(order.totalAmount).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(order.status)}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPaymentBadgeVariant(order.paymentStatus || "unpaid")}>
                              {order.paymentStatus || "unpaid"}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(new Date(order.orderDate), "MMM d, yyyy")}</TableCell>
                          {(user?.role === "admin" || user?.role === "trainer") && (
                            <TableCell>
                              <div className="flex gap-2">
                                <Select
                                  value={order.status}
                                  onValueChange={(status) =>
                                    updateOrderStatusMutation.mutate({ id: order.id, status })
                                  }
                                  disabled={updateOrderStatusMutation.isPending}
                                >
                                  <SelectTrigger className="w-[130px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                    <SelectItem value="packed">Packed</SelectItem>
                                    <SelectItem value="shipped">Shipped</SelectItem>
                                    <SelectItem value="delivered">Delivered</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                                {order.paymentStatus !== "paid" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updateOrderPaymentMutation.mutate({
                                        id: order.id,
                                        paymentStatus: "paid",
                                      })
                                    }
                                    disabled={updateOrderPaymentMutation.isPending}
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Mark Paid
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  General Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Store Status</p>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable the member store
                    </p>
                  </div>
                  <Switch
                    checked={storeSettings?.storeEnabled === 1}
                    onCheckedChange={(checked) =>
                      storeSettings &&
                      updateSettingsMutation.mutate({
                        storeEnabled: checked ? 1 : 0,
                      })
                    }
                    disabled={!storeSettings}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show Out of Stock Items</p>
                    <p className="text-sm text-muted-foreground">
                      Display products even when out of stock
                    </p>
                  </div>
                  <Switch
                    checked={storeSettings?.showOutOfStock === 1}
                    onCheckedChange={(checked) =>
                      storeSettings &&
                      updateSettingsMutation.mutate({
                        showOutOfStock: checked ? 1 : 0,
                      })
                    }
                    disabled={!storeSettings}
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-medium">Default Tax Rate (%)</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="18"
                      key={storeSettings?.defaultTaxPercent}
                      defaultValue={storeSettings?.defaultTaxPercent || "0"}
                      min="0"
                      max="100"
                      step="0.01"
                      onBlur={(e) =>
                        e.target.value &&
                        storeSettings &&
                        updateSettingsMutation.mutate({
                          defaultTaxPercent: e.target.value,
                        })
                      }
                      disabled={!storeSettings}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Applied to products without specific tax
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5" />
                  Payment Methods
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Cash on Delivery (COD)</p>
                    <p className="text-sm text-muted-foreground">
                      Members pay cash at gym counter when collecting order
                    </p>
                  </div>
                  <Switch
                    checked={storeSettings?.allowCashPayment === 1}
                    onCheckedChange={(checked) =>
                      storeSettings &&
                      updateSettingsMutation.mutate({
                        allowCashPayment: checked ? 1 : 0,
                      })
                    }
                    disabled={!storeSettings}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">UPI at Counter</p>
                    <p className="text-sm text-muted-foreground">
                      Members pay via UPI at gym counter when collecting order
                    </p>
                  </div>
                  <Switch
                    checked={storeSettings?.allowUpiPayment === 1}
                    onCheckedChange={(checked) =>
                      storeSettings &&
                      updateSettingsMutation.mutate({
                        allowUpiPayment: checked ? 1 : 0,
                      })
                    }
                    disabled={!storeSettings}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Online Payment (Razorpay)</p>
                    <p className="text-sm text-muted-foreground">
                      Optional: Members can pay online before pickup
                    </p>
                  </div>
                  <Switch
                    checked={storeSettings?.allowOnlinePayment === 1}
                    onCheckedChange={(checked) =>
                      storeSettings &&
                      updateSettingsMutation.mutate({
                        allowOnlinePayment: checked ? 1 : 0,
                      })
                    }
                    disabled={!storeSettings}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Razorpay Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configure Razorpay to accept online payments from members. You
                  can get your API keys from the Razorpay Dashboard.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="font-medium">Razorpay Key ID</label>
                    <Input
                      type="text"
                      placeholder="rzp_test_xxxxxxxxxx"
                      key={storeSettings?.razorpayKeyId}
                      defaultValue={storeSettings?.razorpayKeyId || ""}
                      onBlur={(e) =>
                        storeSettings &&
                        e.target.value !==
                          (storeSettings?.razorpayKeyId || "") &&
                        updateSettingsMutation.mutate({
                          razorpayKeyId: e.target.value,
                        })
                      }
                      disabled={!storeSettings}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-medium">Razorpay Key Secret</label>
                    <Input
                      type="password"
                      placeholder="Enter secret key"
                      key={storeSettings?.razorpayKeySecret}
                      defaultValue={storeSettings?.razorpayKeySecret || ""}
                      onBlur={(e) =>
                        storeSettings &&
                        e.target.value !==
                          (storeSettings?.razorpayKeySecret || "") &&
                        updateSettingsMutation.mutate({
                          razorpayKeySecret: e.target.value,
                        })
                      }
                      disabled={!storeSettings}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <ProductForm
        open={productFormOpen}
        onClose={() => {
          setProductFormOpen(false);
          setSelectedProduct(null);
        }}
        onSubmit={handleProductSubmit}
        product={selectedProduct}
        isPending={
          createProductMutation.isPending || updateProductMutation.isPending
        }
      />

      <OrderForm
        open={orderFormOpen}
        onClose={() => setOrderFormOpen(false)}
        onSubmit={(data) => createOrderMutation.mutate(data)}
        isPending={createOrderMutation.isPending}
      />

      <AlertDialog
        open={!!deleteProductId}
        onOpenChange={(open) => !open && setDeleteProductId(null)}
      >
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteProductId && deleteProductMutation.mutate(deleteProductId)
              }
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
