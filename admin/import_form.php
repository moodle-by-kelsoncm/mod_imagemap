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
 * Import form page for CSS examples.
 *
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../config.php');
require_once(__DIR__ . '/lib.php');

require_admin();
mod_imagemap_admin_setup_page('/mod/imagemap/admin/import_form.php');

echo $OUTPUT->header();

echo $OUTPUT->heading(get_string('importexamples', 'imagemap'));

echo html_writer::start_tag('form', [
    'method' => 'post',
    'enctype' => 'multipart/form-data',
    'action' => (new moodle_url('/mod/imagemap/admin/import.php'))->out(false),
]);

echo html_writer::empty_tag('input', ['type' => 'hidden', 'name' => 'sesskey', 'value' => sesskey()]);

echo html_writer::start_div('form-group mb-3');
echo html_writer::tag('label', get_string('importfile', 'imagemap'), ['for' => 'importfile', 'class' => 'form-label']);
echo html_writer::empty_tag('input', [
    'type' => 'file',
    'name' => 'importfile',
    'id' => 'importfile',
    'accept' => '.json',
    'class' => 'form-control',
    'required' => 'required',
]);
echo html_writer::tag('small', get_string('importfile_help', 'imagemap'), ['class' => 'form-text text-muted']);
echo html_writer::end_div();

echo html_writer::start_div('form-group');
echo html_writer::tag('button', get_string('import', 'moodle'), ['type' => 'submit', 'class' => 'btn btn-primary']);
echo ' ';
echo html_writer::link(new moodle_url('/mod/imagemap/admin/index.php'), get_string('cancel'), ['class' => 'btn btn-secondary']);
echo html_writer::end_div();

echo html_writer::end_tag('form');

echo $OUTPUT->footer();
