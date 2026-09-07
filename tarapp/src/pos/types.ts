export interface PosRecord {
  id: string;
  title: string;
  state: string;
  version: number;
  createdAt: number;
  data: Record<string, unknown>;
}
export interface PosOverview {
  settings: PosRecord | null;
  register: (PosRecord & { expected: number }) | null;
  summary: { sales: number; orders: number; lowStock: number; currency: string; businessDate: string };
  canManage: boolean;
  paymentMethods: string[];
}
export interface CartLine { product: PosRecord; quantity: number }
export interface SaleLine { productId: string; title: string; quantity: number; price: number; discount: number; tax: number; total: number }
export function cartTotals(cart: CartLine[], discountBps: number) {
  return cart.reduce((sum, line) => {
    const gross = Number(line.product.data.price) * line.quantity;
    const discount = Math.round(gross * discountBps / 10000);
    const tax = Math.round((gross - discount) * Number(line.product.data.taxBps) / 10000);
    return { subtotal: sum.subtotal + gross, discount: sum.discount + discount, tax: sum.tax + tax, total: sum.total + gross - discount + tax };
  }, { subtotal: 0, discount: 0, tax: 0, total: 0 });
}
export const money = (value: number, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(value / 100);
export function minorUnits(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) throw new Error('Enter an amount with up to two decimal places.');
  return Math.round(Number(value) * 100);
}
