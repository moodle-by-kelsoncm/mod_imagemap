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
 * Restore steps for mod_imagemap
 *
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Structure step to restore one imagemap activity
 *
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class restore_imagemap_activity_structure_step extends restore_activity_structure_step {
    /**
     * Define the structure of the restore
     */
    protected function define_structure() {

        $paths = [];

        // Learn the imagemap element.
        $imagemap = new restore_path_element('imagemap', '/activity/imagemap');
        $paths[] = $imagemap;

        // Learn about areas.
        $paths[] = new restore_path_element('imagemap_area', '/activity/imagemap/areas/area');

        // Learn about lines.
        $paths[] = new restore_path_element('imagemap_line', '/activity/imagemap/lines/line');

        // Learn about CSS examples.
        $paths[] = new restore_path_element('imagemap_css_example', '/activity/imagemap/css_examples/css_example');

        // Return the paths wrapped into standard activity structure.
        return $this->prepare_activity_structure($paths);
    }

    /**
     * Process the imagemap element
     *
     * @param array $data The data from the backup file
     */
    protected function process_imagemap($data) {
        global $DB;

        $data = (object)$data;
        $data->course = $this->get_courseid();

        // Insert the imagemap record and register it as the restored activity instance.
        $newitemid = $DB->insert_record('imagemap', $data);
        $this->apply_activity_instance($newitemid);
    }

    /**
     * Process the imagemap_area element
     *
     * @param array $data The data from the backup file
     */
    protected function process_imagemap_area($data) {
        global $DB;

        $data = (object)$data;
        $data->imagemapid = $this->get_new_parentid('imagemap');

        // The targetid keeps the old course module or section id for now: activities after this one
        // are not restored yet. restore_imagemap_activity_task::after_restore() remaps it.

        $newitemid = $DB->insert_record('imagemap_area', $data);
        $this->set_mapping('imagemap_area', $data->id, $newitemid);
    }

    /**
     * Process the imagemap_line element
     *
     * @param array $data The data from the backup file
     */
    protected function process_imagemap_line($data) {
        global $DB;

        $data = (object)$data;
        $data->imagemapid = $this->get_new_parentid('imagemap');

        // Map the area IDs..
        $data->from_areaid = $this->get_mappingid('imagemap_area', $data->from_areaid);
        $data->to_areaid = $this->get_mappingid('imagemap_area', $data->to_areaid);

        // Only insert if both areas were successfully mapped.
        if ($data->from_areaid && $data->to_areaid) {
            $newitemid = $DB->insert_record('imagemap_line', $data);
            $this->set_mapping('imagemap_line', $data->id, $newitemid);
        }
    }

    /**
     * Process the imagemap_css_example element
     *
     * @param array $data The data from the backup file
     */
    protected function process_imagemap_css_example($data) {
        global $DB;

        $data = (object)$data;

        // CSS examples are global, but we restore them to ensure availability.
        // Check if this example already exists to avoid duplicates.
        $existing = $DB->get_record('imagemap_css_examples', [
            'type' => $data->type,
            'name' => $data->name,
        ]);

        if (!$existing) {
            // If it doesn't exist, insert it.
            $newitemid = $DB->insert_record('imagemap_css_examples', $data);
            $this->set_mapping('imagemap_css_example', $data->id, $newitemid);
        }
    }

    /**
     * Define the decoding rules for links belonging
     * to the activity to be executed by the link decoder
     */
    protected function define_decode_rules() {
        $rules = [];

        return $rules;
    }

    /**
     * Execute after-restore activities for this step.
     * Files, links decoder, etc.
     */
    protected function after_execute() {
        // Add imagemap files, no need to match by itemname (just internally handled context files).
        $this->add_related_files('mod_imagemap', 'intro', null);
        $this->add_related_files('mod_imagemap', 'image', null);
    }
}
