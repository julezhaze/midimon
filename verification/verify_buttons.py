
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        repo_path = "/app"
        file_url = f"file://{repo_path}/MIDI_Monitor_Final8.html"
        await page.goto(file_url)

        # Wait for the main UI to load
        await page.wait_for_selector('#midi-input')

        # 1. Toggle the CC button off and take a screenshot
        await page.locator("#btn-toggle-cc").click()
        await page.screenshot(path="verification/cc_off.png")

        # 2. Toggle the PGM button off and take a screenshot
        await page.locator("#btn-toggle-pgm").click()
        await page.screenshot(path="verification/pgm_off.png")

        # 3. Toggle the CC button back on and take a screenshot
        await page.locator("#btn-toggle-cc").click()
        await page.screenshot(path="verification/cc_on.png")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
