'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order, OrderDetail, Product, Customer, Shop } from '@/types';
import { createTranslator } from '@/lib/i18n/translate';
import type { Locale } from '@/lib/i18n/config';

type OrderPdfParams = {
  order: Order;
  details: OrderDetail[];
  customer: Customer;
  products: Product[];
  locale: Locale;
  shop: Shop | null;
};

type JsPdfWithAutoTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

const FONT_FAMILY = 'BeVietnamPro';
const FONT_FILES = {
  normal: '/fonts/BeVietnamPro-Regular.ttf',
  bold: '/fonts/BeVietnamPro-Bold.ttf',
} as const;

let fontCachePromise: Promise<{ normal: string; bold: string }> | null = null;

function formatCurrency(value: number) {
  return `$${value.toLocaleString()}`;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function fetchFontBase64(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load font: ${url}`);
  }

  return arrayBufferToBase64(await response.arrayBuffer());
}

async function getEmbeddedFonts() {
  if (!fontCachePromise) {
    fontCachePromise = Promise.all([
      fetchFontBase64(FONT_FILES.normal),
      fetchFontBase64(FONT_FILES.bold),
    ]).then(([normal, bold]) => ({ normal, bold }));
  }

  return fontCachePromise;
}

async function loadImageAsDataUrl(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load image: ${url}`);
  }

  const blob = await response.blob();

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Failed to read image'));
    };
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(blob);
  });
}

async function registerFonts(doc: jsPDF) {
  const fonts = await getEmbeddedFonts();

  doc.addFileToVFS('BeVietnamPro-Regular.ttf', fonts.normal);
  doc.addFont('BeVietnamPro-Regular.ttf', FONT_FAMILY, 'normal');
  doc.addFileToVFS('BeVietnamPro-Bold.ttf', fonts.bold);
  doc.addFont('BeVietnamPro-Bold.ttf', FONT_FAMILY, 'bold');
}

