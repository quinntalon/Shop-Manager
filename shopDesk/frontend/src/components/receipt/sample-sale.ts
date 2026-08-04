import type { Sale } from "@workspace/api-client-react";

export const SAMPLE_SALE: Sale = {
  id: 1042,
  customerName: "Ama Owusu",
  customerPhone: "024 123 4567",
  note: "Gift wrap please",
  paymentMethod: "momo",
  transactionId: "MP240715.1234.A56789",
  bankName: null,
  deliveryPaymentStatus: null,
  subtotal: 84.5,
  cartDiscount: 4.5,
  discountTotal: 9.5,
  total: 75,
  createdAt: new Date().toISOString(),
  items: [
    { productId: 1, productName: "Kente Print Tote Bag", productPhotoUrl: null, quantity: 2, unitPrice: 25, discount: 5 },
    { productId: 2, productName: "Shea Butter Lotion", productPhotoUrl: null, quantity: 3, unitPrice: 11.5, discount: 0 },
  ],
} as unknown as Sale;
