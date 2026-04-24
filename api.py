import os, io, base64, pickle, csv, math
import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from rdkit import Chem, DataStructs
from rdkit.Chem import AllChem, Descriptors
try:
    from rdkit.Chem import Draw
except ImportError:
    Draw = None
from rdkit.Chem.FilterCatalog import FilterCatalog, FilterCatalogParams

app = FastAPI(title="ToxIQ API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

with open('models.pkl', 'rb') as f:
    models = pickle.load(f)
with open('shap_explainers.pkl', 'rb') as f:
    explainers = pickle.load(f)

params = FilterCatalogParams()
params.AddCatalog(FilterCatalogParams.FilterCatalogs.PAINS)
pains_catalog = FilterCatalog(params)

ASSAYS = ['NR-AR','NR-AR-LBD','NR-AhR','NR-Aromatase','NR-ER',
          'NR-ER-LBD','NR-PPAR-gamma','SR-ARE','SR-ATAD5','SR-HSE','SR-MMP','SR-p53']

ASSAY_MEANINGS = {
    'NR-AR': 'Androgen Receptor', 'NR-AR-LBD': 'Androgen Receptor LBD',
    'NR-AhR': 'Aryl Hydrocarbon Receptor', 'NR-Aromatase': 'Aromatase',
    'NR-ER': 'Estrogen Receptor', 'NR-ER-LBD': 'Estrogen Receptor LBD',
    'NR-PPAR-gamma': 'PPAR-gamma', 'SR-ARE': 'Oxidative Stress',
    'SR-ATAD5': 'Genotoxicity', 'SR-HSE': 'Cellular Stress',
    'SR-MMP': 'Mitochondrial Toxicity', 'SR-p53': 'DNA Damage (p53)'
}

# Load Tox21 SMILES for similarity search
TOX21_SMILES = []
try:
    with open('tox21.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            s = row.get('smiles', '')
            if s:
                TOX21_SMILES.append(s)
    TOX21_SMILES = list(set(TOX21_SMILES))[:2000]
except Exception:
    pass


class PredictRequest(BaseModel):
    smiles: str

class ChatRequest(BaseModel):
    molecule_name: str
    message: str = ""

class PubMedRequest(BaseModel):
    query: str

class SimilarRequest(BaseModel):
    smiles: str
    top_k: int = 5


def smiles_to_features(smiles):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None, None
    fp = list(AllChem.GetMorganFingerprintAsBitVect(mol, radius=2, nBits=2048))
    extra = [
        Descriptors.MolWt(mol), Descriptors.MolLogP(mol),
        Descriptors.NumHDonors(mol), Descriptors.NumHAcceptors(mol),
        Descriptors.NumRotatableBonds(mol), Descriptors.TPSA(mol),
        Descriptors.NumAromaticRings(mol), Descriptors.FractionCSP3(mol),
    ]
    return fp + extra, mol


def predict_all(features):
    X = np.array(features).reshape(1, -1)
    return {assay: float(models[assay].predict_proba(X)[0][1]) for assay in ASSAYS}


def get_molecule_base64(mol):
    if Draw is None or mol is None: return ""
    img = Draw.MolToImage(mol, size=(400, 300))
    buf = io.BytesIO(); img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def get_shap_data(mol, features):
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
        norm_weights = {k: v/max_w for k, v in atom_weights.items()}
    else:
        norm_weights = {}
    highlight_atoms = [k for k, v in norm_weights.items() if v > 0.1]
    shap_b64 = ""
    if Draw is not None:
        highlight_colors = {a: (1.0, 1.0-min(norm_weights[a],1.0)*0.8, 1.0-min(norm_weights[a],1.0)*0.8) for a in highlight_atoms}
        img = Draw.MolToImage(mol, size=(400,300), highlightAtoms=highlight_atoms, highlightAtomColors=highlight_colors)
        buf = io.BytesIO(); img.save(buf, format="PNG")
        shap_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return highlight_atoms, shap_b64, worst_assay, norm_weights


def compute_lipinski(mol):
    mw = Descriptors.MolWt(mol)
    logp = Descriptors.MolLogP(mol)
    hbd = Descriptors.NumHDonors(mol)
    hba = Descriptors.NumHAcceptors(mol)
    rules = {
        "MW ≤ 500": (mw, mw <= 500),
        "LogP ≤ 5": (logp, logp <= 5),
        "HBD ≤ 5": (hbd, hbd <= 5),
        "HBA ≤ 10": (hba, hba <= 10),
    }
    violations = [k for k, (v, ok) in rules.items() if not ok]
    return {
        "pass": len(violations) == 0,
        "violations": violations,
        "rule_values": {
            "MW": round(mw, 2), "LogP": round(logp, 2),
            "HBD": int(hbd), "HBA": int(hba)
        }
    }


def compute_admet(mol, probs):
    mw = Descriptors.MolWt(mol)
    logp = Descriptors.MolLogP(mol)
    tpsa = Descriptors.TPSA(mol)
    hbd = Descriptors.NumHDonors(mol)
    hba = Descriptors.NumHAcceptors(mol)
    rot = Descriptors.NumRotatableBonds(mol)
    max_tox = max(probs.values())

    absorption = "Good" if tpsa < 90 and rot < 10 and logp < 5 else ("Moderate" if tpsa < 140 else "Poor")
    distribution = "High" if logp > 2 and mw < 500 else ("Moderate" if logp > 0 else "Low")
    metabolism = "Low Risk" if logp < 3 and hba < 6 else ("Moderate Risk" if logp < 5 else "High Risk")
    excretion = "Renal" if tpsa > 60 and logp < 2 else ("Hepatic" if logp > 3 else "Mixed")
    tox_summary = "High Concern" if max_tox > 0.7 else ("Moderate Concern" if max_tox > 0.3 else "Low Concern")

    return {
        "absorption": absorption,
        "distribution": distribution,
        "metabolism": metabolism,
        "excretion": excretion,
        "toxicity_summary": tox_summary
    }


def compute_decision(probs, lipinski, pains_alert):
    max_prob = max(probs.values())
    toxic_count = sum(1 for p in probs.values() if p >= 0.5)
    violations = len(lipinski["violations"])
    if max_prob > 0.7 or toxic_count >= 3 or pains_alert:
        return "Reject"
    elif max_prob > 0.3 or toxic_count >= 1 or violations >= 2:
        return "Optimize"
    return "Proceed"


def compute_confidence(probs):
    vals = list(probs.values())
    max_p = max(vals)
    second = sorted(vals, reverse=True)[1] if len(vals) > 1 else 0
    separation = max_p - second
    base = 0.5 + separation * 0.5
    return round(min(max(base, 0.4), 0.99), 3)


def generate_shap_text(worst_assay, highlight_atoms, norm_weights, mol):
    if not highlight_atoms:
        return f"No dominant toxic substructures identified for {ASSAY_MEANINGS.get(worst_assay, worst_assay)} pathway."
    atom_syms = []
    for idx in highlight_atoms[:5]:
        try:
            sym = mol.GetAtomWithIdx(idx).GetSymbol()
            atom_syms.append(sym)
        except Exception:
            pass
    sym_str = ", ".join(set(atom_syms)) if atom_syms else "unspecified atoms"
    return (f"The primary toxicity signal ({ASSAY_MEANINGS.get(worst_assay, worst_assay)}) "
            f"is driven by {len(highlight_atoms)} atomic substructure(s) centered on {sym_str} atoms. "
            f"These regions show the highest SHAP contribution and should be prioritized for structural modification.")


def generate_suggestions(lipinski, pains_alert, probs, admet):
    tips = []
    for v in lipinski["violations"]:
        if "MW" in v: tips.append("Reduce molecular weight by removing bulky substituents or shortening alkyl chains.")
        if "LogP" in v: tips.append("Decrease lipophilicity by adding polar groups (e.g., -OH, -COOH, -NH2) or replacing aromatic rings with aliphatic rings.")
        if "HBD" in v: tips.append("Reduce H-bond donors (e.g., convert -NH2 or -OH groups to their N-methyl or ester derivatives).")
        if "HBA" in v: tips.append("Reduce H-bond acceptors by removing ether or carbonyl oxygens where possible.")
    if pains_alert:
        tips.append(f"Remove or replace the PAINS-flagged substructure ({pains_alert}) with a non-interfering bioisostere.")
    top_assays = sorted(probs.items(), key=lambda x: -x[1])[:2]
    for assay, prob in top_assays:
        if prob > 0.5:
            tips.append(f"High {ASSAY_MEANINGS.get(assay, assay)} activity ({prob*100:.0f}%) — consider scaffold hopping to reduce receptor engagement.")
    if admet["absorption"] == "Poor":
        tips.append("Improve oral absorption by reducing TPSA below 140 Ų or adding permeation enhancers.")
    return tips if tips else ["Molecule meets drug-likeness criteria. Proceed with in vitro validation."]


def full_predict(smiles: str):
    features, mol = smiles_to_features(smiles)
    if mol is None:
        return None, "Invalid SMILES string"
    probs = predict_all(features)
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
    highlight_atoms, shap_b64, worst_assay, norm_weights = get_shap_data(mol, features)
    lipinski = compute_lipinski(mol)
    admet = compute_admet(mol, probs)
    decision = compute_decision(probs, lipinski, pains_alert)
    confidence = compute_confidence(probs)
    shap_text = generate_shap_text(worst_assay, highlight_atoms, norm_weights, mol)
    suggestions = generate_suggestions(lipinski, pains_alert, probs, admet)
    sorted_assays = sorted(probs.items(), key=lambda x: -x[1])
    top3 = [{"assay": a, "probability": round(p, 4), "meaning": ASSAY_MEANINGS.get(a, a)} for a, p in sorted_assays[:3]]
    return {
        "smiles": smiles,
        "assays": probs,
        "properties": props,
        "pains_alert": pains_alert,
        "image_base64": mol_b64,
        "shap_base64": shap_b64,
        "shap_atoms": highlight_atoms,
        "worst_assay_shap": worst_assay,
        "lipinski": lipinski,
        "admet": admet,
        "decision": decision,
        "confidence_score": confidence,
        "shap_text": shap_text,
        "suggestions": suggestions,
        "top3_risks": top3,
    }, None


@app.post("/api/predict")
def predict_toxicity(req: PredictRequest):
    result, err = full_predict(req.smiles)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return result


@app.post("/api/batch")
async def batch_predict(file: UploadFile = File(...)):
    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))
    results = []
    for i, row in enumerate(reader):
        smiles = row.get("smiles") or row.get("SMILES") or row.get("Smiles") or ""
        name = row.get("name") or row.get("Name") or row.get("compound") or f"Compound {i+1}"
        if not smiles.strip():
            continue
        result, err = full_predict(smiles.strip())
        if err:
            results.append({"name": name, "smiles": smiles, "error": err})
        else:
            results.append({
                "name": name,
                "smiles": result["smiles"],
                "decision": result["decision"],
                "confidence_score": result["confidence_score"],
                "max_prob": round(max(result["assays"].values()), 4),
                "toxic_count": sum(1 for p in result["assays"].values() if p >= 0.5),
                "lipinski_pass": result["lipinski"]["pass"],
                "top_assay": result["top3_risks"][0]["assay"] if result["top3_risks"] else "",
                "pains_alert": result["pains_alert"] or "",
            })
    return {"count": len(results), "results": results}


