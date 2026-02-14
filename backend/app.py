from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

# डेटाबेस तयार करणे (टेबल स्ट्रक्चर)
def init_db():
    conn = sqlite3.connect('electricity.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            consumer_name TEXT NOT NULL,
            reading_month TEXT NOT NULL,
            meter_reading REAL NOT NULL,
            bill_amount REAL NOT NULL,
            payment_status TEXT DEFAULT 'Unpaid'
        )
    ''')
    conn.commit()
    conn.close()

# १. नवीन बिल जोडणे
@app.route("/add_bill", methods=["POST"])
def add_bill():
    try:
        data = request.json
        # येथे $0.15 ने बिल कॅल्क्युलेट केले आहे
        bill_amt = float(data['meter_reading']) * 0.15 
        
        conn = sqlite3.connect('electricity.db')
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO bills (consumer_name, reading_month, meter_reading, bill_amount, payment_status)
            VALUES (?, ?, ?, ?, ?)
        ''', (data['name'], data['month'], data['meter_reading'], bill_amt, data['status']))
        conn.commit()
        conn.close()
        return jsonify({"message": "Success", "bill_amount": bill_amt}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# २. सर्व बिल्स मिळवणे
@app.route("/get_bills", methods=["GET"])
def get_bills():
    conn = sqlite3.connect('electricity.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM bills ORDER BY id DESC')
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(rows)

# ३. बिल डिलीट करणे
@app.route("/delete_bill/<int:id>", methods=["DELETE"])
def delete_bill(id):
    conn = sqlite3.connect('electricity.db')
    cursor = conn.cursor()
    cursor.execute('DELETE FROM bills WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Deleted successfully"})

# ४. स्टेटस अपडेट करणे (Toggle Status Functionality)
@app.route("/update_status/<int:bill_id>", methods=["PUT"])
def update_status(bill_id):
    data = request.json
    new_status = data.get('status') # 'Paid' किंवा 'Unpaid'
    
    conn = sqlite3.connect('electricity.db')
    cursor = conn.cursor()
    
    # SQL UPDATE कमांड वापरून डेटाबेसमध्ये बदल करणे
    cursor.execute('''
        UPDATE bills 
        SET payment_status = ? 
        WHERE id = ?
    ''', (new_status, bill_id))
    
    conn.commit()
    changes = conn.total_changes # किती रोजमध्ये बदल झाला ते पाहण्यासाठी
    conn.close()
    
    if changes > 0:
        return jsonify({"message": f"Status updated to {new_status} successfully"}), 200
    else:
        return jsonify({"error": "Bill not found"}), 404

if __name__ == "__main__":
    init_db()  # सर्व्हर सुरू होताना डेटाबेस टेबल तयार आहे की नाही ते तपासेल
    app.run(debug=True, port=5000)