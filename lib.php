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
 * Library of interface functions and constants for module imagemap
 *
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Returns the information on whether the module supports a feature
 *
 * @see plugin_supports() in lib/moodlelib.php
 * @param string $feature FEATURE_xx constant for requested feature
 * @return mixed true if the feature is supported, null if unknown
 */
function imagemap_supports($feature) {
    switch ($feature) {
        case FEATURE_MOD_INTRO:
            return true;
        case FEATURE_SHOW_DESCRIPTION:
            return true;
        case FEATURE_COMPLETION_TRACKS_VIEWS:
            return true;
        case FEATURE_BACKUP_MOODLE2:
            return true;
        default:
            return null;
    }
}

/**
 * Saves a new instance of the imagemap into the database
 *
 * @param stdClass $imagemap An object from the form in mod_form.php
 * @param mod_imagemap_mod_form|null $mform The form instance
 * @return int The id of the newly inserted imagemap record
 */
function imagemap_add_instance(stdClass $imagemap, ?mod_imagemap_mod_form $mform = null) {
    global $DB;

    $imagemap->timemodified = time();

    $imagemap->id = $DB->insert_record('imagemap', $imagemap);

    // Save files.
    if ($mform) {
        $context = context_module::instance($imagemap->coursemodule);
        file_save_draft_area_files($imagemap->image, $context->id, 'mod_imagemap', 'image', 0);
    }

    return $imagemap->id;
}

/**
 * Updates an instance of the imagemap in the database
 *
 * @param stdClass $imagemap An object from the form in mod_form.php
 * @param mod_imagemap_mod_form|null $mform The form instance
 * @return boolean Success/Fail
 */
function imagemap_update_instance(stdClass $imagemap, ?mod_imagemap_mod_form $mform = null) {
    global $DB;

    $imagemap->timemodified = time();
    $imagemap->id = $imagemap->instance;

    $result = $DB->update_record('imagemap', $imagemap);

    // Save files.
    if ($mform) {
        $context = context_module::instance($imagemap->coursemodule);
        file_save_draft_area_files($imagemap->image, $context->id, 'mod_imagemap', 'image', 0);
    }

    return $result;
}

/**
 * Removes an instance of the imagemap from the database
 *
 * @param int $id Id of the module instance
 * @return boolean Success/Failure
 */
function imagemap_delete_instance($id) {
    global $DB;

    if (!$imagemap = $DB->get_record('imagemap', ['id' => $id])) {
        return false;
    }

    // Delete all areas.
    $DB->delete_records('imagemap_area', ['imagemapid' => $imagemap->id]);

    // Delete all connection lines.
    $dbman = $DB->get_manager();
    $linetable = new xmldb_table('imagemap_line');
    if ($dbman->table_exists($linetable)) {
        $DB->delete_records('imagemap_line', ['imagemapid' => $imagemap->id]);
    }

    // Delete the instance.
    $DB->delete_records('imagemap', ['id' => $imagemap->id]);

    return true;
}

/**
 * Returns all other caps used in the module
 *
 * @return array
 */
function imagemap_get_extra_capabilities() {
    return ['moodle/site:accessallgroups'];
}

/**
 * Serve the files from the imagemap file areas
 *
 * @param stdClass $course the course object
 * @param stdClass $cm the course module object
 * @param stdClass $context the context
 * @param string $filearea the name of the file area
 * @param array $args extra arguments (itemid, path)
 * @param bool $forcedownload whether or not force download
 * @param array $options additional options affecting the file serving
 * @return bool false if the file not found, just send the file otherwise and do not return anything
 */
function imagemap_pluginfile($course, $cm, $context, $filearea, array $args, $forcedownload, array $options = []) {
    if ($context->contextlevel != CONTEXT_MODULE) {
        return false;
    }

    require_login($course, true, $cm);

    if ($filearea !== 'image') {
        return false;
    }

    $fs = get_file_storage();
    $itemid = array_shift($args);
    $relativepath = implode('/', $args);
    $fullpath = "/$context->id/mod_imagemap/$filearea/$itemid/$relativepath";

    $file = $fs->get_file_by_hash(sha1($fullpath));
    if (!$file || $file->is_directory()) {
        return false;
    }

    send_stored_file($file, null, 0, $forcedownload, $options);
}

/**
 * Get all areas for an imagemap instance
 *
 * @param int $imagemapid
 * @return array
 */
function imagemap_get_areas($imagemapid) {
    global $DB;
    return $DB->get_records('imagemap_area', ['imagemapid' => $imagemapid], 'sortorder ASC');
}

/**
 * Check if a user can manage/edit this activity (is teacher/admin with editing capabilities).
 *
 * @param int $userid
 * @param stdClass $cm Course module object
 * @return bool
 */
