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
 * CSS Preview Canvas Utility
 * 
 * Reusable function to draw CSS filter previews on canvas elements
 * 
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

var CSSPreview = {
    /**
     * Draw a CSS filter preview on a canvas element
     * Shows a split preview: dark left side, light right side
     * with circles demonstrating the filter effect
     * 
     * @param {HTMLCanvasElement} canvas - The canvas element to draw on
     * @param {string} cssString - The CSS filter string to apply
     */
    draw: function(canvas, cssString) {
        if (!canvas || !canvas.getContext) {
            return;
        }

        var ctx = canvas.getContext('2d');
        var width = canvas.width;
        var height = canvas.height;
        var halfWidth = width / 2;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw background
        // Left side: dark
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, 0, halfWidth, height);

        // Right side: light
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(halfWidth, 0, halfWidth, height);

        // Draw divider line
        ctx.strokeStyle = '#34495e';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(halfWidth, 0);
        ctx.lineTo(halfWidth, height);
        ctx.stroke();

        // Function to apply filter to a shape
        function drawFilteredShape(x, y, radius, baseColor) {
            ctx.save();

            // Apply CSS filter if provided
            if (cssString && cssString.trim() && cssString !== 'none') {
                var filterValue = cssString;

                // Extract filter value if it's CSS syntax
                if (cssString.includes('filter:')) {
                    var match = cssString.match(/filter:\s*([^;]+)/);
                    if (match) {
                        filterValue = match[1].trim();
                    }
                }

                // Try to apply filter
                try {
                    ctx.filter = filterValue;
                } catch (e) {
                    // Fallback: manually apply simple filters
                    if (filterValue.includes('opacity')) {
                        var opacityMatch = filterValue.match(/opacity\((\d+(?:\.\d+)?)\)/);
                        if (opacityMatch) {
                            ctx.globalAlpha = parseFloat(opacityMatch[1]);
                        }
                    }
                    if (filterValue.includes('grayscale')) {
                        // grayscale cannot be applied directly in canvas, so we just reduce saturation
                        // For now, we'll just apply opacity if present
                    }
                }
            }

            // Draw circle
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // Draw top circle (on both sides with filter applied)
        var circleRadius = Math.min(halfWidth, height) / 4;
        var topY = height / 3;
        var bottomY = (height * 2) / 3;

        // Left side: red circle with filter
        drawFilteredShape(halfWidth / 2, topY, circleRadius, '#e74c3c');

        // Right side: blue circle with filter
        drawFilteredShape(halfWidth + halfWidth / 2, topY, circleRadius, '#3498db');

        // Draw bottom circle (on both sides with filter applied)
        // Left side: green circle with filter
        drawFilteredShape(halfWidth / 2, bottomY, circleRadius, '#27ae60');

        // Right side: purple circle with filter
        drawFilteredShape(halfWidth + halfWidth / 2, bottomY, circleRadius, '#9b59b6');
    },

    /**
     * Initialize all canvas elements with data-css attribute
     * Automatically finds and renders all .css-preview-canvas elements
     */
    initializeAll: function() {
        var canvases = document.querySelectorAll('.css-preview-canvas');
        canvases.forEach(function(canvas) {
            var css = canvas.getAttribute('data-css') || 'none';
            CSSPreview.draw(canvas, css);
        });
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        CSSPreview.initializeAll();
    });
} else {
    CSSPreview.initializeAll();
}
