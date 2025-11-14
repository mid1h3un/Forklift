from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from pymongo import MongoClient, ASCENDING, DESCENDING
from dotenv import load_dotenv
import os
import datetime
import io
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import re
import csv
load_dotenv()

app = Flask(__name__)
CORS(app)
bcrypt = Bcrypt(app)

# Access variables
secret = os.getenv("SECRET_KEY")
db_url = os.getenv("DB_URL")
print(secret, db_url)

# Secret key for JWT
app.config["JWT_SECRET_KEY"] = secret 
jwt = JWTManager(app)

# Connect to MongoDB
client = MongoClient(db_url)
db = client["plc_database"]
collection = db["plc_data"]
users_collection = db["plc_users"]

# Initialize indexes for better query performance
def init_db():
    """Initialize the database with indexes"""
    collection.create_index([("timestamp", DESCENDING)])
    collection.create_index([("timestamp", ASCENDING)])

init_db()


def clean_value(value):
    """Remove units and convert to float"""
    if isinstance(value, (int, float)):
        return float(value)
    # Remove non-numeric characters except decimal point and minus sign
    cleaned = re.sub(r'[^\d.-]', '', str(value))
    try:
        return float(cleaned) if cleaned else 0.0
    except:
        return 0.0


@app.route("/api/latest", methods=["GET"])
def get_latest_data():
    latest = collection.find_one(sort=[("_id", -1)], projection={"_id": 0})
    if latest:
        return jsonify(latest)
    return jsonify({"message": "No data found"}), 404


@app.route("/api/all", methods=["GET"])
def get_all_data():
    data_list = list(collection.find({}, {"_id": 0}))
    if data_list:
        return jsonify(data_list)
    return jsonify({"message": "No data found"}), 404

DEVICE_FREQUENCY = 5   # seconds

@app.route("/runtime-report", methods=["POST"])
def runtime_report():
    data = request.get_json()

    start = data["startTime"]
    end = data["endTime"]

    # Convert to UNIX timestamp (integer)
    start_ts = int(datetime.datetime.fromisoformat(start).timestamp())
    end_ts = int(datetime.datetime.fromisoformat(end).timestamp())

    # Query MongoDB:
    # speed > 0 → machine is running
    rows = list(collection.find({
        "time": { "$gte": str(start_ts), "$lte": str(end_ts) },
        "spd": { "$ne": "0" }
    }))

    run_count = len(rows)

    # Calculate runtime
    running_seconds = run_count * DEVICE_FREQUENCY
    running_minutes = running_seconds / 60

    return jsonify({
        "data_points": run_count,
        "running_seconds": running_seconds,
        "running_minutes": round(running_minutes, 2)
    })

