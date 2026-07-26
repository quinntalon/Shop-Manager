import type { CSSProperties } from "react";
import type { ReceiptTemplateConfig, ReceiptElementId, ReceiptElementStyle, Sale, SaleItem } from "@workspace/api-client-react";
import type { CustomBlock, ExtendedConfig, FooterRow, ItemColumn, ItemColumnKey } from "@/pages/settings/receipt-editor";
import { DEFAULT_ITEM_COLUMNS } from "@/pages/settings/receipt-editor";

const FONT_SIZE_PX: Record<string, number> = { xs: 10, sm: 11, base: 13, lg: 16, xl: 20 };
const FONT_FAMILY_CSS: Record<string, string> = {
  sans: "'Plus Jakarta Sans', system-ui, sans-serif",
  mono: "'Roboto Mono', 'Courier New', monospace",
  serif: "'Georgia', 'Times New Roman', serif",
};
const PAPER_WIDTH_PX: Record<string, number> = {
  "58mm": 219,
  "80mm": 302,
  "A4": 595,
};

// ─── Template variable substitution ──────────────────────────────────────────

function substituteVars(
  text: string,
  config: ReceiptTemplateConfig,
  sale: Sale
): string {
  const ext = config as ExtendedConfig;
  const date = new Date(sale.createdAt);
  const map: Record<string, string> = {
    "{{store_name}}":     ext.storeName ?? "",
    "{{store_address}}":  ext.storeAddress ?? "",
    "{{store_phone}}":    ext.storePhone ?? "",
    "{{receipt_number}}": String(sale.id),
    "{{date}}":           date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    "{{time}}":           date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
    "{{customer_name}}":  sale.customerName ?? "Walk-in",
    "{{customer_phone}}": sale.customerPhone ?? "",
    "{{payment_method}}": sale.paymentMethod ?? "",
    "{{transaction_id}}": sale.transactionId ?? "",
    "{{subtotal}}":       formatMoney(sale.subtotal),
    "{{discount}}":       formatMoney(sale.discountTotal),
    "{{total}}":          formatMoney(sale.total),
  };
  return Object.entries(map).reduce((s, [k, v]) => s.replaceAll(k, v), text);
}

function textStyle(config: ReceiptTemplateConfig, elementId: ReceiptElementId): CSSProperties {
  const el = config.elements.find((e: ReceiptElementStyle) => e.id === elementId);
  const extEl = el as (ReceiptElementStyle & { backgroundColor?: string | null; paddingTop?: number; paddingBottom?: number }) | undefined;
  return {
    textAlign: el?.align ?? "left",
    fontWeight: el?.bold ? 700 : 400,
    fontSize: FONT_SIZE_PX[el?.fontSize ?? "sm"],
    color: el?.color || config.textColor,
    backgroundColor: extEl?.backgroundColor || undefined,
    paddingTop: extEl?.paddingTop ?? undefined,
    paddingBottom: extEl?.paddingBottom ?? undefined,
  };
}

function isVisible(config: ReceiptTemplateConfig, elementId: ReceiptElementId): boolean {
  return config.elements.find((e: ReceiptElementStyle) => e.id === elementId)?.visible ?? true;
}

function formatMoney(n: number | string | null | undefined): string {
  return `₵${Number(n ?? 0).toFixed(2)}`;
}

// ─── Unified ordered items ────────────────────────────────────────────────────

type RenderItem =
  | { kind: "fixed"; id: ReceiptElementId; order: number }
  | { kind: "custom"; block: CustomBlock; order: number };

function getOrderedItems(config: ReceiptTemplateConfig): RenderItem[] {
  const ext = config as ExtendedConfig;
  const items: RenderItem[] = [
    ...config.elements.map((el: ReceiptElementStyle) => ({
      kind: "fixed" as const,
      id: el.id,
      order: el.order,
    })),
    ...(ext.customBlocks ?? []).map((block: CustomBlock) => ({
      kind: "custom" as const,
      block,
      order: block.order,
    })),
  ];
  return items.sort((a, b) => a.order - b.order);
}

// ─── Custom block renderers ───────────────────────────────────────────────────

