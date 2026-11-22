import asyncio
import os
from playwright.async_api import async_playwright
from pypdf import PdfReader

async def generate():
    html_path = r"C:\InternProject\bytherix-eam\Bytherix_EAM_Daily_Progress_Report_Nov20.html"
    dest1 = r"C:\InternProject\bytherix-eam\Bytherix_EAM_Daily_Progress_Report_Nov20.pdf"
    dest2 = r"C:\Users\asus\OneDrive\Desktop\Bytherix_EAM_Daily_Progress_Report_Nov20.pdf"
    dest3 = r"C:\Users\asus\.gemini\antigravity\brain\2435dc4f-1042-437e-befd-903d974b9a53\Bytherix_EAM_Daily_Progress_Report_Nov20.pdf"

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto(f"file:///{html_path.replace('\\', '/')}")
        await page.wait_for_load_state("networkidle")

        pdf_bytes = await page.pdf(
            format="A4",
            print_background=True,
            margin={"top": "1.1cm", "bottom": "1.1cm", "left": "1.3cm", "right": "1.3cm"}
        )

        for path in [dest1, dest2, dest3]:
            try:
                os.makedirs(os.path.dirname(path), exist_ok=True)
                with open(path, "wb") as f:
                    f.write(pdf_bytes)
                print(f"Saved: {path} ({len(pdf_bytes)} bytes)")
            except Exception as e:
                print(f"Error saving {path}: {e}")

        await browser.close()

    # Verify exact page count
    reader = PdfReader(dest1)
    pages = len(reader.pages)
    print(f"=== PDF Page Count: {pages} pages ===")
    assert pages == 2, f"Expected exactly 2 pages, got {pages}"

if __name__ == "__main__":
    asyncio.run(generate())
