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
 * Restore task for mod_imagemap
 *
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/mod/imagemap/backup/moodle2/restore_imagemap_stepslib.php');

/**
 * Restore task class for mod_imagemap
 *
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class restore_imagemap_activity_task extends restore_activity_task {
    /**
     * Define (add) particular settings this activity can have
     */
    protected function define_my_settings() {
        // No particular settings for imagemap, so nothing to define.
    }

    /**
     * Define (add) particular steps this activity can have
     */
    protected function define_my_steps() {
        // As this activity can have files, use one extra step to handle them.
        $this->add_step(new restore_imagemap_activity_structure_step('imagemap_structure', 'imagemap.xml'));
    }

    /**
     * Remap the targets of the restored areas once the whole course is restored.
     *
     * A target without a mapping was not part of the backup: it is kept when it belongs to the
     * course being restored into (e.g. duplicating the activity) and cleared otherwise.
     */
    public function after_restore() {
        global $DB;

        $itemnames = ['module' => 'course_module', 'section' => 'course_section'];
        $tables = ['module' => 'course_modules', 'section' => 'course_sections'];
        $courseid = $this->get_courseid();

        $areas = $DB->get_records('imagemap_area', ['imagemapid' => $this->get_activityid()], '', 'id, targettype, targetid');
        foreach ($areas as $area) {
            if (!isset($itemnames[$area->targettype]) || empty($area->targetid)) {
                continue;
            }
            $mapping = restore_dbops::get_backup_ids_record(
                $this->get_restoreid(),
                $itemnames[$area->targettype],
                $area->targetid
            );
            if ($mapping && $mapping->newitemid) {
                $newid = (int)$mapping->newitemid;
            } else if ($DB->record_exists($tables[$area->targettype], ['id' => $area->targetid, 'course' => $courseid])) {
                $newid = (int)$area->targetid;
            } else {
                $newid = 0;
            }
            if ($newid !== (int)$area->targetid) {
                $DB->set_field('imagemap_area', 'targetid', $newid, ['id' => $area->id]);
            }
        }
    }

    /**
     * Define the contents in the activity that must be
     * processed by the link decoder
     */
    public static function define_decode_contents() {
        $contents = [];

        $contents[] = new restore_decode_content('imagemap', ['intro'], 'imagemap');

        return $contents;
    }

    /**
     * Define the decoding rules for links belonging
     * to the activity to be executed by the link decoder
     */
    public static function define_decode_rules() {
        $rules = [];

        $rules[] = new restore_decode_rule('IMAGEMAPINDEX', '/mod/imagemap/index.php?id=$1', 'course');
        $rules[] = new restore_decode_rule('IMAGEMAPVIEWBYID', '/mod/imagemap/view.php?id=$1', 'course_module');

        return $rules;
    }

    /**
     * Define the restore log rules that will be applied
     * by the {@link restore_logs_processor} when restoring
     * imagemap logs
     */
    public static function define_restore_log_rules() {
        $rules = [];

        $rules[] = new restore_log_rule('imagemap', 'add', 'view.php?id={course_module}', '{imagemap}');
        $rules[] = new restore_log_rule('imagemap', 'update', 'view.php?id={course_module}', '{imagemap}');
        $rules[] = new restore_log_rule('imagemap', 'view', 'view.php?id={course_module}', '{imagemap}');
        $rules[] = new restore_log_rule('imagemap', 'delete', 'index.php?id={course}', '{imagemap}');

        return $rules;
    }
}
