import io
import os
from typing import BinaryIO
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import settings


class ObjectStorageService:
    """Private S3-compatible object storage service (Section 4.2 & 12.1)."""

    def __init__(self):
        self.bucket = settings.S3_BUCKET_NAME
        self.endpoint_url = settings.S3_ENDPOINT_URL
        self._s3_client = None

    @property
    def client(self):
        if settings.APP_ENV == "test":
            return None
        if self._s3_client is None:
            try:
                s3 = boto3.client(
                    "s3",
                    endpoint_url=self.endpoint_url if self.endpoint_url else None,
                    aws_access_key_id=settings.S3_ACCESS_KEY,
                    aws_secret_access_key=settings.S3_SECRET_KEY,
                    region_name=settings.S3_REGION,
                    config=Config(
                        signature_version="s3v4",
                        connect_timeout=1,
                        read_timeout=1,
                        retries={"max_attempts": 1}
                    )
                )
                s3.list_buckets()
                self._s3_client = s3
                self._ensure_bucket()
            except Exception:
                self._s3_client = False
        return self._s3_client if self._s3_client is not False else None

    def _ensure_bucket(self):
        if not self._s3_client or self._s3_client is False:
            return
        try:
            self._s3_client.head_bucket(Bucket=self.bucket)
        except Exception:
            try:
                self._s3_client.create_bucket(Bucket=self.bucket)
            except Exception:
                pass

    def upload_file(self, file_obj: BinaryIO, object_key: str, content_type: str = "application/pdf") -> str:
        """Upload a file stream to private S3-compatible storage or local storage."""
        if settings.APP_ENV == "test" or not self.client:
            local_dir = os.path.join("storage", "documents", os.path.dirname(object_key))
            os.makedirs(local_dir, exist_ok=True)
            local_path = os.path.join("storage", "documents", object_key)
            file_obj.seek(0)
            with open(local_path, "wb") as f:
                f.write(file_obj.read())
            return object_key

        try:
            self.client.upload_fileobj(
                file_obj,
                self.bucket,
                object_key,
                ExtraArgs={"ContentType": content_type}
            )
            return object_key
        except Exception:
            local_dir = os.path.join("storage", "documents", os.path.dirname(object_key))
            os.makedirs(local_dir, exist_ok=True)
            local_path = os.path.join("storage", "documents", object_key)
            file_obj.seek(0)
            with open(local_path, "wb") as f:
                f.write(file_obj.read())
            return object_key

    def download_file(self, object_key: str) -> bytes:
        """Download file content from object storage or local fallback."""
        if settings.APP_ENV == "test" or not self.client:
            local_path = os.path.join("storage", "documents", object_key)
            if os.path.exists(local_path):
                with open(local_path, "rb") as f:
                    return f.read()
            raise FileNotFoundError(f"Object {object_key} not found in storage")

        try:
            buffer = io.BytesIO()
            self.client.download_fileobj(self.bucket, object_key, buffer)
            buffer.seek(0)
            return buffer.read()
        except Exception:
            local_path = os.path.join("storage", "documents", object_key)
            if os.path.exists(local_path):
                with open(local_path, "rb") as f:
                    return f.read()
            raise FileNotFoundError(f"Object {object_key} not found in storage")

    def delete_file(self, object_key: str) -> bool:
        """Delete file from storage."""
        try:
            self.client.delete_object(Bucket=self.bucket, Key=object_key)
        except Exception:
            local_path = os.path.join("storage", "documents", object_key)
            if os.path.exists(local_path):
                os.remove(local_path)
        return True


storage_service = ObjectStorageService()
