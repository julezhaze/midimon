    function loop() {
        requestAnimationFrame(loop);

        const now = performance.now();
        const dt = now - lastFrameTime;
        lastFrameTime = now;

        const moveDist = noteSpeed * (dt / 16.66);

        if (now - lastActiveClock > 2000 && lastActiveClock !== 0) {
            document.getElementById('bpm-val').innerText = "NO CLOCK";
            lastActiveClock = 0;
        }

        // PHYSICS UPDATE
        for(let i=fallingObjects.length-1; i>=0; i--) {
            const o = fallingObjects[i];
            o.pos += moveDist;
            // Remove if off screen? depends on direction and max dimension
            // Safe max dimension check
            const maxDim = Math.max(mainCanvas.width, mainCanvas.height);
            if(o.pos > maxDim + o.len + 100) { fallingObjects.splice(i,1); }
        }

        // CC Render (Small Widgets)
        drawCCGraphs(now);

        // CLEAR CANVAS
        mainCtx.save();
        if (persistence > 0) {
            const bg = getComputedStyle(document.body).getPropertyValue('--bg-color');
            mainCtx.globalAlpha = (1 - persistence);
            mainCtx.fillStyle = bg;
            mainCtx.fillRect(0,0,mainCanvas.width, mainCanvas.height);
            mainCtx.globalAlpha = 1.0;
        } else {
            mainCtx.clearRect(0,0,mainCanvas.width, mainCanvas.height);
            const bg = getComputedStyle(document.body).getPropertyValue('--bg-color');
            mainCtx.fillStyle = bg;
            mainCtx.fillRect(0,0,mainCanvas.width, mainCanvas.height);
        }
        mainCtx.restore();
        overlayCtx.clearRect(0,0,overlayCanvas.width, overlayCanvas.height);

        const isVertical = (direction === 'down' || direction === 'up');

        if (perChannelMode) {
            // --- SPLIT MODE ---
            // 1. Identify Active Split Channels (Enabled AND Active)
            const activeChs = [];
            for(let i=0; i<16; i++) {
                if(channelMaskSplit[i] && isChannelActive(i)) activeChs.push(i);
            }

            const count = activeChs.length;
            let size, offset;

            if (count > 0) {
                activeChs.forEach((ch, idx) => {
                let bounds;
                if(isVertical) {
                    size = mainCanvas.width / count;
                    bounds = {x: idx * size, y: 0, w: size, h: mainCanvas.height};
                } else {
                    size = mainCanvas.height / count;
                    bounds = {x: 0, y: idx * size, w: mainCanvas.width, h: size};
                }

                // Determine Note Range for this Channel
                const range = getChannelRange(ch); // {min, max}

                // Draw Strip Border
                overlayCtx.strokeStyle = '#333';
                overlayCtx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);

                // Draw Background Label (CH X) - Toggleable
                if(showLabels) {
                    overlayCtx.save();
                    overlayCtx.fillStyle = 'rgba(255,255,255,0.05)';
                    overlayCtx.font = `bold ${Math.min(bounds.w, bounds.h) * (labelSize / 20)}px ${currentFontStack}`;
                    overlayCtx.textAlign = 'center';
                    overlayCtx.textBaseline = 'middle';
                    overlayCtx.fillText(`CH ${ch+1}`, bounds.x + bounds.w/2, bounds.y + bounds.h/2);
                    overlayCtx.restore();
                }

                // Clip & Draw
                mainCtx.save(); overlayCtx.save(); pianoCtx.save();

                const clipPath = new Path2D();
                clipPath.rect(bounds.x, bounds.y, bounds.w, bounds.h);
                mainCtx.clip(clipPath); overlayCtx.clip(clipPath); pianoCtx.clip(clipPath); // Piano ctx isn't used directly here usually, but if we draw piano..

                // Calculate keys based on Range
                let sKey = range.min;
                let eKey = range.max + 1;
                let vKeys = eKey - sKey;

                // Padding
                if (vKeys < 12) {
                    const diff = 12 - vKeys;
                    sKey -= Math.floor(diff/2);
                    eKey += Math.ceil(diff/2);
                    vKeys = 12;
                }

                let kW;
                if(isVertical) kW = bounds.w / vKeys;
                else kW = bounds.h / vKeys; // keyHeight actually

                // CCs BEFORE Notes if Notes on Top
                if (notesOnTop && bigCCs.size > 0) drawBigCCsSplit(now, isVertical, bounds, ch, mainCtx);

                if (isVertical) drawVertical(sKey, eKey, vKeys, moveDist, kW, bounds, ch);
                else drawHorizontal(sKey, eKey, vKeys, moveDist, kW, bounds, ch);

                // CCs AFTER Notes if Notes NOT on Top (Default)
                if (!notesOnTop && bigCCs.size > 0) drawBigCCsSplit(now, isVertical, bounds, ch);

                mainCtx.restore(); overlayCtx.restore(); pianoCtx.restore();
                });
            } else {
                // No active channels in split mode
                mainCtx.fillStyle = '#333';
                mainCtx.font = '20px sans-serif';
                mainCtx.fillText("NO ACTIVE CHANNELS", mainCanvas.width/2 - 100, mainCanvas.height/2);
            }

        } else {
            // --- STANDARD MODE ---
            const visKeys = 128 / zoomLevel;
            const maxStart = 128 - visKeys;
            const startKey = (panPercent / 100) * maxStart;
            const endKey = startKey + visKeys;
            let keyW;

            // CCs BEFORE Notes if Notes on Top
            if (notesOnTop && bigCCs.size > 0) drawBigCCs(now, isVertical, mainCtx);

            if (isVertical) {
                keyW = mainCanvas.width / visKeys;
                drawVertical(startKey, endKey, visKeys, moveDist, keyW, {x:0, y:0, w:mainCanvas.width, h:mainCanvas.height}, null);
            } else {
                keyW = mainCanvas.height / visKeys; // Actually keyHeight
                drawHorizontal(startKey, endKey, visKeys, moveDist, keyW, {x:0, y:0, w:mainCanvas.width, h:mainCanvas.height}, null);
            }

            // CCs AFTER Notes if Notes NOT on Top
            if(!notesOnTop && bigCCs.size > 0) drawBigCCs(now, isVertical);
        }
    }
