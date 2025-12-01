
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Plus, Minus, Trash2, Search, ShoppingBag } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  stock: number;
}

export default function MemberStore() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("cash");

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setCart([]);
      setIsCartOpen(false);
      toast({
        title: "Order Placed Successfully!",
        description: "Visit the gym to collect your order and pay at the counter.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to place order",
        variant: "destructive",
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
    const existingItem = cart.find((item) => item.productId === product.id);
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(cart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        toast({
          title: "Out of Stock",
          description: "Cannot add more than available stock",
          variant: "destructive",
        });
      }
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        price: product.discountPrice || product.price,
        quantity: 1,
        stock: product.stock,
      }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map((item) => {
      if (item.productId === productId) {
        const newQuantity = item.quantity + delta;
        if (newQuantity > 0 && newQuantity <= item.stock) {
          return { ...item, quantity: newQuantity };
        }
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
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

    createOrderMutation.mutate({
      memberId: memberData?.member?.id,
      memberName: memberData?.member?.name || user?.name,
      subtotal: cartTotal,
      taxAmount: taxAmount,
      totalAmount,
      status: "pending",
      paymentType: selectedPaymentMethod,
      paymentStatus: "unpaid",
      items: cart,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Store</h1>
          <p className="text-muted-foreground">Browse and purchase gym products</p>
        </div>
        <Button onClick={() => setIsCartOpen(true)} className="relative">
          <ShoppingCart className="mr-2 h-4 w-4" />
          Cart
          {cart.length > 0 && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0">
              {cart.length}
            </Badge>
          )}
        </Button>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">My Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="popular">Popular</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <div className="aspect-square bg-muted relative">
                  {product.images && JSON.parse(product.images)[0] ? (
                    <img src={JSON.parse(product.images)[0]} alt={product.name} className="object-cover w-full h-full" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ShoppingBag className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                  {product.stock <= product.lowStockAlert && product.stock > 0 && (
                    <Badge variant="secondary" className="absolute top-2 right-2">Low Stock</Badge>
                  )}
                  {product.stock === 0 && (
                    <Badge variant="destructive" className="absolute top-2 right-2">Out of Stock</Badge>
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="line-clamp-2">{product.name}</CardTitle>
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2 mb-3">
                    <p className="text-2xl font-bold">₹{product.discountPrice || product.price}</p>
                    {product.discountPrice && (
                      <p className="text-sm text-muted-foreground line-through">₹{product.price}</p>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">Stock: {product.stock}</p>
                  <Button 
                    className="w-full" 
                    onClick={() => addToCart(product)}
                    disabled={product.stock === 0}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add to Cart
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {myOrders.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>You haven't placed any orders yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myOrders.map((order: any) => (
                    <div key={order.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold">Order #{order.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(order.orderDate), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">₹{parseFloat(order.totalAmount).toFixed(2)}</p>
                          <div className="flex gap-2">
                            <Badge variant={
                              order.status === 'delivered' ? 'default' :
                              order.status === 'cancelled' ? 'destructive' :
                              order.status === 'confirmed' || order.status === 'packed' || order.status === 'shipped' ? 'default' :
                              'secondary'
                            }>
                              {order.status}
                            </Badge>
                            <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                              {order.paymentStatus || 'unpaid'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {order.items && (
                        <div className="border-t pt-3 mt-3">
                          <p className="text-sm text-muted-foreground mb-2">Items:</p>
                          <div className="space-y-1">
                            {(typeof order.items === 'string' ? JSON.parse(order.items) : order.items).map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span>{item.productName} x {item.quantity}</span>
                                <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {order.status === 'pending' && order.paymentStatus !== 'paid' && (
                        <p className="text-sm text-orange-600 mt-3">
                          Visit the gym to pay and collect your order
                        </p>
                      )}
                      {order.status === 'pending' && order.paymentStatus === 'paid' && (
                        <p className="text-sm text-muted-foreground mt-3">
                          Payment received. Your order is being prepared.
                        </p>
                      )}
                      {order.status === 'confirmed' && (
                        <p className="text-sm text-blue-600 mt-3">
                          Order confirmed! We're preparing it for you.
                        </p>
                      )}
                      {order.status === 'packed' && (
                        <p className="text-sm text-green-600 mt-3">
                          Your order is packed and ready for pickup at the gym!
                        </p>
                      )}
                      {order.status === 'shipped' && (
                        <p className="text-sm text-blue-600 mt-3">
                          Your order has been shipped and is on its way!
                        </p>
                      )}
                      {order.status === 'delivered' && (
                        <p className="text-sm text-green-600 mt-3">
                          Order delivered. Thank you for your purchase!
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cart Dialog */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Shopping Cart</DialogTitle>
          </DialogHeader>
          
          {cart.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Your cart is empty
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center gap-4 p-4 bg-muted rounded">
                  <div className="flex-1">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-muted-foreground">₹{item.price} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" onClick={() => updateQuantity(item.productId, -1)}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button size="icon" variant="outline" onClick={() => updateQuantity(item.productId, 1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="font-semibold w-24 text-right">₹{item.price * item.quantity}</p>
                  <Button size="icon" variant="ghost" onClick={() => removeFromCart(item.productId)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{cartTotal.toFixed(2)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Tax ({settings.defaultTaxPercent}%):</span>
                    <span>₹{taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="font-medium">Payment Method:</p>
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(settings?.allowCashPayment === 1 || settings?.allowCashPayment === undefined) && (
                      <SelectItem value="cash">Pay at Gym - Cash (COD)</SelectItem>
                    )}
                    {settings?.allowUpiPayment === 1 && (
                      <SelectItem value="upi">Pay at Gym - UPI</SelectItem>
                    )}
                    {settings?.allowOnlinePayment === 1 && (
                      <SelectItem value="card">Online Payment (Razorpay)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {(selectedPaymentMethod === "cash" || selectedPaymentMethod === "upi") && (
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    Pay when you collect your order at the gym counter
                  </p>
                )}
              </div>

              <Button 
                className="w-full" 
                size="lg" 
                onClick={handleCheckout}
                disabled={createOrderMutation.isPending}
              >
                {createOrderMutation.isPending ? "Placing Order..." : "Place Order (Pay at Gym)"}
              </Button>
              
              <p className="text-sm text-center text-muted-foreground">
                Your order will be ready for pickup. Pay at the gym counter when you collect it.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
