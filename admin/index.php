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
 * CSS examples listing page.
 *
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../config.php');
require_once(__DIR__ . '/lib.php');

mod_imagemap_admin_require_access();
mod_imagemap_admin_setup_page('/mod/imagemap/admin/index.php');

$PAGE->requires->js_call_amd('mod_imagemap/admin', 'init');

echo $OUTPUT->header();

$templatedata = [
    'heading' => $OUTPUT->heading(get_string('cssexamples', 'imagemap')),
    'addbutton' => html_writer::link(
        new moodle_url('/mod/imagemap/admin/edit.php'),
        get_string('addexample', 'imagemap'),
        ['class' => 'btn btn-primary mb-3']
    ),
    'exportbutton' => html_writer::link(
        new moodle_url('/mod/imagemap/admin/export.php', ['sesskey' => sesskey()]),
        get_string('exportexamples', 'imagemap'),
        ['class' => 'btn btn-success mb-3 ms-2']
    ),
    'importbutton' => html_writer::link(
        new moodle_url('/mod/imagemap/admin/import_form.php'),
        get_string('importexamples', 'imagemap'),
        ['class' => 'btn btn-info mb-3 ms-2']
    ),
    'types' => [],
];

$templatetypesdata = [];
foreach (['active', 'inactive', 'acthover', 'inahover'] as $type) {
    $examples = mod_imagemap_admin_get_examples($type);

    $typedata = [];
    $typedata["type"] = $type;

    // Generate CSS-friendly IDs from internal type names.
    // acthover -> active-hover, inahover -> inactive-hover.
    if ($type === 'acthover') {
        $typedata["tabid"] = 'tab-active-hover';
        $typedata["paneid"] = 'active-hover-pane';
    } else if ($type === 'inahover') {
        $typedata["tabid"] = 'tab-inactive-hover';
        $typedata["paneid"] = 'inactive-hover-pane';
    } else {
        $typedata["tabid"] = 'tab-' . $type;
        $typedata["paneid"] = $type . '-pane';
    }

    $typedata["label"] = get_string($type . 'filter', 'imagemap');
    $typedata["has_examples"] = !empty($examples);
    $typedata["active"] = ($type === 'active');
    $typedata["examples"] = [];

    if (!empty($examples)) {
        foreach ($examples as $example) {
            $typedata["examples"][] = [
                'name' => s($example->name),
                'sortorder' => $example->sortorder,
                'css_text' => $example->css_text,
                'editurl' => (string) new moodle_url('/mod/imagemap/admin/edit.php', ['id' => $example->id]),
                'deleteurl' => (string) new moodle_url(
                    '/mod/imagemap/admin/delete.php',
                    ['id' => $example->id, 'sesskey' => sesskey()]
                ),
            ];
        }
    }
    $templatetypesdata[] = $typedata;
}

$templatedata['types'] = $templatetypesdata;

// Debug helper intentionally disabled.

echo $OUTPUT->render_from_template('mod_imagemap/admin_css_examples', $templatedata);

echo $OUTPUT->footer();
