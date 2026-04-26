# Toxlens / ToxIQ 🧪
**AI-powered drug toxicity prediction from molecular structure**

## What it does
ToxIQ predicts whether a drug molecule is toxic across 12 biological assays from the Tox21 benchmark dataset — in seconds, from just a SMILES string. It features a modern, premium web interface with interactive 3D elements, detailed toxicity reports, and an integrated AI assistant for deeper pharmacological context.

## Why it matters
Traditional toxicity testing takes weeks and costs millions. ToxIQ does it instantly and explains *why* a molecule is flagged using SHAP atom-level highlighting, allowing researchers to optimize molecular structures rapidly.

## Features
- **Toxicity Prediction**: 12 XGBoost classifiers (one per Tox21 assay) with ~0.839 average AUC.
- **Explainable AI**: SHAP atom-level heatmaps visually highlight toxic substructures.
- **Pharmacokinetic Profiling**: Automated ADMET and Lipinski Rule of 5 evaluations.
- **AI Assistant**: Conversational agent providing insights from PubMed, PubChem, ChEMBL, and FDA Adverse Events.
- **Batch Processing**: Upload CSV files for high-throughput toxicity screening of multiple compounds.
- **Similarity Search**: Find structurally similar compounds within the Tox21 database.
- **Premium Interface**: A modern, responsive React frontend with 3D molecular visualizations.

## How to run

### Prerequisites
- Node.js (v18+)
- Python (3.9+)

### 1. Backend Setup
1. Open a terminal in the root directory.
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the FastAPI server:
   ```bash
   python -m uvicorn api:app --reload
   ```
   The backend will be running at `http://127.0.0.1:8000`.

### 2. Frontend Setup
1. Open a new terminal and navigate to the `tox-frontend` directory:
   ```bash
   cd tox-frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will be running at `http://localhost:5173`.

### 3. Model Training (Optional)
If you need to retrain the XGBoost and SHAP models:
1. Download `tox21.csv` from [Kaggle](https://www.kaggle.com/datasets/epicskills/tox21-dataset) and place it in the root directory.
2. Run the training script:
   ```bash
   python train.py
   ```
   This will generate `models.pkl` and `shap_explainers.pkl`.

## Example molecules to try
| Molecule | SMILES |
|---|---|
| Aspirin | CC(=O)Oc1ccccc1C(=O)O |
| Caffeine | Cn1cnc2c1c(=O)n(c(=O)n2C)C |
| Bisphenol A | CC(c1ccc(O)cc1)(c1ccc(O)cc1)C |

## Tech stack
- **Frontend**: React, Vite, Three.js (React Three Fiber), GSAP
- **Backend**: FastAPI, Python
- **Machine Learning**: RDKit, XGBoost, SHAP, scikit-learn