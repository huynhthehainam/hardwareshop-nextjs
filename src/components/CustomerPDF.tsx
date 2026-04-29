'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Customer, Shop } from '@/types';
import { createTranslator } from '@/lib/i18n/translate';
import type { Locale } from '@/lib/i18n/config';

type CustomerPdfParams = {
  customers: Customer[];
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

export async function generateCustomerListPdf({
  customers,
  locale,
  shop,
}: CustomerPdfParams) {
  const t = createTranslator(locale);
  const dateLocale = locale === 'vi' ? 'vi-VN' : 'en-US';
  const doc = new jsPDF({ unit: 'pt', format: 'a4' }) as JsPdfWithAutoTable;

  await registerFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  // Header
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
      // Ignore logo failures
    }
  }

  doc.setDrawColor('#059669');
  doc.setLineWidth(1.5);
  doc.line(margin, Math.max(shopInfoY, cursorY + 70), pageWidth - margin, Math.max(shopInfoY, cursorY + 70));
  cursorY = Math.max(shopInfoY, cursorY + 70) + 28;

  // Title
  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(24);
  doc.setTextColor('#064E3B');
  doc.text(t('customersManagementTitle'), margin, cursorY);

  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(10);
  doc.setTextColor('#64748B');
  doc.text(
    `${t('date')}: ${new Date().toLocaleDateString(dateLocale)}`,
    pageWidth - margin,
    cursorY + 18,
    { align: 'right' }
  );

  cursorY += 40;

  // Table
  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    theme: 'plain',
    head: [[t('customerName'), t('phone'), t('totalOutstanding')]],
    body: customers.map((c) => [
      c.name,
      c.phone || t('na'),
      formatCurrency(c.debt),
    ]),
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
      1: { cellWidth: contentWidth * 0.3, halign: 'left' },
      2: { cellWidth: contentWidth * 0.25, halign: 'right', fontStyle: 'bold' },
    },
  });

  const totalDebt = customers.reduce((sum, c) => sum + c.debt, 0);
  cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 20;

  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(12);
  doc.setTextColor('#064E3B');
  doc.text(`${t('statTotalDebtTitle')}: ${formatCurrency(totalDebt)}`, pageWidth - margin, cursorY, { align: 'right' });

  // Footer
  const footerY = pageHeight - 44;
  doc.setDrawColor('#F1F5F9');
  doc.setLineWidth(1);
  doc.line(margin, footerY - 18, pageWidth - margin, footerY - 18);

  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(10);
  doc.setTextColor('#94A3B8');
  doc.text(t('appName'), pageWidth / 2, footerY, { align: 'center' });

  doc.save(`customers-${new Date().toISOString().split('T')[0]}.pdf`);
}
