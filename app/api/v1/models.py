from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.permissions import Permission
from app.core.tenant_context import TenantContext, require_permission
from app.db.session import get_db
from app.schemas.model_registry import (
    ModelRegisterCreate,
    ModelVersionCreate,
    ModelPromoteRequest,
    PredictionRequest,
    PredictionResponse,
    RegisteredModelResponse,
    RegisteredModelSummary,
    ModelVersionResponse,
)
from app.services.model_service import ModelService

router = APIRouter(prefix="/models", tags=["MLOps Model Registry & Deployment"])


@router.get("", response_model=List[RegisteredModelSummary], status_code=status.HTTP_200_OK)
def list_registered_models(
    context: TenantContext = Depends(require_permission(Permission.MODELS_READ)),
    db: Session = Depends(get_db)
):
    """
    List all registered models for the active tenant (Section 9.1 & 16.1 #4).
    """
    return ModelService.list_models(db, context.organization.id)


@router.post("", response_model=RegisteredModelResponse, status_code=status.HTTP_201_CREATED)
def register_new_model(
    payload: ModelRegisterCreate,
    context: TenantContext = Depends(require_permission(Permission.MODELS_REGISTER)),
    db: Session = Depends(get_db)
):
    """
    Register a new model in the catalog (Section 9.2 #1).
    """
    return ModelService.register_model(db, context.organization.id, payload)


@router.get("/{model_id}", response_model=RegisteredModelResponse, status_code=status.HTTP_200_OK)
def get_registered_model(
    model_id: str,
    context: TenantContext = Depends(require_permission(Permission.MODELS_READ)),
    db: Session = Depends(get_db)
):
    """
    Retrieve full model details with complete version lifecycle history.
    """
    return ModelService.get_model(db, model_id, context.organization.id)


@router.post("/{model_id}/versions", response_model=ModelVersionResponse, status_code=status.HTTP_201_CREATED)
def create_model_version(
    model_id: str,
    payload: ModelVersionCreate,
    context: TenantContext = Depends(require_permission(Permission.MODELS_REGISTER)),
    db: Session = Depends(get_db)
):
    """
    Register a new version with artifact checksum & benchmark parameters (Section 9.2 #2-4).
    """
    return ModelService.create_version(db, model_id, context.organization.id, payload)


@router.post("/versions/{version_id}/promote", response_model=ModelVersionResponse, status_code=status.HTTP_200_OK)
def promote_model_version(
    version_id: str,
    payload: ModelPromoteRequest,
    context: TenantContext = Depends(require_permission(Permission.MODELS_PROMOTE)),
    db: Session = Depends(get_db)
):
    """
    Promote model version through lifecycle stages (evaluation -> staging -> production -> archived)
    with authorized audit logging (Section 9.2 #7 & #8).
    """
    user_email = context.user.email if context.user else "admin@bytherix.com"
    return ModelService.promote_version(db, version_id, context.organization.id, payload.target_stage, user_email)


@router.post("/{model_id}/rollback/{target_version_id}", response_model=ModelVersionResponse, status_code=status.HTTP_200_OK)
def rollback_model_version(
    model_id: str,
    target_version_id: str,
    context: TenantContext = Depends(require_permission(Permission.MODELS_ROLLBACK)),
    db: Session = Depends(get_db)
):
    """
    Rollback active production version to a previously approved version (Section 9.5).
    """
    user_email = context.user.email if context.user else "admin@bytherix.com"
    return ModelService.rollback_model(db, model_id, context.organization.id, target_version_id, user_email)


@router.post("/{model_name}/predict", response_model=PredictionResponse, status_code=status.HTTP_200_OK)
def run_model_prediction(
    model_name: str,
    payload: PredictionRequest,
    context: TenantContext = Depends(require_permission(Permission.PREDICTIONS_CALL)),
    db: Session = Depends(get_db)
):
    """
    Execute prediction request against model's active production version or specified version (Section 9.3).
    """
    return ModelService.predict(
        db=db,
        model_name=model_name,
        organization_id=context.organization.id,
        prompt=payload.prompt,
        version_str=payload.version
    )
