from flask import Flask, request, jsonify
import joblib
import pandas as pd
import os

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'alzheimers_model.pkl')
SCALER_PATH = os.path.join(BASE_DIR, 'scaler.pkl')
LABEL_ENCODER_PATH = os.path.join(BASE_DIR, 'label_encoder.pkl')

try:
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    le = joblib.load(LABEL_ENCODER_PATH)
    print("Model, Scaler, and Label Encoder loaded successfully.")
except Exception as e:
    print(f"Error loading models: {e}. Please run train.py first.")
    model, scaler, le = None, None, None

@app.route('/api/predict', methods=['POST'])
def predict():
    if not model or not scaler or not le:
        return jsonify({'error': 'Model is not trained yet. Please train the model.'}), 500

    try:
        data = request.json
        # Expected features based on the mock_dataset:
        # Visit, MR Delay, M/F, Age, EDUC, SES, MMSE, CDR, eTIV, nWBV, ASF
        
        # Default values if missing
        features = {
            'Visit': data.get('Visit', 1),
            'MR Delay': data.get('MR Delay', 0),
            'M/F': 1 if data.get('M/F', 'M') == 'M' else 0,
            'Age': data.get('Age', 70),
            'EDUC': data.get('EDUC', 12),
            'SES': data.get('SES', 3.0),
            'MMSE': data.get('MMSE', 27.0),
            'CDR': data.get('CDR', 0.0),
            'eTIV': data.get('eTIV', 1500),
            'nWBV': data.get('nWBV', 0.75),
            'ASF': data.get('ASF', 1.2)
        }

        # Convert to DataFrame
        df = pd.DataFrame([features])
        
        # Scale features
        df_scaled = scaler.transform(df)
        
        # Predict
        prediction = model.predict(df_scaled)
        class_name = le.inverse_transform(prediction)[0]
        
        # Probabilities
        probs = model.predict_proba(df_scaled)[0]
        prob_dict = {le.inverse_transform([i])[0]: float(prob) for i, prob in enumerate(probs)}

        return jsonify({
            'success': True,
            'prediction': class_name,
            'probabilities': prob_dict
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'online', 'model_loaded': model is not None})

if __name__ == '__main__':
    app.run(port=5000, debug=True)
