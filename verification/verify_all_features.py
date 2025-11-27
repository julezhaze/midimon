import asyncio
from playwright.async_api import async_playwright, expect
import os
import re

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Get absolute path for the HTML file
        html_file_path = os.path.abspath("MIDI_Monitor_Final8.html")
        await page.goto(f'file:///{html_file_path}')

        print("--- Verifying Core Features ---")

        # 1. Inject MIDI CC data to create a widget
        print("Injecting MIDI data to create CC widget...")
        await page.evaluate("""
            handleCC(0, 20, 50); // Channel 0, CC 20, Value 50
            handleCC(0, 20, 100);
        """)
        await page.wait_for_selector('.cc-widget')
        print("CC widget created.")

        # 2. Verify Pin Button
        print("Verifying Pin button...")
        pin_button = page.locator('.cc-pin-btn')
        await expect(pin_button).to_be_visible()
        await pin_button.click()
        await expect(pin_button).to_have_class(re.compile(r'active'))
        print("Pin button is visible and functional.")

        # 3. Verify Big CC controls container is initially hidden
        controls_container = page.locator('#cc-controls-container')
        await expect(controls_container).to_be_hidden()
        print("Big CC controls container is correctly hidden initially.")

        # 4. Drag and Drop to enable Big CC
        print("Enabling Big CC via drag-and-drop...")
        cc_widget = page.locator('.cc-widget')
        main_canvas = page.locator('#mainCanvas')
        await cc_widget.drag_to(main_canvas)

        # 5. Verify Big CC controls container is now visible
        await expect(controls_container).to_be_visible()
        print("Big CC controls container is correctly visible after drag-and-drop.")

        # 6. Change slider value and take screenshot for visual verification
        print("Adjusting Big CC Scale and taking screenshot...")
        big_cc_slider = page.locator('#big-cc-scale-slider')
        await big_cc_slider.fill('20') # Set to 20%
        await page.screenshot(path='verification/screenshot_vertical_scaled.png')
        print("Screenshot 'screenshot_vertical_scaled.png' captured.")
        print("  >> Please visually verify: Stepped drawing, CC grid, and narrow scaling.")

        # 7. Open settings and switch to Horizontal Timeline mode
        print("Opening settings panel...")
        await page.locator('#btn-settings').click()
        await expect(page.locator('#settings-panel')).to_be_visible()

        print("Switching to Horizontal (Right) mode...")
        await page.select_option('#sel-direction', 'right')
        await page.wait_for_timeout(500) # Allow redraw
        await expect(controls_container).to_be_visible() # Should still be visible
        await page.screenshot(path='verification/screenshot_horizontal.png')
        print("Screenshot 'screenshot_horizontal.png' captured.")
        print("  >> Please visually verify: Big CC overlay is still present and scaled in horizontal mode.")

        # 8. Switch to Bottom Sidebar mode and verify slider layout
        print("Switching to Bottom Sidebar mode...")
        await page.select_option('#sel-sidebar-pos', 'bottom')
        await page.wait_for_timeout(500) # Allow redraw
        writing_mode = await controls_container.evaluate('(element) => getComputedStyle(element).writingMode')
        assert writing_mode == 'vertical-rl', f"Slider writing mode is {writing_mode}, expected vertical-rl"
        print("Big CC Scale slider has correct vertical layout in bottom mode.")
        await page.screenshot(path='verification/screenshot_bottom_sidebar.png')
        print("Screenshot 'screenshot_bottom_sidebar.png' captured.")

        await browser.close()
        print("\nVerification script completed successfully!")

if __name__ == '__main__':
    # Simple check for playwright install
    try:
        import playwright
    except ImportError:
        print("Playwright not found. Please install it with 'pip install playwright' and 'playwright install'")
        exit(1)

    asyncio.run(main())