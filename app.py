from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from pymongo import MongoClient
import os

app = Flask(__name__)
CORS(app)
bcrypt = Bcrypt(app)

# Secret key for JWT
app.config["JWT_SECRET_KEY"] = "your-secret-key"
jwt = JWTManager(app)

# Connect to MongoDB (local or Atlas)
client = MongoClient("mongodb+srv://midhun:passwordxyz@cluster0.6zzgomj.mongodb.net/")
db = client["plc_database"]
collection = db["plc_data"]
users_collection = db["plc_users"]  # ✅ FIXED

@app.route("/api/latest")
def get_latest_data():
    """Get the most recent PLC data entry from MongoDB"""
    latest = collection.find_one(sort=[("_id", -1)], projection={"_id": 0})
    if latest is not None:
        return jsonify(latest)
    else:
        return jsonify({"message": "No data found"}), 404

@app.route("/api/all")
def get_all_data():
    """Get all PLC data from MongoDB"""
    data_list = list(collection.find({}, {"_id": 0}))
    if data_list:
        return jsonify(data_list)
    else:
        return jsonify({"message": "No data found"}), 404

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
