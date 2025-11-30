import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { Switch } from "@/components/ui/switch";
import { X, Upload, Image as ImageIcon } from "lucide-react";

const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  mrp: z.string().optional().refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), "MRP must be a positive number"),
  price: z.string().min(1, "Price is required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Price must be a positive number"),
  discountPrice: z.string().optional().refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), "Discount price must be a valid number"),
  taxPercent: z.string().optional().refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100), "Tax percent must be between 0 and 100"),
  stock: z.string().min(1, "Stock is required").refine((val) => !isNaN(parseInt(val)) && parseInt(val) >= 0, "Stock must be a non-negative number"),
  lowStockAlert: z.string().min(1, "Low stock alert is required").refine((val) => !isNaN(parseInt(val)) && parseInt(val) >= 0, "Low stock alert must be a non-negative number"),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type ProductFormData = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  product?: any;
  isPending?: boolean;
}

export function ProductForm({ open, onClose, onSubmit, product, isPending }: ProductFormProps) {
  const parseImages = (imgs: any): string[] => {
    if (!imgs) return [];
    if (Array.isArray(imgs)) return imgs;
    if (typeof imgs === 'string') {
      try {
        const parsed = JSON.parse(imgs);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return imgs ? [imgs] : [];
      }
    }
    return [];
  };

  const [images, setImages] = useState<string[]>(parseImages(product?.images));
  const [imageUrl, setImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/product-categories"],
  });

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name || "",
      sku: product?.sku || "",
      description: product?.description || "",
      categoryId: product?.categoryId || "",
      mrp: product?.mrp?.toString() || "",
      price: product?.price?.toString() || "",
      discountPrice: product?.discountPrice?.toString() || "",
      taxPercent: product?.taxPercent?.toString() || "",
      stock: product?.stock?.toString() || "0",
      lowStockAlert: product?.lowStockAlert?.toString() || "10",
      isFeatured: product?.isFeatured === 1 || product?.isFeatured === true,
      isActive: product?.isActive !== undefined ? (product.isActive === 1 || product.isActive === true) : true,
    },
  });

  const handleAddImageUrl = () => {
    if (imageUrl.trim() && !images.includes(imageUrl.trim())) {
      setImages([...images, imageUrl.trim()]);
      setImageUrl("");
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl && !images.includes(dataUrl)) {
          setImages(prev => [...prev, dataUrl]);
        }
      };
      reader.readAsDataURL(file);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (data: ProductFormData) => {
    const payload = {
      name: data.name,
      sku: data.sku || undefined,
      description: data.description || undefined,
      categoryId: data.categoryId || undefined,
      mrp: data.mrp ? parseFloat(data.mrp) : undefined,
      price: parseFloat(data.price),
      discountPrice: data.discountPrice ? parseFloat(data.discountPrice) : undefined,
      taxPercent: data.taxPercent ? parseFloat(data.taxPercent) : undefined,
      stock: parseInt(data.stock),
      lowStockAlert: parseInt(data.lowStockAlert),
      isFeatured: data.isFeatured ? 1 : 0,
      isActive: data.isActive ? 1 : 0,
      images: images.length > 0 ? JSON.stringify(images) : undefined,
    };
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-product-form">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">
            {product ? "Edit Product" : "Add New Product"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Whey Protein 2kg" {...field} data-testid="input-product-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., WP-2KG-001" {...field} data-testid="input-product-sku" />
                    </FormControl>
                    <FormDescription>Stock Keeping Unit for inventory tracking</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-product-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category: any) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Product description..."
                      {...field}
                      data-testid="input-product-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Product Images</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter image URL..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddImageUrl())}
                />
                <Button type="button" variant="outline" onClick={handleAddImageUrl}>
                  Add URL
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </Button>
              </div>
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <div className="w-20 h-20 border rounded-md overflow-hidden bg-muted">
                        {img.startsWith('data:') || img.startsWith('http') ? (
                          <img src={img} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <FormDescription>Add product images via URL or upload from your device</FormDescription>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mrp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MRP (Maximum Retail Price)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        data-testid="input-product-mrp"
                      />
                    </FormControl>
                    <FormDescription>Original price before any discounts</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        data-testid="input-product-price"
                      />
                    </FormControl>
                    <FormDescription>Current selling price</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="discountPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Discount Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Optional"
                        {...field}
                        data-testid="input-product-discount-price"
                      />
                    </FormControl>
                    <FormDescription>Limited time offer price</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taxPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax %</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="e.g., 18"
                        {...field}
                        data-testid="input-product-tax-percent"
                      />
                    </FormControl>
                    <FormDescription>GST/Tax percentage (0-100)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Quantity *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        data-testid="input-product-stock"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lowStockAlert"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Low Stock Alert</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10"
                        {...field}
                        data-testid="input-product-low-stock-alert"
                      />
                    </FormControl>
                    <FormDescription>Alert when stock falls below this</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <FormField
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-product-featured"
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer">Featured Product</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-product-active"
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer">Active</FormLabel>
                  </FormItem>
                )}
              />
            </div>

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
              <Button type="submit" disabled={isPending} data-testid="button-submit">
                {isPending ? "Saving..." : product ? "Update Product" : "Add Product"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