@app.route("/api/debug", methods=["GET"])
def debug_data():
    """Debug endpoint to check data structure"""
    try:
        # Get total count
        total = collection.count_documents({})
        
        # Get first document
        first = collection.find_one({}, {"_id": 0})
        
        # Get last document
        last = collection.find_one(sort=[("_id", -1)], projection={"_id": 0})
        
        # Check timestamp field type
        sample = collection.find_one({})
        timestamp_type = type(sample.get('timestamp')).__name__ if sample and 'timestamp' in sample else 'No timestamp field'
        
        return jsonify({
            "total_documents": total,
            "first_document": first,
            "last_document": last,
            "timestamp_field_type": timestamp_type,
            "sample_timestamp": str(sample.get('timestamp')) if sample and 'timestamp' in sample else None
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/history", methods=["GET"])
def get_history():
    try:
        start_str = request.args.get("start")
        end_str = request.args.get("end")
        tags = request.args.get("tags", "").split(",")

        # Parse start/end datetimes
        start_dt = datetime.datetime.fromisoformat(start_str)
        end_dt = datetime.datetime.fromisoformat(end_str)

        # Convert to UNIX timestamps (integer seconds)
        start_ts = int(start_dt.timestamp())
        end_ts = int(end_dt.timestamp())

        print(f"Received params - start: {start_str}, end: {end_str}, tags: {tags}")
        print(f"Parsed dates - start: {start_dt}, end: {end_dt}")
        print(f"Converted timestamps - start: {start_ts}, end: {end_ts}")

        # ✅ Use your actual collection
        coll = collection

        # ✅ Query using your actual field 'time' (stored as string)
        query = {"time": {"$gte": str(start_ts), "$lte": str(end_ts)}}

        print(f"Query: {query}")

        # ✅ Only return time, speed, voltage
        docs = list(
            coll.find(query, {"_id": 0, "time": 1, "spd": 1, "volt": 1})
                .sort("time", 1)
        )

        print(f"Found {len(docs)} documents matching query")

        # ✅ Convert numeric timestamp string to readable format
        for d in docs:
            try:
                d["time"] = datetime.datetime.fromtimestamp(int(d["time"])).strftime("%d-%b-%Y %H:%M:%S")
                d["spd"] = float(d.get("spd", 0))
                d["volt"] = float(d.get("volt", 0))
            except Exception as e:
                print(f"Skipping invalid record: {e}")

        return jsonify(docs)

    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/store", methods=["POST"])
def store_reading():
    """
    Store a new sensor reading
    Body: {
        "Tank A": 84,
        "Tank B": 75,
        "Tank C": 54,
        "Pressure": "78.3 psi",
        "Temperature": "36.5 °C",
        "Flow": "8.05 L/s",
        "TT1": "57.4 °C",
        "TT2": "34.0 °C",
        "TT3": "55.8 °C",
        "TT4": "64.3 °C",
        "LT1": "4.5 L/s",
        "LT2": "4.46 L/s",
        "LT3": "7.02 L/s",
        "A": "120 psi",
        "B": "95 psi",
        "timestamp": "2024-01-01T12:00:00" (optional)
    }
    """
    try:
        data = request.json
        timestamp_str = data.get('timestamp')
        
        # Use provided timestamp or current time as string (matching your format)
        if timestamp_str:
            timestamp = timestamp_str
        else:
            timestamp = datetime.datetime.now().isoformat()
        
        # Build document with all sensor values
        document = {
            "timestamp": timestamp
        }
        
        # Add all sensor readings - keep them in original format (with units)
        sensor_fields = ['Tank A', 'Tank B', 'Tank C', 'Pressure', 'Temperature', 
                        'Flow', 'TT1', 'TT2', 'TT3', 'TT4', 'LT1', 'LT2', 'LT3', 'A', 'B']
        
        for field in sensor_fields:
            if field in data:
                document[field] = data[field]
        
        result = collection.insert_one(document)
        
        return jsonify({
            "success": True,
            "id": str(result.inserted_id),
            "timestamp": timestamp
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/tags", methods=["GET"])
def get_tags():
    """Get list of all available tags from the database"""
    try:
        # Get a sample document to determine available fields
        sample = collection.find_one({})
        if not sample:
            return jsonify({"tags": []})
        
        # Get all fields except _id and timestamp
        tags = [key for key in sample.keys() if key not in ['_id', 'timestamp']]
        return jsonify({"tags": tags})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/stats", methods=["GET"])
def get_stats():
    """Get database statistics"""
    try:
        total_documents = collection.count_documents({})
        
        # Get a sample to determine available tags
        sample = collection.find_one({})
        tags = [key for key in sample.keys() if key not in ['_id', 'timestamp']] if sample else []
        
        # Get date range
        oldest = collection.find_one(sort=[('timestamp', ASCENDING)])
        newest = collection.find_one(sort=[('timestamp', DESCENDING)])
        
        return jsonify({
            "total_documents": total_documents,
            "total_tags": len(tags),
            "tags": tags,
            "oldest_record": oldest['timestamp'] if oldest else None,
            "newest_record": newest['timestamp'] if newest else None
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/export_csv", methods=["POST"])
def export_csv():
    """
    Export historical data as a CSV file.
    Expects JSON body with a 'rows' array (list of dicts).
    """
    try:
        data = request.get_json()
        rows = data.get("rows", [])

        if not rows:
            return jsonify({"error": "No data to export"}), 400

        # Create in-memory CSV
        output = io.StringIO()
        fieldnames = list(rows[0].keys())
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

        # Go back to the beginning
        output.seek(0)

        # Encode to UTF-8 for Excel readability
        return send_file(
            io.BytesIO(output.getvalue().encode("utf-8-sig")),  # 'utf-8-sig' adds BOM for Excel
            mimetype="text/csv; charset=utf-8",
            as_attachment=True,
            download_name="historical_data.csv"
        )

    except Exception as e:
        print(f"Error exporting CSV: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"message": "Username and password required"}), 400

    if users_collection.find_one({"username": username}):
        return jsonify({"message": "User already exists"}), 400

    hashed_pw = bcrypt.generate_password_hash(password).decode("utf-8")
    users_collection.insert_one({"username": username, "password": hashed_pw})

    return jsonify({"message": "User registered successfully"}), 201


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    print(username, password)
    user = users_collection.find_one({"username": username})
    if not user or not bcrypt.check_password_hash(user["password"], password):
        return jsonify({"message": "Invalid username or password"}), 401

    token = create_access_token(identity=str(user["_id"]))
    return jsonify({"access_token": token, "username": username}), 200

    
@app.route("/protected", methods=["GET"])
@jwt_required()
def protected():
    current_user_id = get_jwt_identity()
    return jsonify({"message": f"Hello user {current_user_id}, welcome to protected route!"})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True, use_reloader=False)