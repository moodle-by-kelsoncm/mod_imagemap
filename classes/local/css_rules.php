<?php
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

namespace mod_imagemap\local;

/**
 * Cleans the CSS that teachers and admins attach to image map areas.
 *
 * Only a short list of visual properties is kept, and values that could load external
 * resources or escape the declaration (url(), expression(), quotes, braces, comments) are dropped.
 *
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class css_rules {
    /** @var string[] Properties allowed in area styles. */
    public const ALLOWED_PROPERTIES = [
        'filter', 'opacity', 'transform', 'transition',
        'border', 'border-color', 'border-width', 'border-style', 'border-radius',
        'outline', 'outline-color', 'outline-width', 'outline-style', 'outline-offset',
        'box-shadow', 'background-color', 'mix-blend-mode',
    ];

    /** @var int Maximum length of a cleaned rule list. */
    public const MAX_LENGTH = 1000;

    /**
     * Clean a CSS declaration list, or a bare filter value such as "grayscale(1)".
     *
     * @param string|null $css Raw CSS from the user.
     * @return string Cleaned declarations ("prop: value; ..."), or "none" when nothing is left.
     */
    public static function clean(?string $css): string {
        $css = trim((string)$css);
        if ($css === '' || strtolower($css) === 'none') {
            return 'none';
        }
        if (strpos($css, ':') === false) {
            // A bare filter value, as accepted by the area editor.
            $css = 'filter: ' . $css;
        }

        $declarations = [];
        foreach (explode(';', $css) as $declaration) {
            $parts = explode(':', $declaration, 2);
            if (count($parts) !== 2) {
                continue;
            }
            $property = strtolower(trim($parts[0]));
            $value = trim($parts[1]);
            if (!in_array($property, self::ALLOWED_PROPERTIES, true) || !self::is_safe_value($value)) {
                continue;
            }
            $declarations[] = $property . ': ' . $value;
        }

        $result = implode('; ', $declarations);
        if ($result === '' || \core_text::strlen($result) > self::MAX_LENGTH) {
            return 'none';
        }
        return $result . ';';
    }

    /**
     * Whether a CSS value only uses plain tokens.
     *
     * @param string $value CSS value.
     * @return bool
     */
    private static function is_safe_value(string $value): bool {
        if ($value === '' || preg_match('/url\s*\(|expression\s*\(|javascript:|@import|\/\*/i', $value)) {
            return false;
        }
        return (bool)preg_match('/^[a-zA-Z0-9\s#%.,()+\-]+$/', $value);
    }
}
