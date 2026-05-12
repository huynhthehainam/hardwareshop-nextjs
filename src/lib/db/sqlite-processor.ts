import Database from 'better-sqlite3';

export async function processSqliteFile(filePath: string): Promise<Record<string, any[]>> {
  const db = new Database(filePath, { readonly: true });
  
  try {
    const data: Record<string, any[]> = {};
    const tables = [
      { key: 'customers', query: "SELECT id, name, information as phone, dept as debt FROM Customers" },
      { key: 'products', query: "SELECT id, name, unit, pricePerMass as pricePerMass, mass, type, priceForCustomer as priceForCustomer, priceForWorker as priceForWorker FROM Warehouses" },
      { key: 'invoices', query: "SELECT id, created, dept, deposit, deptBefore as deptBefore, customer_id as customerId FROM Invoices" },
      { key: 'invoice_details', query: "SELECT id, name, quantity, unit, price, notice, invoice_id as invoiceId, totalCost as totalCost FROM InvoiceDetails" },
      { key: 'dept_histories', query: "SELECT id, created, cash, reason, customer_id as customerId FROM DeptHistories" }
    ];

    for (const { key, query } of tables) {
      data[key] = db.prepare(query).all();
    }

    return data;
  } finally {
    db.close();
  }
}
