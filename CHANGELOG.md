# Changelog

All notable changes to the Image Map module will be documented in this file.

## [Unreleased]

### Fixed
- Course restore now finds the restore classes: they moved from `restore/moodle2/` to `backup/moodle2/`, where Moodle looks for them (#2).
- Area targets are remapped after the whole course is restored, so links to activities placed after the image map are kept; links to items outside the backup are kept only when they belong to the same course (e.g. when duplicating the activity).
- Files of the activity description are included in backup and restore.
- Replace the deprecated `print_error()` with `moodle_exception` (#3).
- Area CSS is no longer read with `PARAM_RAW`: area filters and CSS examples keep only an allowed list of visual properties with plain values (`\mod_imagemap\local\css_rules`), also on import and restore (#5).
- `area_save.php` checks that the image map belongs to the course module whose capability is checked.
- Missing language strings for the hover types of CSS examples (#11).

### Changed
- Standard Moodle boilerplate in JavaScript, CSS and Mustache files; templates document their context (#7).
- `editor.css` and `styles/admin.css` merged into `styles.css`, scoped to `.path-mod-imagemap`; no more manual `$PAGE->requires->css()` (#10).

## [1.2.5] - 2026-03-09

### Added
- Full backup and restore support via Moodle Backup API (`backup/` and `restore/` directories)
- New admin module (`admin/`) with CSS examples management: create, edit, delete, import/export
- Hover type support in CSS examples editor
- Automated CI/CD pipeline with GitHub Actions (`moodle-plugin-ci.yml`, `release.yml`)
- Pre-commit hooks framework for code quality validation (`.githooks/`, `.pre-commit-config.yaml`)
- Helper functions to check module and section visibility per user
- Comprehensive database schema documentation (`docs/DATABASE.md`)
- Architecture diagram documentation (`docs/DIAGRAM.md`)
- Automated backup/restore test suite (`tests/backup_restore_test.php`)
- Dependabot configuration for automated dependency updates

### Changed
- Teachers now always see areas as active (bypass completion filter for editing context)
- Area destination refactored with improved filter UI
- Rendering logic centralized to eliminate code duplication between `view.php` and templates
- Documentation reorganized under `/docs` directory
- Inactive filter standardized to `grayscale(100%)`
- Improved i18n coverage for both `en` and `pt_br` language packs
- Moodle code validation and Mustache linting moved to Docker-based workflow
- `admin.php` refactored to delegate logic to `admin/lib.php`

### Fixed
- Area borders removed from map visualization
- Version format corrected in `version.php` (removed underscores)
- Increased npm timeout and added retry config for Moodle 5.0.1 compatibility in CI matrix

## [Unreleased]

### Planned Features
- Area editing (modify existing areas)
- Sortable areas (change z-index)
- Preview mode for testing
- More CSS filter presets
- Accessibility improvements (keyboard navigation)
- Analytics integration
- Bulk area operations

## [1.2.0] - 2026-02-23

### Added
- Initial release of the Image Map module for Moodle
- Image upload with file manager integration
- Interactive canvas-based area editor
- Support for three shape types:
  - Rectangles (click and drag)
  - Circles (click center and drag radius)
  - Polygons (click points and finish)
- Flexible linking options:
  - Link to course modules
  - Link to course sections
  - Link to external URLs
- Conditional display based on module completion
  - Areas can be active or inactive based on completion criteria
  - CSS filters for visual feedback (e.g., grayscale when inactive)
- Area management interface:
  - Create areas by drawing on image
  - Delete areas
  - View all areas in a list
- Full bilingual support:
  - English (en)
  - Portuguese Brazil (pt_br)
- GDPR compliance with privacy provider
- Proper capability definitions for security
- Event logging for course module views
- Database schema with two tables:
  - imagemap (main instances)
  - imagemap_area (clickable areas)

### Features
- Teacher can upload or select image from repository
- Teacher can draw clickable areas directly on the image
- Teacher can configure each area with:
  - Shape (rectangle, circle, polygon)
  - Title (tooltip)
  - Destination (module, section, URL)
  - Completion condition (optional)
  - Active/inactive visual filters
- Students can view interactive image maps
- Clickable areas navigate to configured destinations
- Areas can be conditionally shown based on module completion
- Visual feedback through CSS filters for active/inactive states

### Technical Details
- Compatible with Moodle 3.9+
- PHP 7.2+
- Uses Moodle File API for image storage
- Uses HTML5 Canvas for drawing interface
- Uses HTML image maps for clickable areas
- Follows Moodle coding standards
- Includes proper event classes for logging
- GDPR compliant (no personal data stored)

### Security
- Capability-based access control
- Session key validation for form submissions
- Proper context checks for file access
- XSS risk assessment for capabilities
