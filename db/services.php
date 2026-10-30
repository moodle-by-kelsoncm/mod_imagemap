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

/**
 * External services of mod_imagemap, used by the area editor.
 *
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$functions = [
    'mod_imagemap_update_area_coords' => [
        'classname' => \mod_imagemap\external\update_area_coords::class,
        'description' => 'Update the coordinates of an area after it is moved or resized.',
        'type' => 'write',
        'ajax' => true,
        'capabilities' => 'mod/imagemap:manage',
    ],
    'mod_imagemap_save_line' => [
        'classname' => \mod_imagemap\external\save_line::class,
        'description' => 'Create a connection line between two areas.',
        'type' => 'write',
        'ajax' => true,
        'capabilities' => 'mod/imagemap:manage',
    ],
    'mod_imagemap_delete_line' => [
        'classname' => \mod_imagemap\external\delete_line::class,
        'description' => 'Delete a connection line.',
        'type' => 'write',
        'ajax' => true,
        'capabilities' => 'mod/imagemap:manage',
    ],
];
