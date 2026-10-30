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
 * The image URL, areas and lines come from the data-config attribute of the container
 * rendered by the mod_imagemap/view template.
 *
 * @module     mod_imagemap/view
 * @copyright  2026 Kelson C. M.
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {parseCoords, areaCenter, applyAreaCss} from 'mod_imagemap/shapes';

let tooltipEl = null;

/**
 * Show a tooltip next to the pointer.
 *
 * @param {string} text Tooltip text.
 * @param {number} clientX Pointer X.
 * @param {number} clientY Pointer Y.
 */
const showTooltip = (text, clientX, clientY) => {
    if (!text) {
        return;
    }
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.className = 'imagemap-tooltip';
        document.body.appendChild(tooltipEl);
        document.addEventListener('click', (event) => {
            if (tooltipEl.style.display === 'block' && !tooltipEl.contains(event.target)) {
                tooltipEl.style.display = 'none';
            }
        });
    }
    tooltipEl.textContent = text;
    tooltipEl.style.display = 'block';
    tooltipEl.style.left = (clientX + 12 + window.scrollX) + 'px';
    tooltipEl.style.top = (clientY + 12 + window.scrollY) + 'px';
};

/**
 * Draw the connection lines, with an arrowhead at the destination.
 *
 * @param {CanvasRenderingContext2D} ctx Canvas context.
 * @param {Array} areas Areas.
 * @param {Array} lines Lines.
 */
const drawLines = (ctx, areas, lines) => {
    const byId = new Map(areas.map((area) => [area.id, area]));
    lines.forEach((line) => {
        const from = byId.has(line.from_areaid) ? areaCenter(byId.get(line.from_areaid)) : null;
        const to = byId.has(line.to_areaid) ? areaCenter(byId.get(line.to_areaid)) : null;
        if (!from || !to) {
            return;
        }

        ctx.save();
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();

        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const arrowLen = 12;
        ctx.setLineDash([]);
        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - arrowLen * Math.cos(angle - Math.PI / 6), to.y - arrowLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(to.x - arrowLen * Math.cos(angle + Math.PI / 6), to.y - arrowLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.arc(from.x, from.y, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    });
};

/**
 * Shade the areas on the canvas so they are visible.
 *
 * @param {CanvasRenderingContext2D} ctx Canvas context.
 * @param {Array} areas Areas.
 */
const drawAreas = (ctx, areas) => {
    areas.forEach((area) => {
        const coords = parseCoords(area.coords);
        ctx.save();
        ctx.fillStyle = area.active ? 'rgba(0, 115, 230, 0.18)' : 'rgba(158, 158, 158, 0.18)';
        ctx.beginPath();
        if (area.shape === 'rect' && coords.length >= 4) {
            ctx.rect(Math.min(coords[0], coords[2]), Math.min(coords[1], coords[3]),
                Math.abs(coords[2] - coords[0]), Math.abs(coords[3] - coords[1]));
        } else if (area.shape === 'circle' && coords.length >= 3) {
            ctx.arc(coords[0], coords[1], coords[2], 0, 2 * Math.PI);
        } else if (area.shape === 'poly' && coords.length >= 6) {
            ctx.moveTo(coords[0], coords[1]);
            for (let i = 2; i < coords.length; i += 2) {
                ctx.lineTo(coords[i], coords[i + 1]);
            }
            ctx.closePath();
        }
        ctx.fill();
        ctx.restore();
    });
};

/**
 * Build the clickable overlay of one area, showing the image part with the area CSS.
 *
 * @param {Object} area Area.
 * @param {HTMLImageElement} img Loaded image.
 * @param {string} imageUrl Image URL.
 * @returns {HTMLElement|null}
 */
const buildOverlay = (area, img, imageUrl) => {
    const coords = parseCoords(area.coords);
    let left;
    let top;
    let width;
    let height;
    let clipPath = '';

    if (area.shape === 'rect' && coords.length >= 4) {
        left = Math.min(coords[0], coords[2]);
        top = Math.min(coords[1], coords[3]);
        width = Math.abs(coords[2] - coords[0]);
        height = Math.abs(coords[3] - coords[1]);
    } else if (area.shape === 'circle' && coords.length >= 3) {
        left = coords[0] - coords[2];
        top = coords[1] - coords[2];
        width = height = coords[2] * 2;
    } else if (area.shape === 'poly' && coords.length >= 6) {
        const xs = coords.filter((v, i) => i % 2 === 0);
        const ys = coords.filter((v, i) => i % 2 === 1);
        left = Math.min(...xs);
        top = Math.min(...ys);
        width = Math.max(...xs) - left;
        height = Math.max(...ys) - top;
        const points = [];
        for (let i = 0; i < coords.length; i += 2) {
            points.push(((coords[i] - left) / width * 100) + '% ' + ((coords[i + 1] - top) / height * 100) + '%');
        }
        clipPath = 'polygon(' + points.join(', ') + ')';
    } else {
        return null;
    }

    const overlay = document.createElement('div');
    overlay.className = 'imagemap-area-overlay';
    overlay.title = area.title || '';
    overlay.style.pointerEvents = (area.url || area.tooltip) ? 'auto' : 'none';
    if (area.active && area.url) {
        overlay.style.cursor = 'pointer';
    } else {
        overlay.style.cursor = area.tooltip ? 'help' : 'not-allowed';
    }
    applyAreaCss(overlay, area.active ? area.activefilter : area.inactivefilter);

    overlay.style.left = left + 'px';
    overlay.style.top = top + 'px';
    overlay.style.width = width + 'px';
    overlay.style.height = height + 'px';
    if (area.shape === 'circle') {
        overlay.style.borderRadius = '50%';
    }
    if (clipPath) {
        overlay.style.clipPath = clipPath;
    }
    overlay.style.backgroundImage = 'url("' + imageUrl + '")';
    overlay.style.backgroundSize = img.width + 'px ' + img.height + 'px';
    overlay.style.backgroundPosition = '-' + left + 'px -' + top + 'px';

    overlay.addEventListener('click', (event) => {
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
    return overlay;
};

/**
 * Start the image map rendered by the mod_imagemap/view template.
 *
 * @param {string} selector Selector of the container with the data-config attribute.
 */
export const init = (selector) => {
    const container = document.querySelector(selector);
    if (!container) {
        return;
    }
    const canvas = container.querySelector('canvas');
    const overlays = container.querySelector('.imagemap-overlays');
    const config = JSON.parse(container.dataset.config || '{}');
    const areas = config.areas || [];
    const lines = config.lines || [];

    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        overlays.style.width = img.width + 'px';
        overlays.style.height = img.height + 'px';

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        drawLines(ctx, areas, lines);
        drawAreas(ctx, areas);

        overlays.innerHTML = '';
        areas.forEach((area) => {
            const overlay = buildOverlay(area, img, config.imageurl);
            if (overlay) {
                overlays.appendChild(overlay);
            }
        });
    };
    img.src = config.imageurl;
};
