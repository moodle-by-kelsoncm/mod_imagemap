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
 * Tests for the cleaning of area CSS.
 *
 * @package    mod_imagemap
 * @category   test
 * @copyright  2026 Kelson C. M.
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \mod_imagemap\local\css_rules
 */
final class css_rules_test extends \basic_testcase {
    /**
     * Cases for clean().
     *
     * @return array
     */
    public static function clean_provider(): array {
        return [
            'empty' => ['', 'none'],
            'null' => [null, 'none'],
            'none' => ['none', 'none'],
            'bare filter' => ['grayscale(1)', 'filter: grayscale(1);'],
            'declaration' => ['filter: grayscale(100%)', 'filter: grayscale(100%);'],
            'several declarations' => [
                'border: 2px solid #0073e6; opacity: 0.5;',
                'border: 2px solid #0073e6; opacity: 0.5;',
            ],
            'shadow with rgba' => [
                'box-shadow: 0 0 0 3px rgba(0,115,230,0.4);',
                'box-shadow: 0 0 0 3px rgba(0,115,230,0.4);',
            ],
            'property in upper case' => ['FILTER: blur(2px)', 'filter: blur(2px);'],
            'property not allowed' => ['position: fixed; filter: blur(1px)', 'filter: blur(1px);'],
            'only properties not allowed' => ['display: none', 'none'],
            'url' => ['background-color: red; filter: url(https://example.com/x.svg)', 'background-color: red;'],
            'expression' => ['opacity: expression(alert(1))', 'none'],
            'quotes' => ['filter: blur(1px)"><script>', 'none'],
            'braces' => ['opacity: 1} body {display: none', 'none'],
            'comment' => ['opacity: 1/* x */', 'none'],
            'backslash' => ['opacity: \\31', 'none'],
        ];
    }

    /**
     * clean() keeps only allowed properties with plain values.
     *
     * @dataProvider clean_provider
     * @param string|null $css Raw CSS.
     * @param string $expected Cleaned CSS.
     */
    public function test_clean(?string $css, string $expected): void {
        $this->assertSame($expected, css_rules::clean($css));
    }

    /**
     * Rules longer than the limit are dropped.
     */
    public function test_clean_too_long(): void {
        $css = str_repeat('opacity: 0.5; ', 100);
        $this->assertSame('none', css_rules::clean($css));
    }
}
