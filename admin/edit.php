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
 * Add/Edit CSS example page.
 *
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../config.php');
require_once(__DIR__ . '/lib.php');

require_admin();
mod_imagemap_admin_setup_page('/mod/imagemap/admin/edit.php');

$id = optional_param('id', 0, PARAM_INT);
$example = null;
if ($id) {
    $example = $DB->get_record('imagemap_css_examples', ['id' => $id], '*', MUST_EXIST);
}

$form = new \mod_imagemap\form\css_example_form(null, ['example' => $example]);

if ($form->is_cancelled()) {
    redirect(new moodle_url('/mod/imagemap/admin/index.php'));
}

if ($data = $form->get_data()) {
    $dbtype = mod_imagemap_admin_normalize_type($data->type);
    if ($dbtype === null) {
        $dbtype = 'active';
    }

    $record = new stdClass();
    $record->type = $dbtype;
    $record->name = $data->name;
    $record->css_text = \mod_imagemap\local\css_rules::clean($data->css_text);
    $record->sortorder = $data->sortorder;

    if ($example) {
        $record->id = $example->id;
        $record->timemodified = time();
        $DB->update_record('imagemap_css_examples', $record);
    } else {
        $record->timecreated = time();
        $record->timemodified = time();
        $DB->insert_record('imagemap_css_examples', $record);
    }

    redirect(new moodle_url('/mod/imagemap/admin/index.php'), get_string('examplesaved', 'imagemap'));
}

echo $OUTPUT->header();
echo $OUTPUT->heading($example ? get_string('editarea', 'imagemap') : get_string('addexample', 'imagemap'));
$form->display();
echo $OUTPUT->footer();