function imagemap_can_manage_activity($userid, $cm) {
    $context = context_module::instance($cm->id);
    return has_capability('mod/imagemap:manage', $context, $userid);
}


/**
 * Check if a course module is visible for a specific user using availability API.
 *
 * @param cm_info|stdClass $cminfo
 * @param int $userid
 * @param string|null $availabilityinfo
 * @return bool
 */
function imagemap_coursemodule_visible_for_user($cminfo, $userid, &$availabilityinfo = null) {
    // Teachers and admins always see the module as available.
    $context = context_course::instance($cminfo->course);
    if (imagemap_can_manage_activity($userid, $cminfo)) {
        return true;
    }

    $ci = new \core_availability\info_module($cminfo);
    return $ci->is_user_visible($cminfo, $userid);
}

/**
 * Check if a section is available for a specific user using availability API.
 *
 * @param section_info|stdClass $section
 * @param int $userid
 * @param string|null $availabilityinfo
 * @return bool
 */
function imagemap_section_visible_for_user($section, $userid, &$availabilityinfo = null) {
    // Teachers and admins always see the section as available.
    $courseid = null;
    if ($section instanceof section_info) {
        $courseid = (int)$section->course;
    } else if (is_object($section)) {
        if (isset($section->course)) {
            $courseid = (int)$section->course;
        } else if (isset($section->courseid)) {
            $courseid = (int)$section->courseid;
        }
    }

    if (empty($courseid)) {
        return false;
    }

    $availabilityinfo = '';
    $availablebyconditions = !empty($section->uservisible) && !empty($section->available);

    if (class_exists('\\core_availability\\info_section')) {
        $sci = new \core_availability\info_section($section);
        $availablebyconditions = !empty($section->uservisible)
            && $sci->is_available($availabilityinfo, true, $userid);
    }

    return !empty($section->uservisible) && !empty($section->available) && $availablebyconditions;
}

/**
 * Check if an area is active based on completion condition
 *
 * @param stdClass $area
 * @param int $userid
 * @param cm_info|stdClass $cminfo Course module info object
 * @return bool
 */
function imagemap_is_area_active($area, $userid, $cminfo) {
    global $DB;

    // If user can manage this activity, show all areas as active.
    if (imagemap_can_manage_activity($userid, $cminfo)) {
        return true;
    }

    if ($area->targettype === 'module') {
        $cm = get_coursemodule_from_id(null, (int)$area->targetid, 0, false, IGNORE_MISSING);
        if (!$cm) {
            return false; // Module not found.
        }
        $modinfo = get_fast_modinfo($cm->course, $userid);
        $cminfo = $modinfo->get_cm($cm->id);
        return imagemap_coursemodule_visible_for_user($cminfo, $userid);
    }

    if ($area->targettype === 'section') {
        $sectionrecord = $DB->get_record('course_sections', ['id' => (int)$area->targetid], 'id, course', IGNORE_MISSING);
        if (!$sectionrecord) {
            return false;
        }
        $modinfo = get_fast_modinfo($sectionrecord->course, $userid);
        $sectioninfo = $modinfo->get_section_info_by_id($sectionrecord->id, IGNORE_MISSING);
        if (!$sectioninfo) {
            return false;
        }
        return imagemap_section_visible_for_user($sectioninfo, $userid);
    }

    return true;
}

/**
 * Get the target URL for an area
 *
 * @param stdClass $area
 * @param int $courseid
 * @return moodle_url|null
 */
function imagemap_get_area_url($area, $courseid) {
    if ($area->targettype === 'module') {
        $cm = get_coursemodule_from_id(null, (int)$area->targetid, 0, false, IGNORE_MISSING);
        if ($cm) {
            return new moodle_url('/mod/' . $cm->modname . '/view.php', ['id' => $cm->id]);
        }
        return null;
    }

    if ($area->targettype === 'section') {
        $course = get_course($courseid);
        $modinfo = get_fast_modinfo($course);
        $section = $modinfo->get_section_info_by_id((int)$area->targetid, IGNORE_MISSING);
        if ($section) {
            $url = course_get_url($course, $section, ['navigation' => true]);
            // Fallback for section 0 or other cases where course_get_url returns null.
            if (!$url) {
                $url = new moodle_url('/course/view.php', [
                    'id' => $course->id,
                    'section' => $section->section,
                ]);
            }
            return $url;
        }
        return null;
    }

    return null;
}

/**
 * Resolve target data for an area (url, active, tooltip).
 *
 * @param stdClass $area
 * @param stdClass $course
 * @param context_module $context
 * @param cm_info $cminfo Course module info
 * @return array{url:moodle_url|null,active:bool,tooltip:string}
 */
