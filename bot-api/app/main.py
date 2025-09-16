from fastapi import FastAPI, UploadFile, File, HTTPException
from typing import List

app = FastAPI()

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.post("/bank/parse")
async def bank_parse(files: List[UploadFile] = File(...)):
    if len(files) != 3:
        raise HTTPException(422, "Please upload exactly 3 PDF statements.")
    # TODO: call OpenAI Responses with PDFs → normalized Metrics
    return {
        "avg_monthly_revenue": 0,
        "avg_daily_balance_3m": 0,
        "total_nsf_3m": 0,
        "total_days_negative_3m": 0,
    }
