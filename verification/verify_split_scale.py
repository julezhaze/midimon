import os
from playwright.sync_api import sync_playwright

def verify_split_scale():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})

        # Load local file
        file_path = os.path.abspath("MIDI_Monitor_Final16.html")
        page.goto(f"file://{file_path}")

        # Activate SPLIT mode
        page.click("#btn-toggle-split")

        # Inject MIDI data to make Split Mode active
        page.evaluate("""
            const now = performance.now();
            // Channel 0 Note (will show up in first split)
            activeNotes.set('0-60', {note:60, ch:0, vel:100, start:now, color:'#F00', showLabel:true});
            fallingObjects.push({type:'note', note:60, ch:0, pos:0, len:50, color:'#F00', showLabel:true});

            // Channel 4 Note (5th split)
            activeNotes.set('4-64', {note:64, ch:4, vel:100, start:now, color:'#0F0', showLabel:true});
            fallingObjects.push({type:'note', note:64, ch:4, pos:0, len:50, color:'#0F0', showLabel:true});

            // ChannelMaskSplit must be active for these
            channelMaskSplit.fill(false);
            channelMaskSplit[0] = true;
            channelMaskSplit[4] = true;
        """)

        # Helper to change label size
        def set_label_size(val):
            page.click("#btn-settings") # Open
            page.fill("#lbl-size-slider", str(val))
            page.dispatch_event("#lbl-size-slider", "input")
            page.click("#btn-settings") # Close
            page.wait_for_timeout(200)

        # Case 1: Default Label Size (13)
        # (Settings start closed)
        page.wait_for_timeout(200)
        page.screenshot(path="verification/split_scale_default.png")
        print("Captured default scale")

        # Case 2: Max Label Size (32)
        set_label_size(32)
        page.screenshot(path="verification/split_scale_max.png")
        print("Captured max scale")

        # Case 3: Min Label Size (8)
        set_label_size(8)
        page.screenshot(path="verification/split_scale_min.png")
        print("Captured min scale")

        browser.close()

if __name__ == "__main__":
    verify_split_scale()
