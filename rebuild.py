import os

def read_file(path):
    with open(path, 'r') as f:
        return f.read()

def main():
    original = read_file('MIDI_Monitor_Final18.html')

    # 1. State Injection
    # Anchor: let ccScale = 1; // SCALE MULTIPLIER
    state_anchor = "    let ccScale = 1; // SCALE MULTIPLIER"
    new_state = """    let ccScale = 1; // SCALE MULTIPLIER
    let notesOnTop = false;

    // MK21 Features
    let ccClamp = false;
    let showGraphBorders = false;"""

    content = original.replace(state_anchor, new_state)

    # 2. UI HTML Injection
    # Anchor 1: <div class="setting-row"><label>OVL TRAIL</label><input type="checkbox" id="chk-ovl-trail"></div>
    ui_anchor_1 = '<div class="setting-row"><label>OVL TRAIL</label><input type="checkbox" id="chk-ovl-trail"></div>'
    new_ui_1 = ui_anchor_1 + '\n        <div class="setting-row"><label>NOTES ON TOP</label><input type="checkbox" id="chk-notes-top"></div>'

    content = content.replace(ui_anchor_1, new_ui_1)

    # Anchor 2: <div class="setting-row"><label>CC GRID</label><input type="checkbox" id="chk-cc-grid"></div>
    ui_anchor_2 = '<div class="setting-row"><label>CC GRID</label><input type="checkbox" id="chk-cc-grid"></div>'
    new_ui_2 = ui_anchor_2 + '\n        <div class="setting-row"><label>CC BORDERS</label><input type="checkbox" id="chk-cc-borders"></div>'

    content = content.replace(ui_anchor_2, new_ui_2)

    # 3. Listeners Injection
    # Anchor: safeListen('chk-ovl-trail', 'change', e => overlayTrails = e.target.checked);
    lis_anchor = "safeListen('chk-ovl-trail', 'change', e => overlayTrails = e.target.checked);"
    new_lis = """safeListen('chk-ovl-trail', 'change', e => overlayTrails = e.target.checked);
        safeListen('chk-notes-top', 'change', e => notesOnTop = e.target.checked);
        safeListen('chk-cc-borders', 'change', e => showGraphBorders = e.target.checked);"""

    content = content.replace(lis_anchor, new_lis)

    # 4. Config Load Injection
    # Anchor: if(data.overlayTrails !== undefined) setChk('chk-ovl-trail', data.overlayTrails);
    cfg_anchor = "if(data.overlayTrails !== undefined) setChk('chk-ovl-trail', data.overlayTrails);"
    new_cfg = """if(data.overlayTrails !== undefined) setChk('chk-ovl-trail', data.overlayTrails);
                if(data.notesOnTop !== undefined) setChk('chk-notes-top', data.notesOnTop);
                if(data.showGraphBorders !== undefined) setChk('chk-cc-borders', data.showGraphBorders);"""

    content = content.replace(cfg_anchor, new_cfg)

    # 5. Config Save Injection
    # Anchor: overlaySmooth, overlayThick, overlayTrails, ccColorMode, ccGlow, ccOpacity,
    save_anchor = "overlaySmooth, overlayThick, overlayTrails, ccColorMode, ccGlow, ccOpacity,"
    new_save = "overlaySmooth, overlayThick, overlayTrails, ccColorMode, ccGlow, ccOpacity,\n            notesOnTop, showGraphBorders,"

    content = content.replace(save_anchor, new_save)

    # 6. Function Replacements
    # We will locate functions and replace them with contents from files

    func_loop = read_file('func_loop.js')
    func_bigcc = read_file('func_drawBigCCs.js')
    func_vert = read_file('func_drawVertical.js')
    func_horiz = read_file('func_drawHorizontal.js')
    func_split = read_file('func_drawBigCCsSplit.js')

    # Helper to replace function
    def replace_func(src, name, new_body):
        start_idx = src.find(f'function {name}')
        if start_idx == -1:
            print(f"Error: {name} not found")
            return src

        # Scan for matching brace
        brace_count = 0
        found_start = False
        end_idx = -1

        for i in range(start_idx, len(src)):
            if src[i] == '{':
                brace_count += 1
                found_start = True
            elif src[i] == '}':
                brace_count -= 1
                if found_start and brace_count == 0:
                    end_idx = i + 1
                    break

        if end_idx == -1:
            print(f"Error: {name} end not found")
            return src

        return src[:start_idx] + new_body + src[end_idx:]

    content = replace_func(content, 'loop', func_loop)
    content = replace_func(content, 'drawBigCCs', func_bigcc)
    content = replace_func(content, 'drawVertical', func_vert)
    content = replace_func(content, 'drawHorizontal', func_horiz)
    content = replace_func(content, 'drawBigCCsSplit', func_split)

    with open('Final18_Working.html', 'w') as f:
        f.write(content)

    print("Rebuild complete.")

if __name__ == "__main__":
    main()