export async function generateOrderPdf({
  order,
  details,
  customer,
  products,
  locale,
  shop,
}: OrderPdfParams) {
  const t = createTranslator(locale);
  const dateLocale = locale === 'vi' ? 'vi-VN' : 'en-US';
  const doc = new jsPDF({ unit: 'pt', format: 'a4' }) as JsPdfWithAutoTable;

  await registerFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(20);
  doc.setTextColor('#064E3B');
  doc.text(shop?.name || 'Hardware Shop', margin, cursorY);

  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(10);
  doc.setTextColor('#64748B');

  let shopInfoY = cursorY + 18;

  if (shop?.address) {
    const addressLines = doc.splitTextToSize(shop.address, contentWidth - 90);
    doc.text(addressLines, margin, shopInfoY);
    shopInfoY += addressLines.length * 12;
  }

  if (shop?.phone) {
    doc.text(`${t('phone')}: ${shop.phone}`, margin, shopInfoY);
    shopInfoY += 12;
  }

  if (shop?.logo_url) {
    try {
      const logoDataUrl = await loadImageAsDataUrl(shop.logo_url);
      doc.addImage(logoDataUrl, 'PNG', pageWidth - margin - 60, cursorY - 6, 60, 60);
    } catch {
      // Ignore logo failures so the invoice can still download.
    }
  }

  doc.setDrawColor('#059669');
  doc.setLineWidth(1.5);
  doc.line(margin, Math.max(shopInfoY, cursorY + 70), pageWidth - margin, Math.max(shopInfoY, cursorY + 70));
  cursorY = Math.max(shopInfoY, cursorY + 70) + 28;

  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(24);
  doc.setTextColor('#064E3B');
  doc.text(t('invoiceTitle'), margin, cursorY);

  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(10);
  doc.setTextColor('#64748B');
  doc.text(`${t('orderLabel')} #${order.id.slice(0, 8).toUpperCase()}`, margin, cursorY + 18);
  doc.text(
    `${t('date')}: ${new Date(order.created_at).toLocaleDateString(dateLocale)}`,
    pageWidth - margin,
    cursorY + 18,
    { align: 'right' }
  );

  cursorY += 52;

  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(12);
  doc.setTextColor('#0F172A');
  doc.text(t('billTo'), margin, cursorY);

  cursorY += 18;
  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(10);
  doc.setTextColor('#64748B');
  doc.text(`${t('customer')}:`, margin, cursorY);
  doc.text(customer.name, margin + 90, cursorY);
  cursorY += 16;
  doc.text(`${t('phone')}:`, margin, cursorY);
  doc.text(customer.phone || t('na'), margin + 90, cursorY);
  cursorY += 24;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    theme: 'plain',
    head: [[t('product'), t('qty'), t('price'), t('total')]],
    body: details.map((detail) => {
      const product = products.find((item) => item.id === detail.product_id);
      return [
        product?.name || t('unknownProduct'),
        String(detail.quantity),
        formatCurrency(detail.price),
        formatCurrency(detail.quantity * detail.price),
      ];
    }),
    styles: {
      font: FONT_FAMILY,
      fontStyle: 'normal',
      fontSize: 10,
      textColor: '#334155',
      cellPadding: { top: 8, right: 8, bottom: 8, left: 8 },
      lineColor: '#F1F5F9',
      lineWidth: { bottom: 1 },
    },
    headStyles: {
      fillColor: '#F8FAFC',
      textColor: '#0F172A',
      font: FONT_FAMILY,
      fontStyle: 'bold',
      lineColor: '#E2E8F0',
      lineWidth: { bottom: 1 },
    },
    bodyStyles: {
      font: FONT_FAMILY,
      fontStyle: 'normal',
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.45 },
      1: { cellWidth: contentWidth * 0.15, halign: 'center' },
      2: { cellWidth: contentWidth * 0.2, halign: 'right' },
      3: { cellWidth: contentWidth * 0.2, halign: 'right', fontStyle: 'bold' },
    },
  });

  cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 28;
  const summaryX = pageWidth - margin - 250;
  const summaryWidth = 250;
  const summaryLineHeight = 18;
  const summaryRows = [
    { label: `${t('subtotal')}:`, value: formatCurrency(order.total_cost) },
    { label: `${t('depositLabel')}:`, value: `-${order.deposit.toLocaleString()}` },
  ];
  const summaryHeight = 88;

  doc.setFillColor('#F8FAFC');
  doc.roundedRect(summaryX, cursorY, summaryWidth, summaryHeight, 12, 12, 'F');

  let summaryY = cursorY + 24;

  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(10);
  doc.setTextColor('#64748B');

  summaryRows.forEach((row) => {
    doc.text(row.label, summaryX + 16, summaryY);
    doc.text(row.value, summaryX + summaryWidth - 16, summaryY, { align: 'right' });
    summaryY += summaryLineHeight;
  });

  doc.setDrawColor('#E2E8F0');
  doc.setLineWidth(1);
  doc.line(summaryX + 16, summaryY + 2, summaryX + summaryWidth - 16, summaryY + 2);

  summaryY += 22;
  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(14);
  doc.setTextColor('#064E3B');
  doc.text(`${t('amountDue')}:`, summaryX + 16, summaryY);

  doc.setTextColor('#059669');
  doc.setFontSize(16);
  doc.text(
    formatCurrency(order.total_cost - order.deposit),
    summaryX + summaryWidth - 16,
    summaryY,
    { align: 'right' }
  );

  const footerY = pageHeight - 44;
  doc.setDrawColor('#F1F5F9');
  doc.setLineWidth(1);
  doc.line(margin, footerY - 18, pageWidth - margin, footerY - 18);

  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(10);
  doc.setTextColor('#94A3B8');
  doc.text(t('thankYouForBusiness'), pageWidth / 2, footerY, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`${shop?.name || 'Hardware Shop'}${shop?.phone ? ` - ${shop.phone}` : ''}`, pageWidth / 2, footerY + 12, {
    align: 'center',
  });

  doc.save(`invoice-${order.id.slice(0, 8)}.pdf`);
}
