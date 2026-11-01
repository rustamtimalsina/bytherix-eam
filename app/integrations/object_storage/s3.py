import io
import os
from typing import BinaryIO, Optional, Tuple, Dict, Any
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import settings


class ObjectStorageService:
    """
    Enterprise S3 & MinIO Object Storage Service (Section 8.1 & 14).
    Supports secure time-limited pre-signed URLs, multi-part streaming,
    and automatic local filesystem fallback for development/testing environments.
    """

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

    def get_storage_provider(self) -> str:
        """Identify active storage provider: 'minio', 's3', or 'local'."""
        if not self.client:
            return "local"
        endpoint = (self.endpoint_url or "").lower()
        if "localhost" in endpoint or "127.0.0.1" in endpoint or "minio" in endpoint:
            return "minio"
        return "s3"

    def upload_file(self, file_obj: BinaryIO, object_key: str, content_type: str = "application/pdf") -> str:
        """Upload a file stream to S3/MinIO bucket or local filesystem fallback."""
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

    def get_file_stream(self, object_key: str) -> Tuple[BinaryIO, int]:
        """
        Stream file content from object storage or local disk without high memory overhead.
        Returns: (stream, content_length)
        """
        if self.client:
            try:
                response = self.client.get_object(Bucket=self.bucket, Key=object_key)
                return response["Body"], response.get("ContentLength", 0)
            except Exception:
                pass

        local_path = os.path.join("storage", "documents", object_key)
        if os.path.exists(local_path):
            size = os.path.getsize(local_path)
            return open(local_path, "rb"), size

        raise FileNotFoundError(f"Object {object_key} not found in storage")

    def generate_presigned_download_url(
        self,
        object_key: str,
        filename: Optional[str] = None,
        expires_in: int = 300
    ) -> Optional[str]:
        """
        Generate a time-limited cryptographically signed URL to download or preview the object directly.
        (Section 8.1 & Section 14)
        """
        if not self.client:
            return None

        try:
            params = {
                "Bucket": self.bucket,
                "Key": object_key,
            }
            if filename:
                params["ResponseContentDisposition"] = f'inline; filename="{filename}"'

            url = self.client.generate_presigned_url(
                "get_object",
                Params=params,
                ExpiresIn=expires_in
            )
            return url
        except Exception:
            return None

    def generate_presigned_upload_url(
        self,
        object_key: str,
        content_type: str = "application/pdf",
        expires_in: int = 300
    ) -> Optional[Dict[str, Any]]:
        """
        Generate a pre-signed POST policy for direct client-to-storage uploads (Section 8.1).
        """
        if not self.client:
            return None

        try:
            return self.client.generate_presigned_post(
                Bucket=self.bucket,
                Key=object_key,
                Fields={"Content-Type": content_type},
                Conditions=[
                    {"Content-Type": content_type},
                    ["content-length-range", 1, 50 * 1024 * 1024]  # 50MB max file size
                ],
                ExpiresIn=expires_in
            )
        except Exception:
            return None

    def delete_file(self, object_key: str) -> bool:
        """Delete file from storage."""
        if self.client:
            try:
                self.client.delete_object(Bucket=self.bucket, Key=object_key)
            except Exception:
                pass

        local_path = os.path.join("storage", "documents", object_key)
        if os.path.exists(local_path):
            try:
                os.remove(local_path)
            except OSError:
                pass
        return True


storage_service = ObjectStorageService()
