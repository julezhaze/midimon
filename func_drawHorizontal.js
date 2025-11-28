function drawHorizontal(startKey, endKey, visKeys, moveDist, keyW, bounds = {x:0,y:0,w:mainCanvas.width, h:mainCanvas.height}, filterCh = null) {
        const keyH = keyW;
        const thickH = keyH * (noteThickness / 100);
        const thickOffset = (keyH - thickH) / 2;

        // PIANO
        if(showPiano) {
            pianoCtx.fillStyle = getComputedStyle(document.body).getPropertyValue('--panel-bg');
            pianoCtx.fillRect(0, bounds.y, pianoCanvas.width, bounds.h);

            for(let i=Math.floor(startKey); i<endKey; i++) {
                const y = bounds.y + bounds.h - (i - startKey + 1) * keyH;
                const h = Math.ceil(keyH);
                const isBlack = CONFIG.BLACK_KEYS.includes(i%12);
                const noteName = CONFIG.NOTE_NAMES[i%12];

                pianoCtx.fillStyle = isBlack ? '#222' : '#888';
                pianoCtx.fillRect(isBlack?0:0, y, isBlack?20:38, h-1);

                pianoCtx.fillStyle = '#fff';
                pianoCtx.font = `bold ${fontScale*0.9}px ${currentFontStack}`;

                if(noteName === 'C') {
                    const octave = Math.floor(i/12) - 1;
                    pianoCtx.fillText('C'+octave, 22, y + h - 4);
                }
                else if(showLabels || (!isBlack && keyH > 12)) {
                    if(keyH > 12) pianoCtx.fillText(noteName, 22, y + h - 4);
                }
            }
        }

        // C-LINES
        if(showCLines && !showPiano) {
             for(let i=Math.floor(startKey); i<endKey; i++) {
                 if(i%12===0) {
                    const y = bounds.y + bounds.h - (i - startKey + 1) * keyH;
                    const h = Math.ceil(keyH);
                    mainCtx.save(); mainCtx.strokeStyle='rgba(255,255,255,0.1)';
                    mainCtx.beginPath(); mainCtx.moveTo(0,y+h); mainCtx.lineTo(mainCanvas.width,y+h); mainCtx.stroke();
                    mainCtx.fillStyle = 'rgba(255,255,255,0.5)';
                    mainCtx.font = `bold ${fontScale}px ${currentFontStack}`;
                    const lblX = (direction === 'right') ? 5 : mainCanvas.width - 25;
                    mainCtx.fillText('C'+(Math.floor(i/12)-1), lblX, y + h - 5);
                    mainCtx.restore();
                 }
             }
        }

        // FALLING
        const now = performance.now();

        for(let i=fallingObjects.length-1; i>=0; i--) {
            const o = fallingObjects[i];

            if (filterCh !== null) {
                if (o.type === 'note' && o.ch !== filterCh) continue;
                if (o.type === 'pgm' && o.ch !== filterCh) continue;
            }

            if(o.type === 'grid') {
                const targetCtx = trailsOnGrid ? mainCtx : overlayCtx;
                targetCtx.save(); targetCtx.shadowBlur = 0;
                targetCtx.strokeStyle = o.isBar ? getComputedStyle(document.body).getPropertyValue('--grid-bar') : getComputedStyle(document.body).getPropertyValue('--grid-beat');
                targetCtx.lineWidth = o.isBar ? barThickness : 1;
                targetCtx.beginPath();

                if (direction === 'right') {
                    targetCtx.moveTo(o.pos, bounds.y); targetCtx.lineTo(o.pos, bounds.y + bounds.h);
                } else { // LEFT
                    const x = mainCanvas.width - o.pos;
                    targetCtx.moveTo(x, bounds.y); targetCtx.lineTo(x, bounds.y + bounds.h);
                }
                targetCtx.stroke();
                targetCtx.restore();
            }
            else if(o.type === 'pgm') {
                if(!showPGM) continue;
                const targetCtx = freshPGM ? overlayCtx : mainCtx;
                targetCtx.save(); targetCtx.shadowBlur = 0;

                const pgmCol = getNoteColor(o.val, o.val % 16);
                targetCtx.fillStyle = pgmCol;
                targetCtx.globalAlpha = 0.4;

                let px;
                if(direction === 'right') px = o.pos;
                else px = mainCanvas.width - o.pos;

                targetCtx.fillRect(px, bounds.y, 4, bounds.h);
                targetCtx.globalAlpha = 1.0;

                targetCtx.font = `bold ${labelSize}px ${currentFontStack}`;
                targetCtx.fillStyle = pgmCol;
                targetCtx.fillText(`PGM ${o.val}`, px + 5, bounds.y + 20);
                targetCtx.restore();
            }
            else if(o.type === 'note') {
                if(o.note < startKey || o.note >= endKey) continue;
                const y = bounds.y + bounds.h - (o.note - startKey + 1) * keyH + thickOffset;

                mainCtx.save();
                if(document.getElementById('chk-vel-opacity').checked && o.vel !== undefined) {
                    const op = velOpacityBase + (o.vel / 127) * (1 - velOpacityBase);
                    mainCtx.globalAlpha = op;
                }
                if(glowEnabled && glowAmount > 0) {
                    mainCtx.shadowColor = (currentTheme === 'chernobyl') ? '#00FFFF' : o.color;
                    mainCtx.shadowBlur = glowAmount;
                }
                mainCtx.fillStyle = o.color;

                let rx;
                if (direction === 'right') { rx = o.pos; }
                else { rx = bounds.x + bounds.w - o.pos - o.len; }

                drawNoteShape(mainCtx, rx, y, o.len, Math.ceil(thickH), noteShape);
                mainCtx.restore();

                if(showLabels && keyH > 15) {
                    if (!labelPerBar || o.showLabel !== false) {
                        const targetCtx = freshLabels ? overlayCtx : mainCtx;
                        targetCtx.save(); targetCtx.shadowBlur=0;
                        targetCtx.fillStyle = (labelColorMode === 'match') ? o.color : '#fff';
                        targetCtx.font=`bold ${labelSize}px ${currentFontStack}`;

                        let lx;
                        if (direction === 'right') lx = o.pos + o.len + 5;
                        else lx = (bounds.x + bounds.w - o.pos - o.len) - 15;

                        targetCtx.fillText(CONFIG.NOTE_NAMES[o.note%12], lx, y + keyH/2 + 4);
                        targetCtx.restore();
                    }
                }
            }
        }

        // ACTIVE
        activeNotes.forEach(n => {
            if (filterCh !== null && n.ch !== filterCh) return;
            if(n.note < startKey || n.note >= endKey) return;
            const y = bounds.y + bounds.h - (n.note - startKey + 1) * keyH + thickOffset;
            const duration = performance.now() - n.start;
            let len = noteSpeed * (duration / 16.66);
            if(len < 1) len = 1;

            mainCtx.save();
            if(document.getElementById('chk-vel-opacity').checked) {
                const op = velOpacityBase + (n.vel / 127) * (1 - velOpacityBase);
                mainCtx.globalAlpha = op;
            }
            if(glowEnabled && glowAmount > 0) {
                mainCtx.shadowColor = (currentTheme === 'chernobyl') ? '#00FFFF' : n.color;
                mainCtx.shadowBlur = glowAmount;
            }
            mainCtx.fillStyle = n.color;

            let rx;
            if (direction === 'right') { rx = bounds.x; }
            else { rx = bounds.x + bounds.w - len; }

            drawNoteShape(mainCtx, rx, y, len, Math.ceil(thickH), noteShape);
            mainCtx.restore();

            if(showLabels && keyH > 15) {
                if(!labelPerBar || n.showLabel !== false) {
                    const targetCtx = freshLabels ? overlayCtx : mainCtx;
                    targetCtx.save(); targetCtx.shadowBlur=0;
                    targetCtx.fillStyle = (labelColorMode === 'match') ? n.color : '#fff';
                    targetCtx.font=`bold ${labelSize}px ${currentFontStack}`;

                    let lx;
                    if (direction === 'right') lx = bounds.x + len + 5;
                    else lx = (bounds.x + bounds.w - len) - 15;

                    targetCtx.fillText(CONFIG.NOTE_NAMES[n.note%12], lx, y + keyH/2 + 4);
                    targetCtx.restore();
                }
            }
        });

        // GRID LANES
        if(showGrid) {
             const targetCtx = trailsOnGrid ? mainCtx : overlayCtx;
             for(let i=Math.floor(startKey); i<endKey; i++) {
                const y = bounds.y + bounds.h - (i - startKey + 1) * keyH;
                const h = Math.ceil(keyH);
                const isBlack = CONFIG.BLACK_KEYS.includes(i%12);

                targetCtx.save(); targetCtx.shadowBlur=0;
                targetCtx.fillStyle = isBlack ? 'rgba(255,255,255,0.03)' : 'transparent';
                targetCtx.fillRect(bounds.x, y, bounds.w, h); // Adjust for bounds
                targetCtx.strokeStyle = 'rgba(255,255,255,0.05)';
                targetCtx.beginPath(); targetCtx.moveTo(bounds.x,y+h); targetCtx.lineTo(bounds.x+bounds.w,y+h); targetCtx.stroke();
                targetCtx.restore();
             }
        }
    }
