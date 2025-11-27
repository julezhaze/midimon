
import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Listen for all console events and print them
        page.on('console', lambda msg: print(f'BROWSER CONSOLE: {msg.text}'))

        try:
            # Load the application
            await page.goto('file:///app/MIDI_Monitor_Final8.html')
            await page.wait_for_selector('#midi-input')

            print("--- Verifying All New Features ---")

            # --- 1. Verify Note Drawing in Horizontal Mode ---
            print("\n1. Verifying Note Drawing in Horizontal Mode...")
            await page.click('#btn-settings')
            await expect(page.locator('#settings-panel')).to_have_class('open')

            await page.select_option('#sel-direction', 'right')
            await page.click('#btn-settings')
            await expect(page.locator('#settings-panel')).not_to_have_class('open')

            await page.evaluate('''() => {
                window.handleMsg({ data: [0x90, 60, 100] }); // Note On
                setTimeout(() => window.handleMsg({ data: [0x80, 60, 0] }), 500); // Note Off after 500ms
            }''')
            await asyncio.sleep(1) # Wait for note to appear and start moving

            note_pos = await page.evaluate('() => fallingObjects.find(o => o.type === "note")?.pos || 0')
            if note_pos > 0:
                print("  - Note is moving correctly in 'Right' mode.")
            else:
                print("  - FAILED: Note is not moving in 'Right' mode.")
            await page.screenshot(path='verification/01-horizontal-note-drawing.png')


            # --- 2. Verify Advanced CC Graph Scaling ---
            print("\n2. Verifying Advanced CC Graph Scaling...")
            await page.click('#btn-settings')
            await page.screenshot(path='verification/dbg_01_settings_clicked.png')
            await expect(page.locator('#settings-panel')).to_have_class('open')
            await page.screenshot(path='verification/dbg_02_settings_open.png')
            await page.select_option('#sel-direction', 'down') # Reset to default
            await page.screenshot(path='verification/dbg_03_direction_set.png')
            await page.click('#btn-settings')
            await page.screenshot(path='verification/dbg_04_settings_closed.png')
            await expect(page.locator('#settings-panel')).not_to_have_class('open')

            await page.evaluate('() => { window.handleMsg({ data: [0xB0, 74, 64] }); }') # CC value 64
            await page.screenshot(path='verification/dbg_05_cc_sent.png')
            await page.wait_for_selector('.cc-widget', timeout=5000)
            await page.screenshot(path='verification/dbg_06_widget_found.png')
            await page.click('.cc-enlarge-btn')
            await page.screenshot(path='verification/dbg_07_enlarge_clicked.png')
            await page.wait_for_selector('#big-cc-controls', state='visible')
            await page.screenshot(path='verification/dbg_08_controls_visible.png')

            await page.locator('#big-cc-scale-slider').fill("8") # 800%
            await asyncio.sleep(0.5)
            await page.screenshot(path='verification/02-cc-scaling.png')
            print("  - Screenshot captured at 800% scale.")


            # --- 3. Verify Refined CC Layout and Controls ---
            print("\n3. Verifying Refined CC Layout and Controls...")
            await page.screenshot(path='verification/03a-right-sidebar-layout.png')
            print("  - Screenshot of right sidebar layout captured.")

            await page.click('#btn-settings')
            await expect(page.locator('#settings-panel')).to_have_class('open')
            await page.select_option('#sel-sidebar-pos', 'bottom')
            await page.click('#btn-settings')
            await expect(page.locator('#settings-panel')).not_to_have_class('open')
            await asyncio.sleep(0.5)
            await page.screenshot(path='verification/03b-bottom-sidebar-layout.png')
            print("  - Screenshot of bottom sidebar layout captured.")


            # --- 4. Verify Enlarge Button & Velocity Opacity ---
            print("\n4. Verifying Enlarge Button & Velocity Opacity...")
            await page.evaluate('() => { window.handleMsg({ data: [0xB0, 22, 127] }); }') # New CC
            await page.wait_for_selector('.cc-widget[data-id="1-22"]')
            await page.locator('.cc-widget[data-id="1-22"] .cc-enlarge-btn').click()

            big_cc_count = await page.evaluate('() => bigCCs.size')
            if big_cc_count == 2:
                print("  - Enlarge button works correctly.")
            else:
                print(f"  - FAILED: Enlarge button. Count: {big_cc_count}")

            await page.click('#btn-settings')
            await expect(page.locator('#settings-panel')).to_have_class('open')
            await page.check('#chk-vel-opacity')
            await page.click('#btn-settings')
            await expect(page.locator('#settings-panel')).not_to_have_class('open')

            await page.evaluate('() => { window.handleMsg({ data: [0x90, 72, 30] }); }') # Low velocity note
            await asyncio.sleep(0.5)
            await page.screenshot(path='verification/04-velocity-opacity.png')
            print("  - Screenshot of low velocity note with opacity captured.")


            # --- 5. Verify UI Scaling and Smoothing ---
            print("\n5. Verifying UI Scaling and Smoothing...")
            await page.click('#btn-settings')
            await expect(page.locator('#settings-panel')).to_have_class('open')
            await page.check('#chk-cc-grid')
            await page.locator('#lbl-size-slider').fill("24") # Large label size
            await page.locator('#ovl-smooth-slider').fill("100") # Max smoothing
            await page.click('#btn-settings')
            await expect(page.locator('#settings-panel')).not_to_have_class('open')
            await asyncio.sleep(0.5)

            await page.screenshot(path='verification/05-ui-scaling-smoothing.png')
            print("  - Screenshot of scaled grid labels and max smoothing captured.")

            print("\n--- Verification script finished. ---")

        except Exception as e:
            print(f"An error occurred: {e}")
        finally:
            await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
