import subprocess
import sys
import os

def test_docker_staging_preflight_validator():
    """Verify that scripts/verify_docker_staging.py passes with 100% valid checks."""
    script_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts", "verify_docker_staging.py")
    res = subprocess.run([sys.executable, script_path], capture_output=True, text=True)
    assert res.returncode == 0
    assert "DOCKER COMPOSE & STAGING CONFIGURATION 100% VALID" in res.stdout
