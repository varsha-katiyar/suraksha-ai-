from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from datetime import datetime
from typing import Optional
import uuid
import os
import sys
import math
from pathlib import Path

base_dir = Path(__file__).parent.parent.resolve()
if str(base_dir) not in sys.path:
    sys.path.insert(0, str(base_dir))

try:
    from supabase_client import load_db, save_db, UPLOADS_DIR
except ImportError:
    from backend.supabase_client import load_db, save_db, UPLOADS_DIR

router = APIRouter(prefix="/witness", tags=["Witness Report"])


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.asin(math.sqrt(a))


def get_badge(count: int) -> dict:
    """Witness count ke hisab se badge assign karo."""
    if count >= 10:
        return {"name": "Maha Rakshak 🦅", "level": "platinum", "color": "#a855f7"}
    elif count >= 5:
        return {"name": "Jeevan Rakshak 🦸", "level": "gold", "color": "#f59e0b"}
    elif count >= 2:
        return {"name": "Sahayak 🤝", "level": "silver", "color": "#94a3b8"}
    else:
        return {"name": "Chaukidaar 👁️", "level": "bronze", "color": "#92400e"}


# ─────────────────────────────────────────
# ENDPOINT 1: Quick anonymous 2-tap report
# ─────────────────────────────────────────
@router.post("/quick-report")
async def quick_witness_report(
    lat: float = Form(...),
    lon: float = Form(...),
    incident_type: str = Form(...),       # accident, breakdown, flooding, fire, animal
    severity_guess: str = Form("medium"), # low, medium, high, critical
    description: str = Form(""),
    reporter_name: str = Form("Anonymous"),
    photo: Optional[UploadFile] = File(None)
):
    """
    2-tap anonymous witness reporting.
    Multiple reports same location se aaye toh auto-escalate.
    No login required.
    """
    try:
        db = load_db()
        if "witness_reports" not in db:
            db["witness_reports"] = []
        if "incidents" not in db:
            db["incidents"] = []

        report_id = str(uuid.uuid4())[:8].upper()

        # Photo save karo agar di gayi ho
        photo_url = None
        if photo:
            try:
                ext = photo.filename.split(".")[-1] if "." in photo.filename else "jpg"
                filename = f"witness_{report_id}.{ext}"
                save_path = UPLOADS_DIR / "witness" / filename
                os.makedirs(save_path.parent, exist_ok=True)
                content = await photo.read()
                with open(save_path, "wb") as f:
                    f.write(content)
                photo_url = f"http://localhost:8000/uploads/witness/{filename}"
            except Exception as e:
                print(f"Witness photo upload failed: {e}")

        # Kya same location pe koi existing incident hai? (500m radius)
        nearby_incident = None
        for inc in db["incidents"]:
            if inc.get("latitude") and inc.get("longitude"):
                dist = haversine_km(lat, lon, float(inc["latitude"]), float(inc["longitude"]))
                if dist <= 0.5:  # 500m
                    nearby_incident = inc
                    break

        witness_report = {
            "id": report_id,
            "lat": lat,
            "lon": lon,
            "incident_type": incident_type,
            "severity_guess": severity_guess,
            "description": description,
            "reporter_name": reporter_name,
            "photo_url": photo_url,
            "created_at": datetime.now().isoformat(),
            "linked_incident_id": nearby_incident.get("id") if nearby_incident else None
        }
        db["witness_reports"].append(witness_report)

        # Confirmation level based on how many witnesses
        if nearby_incident:
            # Witness count badhao
            witness_count = nearby_incident.get("witness_count", 0) + 1
            nearby_incident["witness_count"] = witness_count

            if witness_count >= 3:
                nearby_incident["confidence"] = "HIGH"
                nearby_incident["severity"] = "high"
                nearby_incident["status"] = "acknowledged"

            # Update incident in DB
            db["incidents"] = [
                nearby_incident if i.get("id") == nearby_incident.get("id") else i
                for i in db["incidents"]
            ]
            confirmation_msg = f"✅ Existing incident corroborated! Now {witness_count} witnesses."
            is_new = False
        else:
            # Naya witness-initiated incident create karo
            new_incident = {
                "id": str(uuid.uuid4()),
                "title": f"Witness Report: {incident_type.replace('_', ' ').title()}",
                "description": description or f"Reported by witness. Type: {incident_type}",
                "type": incident_type,
                "latitude": lat,
                "longitude": lon,
                "severity": severity_guess,
                "status": "pending",
                "source": "witness",
                "witness_count": 1,
                "confidence": "LOW",
                "image_url": photo_url,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "reported_at": datetime.now().isoformat()
            }
            db["incidents"].append(new_incident)
            witness_report["linked_incident_id"] = new_incident["id"]
            confirmation_msg = "✅ New incident reported! Thank you for keeping roads safe."
            is_new = True

        save_db(db)

        # Badge assign karo
        reporter_reports = [r for r in db["witness_reports"] if r.get("reporter_name") == reporter_name]
        badge = get_badge(len(reporter_reports))

        return {
            "success": True,
            "report_id": report_id,
            "is_new_incident": is_new,
            "message": confirmation_msg,
            "badge": badge,
            "photo_saved": photo_url is not None,
            "created_at": datetime.now().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report failed: {str(e)}")


# ─────────────────────────────────────────
# ENDPOINT 2: Get all witness reports (for admin)
# ─────────────────────────────────────────
@router.get("/reports")
async def get_all_witness_reports(limit: int = 50):
    """Saare witness reports return karo (admin ke liye)."""
    try:
        db = load_db()
        reports = db.get("witness_reports", [])
        reports_sorted = sorted(reports, key=lambda x: x.get("created_at", ""), reverse=True)
        return {
            "reports": reports_sorted[:limit],
            "total": len(reports),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# ENDPOINT 3: Stats for leaderboard
# ─────────────────────────────────────────
@router.get("/leaderboard")
async def get_witness_leaderboard():
    """Top witnesses ko show karo — gamification."""
    try:
        db = load_db()
        reports = db.get("witness_reports", [])

        counts = {}
        for r in reports:
            name = r.get("reporter_name", "Anonymous")
            if name == "Anonymous":
                continue
            counts[name] = counts.get(name, 0) + 1

        leaderboard = [
            {
                "rank": i + 1,
                "name": name,
                "reports": count,
                "badge": get_badge(count)
            }
            for i, (name, count) in enumerate(
                sorted(counts.items(), key=lambda x: x[1], reverse=True)[:10]
            )
        ]

        return {"leaderboard": leaderboard, "total_witnesses": len(counts)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
