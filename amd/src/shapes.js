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
 * Helpers for the shapes of image map areas, shared by the viewer and the editor.
 *
 * @module     mod_imagemap/shapes
 * @copyright  2026 Kelson C. M.
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Parse comma-separated coordinates.
 *
 * @param {string} coords Coordinates such as "10,20,30,40".
 * @returns {number[]} Numbers, without the invalid ones.
 */
export const parseCoords = (coords) => {
    if (!coords) {
        return [];
    }
    return String(coords).split(',').map((value) => parseFloat(value)).filter((value) => !isNaN(value));
};

/**
 * Centre of an area.
 *
 * @param {Object} area Area with shape and coords.
 * @returns {{x: number, y: number}|null}
 */
export const areaCenter = (area) => {
    const coords = parseCoords(area.coords);
    if (area.shape === 'rect' && coords.length >= 4) {
        return {x: (coords[0] + coords[2]) / 2, y: (coords[1] + coords[3]) / 2};
    }
    if (area.shape === 'circle' && coords.length >= 3) {
        return {x: coords[0], y: coords[1]};
    }
    if (area.shape === 'poly' && coords.length >= 6) {
        let x = 0;
        let y = 0;
        const points = coords.length / 2;
        for (let i = 0; i < coords.length; i += 2) {
            x += coords[i];
            y += coords[i + 1];
        }
        return {x: x / points, y: y / points};
    }
    return null;
};

/**
 * Apply the CSS of an area (already cleaned on the server) to an element.
 *
 * @param {HTMLElement} element Element.
 * @param {string} css Declarations such as "filter: grayscale(1);", a bare filter value, or "none".
 */
export const applyAreaCss = (element, css) => {
    if (!css || css === 'none') {
        return;
    }
    if (!css.includes(':')) {
        element.style.filter = css;
        return;
    }
    css.split(';').forEach((rule) => {
        const parts = rule.split(':');
        if (parts.length === 2 && parts[0].trim()) {
            element.style.setProperty(parts[0].trim(), parts[1].trim());
        }
    });
};
