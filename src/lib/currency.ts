export function formatINR(amount: number): string {
  return `\u20B9${Math.round(amount).toLocaleString('en-IN')}`;
}

export interface OfferInfo {
  hasOffer: boolean;
  price: number;
  originalPrice: number;
  discountPercent: number;
}

// Derives display pricing for a product. When an offer is active and the
// original price is genuinely higher than the selling price, returns the
// struck-through original and the computed discount percentage.
export function getOfferInfo(product: {
  price: number;
  original_price?: number | null;
  offer_active?: boolean;
}): OfferInfo {
  const price = Number(product.price);
  const originalPrice = Number(product.original_price ?? 0);
  const hasOffer =
    Boolean(product.offer_active) && originalPrice > price && price > 0;
  const discountPercent = hasOffer
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;
  return { hasOffer, price, originalPrice, discountPercent };
}
