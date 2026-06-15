import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Order } from '@cookies/shared';
import { getEnv } from '../env';

export type EmailMessage = {
  to: string;
  subject: string;
  body: string;
};

export async function sendOrderConfirmation(order: Order): Promise<void> {
  const lines: string[] = [];
  lines.push(`Hi ${order.customer.name},`);
  lines.push('');
  lines.push('Thank you for your order. Here are the details:');
  lines.push('');
  lines.push(`Order number: ${order.orderNumber}`);
  lines.push(`Status: ${order.status}`);
  lines.push(`Fulfillment: ${order.fulfillment}`);
  lines.push(`Estimated ready: ${order.estimatedReadyAt}`);
  lines.push('');
  lines.push('Items:');
  for (const it of order.items) {
    lines.push(
      `  - ${it.quantity} × ${it.name} @ ${formatRupiah(it.unitPrice)} = ${formatRupiah(it.subtotal)}`,
    );
  }
  lines.push('');
  lines.push(`Subtotal: ${formatRupiah(order.subtotal)}`);
  if (order.deliveryFee > 0) {
    lines.push(`Delivery fee: ${formatRupiah(order.deliveryFee)}`);
  }
  lines.push(`Total: ${formatRupiah(order.total)}`);
  lines.push('');
  if (order.fulfillment === 'pickup') {
    lines.push('You will receive pickup details on the morning of the bake date.');
  } else {
    lines.push(`We will arrange delivery to: ${order.customer.address ?? '(address on file)'}`);
    lines.push('You will receive the courier details via WhatsApp.');
  }
  lines.push('');
  lines.push('With love,');
  lines.push('The Cookies Shop');

  const msg: EmailMessage = {
    to: order.customer.email,
    subject: `Order ${order.orderNumber} confirmed`,
    body: lines.join('\n'),
  };
  await send(msg);
}

export async function send(msg: EmailMessage): Promise<void> {
  const env = getEnv();
  if (env.EMAIL_PROVIDER === 'mock') {
    const dir = resolve(process.cwd(), '../../tmp/emails');
    await mkdir(dir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const file = resolve(dir, `${ts}__${slug(msg.to)}.txt`);
    const content = `To: ${msg.to}\nFrom: ${env.EMAIL_FROM}\nSubject: ${msg.subject}\n\n${msg.body}\n`;
    await writeFile(file, content, 'utf8');
    console.log(`[email:mock] wrote ${file}`);
    return;
  }
  console.warn(
    `[email:${env.EMAIL_PROVIDER}] no real provider configured; dropping message to ${msg.to}`,
  );
}

function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

function slug(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
}
