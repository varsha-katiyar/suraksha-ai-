from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from datetime import datetime
from typing import Optional, List
import math
import sys
import os
from pathlib import Path

# Path setup
base_dir = Path(__file__).parent.parent.resolve()
if str(base_dir) not in sys.path:
    sys.path.insert(0, str(base_dir))

try:
    from supabase_client import load_db, save_db
except ImportError:
    from backend.supabase_client import load_db, save_db

router = APIRouter(prefix="/driver-alert", tags=["Driver Alert System"])

# ─────────────────────────────────────────
# Utility: Haversine distance formula
# ─────────────────────────────────────────
def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two GPS coordinates in km."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def get_severity_color(severity: str) -> str:
    return {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}.get(severity.lower(), "🟡")


def get_alert_message(incident: dict, dist_km: float, lang: str = "hi") -> str:
    """Generate multilingual alert message."""
    severity = incident.get("severity", "medium")
    inc_type = incident.get("type", "accident")
    icon = get_severity_color(severity)

    messages = {
        "hi": f"{icon} ⚠️ SAVADHAAN! {dist_km:.1f} km aage {inc_type} ki ghatna hui hai. Dhire chalein!",
        "en": f"{icon} ⚠️ WARNING! {inc_type.upper()} ahead in {dist_km:.1f} km. Slow down now!",
        "ta": f"{icon} ⚠️ எச்சரிக்கை! {dist_km:.1f} கி.மீ தூரத்தில் விபத்து. மெதுவாக ஓட்டுங்கள்!",
        "te": f"{icon} ⚠️ హెచ్చరిక! {dist_km:.1f} కి.మీ ముందు ప్రమాదం జరిగింది. నెమ్మదిగా నడపండి!",
        "mr": f"{icon} ⚠️ सावधान! {dist_km:.1f} किमी पुढे अपघात झाला आहे. हळू चला!",
    }
    return messages.get(lang, messages["en"])


