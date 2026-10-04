import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib
import os

# Define the paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, 'mock_dataset.csv')
MODEL_PATH = os.path.join(BASE_DIR, 'alzheimers_model.pkl')
SCALER_PATH = os.path.join(BASE_DIR, 'scaler.pkl')
LABEL_ENCODER_PATH = os.path.join(BASE_DIR, 'label_encoder.pkl')

def train_model():
    print("Loading data...")
    if not os.path.exists(DATA_PATH):
        print(f"Error: Dataset not found at {DATA_PATH}")
        print("Please download the MRI and Alzheimer's dataset and save it as 'mock_dataset.csv'")
        return

    df = pd.read_csv(DATA_PATH)
    print(f"Dataset loaded with {len(df)} records.")

    # 1. Data Preprocessing
    print("Preprocessing data...")
    
    # Drop irrelevant columns if they exist
    cols_to_drop = ['Subject ID', 'MRI ID', 'Hand']
    df = df.drop(columns=[col for col in cols_to_drop if col in df.columns])

    # Handle missing values
    # For SES and MMSE, we can fill with median
    if 'SES' in df.columns:
        df['SES'] = df['SES'].fillna(df['SES'].median())
    if 'MMSE' in df.columns:
        df['MMSE'] = df['MMSE'].fillna(df['MMSE'].median())
    
    # Drop any remaining NaN rows
    df = df.dropna()

    # Encode categorical features
    # M/F: M -> 1, F -> 0
    if 'M/F' in df.columns:
        df['M/F'] = df['M/F'].map({'M': 1, 'F': 0})
        
    # Group: Nondemented -> 0, Demented -> 1, Converted -> 2 (or drop Converted for binary)
    # Let's keep it as Demented and Nondemented for simplicity. If Converted exists, we map it or drop it.
    if 'Group' in df.columns:
        # Convert 'Converted' to 'Demented' for simplicity in a binary classification, 
        # or leave it for multi-class. Let's do multi-class for the generic case.
        le = LabelEncoder()
        df['Group'] = le.fit_transform(df['Group'])
        joblib.dump(le, LABEL_ENCODER_PATH)
        print("Classes mapped:", dict(zip(le.classes_, le.transform(le.classes_))))

    # Define features X and target y
    X = df.drop(columns=['Group'])
    y = df['Group']

    # 2. Train-Test Split
    print("Splitting data into training and testing sets...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 3. Feature Scaling
    print("Scaling features...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 4. Model Training
    print("Training Random Forest Classifier...")
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train_scaled, y_train)

    # 5. Model Evaluation
    print("Evaluating model...")
    y_pred = model.predict(X_test_scaled)
    acc = accuracy_score(y_test, y_pred)
    print(f"Accuracy: {acc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # 6. Save Model and Scaler
    print("Saving model and scaler...")
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print(f"Model saved to {MODEL_PATH}")
    print(f"Scaler saved to {SCALER_PATH}")
    print("Training complete!")

if __name__ == "__main__":
    train_model()
