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

  const logoSize = 140;
  const logoY = margin - 15;

  if (shop?.logo_url) {
    try {
      const logoDataUrl = await loadImageAsDataUrl(shop.logo_url);
      const formatMatch = logoDataUrl.match(/^data:image\/([a-z]+);base64,/);
      const format = (formatMatch?.[1]?.toUpperCase() || 'PNG') as string;
      
      doc.addImage(logoDataUrl, format, pageWidth - margin - logoSize, logoY, logoSize, logoSize);
    } catch {
      // Ignore logo failures
    }
  }

  doc.setDrawColor('#059669');
  doc.setLineWidth(1.5);
  const headerBottomY = Math.max(shopInfoY, logoY + logoSize) + 5;
  doc.line(margin, headerBottomY, pageWidth - margin, headerBottomY);
  cursorY = headerBottomY + 28;

  // Title & Date on same line
  doc.setFont(FONT_FAMILY, 'bold');
  doc.setFontSize(20);
  doc.setTextColor('#064E3B');
  doc.text(t('customersManagementTitle'), margin, cursorY);

  doc.setFont(FONT_FAMILY, 'normal');
  doc.setFontSize(10);
  doc.setTextColor('#64748B');
  doc.text(
    `${t('date')}: ${new Date().toLocaleDateString(dateLocale)}`,
    pageWidth - margin,
    cursorY,
    { align: 'right' }
  );

  cursorY += 24;

  // Split customers into two halves for side-by-side columns
  const half = Math.ceil(customers.length / 2);
  const leftHalf = customers.slice(0, half);
  const rightHalf = customers.slice(half);

  const rows = [];
  for (let i = 0; i < half; i++) {
    const c1 = leftHalf[i];
    const c2 = rightHalf[i];

    const row = [
      c1.name,
      formatCurrency(c1.debt),
      '' // spacer
    ];

    if (c2) {
      row.push(
        c2.name,
        formatCurrency(c2.debt)
      );
    } else {
      row.push('', '');
    }
    rows.push(row);
  }

  const colWidth = (contentWidth - 20) / 2;

  // Table
  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    theme: 'plain',
    head: [[t('customerName'), t('totalOutstanding'), '', t('customerName'), t('totalOutstanding')]],
    body: rows,
    styles: {
      font: FONT_FAMILY,
      fontStyle: 'normal',
      fontSize: 9,
      textColor: '#334155',
      cellPadding: { top: 6, right: 4, bottom: 6, left: 4 },
      lineColor: '#F1F5F9',
      lineWidth: { bottom: 0.5 },
    },
    headStyles: {
      fillColor: '#F8FAFC',
      textColor: '#0F172A',
      font: FONT_FAMILY,
      fontStyle: 'bold',
      lineColor: '#E2E8F0',
      lineWidth: { bottom: 1 },
    },
    columnStyles: {
      0: { cellWidth: colWidth * 0.7 },
      1: { cellWidth: colWidth * 0.3, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 20 }, // Spacer
      3: { cellWidth: colWidth * 0.7 },
      4: { cellWidth: colWidth * 0.3, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.column.index === 2) {
        data.cell.styles.lineWidth = 0;
        data.cell.styles.fillColor = [255, 255, 255];
      }

      // Ensure header alignment matches column alignment
      if (data.section === 'head') {
        if (data.column.index === 1 || data.column.index === 4) {
          data.cell.styles.halign = 'right';
        }
      }
    }
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
