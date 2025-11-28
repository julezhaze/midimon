    function drawBigCCsSplit(now, isVertical, bounds, filterCh, overrideCtx = null) {
        const targetCtx = overrideCtx || (overlayTrails ? mainCtx : overlayCtx);
        const gridCtx = overlayCtx;
        targetCtx.save();
        gridCtx.save();

        // Clip to bounds
        const clipPath = new Path2D();
        clipPath.rect(bounds.x, bounds.y, bounds.w, bounds.h);
        targetCtx.clip(clipPath);
        gridCtx.clip(clipPath);

        if(ccGlow) targetCtx.shadowBlur = 20;

        // Filter BigCCs for this channel
        const activeIds = [];
        bigCCs.forEach(id => {
            const mon = ccMonitors.get(id);
            if(mon && mon.ch === filterCh) activeIds.push(id);
        });

        if (activeIds.length === 0) {
            targetCtx.restore(); gridCtx.restore(); return;
        }

        const count = activeIds.length;
        const PAD = 2;
        let laneSize, totalSize, centerOffset;

        if (isVertical) {
            const baseLaneW = bounds.w / count;
            laneSize = baseLaneW * ccScale;
            totalSize = laneSize * count;
            centerOffset = (bounds.w - totalSize) / 2;
        } else {
            const baseLaneH = bounds.h / count;
            laneSize = baseLaneH * ccScale;
            totalSize = laneSize * count;
            centerOffset = (bounds.h - totalSize) / 2;
        }

        const drawSize = laneSize - PAD;
        const sidebarBottom = document.getElementById('main-workspace').classList.contains('sidebar-bottom') && document.getElementById('sidebar').classList.contains('visible');
        const bottomOffset = (sidebarBottom && isVertical) ? 50 : 0;

        activeIds.forEach((id, idx) => {
             const mon = ccMonitors.get(id);

             let laneStart, laneEnd;
             if(isVertical) {
                 laneStart = bounds.x + centerOffset + (idx * laneSize) + (PAD/2);
                 laneEnd = laneStart + drawSize;
             } else {
                 laneStart = bounds.y + centerOffset + (idx * laneSize) + (PAD/2); // Y
                 laneEnd = laneStart + drawSize;
             }

             let minVal = 0, maxVal = 127;
             if(ccClamp) {
                 let min = 127, max = 0;
                 if(mon.history.length > 0) {
                     for(const p of mon.history) {
                         if(p.v < min) min = p.v;
                         if(p.v > max) max = p.v;
                     }
                 } else { min = mon.val; max = mon.val; }
                 if(mon.val < min) min = mon.val;
                 if(mon.val > max) max = mon.val;
                 minVal = Math.max(0, min);
                 maxVal = Math.min(127, max);
                 if(minVal === maxVal) { minVal = 0; maxVal = 127; }
             }
             const range = maxVal - minVal;
             const mapVal = (v) => {
                 let n = (v - minVal) / (range || 1);
                 return Math.max(0, Math.min(1, n));
             };

             // Draw Grid
             if(document.getElementById('chk-cc-grid').checked) {
                 gridCtx.font = `${labelSize}px monospace`;
                 gridCtx.fillStyle = 'rgba(255,255,255,0.5)';

                 for(let v = 0; v <= 127; v += ccGridDensity) {
                     if (v < minVal || v > maxVal) continue;
                     const n = mapVal(v);
                     const isBoundary = (v === 0 || v === 127);
                     gridCtx.lineWidth = isBoundary ? 2 : 1;
                     gridCtx.strokeStyle = isBoundary ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)';

                     if(isVertical) {
                         const x = laneStart + (n * drawSize);
                         gridCtx.beginPath(); gridCtx.moveTo(x, bounds.y); gridCtx.lineTo(x, bounds.y + bounds.h); gridCtx.stroke();
                         const labelY = (direction==='down') ? bounds.y + bounds.h - 10 : bounds.y + bounds.h - 10 - bottomOffset;
                         gridCtx.fillText(v, x + 2, labelY);
                     } else {
                         const y = laneEnd - (n * drawSize);
                         gridCtx.beginPath(); gridCtx.moveTo(bounds.x, y); gridCtx.lineTo(bounds.x + bounds.w, y); gridCtx.stroke();
                         gridCtx.fillText(v, bounds.x + 5, y - 2);
                     }
                 }
             }

             if(showGraphBorders) {
                 gridCtx.lineWidth = 1;
                 gridCtx.strokeStyle = 'rgba(255,255,255,0.6)';
                 const nMin = mapVal(minVal);
                 const nMax = mapVal(maxVal);

                 if(isVertical) {
                     const x1 = laneStart + (nMin * drawSize);
                     const x2 = laneStart + (nMax * drawSize);
                     gridCtx.beginPath(); gridCtx.moveTo(x1,bounds.y); gridCtx.lineTo(x1,bounds.y+bounds.h); gridCtx.stroke();
                     gridCtx.beginPath(); gridCtx.moveTo(x2,bounds.y); gridCtx.lineTo(x2,bounds.y+bounds.h); gridCtx.stroke();
                 } else {
                     const y1 = laneEnd - (nMin * drawSize);
                     const y2 = laneEnd - (nMax * drawSize);
                     gridCtx.beginPath(); gridCtx.moveTo(bounds.x,y1); gridCtx.lineTo(bounds.x+bounds.w,y1); gridCtx.stroke();
                     gridCtx.beginPath(); gridCtx.moveTo(bounds.x,y2); gridCtx.lineTo(bounds.x+bounds.w,y2); gridCtx.stroke();
                 }
             }

             // Draw Graph
             if(ccGlow) targetCtx.shadowColor = mon.color;
             targetCtx.strokeStyle = mon.color;
             targetCtx.lineWidth = overlayThick;
             targetCtx.globalAlpha = ccOpacity;
             targetCtx.beginPath();

             let points = [...mon.history];
             points.push({t: now, v: mon.val});

             // Dynamic Window
             let windowSize = 5000;
             const timeDim = isVertical ? bounds.h : bounds.w;
             if (noteSpeed > 0) {
                 windowSize = (timeDim * 16.66 / noteSpeed) * 2.5;
                 if(windowSize < 1000) windowSize = 1000;
             }

             const startTime = now - windowSize;
             points = points.filter(p => p.t >= startTime);

             const smoothedPoints = [];
             if(ccSmoothWindow > 1 && points.length > 0) {
                 for(let i=0; i<points.length; i++) {
                     let sum = 0, c = 0;
                     for(let j=0; j<ccSmoothWindow; j++) {
                         if(i-j >= 0) { sum += points[i-j].v; c++; }
                     }
                     smoothedPoints.push({t: points[i].t, v: sum/c});
                 }
             } else smoothedPoints.push(...points);

             const coords = [];
             for(let p of smoothedPoints) {
                 const dist = (now - p.t) * (noteSpeed / 16.66);
                 const n = mapVal(p.v);

                 if (isVertical) {
                     let y;
                     if (direction === 'down') y = dist;
                     else y = bounds.h - dist; // Relative to bounds

                     const x = laneStart + (n * drawSize);
                     coords.push({x, y: bounds.y + y});
                 } else {
                     let x;
                     if (direction === 'right') x = dist;
                     else x = bounds.w - dist;

                     const y = laneEnd - (n * drawSize);
                     coords.push({x: bounds.x + x, y});
                 }
             }

             if(coords.length > 0) {
                  targetCtx.beginPath();
                  if(overlaySmooth > 0 && coords.length > 2) {
                         targetCtx.moveTo(coords[0].x, coords[0].y);
                         for (let i = 1; i < coords.length - 1; i ++) {
                            const xc = (coords[i].x + coords[i+1].x) / 2;
                            const yc = (coords[i].y + coords[i+1].y) / 2;
                            targetCtx.quadraticCurveTo(coords[i].x, coords[i].y, xc, yc);
                         }
                         targetCtx.lineTo(coords[coords.length-1].x, coords[coords.length-1].y);
                  } else {
                         // Stepped
                         targetCtx.moveTo(coords[0].x, coords[0].y);
                         for(let i=1; i<coords.length; i++) {
                             const curr = coords[i];
                             const prev = coords[i-1];
                             if(isVertical) {
                                 targetCtx.lineTo(prev.x, curr.y);
                                 targetCtx.lineTo(curr.x, curr.y);
                             } else {
                                 targetCtx.lineTo(curr.x, prev.y);
                                 targetCtx.lineTo(curr.x, curr.y);
                             }
                         }
                  }
                  targetCtx.stroke();
             }

             // Label
             overlayCtx.save();
             overlayCtx.fillStyle = mon.color;
             overlayCtx.font = `bold ${labelSize}px ${currentFontStack}`;
             if(isVertical) {
                 const labelY = (direction==='down') ? bounds.y + 45 : bounds.y + bounds.h - 30 - bottomOffset;
                 overlayCtx.fillText(mon.label || `CC ${mon.cc}`, bounds.x + 5, labelY);
             } else {
                 const labelX = (direction==='right') ? bounds.x + 30 : bounds.x + bounds.w - 100;
                 overlayCtx.fillText(mon.label || `CC ${mon.cc}`, labelX, bounds.y + 20);
             }
             overlayCtx.restore();
        });

        targetCtx.restore();
        gridCtx.restore();
    }
