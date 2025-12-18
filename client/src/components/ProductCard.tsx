import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Plus,
  Minus,
  Edit,
  Trash2,
  ShoppingBag,
} from "lucide-react";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    description?: string;
    price: number;
    discountPrice?: number;
    mrp?: number;
    stock: number;
    lowStockAlert?: number;
    imageUrl?: string;
    isActive?: boolean;
    isFeatured?: boolean;
    sku?: string;
  };
  cartItem?: {
    quantity: number;
  };
  onAddToCart?: () => void;
  onUpdateQuantity?: (delta: number) => void;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showAdminActions?: boolean;
}

export function ProductCard({
  product,
  cartItem,
  onAddToCart,
  onUpdateQuantity,
  onView,
  onEdit,
  onDelete,
  showAdminActions = false,
}: ProductCardProps) {
  const displayPrice = product.discountPrice || product.price;
  const hasDiscount =
    product.discountPrice && product.discountPrice < product.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - product.discountPrice! / product.price) * 100)
    : 0;

  const isOutOfStock = product.stock === 0;
  const isLowStock =
    product.stock <= (product.lowStockAlert || 5) && product.stock > 0;

  return (
    <div
      className={`relative w-full max-w-[180px] min-h-[300px] mx-auto group ${
        !product.isActive ? "opacity-60" : ""
      }`}
    >
      {/* Orange tilted layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#ee9933] to-[#f2b35a] rounded-xl rotate-[2deg] transition-transform duration-300 group-hover:rotate-0" />

      {/* White card */}
      <div className="relative z-10 bg-white rounded-xl p-4 shadow-md flex flex-col h-full transition-transform duration-300 group-hover:translate-y-[-2px]">
        {/* Image */}
        <div
          className="relative h-[110px] w-full flex items-center justify-center cursor-pointer"
          onClick={onView}
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full object-contain scale-95 transition-transform duration-300 group-hover:scale-100"
            />
          ) : (
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
          )}

          {/* Badges */}
          {hasDiscount && (
            <Badge className="absolute top-0 left-0 text-[9px] bg-green-600 text-white">
              {discountPercent}% OFF
            </Badge>
          )}
          {isLowStock && (
            <Badge className="absolute top-0 right-0 text-[9px] bg-yellow-500 text-black">
              Low
            </Badge>
          )}
          {isOutOfStock && (
            <Badge className="absolute top-0 right-0 text-[9px] bg-red-500 text-white">
              Out
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 mt-3 text-center">
          <h3 className="text-[13px] font-semibold text-slate-900 line-clamp-2 min-h-[34px]">
            {product.name}
          </h3>

          <p className="text-[11px] text-muted-foreground line-clamp-2 min-h-[28px] mt-1">
            {product.description || " "}
          </p>

          {/* Price */}
          <div className="mt-3">
            {product.mrp && product.mrp > displayPrice && (
              <p className="text-[10px] text-muted-foreground line-through">
                ₹{product.mrp}
              </p>
            )}
            <p className="text-lg font-bold text-[#ee9933]">₹{displayPrice}</p>
          </div>

          {/* Actions (Pinned Bottom) */}
          <div className="mt-auto pt-3">
            {showAdminActions ? (
              <div className="flex justify-center gap-2">
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="h-8 px-3 rounded-md border hover:bg-blue-50"
                  >
                    <Edit className="h-4 w-4 text-blue-600" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={onDelete}
                    className="h-8 px-3 rounded-md border hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                )}
              </div>
            ) : cartItem ? (
              <div className="flex items-center justify-center gap-2 bg-gray-100 rounded-full px-3 py-1">
                <button onClick={() => onUpdateQuantity?.(-1)}>
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="text-sm font-semibold">
                  {cartItem.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity?.(1)}
                  disabled={cartItem.quantity >= product.stock}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onAddToCart}
                disabled={isOutOfStock}
                className="w-full h-[34px] rounded-full bg-[#ee9933] hover:bg-[#dd8822] text-white text-[12px] font-semibold shadow-md transition-transform hover:scale-[1.03] disabled:opacity-50"
              >
                <ShoppingCart className="inline h-4 w-4 mr-1" />
                Add
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
