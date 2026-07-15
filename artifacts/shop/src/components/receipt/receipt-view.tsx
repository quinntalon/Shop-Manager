import type { CSSProperties } from "react";
import type { ReceiptTemplateConfig, ReceiptElementId, Sale } from "@workspace/api-client-react";
import { ImagePlus } from "lucide-react";

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

const FONT_SIZE_PX: Record<string, number> = { xs: 10, sm: 11, base: 13, lg: 16, xl: 20 };
const FONT_FAMILY_CSS: Record<string, string> = {
  sans: "'Plus Jakarta Sans', system-ui, sans-serif",
  mono: "'Roboto Mono', 'Courier New', monospace",
  serif: "'Georgia', 'Times New Roman', serif",
};
const PAPER_WIDTH_PX: Record<string, number> = { "58mm": 219, "80mm": 302 };

function textStyle(config: ReceiptTemplateConfig, elementId: ReceiptElementId): CSSProperties {
  const el = config.elements.find((e) => e.id === elementId);
  return {
    textAlign: el?.align ?? "left",
    fontWeight: el?.bold ? 700 : 400,
    fontSize: FONT_SIZE_PX[el?.fontSize ?? "sm"],
    color: el?.color || config.textColor,
  };
}

function isVisible(config: ReceiptTemplateConfig, elementId: ReceiptElementId): boolean {
  return config.elements.find((e) => e.id === elementId)?.visible ?? true;
}

function orderedElementIds(config: ReceiptTemplateConfig): ReceiptElementId[] {
  return [...config.elements].sort((a, b) => a.order - b.order).map((e) => e.id);
}

function formatMoney(n: number | string | null | undefined): string {
  return `$${Number(n ?? 0).toFixed(2)}`;
}

interface ReceiptViewProps {
  config: ReceiptTemplateConfig;
  sale: Sale;
  className?: string;
}

export function ReceiptView({ config, sale, className }: ReceiptViewProps) {
  const width = PAPER_WIDTH_PX[config.paperSize] ?? PAPER_WIDTH_PX["80mm"];
  const gap = config.spacing;

  function renderElement(id: ReceiptElementId) {
    if (!isVisible(config, id)) return null;
    switch (id) {
      case "logo":
        return config.showLogo && config.logoUrl ? (
          <div key={id} style={{ display: "flex", justifyContent: textStyle(config, id).textAlign as string }}>
            <img src={config.logoUrl} alt="Logo" style={{ height: 48, width: 48, objectFit: "contain" }} />
          </div>
        ) : null;

      case "storeInfo":
        return (
          <div key={id} style={textStyle(config, id)}>
            <div>{config.storeName}</div>
            {config.storeAddress && <div style={{ fontWeight: 400, fontSize: FONT_SIZE_PX.sm }}>{config.storeAddress}</div>}
            {config.storePhone && <div style={{ fontWeight: 400, fontSize: FONT_SIZE_PX.sm }}>{config.storePhone}</div>}
          </div>
        );

      case "receiptMeta":
        return (
          <div key={id} style={textStyle(config, id)}>
            <div>Sale #{sale.id}</div>
            <div>
              {new Date(sale.createdAt).toLocaleString(undefined, {
                month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </div>
          </div>
        );

      case "customerInfo":
        return (
          <div key={id} style={textStyle(config, id)}>
            <div>{sale.customerName || "Walk-in Customer"}</div>
            {sale.customerPhone && <div>{sale.customerPhone}</div>}
            {sale.note && <div style={{ fontStyle: "italic" }}>Note: {sale.note}</div>}
          </div>
        );

      case "itemsTable":
        return (
          <div key={id} style={{ ...textStyle(config, id), textAlign: "left" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "inherit" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${config.textColor}33` }}>
                  <th style={{ textAlign: "left", padding: "2px 0" }}>Item</th>
                  <th style={{ textAlign: "right", padding: "2px 0" }}>Qty</th>
                  <th style={{ textAlign: "right", padding: "2px 0" }}>Amt</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: "2px 0" }}>{item.productName ?? `Product #${item.productId}`}</td>
                    <td style={{ textAlign: "right", padding: "2px 0" }}>{item.quantity}</td>
                    <td style={{ textAlign: "right", padding: "2px 0" }}>
                      {formatMoney(Number(item.unitPrice) * item.quantity - Number(item.discount ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "totals":
        return (
          <div key={id} style={textStyle(config, id)}>
            <div style={{ fontWeight: 400, fontSize: FONT_SIZE_PX.sm, opacity: 0.8 }}>
              Subtotal: {formatMoney(sale.subtotal)}
            </div>
            {Number(sale.discountTotal) > 0 && (
              <div style={{ fontWeight: 400, fontSize: FONT_SIZE_PX.sm, opacity: 0.8 }}>
                Discount: -{formatMoney(sale.discountTotal)}
              </div>
            )}
            <div>Total: {formatMoney(sale.total)}</div>
          </div>
        );

      case "paymentDetails": {
        const label =
          sale.paymentMethod === "momo" ? "Momo" :
          sale.paymentMethod === "card" ? "Card" :
          sale.paymentMethod === "bank" ? "Bank" :
          sale.paymentMethod === "delivery" ? "Delivery" : "Cash";
        return (
          <div key={id} style={textStyle(config, id)}>
            <div>Payment: {label}</div>
            {sale.paymentMethod === "momo" && sale.transactionId && <div>Txn: {sale.transactionId}</div>}
            {sale.paymentMethod === "bank" && sale.bankName && <div>{sale.bankName}</div>}
            {sale.paymentMethod === "delivery" && sale.deliveryPaymentStatus && (
              <div>{sale.deliveryPaymentStatus === "paid" ? "Paid" : "Pay on Delivery"}</div>
            )}
          </div>
        );
      }

      case "footer":
        return (
          <div key={id} style={textStyle(config, id)}>
            {config.footerText}
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div
      className={className}
      style={{
        width,
        margin: "0 auto",
        backgroundColor: config.backgroundColor,
        color: config.textColor,
        fontFamily: FONT_FAMILY_CSS[config.fontFamily] ?? FONT_FAMILY_CSS.sans,
        fontSize: config.baseFontSize,
        padding: gap * 2,
        display: "flex",
        flexDirection: "column",
        gap,
        boxSizing: "border-box",
      }}
      data-testid="receipt-preview"
    >
      {orderedElementIds(config).map(renderElement)}
    </div>
  );
}

export function ReceiptPlaceholderIcon() {
  return <ImagePlus className="h-4 w-4" />;
}
