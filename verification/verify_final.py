from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load local file
        file_path = os.path.abspath("MIDI_Monitor_Final.html")
        page.goto(f"file://{file_path}")

        # Open Settings Panel
        page.click("#btn-settings")
        page.wait_for_timeout(500) # Wait for animation

        # Check new checkboxes
        # Trails on Grid
        trails_chk = page.locator("#chk-trails-grid")
        if not trails_chk.is_checked():
            trails_chk.click()

        # CRT FX
        crt_chk = page.locator("#chk-crt")
        if not crt_chk.is_checked():
            crt_chk.click()

        # Verify CRT Overlay is displayed
        crt_overlay = page.locator("#crt-overlay")
        assert crt_overlay.is_visible()

        # Wait a bit for scanlines to render (CSS gradient)
        page.wait_for_timeout(500)

        page.screenshot(path="verification/verification_final.png")
        browser.close()

if __name__ == "__main__":
    run()
