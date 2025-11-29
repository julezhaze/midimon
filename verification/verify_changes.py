import os
import time
from playwright.sync_api import sync_playwright

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load local HTML
        file_path = os.path.abspath("MIDI_Monitor_Final18.html")
        page.goto(f"file://{file_path}")

        # 1. Open Settings
        page.click("#btn-settings")
        time.sleep(0.5)

        # 2. Check for New Controls
        page.screenshot(path="verification/settings_screenshot.png")
        print("Settings screenshot taken")

        # Verify "NOTES ON TOP" checkbox exists
        chk_notes = page.query_selector("#chk-notes-top")
        if chk_notes:
            print("FOUND: Notes on Top checkbox")
        else:
            print("MISSING: Notes on Top checkbox")

        # Verify "CC BORDERS" checkbox exists
        chk_borders = page.query_selector("#chk-cc-borders")
        if chk_borders:
            print("FOUND: CC Borders checkbox")
        else:
            print("MISSING: CC Borders checkbox")

        # 3. Enable Split Mode and Check
        page.click("#btn-toggle-split")
        time.sleep(0.5)
        page.screenshot(path="verification/split_screenshot.png")

        browser.close()

if __name__ == "__main__":
    verify_changes()
