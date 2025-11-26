
import asyncio
from playwright.async_api import async_playwright
import argparse

async def main(test_case, url):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Load the local HTML file
        await page.goto(url)
        await page.wait_for_selector('#midi-input')

        # --- Test Case: Square Wave Smoothing ---
        if test_case == 'square-wave-smoothing':
            # 1. Open the main settings panel
            await page.locator("#btn-settings").click()
            await page.wait_for_selector("#settings-panel.open", state="visible")

            # 2. Set smoothing to a medium value
            await page.locator("#ovl-smooth-slider").fill("15")

            # 3. Close the settings panel and wait for it to be hidden
            await page.locator("#btn-settings").click()
            await page.wait_for_selector("#settings-panel", state="hidden")

            # 4. Enable Big CC mode for a specific CC AND trigger the UI update
            await page.evaluate('() => { bigCCs.add("0-1"); document.getElementById("big-cc-controls").style.display = "flex"; }')

            # 5. Wait for the Big CC controls to appear and set scale to 100%
            await page.wait_for_selector("#big-cc-scale-slider", state="visible")
            await page.locator("#big-cc-scale-slider").fill("1")

            # 6. Enable the grid
            await page.locator("#chk-cc-grid").check()

            # 7. Inject a square wave CC signal
            await page.evaluate("""
                () => {
                    let val = 0;
                    setInterval(() => {
                        handleCC(0, 1, val);
                        val = (val === 0) ? 127 : 0;
                    }, 500);
                }
            """)

            # 8. Wait for the animation to render
            await page.wait_for_timeout(2000)

        # Take a screenshot for verification
        screenshot_path = 'verification/verification.png'
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        await browser.close()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--test-case', type=str, required=True, help='The test case to run.')
    parser.add_argument('--url', type=str, required=True, help='The URL of the HTML file to test.')
    args = parser.parse_args()
    asyncio.run(main(args.test_case, args.url))
