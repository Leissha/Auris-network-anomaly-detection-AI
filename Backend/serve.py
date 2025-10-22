# uvicorn serve:app --host 0.0.0.0 --port 8000 --reload
# UI: http://127.0.0.1:8000/docs
import os
import time
from typing import List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pathlib import Path
from pydantic import BaseModel, validator
from utils.model_io import list_models, load_model
from config import get_model_dir
from utils.predict import run_prediction
import pickle
import numpy as np
import pandas as pd

class PredictRequestNew(BaseModel):
    instances: List[List[float]]

class PredictRequestLegacy(BaseModel):
    model: str
    instances: List[List[float]]
    
    # Request Validation Debugging
    # This or HTTP Exception would be better? which one would catch error earlier?
    @validator('model')
    def check_model_name(cls, v):
        if v not in list_models(out_dir=get_model_dir()):
            raise ValueError(f"Model '{v}' not found")
        return v

class PredictResponse(BaseModel):
    model: str
    predictions: List[int]
    probabilities: Optional[List[List[float]]] = None

app = FastAPI(title="Model Inference API", version="2.0.0")
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

# Global Exception Handler: bind to all unhandled exceptions to catch all exceptions.
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": f"An_unexpected error occurred: {str(exc)}"}
    )

# Middleware for Debugging: track req and res cycles, execution time
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_selected_features_scaler():
    """Load the scaler for the 15 selected features"""
    try:
        with open('data_preprocessing/output/feature_metadata.pkl', 'rb') as f:
            metadata = pickle.load(f)
        scaler = metadata.get('selected_features_scaler')
        if scaler:
            print("Preprocessing scaler loaded successfully.")
        else:
            print("Warning: Scaler not found in metadata file.")
        return scaler
    except Exception as e:
        print(f"Warning: Could not load selected features scaler: {e}")
        return None

selected_features_scaler = load_selected_features_scaler()

def preprocess_input_data(raw_features: List[List[float]]) -> np.ndarray:
    """Preprocess raw input features using the selected features scaler"""
    if selected_features_scaler is None:
        print("Warning: No scaler available, returning raw features for new endpoint.")
        return np.array(raw_features)
    
    try:
        raw_array = np.array(raw_features)
        scaled_features = selected_features_scaler.transform(raw_array)
        return scaled_features
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error during data preprocessing: {e}")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/models")
def get_models():
    """Get list of available models with metadata."""
    models = list_models(out_dir=get_model_dir())
    return {
        model_name: {
            "name": model_name,
            "type": "supervised" if model_name in ['random_forest', 'mlp'] else "unsupervised"
        } for model_name in models
    }

@app.post("/predict", response_model=PredictResponse, tags=["Legacy API"])
def predict_legacy(req: PredictRequestLegacy):
    """
    LEGACY: Makes predictions without preprocessing data.
    Accepts model name in the request body.
    """
    models = list_models(out_dir=get_model_dir())
    if req.model not in models:
        raise HTTPException(status_code=404, detail=f"Model '{req.model}' not found")
    
    model = load_model(req.model, out_dir=get_model_dir())
    preds, proba = run_prediction(model, req.instances)
    
    return PredictResponse(model=req.model, predictions=preds, probabilities=proba)

@app.post("/predict/{model_name}", response_model=PredictResponse, tags=["New API"])
def predict_new(model_name: str, request: PredictRequestNew):
    """
    NEW: Makes predictions WITH data preprocessing.
    Accepts model name in the URL path.
    """
    models = list_models(out_dir=get_model_dir())
    if model_name not in models:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")

    processed_instances = preprocess_input_data(request.instances)
    model = load_model(model_name, out_dir=get_model_dir())
    preds, proba = run_prediction(model, processed_instances.tolist())
    
    return PredictResponse(model=model_name, predictions=preds, probabilities=proba)

@app.get("/model-architecture/{model_name}", tags=["Utilities"])
def get_model_architecture(model_name: str, top_k: int = 5):
    """Get the architecture of a neural network model."""
    models = list_models(out_dir=get_model_dir())
    if model_name not in models:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")
    model = load_model(model_name, out_dir=get_model_dir())
    if not hasattr(model, "coefs_"):
        raise HTTPException(status_code=400, detail=f"Model '{model_name}' has no accessible architecture")
    layers = []
    for i, weights in enumerate(model.coefs_):
        edges = []
        for j in range(weights.shape[1]):
            sorted_idx = abs(weights[:, j]).argsort()[::-1][:top_k]
            for src_idx in sorted_idx:
                edges.append({"src": int(src_idx), "tgt": int(j), "weight": float(weights[src_idx, j])})
        layers.append({"layer_index": i, "input_dim": weights.shape[0], "output_dim": weights.shape[1], "edges": edges})
    return {"n_layers": model.n_layers_, "hidden_layer_sizes": model.hidden_layer_sizes, "out_activation": model.out_activation_, "layers": layers}

@app.post("/compare-dataset")
async def compare_dataset(file: UploadFile = File(...)):
    try:
        df_user = pd.read_csv(file.file)
        df_user.columns = [col.strip().lower() for col in df_user.columns]
        base_dir = Path(__file__).resolve().parent
        ref_path = base_dir / "data_preprocessing" / "input" / "data.csv"
        if not ref_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Reference dataset not found at {ref_path}"
            )
        df_ref = pd.read_csv(ref_path)
        df_ref.columns = [col.strip().lower() for col in df_ref.columns]
        user_cols = set(df_user.columns)
        ref_cols = set(df_ref.columns)
        overlap = len(user_cols & ref_cols)
        missing_in_user = sorted(list(ref_cols - user_cols))
        extra_in_user = sorted(list(user_cols - ref_cols))
        similarity = min(
            1.0,
            (overlap / len(ref_cols)) * 0.5
            + (min(len(df_user.columns), len(df_ref.columns)) / max(len(df_user.columns), len(df_ref.columns))) * 0.5,
        )
        return {
            "reference_dataset": "TII-SSRC-23",
            "records_uploaded": len(df_user),
            "features_uploaded": len(df_user.columns),
            "matching_features": overlap,
            "similarity_score": round(similarity, 3),
            "missing_features": missing_in_user,
            "extra_features": extra_in_user,
        }
    except pd.errors.ParserError:
        raise HTTPException(status_code=400, detail="Invalid CSV format. Please upload a valid CSV file.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dataset comparison failed: {e}")


if __name__ == "__main__":
    import uvicorn
    os.makedirs(get_model_dir(), exist_ok=True)
    uvicorn.run("serve:app", host="0.0.0.0", port=8000, reload=True)