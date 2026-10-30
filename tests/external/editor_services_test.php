<?php
// This file is part of Moodle - https://moodle.org/
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
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

namespace mod_imagemap\external;

use core_external\external_api;

/**
 * Tests for the external services of the area editor.
 *
 * @package    mod_imagemap
 * @category   test
 * @copyright  2026 Kelson C. M.
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \mod_imagemap\external\update_area_coords
 * @covers     \mod_imagemap\external\save_line
 * @covers     \mod_imagemap\external\delete_line
 * @covers     \mod_imagemap\external\helper
 */
final class editor_services_test extends \advanced_testcase {
    /** @var \stdClass Course. */
    private \stdClass $course;

    /** @var \stdClass Image map instance (with cmid). */
    private \stdClass $imagemap;

    /** @var int[] Ids of two areas of the image map. */
    private array $areaids = [];

    /**
     * Create a course with an image map and two areas.
     */
    protected function setUp(): void {
        global $DB;
        parent::setUp();
        $this->resetAfterTest();

        $this->course = $this->getDataGenerator()->create_course();
        $this->imagemap = $this->getDataGenerator()->create_module('imagemap', ['course' => $this->course->id]);
        foreach ([0, 1] as $sortorder) {
            $this->areaids[] = (int)$DB->insert_record('imagemap_area', (object)[
                'imagemapid' => $this->imagemap->id,
                'shape' => 'rect',
                'coords' => '0,0,10,10',
                'targettype' => 'section',
                'targetid' => 0,
                'title' => 'Area ' . $sortorder,
                'sortorder' => $sortorder,
            ]);
        }
    }

    /**
     * Log in as a new teacher of the course.
     */
    private function login_teacher(): void {
        $teacher = $this->getDataGenerator()->create_and_enrol($this->course, 'editingteacher');
        $this->setUser($teacher);
    }

    /**
     * A teacher moves an area, creates a line and deletes it.
     */
    public function test_teacher_edits_areas_and_lines(): void {
        global $DB;
        $this->login_teacher();
        $cmid = (int)$this->imagemap->cmid;

        $result = update_area_coords::execute($cmid, $this->areaids[0], ' 5, 6 ,15,16');
        $result = external_api::clean_returnvalue(update_area_coords::execute_returns(), $result);
        $this->assertTrue($result['success']);
        $this->assertSame('5,6,15,16', $DB->get_field('imagemap_area', 'coords', ['id' => $this->areaids[0]]));

        $result = save_line::execute($cmid, $this->areaids[0], $this->areaids[1]);
        $result = external_api::clean_returnvalue(save_line::execute_returns(), $result);
        $this->assertTrue($DB->record_exists('imagemap_line', ['id' => $result['id'], 'imagemapid' => $this->imagemap->id]));

        $deleted = delete_line::execute($cmid, $result['id']);
        $deleted = external_api::clean_returnvalue(delete_line::execute_returns(), $deleted);
        $this->assertTrue($deleted['success']);
        $this->assertFalse($DB->record_exists('imagemap_line', ['id' => $result['id']]));
    }

    /**
     * Coordinates must be numbers.
     */
    public function test_update_area_coords_rejects_text(): void {
        $this->login_teacher();
        $this->expectException(\moodle_exception::class);
        update_area_coords::execute((int)$this->imagemap->cmid, $this->areaids[0], '1,2,alert(1)');
    }

    /**
     * Duplicate lines and lines to the same area are refused.
     */
    public function test_save_line_rejects_duplicates_and_loops(): void {
        $this->login_teacher();
        $cmid = (int)$this->imagemap->cmid;
        save_line::execute($cmid, $this->areaids[0], $this->areaids[1]);

        try {
            save_line::execute($cmid, $this->areaids[0], $this->areaids[1]);
            $this->fail('Duplicate line was accepted');
        } catch (\moodle_exception $e) {
            $this->assertSame('line_duplicate', $e->errorcode);
        }

        $this->expectException(\moodle_exception::class);
        save_line::execute($cmid, $this->areaids[0], $this->areaids[0]);
    }

    /**
     * Areas of another image map cannot be changed through this course module.
     */
    public function test_areas_of_another_imagemap_are_refused(): void {
        $this->login_teacher();
        $other = $this->getDataGenerator()->create_module('imagemap', ['course' => $this->course->id]);

        $this->expectException(\dml_missing_record_exception::class);
        update_area_coords::execute((int)$other->cmid, $this->areaids[0], '1,2,3,4');
    }

    /**
     * Students cannot use the editor services.
     */
    public function test_student_is_refused(): void {
        $student = $this->getDataGenerator()->create_and_enrol($this->course, 'student');
        $this->setUser($student);

        $this->expectException(\required_capability_exception::class);
        save_line::execute((int)$this->imagemap->cmid, $this->areaids[0], $this->areaids[1]);
    }
}
