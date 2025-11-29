from flask import Flask, request, jsonify
import joblib
import pandas as pd
import numpy as np
from flask_cors import CORS

# OCR imports
from PIL import Image
import easyocr
import io
import base64

app = Flask(__name__)
CORS(app)

# ================================
# LOAD OCR MODEL
# ================================
print("Loading EasyOCR...")
reader = easyocr.Reader(['en'], gpu=False)
print("EasyOCR Loaded!")

# ================================
# LOAD ML MODELS & TRAIN COLUMNS
# ================================
print("Loading ML Models...")
models = joblib.load("./demand_forecast_models.pkl")
train_columns = joblib.load("./train_columns.pkl")
print("ML Models Loaded!")


# ==========================================================
# ===================== OCR ROUTE ==========================
# ==========================================================
@app.route("/extract", methods=["POST"])
def extract_text():
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    file = request.files["image"]

    try:
        image = Image.open(file.stream)

        # OCR extraction
        img_array = np.array(image)
        results = reader.readtext(img_array, detail=0)
        extracted_text = "\n".join(results)

        # Convert image to base64 for preview
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        img_b64 = base64.b64encode(buf.getvalue()).decode()

        return jsonify({
            "success": True,
            "extracted_text": extracted_text,
            "image_preview": f"data:image/png;base64,{img_b64}"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==========================================================
# =================== ORIGINAL ML ROUTE ====================
# ==========================================================
@app.route("/predict", methods=["POST"])
def predict():
    data = request.json

    # Ensure list input
    if isinstance(data, dict):
        data = [data]

    df = pd.DataFrame(data)

    # 1️⃣ Date → days_since_restock
    if "last_restock_date" in df.columns:
        df["last_restock_date"] = pd.to_datetime(df["last_restock_date"], errors="coerce")
        today = pd.Timestamp.today()
        df["days_since_restock"] = (today - df["last_restock_date"]).dt.days
        df = df.drop(columns=["last_restock_date"])

    print("completed1")

    # 2️⃣ Fill missing numeric values
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())

    print("completed2")

    # 3️⃣ Encode categories
    cat_cols = df.select_dtypes(include=["object"]).columns
    df = pd.get_dummies(df, columns=cat_cols, drop_first=True)

    print("completed3")

    # 4️⃣ Align to training columns
    df = df.reindex(columns=train_columns, fill_value=0)

    print("completed4")

    # ==============================================
    # 5️⃣ VECTORIZED PREDICTION (FAST)
    # ==============================================
    pred_7  = models["pred_7d"].predict(df)
    pred_30 = models["pred_30d"].predict(df)
    pred_60 = models["pred_60d"].predict(df)
    pred_180 = models["pred_180d"].predict(df)

    print("completed5")

    # ==============================================
    # 6️⃣ RESTOCK LOGIC (vectorized)
    # ==============================================
    stock = np.array([item.get("stock_level", 0) for item in data])
    daily_demand = np.array([item.get("daily_demand", 0) for item in data])

    days_left = np.where(daily_demand == 0, 9999, stock / daily_demand)

    need_7  = pred_7  > stock
    need_30 = pred_30 > stock
    need_60 = pred_60 > stock
    need_180 = pred_180 > stock

    qty_7  = np.maximum(pred_7  - stock, 0)
    qty_30 = np.maximum(pred_30 - stock, 0)
    qty_60 = np.maximum(pred_60 - stock, 0)
    qty_180 = np.maximum(pred_180 - stock, 0)

    print("completed6")

    # ==============================================
    # 7️⃣ BUILD RESPONSE
    # ==============================================
    predictions = []

    for i, item in enumerate(data):
        predictions.append({
            "item_id": item.get("item_id"),
            "stock":float(stock[i]),

            "pred_7d": float(pred_7[i]),
            "pred_30d": float(pred_30[i]),
            "pred_60d": float(pred_60[i]),
            "pred_180d": float(pred_180[i]),
            "days_left": float(days_left[i]),

            "need_restock_7d": bool(need_7[i]),
            "need_restock_30d": bool(need_30[i]),
            "need_restock_60d": bool(need_60[i]),
            "need_restock_180d": bool(need_180[i]),

            "restock_qty_7d": float(qty_7[i]),
            "restock_qty_30d": float(qty_30[i]),
            "restock_qty_60d": float(qty_60[i]),
            "restock_qty_180d": float(qty_180[i]),
        })

    print("completed7")

    return jsonify(predictions)


# ==========================================================
# ==================== START SERVER ========================
# ==========================================================
if __name__ == "__main__":
    print("\n🚀 Unified Backend (OCR + ML) running at http://localhost:5000")
    print("➡ /extract → OCR")
    print("➡ /predict → ML Prediction\n")

    app.run(host="0.0.0.0", port=5000)
