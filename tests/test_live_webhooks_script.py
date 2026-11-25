import subprocess
import sys
import os

def test_live_webhooks_script_execution():
    """Verify that scripts/test_live_webhooks.py executes cleanly with exit code 0."""
    script_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts", "test_live_webhooks.py")
    res = subprocess.run([sys.executable, script_path], capture_output=True, text=True)
    assert res.returncode == 0
    assert "ALL WEBHOOK TESTS & HMAC VERIFICATIONS PASSED (100%)" in res.stdout
