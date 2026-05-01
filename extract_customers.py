import sqlite3
import json
import sys

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No database file provided"}))
        return

    db_path = sys.argv[1]
    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        
        # Extract customers
        c.execute("SELECT name, information, dept FROM Customers")
        customer_rows = c.fetchall()
        
        customers = []
        for row in customer_rows:
            customers.append({
                "name": row[0],
                "phone": row[1],
                "debt": row[2]
            })
            
        # Extract products (Warehouses table)
        c.execute("SELECT name, unit, pricePerMass, mass, type, priceForCustomer, priceForWorker FROM Warehouses")
        product_rows = c.fetchall()
        
        products = []
        for row in product_rows:
            products.append({
                "name": row[0],
                "unit": row[1],
                "pricePerMass": row[2],
                "mass": row[3],
                "type": row[4],
                "priceForCustomer": row[5],
                "priceForWorker": row[6]
            })
        
        print(json.dumps({
            "customers": customers,
            "products": products
        }))
        conn.close()
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
