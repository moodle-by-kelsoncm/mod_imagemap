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
 * Draws previews of the CSS applied to areas: a dark and a light half, each with
 * coloured circles drawn with the CSS filter.
 *
 * @module     mod_imagemap/css_preview
 * @copyright  2026 Kelson C. M.
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Extract the value of the filter property from a CSS rule list.
 *
 * @param {string} cssString CSS such as "filter: blur(2px);" or a bare filter value.
 * @returns {string} Filter value, or an empty string.
 */
const filterValue = (cssString) => {
    if (!cssString || !cssString.trim() || cssString === 'none') {
        return '';
    }
    if (!cssString.includes(':')) {
        return cssString.trim();
    }
    const match = cssString.match(/filter:\s*([^;]+)/);
    return match ? match[1].trim() : '';
};

/**
 * Draw a CSS filter preview on a canvas element.
 *
 * @param {HTMLCanvasElement} canvas Canvas to draw on.
 * @param {string} cssString CSS to preview.
 */
export const draw = (canvas, cssString) => {
    if (!canvas || !canvas.getContext) {
        return;
    }

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const halfWidth = width / 2;
    const filter = filterValue(cssString);

    ctx.clearRect(0, 0, width, height);

    // Dark left half and light right half.
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, halfWidth, height);
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(halfWidth, 0, halfWidth, height);

    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(halfWidth, 0);
    ctx.lineTo(halfWidth, height);
    ctx.stroke();

    const drawFilteredShape = (x, y, radius, colour) => {
        ctx.save();
        if (filter) {
            ctx.filter = filter;
        }
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };

    const radius = Math.min(halfWidth, height) / 4;
    const topY = height / 3;
    const bottomY = (height * 2) / 3;

    drawFilteredShape(halfWidth / 2, topY, radius, '#e74c3c');
    drawFilteredShape(halfWidth + halfWidth / 2, topY, radius, '#3498db');
    drawFilteredShape(halfWidth / 2, bottomY, radius, '#27ae60');
    drawFilteredShape(halfWidth + halfWidth / 2, bottomY, radius, '#9b59b6');
};

/**
 * Draw every canvas with the css-preview-canvas class, using its data-css attribute.
 *
 * @param {HTMLElement|Document} root Element to search in.
 */
export const drawAll = (root = document) => {
    root.querySelectorAll('.css-preview-canvas').forEach((canvas) => {
        draw(canvas, canvas.getAttribute('data-css') || 'none');
    });
};
