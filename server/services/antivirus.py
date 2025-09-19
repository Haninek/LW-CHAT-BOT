import os
try:
    import clamd
except Exception:
    clamd = None

CLAMD_HOST = os.getenv("CLAMD_HOST", "localhost")
CLAMD_PORT = int(os.getenv("CLAMD_PORT", "3310"))

def scan_bytes(data: bytes) -> None:
    if not clamd:
        return
    cd = clamd.ClamdNetworkSocket(CLAMD_HOST, CLAMD_PORT)
    res = cd.instream(data)
    status = (res or {}).get("stream", ["OK"])[0]
    if status != "OK":
        raise ValueError(f"Virus detected: {status}")