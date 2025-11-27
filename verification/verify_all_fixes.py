
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            # Load the application
            await page.goto('file:///app/MIDI_Monitor_Final8.html')
            await page.wait_for_selector('#midi-input')

            # --- 1. Verify Channel Filtering ---
            print("Verifying Channel Filtering...")
            await page.click('#btn-settings')
            await page.wait_for_selector('#settings-panel.open')
            # Disable channel 1 for both notes and CC
            await page.uncheck('#ch-filter-container-notes-mask-0')
            await page.uncheck('#ch-filter-container-cc-mask-0')

            # Simulate MIDI messages on channel 1 (should be ignored)
            await page.evaluate('''() => {
                window.handleMsg({ data: [0x90, 60, 100] }); // Note On Ch 1
                window.handleMsg({ data: [0x80, 60, 0] });   // Note Off Ch 1
                window.handleMsg({ data: [0xB0, 74, 127] }); // CC Ch 1
            }''')
            await asyncio.sleep(0.5) # Wait for UI to update

            # Check that no notes or CC widgets were created
            falling_notes_count = await page.evaluate('() => fallingObjects.filter(o => o.type === "note").length')
            cc_widget_count = await page.locator('#cc-container .cc-widget').count()

            if falling_notes_count == 0 and cc_widget_count == 0:
                print("  - Channel filtering successful.")
            else:
                print(f"  - Channel filtering FAILED. Notes: {falling_notes_count}, CCs: {cc_widget_count}")

            # Re-enable channel for next steps
            await page.check('#ch-filter-container-notes-mask-0')
            await page.check('#ch-filter-container-cc-mask-0')
            await page.click('#btn-settings') # Close settings


            # --- 2. Verify CC Grid Orientation ---
            print("Verifying CC Grid Orientation...")
            # Create a CC widget
            await page.evaluate('() => { window.handleMsg({ data: [0xB0, 74, 127] }); }')
            await page.wait_for_selector('.cc-widget')

            # Drag the CC widget to the main canvas to activate Big CC mode
            await page.drag_and_drop('.cc-widget', '#visualizer-container')
            await page.wait_for_selector('#big-cc-controls', state='visible')

            # Enable the grid
            await page.check('#chk-cc-grid')

            # Screenshot of the default vertical grid
            await page.screenshot(path='verification/vertical_grid_correct.png')
            print("  - Screenshot captured for vertical grid.")

            # Switch to horizontal mode
            await page.click('#btn-settings')
            await page.wait_for_selector('#settings-panel.open')
            await page.select_option('#sel-direction', 'right')
            await page.click('#btn-settings') # Close settings
            await asyncio.sleep(0.5)

            # Screenshot of the horizontal grid
            await page.screenshot(path='verification/horizontal_grid_correct.png')
            print("  - Screenshot captured for horizontal grid.")


            # --- 3. Verify CC Controls in Bottom Layout ---
            print("Verifying CC Controls in Bottom Layout...")
            await page.click('#btn-settings')
            await page.wait_for_selector('#settings-panel.open')
            await page.select_option('#sel-sidebar-pos', 'bottom')
            await page.click('#btn-settings') # Close settings
            await asyncio.sleep(0.5)

            # Screenshot of the bottom layout
            await page.screenshot(path='verification/bottom_layout_correct.png')
            print("  - Screenshot captured for bottom layout.")

            print("\nVerification script finished. Check the screenshots in the 'verification' folder.")

        except Exception as e:
            print(f"An error occurred: {e}")
        finally:
            await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
