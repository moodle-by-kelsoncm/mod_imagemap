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
 * Admin helpers for CSS examples pages.
 *
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../config.php');
require_once(__DIR__ . '/../lib.php');

require_login();

/**
 * Common page setup for admin pages.
 *
 * @param string $url
 */
function mod_imagemap_admin_setup_page(string $url): void {
    global $PAGE;

    $PAGE->set_url($url);
    $PAGE->set_context(context_system::instance());
    $PAGE->set_title(get_string('cssexamples', 'imagemap'));
    $PAGE->set_heading(get_string('cssexamples', 'imagemap'));
    $PAGE->set_pagelayout('admin');

    $PAGE->navbar->add(
        get_string('pluginadministration', 'imagemap'),
        new moodle_url('/admin/category.php', ['category' => 'modsettings'])
    );
    $PAGE->navbar->add(get_string('cssexamples', 'imagemap'));
}

/**
 * Normalize external/internal type identifiers to DB-safe values.
 *
 * @param string $type
 * @return string|null
 */
function mod_imagemap_admin_normalize_type(string $type): ?string {
    $map = [
        'active' => 'active',
        'inactive' => 'inactive',
        'activehover' => 'acthover',
        'inactivehover' => 'inahover',
        'acthover' => 'acthover',
        'inahover' => 'inahover',
    ];

    $key = core_text::strtolower(trim($type));
    return $map[$key] ?? null;
}

/**
 * Convert DB type to exported/public identifier.
 *
 * @param string $type
 * @return string
 */
function mod_imagemap_admin_export_type(string $type): string {
    $map = [
        'active' => 'active',
        'inactive' => 'inactive',
        'acthover' => 'activehover',
        'inahover' => 'inactivehover',
    ];

    return $map[$type] ?? $type;
}

/**
 * Allowed CSS example types.
 *
 * @return array<int, string>
 */
function mod_imagemap_admin_allowed_types(): array {
    return ['active', 'inactive', 'acthover', 'inahover'];
}

/**
 * Get default examples by type.
 *
 * @param string $type
 * @return array<int, array<string, mixed>>
 */
function mod_imagemap_admin_default_examples(string $type): array {
    $type = mod_imagemap_admin_normalize_type($type) ?? $type;

    if ($type === 'active') {
        return [
            ['type' => 'active', 'name' => 'Sem Efeito', 'css_text' => 'none', 'sortorder' => 0],
            ['type' => 'active', 'name' => 'Grayscale', 'css_text' => 'filter: grayscale(100%)', 'sortorder' => 1],
            ['type' => 'active', 'name' => 'Opacity 50%', 'css_text' => 'filter: opacity(0.5)', 'sortorder' => 2],
            ['type' => 'active', 'name' => 'Blur', 'css_text' => 'filter: blur(2px)', 'sortorder' => 3],
            ['type' => 'active', 'name' => 'Borda Azul', 'css_text' => 'border: 2px solid #0073e6;', 'sortorder' => 4],
        ];
    }

    if ($type === 'acthover') {
        return [
            ['type' => 'acthover', 'name' => 'Sem Efeito', 'css_text' => 'none', 'sortorder' => 0],
            [
                'type' => 'acthover', 'name' => 'Brilho Leve',
                'css_text' => 'filter: brightness(1.15);', 'sortorder' => 1,
            ],
            [
                'type' => 'acthover', 'name' => 'Realce Azul',
                'css_text' => 'box-shadow: 0 0 0 3px rgba(0,115,230,0.4);', 'sortorder' => 2,
            ],
            ['type' => 'acthover', 'name' => 'Zoom Suave', 'css_text' => 'transform: scale(1.03);', 'sortorder' => 3],
            [
                'type' => 'acthover', 'name' => 'Contraste Leve',
                'css_text' => 'filter: contrast(1.15);', 'sortorder' => 4,
            ],
            [
                'type' => 'acthover', 'name' => 'Saturacao Leve',
                'css_text' => 'filter: saturate(1.25);', 'sortorder' => 5,
            ],
            [
                'type' => 'acthover', 'name' => 'Halo Verde',
                'css_text' => 'box-shadow: 0 0 0 3px rgba(40,167,69,0.35);', 'sortorder' => 6,
            ],
        ];
    }

    if ($type === 'inahover') {
        return [
            ['type' => 'inahover', 'name' => 'Sem Efeito', 'css_text' => 'none', 'sortorder' => 0],
            [
                'type' => 'inahover', 'name' => 'Cinza + Escuro',
                'css_text' => 'filter: grayscale(1) brightness(0.75);', 'sortorder' => 1,
            ],
            [
                'type' => 'inahover', 'name' => 'Desfoque Leve',
                'css_text' => 'filter: blur(1px) grayscale(0.7);', 'sortorder' => 2,
            ],
            ['type' => 'inahover', 'name' => 'Opacidade Reduzida', 'css_text' => 'opacity: 0.75;', 'sortorder' => 3],
            [
                'type' => 'inahover', 'name' => 'Baixo Contraste',
                'css_text' => 'filter: contrast(0.75) brightness(0.8);', 'sortorder' => 4,
            ],
            [
                'type' => 'inahover', 'name' => 'Dessaturado',
                'css_text' => 'filter: saturate(0.35) brightness(0.85);', 'sortorder' => 5,
            ],
        ];
    }

    if ($type === 'inactive') {
        return [
            ['type' => 'inactive', 'name' => 'Sem Efeito', 'css_text' => 'none', 'sortorder' => 0],
            ['type' => 'inactive', 'name' => 'Grayed Out', 'css_text' => 'filter: grayscale(1)', 'sortorder' => 1],
            ['type' => 'inactive', 'name' => 'Blurred', 'css_text' => 'filter: blur(3px)', 'sortorder' => 2],
            ['type' => 'inactive', 'name' => 'Borda Cinza', 'css_text' => 'border: 2px solid #9e9e9e;', 'sortorder' => 3],
        ];
    }

    return [];
}

/**
 * Get CSS examples of a type and create defaults if none exist.
 *
 * @param string $type
 * @return array
 */
function mod_imagemap_admin_get_examples(string $type): array {
    global $DB;

    $type = mod_imagemap_admin_normalize_type($type) ?? '';

    if (!in_array($type, mod_imagemap_admin_allowed_types(), true)) {
        return [];
    }

    $examples = $DB->get_records('imagemap_css_examples', ['type' => $type], 'sortorder ASC, name ASC');
    if (!empty($examples)) {
        return $examples;
    }

    foreach (mod_imagemap_admin_default_examples($type) as $example) {
        $record = new stdClass();
        $record->type = $example['type'];
        $record->name = $example['name'];
        $record->css_text = $example['css_text'];
        $record->sortorder = $example['sortorder'];
        $record->timecreated = time();
        $record->timemodified = time();
        $DB->insert_record('imagemap_css_examples', $record);
    }

    return $DB->get_records('imagemap_css_examples', ['type' => $type], 'sortorder ASC, name ASC');
}
