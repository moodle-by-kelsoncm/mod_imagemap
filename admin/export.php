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
 * Export CSS examples endpoint.
 *
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../config.php');
require_once(__DIR__ . '/lib.php');

require_admin();
mod_imagemap_admin_setup_page('/mod/imagemap/admin/export.php');

require_sesskey();

$allexamples = $DB->get_records('imagemap_css_examples', null, 'type ASC, sortorder ASC, name ASC');

$exportdata = [];
foreach ($allexamples as $example) {
    $exportdata[] = [
        'type' => mod_imagemap_admin_export_type($example->type),
        'name' => $example->name,
        'css_text' => $example->css_text,
    ];
}

$filename = 'imagemap_css_examples_' . date('Y-m-d_H-i-s') . '.json';
header('Content-Type: application/json');
header('Content-Disposition: attachment; filename="' . $filename . '"');
echo json_encode($exportdata, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
exit;
