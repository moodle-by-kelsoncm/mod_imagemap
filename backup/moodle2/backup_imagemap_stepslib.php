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
 * Backup steps for mod_imagemap
 *
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Define the complete imagemap structure for backup, with file and id annotations
 *
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class backup_imagemap_activity_structure_step extends backup_activity_structure_step {
    /**
     * Define the structure of the backup
     */
    protected function define_structure() {

        // To know if we are including all the files.
        $userinfo = $this->get_setting_value('userinfo');

        // Define each element separated.
        $imagemap = new backup_nested_element('imagemap', ['id'], [
            'course', 'name', 'intro', 'introformat', 'timemodified', 'width', 'height',
        ]);

        $areas = new backup_nested_element('areas');

        $area = new backup_nested_element('area', ['id'], [
            'imagemapid', 'shape', 'coords', 'targettype', 'targetid', 'title',
            'activefilter', 'inactivefilter', 'sortorder',
        ]);

        $lines = new backup_nested_element('lines');

        $line = new backup_nested_element('line', ['id'], [
            'imagemapid', 'from_areaid', 'to_areaid', 'timecreated',
        ]);

        $cssexamples = new backup_nested_element('css_examples');

        $cssexample = new backup_nested_element('css_example', ['id'], [
            'type', 'name', 'css_text', 'sortorder', 'timecreated', 'timemodified',
        ]);

        // Build the tree.
        $imagemap->add_child($areas);
        $areas->add_child($area);
        $imagemap->add_child($lines);
        $lines->add_child($line);
        $imagemap->add_child($cssexamples);
        $cssexamples->add_child($cssexample);

        // Define sources.
        $imagemap->set_source_table('imagemap', ['id' => backup::VAR_ACTIVITYID]);

        $area->set_source_table('imagemap_area', ['imagemapid' => backup::VAR_PARENTID]);

        $line->set_source_table('imagemap_line', ['imagemapid' => backup::VAR_ACTIVITYID]);

        // CSS examples are global, but included in backup for portability.
        $cssexample->set_source_table('imagemap_css_examples', []);

        // Define file annotations.
        $imagemap->annotate_files('mod_imagemap', 'intro', null);
        $imagemap->annotate_files('mod_imagemap', 'image', null);

        // Return the root element wrapped into the standard activity structure.
        return $this->prepare_activity_structure($imagemap);
    }
}
