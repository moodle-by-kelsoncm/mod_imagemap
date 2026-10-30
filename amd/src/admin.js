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
 * CSS examples administration page.
 *
 * @module     mod_imagemap/admin
 * @copyright  2026 Kelson C. M.
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define([], function () {
    'use strict';

    /**
     * Initialize the admin interface
     */
    function init() {

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () {
                processCanvases();
            });
        } else {
            // DOM is already ready
            processCanvases();
        }
    }

    /**
     * Process all canvas elements
     */
    function processCanvases() {
        var canvases = document.querySelectorAll('.css-preview-canvas');

        /**
         * Process all canvas elements
         */
        function processCanvases() {
            var canvases = document.querySelectorAll('.css-preview-canvas');

            canvases.forEach(function (canvas, index) {
                var ctx = canvas.getContext('2d');
                var css = canvas.getAttribute('data-css');

                // Limpar canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Criar duas zonas: esquerda escura, direita clara
                var halfWidth = canvas.width / 2;

                // Zona escura (esquerda)
                ctx.fillStyle = '#2c3e50'; // Cinza escuro
                ctx.fillRect(0, 0, halfWidth, canvas.height);

                // Zona clara (direita)
                ctx.fillStyle = '#ecf0f1'; // Cinza claro
                ctx.fillRect(halfWidth, 0, halfWidth, canvas.height);

                // Linha divisória
                ctx.strokeStyle = '#34495e';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(halfWidth, 0);
                ctx.lineTo(halfWidth, canvas.height);
                ctx.stroke();

                // Função para aplicar filtros às formas individuais
                function applyFilterToShape(ctx, filterCSS, drawFunction) {
                    ctx.save();

                    // Aplicar filtros CSS às formas individuais
                    if (filterCSS && filterCSS.trim()) {
                        var filterValue = filterCSS;

                        // Se for CSS completo com filter:, extrair apenas o valor do filter
                        if (filterCSS.includes('filter:')) {
                            var match = filterCSS.match(/filter:\s*([^;]+)/);
                            if (match) {
                                filterValue = match[1].trim();
                            }
                        }

                        // Tentar aplicar o filtro diretamente ao contexto 2D
                        try {
                            ctx.filter = filterValue;
                        } catch (e) {
                            // Fallback: aplicar filtros simples manualmente
                            if (filterValue.includes('opacity')) {
                                var opacityMatch = filterValue.match(/opacity\((\d+(?:\.\d+)?)\)/);
                                if (opacityMatch) {
                                    ctx.globalAlpha = parseFloat(opacityMatch[1]);
                                }
                            }
                        }
                    }

                    drawFunction();
                    ctx.restore();
                }

                // Desenhar formas na zona escura (esquerda) COM filtros aplicados
                var leftX = halfWidth / 2;
                var shapeSpacing = canvas.height / 4;

                // Retângulo na zona escura
                applyFilterToShape(ctx, css, function () {
                    ctx.fillStyle = '#e74c3c'; // Vermelho
                    ctx.fillRect(leftX - 15, shapeSpacing - 8, 30, 16);
                });

                // Círculo na zona escura
                applyFilterToShape(ctx, css, function () {
                    ctx.beginPath();
                    ctx.arc(leftX, shapeSpacing * 2, 12, 0, 2 * Math.PI);
                    ctx.fillStyle = '#f39c12'; // Laranja
                    ctx.fill();
                });

                // Triângulo na zona escura
                applyFilterToShape(ctx, css, function () {
                    ctx.beginPath();
                    ctx.moveTo(leftX, shapeSpacing * 3 - 12);
                    ctx.lineTo(leftX - 12, shapeSpacing * 3 + 8);
                    ctx.lineTo(leftX + 12, shapeSpacing * 3 + 8);
                    ctx.closePath();
                    ctx.fillStyle = '#27ae60'; // Verde
                    ctx.fill();
                });

                // Desenhar formas na zona clara (direita) COM filtros aplicados
                var rightX = halfWidth + (halfWidth / 2);

                // Retângulo na zona clara
                applyFilterToShape(ctx, css, function () {
                    ctx.fillStyle = '#3498db'; // Azul
                    ctx.fillRect(rightX - 15, shapeSpacing - 8, 30, 16);
                });

                // Círculo na zona clara
                applyFilterToShape(ctx, css, function () {
                    ctx.beginPath();
                    ctx.arc(rightX, shapeSpacing * 2, 12, 0, 2 * Math.PI);
                    ctx.fillStyle = '#9b59b6'; // Roxo
                    ctx.fill();
                });

                // Triângulo na zona clara
                applyFilterToShape(ctx, css, function () {
                    ctx.beginPath();
                    ctx.moveTo(rightX, shapeSpacing * 3 - 12);
                    ctx.lineTo(rightX - 12, shapeSpacing * 3 + 8);
                    ctx.lineTo(rightX + 12, shapeSpacing * 3 + 8);
                    ctx.closePath();
                    ctx.fillStyle = '#e67e22'; // Laranja escuro
                    ctx.fill();
                });

                // Adicionar texto do filtro aplicado no canvas
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';

                var filterText = 'Sem filtro';
                if (css && css.trim()) {
                    filterText = css.length > 20 ? css.substring(0, 17) + '...' : css;
                }

                ctx.fillText(filterText, canvas.width / 2, canvas.height - 10);

            });
        }

        return {
            init: init
        };
    });