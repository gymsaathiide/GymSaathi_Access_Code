import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { ProductForm } from "@/components/ProductForm";
import { OrderForm } from "@/components/OrderForm";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
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
} from "lucide-react";
import { format } from "date-fns";

export default function Shop() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canManageProducts = user?.role === "admin";
  const [activeTab, setActiveTab] = useState("products");
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productStatusFilter, setProductStatusFilter] = useState<string>("all");

  const { data: products = [], isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: ["/api/orders"],
    enabled: user?.role === "admin" || user?.role === "trainer",
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

  const { data: analytics } = useQuery<any>({
    queryKey: ["/api/store/analytics"],
    enabled: user?.role === "admin" || user?.role === "trainer",
  });

  const { data: storeSettings } = useQuery<any>({
    queryKey: ["/api/store-settings"],
    enabled: canManageProducts,
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
      case "completed":
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Shop Management
        </h1>
        {canManageProducts && activeTab === "products" && (
          <Button onClick={handleAddProduct} data-testid="button-add-product">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        )}
        {activeTab === "orders" && (
          <Button
            onClick={() => setOrderFormOpen(true)}
            data-testid="button-create-order"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Order
          </Button>
        )}
      </div>

      {canManageProducts && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      >
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="products" data-testid="tab-products">
            Products
          </TabsTrigger>
          {canManageProducts && (
            <TabsTrigger value="categories" data-testid="tab-categories">
              Categories
            </TabsTrigger>
          )}
          {(user?.role === "admin" || user?.role === "trainer") && (
            <TabsTrigger value="orders" data-testid="tab-orders">
              Orders
            </TabsTrigger>
          )}
          {canManageProducts && (
            <TabsTrigger value="settings" data-testid="tab-settings">
              Settings
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card data-testid="card-total-products">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Products
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className="text-2xl font-bold"
                  data-testid="text-total-products"
                >
                  {totalProducts}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-low-stock">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className="text-2xl font-bold text-yellow-600"
                  data-testid="text-low-stock"
                >
                  {lowStockProducts}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-out-of-stock">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Out of Stock
                </CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className="text-2xl font-bold text-red-600"
                  data-testid="text-out-of-stock"
                >
                  {outOfStockProducts}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-products"
              />
            </div>
            <Select
              value={productStatusFilter}
              onValueChange={setProductStatusFilter}
            >
              <SelectTrigger
                className="w-[150px]"
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  data-testid={`card-product-${product.id}`}
                  className={!product.isActive ? "opacity-60" : ""}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle
                          className="text-lg"
                          data-testid={`text-product-name-${product.id}`}
                        >
                          {product.name}
                        </CardTitle>
                        {product.sku && (
                          <p className="text-xs text-muted-foreground mt-1">
                            SKU: {product.sku}
                          </p>
                        )}
                        {product.description && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            {product.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {product.isFeatured && (
                          <Badge
                            variant="default"
                            data-testid={`badge-featured-${product.id}`}
                          >
                            Featured
                          </Badge>
                        )}
                        {!product.isActive && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      {product.mrp &&
                        product.mrp >
                          (product.discountPrice || product.price) && (
                          <p className="text-xs text-muted-foreground line-through">
                            MRP: ₹{parseFloat(product.mrp).toFixed(2)}
                          </p>
                        )}
                      <div className="flex items-baseline gap-2">
                        <p
                          className="text-2xl font-bold"
                          data-testid={`text-product-price-${product.id}`}
                        >
                          ₹
                          {parseFloat(
                            product.discountPrice || product.price,
                          ).toFixed(2)}
                        </p>
                        {product.discountPrice && (
                          <p className="text-sm text-muted-foreground line-through">
                            ₹{parseFloat(product.price).toFixed(2)}
                          </p>
                        )}
                      </div>
                      {product.taxPercent > 0 && (
                        <p className="text-xs text-muted-foreground">
                          + {product.taxPercent}% tax
                        </p>
                      )}
                    </div>

                    <Badge
                      variant={getStockBadgeVariant(product)}
                      data-testid={`badge-stock-${product.id}`}
                    >
                      {getStockStatus(product)} ({product.stock})
                    </Badge>

                    {canManageProducts && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleEditProduct(product)}
                          data-testid={`button-edit-${product.id}`}
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteProductId(product.id)}
                          data-testid={`button-delete-${product.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
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

        <TabsContent value="orders" className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                className="w-[200px]"
                data-testid="select-status-filter"
              >
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="packed">Packed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {ordersLoading ? (
            <p data-testid="status-loading">Loading orders...</p>
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No orders found
              </CardContent>
            </Card>
          ) : (
            <Card>
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
                    <TableRow
                      key={order.id}
                      data-testid={`row-order-${order.id}`}
                    >
                      <TableCell
                        className="font-medium"
                        data-testid={`text-order-number-${order.id}`}
                      >
                        {order.orderNumber}
                      </TableCell>
                      <TableCell data-testid={`text-member-${order.id}`}>
                        {order.memberName}
                      </TableCell>
                      <TableCell data-testid={`text-amount-${order.id}`}>
                        ₹{parseFloat(order.totalAmount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(order.status)}
                          data-testid={`badge-status-${order.id}`}
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getPaymentBadgeVariant(
                            order.paymentStatus || "unpaid",
                          )}
                          data-testid={`badge-payment-${order.id}`}
                        >
                          {order.paymentStatus || "unpaid"}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-date-${order.id}`}>
                        {format(new Date(order.orderDate), "MMM d, yyyy")}
                      </TableCell>
                      {(user?.role === "admin" || user?.role === "trainer") && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Select
                              value={order.status}
                              onValueChange={(status) =>
                                updateOrderStatusMutation.mutate({
                                  id: order.id,
                                  status,
                                })
                              }
                              disabled={updateOrderStatusMutation.isPending}
                            >
                              <SelectTrigger
                                className="w-[130px]"
                                data-testid={`select-status-${order.id}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">
                                  Confirmed
                                </SelectItem>
                                <SelectItem value="packed">Packed</SelectItem>
                                <SelectItem value="completed">
                                  Completed
                                </SelectItem>
                                <SelectItem value="cancelled">
                                  Cancelled
                                </SelectItem>
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
            </Card>
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
