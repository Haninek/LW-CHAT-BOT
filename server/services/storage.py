import boto3, hashlib, mimetypes, io
from botocore.client import Config
from ..core.config import get_settings

S = get_settings()
_s3 = boto3.client(
    "s3",
    region_name=S.AWS_REGION,
    aws_access_key_id=S.AWS_ACCESS_KEY_ID or None,
    aws_secret_access_key=S.AWS_SECRET_ACCESS_KEY or None,
    config=Config(signature_version="s3v4"),
)

def sha256_bytes(b: bytes) -> str:
    h = hashlib.sha256(); h.update(b); return h.hexdigest()

def upload_private_bytes(data: bytes, key: str, content_type: str = "application/octet-stream"):
    _s3.put_object(Bucket=S.S3_BUCKET, Key=key, Body=data, ContentType=content_type, ACL="private")
    return {"bucket": S.S3_BUCKET, "key": key, "sha256": sha256_bytes(data)}

def presigned_get(key: str, expires_sec: int = 3600) -> str:
    return _s3.generate_presigned_url("get_object", Params={"Bucket": S.S3_BUCKET, "Key": key}, ExpiresIn=expires_sec)