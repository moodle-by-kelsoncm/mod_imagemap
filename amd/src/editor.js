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
 * Area editor of the image map: draw, move and resize areas, connect them with lines
 * and edit their target and CSS.
 *
 * The image URL, areas, lines and strings come from the data-config attribute of the
 * container rendered by the mod_imagemap/editor template.
 *
 * @module     mod_imagemap/editor
 * @copyright  2026 Kelson C. M.
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import $ from 'jquery';
import Ajax from 'core/ajax';
import Config from 'core/config';
import Notification from 'core/notification';
import {getString} from 'core/str';
import {draw as drawPreview} from 'mod_imagemap/css_preview';

/**
 * Start the editor.
 *
 * @param {string} selector Selector of the container with the data-config attribute.
 */
export const init = (selector) => {
    const container = document.querySelector(selector);
    if (!container) {
        return;
    }
    const data = JSON.parse(container.dataset.config || '{}');
    data.strings = data.strings || {};
    let canvas = document.getElementById('imagemap-canvas');
    if (!canvas) {
        return;
    }
    let ctx = canvas.getContext('2d');
    let img = new Image();
    let drawing = false;
    let draggingArea = false;
    let resizingHandle = null;
    let startX, startY;
    let dragStartX, dragStartY;
    let dragOriginalCoords = [];
    let polyPoints = [];
    let currentTool = 'hand'; // Active tool: hand, rect, circle, poly, line, eraser
    let areasData = data.areasData || [];
    let linesData = data.linesData || [];
    let selectedAreaId = null;
    let HANDLE_SIZE = 8;
    let HANDLE_HIT_SIZE = 12;

    // Line tool state
    let lineSourceAreaId = null;
    let statusEl = document.getElementById('toolbar-status');

    /**
     * Set status.
     * @param {string} msg
     */
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
        setStatus('Failed to load image');
    };
    img.src = data.imageUrl || '';

    /**
     * Redraw the image, the lines and the areas.
     */
    function drawBase() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        drawExistingAreas();
        drawLines();
    }

    /**
     * Draw existing areas.
     */
    function drawExistingAreas() {
        areasData.forEach(function(area) {
            drawArea(area, area.id === selectedAreaId);
        });
        // Draw handles for selected area
        if (selectedAreaId) {
            let selectedArea = getAreaById(selectedAreaId);
            if (selectedArea) {
                drawHandles(selectedArea);
            }
        }
    }

    /**
     * Draw area.
     * @param {Object} area
     * @param {boolean} highlight
     */
    function drawArea(area, highlight) {
        let coords = parseCoords(area.coords);
        if (!coords.length) {
            return;
        }

        drawAreaFilter(area, coords);

        // Eraser hover highlight
        let isEraserHover = (currentTool === 'eraser' && area._eraserHover);

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
            let x1 = Math.min(coords[0], coords[2]);
            let y1 = Math.min(coords[1], coords[3]);
            let x2 = Math.max(coords[0], coords[2]);
            let y2 = Math.max(coords[1], coords[3]);
            let w = x2 - x1;
            let h = y2 - y1;
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
            for (let i = 2; i < coords.length; i += 2) {
                ctx.lineTo(coords[i], coords[i + 1]);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Apply css text to style.
     * @param {*} style
     * @param {string} cssText
     */
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
            let parts = rule.split(':');
            if (parts.length >= 2) {
                let prop = parts.shift().trim();
                let value = parts.join(':').trim();
                style.setProperty(prop, value);
            }
        });
    }

    /**
     * Get area filter value.
     * @param {Object} area
     */
    function getAreaFilterValue(area) {
        let cssText = (area.active ? area.activefilter : area.inactivefilter) || '';
        if (!cssText) {
            cssText = area.active ? 'none' : 'filter: grayscale(100%);';
        }

        let tmp = document.createElement('div');
        applyCssTextToStyle(tmp.style, cssText);
        return tmp.style.filter || '';
    }

    /**
     * Clip area path.
     * @param {Object} area
     * @param {number[]} coords
     */
    function clipAreaPath(area, coords) {
        if (area.shape === 'rect' && coords.length >= 4) {
            let x1 = Math.min(coords[0], coords[2]);
            let y1 = Math.min(coords[1], coords[3]);
            let w = Math.abs(coords[2] - coords[0]);
            let h = Math.abs(coords[3] - coords[1]);
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
            for (let i = 2; i < coords.length; i += 2) {
                ctx.lineTo(coords[i], coords[i + 1]);
            }
            ctx.closePath();
            return true;
        }

        return false;
    }

    /**
     * Draw area filter.
     * @param {Object} area
     * @param {number[]} coords
     */
    function drawAreaFilter(area, coords) {
        let filterValue = getAreaFilterValue(area);
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

    /**
     * Draw handles.
     * @param {Object} area
     */
    function drawHandles(area) {
        let coords = parseCoords(area.coords);

        if (area.shape === 'rect') {
            let x1 = Math.min(coords[0], coords[2]);
            let y1 = Math.min(coords[1], coords[3]);
            let x2 = Math.max(coords[0], coords[2]);
            let y2 = Math.max(coords[1], coords[3]);
            let handles = [
                {x: x1, y: y1, cursor: 'nw-resize', pos: 'nw'},
                {x: (x1 + x2) / 2, y: y1, cursor: 'n-resize', pos: 'n'},
                {x: x2, y: y1, cursor: 'ne-resize', pos: 'ne'},
                {x: x2, y: (y1 + y2) / 2, cursor: 'e-resize', pos: 'e'},
                {x: x2, y: y2, cursor: 'se-resize', pos: 'se'},
                {x: (x1 + x2) / 2, y: y2, cursor: 's-resize', pos: 's'},
                {x: x1, y: y2, cursor: 'sw-resize', pos: 'sw'},
                {x: x1, y: (y1 + y2) / 2, cursor: 'w-resize', pos: 'w'}
            ];
            handles.forEach(function(h) {
                drawHandle(h.x, h.y);
            });
        } else if (area.shape === 'circle') {
            let cx = coords[0];
            let cy = coords[1];
            let r = coords[2];
            let handles = [
                {x: cx, y: cy - r, pos: 'n'},
                {x: cx + r, y: cy, pos: 'e'},
                {x: cx, y: cy + r, pos: 's'},
                {x: cx - r, y: cy, pos: 'w'}
            ];
            handles.forEach(function(h) {
                drawHandle(h.x, h.y);
            });
        } else if (area.shape === 'poly') {
            for (let i = 0; i < coords.length; i += 2) {
                drawHandle(coords[i], coords[i + 1]);
            }
        }
    }

    /**
     * Draw handle.
     * @param {number} x
     * @param {number} y
     */
    function drawHandle(x, y) {
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#FF6F00';
        ctx.lineWidth = 2;
        ctx.fillRect(x - HANDLE_SIZE / 2, y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
        ctx.strokeRect(x - HANDLE_SIZE / 2, y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
        ctx.restore();
    }

    /**
     * Centre of an area.
     * @param {Object} area
     */
    function getAreaCenter(area) {
        let coords = parseCoords(area.coords);
        if (!coords.length) {
            return null;
        }
        if (area.shape === 'rect' && coords.length >= 4) {
            return {
                x: (Math.min(coords[0], coords[2]) + Math.max(coords[0], coords[2])) / 2,
                y: (Math.min(coords[1], coords[3]) + Math.max(coords[1], coords[3])) / 2
            };
        } else if (area.shape === 'circle' && coords.length >= 3) {
            return {x: coords[0], y: coords[1]};
        } else if (area.shape === 'poly' && coords.length >= 6) {
            let cx = 0;
            let cy = 0;
            let n = coords.length / 2;
            for (let i = 0; i < coords.length; i += 2) {
                cx += coords[i];
                cy += coords[i + 1];
            }
            return {x: cx / n, y: cy / n};
        }
        return null;
    }

    /**
     * Draw lines.
     */
    function drawLines() {
        linesData.forEach(function(line) {
            let fromArea = getAreaById(line.from_areaid);
            let toArea = getAreaById(line.to_areaid);
            if (!fromArea || !toArea) {
                return;
            }
            let fromCenter = getAreaCenter(fromArea);
            let toCenter = getAreaCenter(toArea);
            if (!fromCenter || !toCenter) {
                return;
            }

            let isEraserHover = (currentTool === 'eraser' && line._eraserHover);

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
            let angle = Math.atan2(toCenter.y - fromCenter.y, toCenter.x - fromCenter.x);
            let arrowLen = 12;
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

    /**
     * Line under a point.
     *
     * @param {number} x
     * @param {number} y
     */
    function findLineAt(x, y) {
        let LINE_HIT_DISTANCE = 8;
        for (let i = linesData.length - 1; i >= 0; i--) {
            let line = linesData[i];
            let fromArea = getAreaById(line.from_areaid);
            let toArea = getAreaById(line.to_areaid);
            if (!fromArea || !toArea) {
                continue;
            }
            let fromCenter = getAreaCenter(fromArea);
            let toCenter = getAreaCenter(toArea);
            if (!fromCenter || !toCenter) {
                continue;
            }

            let dist = pointToSegmentDistance(x, y, fromCenter.x, fromCenter.y, toCenter.x, toCenter.y);
            if (dist <= LINE_HIT_DISTANCE) {
                return line;
            }
        }
        return null;
    }

    /**
     * Distance from a point to a segment.
     * @param {number} px
     * @param {number} py
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     */
    function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
        const segX = x2 - x1;
        const segY = y2 - y1;
        const lenSq = segX * segX + segY * segY;
        const param = lenSq !== 0 ? ((px - x1) * segX + (py - y1) * segY) / lenSq : -1;
        let nearX = x1 + param * segX;
        let nearY = y1 + param * segY;
        if (param < 0) {
            nearX = x1;
            nearY = y1;
        } else if (param > 1) {
            nearX = x2;
            nearY = y2;
        }
        return Math.sqrt((px - nearX) * (px - nearX) + (py - nearY) * (py - nearY));
    }

    /**
     * Resize handle of an area under a point.
     * @param {number} x
     * @param {number} y
     * @param {Object} area
     */
    function findHandleAt(x, y, area) {
        if (!area) {
            return null;
        }
        let coords = parseCoords(area.coords);

        if (area.shape === 'rect') {
            let x1 = Math.min(coords[0], coords[2]);
            let y1 = Math.min(coords[1], coords[3]);
            let x2 = Math.max(coords[0], coords[2]);
            let y2 = Math.max(coords[1], coords[3]);
            let handles = [
                {x: x1, y: y1, pos: 'nw'},
                {x: (x1 + x2) / 2, y: y1, pos: 'n'},
                {x: x2, y: y1, pos: 'ne'},
                {x: x2, y: (y1 + y2) / 2, pos: 'e'},
                {x: x2, y: y2, pos: 'se'},
                {x: (x1 + x2) / 2, y: y2, pos: 's'},
                {x: x1, y: y2, pos: 'sw'},
                {x: x1, y: (y1 + y2) / 2, pos: 'w'}
            ];
            for (let i = 0; i < handles.length; i++) {
                let dx = Math.abs(x - handles[i].x);
                let dy = Math.abs(y - handles[i].y);
                if (dx <= HANDLE_HIT_SIZE && dy <= HANDLE_HIT_SIZE) {
                    return handles[i].pos;
                }
            }
        } else if (area.shape === 'circle') {
            let cx = coords[0];
            let cy = coords[1];
            let r = coords[2];
            let handles = [
                {x: cx, y: cy - r, pos: 'n'},
                {x: cx + r, y: cy, pos: 'e'},
                {x: cx, y: cy + r, pos: 's'},
                {x: cx - r, y: cy, pos: 'w'}
            ];
            for (let i = 0; i < handles.length; i++) {
                let dx = Math.abs(x - handles[i].x);
                let dy = Math.abs(y - handles[i].y);
                if (dx <= HANDLE_HIT_SIZE && dy <= HANDLE_HIT_SIZE) {
                    return handles[i].pos;
                }
            }
        } else if (area.shape === 'poly') {
            for (let i = 0; i < coords.length; i += 2) {
                let dx = Math.abs(x - coords[i]);
                let dy = Math.abs(y - coords[i + 1]);
                if (dx <= HANDLE_HIT_SIZE && dy <= HANDLE_HIT_SIZE) {
                    return i; // Return vertex index
                }
            }
        }
        return null;
    }

    /**
     * Index of the polygon edge under a point.
     * @param {number} x
     * @param {number} y
     * @param {number[]} coords
     */
    function findEdgeAt(x, y, coords) {
        let EDGE_THRESHOLD = 10; // Distance from edge to detect click

        for (let i = 0; i < coords.length; i += 2) {
            let x1 = coords[i];
            let y1 = coords[i + 1];
            let x2 = coords[(i + 2) % coords.length];
            let y2 = coords[(i + 3) % coords.length];

            // Calculate distance from point to line segment
            let A = x - x1;
            let B = y - y1;
            let C = x2 - x1;
            let D = y2 - y1;

            let dot = A * C + B * D;
            let lenSq = C * C + D * D;
            let param = lenSq !== 0 ? dot / lenSq : -1;

            let xx, yy;

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

            let dx = x - xx;
            let dy = y - yy;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= EDGE_THRESHOLD) {
                return {after: i + 2}; // Insert after this vertex
            }
        }
        return null;
    }

    /**
     * Parse comma-separated coordinates.
     * @param {*} coordsString
     */
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
    let toolbarButtons = document.querySelectorAll('.toolbar-btn[data-tool]');
    toolbarButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            let tool = this.getAttribute('data-tool');
            currentTool = tool;
            // Update active state on all toolbar buttons
            toolbarButtons.forEach(function(b) {
                b.classList.remove('active');
            });
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

    let finishPolyButton = document.getElementById('finish-poly');
    if (finishPolyButton) {
        finishPolyButton.addEventListener('click', function() {
            if (polyPoints.length >= 3) {
                finishDrawing();
            }
        });
    }

    /**
     * Clear drawing.
     */
    function clearDrawing() {
        drawing = false;
        draggingArea = false;
        resizingHandle = null;
        polyPoints = [];
        selectedAreaId = null;
        lineSourceAreaId = null;
        // Clear eraser hover state
        areasData.forEach(function(a) {
            a._eraserHover = false;
        });
        linesData.forEach(function(l) {
            l._eraserHover = false;
        });
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

    /**
     * Pointer position relative to the canvas.
     *
     * @param {MouseEvent} e Mouse event.
     * @returns {{x: number, y: number}}
     */
    function pointerPosition(e) {
        const rect = canvas.getBoundingClientRect();
        return {x: e.clientX - rect.left, y: e.clientY - rect.top};
    }

    /**
     * Start resizing (when over a handle) or dragging the area under the pointer.
     *
     * @param {number} x Pointer X.
     * @param {number} y Pointer Y.
     * @returns {boolean} Whether an area was hit.
     */
    function startResizeOrDrag(x, y) {
        const selectedArea = selectedAreaId ? getAreaById(selectedAreaId) : null;
        const selectedHandle = selectedArea ? findHandleAt(x, y, selectedArea) : null;
        if (selectedHandle !== null) {
            resizingHandle = selectedHandle;
            dragStartX = x;
            dragStartY = y;
            dragOriginalCoords = parseCoords(selectedArea.coords);
            drawBase();
            return true;
        }
        const hitArea = findAreaAt(x, y);
        if (!hitArea) {
            selectedAreaId = null;
            drawBase();
            return false;
        }
        selectedAreaId = hitArea.id;
        const hitHandle = findHandleAt(x, y, hitArea);
        if (hitHandle !== null) {
            resizingHandle = hitHandle;
        } else {
            draggingArea = true;
        }
        dragStartX = x;
        dragStartY = y;
        dragOriginalCoords = parseCoords(hitArea.coords);
        drawBase();
        return true;
    }

    /**
     * Eraser: ask to delete the line or area under the pointer.
     *
     * @param {number} x Pointer X.
     * @param {number} y Pointer Y.
     */
    function eraseAt(x, y) {
        const hitLine = findLineAt(x, y);
        if (hitLine) {
            confirmThen(data.strings.confirm_delete_line, () => deleteLine(hitLine));
            return;
        }
        const hitArea = findAreaAt(x, y);
        if (hitArea) {
            confirmThen(data.strings.confirmdeletearea, () => deleteAreaViaAjax(hitArea));
        }
    }

    /**
     * Line tool: pick the source area, then the destination area.
     *
     * @param {number} x Pointer X.
     * @param {number} y Pointer Y.
     */
    function lineClickAt(x, y) {
        const hitArea = findAreaAt(x, y);
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
            return;
        }
        if (hitArea.id === lineSourceAreaId) {
            setStatus(data.strings.line_same_area || 'Cannot connect shape to itself');
            return;
        }
        const duplicate = linesData.some((l) => l.from_areaid === lineSourceAreaId && l.to_areaid === hitArea.id);
        if (duplicate) {
            setStatus(data.strings.line_duplicate || 'This connection already exists');
        } else {
            saveLine(lineSourceAreaId, hitArea.id);
        }
        lineSourceAreaId = null;
        selectedAreaId = null;
        drawBase();
    }

    canvas.addEventListener('mousedown', function(e) {
        if (e.button === 2) {
            return;
        }
        const {x, y} = pointerPosition(e);

        if (currentTool === 'hand') {
            startResizeOrDrag(x, y);
            return;
        }
        if (currentTool === 'eraser') {
            eraseAt(x, y);
            return;
        }
        if (currentTool === 'line') {
            lineClickAt(x, y);
            return;
        }

        // Shape tools (rect, circle, poly).
        if (currentTool !== 'poly' && polyPoints.length === 0 && startResizeOrDrag(x, y)) {
            return;
        }
        if (currentTool === 'poly') {
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

    /**
     * Continue a resize or a drag started on mousedown.
     *
     * @param {number} x Pointer X.
     * @param {number} y Pointer Y.
     * @returns {boolean} Whether a resize or drag is in progress.
     */
    function continueResizeOrDrag(x, y) {
        if (resizingHandle === null && !draggingArea) {
            return false;
        }
        const area = getAreaById(selectedAreaId);
        if (area) {
            const coords = resizingHandle !== null
                ? resizeShape(area.shape, dragOriginalCoords, resizingHandle, x, y, dragStartX, dragStartY)
                : applyDeltaToCoords(dragOriginalCoords, x - dragStartX, y - dragStartY, area.shape);
            area.coords = coords.join(',');
            drawBase();
        }
        return true;
    }

    /**
     * Cursor for a resize handle of an area.
     *
     * @param {Object} area Selected area.
     * @param {string|number} handle Handle under the pointer.
     * @returns {string} CSS cursor.
     */
    function handleCursor(area, handle) {
        const sides = {'n': 'n-resize', 'e': 'e-resize', 's': 's-resize', 'w': 'w-resize'};
        const corners = {'nw': 'nw-resize', 'ne': 'ne-resize', 'se': 'se-resize', 'sw': 'sw-resize'};
        if (area.shape === 'rect') {
            return sides[handle] || corners[handle] || 'pointer';
        }
        if (area.shape === 'circle') {
            return sides[handle] || 'pointer';
        }
        return 'pointer';
    }

    /**
     * Cursor for the hand and shape tools when nothing is being dragged.
     *
     * @param {number} x Pointer X.
     * @param {number} y Pointer Y.
     * @param {string} emptyCursor Cursor over empty space.
     * @returns {string} CSS cursor.
     */
    function hoverCursor(x, y, emptyCursor) {
        const selectedArea = selectedAreaId ? getAreaById(selectedAreaId) : null;
        const handle = selectedArea ? findHandleAt(x, y, selectedArea) : null;
        if (handle !== null) {
            return handleCursor(selectedArea, handle);
        }
        if (currentTool !== 'hand' && selectedArea && selectedArea.shape === 'poly' &&
                findEdgeAt(x, y, parseCoords(selectedArea.coords)) !== null) {
            // Over an edge of the selected polygon: a vertex can be added.
            return 'copy';
        }
        return findAreaAt(x, y) ? 'move' : emptyCursor;
    }

    /**
     * Eraser: highlight the line or area under the pointer.
     *
     * @param {number} x Pointer X.
     * @param {number} y Pointer Y.
     */
    function eraserHover(x, y) {
        areasData.forEach((a) => {
            a._eraserHover = false;
        });
        linesData.forEach((l) => {
            l._eraserHover = false;
        });
        const target = findLineAt(x, y) || findAreaAt(x, y);
        if (target) {
            target._eraserHover = true;
        }
        canvas.style.cursor = target ? 'pointer' : 'not-allowed';
        drawBase();
    }

    /**
     * Line tool: draw a rubber-band line from the source area to the pointer.
     *
     * @param {number} x Pointer X.
     * @param {number} y Pointer Y.
     */
    function lineHover(x, y) {
        canvas.style.cursor = findAreaAt(x, y) ? 'pointer' : 'default';
        if (lineSourceAreaId === null) {
            return;
        }
        drawBase();
        const source = getAreaById(lineSourceAreaId);
        const centre = source ? getAreaCenter(source) : null;
        if (centre) {
            ctx.save();
            ctx.strokeStyle = '#ff9800';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(centre.x, centre.y);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.restore();
        }
    }

    /**
     * Draw the rectangle or circle being drawn.
     *
     * @param {number} x Pointer X.
     * @param {number} y Pointer Y.
     */
    function drawRubberShape(x, y) {
        drawBase();
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (currentTool === 'rect') {
            ctx.rect(startX, startY, x - startX, y - startY);
        } else if (currentTool === 'circle') {
            // Circle from corner to corner, like the rectangle.
            const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2)) / 2;
            ctx.arc((startX + x) / 2, (startY + y) / 2, radius, 0, 2 * Math.PI);
        }
        ctx.stroke();
    }

    canvas.addEventListener('mousemove', function(e) {
        const {x, y} = pointerPosition(e);

        if (currentTool === 'eraser') {
            eraserHover(x, y);
            return;
        }
        if (currentTool === 'line') {
            lineHover(x, y);
            return;
        }
        if (continueResizeOrDrag(x, y)) {
            return;
        }
        if (currentTool === 'hand') {
            canvas.style.cursor = hoverCursor(x, y, 'default');
            return;
        }
        if (currentTool === 'poly') {
            return;
        }
        if (!drawing) {
            canvas.style.cursor = hoverCursor(x, y, 'crosshair');
            return;
        }
        drawRubberShape(x, y);
    });

    canvas.addEventListener('dblclick', function(e) {
        e.preventDefault();
        let rect = canvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        let selectedArea = selectedAreaId ? getAreaById(selectedAreaId) : null;
        if (selectedArea && selectedArea.shape === 'poly') {
            let coords = parseCoords(selectedArea.coords);

            // Check if double-clicking on a vertex handle (to delete)
            let handle = findHandleAt(x, y, selectedArea);
            if (handle !== null && coords.length > 6) { // Keep at least 3 vertices
                coords.splice(handle, 2); // Remove x,y pair
                selectedArea.coords = coords.join(',');
                drawBase();
                saveAreaCoords(selectedArea);
                return;
            }

            // Check if double-clicking on an edge (to add vertex)
            let edgeInfo = findEdgeAt(x, y, coords);
            if (edgeInfo !== null) {
                // Insert new vertex after the clicked edge
                coords.splice(edgeInfo.after, 0, x, y);
                selectedArea.coords = coords.join(',');
                drawBase();
                saveAreaCoords(selectedArea);
                return;
            }
        }
    });

    canvas.addEventListener('mouseup', function(e) {
        if (resizingHandle !== null) {
            let resizedArea = getAreaById(selectedAreaId);
            resizingHandle = null;
            if (resizedArea) {
                saveAreaCoords(resizedArea);
            }
            return;
        }

        if (draggingArea) {
            let draggedArea = getAreaById(selectedAreaId);
            draggingArea = false;
            if (draggedArea) {
                saveAreaCoords(draggedArea);
            }
            return;
        }

        if (!drawing) {
            return;
        }

        let rect = canvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        drawing = false;
        finishDrawing(x, y);
    });

    canvas.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        let rect = canvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        let area = findAreaAt(x, y);
        if (area) {
            selectedAreaId = area.id;
            drawBase();
            openEditForm(area);
        }
    });

    /**
     * Draw polygon.
     */
    function drawPolygon() {
        if (polyPoints.length < 2) {
            return;
        }

        ctx.strokeStyle = '#FF0000';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(polyPoints[0].x, polyPoints[0].y);

        for (let i = 1; i < polyPoints.length; i++) {

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

    /**
     * Finish drawing.
     *
     * @param {number} endX
     * @param {number} endY
     */
    function finishDrawing(endX, endY) {
        let coords = '';
        let shape = currentTool; // Rect, circle, or poly

        if (shape === 'rect') {
            coords = Math.round(startX) + ',' + Math.round(startY) + ',' +
                Math.round(endX) + ',' + Math.round(endY);
        } else if (shape === 'circle') {
            // Calculate circle from corner to corner
            let cx = (startX + endX) / 2;
            let cy = (startY + endY) / 2;
            let radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)) / 2;
            coords = Math.round(cx) + ',' + Math.round(cy) + ',' + Math.round(radius);
        } else if (shape === 'poly') {
            coords = polyPoints.map(function(p) {
                return Math.round(p.x) + ',' + Math.round(p.y);
            }).join(',');
        }

        document.getElementById('form-shape').value = shape;
        document.getElementById('form-coords').value = coords;
        document.getElementById('form-areaid').value = '';
        document.getElementById('area-form-title').textContent = data.strings.addarea || 'Add area';
        openAreaForm();

        if (shape === 'poly' && finishPolyButton) {

            finishPolyButton.style.display = 'none';

        }
    }

    // Helper function for textarea autoheight
    /**
     * Auto resize textarea.
     * @param {HTMLElement} textarea
     */
    function autoResizeTextarea(textarea) {
        if (!textarea) {
            return;
        }
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';
    }

    /**
     * Open area form.
     */
    function openAreaForm() {
        let overlay = document.getElementById('imagemap-overlay');
        let container = document.getElementById('area-form-container');
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

    /**
     * Close area form.
     */
    function closeAreaForm() {
        let overlay = document.getElementById('imagemap-overlay');
        let container = document.getElementById('area-form-container');
        if (overlay) {
            overlay.style.display = 'none';
        }
        if (container) {
            container.style.display = 'none';
        }
    }

    let closeButton = document.getElementById('close-area-form');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            closeAreaForm();
        });
    }

    let overlayEl = document.getElementById('imagemap-overlay');
    if (overlayEl) {
        overlayEl.addEventListener('click', function() {
            closeAreaForm();
        });
    }

    /**
     * Open edit form.
     * @param {Object} area
     */
    function openEditForm(area) {
        selectedAreaId = area.id;
        drawBase();
        document.getElementById('form-areaid').value = area.id;
        document.getElementById('form-shape').value = area.shape;
        document.getElementById('form-coords').value = area.coords;
        document.getElementById('title').value = area.title || '';
        let targetSelect = document.getElementById('target-select');
        if (targetSelect && area.targettype && area.targetid) {
            targetSelect.value = area.targettype + ':' + area.targetid;
            setTargetFromSelect();
        }
        document.getElementById('activefilter').value = area.activefilter || 'none';
        document.getElementById('inactivefilter').value = area.inactivefilter || 'filter: grayscale(100%);';
        document.getElementById('area-form-title').textContent = data.strings.editarea || 'Edit area';
        openAreaForm();
        // Update the canvas previews after setting the values.
        const activeCanvas = document.getElementById('activefilter-preview-canvas');
        const inactiveCanvas = document.getElementById('inactivefilter-preview-canvas');
        if (activeCanvas) {
            drawPreview(activeCanvas, area.activefilter || 'none');
        }
        if (inactiveCanvas) {
            drawPreview(inactiveCanvas, area.inactivefilter || 'filter: grayscale(100%);');
        }
    }

    /**
     * Set target from select.
     */
    function setTargetFromSelect() {
        let targetSelect = document.getElementById('target-select');
        let targetTypeInput = document.getElementById('form-targettype');
        let targetIdInput = document.getElementById('form-targetid');
        if (!targetSelect || !targetTypeInput || !targetIdInput) {
            return;
        }
        let value = targetSelect.value || '';
        let parts = value.split(':');
        targetTypeInput.value = parts[0] || '';
        targetIdInput.value = parts[1] || '';
    }

    let targetSelect = document.getElementById('target-select');
    if (targetSelect) {
        targetSelect.addEventListener('change', setTargetFromSelect);
        setTargetFromSelect();
    }

    // ===== CSS Examples Modal Management =====
    let currentModalTargetField = null;

    /**
     * Initialize CSS examples modal.
     */
    function initializeCSSExamplesModal() {
        // Find all "View Examples" buttons
        let openButtons = document.querySelectorAll('.open-css-examples-btn');
        openButtons.forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                let filterType = this.getAttribute('data-filter-type');
                let targetField = this.getAttribute('data-target-field');
                openCSSExamplesModal(filterType, targetField);
            });
        });

        // Setup tab switching in modal
        let activeTabBtn = document.getElementById('examples-active-tab');
        let inactiveTabBtn = document.getElementById('examples-inactive-tab');

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
        let selectBtns = document.querySelectorAll('.select-example-btn');
        selectBtns.forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                let card = this.closest('.css-example-card');
                if (card && currentModalTargetField) {
                    let cssValue = card.getAttribute('data-css');
                    let targetField = document.getElementById(currentModalTargetField);
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

    /**
     * Switch tab.
     * @param {string} tabName
     */
    function switchTab(tabName) {
        // Remove active class from all tabs and panes
        let allTabBtns = document.querySelectorAll('#css-examples-modal .nav-link');
        let allTabPanes = document.querySelectorAll('#css-examples-modal .tab-pane');

        allTabBtns.forEach(function(btn) {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        });

        allTabPanes.forEach(function(pane) {

            pane.classList.remove('active', 'show');

        });

        // Add active class to selected tab
        if (tabName === 'active') {
            let activeTabBtn = document.getElementById('examples-active-tab');
            let activePane = document.getElementById('examples-active');
            if (activeTabBtn) {
                activeTabBtn.classList.add('active');
                activeTabBtn.setAttribute('aria-selected', 'true');
            }
            if (activePane) {
                activePane.classList.add('active', 'show');
            }
        } else if (tabName === 'inactive') {
            let inactiveTabBtn = document.getElementById('examples-inactive-tab');
            let inactivePane = document.getElementById('examples-inactive');
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

    /**
     * Open CSS examples modal.
     * @param {string} filterType
     * @param {string} targetField
     */
    function openCSSExamplesModal(filterType, targetField) {
        currentModalTargetField = targetField;
        let modal = document.getElementById('css-examples-modal');
        if (modal) {
            if ($.fn.modal) {
                $(modal).modal('show');

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

    /**
     * Close CSS examples modal.
     */
    function closeCSSExamplesModal() {
        currentModalTargetField = null;
        let modal = document.getElementById('css-examples-modal');
        if (modal) {
            if ($.fn.modal) {
                $(modal).modal('hide');
            } else {
                modal.style.display = 'none';
                modal.classList.remove('show');
            }
        }
    }

    /**
     * Initialize CSS previews.
     */
    function initializeCSSPreviews() {
        let canvases = document.querySelectorAll('.css-preview-canvas');
        canvases.forEach(function(canvas) {
            let css = canvas.getAttribute('data-css') || '';
            drawPreview(canvas, css);
        });
    }

    // Canvas previews initialized by CSSPreview utility (css_preview.js)

    // Initialize modal on page load
    initializeCSSExamplesModal();

    let areaForm = document.getElementById('area-form');
    if (areaForm) {
        areaForm.addEventListener('submit', function() {
            setTargetFromSelect();
        });
    }

    // Setup canvas preview updates for CSS filters
    let activeFilterInput = document.getElementById('activefilter');
    let activeFilterCanvas = document.getElementById('activefilter-preview-canvas');
    if (activeFilterInput && activeFilterCanvas) {
        activeFilterInput.addEventListener('input', function() {
            let cssValue = this.value.trim();
            autoResizeTextarea(this);
            drawPreview(activeFilterCanvas, cssValue || 'none');
        });
        // Initial render and resize
        drawPreview(activeFilterCanvas, activeFilterInput.value || 'none');
        autoResizeTextarea(activeFilterInput);
    }

    let inactiveFilterInput = document.getElementById('inactivefilter');
    let inactiveFilterCanvas = document.getElementById('inactivefilter-preview-canvas');
    if (inactiveFilterInput && inactiveFilterCanvas) {
        inactiveFilterInput.addEventListener('input', function() {
            let cssValue = this.value.trim();
            autoResizeTextarea(this);
            drawPreview(inactiveFilterCanvas, cssValue || 'filter: grayscale(100%);');
        });
        // Initial render and resize
        drawPreview(inactiveFilterCanvas, inactiveFilterInput.value || 'filter: grayscale(100%);');
        autoResizeTextarea(inactiveFilterInput);
    }


    /**
     * Topmost area under a point.
     * @param {number} x
     * @param {number} y
     */
    function findAreaAt(x, y) {
        for (let i = areasData.length - 1; i >= 0; i--) {
            let area = areasData[i];
            if (isPointInArea(x, y, area)) {
                return area;
            }
        }
        return null;
    }

    /**
     * Find an area by its id.
     * @param {number} id
     */
    function getAreaById(id) {
        for (let i = 0; i < areasData.length; i++) {
            if (areasData[i].id === id) {
                return areasData[i];
            }
        }
        return null;
    }

    /**
     * Whether a point is inside an area.
     * @param {number} x
     * @param {number} y
     * @param {Object} area
     */
    function isPointInArea(x, y, area) {
        let coords = parseCoords(area.coords);
        if (area.shape === 'rect' && coords.length >= 4) {
            let x1 = Math.min(coords[0], coords[2]);
            let y1 = Math.min(coords[1], coords[3]);
            let x2 = Math.max(coords[0], coords[2]);
            let y2 = Math.max(coords[1], coords[3]);
            return x >= x1 && x <= x2 && y >= y1 && y <= y2;
        }
        if (area.shape === 'circle' && coords.length >= 3) {
            let dx = x - coords[0];
            let dy = y - coords[1];
            return (dx * dx + dy * dy) <= (coords[2] * coords[2]);
        }
        if (area.shape === 'poly' && coords.length >= 6) {
            return pointInPolygon(x, y, coords);
        }
        return false;
    }

    /**
     * Coordinates of a shape moved by a delta.
     * @param {number[]} coords
     * @param {number} dx
     * @param {number} dy
     * @param {string} shape
     */
    function applyDeltaToCoords(coords, dx, dy, shape) {
        let moved = [];
        if (shape === 'circle') {
            // Circle: [cx, cy, radius] - only move center, keep radius
            moved.push(Math.round(coords[0] + dx));
            moved.push(Math.round(coords[1] + dy));
            moved.push(Math.round(coords[2])); // Radius stays the same
        } else {
            // Rectangle and polygon: all values are x,y pairs
            for (let i = 0; i < coords.length; i += 2) {
                moved.push(Math.round(coords[i] + dx));
                moved.push(Math.round(coords[i + 1] + dy));
            }
        }
        return moved;
    }

    /**
     * Coordinates of a shape resized by one of its handles.
     * @param {string} shape
     * @param {number[]} originalCoords
     * @param {string|number} handle
     * @param {*} mouseX
     * @param {*} mouseY
     * @param {*} startMouseX
     * @param {*} startMouseY
     */
    function resizeShape(shape, originalCoords, handle, mouseX, mouseY, startMouseX, startMouseY) {
        let newCoords = originalCoords.slice();

        if (shape === 'rect') {
            let x1 = originalCoords[0];
            let y1 = originalCoords[1];
            let x2 = originalCoords[2];
            let y2 = originalCoords[3];
            let dx = mouseX - startMouseX;
            let dy = mouseY - startMouseY;

            switch (handle) {
                case 'nw': newCoords = [x1 + dx, y1 + dy, x2, y2]; break;
                case 'n': newCoords = [x1, y1 + dy, x2, y2]; break;
                case 'ne': newCoords = [x1, y1 + dy, x2 + dx, y2]; break;
                case 'e': newCoords = [x1, y1, x2 + dx, y2]; break;
                case 'se': newCoords = [x1, y1, x2 + dx, y2 + dy]; break;
                case 's': newCoords = [x1, y1, x2, y2 + dy]; break;
                case 'sw': newCoords = [x1 + dx, y1, x2, y2 + dy]; break;
                case 'w': newCoords = [x1 + dx, y1, x2, y2]; break;
            }
        } else if (shape === 'circle') {
            let cx = originalCoords[0];
            let cy = originalCoords[1];
            let dx = mouseX - cx;
            let dy = mouseY - cy;
            let newRadius = Math.sqrt(dx * dx + dy * dy);
            newCoords = [cx, cy, Math.round(newRadius)];
        } else if (shape === 'poly') {
            // Handle is the vertex index
            let vertexIndex = handle;
            newCoords = originalCoords.slice();
            newCoords[vertexIndex] = mouseX;
            newCoords[vertexIndex + 1] = mouseY;
        }

        return newCoords;
    }

    /**
     * Point in polygon.
     * @param {number} x
     * @param {number} y
     * @param {number[]} coords
     */
    function pointInPolygon(x, y, coords) {
        let inside = false;
        for (let i = 0, j = coords.length - 2; i < coords.length; i += 2) {
            let xi = coords[i];
            let yi = coords[i + 1];
            let xj = coords[j];
            let yj = coords[j + 1];
            let intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi + 0.00001) + xi);
            if (intersect) {
                inside = !inside;
            }
            j = i;
        }
        return inside;
    }

    /**
     * Ask for confirmation, then run the action.
     *
     * @param {string} message Question shown to the user.
     * @param {Function} action Action to run when confirmed.
     */
    function confirmThen(message, action) {
        Notification.saveCancelPromise(
            getString('confirm', 'core'),
            message || getString('areyousure', 'core'),
            getString('delete', 'core'),
        ).then(() => {
            action();
            return null;
        }).catch(() => null);
    }

    // ===== External services (core/ajax) =====
    /**
     * Call service.
     * @param {*} methodname
     * @param {*} args
     */
    function callService(methodname, args) {
        return Ajax.call([{methodname: methodname, args: args}])[0];
    }

    /**
     * Error message.
     * @param {*} err
     * @param {*} fallback
     */
    function errorMessage(err, fallback) {
        return (err && (err.message || err.error)) || fallback;
    }

    // ===== AJAX: Save area coords (move/resize) =====
    /**
     * Save area coords.
     * @param {Object} area
     */
    function saveAreaCoords(area) {
        callService('mod_imagemap_update_area_coords', {
            cmid: parseInt(data.cmid, 10),
            areaid: parseInt(area.id, 10),
            coords: String(area.coords)
        }).catch(function(err) {
            setStatus(errorMessage(err, 'Error saving position'));
        });
    }

    // ===== AJAX: Save line =====
    /**
     * Save line.
     * @param {number} fromAreaId
     * @param {number} toAreaId
     */
    function saveLine(fromAreaId, toAreaId) {
        callService('mod_imagemap_save_line', {
            cmid: parseInt(data.cmid, 10),
            fromareaid: parseInt(fromAreaId, 10),
            toareaid: parseInt(toAreaId, 10)
        }).then(function(result) {
            linesData.push({
                'id': result.id,
                'from_areaid': fromAreaId,
                'to_areaid': toAreaId,
            });
            drawBase();
            setStatus(data.strings.line_saved || 'Line saved');
            setTimeout(function() {
                setStatus(data.strings.line_select_source || 'Click source shape');
            }, 1500);
            return result;
        }).catch(function(err) {
            setStatus(errorMessage(err, 'Error saving line'));
        });
    }

    // ===== AJAX: Delete line =====
    /**
     * Delete line.
     * @param {Object} line
     */
    function deleteLine(line) {
        callService('mod_imagemap_delete_line', {
            cmid: parseInt(data.cmid, 10),
            lineid: parseInt(line.id, 10)
        }).then(function(result) {
            linesData = linesData.filter(function(l) {
                return l.id !== line.id;
            });
            drawBase();
            setStatus(data.strings.line_deleted || 'Line deleted');
            setTimeout(function() {
                setStatus(data.strings.eraser_hint || 'Click a shape or line to delete');
            }, 1500);
            return result;
        }).catch(function(err) {
            setStatus(errorMessage(err, 'Error deleting line'));
        });
    }

    // ===== AJAX: Delete area (eraser tool) =====
    /**
     * Delete an area: the page is reloaded through areas.php.
     * @param {Object} area
     */
    function deleteAreaViaAjax(area) {
        let deleteUrl = Config.wwwroot + '/mod/imagemap/areas.php?id=' +
            encodeURIComponent(data.cmid || '') +
            '&action=delete&areaid=' + encodeURIComponent(area.id) +
            '&sesskey=' + encodeURIComponent(data.sesskey || '');
        // Redirect to delete (same as table delete link)
        window.location.href = deleteUrl;
    }

    container.querySelectorAll('[data-action="mod_imagemap/delete-area"]').forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            confirmThen(data.strings.confirmdeletearea, () => {
                window.location.href = link.href;
            });
        });
    });
};
