from fastapi import APIRouter, HTTPException, Form
from datetime import datetime
from typing import Optional, List
import uuid, sys, os
from pathlib import Path

base_dir = Path(__file__).parent.parent.resolve()
if str(base_dir) not in sys.path:
    sys.path.insert(0, str(base_dir))

try:
    from supabase_client import load_db, save_db
except ImportError:
    from backend.supabase_client import load_db, save_db

router = APIRouter(prefix="/fir", tags=["FIR & Insurance Assistant"])

INSURANCE_CHECKLISTS = {
    "accident": [
        "RC Book (Registration Certificate) — gaadi ka",
        "Driving License (DL) — driver ka",
        "Insurance Policy copy",
        "Aadhaar Card / PAN Card",
        "FIR copy (police station se)",
        "Minimum 10 damage photos (sab angles se)",
        "Hospital bills / Medical reports (agar injury ho)",
        "Witness statements (naam + contact)",
        "Repair estimate (authorized garage se)",
        "Bank account details (NEFT ke liye)"
    ],
    "hit_and_run": [
        "FIR copy (MANDATORY — bina is ke claim nahi hoga)",
        "Medical reports / Hospital discharge summary",
        "Aadhaar Card",
        "Photos of injury + vehicle damage",
        "Witness names and phone numbers",
        "CCTV footage request (police ke zariye)",
        "Court order (agar required ho)"
    ],
    "theft": [
        "FIR copy (original)",
        "RC Book copy",
        "Insurance Policy copy",
        "Aadhaar / PAN",
        "Key surrender (duplicate key bhi deni padti hai)",
        "Untraceability report from police (6 hafte baad milti hai)",
        "Bank loan NOC (agar financed vehicle hai)"
    ],
    "fire": [
        "FIR copy",
        "Fire brigade report",
        "Photos of burned vehicle",
        "RC Book",
        "Insurance Policy",
        "Driving License"
    ]
}

def generate_fir_text(data: dict) -> str:
    """Professional FIR draft template generate karo."""
    now = datetime.now()
    return f"""
════════════════════════════════════════════════════════
              ROAD ACCIDENT — FIR DRAFT
         (Motor Vehicles Act, 1988 — Relevant Sections)
════════════════════════════════════════════════════════

Date of Report   : {now.strftime('%d %B %Y')}
Time of Report   : {now.strftime('%I:%M %p')}
Reference ID     : {data.get('fir_id', 'FIR-XXXX')}

────────────────────────────────────────────────────────
1. COMPLAINANT DETAILS
────────────────────────────────────────────────────────
Name             : {data.get('victim_name', 'N/A')}
Contact Number   : {data.get('contact', 'N/A')}
Address          : {data.get('address', 'N/A')}

────────────────────────────────────────────────────────
2. INCIDENT DETAILS
────────────────────────────────────────────────────────
Date of Accident : {data.get('accident_date', now.strftime('%d %B %Y'))}
Time of Accident : {data.get('accident_time', 'N/A')}
Location         : {data.get('location_description', 'N/A')}
GPS Coordinates  : Lat {data.get('lat', 'N/A')}, Lon {data.get('lon', 'N/A')}
Road Type        : {data.get('road_type', 'National Highway / State Highway / Urban Road')}

────────────────────────────────────────────────────────
3. VEHICLE(S) INVOLVED
────────────────────────────────────────────────────────
{chr(10).join([f'  Vehicle {i+1}: {v}' for i, v in enumerate(data.get('vehicles', ['N/A']))])}

────────────────────────────────────────────────────────
4. DESCRIPTION OF ACCIDENT
────────────────────────────────────────────────────────
{data.get('description', 'Details as stated by complainant.')}

────────────────────────────────────────────────────────
5. INJURIES / CASUALTIES
────────────────────────────────────────────────────────
Persons Injured  : {data.get('injuries', '0')}
Fatalities       : {data.get('fatalities', '0')}
Hospitalized At  : {data.get('hospital', 'N/A')}

────────────────────────────────────────────────────────
6. APPLICABLE SECTIONS (Motor Vehicles Act, 1988)
────────────────────────────────────────────────────────
  • Section 134 — Duty of driver to report accidents
  • Section 161 — Hit and run compensation scheme
  • Section 166 — Application for compensation (MACT)
  • IPC Section 279 — Rash driving on public way
  • IPC Section 304A — Causing death by negligence
  (Applicable sections may vary based on investigation)

────────────────────────────────────────────────────────
7. WITNESSES (If any)
────────────────────────────────────────────────────────
{data.get('witnesses', 'None provided at time of reporting.')}

────────────────────────────────────────────────────────
8. INSURANCE INFORMATION
────────────────────────────────────────────────────────
Insurance Company: {data.get('insurance_company', 'N/A')}
Policy Number    : {data.get('policy_number', 'N/A')}
Claim Type       : Own Damage / Third Party (circle as applicable)

────────────────────────────────────────────────────────
DECLARATION
────────────────────────────────────────────────────────
I, {data.get('victim_name', '_______________')}, hereby declare that the 
information provided above is true and correct to the best 
of my knowledge. I request the concerned authorities to 
take necessary action as per law.

Signature: ___________________    Date: {now.strftime('%d/%m/%Y')}

════════════════════════════════════════════════════════
  Generated by CHAUKAS — Road Safety Command System
  Reference: {data.get('fir_id', 'N/A')} | {now.isoformat()}
════════════════════════════════════════════════════════
""".strip()


