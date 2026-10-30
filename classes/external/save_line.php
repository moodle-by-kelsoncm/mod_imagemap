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
 * Creates a connection line between two areas of an image map.
 *
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class save_line extends external_api {
    /**
     * Parameters of the service.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'cmid' => new external_value(PARAM_INT, 'Course module id of the image map'),
            'fromareaid' => new external_value(PARAM_INT, 'Source area id'),
            'toareaid' => new external_value(PARAM_INT, 'Destination area id'),
        ]);
    }

    /**
     * Create the line.
     *
     * @param int $cmid Course module id.
     * @param int $fromareaid Source area id.
     * @param int $toareaid Destination area id.
     * @return array
     */
    public static function execute(int $cmid, int $fromareaid, int $toareaid): array {
        global $DB;

        [
            'cmid' => $cmid,
            'fromareaid' => $fromareaid,
            'toareaid' => $toareaid,
        ] = self::validate_parameters(self::execute_parameters(), [
            'cmid' => $cmid,
            'fromareaid' => $fromareaid,
            'toareaid' => $toareaid,
        ]);

        $cm = helper::require_manage($cmid);
        $imagemapid = (int)$cm->instance;

        if ($fromareaid === $toareaid) {
            throw new \moodle_exception('line_same_area', 'imagemap');
        }
        // Both areas must belong to this image map.
        $DB->get_record('imagemap_area', ['id' => $fromareaid, 'imagemapid' => $imagemapid], 'id', MUST_EXIST);
        $DB->get_record('imagemap_area', ['id' => $toareaid, 'imagemapid' => $imagemapid], 'id', MUST_EXIST);

        $line = ['imagemapid' => $imagemapid, 'from_areaid' => $fromareaid, 'to_areaid' => $toareaid];
        if ($DB->record_exists('imagemap_line', $line)) {
            throw new \moodle_exception('line_duplicate', 'imagemap');
        }

        $id = $DB->insert_record('imagemap_line', (object)($line + ['timecreated' => time()]));

        return ['id' => (int)$id];
    }

    /**
     * Result of the service.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'id' => new external_value(PARAM_INT, 'Id of the new line'),
        ]);
    }
}