function renderCustomBlock(block: CustomBlock, config: ReceiptTemplateConfig, sale: Sale): React.ReactNode {
  if (!block.visible) return null;

  const blockTextStyle: CSSProperties = {
    textAlign: block.align,
    fontWeight: block.bold ? 700 : 400,
    fontSize: FONT_SIZE_PX[block.fontSize],
    color: block.color || config.textColor,
  };

  const justifyMap: Record<string, string> = {
    left: "flex-start",
    center: "center",
    right: "flex-end",
  };

  switch (block.type) {
    case "divider":
      return (
        <div key={block.id} style={{ padding: "2px 0" }}>
          <hr
            style={{
              border: "none",
              borderTop: `1px solid ${block.color || config.textColor}`,
              margin: 0,
            }}
          />
        </div>
      );

    case "textBlock": {
      const resolved = substituteVars(block.text ?? "", config, sale);
      return (
        <div key={block.id} style={blockTextStyle}>
          {resolved || (
            <span style={{ opacity: 0.4, fontStyle: "italic" }}>Custom text</span>
          )}
        </div>
      );
    }

    case "image":
      return block.imageUrl ? (
        <div
          key={block.id}
          style={{ display: "flex", justifyContent: justifyMap[block.align] ?? "center" }}
        >
          <img
            src={block.imageUrl}
            alt=""
            style={{ height: block.imageHeight ?? 48, objectFit: "contain" }}
          />
        </div>
      ) : (
        <div
          key={block.id}
          style={{
            border: `1px dashed ${config.textColor}55`,
            padding: "6px",
            textAlign: "center",
            fontSize: FONT_SIZE_PX.xs,
            color: `${config.textColor}60`,
            borderRadius: 2,
          }}
        >
          Image (no URL set)
        </div>
      );

    case "spacer":
      return <div key={block.id} style={{ height: block.height ?? 16 }} />;

    case "qrCode": {
      const value =
        block.dataField === "custom"
          ? block.customValue || "Custom value"
          : `SALE #${sale.id}`;
      const c = block.color || config.textColor;
      return (
        <div
          key={block.id}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: justifyMap[block.align] ?? "center",
            gap: 3,
          }}
        >
          <svg width="64" height="64" viewBox="0 0 10 10" style={{ color: c }} aria-label="QR code">
            <rect x="0" y="0" width="4" height="4" fill="currentColor" rx="0.4" />
            <rect x="1" y="1" width="2" height="2" fill="white" />
            <rect x="6" y="0" width="4" height="4" fill="currentColor" rx="0.4" />
            <rect x="7" y="1" width="2" height="2" fill="white" />
            <rect x="0" y="6" width="4" height="4" fill="currentColor" rx="0.4" />
            <rect x="1" y="7" width="2" height="2" fill="white" />
            <rect x="5" y="5" width="1" height="1" fill="currentColor" />
            <rect x="7" y="5" width="1" height="1" fill="currentColor" />
            <rect x="9" y="5" width="1" height="1" fill="currentColor" />
            <rect x="5" y="7" width="2" height="1" fill="currentColor" />
            <rect x="8" y="7" width="2" height="1" fill="currentColor" />
            <rect x="5" y="9" width="1" height="1" fill="currentColor" />
            <rect x="7" y="9" width="1" height="1" fill="currentColor" />
            <rect x="9" y="9" width="1" height="1" fill="currentColor" />
            <rect x="5" y="6" width="1" height="1" fill="currentColor" />
          </svg>
          <div style={{ fontSize: FONT_SIZE_PX.xs, color: `${c}99` }}>{value}</div>
        </div>
      );
    }

    case "barcode": {
      const value =
        block.dataField === "custom"
          ? block.customValue || "Custom value"
          : `SALE-${sale.id}`;
      const c = block.color || config.textColor;
      const pattern = Array.from({ length: 22 }, (_, i) => {
        const charCode = value.charCodeAt(i % value.length) || 0;
        return (charCode + i) % 3 === 0 ? 2 : 1;
      });
      return (
        <div
          key={block.id}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: justifyMap[block.align] ?? "center",
            gap: 3,
          }}
        >
          <div
            style={{ width: 96, height: 36, display: "flex", alignItems: "stretch", gap: "1px", padding: "2px 0" }}
            aria-label="Barcode"
          >
            {pattern.map((w, i) => (
              <div key={i} style={{ flex: w, backgroundColor: i % 2 === 0 ? c : "transparent" }} />
            ))}
          </div>
          <div style={{ fontSize: FONT_SIZE_PX.xs, color: `${c}99`, letterSpacing: 1 }}>{value}</div>
        </div>
      );
    }

    default:
      return null;
  }
}

