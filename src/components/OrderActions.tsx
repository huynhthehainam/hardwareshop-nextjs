'use client';

import { Button } from '@/components/ui/button';
import { PDFDownloadLink } from '@react-pdf/renderer';
import OrderPDF from './OrderPDF';
import { Order, OrderDetail, Product, Customer } from '@/types';
import { useState, useEffect } from 'react';

export default function OrderActions({ 
  order, 
  details, 
  customer, 
  products 
}: { 
  order: Order, 
  details: OrderDetail[], 
  customer: Customer, 
  products: Product[] 
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return <Button disabled>Loading PDF...</Button>;

  return (
    <div className="flex space-x-2">
      <PDFDownloadLink
        document={<OrderPDF order={order} details={details} customer={customer} products={products} />}
        fileName={`invoice-${order.id.slice(0, 8)}.pdf`}
      >
        {({ loading }) => (
          <Button variant="outline" disabled={loading}>
            {loading ? 'Generating PDF...' : 'Download Invoice'}
          </Button>
        )}
      </PDFDownloadLink>
      <Button onClick={() => window.print()}>Print Page</Button>
    </div>
  );
}
