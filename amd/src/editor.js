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
 * Area editor of the image map.
 *
 * @module     mod_imagemap/editor
 * @copyright  2026 Kelson C. M.
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define([], function () {
    var initializer = {
        init: function () {
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
            var startX, startY;
            var dragStartX, dragStartY;
            var dragOriginalCoords = [];
            var polyPoints = [];
            var currentShape = 'rect';
            var areasData = data.areasData || [];
            var selectedAreaId = null;

            img.onload = function () {
                canvas.width = img.width;
                canvas.height = img.height;
                drawBase();
            };
            img.onerror = function () {
                console.error('Failed to load image:', data.imageUrl);
            };
            img.src = data.imageUrl || '';

            function drawBase() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                drawExistingAreas();
            }

            function drawExistingAreas() {
                areasData.forEach(function (area) {
                    drawArea(area, area.id === selectedAreaId);
                });
            }

            function drawArea(area, highlight) {
                var coords = parseCoords(area.coords);
                if (!coords.length) {
                    return;
                }

                ctx.save();
                ctx.strokeStyle = highlight ? '#FF6F00' : '#0073e6';
                ctx.fillStyle = highlight ? 'rgba(255, 111, 0, 0.25)' : 'rgba(0, 115, 230, 0.2)';
                ctx.lineWidth = highlight ? 3 : 2;

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

            function parseCoords(coordsString) {
                if (!coordsString) {
                    return [];
                }
                return coordsString.split(',').map(function (value) {
                    return parseFloat(value);
                }).filter(function (value) {
                    return !isNaN(value);
                });
            }

            var shapeSelector = document.getElementById('shape-selector');
            if (shapeSelector) {
                shapeSelector.addEventListener('change', function () {
                    currentShape = this.value;
                    clearDrawing();
                });
            }

            var clearButton = document.getElementById('clear-drawing');
            if (clearButton) {
                clearButton.addEventListener('click', clearDrawing);
            }

            var finishPolyButton = document.getElementById('finish-poly');
            if (finishPolyButton) {
                finishPolyButton.addEventListener('click', function () {
                    if (polyPoints.length >= 3) {
                        finishDrawing();
                    }
                });
            }

            function clearDrawing() {
                drawing = false;
                draggingArea = false;
                polyPoints = [];
                selectedAreaId = null;
                drawBase();
                if (finishPolyButton) {
                    finishPolyButton.style.display = 'none';
                }
                closeAreaForm();
            }

            canvas.addEventListener('mousedown', function (e) {
                if (e.button === 2) {
                    return;
                }
                var rect = canvas.getBoundingClientRect();
                var x = e.clientX - rect.left;
                var y = e.clientY - rect.top;

                if (currentShape !== 'poly' && polyPoints.length === 0) {
                    var hitArea = findAreaAt(x, y);
                    if (hitArea) {
                        draggingArea = true;
                        selectedAreaId = hitArea.id;
                        dragStartX = x;
                        dragStartY = y;
                        dragOriginalCoords = parseCoords(hitArea.coords);
                        drawBase();
                        return;
                    }
                }

                if (currentShape === 'poly') {
                    polyPoints.push({ x: x, y: y });
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

            canvas.addEventListener('mousemove', function (e) {
                if (draggingArea) {
                    var dragArea = getAreaById(selectedAreaId);
                    if (!dragArea) {
                        return;
                    }

                    var rect = canvas.getBoundingClientRect();
                    var x = e.clientX - rect.left;
                    var y = e.clientY - rect.top;
                    var dx = x - dragStartX;
                    var dy = y - dragStartY;
                    var moved = applyDeltaToCoords(dragOriginalCoords, dx, dy, dragArea.shape);
                    dragArea.coords = moved.join(',');
                    drawBase();
                    return;
                }

                if (!drawing || currentShape === 'poly') {
                    return;
                }

                var rect = canvas.getBoundingClientRect();
                var x = e.clientX - rect.left;
                var y = e.clientY - rect.top;

                drawBase();

                ctx.strokeStyle = '#FF0000';
                ctx.lineWidth = 2;
                ctx.beginPath();

                if (currentShape === 'rect') {
                    ctx.rect(startX, startY, x - startX, y - startY);
                } else if (currentShape === 'circle') {
                    var radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
                    ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
                }

                ctx.stroke();
            });

            canvas.addEventListener('mouseup', function (e) {
                if (draggingArea) {
                    draggingArea = false;
                    var movedArea = getAreaById(selectedAreaId);
                    if (movedArea) {
                        openEditForm(movedArea);
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

            canvas.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                var rect = canvas.getBoundingClientRect();
                var x = e.clientX - rect.left;
                var y = e.clientY - rect.top;
                var area = findAreaAt(x, y);
                if (area) {
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

                polyPoints.forEach(function (point) {
                    ctx.fillStyle = '#FF0000';
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
                    ctx.fill();
                });
            }

            function finishDrawing(endX, endY) {
                var coords = '';

                if (currentShape === 'rect') {
                    coords = Math.round(startX) + ',' + Math.round(startY) + ',' +
                        Math.round(endX) + ',' + Math.round(endY);
                } else if (currentShape === 'circle') {
                    var radius = Math.round(Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)));
                    coords = Math.round(startX) + ',' + Math.round(startY) + ',' + radius;
                } else if (currentShape === 'poly') {
                    coords = polyPoints.map(function (p) {
                        return Math.round(p.x) + ',' + Math.round(p.y);
                    }).join(',');
                }

                document.getElementById('form-shape').value = currentShape;
                document.getElementById('form-coords').value = coords;
                document.getElementById('form-areaid').value = '';
                document.getElementById('area-form-title').textContent = (data.strings && data.strings.addarea) ? data.strings.addarea : 'Add area';
                openAreaForm();

                if (currentShape === 'poly' && finishPolyButton) {
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
                closeButton.addEventListener('click', function () {
                    closeAreaForm();
                });
            }

            var overlayEl = document.getElementById('imagemap-overlay');
            if (overlayEl) {
                overlayEl.addEventListener('click', function () {
                    closeAreaForm();
                });
            }

            // Setup CSS example dropdowns
            var cssExampleSelects = document.querySelectorAll('.css-example-select');
            cssExampleSelects.forEach(function (select) {
                select.addEventListener('change', function () {
                    var targetId = this.getAttribute('data-target');
                    var targetTextarea = document.getElementById(targetId);
                    if (targetTextarea && this.value) {
                        targetTextarea.value = this.value;
                        // Trigger input event to update preview
                        var event = new Event('input', { bubbles: true });
                        targetTextarea.dispatchEvent(event);
                    }
                });
            });

            // Setup canvas preview updates for CSS filters
            var activeFilterInput = document.getElementById('activefilter');
            var activeFilterCanvas = document.getElementById('activefilter-preview-canvas');
            if (activeFilterInput && activeFilterCanvas) {
                activeFilterInput.addEventListener('input', function () {
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
                inactiveFilterInput.addEventListener('input', function () {
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

            function applyDeltaToCoords(coords, dx, dy) {
                var moved = [];
                for (var i = 0; i < coords.length; i += 2) {
                    moved.push(Math.round(coords[i] + dx));
                    moved.push(Math.round(coords[i + 1] + dy));
                }
                return moved;
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
        }
    };

    return initializer;
});
