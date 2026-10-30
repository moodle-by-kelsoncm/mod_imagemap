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
 * Draws the image map and its areas for students.
 *
 * @module     mod_imagemap/view
 * @copyright  2026 Kelson C. M.
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define([], function () {
    return {
        init: function (imagemapId, areas, imageSrc, lines) {
            var canvas = document.getElementById('imagemap-canvas-' + imagemapId);
            var overlaysContainer = document.getElementById('imagemap-overlays-' + imagemapId);
            if (!canvas || !overlaysContainer) return;

            var ctx = canvas.getContext('2d');
            var img = new Image();
            lines = lines || [];
            areas = areas || [];
            var tooltipEl = null;

            img.onload = function () {
                canvas.width = img.width;
                canvas.height = img.height;
                overlaysContainer.style.width = img.width + 'px';
                overlaysContainer.style.height = img.height + 'px';
                drawImageMap();
            };

            img.src = imageSrc;

            function showTooltip(text, clientX, clientY) {
                if (!text) {
                    return;
                }
                if (!tooltipEl) {
                    tooltipEl = document.createElement('div');
                    tooltipEl.className = 'imagemap-tooltip';
                    document.body.appendChild(tooltipEl);
                }
                tooltipEl.textContent = text;
                tooltipEl.style.display = 'block';
                tooltipEl.style.left = (clientX + 12 + window.scrollX) + 'px';
                tooltipEl.style.top = (clientY + 12 + window.scrollY) + 'px';
            }

            function hideTooltip() {
                if (tooltipEl) {
                    tooltipEl.style.display = 'none';
                }
            }

            document.addEventListener('click', function (event) {
                if (tooltipEl && tooltipEl.style.display === 'block' && !tooltipEl.contains(event.target)) {
                    hideTooltip();
                }
            });

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

            function getAreaCenterById(areaId) {
                for (var i = 0; i < areas.length; i++) {
                    if (areas[i].id === areaId) {
                        var a = areas[i];
                        var coords = a.coords.split(',').map(function(v) { return parseFloat(v); });
                        if (a.shape === 'rect' && coords.length >= 4) {
                            return { x: (Math.min(coords[0], coords[2]) + Math.max(coords[0], coords[2])) / 2,
                                     y: (Math.min(coords[1], coords[3]) + Math.max(coords[1], coords[3])) / 2 };
                        } else if (a.shape === 'circle' && coords.length >= 3) {
                            return { x: coords[0], y: coords[1] };
                        } else if (a.shape === 'poly' && coords.length >= 6) {
                            var cx = 0, cy = 0, n = coords.length / 2;
                            for (var j = 0; j < coords.length; j += 2) { cx += coords[j]; cy += coords[j+1]; }
                            return { x: cx / n, y: cy / n };
                        }
                    }
                }
                return null;
            }

            function drawLines() {
                lines.forEach(function(line) {
                    var from = getAreaCenterById(line.from_areaid);
                    var to = getAreaCenterById(line.to_areaid);
                    if (!from || !to) return;

                    ctx.save();
                    ctx.strokeStyle = '#ff9800';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([8, 4]);
                    ctx.beginPath();
                    ctx.moveTo(from.x, from.y);
                    ctx.lineTo(to.x, to.y);
                    ctx.stroke();

                    // Arrowhead
                    var angle = Math.atan2(to.y - from.y, to.x - from.x);
                    var arrowLen = 12;
                    ctx.setLineDash([]);
                    ctx.fillStyle = '#ff9800';
                    ctx.beginPath();
                    ctx.moveTo(to.x, to.y);
                    ctx.lineTo(to.x - arrowLen * Math.cos(angle - Math.PI / 6),
                               to.y - arrowLen * Math.sin(angle - Math.PI / 6));
                    ctx.lineTo(to.x - arrowLen * Math.cos(angle + Math.PI / 6),
                               to.y - arrowLen * Math.sin(angle + Math.PI / 6));
                    ctx.closePath();
                    ctx.fill();

                    ctx.beginPath();
                    ctx.arc(from.x, from.y, 4, 0, 2 * Math.PI);
                    ctx.fill();

                    ctx.restore();
                });
            }

            function drawAreas() {
                areas.forEach(function (area) {
                    var coords = parseCoords(area.coords);
                    if (!coords.length) {
                        return;
                    }

                    ctx.save();
                    ctx.fillStyle = area.active ? 'rgba(0, 115, 230, 0.18)' : 'rgba(158, 158, 158, 0.18)';

                    if (area.shape === 'rect' && coords.length >= 4) {
                        var x1 = Math.min(coords[0], coords[2]);
                        var y1 = Math.min(coords[1], coords[3]);
                        var w = Math.abs(coords[2] - coords[0]);
                        var h = Math.abs(coords[3] - coords[1]);
                        ctx.beginPath();
                        ctx.rect(x1, y1, w, h);
                        ctx.fill();
                    } else if (area.shape === 'circle' && coords.length >= 3) {
                        ctx.beginPath();
                        ctx.arc(coords[0], coords[1], coords[2], 0, 2 * Math.PI);
                        ctx.fill();
                    } else if (area.shape === 'poly' && coords.length >= 6) {
                        ctx.beginPath();
                        ctx.moveTo(coords[0], coords[1]);
                        for (var i = 2; i < coords.length; i += 2) {
                            ctx.lineTo(coords[i], coords[i + 1]);
                        }
                        ctx.closePath();
                        ctx.fill();
                    }

                    ctx.restore();
                });
            }

            function drawImageMap() {
                // Draw base image
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);

                // Draw connection lines on canvas
                drawLines();

                // Draw areas on canvas for visibility
                drawAreas();

                // Clear existing overlays
                overlaysContainer.innerHTML = '';

                // Create CSS overlays for each area
                areas.forEach(function (area, index) {
                    var coords = parseCoords(area.coords);
                    if (!coords.length) {
                        return;
                    }
                    var overlay = document.createElement('div');
                    overlay.className = 'imagemap-area-overlay';
                    overlay.style.position = 'absolute';
                    overlay.style.pointerEvents = (area.url || area.tooltip) ? 'auto' : 'none';
                    overlay.style.cursor = area.active && area.url ? 'pointer' : (area.tooltip ? 'help' : 'not-allowed');
                    overlay.title = area.title || '';
                    overlay.dataset.areaIndex = index;

                    // Apply custom CSS
                    var cssText = area.active ? (area.activefilter || '') : (area.inactivefilter || 'filter: grayscale(100%);');
                    if (cssText && cssText !== 'none') {
                        // Check if it's a filter or full CSS
                        if (cssText.indexOf(':') === -1 && cssText.indexOf('(') !== -1) {
                            // It's a filter value without property name
                            overlay.style.filter = cssText;
                        } else {
                            // It's full CSS
                            cssText.split(';').forEach(function (rule) {
                                if (!rule.trim()) return;
                                var parts = rule.split(':');
                                if (parts.length === 2) {
                                    var prop = parts[0].trim();
                                    var value = parts[1].trim();
                                    overlay.style.setProperty(prop, value);
                                }
                            });
                        }
                    }

                    // Position and clip the overlay based on shape
                    var left = 0;
                    var top = 0;
                    if (area.shape === 'rect' && coords.length >= 4) {
                        var x1 = Math.min(coords[0], coords[2]);
                        var y1 = Math.min(coords[1], coords[3]);
                        var w = Math.abs(coords[2] - coords[0]);
                        var h = Math.abs(coords[3] - coords[1]);
                        left = x1;
                        top = y1;
                        overlay.style.left = x1 + 'px';
                        overlay.style.top = y1 + 'px';
                        overlay.style.width = w + 'px';
                        overlay.style.height = h + 'px';
                    } else if (area.shape === 'circle' && coords.length >= 3) {
                        var cx = coords[0], cy = coords[1], r = coords[2];
                        left = cx - r;
                        top = cy - r;
                        overlay.style.left = left + 'px';
                        overlay.style.top = top + 'px';
                        overlay.style.width = (r * 2) + 'px';
                        overlay.style.height = (r * 2) + 'px';
                        overlay.style.borderRadius = '50%';
                    } else if (area.shape === 'poly' && coords.length >= 6) {
                        var minX = Math.min.apply(null, coords.filter(function (v, i) { return i % 2 === 0; }));
                        var maxX = Math.max.apply(null, coords.filter(function (v, i) { return i % 2 === 0; }));
                        var minY = Math.min.apply(null, coords.filter(function (v, i) { return i % 2 === 1; }));
                        var maxY = Math.max.apply(null, coords.filter(function (v, i) { return i % 2 === 1; }));

                        left = minX;
                        top = minY;
                        overlay.style.left = minX + 'px';
                        overlay.style.top = minY + 'px';
                        overlay.style.width = (maxX - minX) + 'px';
                        overlay.style.height = (maxY - minY) + 'px';

                        // Create polygon clip path
                        var clipPath = 'polygon(';
                        for (var i = 0; i < coords.length; i += 2) {
                            if (i > 0) clipPath += ', ';
                            clipPath += ((coords[i] - minX) / (maxX - minX) * 100) + '% ';
                            clipPath += ((coords[i + 1] - minY) / (maxY - minY) * 100) + '%';
                        }
                        clipPath += ')';
                        overlay.style.clipPath = clipPath;
                        overlay.style.webkitClipPath = clipPath;
                    }

                    if (overlay.style.width && overlay.style.height) {
                        overlay.style.backgroundImage = 'url("' + imageSrc + '")';
                        overlay.style.backgroundRepeat = 'no-repeat';
                        overlay.style.backgroundSize = img.width + 'px ' + img.height + 'px';
                        overlay.style.backgroundPosition = '-' + left + 'px -' + top + 'px';
                    }

                    // Create inner element for background if CSS includes background
                    var inner = document.createElement('div');
                    inner.style.width = '100%';
                    inner.style.height = '100%';
                    inner.style.pointerEvents = 'none';
                    overlay.appendChild(inner);

                    // Add click handler
                    overlay.addEventListener('click', function (event) {
                        if (area.active && area.url) {
                            window.location.href = area.url;
                            return;
                        }
                        if (area.tooltip) {
                            showTooltip(area.tooltip, event.clientX, event.clientY);
                            event.preventDefault();
                            event.stopPropagation();
                        }
                    });

                    overlaysContainer.appendChild(overlay);
                });
            }
        }
    };
});