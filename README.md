## Auris AI - Network Anomaly Detection

Detect unusual or potentially malicious network activity by distinguishing normal behaviour from anomalies using a mix of supervised, unsupervised, and deep learning models.

![Auris demo](frontend/public/auris.gif)

Live site: [auris-network-anomaly-detection-ai.vercel.app](https://auris-network-anomaly-detection-ai.vercel.app/)


## Quick Start

### Backend

```bash
cd Backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt

# Preprocess data (creates processed_data.npz and feature_metadata.pkl)
python data_preprocessing\data_cleaning.py

# Train and evaluate models (caches to Backend/cache/models)
python main.py

# Start API server
uvicorn serve:app --host 127.0.0.1 --port 8000 --reload
```
Backend SwaggerUI: `http://127.0.0.1:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm start
```
Front end URL: `http://127.0.0.1:3000`.
The frontend expects the backend at `http://127.0.0.1:8000`.


## Backend development:
Details: `https://github.com/Schnitze1/COS30049-Computing-Technology-Innovation-Project`

### Feature Correlation Selection
![Feature Correlation selection](Backend/data_preprocessing/EDA/feature_important_selection.png)

### Model Performance Comparison
![Model Performance](Backend/evaluation_reports/multiclass/multiclass_metrics_comparison.png)

### Feature Importance Analysis
![Feature Importance](Backend/data_preprocessing/output/feature_importance_top15.png)


## Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React Web App]
        UI --> |User Interactions| COMP[Model Selection]
        UI --> |Visualizations| VIZ[Charts & Plots]
    end
    
    subgraph "Backend Layer"
        API[FastAPI Server<br/>serve.py]
        API --> |/predict| MODELS[Model Registry]
        API --> |/train| TRAIN[Training Pipeline]
    end
    
    subgraph "Data Pipeline"
        RAW[Raw Dataset<br/>data.csv]
        RAW --> CLEAN[Data Cleaning<br/>data_cleaning.py]
        CLEAN --> FEAT[Feature Engineering]
        FEAT --> BALANCE[Class Balancing]
        BALANCE --> PROC[Processed Data<br/>processed_data.npz]
    end
    
    subgraph "ML Models"
        RF[Random Forest]
        MLP[Neural Network]
        DBSCAN[DBSCAN Clustering]
        KMEANS[K-Means]
    end
    
    subgraph "Storage"
        CACHE[Model Cache<br/>cache/models/]
        METADATA[Feature Metadata<br/>feature_metadata.pkl]
    end
    
    UI --> |REST API| API
    PROC --> TRAIN
    TRAIN --> MODELS
    MODELS --> RF
    MODELS --> MLP
    MODELS --> DBSCAN
    MODELS --> KMEANS
    MODELS --> CACHE
    PROC --> METADATA
    TRAIN --> CACHE
```

**Components:**
- **Frontend (React, `frontend/`)**: Web App for exploration, model selection, and visualisation (probabilities, confusion matrices, clustering views). Talks to the backend via REST.
- **Backend (Python/FastAPI, `Backend/`)**: Data preprocessing, training, model registry, and prediction API. Trained artefacts cached in `Backend/cache/models` and loaded at serve time.
- **Data pipeline (`Backend/data_preprocessing/`)**: Cleans https://ieeexplore.ieee.org/document/10262330 dataset, engineers features, balances classes, and persists `processed_data.npz` plus `feature_metadata.pkl`.
- **Serving (`Backend/serve.py`)**: Exposes endpoints (e.g., `/predict`) that the frontend calls during interactive testing.