// ─── Footer row renderer ──────────────────────────────────────────────────────

function renderFooterRow(row: FooterRow, config: ReceiptTemplateConfig, sale: Sale): React.ReactNode {
  const justifyMap: Record<string, string> = { left: "flex-start", center: "center", right: "flex-end" };
  const rowStyle: CSSProperties = {
    textAlign: row.align,
    fontWeight: row.bold ? 700 : 400,
    fontSize: FONT_SIZE_PX[row.fontSize],
    color: row.color || config.textColor,
  };

  switch (row.type) {
    case "text": {
      const resolved = substituteVars(row.content ?? "", config, sale);
      return (
        <div key={row.id} style={rowStyle}>
          {resolved || <span style={{ opacity: 0.4, fontStyle: "italic" }}>Footer text</span>}
        </div>
      );
    }
    case "image":
      return row.imageUrl ? (
        <div key={row.id} style={{ display: "flex", justifyContent: justifyMap[row.align] ?? "center" }}>
          <img src={row.imageUrl} alt="" style={{ height: row.imageHeight ?? 40, objectFit: "contain" }} />
        </div>
      ) : null;
    case "divider":
      return (
        <div key={row.id} style={{ padding: "2px 0" }}>
          <hr style={{ border: "none", borderTop: `1px solid ${config.textColor}44`, margin: 0 }} />
        </div>
      );
    case "spacer":
      return <div key={row.id} style={{ height: 10 }} />;
    default:
      return null;
  }
}

// ─── Items table with configurable columns ────────────────────────────────────

function getItemValue(item: SaleItem, key: ItemColumnKey): string {
  switch (key) {
    case "name":      return item.productName ?? `Product #${item.productId}`;
    case "sku":       return "";  // SaleItem doesn't carry SKU, show blank
    case "qty":       return String(item.quantity);
    case "unitPrice": return formatMoney(item.unitPrice);
    case "discount":  return item.discount ? formatMoney(item.discount) : "";
    case "lineTotal": return formatMoney(Number(item.unitPrice) * item.quantity - Number(item.discount ?? 0));
    default:          return "";
  }
}

