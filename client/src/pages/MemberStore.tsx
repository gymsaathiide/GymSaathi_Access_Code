import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Plus, Minus, Trash2, Search, ShoppingBag, Package, Eye, CheckCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";

export default function MemberStore() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { cart, addToCart: contextAddToCart, updateQuantity, removeFromCart, clearCart, cartTotal, cartItemCount } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("cash");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/products", { isActive: true }],
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/product-categories"],
  });

  const { data: settings } = useQuery<any>({
    queryKey: ["/api/store-settings"],
  });

  const { data: memberData } = useQuery<any>({
    queryKey: ["/api/me"],
    enabled: !!user,
  });

  const { data: myOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/orders"],
    enabled: !!user && user.role === "member",
    select: (data: any[]) => data?.filter((order: any) => order.memberId === memberData?.member?.id) || [],
  });

  const createOrderMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/orders", data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/revenue-trend"] });
      clearCart();
      setIsCartOpen(false);
      toast({
        title: "Order Placed Successfully!",
        description: `Order #${response.orderNumber || 'NEW'} has been placed. Visit the gym to collect your order and pay at the counter.`,
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

  const filteredProducts = products
    .filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || product.categoryId === selectedCategory;
      const isAvailable = settings?.showOutOfStock ? true : product.stock > 0;
      return matchesSearch && matchesCategory && isAvailable && product.isActive;
    })
    .sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      if (sortBy === "popular") return (b.stock || 0) - (a.stock || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const addToCart = (product: any) => {
    const rawPrice = product.discountPrice || product.price;
    const price = parseFloat(rawPrice);
    if (isNaN(price) || price < 0) {
      toast({
        title: "Error",
        description: "Invalid product price. Please try again.",
        variant: "destructive",
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

  const taxAmount = settings?.defaultTaxPercent 
    ? (cartTotal * parseFloat(settings.defaultTaxPercent)) / 100 
    : 0;
  const totalAmount = cartTotal + taxAmount;

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: "Cart is Empty",
        description: "Please add items to cart before checkout",
        variant: "destructive",
      });
      return;
    }

    const memberId = memberData?.member?.id;
    if (!memberId) {
      toast({
        title: "Error",
        description: "Unable to identify member. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    createOrderMutation.mutate({
      memberId: memberId,
      subtotal: Number(cartTotal) || 0,
      taxAmount: Number(taxAmount) || 0,
      totalAmount: Number(totalAmount) || 0,
      status: "pending",
      paymentType: selectedPaymentMethod,
      paymentStatus: "unpaid",
      items: cart.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: Number(item.price) || 0,
      })),
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Store</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Browse and purchase gym products</p>
        </div>
        <Button 
          onClick={() => setIsCartOpen(true)} 
          className="relative w-full sm:w-auto"
          size="lg"
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          View Cart
          {cartItemCount > 0 && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 text-xs">
              {cartItemCount}
            </Badge>
          )}
        </Button>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
          <TabsTrigger value="products" className="flex-1 sm:flex-none">
            <Package className="mr-2 h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex-1 sm:flex-none">
            <ShoppingBag className="mr-2 h-4 w-4" />
            My Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4 mt-4">
          {/* Filters - Mobile Responsive */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price-low">Price: Low</SelectItem>
                  <SelectItem value="price-high">Price: High</SelectItem>
                  <SelectItem value="popular">Popular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Product Grid - Responsive */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map((product) => {
                const cartItem = cart.find(item => item.productId === product.id);
                
                return (
                  <Card key={product.id} className="overflow-hidden flex flex-col">
                    {/* Product Image */}
                    <div 
                      className="aspect-square bg-muted relative cursor-pointer"
                      onClick={() => setSelectedProduct(product)}
                    >
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full" />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ShoppingBag className="h-10 w-10 sm:h-16 sm:w-16 text-muted-foreground" />
                        </div>
                      )}
                      {product.stock <= product.lowStockAlert && product.stock > 0 && (
                        <Badge variant="secondary" className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 text-xs">Low Stock</Badge>
                      )}
                      {product.stock === 0 && (
                        <Badge variant="destructive" className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 text-xs">Out of Stock</Badge>
                      )}
                      {product.discountPrice && (
                        <Badge className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 bg-green-600 text-xs">
                          {Math.round((1 - product.discountPrice / product.price) * 100)}% OFF
                        </Badge>
                      )}
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 h-8 w-8 opacity-80 hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Product Info */}
                    <CardContent className="p-2.5 sm:p-4 flex-1 flex flex-col">
                      <h3 className="font-medium text-sm sm:text-base line-clamp-2 mb-1">{product.name}</h3>
                      
                      <div className="flex items-baseline gap-1.5 mb-2 sm:mb-3">
                        <span className="text-lg sm:text-xl font-bold">₹{product.discountPrice || product.price}</span>
                        {product.discountPrice && (
                          <span className="text-xs sm:text-sm text-muted-foreground line-through">₹{product.price}</span>
                        )}
                      </div>
                      
                      <div className="mt-auto">
                        {cartItem ? (
                          <div className="flex items-center justify-between bg-muted rounded-md p-1">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8"
                              onClick={() => updateQuantity(product.id, -1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="font-medium text-sm">{cartItem.quantity}</span>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8"
                              onClick={() => updateQuantity(product.id, 1)}
                              disabled={cartItem.quantity >= product.stock}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            className="w-full h-9 text-sm" 
                            onClick={() => addToCart(product)}
                            disabled={product.stock === 0}
                          >
                            <ShoppingCart className="mr-1.5 h-4 w-4" />
                            Add
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="space-y-4 mt-4">
          {myOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No orders yet</p>
                <p className="text-sm">Your order history will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myOrders.map((order: any) => (
                <Card key={order.id}>
                  <CardContent className="p-3 sm:p-4">
                    {/* Order Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <p className="font-semibold text-sm sm:text-base">Order #{order.orderNumber}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {format(new Date(order.orderDate), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                      <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2">
                        <p className="font-bold text-base sm:text-lg">₹{parseFloat(order.totalAmount).toFixed(2)}</p>
                        <div className="flex gap-1.5 flex-wrap">
                          <Badge 
                            className="text-xs"
                            variant={
                              order.status === 'delivered' ? 'default' :
                              order.status === 'cancelled' ? 'destructive' :
                              order.status === 'confirmed' || order.status === 'packed' || order.status === 'shipped' ? 'default' :
                              'secondary'
                            }
                          >
                            {order.status}
                          </Badge>
                          <Badge className="text-xs" variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                            {order.paymentStatus || 'unpaid'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    {/* Order Items */}
                    {order.items && (
                      <div className="border-t pt-3">
                        <p className="text-xs text-muted-foreground mb-2">Items:</p>
                        <div className="space-y-1">
                          {(typeof order.items === 'string' ? JSON.parse(order.items) : order.items).map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-xs sm:text-sm">
                              <span className="text-muted-foreground">{item.productName} × {item.quantity}</span>
                              <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Status Message */}
                    {order.status === 'pending' && order.paymentStatus !== 'paid' && (
                      <p className="text-xs sm:text-sm text-orange-600 mt-3 bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
                        Visit the gym to pay and collect your order
                      </p>
                    )}
                    {order.status === 'pending' && order.paymentStatus === 'paid' && (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-3 bg-muted p-2 rounded">
                        Payment received. Your order is being prepared.
                      </p>
                    )}
                    {order.status === 'confirmed' && (
                      <p className="text-xs sm:text-sm text-blue-600 mt-3 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                        Order confirmed! We're preparing it for you.
                      </p>
                    )}
                    {order.status === 'packed' && (
                      <p className="text-xs sm:text-sm text-green-600 mt-3 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                        Your order is packed and ready for pickup!
                      </p>
                    )}
                    {order.status === 'shipped' && (
                      <p className="text-xs sm:text-sm text-blue-600 mt-3 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                        Your order has been shipped and is on its way!
                      </p>
                    )}
                    {order.status === 'delivered' && (
                      <p className="text-xs sm:text-sm text-green-600 mt-3 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                        Order delivered. Thank you for your purchase!
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Cart Sheet - Mobile Friendly */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Shopping Cart ({cartItemCount})
            </SheetTitle>
          </SheetHeader>
          
          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <ShoppingCart className="h-16 w-16 mb-4 opacity-30" />
              <p className="font-medium">Your cart is empty</p>
              <p className="text-sm">Add products to get started</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsCartOpen(false)}>
                Continue Shopping
              </Button>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-3 py-4">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                      {/* Product Image */}
                      <div className="w-16 h-16 flex-shrink-0 bg-muted rounded-md overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-2">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">₹{item.price} each</p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1 bg-background rounded-md">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.productId, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.productId, 1)}
                              disabled={item.quantity >= item.stock}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="font-semibold text-sm">₹{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                      
                      {/* Remove Button */}
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeFromCart(item.productId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Checkout Section */}
              <div className="border-t pt-4 space-y-4 mt-auto">
                {/* Price Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>₹{cartTotal.toFixed(2)}</span>
                  </div>
                  {taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax ({settings?.defaultTaxPercent}%):</span>
                      <span>₹{taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total:</span>
                    <span>₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Payment Method:</p>
                  <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(settings?.allowCashPayment === 1 || settings?.allowCashPayment === undefined) && (
                        <SelectItem value="cash">Cash at Gym</SelectItem>
                      )}
                      {settings?.allowUpiPayment === 1 && (
                        <SelectItem value="upi">UPI at Gym</SelectItem>
                      )}
                      {settings?.allowOnlinePayment === 1 && (
                        <SelectItem value="card">Online Payment</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handleCheckout}
                  disabled={createOrderMutation.isPending}
                >
                  {createOrderMutation.isPending ? "Placing Order..." : `Place Order - ₹${totalAmount.toFixed(2)}`}
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  Pay at the gym counter when you collect your order
                </p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="max-w-md sm:max-w-lg">
          {selectedProduct && (
            <>
              <div className="aspect-square bg-muted rounded-lg overflow-hidden mb-4 -mx-6 -mt-6 sm:mx-0 sm:mt-0 sm:rounded-t-lg">
                {selectedProduct.imageUrl ? (
                  <img 
                    src={selectedProduct.imageUrl} 
                    alt={selectedProduct.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="h-20 w-20 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedProduct.name}</DialogTitle>
                {selectedProduct.description && (
                  <DialogDescription className="text-sm">
                    {selectedProduct.description}
                  </DialogDescription>
                )}
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">₹{selectedProduct.discountPrice || selectedProduct.price}</span>
                  {selectedProduct.discountPrice && (
                    <>
                      <span className="text-lg text-muted-foreground line-through">₹{selectedProduct.price}</span>
                      <Badge className="bg-green-600">
                        {Math.round((1 - selectedProduct.discountPrice / selectedProduct.price) * 100)}% OFF
                      </Badge>
                    </>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={selectedProduct.stock > 0 ? "secondary" : "destructive"}>
                    {selectedProduct.stock > 0 ? `${selectedProduct.stock} in stock` : "Out of Stock"}
                  </Badge>
                </div>
                
                {(() => {
                  const cartItem = cart.find(item => item.productId === selectedProduct.id);
                  return cartItem ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-muted rounded-md p-1 flex-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-9 w-9"
                          onClick={() => updateQuantity(selectedProduct.id, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="flex-1 text-center font-medium">{cartItem.quantity}</span>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-9 w-9"
                          onClick={() => updateQuantity(selectedProduct.id, 1)}
                          disabled={cartItem.quantity >= selectedProduct.stock}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button 
                        variant="outline"
                        onClick={() => { setSelectedProduct(null); setIsCartOpen(true); }}
                      >
                        View Cart
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={() => { addToCart(selectedProduct); }}
                      disabled={selectedProduct.stock === 0}
                    >
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      Add to Cart
                    </Button>
                  );
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
