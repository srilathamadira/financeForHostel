from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from bson import ObjectId
from pymongo import ReturnDocument
import jwt
import os
import uuid
from bson import ObjectId
from pymongo import ReturnDocument
from fastapi.responses import StreamingResponse
import csv
from io import StringIO
from openpyxl import Workbook
from fastapi.responses import StreamingResponse
from io import BytesIO
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime
from report_excel import build_excel
from mailer import send_report
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime


# ================= ENV =================

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

SECRET_KEY = os.environ.get(
    "JWT_SECRET_KEY",
    "super-secret-key-32-bytes-minimum-123456"
)

ALGORITHM = "HS256"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ================= APP =================

app = FastAPI()
api_router = APIRouter(prefix="/api")
@app.api_route("/health",methods=["GET","HEAD"])
def health():
    return {"status": "ok"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= AUTH =================
REPORT_RECEIVER = os.getenv("REPORT_RECEIVER")

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
security = HTTPBearer()

RAW_USERS = [
    {
        "id": "u1",
        "username": "Nayeem_Khan",
        "name": "Nayeem Khan",
        "password": "Nayeem@3239",
        "email": "pathannayeem2@gmail.com",
        "send_report": True   # ✅ will receive report
    },
    {
        "id": "u2",
        "username": "Shaik_Rukhiya",
        "name": "Shaik Rukhiya",
        "password": "Rukhiya@3239",
        "email": "rukhiya@gmail.com",
        "send_report": False  # ❌ will NOT receive report
    },
]


FIXED_USERS = {
    u["username"]: {**u, "password": pwd_context.hash(u["password"])}
    for u in RAW_USERS
}

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    id: str
    username: str
    name: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: User


def verify_password(p, h):
    try:
        return pwd_context.verify(p, h)
    except:
        return False


def create_token(uid: str):
    payload = {
        "sub": uid,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    cred: HTTPAuthorizationCredentials = Depends(security),
):
    payload = jwt.decode(
        cred.credentials,
        SECRET_KEY,
        algorithms=[ALGORITHM]
    )

    uid = payload["sub"]

    for u in FIXED_USERS.values():
        if u["id"] == uid:
            return User(id=u["id"], username=u["username"], name=u["name"])

    raise HTTPException(401, "Invalid user")

async def monthly_report_job():

    now = datetime.now()
    month = now.strftime("%Y-%m")

    match = {"date": {"$regex": f"^{month}"}}

    rev = await db.revenue.aggregate([
        {"$match": match},
        {"$group": {"_id": None, "t": {"$sum": "$total_revenue"}}}
    ]).to_list(1)

    exp = await db.expenses.aggregate([
        {"$match": match},
        {"$group": {"_id": None, "t": {"$sum": "$amount"}}}
    ]).to_list(1)

    cat = await db.expenses.aggregate([
        {"$match": match},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}}
    ]).to_list(100)

    summary = {
        "total_revenue": rev[0]["t"] if rev else 0,
        "total_expenses": exp[0]["t"] if exp else 0,
        "net_profit": (rev[0]["t"] if rev else 0) - (exp[0]["t"] if exp else 0),
        "category_data": [{"name": c["_id"], "value": c["total"]} for c in cat]
    }

    file_path = build_excel(summary, month)

    # ✅ SEND ONLY TO PREDEFINED USERS
    for u in FIXED_USERS.values():
        if u.get("send_report"):     # only flagged users
            await send_report(u["email"], file_path)


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):

    u = FIXED_USERS.get(data.username)

    if not u or not verify_password(data.password, u["password"]):
        raise HTTPException(401, "Invalid username or password")

    token = create_token(u["id"])

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=User(id=u["id"], username=u["username"], name=u["name"]),
    )


@api_router.get("/auth/me", response_model=User)
async def me(user: User = Depends(get_current_user)):
    return user


# ================= MODELS =================

class Contribution(BaseModel):
    name: str
    amount: float


class RevenueCreate(BaseModel):
    date: str
    cash_amount: float = 0
    contributions: List[Contribution] = []