function imagemap_get_area_target_data($area, $course, $context, $cminfo) {
    global $USER;

    $data = ['url' => null, 'active' => false, 'tooltip' => ''];

    // Use the dedicated function to check if area is active.
    $data['active'] = imagemap_is_area_active($area, (int)$USER->id, $cminfo);

    if ($area->targettype === 'module') {
        $cm = get_coursemodule_from_id(null, (int)$area->targetid, $course->id, false, IGNORE_MISSING);
        if (!$cm) {
            return $data;
        }
        $modinfo = get_fast_modinfo($course, (int)$USER->id);
        $cminfotarget = $modinfo->get_cm($cm->id);
        $data['url'] = new moodle_url('/mod/' . $cm->modname . '/view.php', ['id' => $cm->id]);
        if (!$data['active']) {
            // Resolve the placeholders (activity names, etc.) of the availability message.
            $info = \core_availability\info::format_info($cminfotarget->availableinfo ?? '', $course);
            $tooltip = trim(strip_tags(format_text($info, FORMAT_HTML, ['context' => $context])));
            $data['tooltip'] = $tooltip !== '' ? $tooltip : get_string('arearestricted', 'imagemap');
        }
        return $data;
    }

    if ($area->targettype === 'section') {
        $modinfo = get_fast_modinfo($course, (int)$USER->id);
        $section = $modinfo->get_section_info_by_id((int)$area->targetid, IGNORE_MISSING);
        if (!$section) {
            return $data;
        }

        // Try to get URL using course_get_url first.
        $data['url'] = course_get_url($course, $section, ['navigation' => true]);

        // Fallback: If course_get_url returns null (e.g., for section 0), generate URL manually.
        if (!$data['url']) {
            $data['url'] = new moodle_url('/course/view.php', [
                'id' => $course->id,
                'section' => $section->section,
            ]);
        }

        if (!$data['active']) {
            // Resolve the placeholders (activity names, etc.) of the availability message.
            $info = \core_availability\info::format_info($section->availableinfo ?? '', $course);
            $tooltip = trim(strip_tags(format_text($info, FORMAT_HTML, ['context' => $context])));
            $data['tooltip'] = $tooltip !== '' ? $tooltip : get_string('arearestricted', 'imagemap');
        }
        return $data;
    }

    return $data;
}

/**
 * Normalize area shape to HTML imagemap compatible value.
 *
 * @param string $shape
 * @return string|null
 */
function imagemap_normalize_shape_for_html_map($shape) {
    if ($shape === 'rect' || $shape === 'rectangle') {
        return 'rect';
    }
    if ($shape === 'circle') {
        return 'circle';
    }
    if ($shape === 'poly' || $shape === 'polygon') {
        return 'poly';
    }
    return null;
}

/**
 * Sanitize coordinate list for HTML imagemap area.
 *
 * @param string $coords
 * @return string
 */
function imagemap_sanitize_coords_for_html_map($coords) {
    if ($coords === '') {
        return '';
    }

    $parts = explode(',', $coords);
    $clean = [];
    foreach ($parts as $part) {
        $value = trim($part);
        if ($value === '' || !is_numeric($value)) {
            continue;
        }
        $number = (float)$value;
        $clean[] = (string)round($number);
    }

    return implode(',', $clean);
}

/**
 * Inject image map preview in course section activity card.
 *
 * @param cm_info $cm
 * @return void
 */
function imagemap_cm_info_view(cm_info $cm) {
    global $DB, $PAGE, $OUTPUT;

    if (empty($cm->uservisible)) {
        return;
    }

    $context = context_module::instance($cm->id);
    if (!has_capability('mod/imagemap:view', $context)) {
        return;
    }

    $imagemap = $DB->get_record('imagemap', ['id' => $cm->instance], 'id, name, course', IGNORE_MISSING);
    if (!$imagemap) {
        return;
    }

    $fs = get_file_storage();
    $files = $fs->get_area_files($context->id, 'mod_imagemap', 'image', 0, 'itemid, filepath, filename', false);
    $imagefile = reset($files);

    if ($imagefile) {
        $course = get_course($imagemap->course);

        // Render content with JavaScript initialization.
        $content = imagemap_render_content_with_script($imagemap, $cm, $context, $course, $cm, $imagefile);

        // Set as after link for course summary preview.
        $cm->set_after_link($content);
    }
}

/**
 * Prepare area data for display (used by view.php and imagemap_cm_info_view).
 *
 * @param stdClass $imagemap Imagemap record
 * @param stdClass $course Course record
 * @param context_module $context Module context
 * @param cm_info|stdClass $cminfo Course module info
 * @return array{imageurl: moodle_url|null, areadata: array, linesviewdata: array}
 */
