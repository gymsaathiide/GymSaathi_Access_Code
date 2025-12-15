import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Plus,
  Minus,
  Eye,
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
    taxPercent?: number;
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
      className={`relative w-[190px] h-[320px] cursor-pointer overflow-visible group mx-auto ${!product.isActive ? "opacity-60" : ""}`}
    >
      {/* Orange rotated background */}
      <div className="absolute inset-0 bg-[#ee9933] rounded-[5px] shadow-[0_0_5px_1px_#00000022] rotate-[5deg] transition-transform duration-300 group-hover:rotate-0 group-active:shadow-none"></div>

      {/* White content card */}
      <div className="content absolute inset-0 bg-white rounded-[5px] shadow-[0_0_5px_1px_#00000022] p-4 flex flex-col items-center -rotate-[5deg] transition-transform duration-300 group-hover:rotate-0 group-active:shadow-none">
        {/* Image */}
        <div
          className="relative w-[120px] h-[100px] flex items-center justify-center"
          onClick={onView}
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover rounded-md"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-md">
              <ShoppingBag className="h-10 w-10 text-gray-400" />
            </div>
          )}

          {/* Badges */}
          {isLowStock && (
            <Badge className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[8px] px-1">
              Low Stock
            </Badge>
          )}
          {isOutOfStock && (
            <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] px-1">
              Out of Stock
            </Badge>
          )}
          {hasDiscount && (
            <Badge className="absolute -top-2 -left-2 bg-green-600 text-white text-[8px] px-1">
              {discountPercent}% OFF
            </Badge>
          )}
          {product.isFeatured && (
            <Badge className="absolute -bottom-2 -left-2 bg-blue-600 text-white text-[8px] px-1">
              Featured
            </Badge>
          )}
        </div>

        {/* Description */}
        <div className="w-full mt-4 text-center flex-1 flex flex-col justify-between">
          <div>
            <p className="mb-1">
              <strong className="font-bold text-slate-900 text-sm line-clamp-2">
                {product.name}
              </strong>
            </p>
            {product.description && (
              <p className="mb-1 text-xs text-[#00000066] line-clamp-2">
                {product.description}
              </p>
            )}
            {product.sku && (
              <p className="text-[10px] text-[#00000044]">SKU: {product.sku}</p>
            )}
            {showAdminActions && (
              <p className="text-xs text-[#00000066]">Stock: {product.stock}</p>
            )}
          </div>

          {/* Price */}
          <div className="mb-2">
            {product.mrp && product.mrp > displayPrice && (
              <p className="text-[10px] text-[#00000044] line-through">
                MRP: ₹{parseFloat(String(product.mrp)).toFixed(0)}
              </p>
            )}
            <p className="font-bold text-[#ee9933] text-lg">
              <span className="mr-0.5 text-sm">₹</span>
              {parseFloat(String(displayPrice)).toFixed(0)}
              {hasDiscount && (
                <span className="text-[10px] text-[#00000044] line-through ml-1 font-normal">
                  ₹{parseFloat(String(product.price)).toFixed(0)}
                </span>
              )}
            </p>
            {product.taxPercent && product.taxPercent > 0 && (
              <p className="text-[9px] text-[#00000044]">
                +{product.taxPercent}% tax
              </p>
            )}
          </div>

          {/* Cart Controls */}
          <div className="flex justify-center w-full">
            {showAdminActions ? (
              <div className="flex gap-2">
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="group/btn h-[30px] bg-white border-2 border-slate-300 rounded-md px-3 transition-all duration-300 hover:border-blue-500 hover:bg-blue-50"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-600 group-hover/btn:text-blue-500" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={onDelete}
                    className="group/btn h-[30px] bg-white border-2 border-slate-300 rounded-md px-3 transition-all duration-300 hover:border-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-slate-600 group-hover/btn:text-red-500" />
                  </button>
                )}
              </div>
            ) : cartItem ? (
              <div className="flex items-center justify-center gap-0 bg-gray-100 rounded-md border border-slate-300 overflow-hidden">
                <button
                  onClick={() => onUpdateQuantity?.(-1)}
                  className="h-[30px] w-[32px] flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5 text-slate-700" />
                </button>
                <span className="w-[32px] text-center font-semibold text-slate-800 text-sm">
                  {cartItem.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity?.(1)}
                  disabled={cartItem.quantity >= product.stock}
                  className="h-[30px] w-[32px] flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-700" />
                </button>
              </div>
            ) : (
              <button
                onClick={onAddToCart}
                disabled={isOutOfStock}
                className="group/btn h-[32px] bg-[#ee9933] text-white border-none rounded-md px-4 transition-all duration-300 hover:bg-[#dd8822] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">Add</span>
              </button>
            )}
          </div>
        </div>

        {!product.isActive && showAdminActions && (
          <Badge
            variant="secondary"
            className="absolute top-2 right-2 text-[8px]"
          >
            Inactive
          </Badge>
        )}
      </div>
    </div>
  );
}
