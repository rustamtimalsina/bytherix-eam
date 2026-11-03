import json
from typing import Optional

def generate_branded_swagger_html(
    openapi_url: str = "/api/v1/openapi.json",
    title: str = "Bytherix EAM — Enterprise Developer API Portal",
    redoc_url: str = "/api/v1/redoc",
    frontend_url: str = "http://localhost:3000"
) -> str:
    """
    Renders an ultra-modern, custom-branded Developer API Portal for Bytherix EAM
    featuring the Neural-Orbital emblem, deep obsidian cyber styling, and interactive quickstarts.
    """
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {{
      --bg-base: #060911;
      --bg-surface: #0c121e;
      --bg-card: #121927;
      --bg-card-hover: #172134;
      --border-subtle: rgba(255, 255, 255, 0.08);
      --border-focus: rgba(99, 102, 241, 0.4);
      --accent-violet: #6366f1;
      --accent-indigo: #4f46e5;
      --accent-cyan: #06b6d4;
      --accent-emerald: #10b981;
      --accent-amber: #f59e0b;
      --accent-rose: #f43f5e;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    body {{
      background-color: var(--bg-base);
      color: var(--text-main);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }}

    /* Top Brand Navigation Header */
    .bytherix-topbar {{
      position: sticky;
      top: 0;
      z-index: 1000;
      background: rgba(6, 9, 17, 0.88);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border-subtle);
      padding: 0.875rem 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }}

    .bytherix-brand {{
      display: flex;
      align-items: center;
      gap: 0.875rem;
      text-decoration: none;
      color: inherit;
    }}

    .brand-logo-wrap {{
      position: relative;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 30% 30%, #4338ca 0%, #1e1b4b 100%);
      border-radius: 10px;
      border: 1px solid rgba(129, 140, 248, 0.35);
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
    }}

    .brand-title-wrap {{
      display: flex;
      flex-direction: column;
    }}

    .brand-name {{
      font-size: 1.125rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #ffffff 40%, #a5b4fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1.2;
    }}

    .brand-subtitle {{
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #818cf8;
    }}

    .topbar-actions {{
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }}

    .badge-status {{
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
    }}

    .badge-dot {{
      width: 6px;
      height: 6px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 8px #10b981;
    }}

    .nav-btn {{
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.4rem 0.85rem;
      border-radius: 8px;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
    }}

    .nav-btn-ghost {{
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
    }}

    .nav-btn-ghost:hover {{
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.2);
    }}

    .nav-btn-primary {{
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: #ffffff;
      border: 1px solid rgba(165, 180, 252, 0.3);
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.25);
    }}

    .nav-btn-primary:hover {{
      opacity: 0.92;
      transform: translateY(-1px);
    }}

    /* Hero Banner */
    .portal-hero {{
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem 2rem 1rem 2rem;
      width: 100%;
    }}

    .hero-card {{
      background: linear-gradient(135deg, rgba(30, 27, 75, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 16px;
      padding: 1.5rem 2rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }}

    .hero-info h1 {{
      font-size: 1.5rem;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.02em;
      margin-bottom: 0.35rem;
    }}

    .hero-info p {{
      font-size: 0.8125rem;
      color: var(--text-muted);
      max-width: 700px;
      line-height: 1.5;
    }}

    .hero-badges {{
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }}

    .spec-pill {{
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      font-size: 0.6875rem;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      color: #cbd5e1;
    }}

    /* Swagger UI Overrides for Dark Cyber Enterprise Aesthetic */
    .swagger-ui {{
      max-width: 1400px;
      margin: 0 auto;
      padding: 1rem 2rem 4rem 2rem;
      color: var(--text-muted);
      font-family: inherit;
    }}

    /* Hide default swagger topbar */
    .swagger-ui .topbar {{
      display: none !important;
    }}

    .swagger-ui .info {{
      margin: 1.5rem 0 !important;
    }}

    .swagger-ui .info .title {{
      color: #ffffff !important;
      font-family: inherit !important;
      font-weight: 800 !important;
      letter-spacing: -0.02em !important;
    }}

    .swagger-ui .info p, .swagger-ui .info li, .swagger-ui .info table {{
      color: var(--text-muted) !important;
      font-size: 0.875rem !important;
      line-height: 1.6 !important;
    }}

    .swagger-ui .info a {{
      color: #818cf8 !important;
    }}

    .swagger-ui .scheme-container {{
      background: var(--bg-surface) !important;
      border: 1px solid var(--border-subtle) !important;
      border-radius: 12px !important;
      box-shadow: none !important;
      padding: 1rem 1.5rem !important;
      margin-bottom: 2rem !important;
    }}

    .swagger-ui .scheme-container .schemes-title {{
      color: #ffffff !important;
    }}

    .swagger-ui .auth-wrapper {{
      display: flex;
      justify-content: flex-end;
    }}

    .swagger-ui .btn.authorize {{
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
      border: 1px solid rgba(165, 180, 252, 0.4) !important;
      color: #ffffff !important;
      border-radius: 8px !important;
      font-weight: 700 !important;
      font-size: 0.8125rem !important;
      padding: 0.5rem 1.25rem !important;
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.3) !important;
      transition: all 0.2s ease !important;
    }}

    .swagger-ui .btn.authorize svg {{
      fill: #ffffff !important;
    }}

    .swagger-ui .opblock-tag-section {{
      margin-bottom: 1.75rem;
    }}

    .swagger-ui .opblock-tag {{
      color: #ffffff !important;
      font-family: inherit !important;
      font-size: 1.125rem !important;
      font-weight: 700 !important;
      border-bottom: 1px solid var(--border-subtle) !important;
      padding-bottom: 0.75rem !important;
      margin-bottom: 1rem !important;
    }}

    .swagger-ui .opblock-tag small {{
      color: var(--text-muted) !important;
      font-size: 0.75rem !important;
    }}

    .swagger-ui .opblock {{
      background: var(--bg-card) !important;
      border: 1px solid var(--border-subtle) !important;
      border-radius: 12px !important;
      margin: 0 0 0.875rem 0 !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
      overflow: hidden;
      transition: border-color 0.2s ease;
    }}

    .swagger-ui .opblock:hover {{
      border-color: rgba(99, 102, 241, 0.35) !important;
    }}

    .swagger-ui .opblock-summary {{
      padding: 0.75rem 1rem !important;
    }}

    .swagger-ui .opblock .opblock-summary-method {{
      font-family: 'JetBrains Mono', monospace !important;
      font-weight: 700 !important;
      font-size: 0.75rem !important;
      border-radius: 6px !important;
      min-width: 75px !important;
      text-align: center !important;
      text-shadow: none !important;
    }}

    .swagger-ui .opblock.opblock-get .opblock-summary-method {{
      background: #0284c7 !important;
      color: #ffffff !important;
    }}

    .swagger-ui .opblock.opblock-post .opblock-summary-method {{
      background: #7c3aed !important;
      color: #ffffff !important;
    }}

    .swagger-ui .opblock.opblock-delete .opblock-summary-method {{
      background: #e11d48 !important;
      color: #ffffff !important;
    }}

    .swagger-ui .opblock.opblock-patch .opblock-summary-method {{
      background: #d97706 !important;
      color: #ffffff !important;
    }}

    .swagger-ui .opblock .opblock-summary-path {{
      color: #f1f5f9 !important;
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 0.8125rem !important;
      font-weight: 600 !important;
    }}

    .swagger-ui .opblock .opblock-summary-description {{
      color: var(--text-muted) !important;
      font-size: 0.75rem !important;
    }}

    .swagger-ui .opblock-body {{
      background: var(--bg-surface) !important;
      border-top: 1px solid var(--border-subtle) !important;
      padding: 1.25rem !important;
    }}

    .swagger-ui table thead tr th, .swagger-ui table thead tr td {{
      color: #e2e8f0 !important;
      border-bottom: 1px solid var(--border-subtle) !important;
      font-size: 0.75rem !important;
    }}

    .swagger-ui .parameter__name {{
      color: #f8fafc !important;
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 0.75rem !important;
    }}

    .swagger-ui .parameter__type {{
      color: #818cf8 !important;
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 0.6875rem !important;
    }}

    .swagger-ui input[type="text"], .swagger-ui textarea, .swagger-ui select {{
      background: #080d16 !important;
      border: 1px solid var(--border-subtle) !important;
      color: #ffffff !important;
      border-radius: 6px !important;
      font-family: 'JetBrains Mono', monospace !important;
      padding: 0.4rem 0.6rem !important;
    }}

    .swagger-ui input[type="text"]:focus, .swagger-ui textarea:focus {{
      border-color: var(--accent-violet) !important;
      outline: none !important;
    }}

    .swagger-ui .btn.execute {{
      background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
      border: 1px solid rgba(52, 211, 153, 0.4) !important;
      color: #ffffff !important;
      border-radius: 8px !important;
      font-weight: 700 !important;
      box-shadow: 0 0 15px rgba(16, 185, 129, 0.3) !important;
    }}

    .swagger-ui .responses-inner h4, .swagger-ui .responses-inner h5 {{
      color: #f8fafc !important;
    }}

    .swagger-ui .response-col_status {{
      color: #38bdf8 !important;
      font-family: 'JetBrains Mono', monospace !important;
      font-weight: 700 !important;
    }}

    .swagger-ui .highlight-code, .swagger-ui .microlight {{
      background: #060911 !important;
      border: 1px solid var(--border-subtle) !important;
      border-radius: 8px !important;
      color: #e2e8f0 !important;
      font-family: 'JetBrains Mono', monospace !important;
    }}

    .swagger-ui .model-box {{
      background: var(--bg-surface) !important;
    }}

    .swagger-ui .model-title {{
      color: #e2e8f0 !important;
    }}

    .swagger-ui section.models {{
      border: 1px solid var(--border-subtle) !important;
      border-radius: 12px !important;
      background: var(--bg-card) !important;
    }}

    .swagger-ui section.models h4 {{
      color: #ffffff !important;
    }}

    /* Modal Styling */
    .swagger-ui .dialog-ux .modal-ux {{
      background: var(--bg-card) !important;
      border: 1px solid rgba(99, 102, 241, 0.3) !important;
      border-radius: 16px !important;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8) !important;
    }}

    .swagger-ui .dialog-ux .modal-ux-header h3 {{
      color: #ffffff !important;
    }}

    .swagger-ui .dialog-ux .modal-ux-content {{
      color: var(--text-muted) !important;
    }}
  </style>
