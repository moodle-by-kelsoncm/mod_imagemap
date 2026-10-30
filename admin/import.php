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
 * Import CSS examples endpoint.
 *
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../config.php');
require_once(__DIR__ . '/lib.php');

require_admin();
mod_imagemap_admin_setup_page('/mod/imagemap/admin/import.php');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect(new moodle_url('/mod/imagemap/admin/import_form.php'));
}

require_sesskey();

if (!isset($_FILES['importfile']) || $_FILES['importfile']['error'] !== UPLOAD_ERR_OK) {
    redirect(
        new moodle_url('/mod/imagemap/admin/import_form.php'),
        get_string('errorimportfile', 'imagemap'),
        null,
        \core\output\notification::NOTIFY_ERROR
    );
}

$file = $_FILES['importfile'];
$content = file_get_contents($file['tmp_name']);
$importdata = json_decode($content, true);
if (!is_array($importdata)) {
    redirect(
        new moodle_url('/mod/imagemap/admin/import_form.php'),
        get_string('errorinvalidjson', 'imagemap'),
        null,
        \core\output\notification::NOTIFY_ERROR
    );
}

$inserted = 0;
$updated = 0;
$skipped = 0;
foreach ($importdata as $item) {
    if (!isset($item['type'], $item['name'], $item['css_text'])) {
        $skipped++;
        continue;
    }

    $dbtype = mod_imagemap_admin_normalize_type((string)$item['type']);
    if ($dbtype === null || !in_array($dbtype, mod_imagemap_admin_allowed_types(), true)) {
        $skipped++;
        continue;
    }

    $existing = $DB->get_record('imagemap_css_examples', [
        'type' => $dbtype,
        'name' => clean_param((string)$item['name'], PARAM_TEXT),
    ]);

    if ($existing) {
        $existing->css_text = \mod_imagemap\local\css_rules::clean((string)$item['css_text']);
        $existing->timemodified = time();
        $DB->update_record('imagemap_css_examples', $existing);
        $updated++;
    } else {
        $maxorder = $DB->get_field_sql(
            'SELECT MAX(sortorder) FROM {imagemap_css_examples} WHERE type = ?',
            [$dbtype]
        );

        $record = new stdClass();
        $record->type = $dbtype;
        $record->name = clean_param((string)$item['name'], PARAM_TEXT);
        $record->css_text = \mod_imagemap\local\css_rules::clean((string)$item['css_text']);
        $record->sortorder = ($maxorder === null ? -1 : (int)$maxorder) + 1;
        $record->timecreated = time();
        $record->timemodified = time();
        $DB->insert_record('imagemap_css_examples', $record);
        $inserted++;
    }
}

$message = get_string('examplesimportedstats', 'imagemap', [
    'inserted' => $inserted,
    'updated' => $updated,
    'skipped' => $skipped,
]);

redirect(
    new moodle_url('/mod/imagemap/admin/index.php'),
    $message,
    null,
    \core\output\notification::NOTIFY_SUCCESS
);