@router.post("/generate")
async def generate_fir_draft(
    victim_name: str = Form(...),
    contact: str = Form(""),
    address: str = Form(""),
    accident_date: str = Form(""),
    accident_time: str = Form(""),
    location_description: str = Form(...),
    lat: str = Form(""),
    lon: str = Form(""),
    road_type: str = Form(""),
    vehicles: str = Form(""),           # comma-separated vehicle numbers
    description: str = Form(...),
    injuries: str = Form("0"),
    fatalities: str = Form("0"),
    hospital: str = Form(""),
    witnesses: str = Form(""),
    insurance_company: str = Form(""),
    policy_number: str = Form(""),
    incident_type: str = Form("accident")
):
    """FIR draft generate karo — Gemini ya template se."""
    try:
        fir_id = f"FIR-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"

        vehicle_list = [v.strip() for v in vehicles.split(",") if v.strip()] or ["Not provided"]

        data = {
            "fir_id": fir_id,
            "victim_name": victim_name,
            "contact": contact,
            "address": address,
            "accident_date": accident_date or datetime.now().strftime("%d %B %Y"),
            "accident_time": accident_time or datetime.now().strftime("%I:%M %p"),
            "location_description": location_description,
            "lat": lat,
            "lon": lon,
            "road_type": road_type,
            "vehicles": vehicle_list,
            "description": description,
            "injuries": injuries,
            "fatalities": fatalities,
            "hospital": hospital,
            "witnesses": witnesses,
            "insurance_company": insurance_company,
            "policy_number": policy_number,
            "incident_type": incident_type
        }

        fir_text = generate_fir_text(data)

        # Save to DB
        db = load_db()
        if "fir_records" not in db:
            db["fir_records"] = []

        record = {
            "id": fir_id,
            "victim_name": victim_name,
            "incident_type": incident_type,
            "location": location_description,
            "fir_text": fir_text,
            "created_at": datetime.now().isoformat()
        }
        db["fir_records"].append(record)
        save_db(db)

        checklist = INSURANCE_CHECKLISTS.get(incident_type, INSURANCE_CHECKLISTS["accident"])

        return {
            "success": True,
            "fir_id": fir_id,
            "fir_draft": fir_text,
            "insurance_checklist": checklist,
            "next_steps": [
                "1. Is draft ko print karo ya PDF banao",
                "2. Nearest police station jaao aur FIR file karo",
                "3. FIR copy lo — insurance claim ke liye zaruri hai",
                "4. Insurance company ko 24 ghante mein inform karo",
                "5. Gaadi repair se pehle surveyor inspection karwao"
            ],
            "emergency_contacts": {
                "police": "100",
                "ambulance": "108",
                "highway_patrol": "1033",
                "insurance_ombudsman": "155255"
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FIR generation failed: {str(e)}")


@router.get("/checklist/{incident_type}")
async def get_insurance_checklist(incident_type: str):
    """Insurance claim ke liye document checklist return karo."""
    checklist = INSURANCE_CHECKLISTS.get(incident_type, INSURANCE_CHECKLISTS["accident"])
    return {
        "incident_type": incident_type,
        "checklist": checklist,
        "total_documents": len(checklist),
        "tip": "Saare documents ki 2-2 photocopies rakhein. Originals kabhi na dein."
    }


@router.get("/records")
async def get_fir_records(limit: int = 20):
    """Saare saved FIR records return karo."""
    db = load_db()
    records = db.get("fir_records", [])
    records_sorted = sorted(records, key=lambda x: x.get("created_at", ""), reverse=True)
    return {"records": records_sorted[:limit], "total": len(records)}
