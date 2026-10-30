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

namespace mod_imagemap\form;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/formslib.php');

/**
 * Form for editing CSS examples
 *
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class css_example_form extends \moodleform {
    /**
     * Form definition
     */
    public function definition() {
        $mform = $this->_form;

        $example = $this->_customdata['example'] ?? null;

        $mform->addElement('hidden', 'id', $example->id ?? 0);
        $mform->setType('id', PARAM_INT);

        $mform->addElement('hidden', 'action', !empty($example) ? 'edit' : 'add');
        $mform->setType('action', PARAM_ALPHA);

        $types = [
            'active' => get_string('activefilter', 'imagemap'),
            'inactive' => get_string('inactivefilter', 'imagemap'),
            'acthover' => get_string('acthoverfilter', 'imagemap'),
            'inahover' => get_string('inahoverfilter', 'imagemap'),
        ];
        $mform->addElement('select', 'type', get_string('type', 'imagemap'), $types);
        $mform->setType('type', PARAM_ALPHA);
        if ($example) {
            $mform->setDefault('type', $example->type);
        }

        $mform->addElement('text', 'name', get_string('name'), ['size' => 50]);
        $mform->setType('name', PARAM_TEXT);
        $mform->addRule('name', get_string('required'), 'required', null, 'client');
        if ($example) {
            $mform->setDefault('name', $example->name);
        }

        $mform->addElement(
            'textarea',
            'css_text',
            get_string('css_text', 'imagemap'),
            ['rows' => 5, 'cols' => 80, 'class' => 'css-input']
        );
        $mform->setType('css_text', PARAM_TEXT);
        $mform->addRule('css_text', get_string('required'), 'required', null, 'client');
        if ($example) {
            $mform->setDefault('css_text', $example->css_text);
        }

        $mform->addElement('text', 'sortorder', get_string('sortorder', 'imagemap'), ['size' => 5]);
        $mform->setType('sortorder', PARAM_INT);
        $mform->setDefault('sortorder', $example->sortorder ?? 0);

        $this->add_action_buttons(true, get_string('savechanges'));
    }
}
