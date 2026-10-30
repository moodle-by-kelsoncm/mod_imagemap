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

namespace mod_imagemap\external;

use core_external\external_api;

/**
 * Access checks shared by the external services of the area editor.
 *
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class helper {
    /**
     * Validate the context of an image map and require the capability to manage it.
     *
     * @param int $cmid Course module id of the image map.
     * @return \stdClass The course module.
     */
    public static function require_manage(int $cmid): \stdClass {
        $cm = get_coursemodule_from_id('imagemap', $cmid, 0, false, MUST_EXIST);
        $context = \context_module::instance($cm->id);
        external_api::validate_context($context);
        require_capability('mod/imagemap:manage', $context);
        return $cm;
    }
}
