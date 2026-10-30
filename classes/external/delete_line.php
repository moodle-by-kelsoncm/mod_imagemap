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
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Deletes a connection line of an image map.
 *
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class delete_line extends external_api {
    /**
     * Parameters of the service.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'cmid' => new external_value(PARAM_INT, 'Course module id of the image map'),
            'lineid' => new external_value(PARAM_INT, 'Line id'),
        ]);
    }

    /**
     * Delete the line.
     *
     * @param int $cmid Course module id.
     * @param int $lineid Line id.
     * @return array
     */
    public static function execute(int $cmid, int $lineid): array {
        global $DB;

        ['cmid' => $cmid, 'lineid' => $lineid] = self::validate_parameters(self::execute_parameters(), [
            'cmid' => $cmid,
            'lineid' => $lineid,
        ]);

        $cm = helper::require_manage($cmid);

        $line = $DB->get_record('imagemap_line', ['id' => $lineid, 'imagemapid' => $cm->instance], 'id', MUST_EXIST);
        $DB->delete_records('imagemap_line', ['id' => $line->id]);

        return ['success' => true];
    }

    /**
     * Result of the service.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Whether the line was deleted'),
        ]);
    }
}