# ─────────────────────────────────────────
# ENDPOINT 1: Check driver proximity to active incidents
# ─────────────────────────────────────────
@router.get("/check-proximity")
async def check_driver_proximity(
    lat: float,
    lon: float,
    lang: str = "hi",
    radius_km: float = 3.0
):
    """
    Driver ki current GPS position le aur active incidents ke sath
    distance calculate karo. Alert return karo agar koi incident radius mein ho.
    """
    try:
        db = load_db()
        incidents = db.get("incidents", [])

        # Only active/pending incidents check karo
        active_statuses = {"pending", "active", "dispatched", "in_progress", "acknowledged"}
        active_incidents = [
            i for i in incidents
            if i.get("status", "pending").lower() in active_statuses
            and i.get("latitude") is not None
            and i.get("longitude") is not None
        ]

        alerts = []
        for incident in active_incidents:
            inc_lat = float(incident.get("latitude", 0))
            inc_lon = float(incident.get("longitude", 0))
            dist = haversine_km(lat, lon, inc_lat, inc_lon)

            if dist <= radius_km:
                severity = incident.get("severity", "medium")
                alerts.append({
                    "incident_id": incident.get("id"),
                    "title": incident.get("title", "Road Incident"),
                    "type": incident.get("type", "accident"),
                    "severity": severity,
                    "distance_km": round(dist, 2),
                    "latitude": inc_lat,
                    "longitude": inc_lon,
                    "status": incident.get("status"),
                    "message": get_alert_message(incident, dist, lang),
                    "created_at": incident.get("created_at"),
                    "should_alert": True
                })

        # Nearest pehle sort karo
        alerts.sort(key=lambda x: x["distance_km"])

        if alerts:
            nearest = alerts[0]
            return {
                "alert": True,
                "alert_count": len(alerts),
                "nearest_incident": nearest,
                "all_alerts": alerts,
                "voice_message": nearest["message"],
                "checked_at": datetime.now().isoformat()
            }
        else:
            return {
                "alert": False,
                "alert_count": 0,
                "message": "✅ Aapke aas paas koi active incident nahi hai. Safe journey!",
                "checked_at": datetime.now().isoformat()
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Proximity check failed: {str(e)}")


# ─────────────────────────────────────────
# ENDPOINT 2: Get all active danger zones (for map overlay)
# ─────────────────────────────────────────
@router.get("/active-zones")
async def get_active_danger_zones():
    """
    Map par dikhane ke liye saare active incident zones return karo.
    Radius ke sath circle overlay ke liye.
    """
    try:
        db = load_db()
        incidents = db.get("incidents", [])

        active_statuses = {"pending", "active", "dispatched", "in_progress", "acknowledged"}
        zones = []

        for inc in incidents:
            if inc.get("status", "pending").lower() not in active_statuses:
                continue
            if not inc.get("latitude") or not inc.get("longitude"):
                continue

            severity = inc.get("severity", "medium").lower()
            radius_map = {"critical": 3.0, "high": 2.0, "medium": 1.5, "low": 1.0}
            color_map = {
                "critical": "#ef4444",
                "high": "#f97316",
                "medium": "#eab308",
                "low": "#22c55e"
            }

            zones.append({
                "id": inc.get("id"),
                "title": inc.get("title", "Incident"),
                "type": inc.get("type", "accident"),
                "severity": severity,
                "latitude": float(inc.get("latitude")),
                "longitude": float(inc.get("longitude")),
                "alert_radius_km": radius_map.get(severity, 1.5),
                "color": color_map.get(severity, "#eab308"),
                "status": inc.get("status"),
                "created_at": inc.get("created_at")
            })

        return {
            "zones": zones,
            "total": len(zones),
            "generated_at": datetime.now().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# ENDPOINT 3: Register driver session (for tracking)
# ─────────────────────────────────────────
@router.post("/register-driver")
async def register_driver_session(
    driver_id: str = Form(...),
    vehicle_number: str = Form(""),
    contact: str = Form(""),
    route_description: str = Form("")
):
    """Driver ko trip start karne par register karo."""
    try:
        db = load_db()
        if "driver_sessions" not in db:
            db["driver_sessions"] = []

        session = {
            "id": f"drv_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "driver_id": driver_id,
            "vehicle_number": vehicle_number,
            "contact": contact,
            "route_description": route_description,
            "status": "active",
            "started_at": datetime.now().isoformat(),
            "last_ping": datetime.now().isoformat()
        }

        # Old session remove karo agar same driver_id hai
        db["driver_sessions"] = [
            s for s in db["driver_sessions"] if s.get("driver_id") != driver_id
        ]
        db["driver_sessions"].append(session)
        save_db(db)

        return {
            "success": True,
            "session_id": session["id"],
            "message": "Driver session started. Stay safe! 🚗",
            "ping_interval_seconds": 10
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────
# ENDPOINT 4: Night risk score for a location
# ─────────────────────────────────────────
@router.get("/night-risk")
async def get_night_risk_score(lat: float, lon: float):
    """
    Current time + location pe based night risk score calculate karo.
    Score 0-100, higher = more dangerous.
    """
    try:
        hour = datetime.now().hour
        db = load_db()
        incidents = db.get("incidents", [])

        # Time factor
        if 22 <= hour or hour <= 4:
            time_factor = 0.9   # Night hours - very risky
            time_label = "Late Night (10 PM - 4 AM)"
        elif 18 <= hour <= 22 or 4 <= hour <= 6:
            time_factor = 0.6   # Evening/dawn - moderate
            time_label = "Evening/Dawn"
        else:
            time_factor = 0.2   # Daytime - relatively safe
            time_label = "Daytime"

        # Historical density near this point
        nearby_count = sum(
            1 for inc in incidents
            if inc.get("latitude") and inc.get("longitude")
            and haversine_km(lat, lon, float(inc["latitude"]), float(inc["longitude"])) <= 5.0
        )
        historical_factor = min(nearby_count / 10.0, 1.0)

        # Composite score
        score = round((time_factor * 60) + (historical_factor * 40))
        score = max(0, min(100, score))

        if score >= 70:
            level, color = "HIGH RISK", "#ef4444"
        elif score >= 45:
            level, color = "MEDIUM RISK", "#f97316"
        else:
            level, color = "LOW RISK", "#22c55e"

        return {
            "risk_score": score,
            "risk_level": level,
            "risk_color": color,
            "time_period": time_label,
            "nearby_historical_incidents": nearby_count,
            "recommendation": (
                "⚠️ High risk period. Drive slowly, headlights on, stay alert!" if score >= 70
                else "🟡 Moderate risk. Stay cautious and avoid distractions." if score >= 45
                else "✅ Relatively safe. Maintain standard precautions."
            ),
            "checked_at": datetime.now().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
