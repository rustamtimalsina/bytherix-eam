from fastapi.testclient import TestClient


def test_mlops_model_registry_and_deployment_lifecycle(client: TestClient):
    """
    Test Phase 8 / Section 9 MLOps Model Registry:
    1. Default model seeding and listing.
    2. Model registration.
    3. Version creation with SHA-256 checksums and parameter schemas.
    4. Lifecycle stage promotion: draft -> staging -> production.
    5. Production version swapping (auto-demote previous production version).
    6. Rollback workflow (Section 9.5).
    7. Prediction serving with latency & token telemetry (Section 9.3).
    8. Tenant isolation between two organizations.
    """
    # 1. Sign up Org Alpha Owner
    signup_a = {
        "email": "mlops_admin@bytherix.com",
        "password": "Password123!",
        "full_name": "MLOps Admin",
        "organization_name": "Alpha AI Labs"
    }
    resp_a = client.post("/api/v1/auth/signup", json=signup_a)
    assert resp_a.status_code == 201
    token_a = resp_a.json()["access_token"]
    org_a = resp_a.json()["organization_id"]
    headers_a = {"Authorization": f"Bearer {token_a}", "X-Organization-Id": org_a}

    # 2. List models (triggers seeding of 3 standard models)
    models_resp = client.get("/api/v1/models", headers=headers_a)
    assert models_resp.status_code == 200
    models_list = models_resp.json()
    assert len(models_list) >= 3
    model_names = [m["name"] for m in models_list]
    assert "gpt-4o-enterprise" in model_names
    assert "gpt-4o-mini-fast" in model_names
    assert "bytherix-embed-v1" in model_names

    # 3. Register a custom fine-tuned model
    reg_payload = {
        "name": "customer-support-llama3",
        "description": "Fine-tuned 8B parameter model specialized in enterprise support ticket resolution",
        "task_type": "text-generation"
    }
    create_resp = client.post("/api/v1/models", json=reg_payload, headers=headers_a)
    assert create_resp.status_code == 201
    model_data = create_resp.json()
    model_id = model_data["id"]
    assert model_data["name"] == "customer-support-llama3"

    # 4. Create version v1.0.0 (starts in draft)
    v1_payload = {
        "version": "v1.0.0",
        "parameters": "{\"temperature\": 0.3, \"max_tokens\": 2048}",
        "accuracy_score": 0.89,
        "latency_p95_ms": 110.0,
        "training_data_ref": "s3://bytherix-datasets/support-v1.jsonl"
    }
    v1_resp = client.post(f"/api/v1/models/{model_id}/versions", json=v1_payload, headers=headers_a)
    assert v1_resp.status_code == 201
    v1_data = v1_resp.json()
    v1_id = v1_data["id"]
    assert v1_data["version"] == "v1.0.0"
    assert v1_data["lifecycle_stage"] == "draft"
    assert len(v1_data["artifact_checksum"]) == 64  # valid SHA-256

    # 5. Promote v1.0.0 to staging, then to production
    promo_staging = client.post(
        f"/api/v1/models/versions/{v1_id}/promote",
        json={"target_stage": "staging"},
        headers=headers_a
    )
    assert promo_staging.status_code == 200
    assert promo_staging.json()["lifecycle_stage"] == "staging"

    promo_prod = client.post(
        f"/api/v1/models/versions/{v1_id}/promote",
        json={"target_stage": "production"},
        headers=headers_a
    )
    assert promo_prod.status_code == 200
    assert promo_prod.json()["lifecycle_stage"] == "production"
    assert promo_prod.json()["promoted_by"] == "mlops_admin@bytherix.com"

    # Verify model now has active_version_id pointing to v1_id
    detail_resp = client.get(f"/api/v1/models/{model_id}", headers=headers_a)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["active_version_id"] == v1_id

    # 6. Create v1.1.0 with higher accuracy and promote to production
    v2_payload = {
        "version": "v1.1.0",
        "parameters": "{\"temperature\": 0.2, \"max_tokens\": 4096}",
        "accuracy_score": 0.94,
        "latency_p95_ms": 95.0,
        "training_data_ref": "s3://bytherix-datasets/support-v2.jsonl"
    }
    v2_resp = client.post(f"/api/v1/models/{model_id}/versions", json=v2_payload, headers=headers_a)
    assert v2_resp.status_code == 201
    v2_id = v2_resp.json()["id"]

    client.post(
        f"/api/v1/models/versions/{v2_id}/promote",
        json={"target_stage": "production"},
        headers=headers_a
    )

    # v2_id is now production, v1_id must have been demoted to staging
    model_after_v2 = client.get(f"/api/v1/models/{model_id}", headers=headers_a).json()
    assert model_after_v2["active_version_id"] == v2_id
    versions_map = {v["id"]: v["lifecycle_stage"] for v in model_after_v2["versions"]}
    assert versions_map[v2_id] == "production"
    assert versions_map[v1_id] == "staging"

    # 7. Rollback to v1.0.0 (Section 9.5)
    rollback_resp = client.post(
        f"/api/v1/models/{model_id}/rollback/{v1_id}",
        headers=headers_a
    )
    assert rollback_resp.status_code == 200
    assert rollback_resp.json()["id"] == v1_id
    assert rollback_resp.json()["lifecycle_stage"] == "production"

    model_after_rollback = client.get(f"/api/v1/models/{model_id}", headers=headers_a).json()
    assert model_after_rollback["active_version_id"] == v1_id

    # 8. Run Prediction against model (Section 9.3)
    pred_resp = client.post(
        f"/api/v1/models/{model_data['name']}/predict",
        json={"prompt": "Resolve customer billing inquiry for invoice #9204"},
        headers=headers_a
    )
    assert pred_resp.status_code == 200
    pred_data = pred_resp.json()
    assert pred_data["model_name"] == "customer-support-llama3"
    assert pred_data["version"] == "v1.0.0"
    assert pred_data["tokens_consumed"] > 0
    assert pred_data["latency_ms"] > 0
    assert "Bytherix MLOps Prediction Engine" in pred_data["prediction"]

    # 9. Verify Tenant Isolation (Org Beta cannot view custom model from Org Alpha)
    signup_b = {
        "email": "beta_user@bytherix.com",
        "password": "Password123!",
        "full_name": "Beta User",
        "organization_name": "Beta Research"
    }
    resp_b = client.post("/api/v1/auth/signup", json=signup_b)
    token_b = resp_b.json()["access_token"]
    org_b = resp_b.json()["organization_id"]
    headers_b = {"Authorization": f"Bearer {token_b}", "X-Organization-Id": org_b}

    beta_models = client.get("/api/v1/models", headers=headers_b).json()
    beta_names = [m["name"] for m in beta_models]
    assert "customer-support-llama3" not in beta_names

    # Beta querying Alpha model returns 404
    foreign_get = client.get(f"/api/v1/models/{model_id}", headers=headers_b)
    assert foreign_get.status_code == 404
