import sqlite3
import json
import sys
import os

def extract_data(db_path):
    if not os.path.exists(db_path):
        print(json.dumps({"error": "File not found"}))
        sys.exit(1)

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        tables = {
            'customers': "SELECT id, name, information as phone, dept as debt FROM Customers",
            'products': "SELECT id, name, unit, pricePerMass as pricePerMass, mass, type, priceForCustomer as priceForCustomer, priceForWorker as priceForWorker FROM Warehouses",
            'invoices': "SELECT id, created, dept, deposit, deptBefore as deptBefore, customer_id as customerId FROM Invoices",
            'invoice_details': "SELECT id, name, quantity, unit, price, notice, invoice_id as invoiceId, totalCost as totalCost FROM InvoiceDetails",
            'dept_histories': "SELECT id, created, cash, reason, customer_id as customerId FROM DeptHistories"
        }
        
        data = {}
        for key, query in tables.items():
            cursor.execute(query)
            columns = [column[0] for column in cursor.description]
            data[key] = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        conn.close()
        print(json.dumps(data))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No database path provided"}))
        sys.exit(1)
    extract_data(sys.argv[1])
