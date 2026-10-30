<?php
// This file is part of Moodle - http://moodle.org/
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
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * PHPUnit data generator for mod_imagemap.
 *
 * @package    mod_imagemap
 * @category   test
 * @copyright  2026 Kelson C. M.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Generator class for mod_imagemap.
 *
 * @package    mod_imagemap
 * @category   test
 * @copyright  2026 Kelson C. M.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class mod_imagemap_generator extends testing_module_generator {
    /**
     * Create an imagemap module instance.
     *
     * @param null|array|stdClass $record
     * @param null|array $options
     * @return stdClass
     */
    public function create_instance($record = null, ?array $options = null): stdClass {
        $record = (array)($record ?? []);

        if (!isset($record['name'])) {
            $record['name'] = 'Test imagemap';
        }
        if (!isset($record['intro'])) {
            $record['intro'] = 'Test intro';
        }
        if (!isset($record['introformat'])) {
            $record['introformat'] = FORMAT_HTML;
        }
        if (!isset($record['width'])) {
            $record['width'] = 800;
        }
        if (!isset($record['height'])) {
            $record['height'] = 600;
        }

        return parent::create_instance((object)$record, $options);
    }
}
