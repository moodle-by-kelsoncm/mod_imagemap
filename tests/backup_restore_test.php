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
 * Unit tests for backup/restore functionality in mod_imagemap
 *
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace mod_imagemap;

use backup;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/backup/util/includes/backup_includes.php');
require_once($CFG->dirroot . '/backup/util/includes/restore_includes.php');
require_once($CFG->dirroot . '/backup/moodle2/backup_stepslib.php');
require_once($CFG->dirroot . '/backup/moodle2/backup_activity_task.class.php');
require_once($CFG->dirroot . '/backup/moodle2/restore_stepslib.php');
require_once($CFG->dirroot . '/backup/moodle2/restore_activity_task.class.php');
require_once($CFG->libdir . '/phpunit/classes/restore_date_testcase.php');

/**
 * Unit test class for backup/restore functionality
 *
 * @coversNothing
 * @package    mod_imagemap
 * @copyright  2026 Kelson C. M.
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class backup_restore_test extends \restore_date_testcase {
    /** @var int User ID used by backup/restore controllers. */
    private int $userid;

    /**
     * Test setup
     */
    public function setUp(): void {
        parent::setUp();
        // Reset after each test.
        $this->resetAfterTest(true);
        // Admin user is always ID 2.
        $this->userid = 2;
    }

    /**
     * Test imagemap instance can be backed up
     */
    public function test_imagemap_backup(): void {
        global $DB;

        // Create test course.
        $course = $this->getDataGenerator()->create_course();

        // Create imagemap instance.
        $imagemap = $this->getDataGenerator()->create_module('imagemap', [
            'course' => $course->id,
            'name' => 'Test Imagemap',
            'intro' => 'Test Introduction',
            'width' => 800,
            'height' => 600,
        ]);

        $bc = null;
        try {
            // Create backup.
            $bc = new \backup_controller(
                backup::TYPE_1COURSE,
                $course->id,
                backup::FORMAT_MOODLE,
                backup::INTERACTIVE_NO,
                backup::MODE_GENERAL,
                $this->userid
            );

            // This should not throw an exception.
            $bc->execute_plan();
            $results = $bc->get_results();
            $this->assertNotEmpty($results['backup_destination']);
        } finally {
            if ($bc) {
                $bc->destroy();
            }
        }
    }

    /**
     * Test imagemap with areas can be restored
     */
    public function test_imagemap_restore_with_areas(): void {
        global $CFG, $DB;

        // Create source course with imagemap.
        $sourcecourse = $this->getDataGenerator()->create_course();

        $imagemap = $this->getDataGenerator()->create_module('imagemap', [
            'course' => $sourcecourse->id,
            'name' => 'Test Imagemap with Areas',
            'intro' => 'Test with areas',
            'width' => 800,
            'height' => 600,
        ]);

        $sourcesection = $DB->get_record('course_sections', [
            'course' => $sourcecourse->id,
            'section' => 0,
        ], 'id', MUST_EXIST);

        // Create an area.
        $area = (object)[
            'imagemapid' => $imagemap->id,
            'shape' => 'circle',
            'coords' => json_encode(['cx' => 100, 'cy' => 100, 'r' => 50]),
            'targettype' => 'section',
            'targetid' => $sourcesection->id,
            'title' => 'Test Area',
            'activefilter' => 'none',
            'inactivefilter' => 'grayscale(100%)',
            'sortorder' => 0,
        ];
        $DB->insert_record('imagemap_area', $area);

        $bc = null;
        $rc = null;
        try {
            // Backup the course.
            $bc = new \backup_controller(
                backup::TYPE_1COURSE,
                $sourcecourse->id,
                backup::FORMAT_MOODLE,
                backup::INTERACTIVE_NO,
                backup::MODE_GENERAL,
                $this->userid
            );
            $backupid = $bc->get_backupid();
            $bc->execute_plan();
            $results = $bc->get_results();
            $backupfile = $results['backup_destination'];
            $fp = get_file_packer('application/vnd.moodle.backup');
            $backupfile->extract_to_pathname($fp, $CFG->tempdir . '/backup/' . $backupid);
            $bc->destroy();
            $bc = null;

            // Create target course.
            $targetcourse = $this->getDataGenerator()->create_course();

            // Restore to target course.
            $rc = new \restore_controller(
                $backupid,
                $targetcourse->id,
                \backup::INTERACTIVE_NO,
                \backup::MODE_GENERAL,
                $this->userid,
                \backup::TARGET_CURRENT_DELETING
            );

            $this->assertTrue($rc->execute_precheck());
            $rc->execute_plan();

            // Verify restored content.
            $restoredimagemap = $DB->get_record('imagemap', [
                'course' => $targetcourse->id,
                'name' => 'Test Imagemap with Areas',
            ]);
            $this->assertNotNull($restoredimagemap);

            // Verify restored area.
            $restoredareas = $DB->get_records('imagemap_area', [
                'imagemapid' => $restoredimagemap->id,
            ]);
            $this->assertCount(1, $restoredareas);

            $restoredarea = reset($restoredareas);
            $this->assertEquals('circle', $restoredarea->shape);
            $this->assertEquals('Test Area', $restoredarea->title);
            $this->assertEquals('section', $restoredarea->targettype);
            $restoredsectionid = $DB->get_field('course_sections', 'id', [
                'course' => $targetcourse->id,
                'section' => 0,
            ], MUST_EXIST);
            $this->assertEquals($restoredsectionid, $restoredarea->targetid);
        } finally {
            if ($rc) {
                $rc->destroy();
            }
            if ($bc) {
                $bc->destroy();
            }
        }
    }

    /**
     * Test imagemap with module link mapping
     */
    public function test_imagemap_restore_module_link_mapping(): void {
        global $CFG, $DB;

        // Create source course with activities.
        $sourcecourse = $this->getDataGenerator()->create_course();

        // Create a target module (e.g., Forum).
        $forum = $this->getDataGenerator()->create_module('forum', [
            'course' => $sourcecourse->id,
        ]);

        // Create imagemap with link to forum.
        $imagemap = $this->getDataGenerator()->create_module('imagemap', [
            'course' => $sourcecourse->id,
            'name' => 'Test Imagemap Module Links',
            'intro' => 'Test',
            'width' => 800,
            'height' => 600,
        ]);

        // Create area linking to module.
        $area = (object)[
            'imagemapid' => $imagemap->id,
            'shape' => 'rect',
            'coords' => json_encode(['x1' => 10, 'y1' => 10, 'x2' => 100, 'y2' => 100]),
            'targettype' => 'module',
            'targetid' => $forum->cmid, // Link to course module.
            'title' => 'Forum Link',
            'activefilter' => 'none',
            'inactivefilter' => 'grayscale(100%)',
            'sortorder' => 0,
        ];
        $DB->insert_record('imagemap_area', $area);

        $bc = null;
        $rc = null;
        try {
            // Backup.
            $bc = new \backup_controller(
                backup::TYPE_1COURSE,
                $sourcecourse->id,
                backup::FORMAT_MOODLE,
                backup::INTERACTIVE_NO,
                backup::MODE_GENERAL,
                $this->userid
            );
            $backupid = $bc->get_backupid();
            $bc->execute_plan();
            $results = $bc->get_results();
            $backupfile = $results['backup_destination'];
            $fp = get_file_packer('application/vnd.moodle.backup');
            $backupfile->extract_to_pathname($fp, $CFG->tempdir . '/backup/' . $backupid);
            $bc->destroy();
            $bc = null;

            // Create target course.
            $targetcourse = $this->getDataGenerator()->create_course();

            // Create matching module in target course.
            $targetforum = $this->getDataGenerator()->create_module('forum', [
                'course' => $targetcourse->id,
            ]);

            // Restore.
            $rc = new \restore_controller(
                $backupid,
                $targetcourse->id,
                \backup::INTERACTIVE_NO,
                \backup::MODE_GENERAL,
                $this->userid,
                \backup::TARGET_CURRENT_DELETING
            );
            $this->assertTrue($rc->execute_precheck());
            $rc->execute_plan();

            // Verify area exists and module link is remapped (not null).
            $restoredimagemap = $DB->get_record('imagemap', [
                'course' => $targetcourse->id,
                'name' => 'Test Imagemap Module Links',
            ]);

            $restoredareas = $DB->get_records('imagemap_area', [
                'imagemapid' => $restoredimagemap->id,
            ]);

            $this->assertCount(1, $restoredareas);
            $restoredarea = reset($restoredareas);
            // The module ID must point to the restored forum of the target course.
            $restoredforumcmid = $DB->get_field('course_modules', 'id', [
                'course' => $targetcourse->id,
                'module' => $DB->get_field('modules', 'id', ['name' => 'forum']),
            ], MUST_EXIST);
            $this->assertEquals($restoredforumcmid, $restoredarea->targetid);
        } finally {
            if ($rc) {
                $rc->destroy();
            }
            if ($bc) {
                $bc->destroy();
            }
        }
    }

    /**
     * Test imagemap lines are preserved
     */
    public function test_imagemap_restore_with_lines(): void {
        global $CFG, $DB;

        // Create source course.
        $sourcecourse = $this->getDataGenerator()->create_course();

        // Create imagemap.
        $imagemap = $this->getDataGenerator()->create_module('imagemap', [
            'course' => $sourcecourse->id,
            'name' => 'Test Imagemap with Lines',
            'intro' => 'Test',
            'width' => 800,
            'height' => 600,
        ]);

        $forum1 = $this->getDataGenerator()->create_module('forum', [
            'course' => $sourcecourse->id,
        ]);
        $forum2 = $this->getDataGenerator()->create_module('forum', [
            'course' => $sourcecourse->id,
        ]);

        // Create two areas.
        $area1 = (object)[
            'imagemapid' => $imagemap->id,
            'shape' => 'circle',
            'coords' => json_encode(['cx' => 100, 'cy' => 100, 'r' => 50]),
            'targettype' => 'module',
            'targetid' => $forum1->cmid,
            'title' => 'Area 1',
            'activefilter' => 'none',
            'inactivefilter' => 'grayscale(100%)',
            'sortorder' => 0,
        ];
        $area1id = $DB->insert_record('imagemap_area', $area1);

        $area2 = (object)[
            'imagemapid' => $imagemap->id,
            'shape' => 'circle',
            'coords' => json_encode(['cx' => 300, 'cy' => 100, 'r' => 50]),
            'targettype' => 'module',
            'targetid' => $forum2->cmid,
            'title' => 'Area 2',
            'activefilter' => 'none',
            'inactivefilter' => 'grayscale(100%)',
            'sortorder' => 1,
        ];
        $area2id = $DB->insert_record('imagemap_area', $area2);

        // Create line connecting areas.
        $line = (object)[
            'imagemapid' => $imagemap->id,
            'from_areaid' => $area1id,
            'to_areaid' => $area2id,
            'timecreated' => time(),
        ];
        $DB->insert_record('imagemap_line', $line);

        $bc = null;
        $rc = null;
        try {
            // Backup.
            $bc = new \backup_controller(
                backup::TYPE_1COURSE,
                $sourcecourse->id,
                backup::FORMAT_MOODLE,
                backup::INTERACTIVE_NO,
                backup::MODE_GENERAL,
                $this->userid
            );
            $backupid = $bc->get_backupid();
            $bc->execute_plan();
            $results = $bc->get_results();
            $backupfile = $results['backup_destination'];
            $fp = get_file_packer('application/vnd.moodle.backup');
            $backupfile->extract_to_pathname($fp, $CFG->tempdir . '/backup/' . $backupid);
            $bc->destroy();
            $bc = null;

            // Create target course.
            $targetcourse = $this->getDataGenerator()->create_course();

            // Restore.
            $rc = new \restore_controller(
                $backupid,
                $targetcourse->id,
                \backup::INTERACTIVE_NO,
                \backup::MODE_GENERAL,
                $this->userid,
                \backup::TARGET_CURRENT_DELETING
            );
            $this->assertTrue($rc->execute_precheck());
            $rc->execute_plan();

            // Verify.
            $restoredimagemap = $DB->get_record('imagemap', [
                'course' => $targetcourse->id,
            ]);

            $restoredlines = $DB->get_records('imagemap_line', [
                'imagemapid' => $restoredimagemap->id,
            ]);

            $this->assertCount(1, $restoredlines);
        } finally {
            if ($rc) {
                $rc->destroy();
            }
            if ($bc) {
                $bc->destroy();
            }
        }
    }

    /**
     * Back up and restore a course into a new course.
     *
     * @param int $courseid Source course id.
     * @return int Id of the new course.
     */
    private function backup_and_restore_course(int $courseid): int {
        global $CFG;

        $bc = new \backup_controller(backup::TYPE_1COURSE, $courseid, backup::FORMAT_MOODLE,
            backup::INTERACTIVE_NO, backup::MODE_GENERAL, $this->userid);
        $backupid = $bc->get_backupid();
        $bc->execute_plan();
        $results = $bc->get_results();
        $results['backup_destination']->extract_to_pathname(get_file_packer('application/vnd.moodle.backup'),
            $CFG->tempdir . '/backup/' . $backupid);
        $bc->destroy();

        $newcourseid = \restore_dbops::create_new_course('Restored', 'R' . $courseid, get_course($courseid)->category);
        $rc = new \restore_controller($backupid, $newcourseid, backup::INTERACTIVE_NO, backup::MODE_GENERAL,
            $this->userid, backup::TARGET_NEW_COURSE);
        $this->assertTrue($rc->execute_precheck());
        $rc->execute_plan();
        $rc->destroy();

        return $newcourseid;
    }

    /**
     * An area that links to an activity placed after the image map is remapped too.
     */
    public function test_restore_remaps_module_restored_after_imagemap(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $imagemap = $this->getDataGenerator()->create_module('imagemap', ['course' => $course->id]);
        $page = $this->getDataGenerator()->create_module('page', ['course' => $course->id]);
        $DB->insert_record('imagemap_area', (object)[
            'imagemapid' => $imagemap->id,
            'shape' => 'rect',
            'coords' => '10,10,100,100',
            'targettype' => 'module',
            'targetid' => $page->cmid,
            'title' => 'Page link',
            'sortorder' => 0,
        ]);

        $newcourseid = $this->backup_and_restore_course($course->id);

        $newimagemapid = $DB->get_field('imagemap', 'id', ['course' => $newcourseid], MUST_EXIST);
        $newpagecmid = $DB->get_field('course_modules', 'id', [
            'course' => $newcourseid,
            'module' => $DB->get_field('modules', 'id', ['name' => 'page']),
        ], MUST_EXIST);
        $area = $DB->get_record('imagemap_area', ['imagemapid' => $newimagemapid], '*', MUST_EXIST);
        $this->assertEquals($newpagecmid, $area->targetid);
    }

    /**
     * Duplicating the activity keeps the links to activities of the same course.
     */
    public function test_duplicate_keeps_targets_in_same_course(): void {
        global $CFG, $DB;
        require_once($CFG->dirroot . '/course/lib.php');

        $course = $this->getDataGenerator()->create_course();
        $page = $this->getDataGenerator()->create_module('page', ['course' => $course->id]);
        $imagemap = $this->getDataGenerator()->create_module('imagemap', ['course' => $course->id]);
        $DB->insert_record('imagemap_area', (object)[
            'imagemapid' => $imagemap->id,
            'shape' => 'rect',
            'coords' => '10,10,100,100',
            'targettype' => 'module',
            'targetid' => $page->cmid,
            'title' => 'Page link',
            'sortorder' => 0,
        ]);

        $this->setAdminUser();
        if (method_exists(\core_courseformat\local\cmactions::class, 'duplicate')) {
            // Moodle 5.2 and later.
            $newcm = \core_courseformat\formatactions::cm($course)->duplicate($imagemap->cmid);
        } else {
            $newcm = duplicate_module($course, get_fast_modinfo($course)->get_cm($imagemap->cmid));
        }

        $area = $DB->get_record('imagemap_area', ['imagemapid' => $newcm->instance], '*', MUST_EXIST);
        $this->assertEquals($page->cmid, $area->targetid);
    }
}
