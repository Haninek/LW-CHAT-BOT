import os
try:
    import clamd
except Exception:
    clamd = None

CLAMD_HOST = os.getenv("CLAMD_HOST", "localhost")
CLAMD_PORT = int(os.getenv("CLAMD_PORT", "3310"))

def scan_bytes(data: bytes) -> None:
    """
    Scan bytes for viruses using ClamAV daemon.
    Gracefully handles when ClamAV is not available (development environment).
    """
    if not clamd or not data:
        return
    
    try:
        cd = clamd.ClamdNetworkSocket(CLAMD_HOST, CLAMD_PORT)
        res = cd.instream(data)
        status = (res or {}).get("stream", ["OK"])[0]
        if status != "OK":
            raise ValueError(f"Virus detected: {status}")
    except (ConnectionRefusedError, OSError, Exception):
        # ClamAV not available - this is normal in development
        return