class Revenue(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    date: str
    cash_amount: float
    contributions: List[Contribution]
    total_revenue: float
    created_at: str


class ExpenseCreate(BaseModel):
    date: str
    category: str
    description: str
    amount: float
    remarks: Optional[str] = ""


class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    date: str
    category: str
    description: str
    amount: float
    remarks: str
    created_at: str


# ================= REVENUE =================

@api_router.post("/revenue", response_model=Revenue)
async def create_revenue(data: RevenueCreate, user=Depends(get_current_user)):

    contrib_total = sum(c.amount for c in data.contributions)

    doc = {
        "id": str(uuid.uuid4()),
        "date": data.date,
        "cash_amount": data.cash_amount,
        "contributions": [c.model_dump() for c in data.contributions],
        "total_revenue": data.cash_amount + contrib_total,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.revenue.insert_one(doc)
    return Revenue(**doc)


@api_router.get("/revenue", response_model=List[Revenue])
async def get_revenue(user=Depends(get_current_user)):
    return await db.revenue.find({}, {"_id": 0}).sort("date", -1).to_list(1000)


@api_router.put("/revenue/{rid}", response_model=Revenue)
async def update_revenue(rid: str, data: RevenueCreate, user=Depends(get_current_user)):

    contrib_total = sum(c.amount for c in data.contributions)

    update_doc = {
        "date": data.date,
        "cash_amount": data.cash_amount,
        "contributions": [c.model_dump() for c in data.contributions],
        "total_revenue": data.cash_amount + contrib_total,
    }

    query = {"$or": [{"id": rid}]}
    if ObjectId.is_valid(rid):
        query["$or"].append({"_id": ObjectId(rid)})

    updated = await db.revenue.find_one_and_update(
        query,
        {"$set": update_doc},
        return_document=ReturnDocument.AFTER
    )

    if not updated:
        raise HTTPException(404, "Revenue not found")

    updated.pop("_id", None)
    return Revenue(**updated)



@api_router.delete("/revenue/{rid}")
async def delete_revenue(rid: str, user=Depends(get_current_user)):

    query = {"$or": [{"id": rid}]}
    if ObjectId.is_valid(rid):
        query["$or"].append({"_id": ObjectId(rid)})

    result = await db.revenue.delete_one(query)

    if result.deleted_count == 0:
        raise HTTPException(404, "Revenue not found")

    return {"message": "deleted"}

# ================= REVENUE EXPORT =================

@api_router.get("/revenue/export")
async def export_revenue_excel(month: str, user=Depends(get_current_user)):

    q = {"date": {"$regex": f"^{month}"}}
    rows = await db.revenue.find(q, {"_id": 0}).sort("date", 1).to_list(5000)

    wb = Workbook()
    ws = wb.active
    ws.title = "Revenue"

    ws.append([
        "Date",
        "Cash Amount",
        "Contribution Total",
        "Total Revenue"
    ])

    for r in rows:
        contrib_total = sum(c.get("amount", 0) for c in r.get("contributions", []))

        ws.append([
            r.get("date"),
            r.get("cash_amount", 0),
            contrib_total,
            r.get("total_revenue", 0),
        ])

    stream = BytesIO()
    wb.save(stream)
    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=revenue_{month}.xlsx"
        },
    )

# ================= EXPENSES =================

@api_router.post("/expenses", response_model=Expense)
async def create_expense(data: ExpenseCreate, user=Depends(get_current_user)):

    doc = {
        "id": str(uuid.uuid4()),
        "date": data.date,
        "category": data.category,
        "description": data.description,
        "amount": data.amount,
        "remarks": data.remarks or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.expenses.insert_one(doc)
    return Expense(**doc)


@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses(user=Depends(get_current_user)):
    return await db.expenses.find({}, {"_id": 0}).sort("date", -1).to_list(1000)


@api_router.put("/expenses/{eid}", response_model=Expense)
async def update_expense(eid: str, data: ExpenseCreate, user=Depends(get_current_user)):

    query = {"$or": [{"id": eid}]}
    if ObjectId.is_valid(eid):
        query["$or"].append({"_id": ObjectId(eid)})

    updated = await db.expenses.find_one_and_update(
        query,
        {"$set": data.model_dump()},
        return_document=ReturnDocument.AFTER
    )

    if not updated:
        raise HTTPException(404, "Expense not found")

    updated.pop("_id", None)
    return Expense(**updated)


@api_router.delete("/expenses/{eid}")
async def delete_expense(eid: str, user=Depends(get_current_user)):

    query = {"$or": [{"id": eid}]}
    if ObjectId.is_valid(eid):
        query["$or"].append({"_id": ObjectId(eid)})

    result = await db.expenses.delete_one(query)

    if result.deleted_count == 0:
        raise HTTPException(404, "Expense not found")

    return {"message": "deleted"}

# ================= EXPENSE EXPORT =================

@api_router.get("/expenses/export")
async def export_expenses_excel(month: str, user=Depends(get_current_user)):

    q = {"date": {"$regex": f"^{month}"}}
    rows = await db.expenses.find(q, {"_id": 0}).sort("date", 1).to_list(5000)

    wb = Workbook()
    ws = wb.active
    ws.title = "Expenses"

    ws.append([
        "Date",
        "Category",
        "Description",
        "Amount",
        "Remarks"
    ])

    for e in rows:
        ws.append([
            e.get("date"),
            e.get("category"),
            e.get("description"),
            e.get("amount", 0),
            e.get("remarks", ""),
        ])

    stream = BytesIO()
    wb.save(stream)
    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=expenses_{month}.xlsx"
        },
    )

