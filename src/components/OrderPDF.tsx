'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order, OrderDetail, Product, Customer, Shop } from '@/types';
import { createTranslator } from '@/lib/i18n/translate';
import type { Locale } from '@/lib/i18n/config';

type OrderPdfParams = {
  order: Order;
  details: (OrderDetail & { product?: { name: string } | null })[];
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
  return value.toLocaleString();
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
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;
  const hasQRCode = Boolean(shop?.qr_code_url && shop.qr_code_url.trim() !== '');
  const headerImageUrl = hasQRCode ? shop?.qr_code_url : shop?.logo_url;
  const headerImageSize = hasQRCode ? 62 : 54;
  const headerImageX = pageWidth - margin - headerImageSize;
  const shopTextWidth = headerImageUrl ? contentWidth - headerImageSize - 18 : contentWidth;

  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(20);
  doc.setTextColor('#064E3B');
  doc.text(shop?.name || 'Hardware Shop', margin, cursorY);

  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(10);
  doc.setTextColor('#64748B');

  let shopInfoY = cursorY + 18;

  if (shop?.address) {
    const addressLines = doc.splitTextToSize(shop.address, shopTextWidth);
    doc.text(addressLines, margin, shopInfoY);
    shopInfoY += addressLines.length * 12;
  }

  if (shop?.phone) {
    doc.text(`${t('phone')}: ${shop.phone}`, margin, shopInfoY);
    shopInfoY += 12;
  }

  if (headerImageUrl) {
    try {
      const imageDataUrl = await loadImageAsDataUrl(headerImageUrl);
      doc.addImage(
        imageDataUrl,
        'PNG',
        headerImageX,
        cursorY - 4,
        headerImageSize,
        headerImageSize
      );
    } catch {
      // Ignore failures
    }
  }

  doc.setDrawColor('#059669');
  doc.setLineWidth(1.5);
  const headerBottomY = Math.max(shopInfoY, cursorY + headerImageSize);
  doc.line(margin, headerBottomY, pageWidth - margin, headerBottomY);
  cursorY = headerBottomY + 22;

  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(20);
  doc.setTextColor('#064E3B');
  doc.text(t('invoiceTitle'), margin, cursorY);

  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(10);
  doc.setTextColor('#64748B');
  doc.text(
    `${t('date')}: ${new Date(order.created_at).toLocaleDateString(dateLocale)}`,
    pageWidth - margin,
    cursorY,
    { align: 'right' }
  );

  cursorY += 30;

  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(12);
  doc.setTextColor('#0F172A');

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
    head: [[t('product'), t('note'), t('qty'), t('price'), t('total')]],
    body: details.map((detail) => {
      const name = detail.product?.name || products.find((item) => item.id === detail.product_id)?.name || t('unknownProduct');
      return [
        name,
        detail.note || '-',
        String(detail.quantity),
        formatCurrency(detail.price),
        formatCurrency(detail.quantity * detail.price),
      ];
    }),
    styles: {
      font: FONT_FAMILY,
      fontStyle: 'normal',
      fontSize: 9.5,
      textColor: '#334155',
      cellPadding: { top: 7, right: 7, bottom: 7, left: 7 },
      lineColor: '#F1F5F9',
      lineWidth: { bottom: 1 },
    },
    headStyles: {
      fillColor: '#F8FAFC',
      textColor: '#0F172A',
      font: FONT_FAMILY,
      fontStyle: 'bold',
      fontSize: 9.5,
      lineColor: '#E2E8F0',
      lineWidth: { bottom: 1 },
    },
    bodyStyles: {
      font: FONT_FAMILY,
      fontStyle: 'normal',
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.32 },
      1: { cellWidth: contentWidth * 0.2, fontStyle: 'italic', textColor: '#64748B' },
      2: { cellWidth: contentWidth * 0.14, halign: 'center' },
      3: { cellWidth: contentWidth * 0.15, halign: 'right' },
      4: { cellWidth: contentWidth * 0.19, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section !== 'head') {
        return;
      }

      if (data.column.index === 2) {
        data.cell.styles.halign = 'center';
        return;
      }

      if (data.column.index === 3 || data.column.index === 4) {
        data.cell.styles.halign = 'right';
      }
    },
  });

  cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 18;
  const summaryX = pageWidth - margin - 220;
  const summaryWidth = 220;
  const summaryLineHeight = 15;
  const summaryRows = [
    { label: `${t('subtotal')}:`, value: formatCurrency(order.total_cost) },
    { label: `${t('depositLabel')}:`, value: `-${order.deposit.toLocaleString()}` },
  ];
  const summaryHeight = 72;

  doc.setFillColor('#F8FAFC');
  doc.roundedRect(summaryX, cursorY, summaryWidth, summaryHeight, 10, 10, 'F');

  let summaryY = cursorY + 19;

  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor('#64748B');

  summaryRows.forEach((row) => {
    doc.text(row.label, summaryX + 14, summaryY);
    doc.text(row.value, summaryX + summaryWidth - 14, summaryY, { align: 'right' });
    summaryY += summaryLineHeight;
  });

  summaryY += 5;
  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor('#64748B');
  doc.text(`${t('amountDue')}:`, summaryX + 14, summaryY);

  doc.setTextColor('#64748B');
  doc.text(
    formatCurrency(order.total_cost - order.deposit),
    summaryX + summaryWidth - 14,
    summaryY,
    { align: 'right' }
  );

  doc.save(`invoice-${order.id.slice(0, 8)}.pdf`);
}
