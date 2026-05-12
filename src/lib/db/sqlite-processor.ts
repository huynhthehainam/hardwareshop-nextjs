import sqlite3 from 'sqlite3';

export async function processSqliteFile(filePath: string): Promise<Record<string, any[]>> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(filePath, sqlite3.OPEN_READONLY, (err) => {
      if (err) return reject(err);
    });

    const data: Record<string, any[]> = {};
    const tables = [
      { key: 'customers', query: "SELECT id, name, information as phone, dept as debt FROM Customers" },
      { key: 'products', query: "SELECT id, name, unit, pricePerMass as pricePerMass, mass, type, priceForCustomer as priceForCustomer, priceForWorker as priceForWorker FROM Warehouses" },
      { key: 'invoices', query: "SELECT id, created, dept, deposit, deptBefore as deptBefore, customer_id as customerId FROM Invoices" },
      { key: 'invoice_details', query: "SELECT id, name, quantity, unit, price, notice, invoice_id as invoiceId, totalCost as totalCost FROM InvoiceDetails" },
      { key: 'dept_histories', query: "SELECT id, created, cash, reason, customer_id as customerId FROM DeptHistories" }
    ];

    let processedCount = 0;
    tables.forEach(({ key, query }) => {
      db.all(query, [], (err, rows) => {
        if (err) {
          db.close();
          return reject(err);
        }
        data[key] = rows;
        processedCount++;
        if (processedCount === tables.length) {
          db.close((closeErr) => {
            if (closeErr) return reject(closeErr);
            resolve(data);
          });
        }
      });
    });
  });
}