</head>
<body>
  <!-- Bytherix Top Navigation Bar -->
  <header class="bytherix-topbar">
    <a href="{frontend_url}" class="bytherix-brand">
      <div class="brand-logo-wrap">
        <!-- Handcrafted Neural-Orbital 'B' SVG -->
        <svg width="22" height="22" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="32" cy="32" rx="28" ry="12" stroke="#6366f1" stroke-width="2.5" transform="rotate(-32 32 32)" stroke-dasharray="3 3" opacity="0.65"/>
          <path d="M20 12H34C40.6274 12 46 17.3726 46 24C46 29.5 42.2 34.1 37 35.5C43.2 37.1 48 42.8 48 49.5C48 56.4036 42.4036 62 35.5 62H20V12Z" fill="url(#brandGrad)" />
          <polygon points="32,24 38,28 38,36 32,40 26,36 26,28" fill="#38bdf8" />
          <circle cx="32" cy="32" r="3" fill="#ffffff" />
          <defs>
            <linearGradient id="brandGrad" x1="20" y1="12" x2="48" y2="62" gradientUnits="userSpaceOnUse">
              <stop stop-color="#818cf8"/>
              <stop offset="0.5" stop-color="#6366f1"/>
              <stop offset="1" stop-color="#4338ca"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div class="brand-title-wrap">
        <span class="brand-name">Bytherix EAM</span>
        <span class="brand-subtitle">Developer API Portal</span>
      </div>
    </a>

    <div class="topbar-actions">
      <div class="badge-status">
        <span class="badge-dot"></span>
        <span>OpenAPI 3.1 • v1.0.0</span>
      </div>
      <a href="{redoc_url}" class="nav-btn nav-btn-ghost">ReDoc Specification</a>
      <a href="{openapi_url}" target="_blank" class="nav-btn nav-btn-ghost">Raw JSON</a>
      <a href="{frontend_url}" class="nav-btn nav-btn-primary">Back to App Console</a>
    </div>
  </header>

  <!-- Hero Portal Banner -->
  <section class="portal-hero">
    <div class="hero-card">
      <div class="hero-info">
        <h1>Enterprise AI Management API Catalogue</h1>
        <p>
          High-performance REST & Server-Sent Events (SSE) interfaces powering Bytherix EAM.
          Supports dual authentication via <code>Authorization: Bearer &lt;jwt&gt;</code> or <code>X-API-Key: bx_live_...</code>.
        </p>
      </div>
      <div class="hero-badges">
        <span class="spec-pill">🛡️ DLP Shield Active</span>
        <span class="spec-pill">⚖️ RAG Triad Audited</span>
        <span class="spec-pill">⚡ pgvector (1536d)</span>
        <span class="spec-pill">⏱️ Sliding Rate Limits</span>
      </div>
    </div>
  </section>

  <!-- Swagger UI Mount Point -->
  <div id="swagger-ui"></div>

  <!-- Swagger UI Scripts -->
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {{
      const ui = SwaggerUIBundle({{
        url: "{openapi_url}",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "BaseLayout",
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: "list",
        filter: true,
        tryItOutEnabled: true,
        syntaxHighlight: {{
          activated: true,
          theme: "monokai"
        }}
      }});
      window.ui = ui;
    }};
  </script>
</body>
</html>
"""