function imagemap_prepare_display_data($imagemap, $course, $context, $cminfo) {
    global $DB;

    $imageurl = null;
    $areadata = [];
    $linesviewdata = [];

    // Get the image file.
    $fs = get_file_storage();
    $files = $fs->get_area_files($context->id, 'mod_imagemap', 'image', 0, 'itemid, filepath, filename', false);
    $imagefile = reset($files);

    if ($imagefile) {
        $imageurl = moodle_url::make_pluginfile_url(
            $context->id,
            'mod_imagemap',
            'image',
            $imagefile->get_itemid(),
            $imagefile->get_filepath(),
            $imagefile->get_filename()
        );
    }

    // Get areas.
    $areas = imagemap_get_areas($imagemap->id);

    foreach ($areas as $area) {
        $targetdata = imagemap_get_area_target_data($area, $course, $context, $cminfo);
        $isactive = $targetdata['active'];
        $url = $targetdata['url'];

        $areadata[] = [
            'id' => (int)$area->id,
            'shape' => $area->shape,
            'coords' => $area->coords,
            'title' => $area->title,
            'url' => $url ? $url->out() : '',
            'active' => $isactive,
            'tooltip' => $targetdata['tooltip'],
            'activefilter' => $area->activefilter ?: 'none',
            'inactivefilter' => $area->inactivefilter ?: 'filter: grayscale(100%);',
        ];
    }

    // Load connection lines.
    $dbman = $DB->get_manager();
    $linetable = new xmldb_table('imagemap_line');
    if ($dbman->table_exists($linetable)) {
        $lines = $DB->get_records('imagemap_line', ['imagemapid' => $imagemap->id]);
        foreach ($lines as $line) {
            $linesviewdata[] = [
                'from_areaid' => (int)$line->from_areaid,
                'to_areaid' => (int)$line->to_areaid,
            ];
        }
    }

    return [
        'imageurl' => $imageurl,
        'areadata' => $areadata,
        'linesviewdata' => $linesviewdata,
    ];
}

/**
 * Prepare template data and JavaScript initialization for imagemap view.
 *
 * @param stdClass $imagemap Imagemap record
 * @param stdClass $cm Course module object
 * @param context_module $context Module context
 * @param array $displaydata Display data from imagemap_prepare_display_data()
 * @param stdClass|stored_file|null $imagefile Image file object
 * @return array{templatedata: array, areadata: array, linesviewdata: array, imageurl: moodle_url|null}
 */
function imagemap_prepare_render_data($imagemap, $cm, $context, $displaydata, $imagefile) {
    $imageurl = $displaydata['imageurl'];
    $areadata = $displaydata['areadata'];
    $linesviewdata = $displaydata['linesviewdata'];

    // Prepare template data.
    $templatedata = [
        'has_image' => !empty($imagefile),
        'imagemap_id' => $imagemap->id,
        'config' => json_encode([
            'imageurl' => $imageurl ? $imageurl->out(false) : '',
            'areas' => $areadata,
            'lines' => $linesviewdata,
        ]),
        'has_manage' => has_capability('mod/imagemap:manage', $context),
        'manage_url' => new moodle_url('/mod/imagemap/areas.php', ['id' => $cm->id]),
        'manage_text' => get_string('managereas', 'imagemap'),
        'no_image_text' => get_string('error:noimage', 'imagemap'),
        'edit_settings_url' => new moodle_url('/course/modedit.php', ['update' => $cm->id, 'return' => 1]),
        'edit_settings_text' => get_string('editsettings', 'moodle'),
    ];

    return [
        'templatedata' => $templatedata,
        'areadata' => $areadata,
        'linesviewdata' => $linesviewdata,
        'imageurl' => $imageurl,
    ];
}

/**
 * Render imagemap content with JavaScript initialization.
 *
 * @param stdClass $imagemap Imagemap record
 * @param stdClass $cm Course module object
 * @param context_module $context Module context
 * @param stdClass $course Course record
 * @param cm_info|stdClass $cminfo Course module info
 * @param stdClass|stored_file|null $imagefile Image file object
 * @return string HTML content rendered from template
 */
function imagemap_render_content_with_script($imagemap, $cm, $context, $course, $cminfo, $imagefile) {
    global $OUTPUT, $PAGE;

    // Prepare display data (areas, imageurl, lines).
    $displaydata = imagemap_prepare_display_data($imagemap, $course, $context, $cminfo);

    // Prepare render data (template and JavaScript parameters).
    $renderdata = imagemap_prepare_render_data($imagemap, $cm, $context, $displaydata, $imagefile);

    // Render template.
    $content = $OUTPUT->render_from_template('mod_imagemap/view', $renderdata['templatedata']);

    // Initialize JavaScript.
    if (!empty($imagefile)) {
        $PAGE->requires->js_call_amd('mod_imagemap/view', 'init', ['#imagemap-view-' . $imagemap->id]);
    }

    return $content;
}