# ================= REPORTS =================

class DailyReport(BaseModel):
    date: str
    total_revenue: float
    total_expenses: float
    net_profit: float


@api_router.get("/reports/daily", response_model=List[DailyReport])
async def daily_report(
    month: Optional[str] = None,
    user=Depends(get_current_user)
):

    match_stage = []
    if month:
        match_stage = [{"$match": {"date": {"$regex": f"^{month}"}}}]

    # revenue grouped by date
    rev = await db.revenue.aggregate([
        *match_stage,
        {"$group": {"_id": "$date", "t": {"$sum": "$total_revenue"}}}
    ]).to_list(1000)

    # expenses grouped by date
    exp = await db.expenses.aggregate([
        *match_stage,
        {"$group": {"_id": "$date", "t": {"$sum": "$amount"}}}
    ]).to_list(1000)

    rmap = {r["_id"]: r["t"] for r in rev}
    emap = {e["_id"]: e["t"] for e in exp}

    dates = sorted(set(rmap) | set(emap), reverse=True)

    return [
        DailyReport(
            date=d,
            total_revenue=rmap.get(d, 0),
            total_expenses=emap.get(d, 0),
            net_profit=rmap.get(d, 0) - emap.get(d, 0),
        )
        for d in dates
    ]




class MonthlySummary(BaseModel):
    total_revenue: float
    total_expenses: float
    net_profit: float
    category_data: List[dict]
    revenue_data: List[dict]   # ADD THIS



@api_router.get("/reports/monthly-summary", response_model=MonthlySummary)
async def monthly_summary(month: str, user=Depends(get_current_user)):

    match = {"date": {"$regex": f"^{month}"}}

    # ---------- totals ----------
    rev = await db.revenue.aggregate([
        {"$match": match},
        {"$group": {
            "_id": None,
            "t": {"$sum": {"$toDouble": "$total_revenue"}}
        }},
    ]).to_list(1)

    exp = await db.expenses.aggregate([
        {"$match": match},
        {"$group": {
            "_id": None,
            "t": {"$sum": {"$toDouble": "$amount"}}
        }},
    ]).to_list(1)

    tr = rev[0]["t"] if rev else 0
    te = exp[0]["t"] if exp else 0

    # ---------- category totals ----------
    cat = await db.expenses.aggregate([
        {"$match": match},
        {"$group": {
            "_id": "$category",
            "total": {"$sum": {"$toDouble": "$amount"}}
        }},
    ]).to_list(100)

    # ---------- daily chart data ----------
    daily_rev = await db.revenue.aggregate([
        {"$match": match},
        {"$group": {
            "_id": "$date",
            "revenue": {"$sum": {"$toDouble": "$total_revenue"}}
        }}
    ]).to_list(200)

    daily_exp = await db.expenses.aggregate([
        {"$match": match},
        {"$group": {
            "_id": "$date",
            "expenses": {"$sum": {"$toDouble": "$amount"}}
        }}
    ]).to_list(200)

    rev_map = {d["_id"]: d["revenue"] for d in daily_rev}
    exp_map = {d["_id"]: d["expenses"] for d in daily_exp}

    dates = sorted(set(rev_map) | set(exp_map))

    revenue_data = [
        {
            "date": d,
            "revenue": rev_map.get(d, 0),
            "expenses": exp_map.get(d, 0)
        }
        for d in dates
    ]

    return MonthlySummary(
        total_revenue=tr,
        total_expenses=te,
        net_profit=tr - te,
        category_data=[{"name": c["_id"], "value": c["total"]} for c in cat],
        revenue_data=revenue_data
    )
@api_router.get("/test-mail")
async def test_mail():

    summary = {
        "total_revenue": 12000,
        "total_expenses": 5000,
        "net_profit": 7000,
        "category_data": [
            {"name": "Mess", "value": 2000},
            {"name": "Veg", "value": 1500},
        ],
    }

    file_path = build_excel(summary, "test")

    await send_report(
        REPORT_RECEIVER,   # use the environment variable
        file_path
    )

    return {"status": "sent"}


scheduler = AsyncIOScheduler()

scheduler.add_job(
    monthly_report_job,
    "cron",
    day="last",     # ✅ last day of every month
    hour=18,        # change time if you want
    minute=0        # change minute if you want
)

scheduler.start()



# ================= BOOT =================

app.include_router(api_router)


@app.on_event("shutdown")
async def shutdown():
    client.close()
