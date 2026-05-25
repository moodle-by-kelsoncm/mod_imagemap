define([], function() {
    var isResizeBound = false;
    var resizeScheduled = false;
    var mutationObserver = null;

    function parseCoords(coordsText) {
        if (!coordsText) {
            return [];
        }
        return coordsText.split(',').map(function(value) {
            return parseFloat(value);
        }).filter(function(value) {
            return !isNaN(value);
        });
    }

    function parseSummaryData(dataText) {
        if (!dataText) {
            return null;
        }

        try {
            return JSON.parse(dataText);
        } catch (error) {
            return null;
        }
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

    function buildClipPath(area, coords, left, top, width, height) {
        if (area.shape === 'poly' && coords.length >= 6) {
            var points = [];
            for (var i = 0; i < coords.length; i += 2) {
                var px = ((coords[i] - left) / width) * 100;
                var py = ((coords[i + 1] - top) / height) * 100;
                points.push(px + '% ' + py + '%');
            }
            return 'polygon(' + points.join(', ') + ')';
        }
        return '';
    }

    function getAreaBox(area, coords) {
        if (area.shape === 'rect' && coords.length >= 4) {
            var x1 = Math.min(coords[0], coords[2]);
            var y1 = Math.min(coords[1], coords[3]);
            var x2 = Math.max(coords[0], coords[2]);
            var y2 = Math.max(coords[1], coords[3]);
            return { left: x1, top: y1, width: x2 - x1, height: y2 - y1, radius: false, clipPath: '' };
        }

        if (area.shape === 'circle' && coords.length >= 3) {
            var r = coords[2];
            return {
                left: coords[0] - r,
                top: coords[1] - r,
                width: r * 2,
                height: r * 2,
                radius: true,
                clipPath: ''
            };
        }

        if (area.shape === 'poly' && coords.length >= 6) {
            var xs = [];
            var ys = [];
            for (var i = 0; i < coords.length; i += 2) {
                xs.push(coords[i]);
                ys.push(coords[i + 1]);
            }
            var left = Math.min.apply(null, xs);
            var top = Math.min.apply(null, ys);
            var width = Math.max.apply(null, xs) - left;
            var height = Math.max.apply(null, ys) - top;
            if (width <= 0 || height <= 0) {
                return null;
            }
            return {
                left: left,
                top: top,
                width: width,
                height: height,
                radius: false,
                clipPath: buildClipPath(area, coords, left, top, width, height)
            };
        }

        return null;
    }

    function createOverlay(area, image, scaleX, scaleY, naturalWidth, naturalHeight) {
        var coords = parseCoords(area.coords);
        if (!coords.length) {
            return null;
        }

        var box = getAreaBox(area, coords);
        if (!box || box.width <= 0 || box.height <= 0) {
            return null;
        }

        var overlay = document.createElement('a');
        overlay.className = 'imagemap-area-overlay';
        overlay.style.position = 'absolute';
        overlay.style.left = (box.left * scaleX) + 'px';
        overlay.style.top = (box.top * scaleY) + 'px';
        overlay.style.width = (box.width * scaleX) + 'px';
        overlay.style.height = (box.height * scaleY) + 'px';
        overlay.style.backgroundImage = 'url("' + image.src + '")';
        overlay.style.backgroundRepeat = 'no-repeat';
        overlay.style.backgroundSize = (naturalWidth * scaleX) + 'px ' + (naturalHeight * scaleY) + 'px';
        overlay.style.backgroundPosition = '-' + (box.left * scaleX) + 'px -' + (box.top * scaleY) + 'px';
        overlay.style.display = 'block';
        overlay.style.textDecoration = 'none';

        if (box.radius) {
            overlay.style.borderRadius = '50%';
        }

        if (box.clipPath) {
            overlay.style.clipPath = box.clipPath;
            overlay.style.webkitClipPath = box.clipPath;
        }

        var cssText = area.active ? (area.activefilter || 'none') : (area.inactivefilter || 'filter: grayscale(100%);');
        applyCssTextToStyle(overlay.style, cssText);

        if (area.title) {
            overlay.title = area.title;
        }

        if (area.active && area.url) {
            overlay.href = area.url;
            overlay.style.pointerEvents = 'auto';
            overlay.style.cursor = 'pointer';
        } else {
            overlay.href = 'javascript:void(0)';
            overlay.style.pointerEvents = 'auto';
            overlay.style.cursor = area.tooltip ? 'help' : 'not-allowed';
            if (area.tooltip) {
                overlay.title = area.tooltip;
            }
        }

        return overlay;
    }

    function renderSummary(container) {
        if (!container) {
            return;
        }

        var dataText = container.getAttribute('data-imagemap-summary');
        if (!dataText) {
            return;
        }

        var data = parseSummaryData(dataText);
        if (!data) {
            return;
        }

        var image = container.querySelector('.mod-imagemap-summary-image');
        var overlays = container.querySelector('.mod-imagemap-summary-overlays');
        if (!image || !overlays) {
            return;
        }

        var naturalWidth = image.naturalWidth;
        var naturalHeight = image.naturalHeight;
        if (!naturalWidth || !naturalHeight) {
            return;
        }

        var renderedWidth = image.clientWidth;
        var renderedHeight = image.clientHeight;
        if (!renderedWidth || !renderedHeight) {
            return;
        }

        var scaleX = renderedWidth / naturalWidth;
        var scaleY = renderedHeight / naturalHeight;

        overlays.innerHTML = '';
        overlays.style.width = renderedWidth + 'px';
        overlays.style.height = renderedHeight + 'px';

        (data.areas || []).forEach(function(area) {
            var overlay = createOverlay(area, image, scaleX, scaleY, naturalWidth, naturalHeight);
            if (overlay) {
                overlays.appendChild(overlay);
            }
        });
    }

    function renderAll() {
        var summaries = document.querySelectorAll('.mod-imagemap-course-summary[data-imagemap-summary]');
        summaries.forEach(function(container) {
            renderSummary(container);
        });
    }

    function initContainer(container) {
        if (!container || container.getAttribute('data-imagemap-summary-initialized') === '1') {
            return;
        }

        bindImageLoad(container);

        if (typeof window.ResizeObserver !== 'undefined') {
            var image = container.querySelector('.mod-imagemap-summary-image');
            if (image) {
                var resizeObserver = new window.ResizeObserver(function() {
                    renderSummary(container);
                });
                resizeObserver.observe(image);
            }
        }

        container.setAttribute('data-imagemap-summary-initialized', '1');
    }

    function initInRoot(root) {
        if (!root || root.nodeType !== 1) {
            return;
        }

        if (root.matches && root.matches('.mod-imagemap-course-summary[data-imagemap-summary]')) {
            initContainer(root);
            renderSummary(root);
        }

        var summaries = root.querySelectorAll ? root.querySelectorAll('.mod-imagemap-course-summary[data-imagemap-summary]') : [];
        summaries.forEach(function(container) {
            initContainer(container);
            renderSummary(container);
        });
    }

    function onResize() {
        if (resizeScheduled) {
            return;
        }
        resizeScheduled = true;
        window.requestAnimationFrame(function() {
            resizeScheduled = false;
            renderAll();
        });
    }

    function bindImageLoad(container) {
        var image = container.querySelector('.mod-imagemap-summary-image');
        if (!image || image.getAttribute('data-imagemap-summary-bound') === '1') {
            return;
        }

        if (!image.complete) {
            image.addEventListener('load', function() {
                renderSummary(container);
            });
        }
        image.setAttribute('data-imagemap-summary-bound', '1');
    }

    return {
        init: function() {
            var summaries = document.querySelectorAll('.mod-imagemap-course-summary[data-imagemap-summary]');
            summaries.forEach(function(container) {
                initContainer(container);
            });

            renderAll();

            if (!isResizeBound) {
                window.addEventListener('resize', onResize);
                isResizeBound = true;
            }

            if (!mutationObserver && typeof window.MutationObserver !== 'undefined') {
                mutationObserver = new window.MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        mutation.addedNodes.forEach(function(node) {
                            initInRoot(node);
                        });
                    });
                });

                mutationObserver.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }
        }
    };
});
