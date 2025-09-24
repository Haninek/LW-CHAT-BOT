import pathlib, hashlib
import boto3
from botocore.client import Config
from core.config import get_settings

S = get_settings()

def _sha256(b: bytes) -> str:
    h = hashlib.sha256(); h.update(b); return h.hexdigest()

def upload_private_bytes(data: bytes, key: str, content_type: str = "application/octet-stream"):
    # local fallback in dev
    if S.MOCK_MODE or not (S.AWS_ACCESS_KEY_ID and S.AWS_SECRET_ACCESS_KEY and S.S3_BUCKET):
        base = pathlib.Path("./data/uploads"); base.mkdir(parents=True, exist_ok=True)
        path = base / key.replace("/", "__")
        path.write_bytes(data)
        return {"bucket": "local", "key": str(path), "sha256": _sha256(data)}

    s3 = boto3.client(
        "s3",
        region_name=S.AWS_REGION,
        aws_access_key_id=S.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=S.AWS_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
    )
    s3.put_object(Bucket=S.S3_BUCKET, Key=key, Body=data, ContentType=content_type, ACL="private")
    return {"bucket": S.S3_BUCKET, "key": key, "sha256": _sha256(data)}

def presigned_get(key: str, expires_sec: int = 3600) -> str:
    if S.MOCK_MODE or not (S.AWS_ACCESS_KEY_ID and S.AWS_SECRET_ACCESS_KEY and S.S3_BUCKET):
        # For local storage, return a placeholder URL
        return f"/local/{key}"
    
    s3 = boto3.client(
        "s3",
        region_name=S.AWS_REGION,
        aws_access_key_id=S.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=S.AWS_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
    )
    return s3.generate_presigned_url("get_object", Params={"Bucket": S.S3_BUCKET, "Key": key}, ExpiresIn=expires_sec)