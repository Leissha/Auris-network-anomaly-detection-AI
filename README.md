## Backend development:
Details: `https://github.com/Schnitze1/COS30049-Computing-Technology-Innovation-Project`

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
