import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Minus, Eye, Edit, Trash2, ShoppingBag } from "lucide-react";

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
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - product.discountPrice! / product.price) * 100)
    : 0;
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock <= (product.lowStockAlert || 5) && product.stock > 0;

  return (
    <div
      className={`w-full bg-white border-2 border-[#323232] shadow-[4px_4px_0_0_#323232] rounded-[5px] flex flex-col p-4 sm:p-5 gap-2 font-sans transition-all duration-300 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#323232] ${
        !product.isActive ? "opacity-60" : ""
      }`}
    >
      <div 
        className="flex justify-center transition-all duration-500 cursor-pointer relative"
        onClick={onView}
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-[100px] h-[100px] object-cover border-2 border-black rounded-md"
          />
        ) : (
          <div className="w-[100px] h-[100px] flex items-center justify-center border-2 border-black rounded-md bg-gray-100">
            <ShoppingBag className="h-10 w-10 text-gray-400" />
          </div>
        )}

        {isLowStock && (
          <Badge className="absolute top-0 right-0 bg-yellow-500 text-black text-[10px] px-1.5">
            Low Stock
          </Badge>
        )}
        {isOutOfStock && (
          <Badge className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-1.5">
            Out of Stock
          </Badge>
        )}
        {hasDiscount && (
          <Badge className="absolute top-0 left-0 bg-green-600 text-white text-[10px] px-1.5">
            {discountPercent}% OFF
          </Badge>
        )}
        {product.isFeatured && (
          <Badge className="absolute bottom-0 left-0 bg-blue-600 text-white text-[10px] px-1.5">
            Featured
          </Badge>
        )}
      </div>

      <div className="text-[16px] sm:text-[18px] font-medium text-center text-[#323232] line-clamp-2 min-h-[40px]">
        {product.name}
      </div>

      {product.description && (
        <div className="text-[12px] sm:text-[13px] font-normal text-[#666666] line-clamp-2 text-center">
          {product.description}
        </div>
      )}

      {product.sku && (
        <div className="text-[10px] text-[#999999] text-center">
          SKU: {product.sku}
        </div>
      )}

      <hr className="w-full border border-[#323232] rounded-full my-1" />

      {/* Price Row - Always visible */}
      <div className="flex justify-center sm:justify-start">
        <div className="flex flex-col items-center sm:items-start">
          {product.mrp && product.mrp > displayPrice && (
            <span className="text-[10px] text-[#999999] line-through">
              MRP: ₹{parseFloat(String(product.mrp)).toFixed(0)}
            </span>
          )}
          <div className="text-[16px] sm:text-[20px] font-medium text-[#323232]">
            <span className="text-[14px] sm:text-[18px] font-medium text-[#666666]">₹</span>
            {parseFloat(String(displayPrice)).toFixed(0)}
            {hasDiscount && (
              <span className="text-[10px] sm:text-[11px] text-[#999999] line-through ml-1">
                ₹{parseFloat(String(product.price)).toFixed(0)}
              </span>
            )}
          </div>
          {product.taxPercent && product.taxPercent > 0 && (
            <span className="text-[9px] text-[#999999]">
              +{product.taxPercent}% tax
            </span>
          )}
        </div>
      </div>

      {/* Cart Controls - Full width on mobile */}
      <div className="flex justify-center w-full">
        {showAdminActions ? (
          <div className="flex gap-1.5">
            {onEdit && (
              <button
                onClick={onEdit}
                className="group h-[32px] bg-white border-2 border-[#323232] rounded-[5px] px-2.5 transition-all duration-300 hover:border-[#2d8cf0] active:translate-y-[2px]"
              >
                <Edit className="w-4 h-4 text-[#323232] group-hover:text-[#2d8cf0]" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="group h-[32px] bg-white border-2 border-[#323232] rounded-[5px] px-2.5 transition-all duration-300 hover:border-red-500 active:translate-y-[2px]"
              >
                <Trash2 className="w-4 h-4 text-[#323232] group-hover:text-red-500" />
              </button>
            )}
          </div>
        ) : cartItem ? (
          <div className="flex items-center justify-center gap-0 bg-gray-100 rounded-[5px] border-2 border-[#323232] w-full max-w-[120px]">
            <button
              onClick={() => onUpdateQuantity?.(-1)}
              className="h-[32px] w-[36px] flex items-center justify-center hover:bg-gray-200 transition-colors rounded-l-[3px]"
            >
              <Minus className="w-4 h-4 text-[#323232]" />
            </button>
            <span className="w-[36px] text-center font-medium text-[#323232] text-sm">
              {cartItem.quantity}
            </span>
            <button
              onClick={() => onUpdateQuantity?.(1)}
              disabled={cartItem.quantity >= product.stock}
              className="h-[32px] w-[36px] flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50 rounded-r-[3px]"
            >
              <Plus className="w-4 h-4 text-[#323232]" />
            </button>
          </div>
        ) : (
          <button
            onClick={onAddToCart}
            disabled={isOutOfStock}
            className="group h-[35px] w-full max-w-[120px] bg-white border-2 border-[#323232] rounded-[5px] px-3 transition-all duration-300 hover:border-[#2d8cf0] active:translate-y-[3px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <ShoppingCart className="w-4 h-4 text-[#323232] group-hover:text-[#2d8cf0]" />
            <span className="text-[12px] font-medium text-[#323232] group-hover:text-[#2d8cf0]">
              Add
            </span>
          </button>
        )}
      </div>

      {!product.isActive && showAdminActions && (
        <Badge variant="secondary" className="self-center text-[10px] mt-1">
          Inactive
        </Badge>
      )}

      {showAdminActions && (
        <div className="text-[10px] text-center text-[#666666] mt-1">
          Stock: {product.stock}
        </div>
      )}
    </div>
  );
}
