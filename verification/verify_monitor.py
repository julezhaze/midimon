import os
import time
from playwright.sync_api import sync_playwright

def verify_monitor():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Open file
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/MIDI_Monitor_Final16.html")

        # Wait for init
        time.sleep(1)

        # 1. Verify SPLIT Button exists
        split_btn = page.locator("#btn-toggle-split")
        if not split_btn.is_visible():
            print("SPLIT button not found")
            return

        # 2. Click SPLIT Button
        split_btn.click()
        time.sleep(0.5)

        # 3. Open Settings
        page.locator("#btn-settings").click()
        time.sleep(0.5)

        # 4. Verify Split Channel Filters
        split_filters = page.locator("#ch-filter-container-split")
        if not split_filters.is_visible():
            print("Split Channel Filters not visible")
            return

        # 5. Check Font Sizing linkage
        # Change UI Size slider
        page.locator("#font-size-slider").fill("20")
        page.locator("#font-size-slider").dispatch_event("input")
        time.sleep(0.5)

        # Check if channel label size changed (heuristic check via screenshot)

        # 6. Verify CC Graph Window logic (by screenshot, hard to assert dynamic canvas)

        # Take Screenshot
        page.screenshot(path="verification/monitor_verified.png")
        print("Verification complete, screenshot saved.")

        browser.close()

if __name__ == "__main__":
    verify_monitor()
