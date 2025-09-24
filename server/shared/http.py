from __future__ import annotations
from typing import Any, Dict
from fastapi import Response
import json

def ok(payload: Dict[str, Any]) -> Response:
    return Response(content=json.dumps(payload), media_type="application/json")