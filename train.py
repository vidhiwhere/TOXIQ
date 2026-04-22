import pandas as pd
import numpy as np
from rdkit import Chem
from rdkit.Chem import AllChem, Descriptors
from xgboost import XGBClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold, train_test_split, cross_val_score
import shap
import pickle

df = pd.read_csv('tox21.csv')

ASSAYS = ['NR-AR','NR-AR-LBD','NR-AhR','NR-Aromatase','NR-ER',
          'NR-ER-LBD','NR-PPAR-gamma','SR-ARE','SR-ATAD5',
          'SR-HSE','SR-MMP','SR-p53']

# ── 1. feature generator (fingerprint + descriptors) ──────────────────
def smiles_to_features(smiles):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    fp = list(AllChem.GetMorganFingerprintAsBitVect(mol, radius=2, nBits=2048))
    extra = [
        Descriptors.MolWt(mol),
        Descriptors.MolLogP(mol),
        Descriptors.NumHDonors(mol),
        Descriptors.NumHAcceptors(mol),
        Descriptors.NumRotatableBonds(mol),
        Descriptors.TPSA(mol),
        Descriptors.NumAromaticRings(mol),
        Descriptors.FractionCSP3(mol),
    ]
    return fp + extra

print("Generating features...")
df['features'] = df['smiles'].apply(smiles_to_features)
df = df[df['features'].notna()]
print(f"Valid molecules: {len(df)}")
print(f"Feature vector size: {len(df['features'].iloc[0])} (2048 fingerprint + 8 descriptors)")

# ── 2. train 12 models ────────────────────────────────────────────────
models = {}
shap_explainers = {}
results = {}

for assay in ASSAYS:
    print(f"\nTraining {assay}...")
    subset = df[df[assay].notna()].copy()
    X = np.array(subset['features'].tolist())
    y = subset[assay].values

    # class imbalance fix
    neg = (y == 0).sum()
    pos = (y == 1).sum()
    scale = neg / pos if pos > 0 else 1
    print(f"  Class ratio — safe:{neg} toxic:{pos} scale_pos_weight:{scale:.1f}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # XGBoost
    xgb = XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.05,
        scale_pos_weight=scale,
        use_label_encoder=False,
        eval_metric='logloss',
        random_state=42
    )

    # Random Forest
    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )

    # fit both on full train set
    xgb.fit(X_train, y_train)
    rf.fit(X_train, y_train)

    xgb_auc = roc_auc_score(y_test, xgb.predict_proba(X_test)[:,1])
    rf_auc  = roc_auc_score(y_test, rf.predict_proba(X_test)[:,1])

    # pick best model per assay
    if xgb_auc >= rf_auc:
        best_model = xgb
        best_auc   = xgb_auc
        best_name  = "XGBoost"
    else:
        best_model = rf
        best_auc   = rf_auc
        best_name  = "RandomForest"

    print(f"  XGBoost AUC: {xgb_auc:.3f} | RandomForest AUC: {rf_auc:.3f} -> using {best_name}")
    results[assay] = {'auc': best_auc, 'model': best_name}
    models[assay]  = best_model

    # SHAP explainer — always use XGBoost for SHAP (TreeSHAP is exact & fast)
    if best_name == "XGBoost":
        shap_explainers[assay] = shap.TreeExplainer(best_model)
    else:
        # RF won but we still train an XGBoost for SHAP
        xgb_fallback = XGBClassifier(
            n_estimators=200, max_depth=5, learning_rate=0.05,
            scale_pos_weight=scale, use_label_encoder=False,
            eval_metric='logloss', random_state=42
        )
        xgb_fallback.fit(X_train, y_train)
        shap_explainers[assay] = shap.TreeExplainer(xgb_fallback)
        print(f"  SHAP: using XGBoost fallback explainer for {assay}")

# ── 3. summary ────────────────────────────────────────────────────────
print("\n" + "="*50)
print("FINAL RESULTS")
print("="*50)
aucs = [v['auc'] for v in results.values()]
for assay, r in results.items():
    print(f"{assay:<20} AUC: {r['auc']:.3f}  ({r['model']})")
print("-"*50)
print(f"Best AUC:    {max(aucs):.3f}  ({max(results, key=lambda a: results[a]['auc'])})")
print(f"Worst AUC:   {min(aucs):.3f}  ({min(results, key=lambda a: results[a]['auc'])})")
print(f"Average AUC: {sum(aucs)/len(aucs):.3f}")

# ── 4. save ───────────────────────────────────────────────────────────
with open('models.pkl', 'wb') as f:
    pickle.dump(models, f)
with open('shap_explainers.pkl', 'wb') as f:
    pickle.dump(shap_explainers, f)

print("\nSaved: models.pkl")
print("Saved: shap_explainers.pkl")
print("Done.")