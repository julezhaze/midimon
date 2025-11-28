    function drawBigCCs(now, isVertical, overrideCtx = null) {
        const targetCtx = overrideCtx || (overlayTrails ? mainCtx : overlayCtx);
        const gridCtx = overlayCtx;
        targetCtx.save();
        gridCtx.save();

        if(ccGlow) targetCtx.shadowBlur = 20;

        const count = bigCCs.size;
        let laneSize, totalSize, centerOffset;

        if (isVertical) {
            const baseLaneW = mainCanvas.width / count;
            laneSize = baseLaneW * ccScale;
            totalSize = laneSize * count;
            centerOffset = (mainCanvas.width - totalSize) / 2;
        } else {
            const baseLaneH = mainCanvas.height / count;
            laneSize = baseLaneH * ccScale;
            totalSize = laneSize * count;
            centerOffset = (mainCanvas.height - totalSize) / 2;
        }

        const PAD = 4;
        const drawSize = laneSize - PAD;

        let idx = 0;
        bigCCs.forEach(id => {
             const mon = ccMonitors.get(id);
             if(!mon) return;

             let laneStart, laneEnd;
             if (isVertical) {
                 laneStart = centerOffset + (idx * laneSize) + (PAD/2);
                 laneEnd = laneStart + drawSize;
             } else {
                 laneStart = centerOffset + (idx * laneSize) + (PAD/2);
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
                 n = Math.max(0, Math.min(1, n));
                 return n;
             };

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
                         gridCtx.beginPath(); gridCtx.moveTo(x, 0); gridCtx.lineTo(x, mainCanvas.height); gridCtx.stroke();
                         const sbBottom = document.getElementById('main-workspace').classList.contains('sidebar-bottom');
                         gridCtx.fillText(v, x + 2, mainCanvas.height - (sbBottom ? 50 : 10));
                     } else {
                         const y = laneEnd - (n * drawSize);
                         gridCtx.beginPath(); gridCtx.moveTo(0, y); gridCtx.lineTo(mainCanvas.width, y); gridCtx.stroke();
                         gridCtx.fillText(v, 5, y - 2);
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
                     gridCtx.beginPath(); gridCtx.moveTo(x1,0); gridCtx.lineTo(x1,mainCanvas.height); gridCtx.stroke();
                     gridCtx.beginPath(); gridCtx.moveTo(x2,0); gridCtx.lineTo(x2,mainCanvas.height); gridCtx.stroke();
                 } else {
                     const y1 = laneEnd - (nMin * drawSize);
                     const y2 = laneEnd - (nMax * drawSize);
                     gridCtx.beginPath(); gridCtx.moveTo(0,y1); gridCtx.lineTo(mainCanvas.width,y1); gridCtx.stroke();
                     gridCtx.beginPath(); gridCtx.moveTo(0,y2); gridCtx.lineTo(mainCanvas.width,y2); gridCtx.stroke();
                 }
             }

             if(ccClamp && !showGraphBorders) {
                 gridCtx.strokeStyle = 'rgba(255,0,0,0.3)';
                 if(isVertical) gridCtx.strokeRect(laneStart, 0, drawSize, mainCanvas.height);
                 else gridCtx.strokeRect(0, laneStart, mainCanvas.width, drawSize);
             }

             if(ccGlow) targetCtx.shadowColor = mon.color;
             targetCtx.strokeStyle = mon.color;
             targetCtx.lineWidth = overlayThick;
             targetCtx.globalAlpha = ccOpacity;
             targetCtx.beginPath();

             let points = [...mon.history];
             points.push({t: now, v: mon.val});

             let windowSize = 5000;
             const timeDim = isVertical ? mainCanvas.height : mainCanvas.width;
             if (noteSpeed > 0) {
                 windowSize = (timeDim * 16.66 / noteSpeed) * 2.5;
                 if(windowSize < 1000) windowSize = 1000;
             }

             const startTime = now - windowSize;
             points = points.filter(p => p.t >= startTime);

             if(points.length > 1) {
                 const coords = [];
                 const smoothedPoints = [];
                 if(ccSmoothWindow > 1) {
                     for(let i=0; i<points.length; i++) {
                         let sum = 0;
                         let c = 0;
                         for(let j=0; j<ccSmoothWindow; j++) {
                             if(i-j >= 0) { sum += points[i-j].v; c++; }
                         }
                         smoothedPoints.push({t: points[i].t, v: sum/c});
                     }
                 } else { smoothedPoints.push(...points); }

                 for(let p of smoothedPoints) {
                     const dist = (now - p.t) * (noteSpeed / 16.66);
                     const n = mapVal(p.v);

                     if (isVertical) {
                         let y;
                         if (direction === 'down') y = dist;
                         else y = mainCanvas.height - dist;
                         const x = laneStart + (n * drawSize);
                         coords.push({x, y});
                     } else {
                         let x;
                         if (direction === 'right') x = dist;
                         else x = mainCanvas.width - dist;
                         const y = laneEnd - (n * drawSize);
                         coords.push({x, y});
                     }
                 }

                 const validCoords = coords;

                 if(validCoords.length > 0) {
                      targetCtx.moveTo(validCoords[0].x, validCoords[0].y);
                      if(overlaySmooth > 0 && validCoords.length > 2) {
                             for (let i = 1; i < validCoords.length - 1; i ++) {
                                const xc = (validCoords[i].x + validCoords[i+1].x) / 2;
                                const yc = (validCoords[i].y + validCoords[i+1].y) / 2;
                                targetCtx.quadraticCurveTo(validCoords[i].x, validCoords[i].y, xc, yc);
                             }
                             targetCtx.lineTo(validCoords[validCoords.length-1].x, validCoords[validCoords.length-1].y);
                      } else {
                             for(let i=1; i<validCoords.length; i++) {
                                 const curr = validCoords[i];
                                 const prev = validCoords[i-1];
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
             }

             overlayCtx.save();
             overlayCtx.fillStyle = mon.color;
             overlayCtx.font = `bold ${labelSize}px ${currentFontStack}`;

             if(isVertical) {
                 const sbBottom = document.getElementById('main-workspace').classList.contains('sidebar-bottom');
                 const labelY = (direction==='down') ? 45 : mainCanvas.height - (sbBottom ? 50 : 30);
                 overlayCtx.fillText(mon.label || `CC ${mon.cc}`, laneStart + 5, labelY);
             } else {
                 const labelX = (direction==='right') ? 30 : mainCanvas.width - 100;
                 overlayCtx.fillText(mon.label || `CC ${mon.cc}`, labelX, laneStart + 20);
             }
             overlayCtx.restore();

             idx++;
        });

        targetCtx.restore();
        gridCtx.restore();
    }
