'use client';

import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer';
import { Order, OrderDetail, Product, Customer } from '@/types';

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 12 },
  header: { marginBottom: 20, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
  section: { marginBottom: 10 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EEE', paddingVertical: 5 },
  label: { width: 100, fontWeight: 'bold' },
  value: { flex: 1 },
  table: { marginTop: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F0F0F0', padding: 5, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EEE', padding: 5 },
  col1: { width: '40%' },
  col2: { width: '20%', textAlign: 'right' },
  col3: { width: '20%', textAlign: 'right' },
  col4: { width: '20%', textAlign: 'right' },
  summary: { marginTop: 20, alignItems: 'flex-end' },
  summaryRow: { flexDirection: 'row', paddingVertical: 2 },
  summaryLabel: { width: 100, textAlign: 'right', marginRight: 10 },
  summaryValue: { width: 80, textAlign: 'right', fontWeight: 'bold' },
});

export default function OrderPDF({ 
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
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>INVOICE</Text>
          <Text>Order #{order.id.slice(0, 8)}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Customer:</Text>
            <Text style={styles.value}>{customer.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{customer.phone}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{new Date(order.created_at).toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Product</Text>
            <Text style={styles.col2}>Qty</Text>
            <Text style={styles.col3}>Price</Text>
            <Text style={styles.col4}>Total</Text>
          </View>
          {details.map((detail, i) => {
            const product = products.find(p => p.id === detail.product_id);
            return (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.col1}>{product?.name || 'Unknown'}</Text>
                <Text style={styles.col2}>{detail.quantity}</Text>
                <Text style={styles.col3}>${detail.price.toLocaleString()}</Text>
                <Text style={styles.col4}>${(detail.quantity * detail.price).toLocaleString()}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Cost:</Text>
            <Text style={styles.summaryValue}>${order.total_cost.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Deposit:</Text>
            <Text style={styles.summaryValue}>${order.deposit.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Net Debt Change:</Text>
            <Text style={styles.summaryValue}>${(order.total_cost - order.deposit).toLocaleString()}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