@app.post("/api/similar")
def find_similar(req: SimilarRequest):
    _, query_mol = smiles_to_features(req.smiles)
    if query_mol is None:
        raise HTTPException(status_code=400, detail="Invalid SMILES")
    query_fp = AllChem.GetMorganFingerprintAsBitVect(query_mol, 2, 2048)
    scored = []
    for s in TOX21_SMILES:
        m = Chem.MolFromSmiles(s)
        if m is None: continue
        fp = AllChem.GetMorganFingerprintAsBitVect(m, 2, 2048)
        sim = DataStructs.TanimotoSimilarity(query_fp, fp)
        if sim < 0.99:
            scored.append({"smiles": s, "similarity": round(sim, 3)})
    scored.sort(key=lambda x: -x["similarity"])
    top = scored[:req.top_k]
    for item in top:
        m = Chem.MolFromSmiles(item["smiles"])
        item["image_base64"] = get_molecule_base64(m) if m else ""
    return {"similar": top}


@app.post("/api/pubmed")
def search_pubmed(req: PubMedRequest):
    import urllib.request, urllib.parse, json
    query = urllib.parse.quote(req.query + " toxicity")
    search_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term={query}&retmax=5&retmode=json"
    articles = []
    try:
        with urllib.request.urlopen(search_url, timeout=8) as r:
            data = json.loads(r.read())
        ids = data.get("esearchresult", {}).get("idlist", [])
        if ids:
            ids_str = ",".join(ids)
            summary_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id={ids_str}&retmode=json"
            with urllib.request.urlopen(summary_url, timeout=8) as r:
                sdata = json.loads(r.read())
            for pmid in ids:
                info = sdata.get("result", {}).get(pmid, {})
                title = info.get("title", "No title")
                year = info.get("pubdate", "")[:4]
                journal = info.get("source", "")
                authors = ", ".join([a.get("name","") for a in info.get("authors",[])[:3]])
                articles.append({
                    "pmid": pmid,
                    "title": title,
                    "year": year,
                    "journal": journal,
                    "authors": authors,
                    "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
                })
    except Exception as e:
        pass
    return {"query": req.query, "articles": articles}