function renderItemsTable(
  config: ReceiptTemplateConfig,
  sale: Sale,
  elementStyle: CSSProperties
): React.ReactNode {
  const ext = config as ExtendedConfig;
  const rawColumns = ext.itemColumns && ext.itemColumns.length > 0
    ? ext.itemColumns
    : DEFAULT_ITEM_COLUMNS;

  const visibleCols = [...rawColumns]
    .sort((a: ItemColumn, b: ItemColumn) => a.order - b.order)
    .filter((c: ItemColumn) => c.visible);

  return (
    <div style={{ ...elementStyle, textAlign: "left" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "inherit" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${config.textColor}33` }}>
            {visibleCols.map((col: ItemColumn) => (
              <th
                key={col.id}
                style={{ textAlign: col.align, padding: "2px 2px 2px 0", fontWeight: 600 }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item: SaleItem, idx: number) => (
            <tr key={idx}>
              {visibleCols.map((col: ItemColumn) => (
                <td
                  key={col.id}
                  style={{ textAlign: col.align, padding: "2px 2px 2px 0" }}
                >
                  {getItemValue(item, col.key as ItemColumnKey)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ReceiptViewProps {
  config: ReceiptTemplateConfig;
  sale: Sale;
  className?: string;
}

export function ReceiptView({ config, sale, className }: ReceiptViewProps) {
  const ext = config as ExtendedConfig;
  const width = PAPER_WIDTH_PX[ext.paperSize ?? "80mm"] ?? PAPER_WIDTH_PX["80mm"];
  const gap = config.spacing;

  const borderStyle = ext.borderStyle ?? "none";
  const borderCss =
    borderStyle === "none"
      ? undefined
      : `1px ${borderStyle} ${ext.borderColor ?? "#e2e8f0"}`;
  const borderRadius = ext.borderRadius ?? 0;

  function renderFixed(id: ReceiptElementId): React.ReactNode {
    if (!isVisible(config, id)) return null;
    const elStyle = textStyle(config, id);

    switch (id) {
      case "logo": {
        const alignMap: Record<string, string> = { left: "flex-start", center: "center", right: "flex-end" };
        const logoAlign = alignMap[elStyle.textAlign as string] ?? "center";
        if (!config.showLogo) return null;
        const logoSize = ext.logoSize ?? 48;
        return (
          <div key={id} style={{ ...elStyle, display: "flex", justifyContent: logoAlign }}>
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt="Logo"
                style={{ height: logoSize, width: logoSize, objectFit: "contain" }}
              />
            ) : (
              <div
                style={{
                  height: logoSize,
                  width: logoSize,
                  border: `1px dashed ${config.textColor}55`,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  color: `${config.textColor}60`,
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                Logo
              </div>
            )}
          </div>
        );
      }

      case "storeInfo":
        return (
          <div key={id} style={elStyle}>
            <div>{config.storeName}</div>
            {config.storeAddress && (
              <div style={{ fontWeight: 400, fontSize: FONT_SIZE_PX.sm }}>{config.storeAddress}</div>
            )}
            {config.storePhone && (
              <div style={{ fontWeight: 400, fontSize: FONT_SIZE_PX.sm }}>{config.storePhone}</div>
            )}
          </div>
        );

      case "receiptMeta":
        return (
          <div key={id} style={elStyle}>
            <div>Sale #{sale.id}</div>
            <div>
              {new Date(sale.createdAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        );

      case "customerInfo":
        return (
          <div key={id} style={elStyle}>
            <div>{sale.customerName || "Walk-in Customer"}</div>
            {sale.customerPhone && <div>{sale.customerPhone}</div>}
            {sale.note && <div style={{ fontStyle: "italic" }}>Note: {sale.note}</div>}
          </div>
        );

      case "itemsTable":
        return renderItemsTable(config, sale, elStyle);

      case "totals":
        return (
          <div key={id} style={elStyle}>
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
          sale.paymentMethod === "momo"   ? "Momo"     :
          sale.paymentMethod === "card"   ? "Card"     :
          sale.paymentMethod === "bank"   ? "Bank"     :
          sale.paymentMethod === "delivery" ? "Delivery" : "Cash";
        return (
          <div key={id} style={elStyle}>
            <div>Payment: {label}</div>
            {sale.paymentMethod === "momo" && sale.transactionId && (
              <div>Txn: {sale.transactionId}</div>
            )}
            {sale.paymentMethod === "bank" && sale.bankName && (
              <div>{sale.bankName}</div>
            )}
            {sale.paymentMethod === "delivery" && sale.deliveryPaymentStatus && (
              <div>{sale.deliveryPaymentStatus === "paid" ? "Paid" : "Pay on Delivery"}</div>
            )}
          </div>
        );
      }

      case "footer": {
        const footerRows = ext.footerRows ?? [];
        if (footerRows.length > 0) {
          // Use the footer rows system
          return (
            <div key={id} style={elStyle}>
              {footerRows.map((row: FooterRow) => renderFooterRow(row, config, sale))}
            </div>
          );
        }
        // Fall back to simple footerText
        return (
          <div key={id} style={elStyle}>
            {config.footerText}
          </div>
        );
      }

      default:
        return null;
    }
  }

  const orderedItems = getOrderedItems(config);

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
        border: borderCss,
        borderRadius: borderRadius > 0 ? borderRadius : undefined,
      }}
      data-testid="receipt-preview"
    >
      {orderedItems.map((item) =>
        item.kind === "fixed"
          ? renderFixed(item.id)
          : renderCustomBlock(item.block, config, sale)
      )}
    </div>
  );
}
