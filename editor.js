// This file is part of Moodle - https://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

/**
 * Legacy area editor, loaded by areas.php.
 *
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

var ImageMapEditor = {
    init: function() {
        var data = window.imagemapEditorData || {};
        var canvas = document.getElementById('imagemap-canvas');
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }
        var ctx = canvas.getContext('2d');
        var img = new Image();
        var drawing = false;
        var draggingArea = false;
        var resizingHandle = null;
        var startX, startY;
        var dragStartX, dragStartY;
        var dragOriginalCoords = [];
        var polyPoints = [];
        var currentTool = 'hand'; // Active tool: hand, rect, circle, poly, line, eraser
        var areasData = data.areasData || [];
        var linesData = data.linesData || [];
        var selectedAreaId = null;
        var HANDLE_SIZE = 8;
        var HANDLE_HIT_SIZE = 12;

        // Line tool state
        var lineSourceAreaId = null;
        var statusEl = document.getElementById('toolbar-status');

        function setStatus(msg) {
            if (statusEl) {
                statusEl.textContent = msg || '';
            }
        }

        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            drawBase();
        };
        img.onerror = function() {
            console.error('Failed to load image:', data.imageUrl);
        };
        img.src = data.imageUrl || '';

        function drawBase() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            drawExistingAreas();
            drawLines();
        }

        function drawExistingAreas() {
            areasData.forEach(function(area) {
                drawArea(area, area.id === selectedAreaId);
            });
            // Draw handles for selected area
            if (selectedAreaId) {
                var selectedArea = getAreaById(selectedAreaId);
                if (selectedArea) {
                    drawHandles(selectedArea);
                }
            }
        }

        function drawArea(area, highlight) {
            var coords = parseCoords(area.coords);
            if (!coords.length) {
                return;
            }

            drawAreaFilter(area, coords);

            // Eraser hover highlight
            var isEraserHover = (currentTool === 'eraser' && area._eraserHover);

            ctx.save();
            if (isEraserHover) {
                ctx.strokeStyle = '#dc3545';
                ctx.fillStyle = 'rgba(220, 53, 69, 0.3)';
                ctx.lineWidth = 3;
                ctx.setLineDash([6, 4]);
            } else {
                ctx.strokeStyle = highlight ? '#FF6F00' : '#0073e6';
                ctx.fillStyle = highlight ? 'rgba(255, 111, 0, 0.25)' : 'rgba(0, 115, 230, 0.2)';
                ctx.lineWidth = highlight ? 3 : 2;
            }

            if (area.shape === 'rect') {
                var x1 = Math.min(coords[0], coords[2]);
                var y1 = Math.min(coords[1], coords[3]);
                var x2 = Math.max(coords[0], coords[2]);
                var y2 = Math.max(coords[1], coords[3]);
                var w = x2 - x1;
                var h = y2 - y1;
                ctx.beginPath();
                ctx.rect(x1, y1, w, h);
                ctx.fill();
                ctx.stroke();
            } else if (area.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(coords[0], coords[1], coords[2], 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
            } else if (area.shape === 'poly') {
                ctx.beginPath();
                ctx.moveTo(coords[0], coords[1]);
                for (var i = 2; i < coords.length; i += 2) {
                    ctx.lineTo(coords[i], coords[i + 1]);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }

            ctx.restore();
        }

        function applyCssTextToStyle(style, cssText) {
            if (!cssText || cssText === 'none') {
                return;
            }
            if (cssText.indexOf(':') === -1 && cssText.indexOf('(') !== -1) {
                style.filter = cssText;
                return;
            }
            cssText.split(';').forEach(function(rule) {
                if (!rule.trim()) {
                    return;
                }
                var parts = rule.split(':');
                if (parts.length >= 2) {
                    var prop = parts.shift().trim();
                    var value = parts.join(':').trim();
                    style.setProperty(prop, value);
                }
            });
        }

        function getAreaFilterValue(area) {
            var cssText = (area.active ? area.activefilter : area.inactivefilter) || '';
            if (!cssText) {
                cssText = area.active ? 'none' : 'filter: grayscale(100%);';
            }

            var tmp = document.createElement('div');
            applyCssTextToStyle(tmp.style, cssText);
            return tmp.style.filter || '';
        }

        function clipAreaPath(area, coords) {
            if (area.shape === 'rect' && coords.length >= 4) {
                var x1 = Math.min(coords[0], coords[2]);
                var y1 = Math.min(coords[1], coords[3]);
                var w = Math.abs(coords[2] - coords[0]);
                var h = Math.abs(coords[3] - coords[1]);
                ctx.beginPath();
                ctx.rect(x1, y1, w, h);
                return true;
            }

            if (area.shape === 'circle' && coords.length >= 3) {
                ctx.beginPath();
                ctx.arc(coords[0], coords[1], coords[2], 0, 2 * Math.PI);
                return true;
            }

            if (area.shape === 'poly' && coords.length >= 6) {
                ctx.beginPath();
                ctx.moveTo(coords[0], coords[1]);
                for (var i = 2; i < coords.length; i += 2) {
                    ctx.lineTo(coords[i], coords[i + 1]);
                }
                ctx.closePath();
                return true;
            }

            return false;
        }

        function drawAreaFilter(area, coords) {
            var filterValue = getAreaFilterValue(area);
            if (!filterValue || filterValue === 'none') {
                return;
            }

            ctx.save();
            if (!clipAreaPath(area, coords)) {
                ctx.restore();
                return;
            }
            ctx.clip();
            ctx.filter = filterValue;
            ctx.drawImage(img, 0, 0);
            ctx.restore();
        }

        function drawHandles(area) {
            var coords = parseCoords(area.coords);

            if (area.shape === 'rect') {
                var x1 = Math.min(coords[0], coords[2]);
                var y1 = Math.min(coords[1], coords[3]);
                var x2 = Math.max(coords[0], coords[2]);
                var y2 = Math.max(coords[1], coords[3]);
                var handles = [
                    {x: x1, y: y1, cursor: 'nw-resize', pos: 'nw'},
                    {x: (x1+x2)/2, y: y1, cursor: 'n-resize', pos: 'n'},
                    {x: x2, y: y1, cursor: 'ne-resize', pos: 'ne'},
                    {x: x2, y: (y1+y2)/2, cursor: 'e-resize', pos: 'e'},
                    {x: x2, y: y2, cursor: 'se-resize', pos: 'se'},
                    {x: (x1+x2)/2, y: y2, cursor: 's-resize', pos: 's'},
                    {x: x1, y: y2, cursor: 'sw-resize', pos: 'sw'},
                    {x: x1, y: (y1+y2)/2, cursor: 'w-resize', pos: 'w'}
                ];
                handles.forEach(function(h) {
                    drawHandle(h.x, h.y);
                });
            } else if (area.shape === 'circle') {
                var cx = coords[0], cy = coords[1], r = coords[2];
                var handles = [
                    {x: cx, y: cy - r, pos: 'n'},
                    {x: cx + r, y: cy, pos: 'e'},
                    {x: cx, y: cy + r, pos: 's'},
                    {x: cx - r, y: cy, pos: 'w'}
                ];
                handles.forEach(function(h) {
                    drawHandle(h.x, h.y);
                });
            } else if (area.shape === 'poly') {
                for (var i = 0; i < coords.length; i += 2) {
                    drawHandle(coords[i], coords[i+1]);
                }
            }
        }

        function drawHandle(x, y) {
            ctx.save();
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#FF6F00';
            ctx.lineWidth = 2;
            ctx.fillRect(x - HANDLE_SIZE/2, y - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
            ctx.strokeRect(x - HANDLE_SIZE/2, y - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
            ctx.restore();
        }

        function getAreaCenter(area) {
            var coords = parseCoords(area.coords);
            if (!coords.length) return null;
            if (area.shape === 'rect' && coords.length >= 4) {
                return {
                    x: (Math.min(coords[0], coords[2]) + Math.max(coords[0], coords[2])) / 2,
                    y: (Math.min(coords[1], coords[3]) + Math.max(coords[1], coords[3])) / 2
                };
            } else if (area.shape === 'circle' && coords.length >= 3) {
                return { x: coords[0], y: coords[1] };
            } else if (area.shape === 'poly' && coords.length >= 6) {
                var cx = 0, cy = 0, n = coords.length / 2;
                for (var i = 0; i < coords.length; i += 2) {
                    cx += coords[i];
                    cy += coords[i + 1];
                }
                return { x: cx / n, y: cy / n };
            }
            return null;
        }

        function drawLines() {
            linesData.forEach(function(line) {
                var fromArea = getAreaById(line.from_areaid);
                var toArea = getAreaById(line.to_areaid);
                if (!fromArea || !toArea) return;
                var fromCenter = getAreaCenter(fromArea);
                var toCenter = getAreaCenter(toArea);
                if (!fromCenter || !toCenter) return;

                var isEraserHover = (currentTool === 'eraser' && line._eraserHover);

                ctx.save();
                if (isEraserHover) {
                    ctx.strokeStyle = '#dc3545';
                    ctx.lineWidth = 4;
                    ctx.setLineDash([6, 4]);
                } else {
                    ctx.strokeStyle = '#ff9800';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([8, 4]);
                }
                ctx.beginPath();
                ctx.moveTo(fromCenter.x, fromCenter.y);
                ctx.lineTo(toCenter.x, toCenter.y);
                ctx.stroke();

                // Draw arrowhead at destination
                var angle = Math.atan2(toCenter.y - fromCenter.y, toCenter.x - fromCenter.x);
                var arrowLen = 12;
                ctx.setLineDash([]);
                ctx.fillStyle = isEraserHover ? '#dc3545' : '#ff9800';
                ctx.beginPath();
                ctx.moveTo(toCenter.x, toCenter.y);
                ctx.lineTo(toCenter.x - arrowLen * Math.cos(angle - Math.PI / 6),
                           toCenter.y - arrowLen * Math.sin(angle - Math.PI / 6));
                ctx.lineTo(toCenter.x - arrowLen * Math.cos(angle + Math.PI / 6),
                           toCenter.y - arrowLen * Math.sin(angle + Math.PI / 6));
                ctx.closePath();
                ctx.fill();

                // Draw small circles at endpoints
                ctx.fillStyle = isEraserHover ? '#dc3545' : '#ff9800';
                ctx.beginPath();
                ctx.arc(fromCenter.x, fromCenter.y, 4, 0, 2 * Math.PI);
                ctx.fill();

                ctx.restore();
            });
        }

        function findLineAt(x, y) {
            var LINE_HIT_DISTANCE = 8;
            for (var i = linesData.length - 1; i >= 0; i--) {
                var line = linesData[i];
                var fromArea = getAreaById(line.from_areaid);
                var toArea = getAreaById(line.to_areaid);
                if (!fromArea || !toArea) continue;
                var fromCenter = getAreaCenter(fromArea);
                var toCenter = getAreaCenter(toArea);
                if (!fromCenter || !toCenter) continue;

                var dist = pointToSegmentDistance(x, y, fromCenter.x, fromCenter.y, toCenter.x, toCenter.y);
                if (dist <= LINE_HIT_DISTANCE) {
                    return line;
                }
            }
            return null;
        }

        function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
            var A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
            var dot = A * C + B * D;
            var lenSq = C * C + D * D;
            var param = lenSq !== 0 ? dot / lenSq : -1;
            var xx, yy;
            if (param < 0) { xx = x1; yy = y1; }
            else if (param > 1) { xx = x2; yy = y2; }
            else { xx = x1 + param * C; yy = y1 + param * D; }
            return Math.sqrt((px - xx) * (px - xx) + (py - yy) * (py - yy));
        }

        function findHandleAt(x, y, area) {
            if (!area) return null;
            var coords = parseCoords(area.coords);

            if (area.shape === 'rect') {
                var x1 = Math.min(coords[0], coords[2]);
                var y1 = Math.min(coords[1], coords[3]);
                var x2 = Math.max(coords[0], coords[2]);
                var y2 = Math.max(coords[1], coords[3]);
                var handles = [
                    {x: x1, y: y1, pos: 'nw'},
                    {x: (x1+x2)/2, y: y1, pos: 'n'},
                    {x: x2, y: y1, pos: 'ne'},
                    {x: x2, y: (y1+y2)/2, pos: 'e'},
                    {x: x2, y: y2, pos: 'se'},
                    {x: (x1+x2)/2, y: y2, pos: 's'},
                    {x: x1, y: y2, pos: 'sw'},
                    {x: x1, y: (y1+y2)/2, pos: 'w'}
                ];
                for (var i = 0; i < handles.length; i++) {
                    var dx = Math.abs(x - handles[i].x);
                    var dy = Math.abs(y - handles[i].y);
                    if (dx <= HANDLE_HIT_SIZE && dy <= HANDLE_HIT_SIZE) {
                        return handles[i].pos;
                    }
                }
            } else if (area.shape === 'circle') {
                var cx = coords[0], cy = coords[1], r = coords[2];
                var handles = [
                    {x: cx, y: cy - r, pos: 'n'},
                    {x: cx + r, y: cy, pos: 'e'},
                    {x: cx, y: cy + r, pos: 's'},
                    {x: cx - r, y: cy, pos: 'w'}
                ];
                for (var i = 0; i < handles.length; i++) {
                    var dx = Math.abs(x - handles[i].x);
                    var dy = Math.abs(y - handles[i].y);
                    if (dx <= HANDLE_HIT_SIZE && dy <= HANDLE_HIT_SIZE) {
                        return handles[i].pos;
                    }
                }
            } else if (area.shape === 'poly') {
                for (var i = 0; i < coords.length; i += 2) {
                    var dx = Math.abs(x - coords[i]);
                    var dy = Math.abs(y - coords[i+1]);
                    if (dx <= HANDLE_HIT_SIZE && dy <= HANDLE_HIT_SIZE) {
                        return i; // Return vertex index
                    }
                }
            }
            return null;
        }

        function findEdgeAt(x, y, coords) {
            var EDGE_THRESHOLD = 10; // Distance from edge to detect click
            
            for (var i = 0; i < coords.length; i += 2) {
                var x1 = coords[i];
                var y1 = coords[i + 1];
                var x2 = coords[(i + 2) % coords.length];
                var y2 = coords[(i + 3) % coords.length];
                
                // Calculate distance from point to line segment
                var A = x - x1;
                var B = y - y1;
                var C = x2 - x1;
                var D = y2 - y1;
                
                var dot = A * C + B * D;
                var lenSq = C * C + D * D;
                var param = lenSq !== 0 ? dot / lenSq : -1;
                
                var xx, yy;
                
                if (param < 0) {
                    xx = x1;
                    yy = y1;
                } else if (param > 1) {
                    xx = x2;
                    yy = y2;
                } else {
                    xx = x1 + param * C;
                    yy = y1 + param * D;
                }
                
                var dx = x - xx;
                var dy = y - yy;
                var distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= EDGE_THRESHOLD) {
                    return {after: i + 2}; // Insert after this vertex
                }
            }
            return null;
        }

        function parseCoords(coordsString) {
            if (!coordsString) {
                return [];
            }
            return coordsString.split(',').map(function(value) {
                return parseFloat(value);
            }).filter(function(value) {
                return !isNaN(value);
            });
        }

        // Toolbar button click handling
        var toolbarButtons = document.querySelectorAll('.toolbar-btn[data-tool]');
        toolbarButtons.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var tool = this.getAttribute('data-tool');
                currentTool = tool;
                // Update active state on all toolbar buttons
                toolbarButtons.forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                clearDrawing();
                // Update status
                if (tool === 'line') {
                    setStatus(data.strings.line_select_source || 'Click source shape');
                } else if (tool === 'eraser') {
                    setStatus(data.strings.eraser_hint || 'Click a shape or line to delete');
                } else {
                    setStatus('');
                }
            });
        });

        var finishPolyButton = document.getElementById('finish-poly');
        if (finishPolyButton) {
            finishPolyButton.addEventListener('click', function() {
                if (polyPoints.length >= 3) {
                    finishDrawing();
                }
            });
        }

        function clearDrawing() {
            drawing = false;
            draggingArea = false;
            resizingHandle = null;
            polyPoints = [];
            selectedAreaId = null;
            lineSourceAreaId = null;
            // Clear eraser hover state
            areasData.forEach(function(a) { a._eraserHover = false; });
            linesData.forEach(function(l) { l._eraserHover = false; });
            drawBase();
            if (finishPolyButton) {
                finishPolyButton.style.display = 'none';
            }
            closeAreaForm();
            if (currentTool === 'line') {
                setStatus(data.strings.line_select_source || 'Click source shape');
            } else if (currentTool === 'eraser') {
                setStatus(data.strings.eraser_hint || 'Click a shape or line to delete');
            } else {
                setStatus('');
            }
        }

        canvas.addEventListener('mousedown', function(e) {
            if (e.button === 2) {
                return;
            }
            var rect = canvas.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;

            // ===== HAND TOOL (select / drag / resize) =====
            if (currentTool === 'hand') {
                // Check handle of already-selected area
                var selectedArea = selectedAreaId ? getAreaById(selectedAreaId) : null;
                if (selectedArea) {
                    var handle = findHandleAt(x, y, selectedArea);
                    if (handle !== null) {
                        resizingHandle = handle;
                        dragStartX = x;
                        dragStartY = y;
                        dragOriginalCoords = parseCoords(selectedArea.coords);
                        drawBase();
                        return;
                    }
                }
                var hitArea = findAreaAt(x, y);
                if (hitArea) {
                    selectedAreaId = hitArea.id;
                    var handle = findHandleAt(x, y, hitArea);
                    if (handle !== null) {
                        resizingHandle = handle;
                        dragStartX = x;
                        dragStartY = y;
                        dragOriginalCoords = parseCoords(hitArea.coords);
                        drawBase();
                        return;
                    }
                    draggingArea = true;
                    dragStartX = x;
                    dragStartY = y;
                    dragOriginalCoords = parseCoords(hitArea.coords);
                    drawBase();
                    return;
                }
                // Clicked empty space — deselect
                selectedAreaId = null;
                drawBase();
                return;
            }

            // ===== ERASER TOOL =====
            if (currentTool === 'eraser') {
                // Check if clicking on a line first
                var hitLine = findLineAt(x, y);
                if (hitLine) {
                    if (confirm(data.strings.confirm_delete_line || 'Delete this line?')) {
                        deleteLine(hitLine);
                    }
                    return;
                }
                // Then check shapes
                var hitArea = findAreaAt(x, y);
                if (hitArea) {
                    if (confirm(data.strings.confirmdeletearea || 'Delete this area?')) {
                        deleteAreaViaAjax(hitArea);
                    }
                    return;
                }
                return;
            }

            // ===== LINE TOOL =====
            if (currentTool === 'line') {
                var hitArea = findAreaAt(x, y);
                if (!hitArea) {
                    setStatus(data.strings.line_select_source || 'Click source shape');
                    return;
                }
                if (lineSourceAreaId === null) {
                    lineSourceAreaId = hitArea.id;
                    selectedAreaId = hitArea.id;
                    drawBase();
                    setStatus((data.strings.line_select_dest || 'Now click destination shape') +
                              ' (' + (hitArea.title || 'Area #' + hitArea.id) + ' → ?)');
                } else {
                    if (hitArea.id === lineSourceAreaId) {
                        setStatus(data.strings.line_same_area || 'Cannot connect shape to itself');
                        return;
                    }
                    // Check for duplicate
                    var dup = linesData.some(function(l) {
                        return l.from_areaid === lineSourceAreaId && l.to_areaid === hitArea.id;
                    });
                    if (dup) {
                        setStatus(data.strings.line_duplicate || 'This connection already exists');
                        lineSourceAreaId = null;
                        selectedAreaId = null;
                        drawBase();
                        return;
                    }
                    saveLine(lineSourceAreaId, hitArea.id);
                    lineSourceAreaId = null;
                    selectedAreaId = null;
                }
                return;
            }

            // ===== SHAPE TOOLS (rect, circle, poly) =====
            var currentShape = currentTool; // rect, circle, poly

            if (currentShape !== 'poly' && polyPoints.length === 0) {
                // First check if clicking on a handle of the selected area
                var selectedArea = selectedAreaId ? getAreaById(selectedAreaId) : null;
                if (selectedArea) {
                    var handle = findHandleAt(x, y, selectedArea);
                    if (handle !== null) {
                        resizingHandle = handle;
                        dragStartX = x;
                        dragStartY = y;
                        dragOriginalCoords = parseCoords(selectedArea.coords);
                        drawBase();
                        return;
                    }
                }
                
                // Then check if clicking on an area
                var hitArea = findAreaAt(x, y);
                if (hitArea) {
                    selectedAreaId = hitArea.id;
                    // Check if clicking on a handle of this newly selected area
                    var handle = findHandleAt(x, y, hitArea);
                    if (handle !== null) {
                        resizingHandle = handle;
                        dragStartX = x;
                        dragStartY = y;
                        dragOriginalCoords = parseCoords(hitArea.coords);
                        drawBase();
                        return;
                    }
                    // Otherwise, dragging the area
                    draggingArea = true;
                    dragStartX = x;
                    dragStartY = y;
                    dragOriginalCoords = parseCoords(hitArea.coords);
                    drawBase();
                    return;
                }
                
                // Clicked outside any area, deselect
                selectedAreaId = null;
                drawBase();
            }

            if (currentShape === 'poly') {
                polyPoints.push({x: x, y: y});
                drawBase();
                drawPolygon();
                if (polyPoints.length >= 3 && finishPolyButton) {
                    finishPolyButton.style.display = 'inline-block';
                }
            } else {
                drawing = true;
                startX = x;
                startY = y;
            }
        });

        canvas.addEventListener('mousemove', function(e) {
            var rect = canvas.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            var currentShape = currentTool;

            // ===== HAND TOOL: cursor feedback =====
            if (currentTool === 'hand') {
                if (resizingHandle !== null) {
                    var resizeArea = getAreaById(selectedAreaId);
                    if (resizeArea) {
                        var newCoords = resizeShape(resizeArea.shape, dragOriginalCoords, resizingHandle, x, y, dragStartX, dragStartY);
                        resizeArea.coords = newCoords.join(',');
                        drawBase();
                    }
                    return;
                }
                if (draggingArea) {
                    var dragArea = getAreaById(selectedAreaId);
                    if (dragArea) {
                        var dx = x - dragStartX;
                        var dy = y - dragStartY;
                        var moved = applyDeltaToCoords(dragOriginalCoords, dx, dy, dragArea.shape);
                        dragArea.coords = moved.join(',');
                        drawBase();
                    }
                    return;
                }
                // Cursor feedback
                var selectedArea = selectedAreaId ? getAreaById(selectedAreaId) : null;
                var handle = selectedArea ? findHandleAt(x, y, selectedArea) : null;
                if (handle !== null) {
                    if (selectedArea.shape === 'rect') {
                        var cursorMap = {'nw':'nw-resize','n':'n-resize','ne':'ne-resize','e':'e-resize','se':'se-resize','s':'s-resize','sw':'sw-resize','w':'w-resize'};
                        canvas.style.cursor = cursorMap[handle] || 'pointer';
                    } else if (selectedArea.shape === 'circle') {
                        var cursorMap = {'n':'n-resize','e':'e-resize','s':'s-resize','w':'w-resize'};
                        canvas.style.cursor = cursorMap[handle] || 'pointer';
                    } else {
                        canvas.style.cursor = 'pointer';
                    }
                } else {
                    var hitArea = findAreaAt(x, y);
                    canvas.style.cursor = hitArea ? 'move' : 'default';
                }
                return;
            }

            // ===== ERASER TOOL: hover feedback =====
            if (currentTool === 'eraser') {
                var anyHover = false;
                areasData.forEach(function(a) { a._eraserHover = false; });
                linesData.forEach(function(l) { l._eraserHover = false; });
                var hitLine = findLineAt(x, y);
                if (hitLine) {
                    hitLine._eraserHover = true;
                    canvas.style.cursor = 'pointer';
                    anyHover = true;
                } else {
                    var hitArea = findAreaAt(x, y);
                    if (hitArea) {
                        hitArea._eraserHover = true;
                        canvas.style.cursor = 'pointer';
                        anyHover = true;
                    }
                }
                if (!anyHover) {
                    canvas.style.cursor = 'not-allowed';
                }
                drawBase();
                return;
            }

            // ===== LINE TOOL: cursor feedback =====
            if (currentTool === 'line') {
                var hitArea = findAreaAt(x, y);
                canvas.style.cursor = hitArea ? 'pointer' : 'default';
                // Draw rubber-band line from source
                if (lineSourceAreaId !== null) {
                    drawBase();
                    var src = getAreaById(lineSourceAreaId);
                    if (src) {
                        var c = getAreaCenter(src);
                        if (c) {
                            ctx.save();
                            ctx.strokeStyle = '#ff9800';
                            ctx.lineWidth = 2;
                            ctx.setLineDash([4, 4]);
                            ctx.beginPath();
                            ctx.moveTo(c.x, c.y);
                            ctx.lineTo(x, y);
                            ctx.stroke();
                            ctx.restore();
                        }
                    }
                }
                return;
            }

            // ===== SHAPE TOOLS =====

            if (resizingHandle !== null) {
                var resizeArea = getAreaById(selectedAreaId);
                if (!resizeArea) {
                    return;
                }
                var newCoords = resizeShape(resizeArea.shape, dragOriginalCoords, resizingHandle, x, y, dragStartX, dragStartY);
                resizeArea.coords = newCoords.join(',');
                drawBase();
                return;
            }

            if (draggingArea) {
                var dragArea = getAreaById(selectedAreaId);
                if (!dragArea) {
                    return;
                }

                var dx = x - dragStartX;
                var dy = y - dragStartY;
                var moved = applyDeltaToCoords(dragOriginalCoords, dx, dy, dragArea.shape);
                dragArea.coords = moved.join(',');
                drawBase();
                return;
            }

            // Update cursor based on what's under the mouse
            if (!drawing && currentShape !== 'poly') {
                var selectedArea = selectedAreaId ? getAreaById(selectedAreaId) : null;
                var handle = selectedArea ? findHandleAt(x, y, selectedArea) : null;
                
                if (handle !== null) {
                    // Over a handle - show resize cursor
                    if (selectedArea.shape === 'rect') {
                        var cursorMap = {
                            'nw': 'nw-resize', 'n': 'n-resize', 'ne': 'ne-resize',
                            'e': 'e-resize', 'se': 'se-resize', 's': 's-resize',
                            'sw': 'sw-resize', 'w': 'w-resize'
                        };
                        canvas.style.cursor = cursorMap[handle] || 'pointer';
                    } else if (selectedArea.shape === 'circle') {
                        var cursorMap = {'n': 'n-resize', 'e': 'e-resize', 's': 's-resize', 'w': 'w-resize'};
                        canvas.style.cursor = cursorMap[handle] || 'pointer';
                    } else if (selectedArea.shape === 'poly') {
                        canvas.style.cursor = 'pointer';
                    }
                } else if (selectedArea && selectedArea.shape === 'poly') {
                    // Check if over an edge for adding vertex
                    var coords = parseCoords(selectedArea.coords);
                    var edge = findEdgeAt(x, y, coords);
                    if (edge !== null) {
                        canvas.style.cursor = 'copy'; // Indicates can add vertex
                    } else {
                        var hitArea = findAreaAt(x, y);
                        canvas.style.cursor = hitArea ? 'move' : 'crosshair';
                    }
                } else {
                    var hitArea = findAreaAt(x, y);
                    if (hitArea) {
                        // Over an area - show move cursor
                        canvas.style.cursor = 'move';
                    } else {
                        // Not over anything - show crosshair for drawing
                        canvas.style.cursor = 'crosshair';
                    }
                }
            }

            if (!drawing || currentShape === 'poly') {
                return;
            }

            drawBase();

            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 2;
            ctx.beginPath();

            if (currentShape === 'rect') {
                ctx.rect(startX, startY, x - startX, y - startY);
            } else if (currentShape === 'circle') {
                // Draw circle from corner to corner (like rectangle)
                var cx = (startX + x) / 2;
                var cy = (startY + y) / 2;
                var radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2)) / 2;
                ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
            }

            ctx.stroke();
        });

        canvas.addEventListener('dblclick', function(e) {
            e.preventDefault();
            var rect = canvas.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            
            var selectedArea = selectedAreaId ? getAreaById(selectedAreaId) : null;
            if (selectedArea && selectedArea.shape === 'poly') {
                var coords = parseCoords(selectedArea.coords);
                
                // Check if double-clicking on a vertex handle (to delete)
                var handle = findHandleAt(x, y, selectedArea);
                if (handle !== null && coords.length > 6) { // Keep at least 3 vertices
                    coords.splice(handle, 2); // Remove x,y pair
                    selectedArea.coords = coords.join(',');
                    drawBase();
                    return;
                }
                
                // Check if double-clicking on an edge (to add vertex)
                var edgeInfo = findEdgeAt(x, y, coords);
                if (edgeInfo !== null) {
                    // Insert new vertex after the clicked edge
                    coords.splice(edgeInfo.after, 0, x, y);
                    selectedArea.coords = coords.join(',');
                    drawBase();
                    return;
                }
            }
        });

        canvas.addEventListener('mouseup', function(e) {
            if (resizingHandle !== null) {
                var resizedArea = getAreaById(selectedAreaId);
                resizingHandle = null;
                if (resizedArea) {
                    saveAreaCoords(resizedArea);
                }
                return;
            }

            if (draggingArea) {
                var draggedArea = getAreaById(selectedAreaId);
                draggingArea = false;
                if (draggedArea) {
                    saveAreaCoords(draggedArea);
                }
                return;
            }

            if (!drawing) {
                return;
            }

            var rect = canvas.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;

            drawing = false;
            finishDrawing(x, y);
        });

        canvas.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            var rect = canvas.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            var area = findAreaAt(x, y);
            if (area) {
                selectedAreaId = area.id;
                drawBase();
                openEditForm(area);
            }
        });

        function drawPolygon() {
            if (polyPoints.length < 2) {
                return;
            }

            ctx.strokeStyle = '#FF0000';
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(polyPoints[0].x, polyPoints[0].y);

            for (var i = 1; i < polyPoints.length; i++) {
                ctx.lineTo(polyPoints[i].x, polyPoints[i].y);
            }

            ctx.stroke();

            polyPoints.forEach(function(point) {
                ctx.fillStyle = '#FF0000';
                ctx.beginPath();
                ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
                ctx.fill();
            });
        }

        function finishDrawing(endX, endY) {
            var coords = '';
            var shape = currentTool; // rect, circle, or poly

            if (shape === 'rect') {
                coords = Math.round(startX) + ',' + Math.round(startY) + ',' +
                    Math.round(endX) + ',' + Math.round(endY);
            } else if (shape === 'circle') {
                // Calculate circle from corner to corner
                var cx = (startX + endX) / 2;
                var cy = (startY + endY) / 2;
                var radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)) / 2;
                coords = Math.round(cx) + ',' + Math.round(cy) + ',' + Math.round(radius);
            } else if (shape === 'poly') {
                coords = polyPoints.map(function(p) {
                    return Math.round(p.x) + ',' + Math.round(p.y);
                }).join(',');
            }

            document.getElementById('form-shape').value = shape;
            document.getElementById('form-coords').value = coords;
            document.getElementById('form-areaid').value = '';
            document.getElementById('area-form-title').textContent = (data.strings && data.strings.addarea) ? data.strings.addarea : 'Add area';
            openAreaForm();

            if (shape === 'poly' && finishPolyButton) {
                finishPolyButton.style.display = 'none';
            }
        }

        // Helper function for textarea autoheight
        function autoResizeTextarea(textarea) {
            if (!textarea) return;
            textarea.style.height = 'auto';
            textarea.style.height = (textarea.scrollHeight) + 'px';
        }

        function openAreaForm() {
            var overlay = document.getElementById('imagemap-overlay');
            var container = document.getElementById('area-form-container');
            if (overlay) {
                overlay.style.display = 'block';
            }
            if (container) {
                container.style.display = 'block';
            }
            // Resize textareas after form is visible
            setTimeout(function() {
                autoResizeTextarea(document.getElementById('activefilter'));
                autoResizeTextarea(document.getElementById('inactivefilter'));
            }, 10);
        }

        function closeAreaForm() {
            var overlay = document.getElementById('imagemap-overlay');
            var container = document.getElementById('area-form-container');
            if (overlay) {
                overlay.style.display = 'none';
            }
            if (container) {
                container.style.display = 'none';
            }
        }

        var closeButton = document.getElementById('close-area-form');
        if (closeButton) {
            closeButton.addEventListener('click', function() {
                closeAreaForm();
            });
        }

        var overlayEl = document.getElementById('imagemap-overlay');
        if (overlayEl) {
            overlayEl.addEventListener('click', function() {
                closeAreaForm();
            });
        }

        function openEditForm(area) {
            selectedAreaId = area.id;
            drawBase();
            document.getElementById('form-areaid').value = area.id;
            document.getElementById('form-shape').value = area.shape;
            document.getElementById('form-coords').value = area.coords;
            document.getElementById('title').value = area.title || '';
            var targetSelect = document.getElementById('target-select');
            if (targetSelect && area.targettype && area.targetid) {
                targetSelect.value = area.targettype + ':' + area.targetid;
                setTargetFromSelect();
            }
            document.getElementById('activefilter').value = area.activefilter || 'none';
            document.getElementById('inactivefilter').value = area.inactivefilter || 'filter: grayscale(100%);';
            document.getElementById('area-form-title').textContent = (data.strings && data.strings.editarea) ? data.strings.editarea : 'Edit area';
            openAreaForm();
            // Trigger canvas preview updates after setting values
            if (typeof CSSPreview !== 'undefined') {
                var activeCanvas = document.getElementById('activefilter-preview-canvas');
                var inactiveCanvas = document.getElementById('inactivefilter-preview-canvas');
                if (activeCanvas) CSSPreview.draw(activeCanvas, area.activefilter || 'none');
                if (inactiveCanvas) CSSPreview.draw(inactiveCanvas, area.inactivefilter || 'filter: grayscale(100%);');
            }
        }

        function setTargetFromSelect() {
            var targetSelect = document.getElementById('target-select');
            var targetTypeInput = document.getElementById('form-targettype');
            var targetIdInput = document.getElementById('form-targetid');
            if (!targetSelect || !targetTypeInput || !targetIdInput) {
                return;
            }
            var value = targetSelect.value || '';
            var parts = value.split(':');
            targetTypeInput.value = parts[0] || '';
            targetIdInput.value = parts[1] || '';
        }

        var targetSelect = document.getElementById('target-select');
        if (targetSelect) {
            targetSelect.addEventListener('change', setTargetFromSelect);
            setTargetFromSelect();
        }

        // ===== CSS Examples Modal Management =====
        var currentModalTargetField = null;

        function initializeCSSExamplesModal() {
            // Find all "View Examples" buttons
            var openButtons = document.querySelectorAll('.open-css-examples-btn');
            openButtons.forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    var filterType = this.getAttribute('data-filter-type');
                    var targetField = this.getAttribute('data-target-field');
                    openCSSExamplesModal(filterType, targetField);
                });
            });

            // Setup tab switching in modal
            var activeTabBtn = document.getElementById('examples-active-tab');
            var inactiveTabBtn = document.getElementById('examples-inactive-tab');
            
            if (activeTabBtn) {
                activeTabBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    switchTab('active');
                });
            }
            
            if (inactiveTabBtn) {
                inactiveTabBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    switchTab('inactive');
                });
            }

            // Handle example card selection
            var selectBtns = document.querySelectorAll('.select-example-btn');
            selectBtns.forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    var card = this.closest('.css-example-card');
                    if (card && currentModalTargetField) {
                        var cssValue = card.getAttribute('data-css');
                        var targetField = document.getElementById(currentModalTargetField);
                        if (targetField) {
                            targetField.value = cssValue;
                            // Trigger input event to update preview
                            targetField.dispatchEvent(new Event('input'));
                        }
                        closeCSSExamplesModal();
                    }
                });
            });

            // Initialize canvas previews in modal
            setTimeout(function() {
                initializeCSSPreviews();
            }, 100);
        }

        function switchTab(tabName) {
            // Remove active class from all tabs and panes
            var allTabBtns = document.querySelectorAll('#css-examples-modal .nav-link');
            var allTabPanes = document.querySelectorAll('#css-examples-modal .tab-pane');
            
            allTabBtns.forEach(function(btn) {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });
            
            allTabPanes.forEach(function(pane) {
                pane.classList.remove('active', 'show');
            });
            
            // Add active class to selected tab
            if (tabName === 'active') {
                var activeTabBtn = document.getElementById('examples-active-tab');
                var activePane = document.getElementById('examples-active');
                if (activeTabBtn) {
                    activeTabBtn.classList.add('active');
                    activeTabBtn.setAttribute('aria-selected', 'true');
                }
                if (activePane) {
                    activePane.classList.add('active', 'show');
                }
            } else if (tabName === 'inactive') {
                var inactiveTabBtn = document.getElementById('examples-inactive-tab');
                var inactivePane = document.getElementById('examples-inactive');
                if (inactiveTabBtn) {
                    inactiveTabBtn.classList.add('active');
                    inactiveTabBtn.setAttribute('aria-selected', 'true');
                }
                if (inactivePane) {
                    inactivePane.classList.add('active', 'show');
                }
            }
            
            // Reinitialize canvas previews for the active tab
            initializeCSSPreviews();
        }

        function openCSSExamplesModal(filterType, targetField) {
            currentModalTargetField = targetField;
            var modal = document.getElementById('css-examples-modal');
            if (modal) {
                // Use Bootstrap modal if available
                if (typeof bootstrap !== 'undefined') {
                    var bsModal = bootstrap.Modal.getOrCreateInstance(modal);
                    bsModal.show();
                    
                    // Switch to appropriate tab
                    setTimeout(function() {
                        switchTab(filterType);
                    }, 100);
                } else {
                    // Fallback for non-Bootstrap environments
                    modal.style.display = 'block';
                    modal.classList.add('show');
                    switchTab(filterType);
                }
            }
        }

        function closeCSSExamplesModal() {
            currentModalTargetField = null;
            var modal = document.getElementById('css-examples-modal');
            if (modal) {
                if (typeof bootstrap !== 'undefined') {
                    var bsModal = bootstrap.Modal.getInstance(modal);
                    if (bsModal) {
                        bsModal.hide();
                    }
                } else {
                    modal.style.display = 'none';
                    modal.classList.remove('show');
                }
            }
        }

        function initializeCSSPreviews() {
            var canvases = document.querySelectorAll('.css-preview-canvas');
            canvases.forEach(function(canvas) {
                var css = canvas.getAttribute('data-css') || '';
                CSSPreview.draw(canvas, css);
            });
        }

        // Canvas previews initialized by CSSPreview utility (css_preview.js)

        // Initialize modal on page load
        initializeCSSExamplesModal();

        var areaForm = document.getElementById('area-form');
        if (areaForm) {
            areaForm.addEventListener('submit', function() {
                setTargetFromSelect();
            });
        }

        // Setup canvas preview updates for CSS filters
        var activeFilterInput = document.getElementById('activefilter');
        var activeFilterCanvas = document.getElementById('activefilter-preview-canvas');
        if (activeFilterInput && activeFilterCanvas) {
            activeFilterInput.addEventListener('input', function() {
                var cssValue = this.value.trim();
                autoResizeTextarea(this);
                if (typeof CSSPreview !== 'undefined') {
                    CSSPreview.draw(activeFilterCanvas, cssValue || 'none');
                }
            });
            // Initial render and resize
            if (typeof CSSPreview !== 'undefined') {
                CSSPreview.draw(activeFilterCanvas, activeFilterInput.value || 'none');
            }
            autoResizeTextarea(activeFilterInput);
        }

        var inactiveFilterInput = document.getElementById('inactivefilter');
        var inactiveFilterCanvas = document.getElementById('inactivefilter-preview-canvas');
        if (inactiveFilterInput && inactiveFilterCanvas) {
            inactiveFilterInput.addEventListener('input', function() {
                var cssValue = this.value.trim();
                autoResizeTextarea(this);
                if (typeof CSSPreview !== 'undefined') {
                    CSSPreview.draw(inactiveFilterCanvas, cssValue || 'filter: grayscale(100%);');
                }
            });
            // Initial render and resize
            if (typeof CSSPreview !== 'undefined') {
                CSSPreview.draw(inactiveFilterCanvas, inactiveFilterInput.value || 'filter: grayscale(100%);');
            }
            autoResizeTextarea(inactiveFilterInput);
        }


        function findAreaAt(x, y) {
            for (var i = areasData.length - 1; i >= 0; i--) {
                var area = areasData[i];
                if (isPointInArea(x, y, area)) {
                    return area;
                }
            }
            return null;
        }

        function getAreaById(id) {
            for (var i = 0; i < areasData.length; i++) {
                if (areasData[i].id === id) {
                    return areasData[i];
                }
            }
            return null;
        }

        function isPointInArea(x, y, area) {
            var coords = parseCoords(area.coords);
            if (area.shape === 'rect' && coords.length >= 4) {
                var x1 = Math.min(coords[0], coords[2]);
                var y1 = Math.min(coords[1], coords[3]);
                var x2 = Math.max(coords[0], coords[2]);
                var y2 = Math.max(coords[1], coords[3]);
                return x >= x1 && x <= x2 && y >= y1 && y <= y2;
            }
            if (area.shape === 'circle' && coords.length >= 3) {
                var dx = x - coords[0];
                var dy = y - coords[1];
                return (dx * dx + dy * dy) <= (coords[2] * coords[2]);
            }
            if (area.shape === 'poly' && coords.length >= 6) {
                return pointInPolygon(x, y, coords);
            }
            return false;
        }

        function applyDeltaToCoords(coords, dx, dy, shape) {
            var moved = [];
            if (shape === 'circle') {
                // Circle: [cx, cy, radius] - only move center, keep radius
                moved.push(Math.round(coords[0] + dx));
                moved.push(Math.round(coords[1] + dy));
                moved.push(Math.round(coords[2])); // radius stays the same
            } else {
                // Rectangle and polygon: all values are x,y pairs
                for (var i = 0; i < coords.length; i += 2) {
                    moved.push(Math.round(coords[i] + dx));
                    moved.push(Math.round(coords[i + 1] + dy));
                }
            }
            return moved;
        }

        function resizeShape(shape, originalCoords, handle, mouseX, mouseY, startMouseX, startMouseY) {
            var newCoords = originalCoords.slice();

            if (shape === 'rect') {
                var x1 = originalCoords[0];
                var y1 = originalCoords[1];
                var x2 = originalCoords[2];
                var y2 = originalCoords[3];
                var dx = mouseX - startMouseX;
                var dy = mouseY - startMouseY;

                switch(handle) {
                    case 'nw': newCoords = [x1 + dx, y1 + dy, x2, y2]; break;
                    case 'n':  newCoords = [x1, y1 + dy, x2, y2]; break;
                    case 'ne': newCoords = [x1, y1 + dy, x2 + dx, y2]; break;
                    case 'e':  newCoords = [x1, y1, x2 + dx, y2]; break;
                    case 'se': newCoords = [x1, y1, x2 + dx, y2 + dy]; break;
                    case 's':  newCoords = [x1, y1, x2, y2 + dy]; break;
                    case 'sw': newCoords = [x1 + dx, y1, x2, y2 + dy]; break;
                    case 'w':  newCoords = [x1 + dx, y1, x2, y2]; break;
                }
            } else if (shape === 'circle') {
                var cx = originalCoords[0];
                var cy = originalCoords[1];
                var dx = mouseX - cx;
                var dy = mouseY - cy;
                var newRadius = Math.sqrt(dx * dx + dy * dy);
                newCoords = [cx, cy, Math.round(newRadius)];
            } else if (shape === 'poly') {
                // handle is the vertex index
                var vertexIndex = handle;
                newCoords = originalCoords.slice();
                newCoords[vertexIndex] = mouseX;
                newCoords[vertexIndex + 1] = mouseY;
            }

            return newCoords;
        }

        function pointInPolygon(x, y, coords) {
            var inside = false;
            for (var i = 0, j = coords.length - 2; i < coords.length; i += 2) {
                var xi = coords[i];
                var yi = coords[i + 1];
                var xj = coords[j];
                var yj = coords[j + 1];
                var intersect = ((yi > y) !== (yj > y)) &&
                    (x < (xj - xi) * (y - yi) / (yj - yi + 0.00001) + xi);
                if (intersect) {
                    inside = !inside;
                }
                j = i;
            }
            return inside;
        }

        // ===== AJAX: Save area coords (move/resize) =====
        function saveAreaCoords(area) {
            var params = new URLSearchParams();
            params.append('sesskey', data.sesskey || '');
            params.append('cmid', data.cmid || '');
            params.append('areaid', area.id);
            params.append('coords', area.coords);

            fetch(M.cfg.wwwroot + '/mod/imagemap/area_update_coords.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: params.toString()
            })
            .then(function(resp) { return resp.json(); })
            .then(function(result) {
                if (!result.success) {
                    console.error('Error saving coords:', result.error);
                    setStatus(result.error || 'Error saving position');
                }
            })
            .catch(function(err) {
                console.error('Error saving coords:', err);
                setStatus('Error saving position');
            });
        }

        // ===== AJAX: Save line =====
        function saveLine(fromAreaId, toAreaId) {
            var params = new URLSearchParams();
            params.append('sesskey', data.sesskey || '');
            params.append('cmid', data.cmid || '');
            params.append('imagemapid', data.imagemapid || '');
            params.append('from_areaid', fromAreaId);
            params.append('to_areaid', toAreaId);

            fetch(M.cfg.wwwroot + '/mod/imagemap/line_save.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: params.toString()
            })
            .then(function(resp) { return resp.json(); })
            .then(function(result) {
                if (result.success) {
                    linesData.push({
                        id: result.id,
                        from_areaid: fromAreaId,
                        to_areaid: toAreaId
                    });
                    drawBase();
                    setStatus(data.strings.line_saved || 'Line saved');
                    setTimeout(function() {
                        setStatus(data.strings.line_select_source || 'Click source shape');
                    }, 1500);
                } else {
                    setStatus(result.error || 'Error saving line');
                }
            })
            .catch(function(err) {
                console.error('Error saving line:', err);
                setStatus('Error saving line');
            });
        }

        // ===== AJAX: Delete line =====
        function deleteLine(line) {
            var params = new URLSearchParams();
            params.append('sesskey', data.sesskey || '');
            params.append('cmid', data.cmid || '');
            params.append('lineid', line.id);

            fetch(M.cfg.wwwroot + '/mod/imagemap/line_delete.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: params.toString()
            })
            .then(function(resp) { return resp.json(); })
            .then(function(result) {
                if (result.success) {
                    linesData = linesData.filter(function(l) { return l.id !== line.id; });
                    drawBase();
                    setStatus(data.strings.line_deleted || 'Line deleted');
                    setTimeout(function() {
                        setStatus(data.strings.eraser_hint || 'Click a shape or line to delete');
                    }, 1500);
                } else {
                    setStatus(result.error || 'Error deleting line');
                }
            })
            .catch(function(err) {
                console.error('Error deleting line:', err);
                setStatus('Error deleting line');
            });
        }

        // ===== AJAX: Delete area (eraser tool) =====
        function deleteAreaViaAjax(area) {
            var deleteUrl = M.cfg.wwwroot + '/mod/imagemap/areas.php?id=' +
                encodeURIComponent(data.cmid || '') +
                '&action=delete&areaid=' + encodeURIComponent(area.id) +
                '&sesskey=' + encodeURIComponent(data.sesskey || '');
            // Redirect to delete (same as table delete link)
            window.location.href = deleteUrl;
        }
    }
};