@app.post("/api/assistant")
def chat_assistant(req: ChatRequest):
    import urllib.request, json, urllib.parse, re

    mol_name = req.molecule_name.strip()
    message = req.message.strip().lower()

    # Intent detection
    is_safety_q = any(w in message for w in ["safe", "toxic", "danger", "harmful", "okay", "ok"])
    is_compare = any(w in message for w in ["compare", "vs", "versus", "better", "safer between"])
    is_suggest = any(w in message for w in ["suggest", "alternative", "safer", "replace", "substitute"])

    if not mol_name:
        raise HTTPException(status_code=400, detail="Molecule name is required")

    encoded_name = urllib.parse.quote(mol_name)
    pubchem_desc, pubchem_props, chembl_data, wiki_desc, fda_data = "No description found.", {}, {}, "", {}

    try:
        url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{encoded_name}/description/JSON"
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'ToxIQ'}), timeout=5) as r:
            info = json.loads(r.read())
            for item in info.get('InformationList',{}).get('Information',[]):
                if 'Description' in item:
                    pubchem_desc = item['Description']; break
    except: pass

    try:
        url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{encoded_name}/property/MolecularWeight,CanonicalSMILES,XLogP,TPSA/JSON"
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'ToxIQ'}), timeout=5) as r:
            info = json.loads(r.read())
            pubchem_props = info.get('PropertyTable',{}).get('Properties',[{}])[0]
    except: pass

    try:
        url = f"https://www.ebi.ac.uk/chembl/api/data/molecule?pref_name__iexact={encoded_name}&format=json"
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'ToxIQ'}), timeout=5) as r:
            info = json.loads(r.read())
            if info.get('molecules'):
                m = info['molecules'][0]
                chembl_data = {"chembl_id": m.get("molecule_chembl_id","N/A"), "max_phase": m.get("max_phase","?"), "molecule_type": m.get("molecule_type","?")}
    except: pass

    try:
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{encoded_name}"
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'ToxIQ'}), timeout=5) as r:
            info = json.loads(r.read())
            wiki_desc = info.get('extract','')
    except: pass

    try:
        url = f"https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:%22{encoded_name}%22&limit=1"
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'ToxIQ'}), timeout=5) as r:
            info = json.loads(r.read())
            if info.get('results'):
                reactions = info['results'][0].get('patient',{}).get('reaction',[])
                fda_data['reactions'] = [rx.get('reactionmeddrapt','') for rx in reactions[:5] if 'reactionmeddrapt' in rx]
    except: pass

    smi = pubchem_props.get('CanonicalSMILES','')
    mol_obj = Chem.MolFromSmiles(smi) if smi else None
    mol_b64 = get_molecule_base64(mol_obj) if mol_obj else ""

    # Run toxicity if safety question or suggest
    tox_result = None
    if smi and (is_safety_q or is_suggest):
        r, err = full_predict(smi)
        if not err:
            tox_result = r

    md = f"### Molecule Data for **{mol_name.title()}**\n\n"
    if wiki_desc:
        md += f"**Overview:** *{wiki_desc[:400]}{'...' if len(wiki_desc)>400 else ''}*\n\n"
    elif pubchem_desc != "No description found.":
        md += f"**Description:** *{pubchem_desc[:400]}*\n\n"

    if pubchem_props:
        md += f"#### PubChem Properties:\n- **SMILES:** `{pubchem_props.get('CanonicalSMILES','N/A')}`\n- **MW:** {pubchem_props.get('MolecularWeight','N/A')} g/mol\n- **XLogP:** {pubchem_props.get('XLogP','N/A')}\n- **TPSA:** {pubchem_props.get('TPSA','N/A')} Å²\n\n"

    if chembl_data:
        md += f"#### ChEMBL Profile:\n- **ID:** `{chembl_data.get('chembl_id')}`\n- **Trial Phase:** {chembl_data.get('max_phase')}\n- **Type:** {chembl_data.get('molecule_type')}\n\n"

    if fda_data.get('reactions'):
        md += "#### FDA Adverse Events:\n" + "".join(f"- {r}\n" for r in fda_data['reactions']) + "\n"

    if tox_result:
        dec = tox_result['decision']
        conf = tox_result['confidence_score']
        dec_emoji = {"Proceed": "✅", "Optimize": "⚠️", "Reject": "❌"}.get(dec, "")
        md += f"#### ToxIQ Safety Assessment:\n- **Verdict:** {dec_emoji} **{dec}**\n- **Confidence:** {conf*100:.1f}%\n"
        md += f"- **Lipinski:** {'✅ Pass' if tox_result['lipinski']['pass'] else '❌ Fail — ' + ', '.join(tox_result['lipinski']['violations'])}\n"
        if tox_result['suggestions'] and is_suggest:
            md += "\n#### Improvement Suggestions:\n" + "".join(f"- {s}\n" for s in tox_result['suggestions'][:3])

    if not pubchem_props and not chembl_data and not wiki_desc:
        return {"success": False, "message": f"No data found for '{mol_name}'."}

    return {"success": True, "message": md, "image_base64": mol_b64, "raw_pubchem": pubchem_props,
            "raw_chembl": chembl_data, "raw_wiki": wiki_desc, "raw_fda": fda_data,
            "molecule_name": mol_name, "tox_result": tox_result}
