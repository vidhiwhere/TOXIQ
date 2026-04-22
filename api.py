import os
import io
import base64
import pickle
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rdkit import Chem
from rdkit.Chem import AllChem, Descriptors
try:
    from rdkit.Chem import Draw
except ImportError:
    Draw = None
from rdkit.Chem.FilterCatalog import FilterCatalog, FilterCatalogParams


app = FastAPI(title="ToxIQ API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── load models ───────────────────────────────────────────────────────
with open('models.pkl', 'rb') as f:
    models = pickle.load(f)
with open('shap_explainers.pkl', 'rb') as f:
    explainers = pickle.load(f)

# ── PAINS setup ───────────────────────────────────────────────────────
params = FilterCatalogParams()
params.AddCatalog(FilterCatalogParams.FilterCatalogs.PAINS)
pains_catalog = FilterCatalog(params)

ASSAYS = ['NR-AR','NR-AR-LBD','NR-AhR','NR-Aromatase','NR-ER',
          'NR-ER-LBD','NR-PPAR-gamma','SR-ARE','SR-ATAD5',
          'SR-HSE','SR-MMP','SR-p53']

class PredictRequest(BaseModel):
    smiles: str

def smiles_to_features(smiles):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None, None
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
    return fp + extra, mol

def predict_all(features):
    X = np.array(features).reshape(1, -1)
    return {assay: float(models[assay].predict_proba(X)[0][1]) for assay in ASSAYS}

def get_molecule_base64(mol):
    if Draw is None: return ""
    img = Draw.MolToImage(mol, size=(400, 300))
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")

def get_shap_data(mol, smiles, features):
    probs = predict_all(features)
    worst_assay = max(probs, key=probs.get)
    X = np.array(features).reshape(1, -1)
    shap_vals = explainers[worst_assay].shap_values(X)[0]
    
    info = {}
    AllChem.GetMorganFingerprintAsBitVect(mol, radius=2, nBits=2048, bitInfo=info)
    atom_weights = {}
    for bit, atoms in info.items():
        if bit < len(shap_vals):
            for atom_idx, _ in atoms:
                atom_weights[atom_idx] = atom_weights.get(atom_idx, 0) + shap_vals[bit]
    
    if atom_weights:
        max_w = max(abs(v) for v in atom_weights.values()) or 1
        norm_weights = {k: v / max_w for k, v in atom_weights.items()}
    else:
        norm_weights = {}
        
    highlight_atoms = [k for k, v in norm_weights.items() if v > 0.1]
    
    shap_b64 = ""
    if Draw is not None:
        highlight_colors = {
            atom: (1.0, 1.0 - min(norm_weights[atom], 1.0) * 0.8,
                   1.0 - min(norm_weights[atom], 1.0) * 0.8)
            for atom in highlight_atoms
        }
        img = Draw.MolToImage(mol, size=(400, 300), highlightAtoms=highlight_atoms, highlightAtomColors=highlight_colors)
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        shap_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
    return highlight_atoms, shap_b64, worst_assay

@app.post("/api/predict")
def predict_toxicity(req: PredictRequest):
    smiles = req.smiles
    features, mol = smiles_to_features(smiles)
    if mol is None:
        raise HTTPException(status_code=400, detail="Invalid SMILES string")
        
    probs = predict_all(features)
    
    # Properties
    props = {
        "Molecular weight": f"{Descriptors.MolWt(mol):.2f} g/mol",
        "LogP": f"{Descriptors.MolLogP(mol):.2f}",
        "H-bond donors": int(Descriptors.NumHDonors(mol)),
        "H-bond acceptors": int(Descriptors.NumHAcceptors(mol)),
        "Rotatable bonds": int(Descriptors.NumRotatableBonds(mol)),
        "Aromatic rings": int(Descriptors.NumAromaticRings(mol)),
        "TPSA": f"{Descriptors.TPSA(mol):.2f} A^2"
    }
    
    entry = pains_catalog.GetFirstMatch(mol)
    pains_alert = entry.GetDescription() if entry else None
    
    mol_b64 = get_molecule_base64(mol)
    highlight_atoms, shap_b64, worst_assay = get_shap_data(mol, smiles, features)
    
    return {
        "smiles": smiles,
        "assays": probs,
        "properties": props,
        "pains_alert": pains_alert,
        "image_base64": mol_b64,
        "shap_base64": shap_b64,
        "shap_atoms": highlight_atoms,
        "worst_assay_shap": worst_assay
    }

class ChatRequest(BaseModel):
    molecule_name: str
    message: str = ""

@app.post("/api/assistant")
def chat_assistant(req: ChatRequest):
    import urllib.request
    import json
    import urllib.parse
    import urllib.error

    mol_name = req.molecule_name.strip()
    if not mol_name:
        raise HTTPException(status_code=400, detail="Molecule name is required")
        
    encoded_name = urllib.parse.quote(mol_name)
    
    # Defaults
    pubchem_desc = "No description found."
    pubchem_props = {}
    chembl_data = {}
    wiki_desc = ""
    fda_data = {}
    
    # 1. Fetch from PubChem
    try:
        desc_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{encoded_name}/description/JSON"
        req_obj = urllib.request.Request(desc_url, headers={'User-Agent': 'ToxIQ-App'})
        with urllib.request.urlopen(req_obj, timeout=5) as response:
            desc_info = json.loads(response.read())
            if 'InformationList' in desc_info and 'Information' in desc_info['InformationList']:
                for info in desc_info['InformationList']['Information']:
                    if 'Description' in info:
                        pubchem_desc = info['Description']
                        break
    except Exception:
        pass # Not found or error

    try:
        prop_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{encoded_name}/property/MolecularWeight,CanonicalSMILES,XLogP,TPSA/JSON"
        req_obj = urllib.request.Request(prop_url, headers={'User-Agent': 'ToxIQ-App'})
        with urllib.request.urlopen(req_obj, timeout=5) as response:
            prop_info = json.loads(response.read())
            if 'PropertyTable' in prop_info and 'Properties' in prop_info['PropertyTable']:
                pubchem_props = prop_info['PropertyTable']['Properties'][0]
    except Exception:
        pass # Not found

    # 2. Fetch from ChEMBL
    try:
        chembl_url = f"https://www.ebi.ac.uk/chembl/api/data/molecule?pref_name__iexact={encoded_name}&format=json"
        req_obj = urllib.request.Request(chembl_url, headers={'User-Agent': 'ToxIQ-App'})
        with urllib.request.urlopen(req_obj, timeout=5) as response:
            chembl_info = json.loads(response.read())
            if 'molecules' in chembl_info and len(chembl_info['molecules']) > 0:
                first_mol = chembl_info['molecules'][0]
                chembl_data = {
                    "chembl_id": first_mol.get("molecule_chembl_id", "N/A"),
                    "max_phase": first_mol.get("max_phase", "Unknown"),
                    "molecule_type": first_mol.get("molecule_type", "Unknown")
                }
    except Exception:
        pass # Not found
        
    # 3. Fetch from Wikipedia
    try:
        wiki_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{encoded_name}"
        req_obj = urllib.request.Request(wiki_url, headers={'User-Agent': 'ToxIQ-App'})
        with urllib.request.urlopen(req_obj, timeout=5) as response:
            wiki_info = json.loads(response.read())
            if 'extract' in wiki_info:
                wiki_desc = wiki_info['extract']
    except Exception:
        pass # Not found

    # 4. Fetch from openFDA (Adverse Events)
    try:
        fda_url = f"https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:%22{encoded_name}%22&limit=1"
        req_obj = urllib.request.Request(fda_url, headers={'User-Agent': 'ToxIQ-App'})
        with urllib.request.urlopen(req_obj, timeout=5) as response:
            fda_info = json.loads(response.read())
            if 'results' in fda_info and len(fda_info['results']) > 0:
                reactions = fda_info['results'][0].get('patient', {}).get('reaction', [])
                fda_reactions = [r.get('reactionmeddrapt', '') for r in reactions[:5] if 'reactionmeddrapt' in r]
                if fda_reactions:
                    fda_data['reactions'] = fda_reactions
    except Exception:
        pass # Not found
        
    if not pubchem_props and not chembl_data and not wiki_desc and not fda_data:
        return {
            "success": False,
            "message": f"I couldn't find any data for '{mol_name}' across our databases."
        }
        
    smi = pubchem_props.get('CanonicalSMILES', '')
    mol = Chem.MolFromSmiles(smi) if smi else None
    mol_b64 = get_molecule_base64(mol) if mol else ""

    markdown_response = f"### Molecule Data for **{mol_name.title()}**\n\n"
    
    if wiki_desc:
        markdown_response += f"**Overview (Wikipedia):**\n*{wiki_desc}*\n\n"
    elif pubchem_desc and pubchem_desc != "No description found.":
        markdown_response += f"**Description (PubChem):**\n*{pubchem_desc}*\n\n"
        
    if pubchem_props:
        markdown_response += "#### PubChem Properties:\n"
        markdown_response += f"- **SMILES:** `{pubchem_props.get('CanonicalSMILES', 'N/A')}`\n"
        markdown_response += f"- **Molecular Weight:** {pubchem_props.get('MolecularWeight', 'N/A')} g/mol\n"
        markdown_response += f"- **XLogP:** {pubchem_props.get('XLogP', 'N/A')}\n"
        markdown_response += f"- **TPSA:** {pubchem_props.get('TPSA', 'N/A')} Å²\n\n"
        
    if chembl_data:
        markdown_response += "#### ChEMBL Profile:\n"
        markdown_response += f"- **ChEMBL ID:** `{chembl_data.get('chembl_id')}`\n"
        markdown_response += f"- **Max Trial Phase:** {chembl_data.get('max_phase')}\n"
        markdown_response += f"- **Molecule Type:** {chembl_data.get('molecule_type')}\n\n"
        
    if fda_data and 'reactions' in fda_data:
        markdown_response += "#### FDA Reported Adverse Events:\n"
        for rxn in fda_data['reactions']:
            markdown_response += f"- {rxn}\n"
        markdown_response += "\n"

    return {
        "success": True,
        "message": markdown_response,
        "image_base64": mol_b64,
        "raw_pubchem": pubchem_props,
        "raw_chembl": chembl_data,
        "raw_wiki": wiki_desc,
        "raw_fda": fda_data,
        "molecule_name": mol_name
    }
