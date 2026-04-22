# ToxIQ 🧪
**AI-powered drug toxicity prediction from molecular structure**

## What it does
ToxIQ predicts whether a drug molecule is toxic across 12 biological 
assays from the Tox21 benchmark dataset — in seconds, from just a 
SMILES string.

## Why it matters
Traditional toxicity testing takes weeks and costs millions. ToxIQ does 
it instantly and explains *why* a molecule is flagged using SHAP 
atom-level highlighting.

## Features
- 12 XGBoost classifiers — one per Tox21 assay
- 0.839 average AUC across all 12 endpoints
- SHAP explainability — atom heatmap shows toxic substructures
- Confidence scores per assay
- PAINS structural alert filter
- Biological interpretation of flagged assays
- Clean Streamlit UI — just paste a SMILES string

## How to run

### 1. Install dependencies
pip install -r requirements.txt

### 2. Download the dataset
Download tox21.csv from:
https://www.kaggle.com/datasets/epicskills/tox21-dataset

### 3. Train the models
python train.py

### 4. Launch the app
python -m streamlit run app.py

## Example molecules to try
| Molecule | SMILES |
|---|---|
| Aspirin | CC(=O)Oc1ccccc1C(=O)O |
| Caffeine | Cn1cnc2c1c(=O)n(c(=O)n2C)C |
| Bisphenol A | CC(c1ccc(O)cc1)(c1ccc(O)cc1)C |

## Dataset
Tox21 — 12,000 chemical compounds across 12 toxicity assays.
Source: https://www.kaggle.com/datasets/epicskills/tox21-dataset

## Tech stack
RDKit · XGBoost · SHAP · Streamlit · scikit-learn