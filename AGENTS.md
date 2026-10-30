# mod_imagemap - Agent Guidelines

Moodle activity module: an image with clickable areas (rectangle, circle, polygon) linked to course activities or sections, plus arrows between areas. Each area is active or inactive according to the availability of its target for the current user. Supports Moodle 4.5 LTS and 5.3 LTS.

User documentation: `docs/en` and `docs/pt_BR` (Sphinx). Contribution and release rules: `CONTRIBUTING.md`.

## Structure

| Path | Purpose |
|------|---------|
| `lib.php` | Module API (`imagemap_supports`, add/update/delete instance, `imagemap_cm_info_view`), area state and target data, rendering of the viewer |
| `view.php`, `index.php` | Activity page and course index |
| `areas.php`, `area_save.php` | Area editor page and the form post that saves an area (title, target, CSS) |
| `classes/external/` | Web services used by the editor: `update_area_coords`, `save_line`, `delete_line` (declared in `db/services.php`) |
| `classes/local/css_rules.php` | Server-side cleaning of area CSS (allowed properties and plain values) |
| `admin/` | CSS examples administration (list, edit, delete, import, export) |
| `backup/moodle2/` | Backup and restore; targets are remapped in `restore_imagemap_activity_task::after_restore()` |
| `amd/src/` | ES6 modules: `editor`, `view`, `admin`, `css_preview`, `shapes`; build in `amd/build` with grunt |
| `templates/` | `view`, `editor`, `css_examples_modal`, `admin_css_examples` |
| `db/` | `install.xml` (tables `imagemap`, `imagemap_area`, `imagemap_line`, `imagemap_css_examples`), `upgrade.php`, `access.php`, `services.php` |
| `tests/` | PHPUnit: backup/restore, editor services, CSS cleaning |

## Rules

- Area targets are course module ids (`targettype = module`) or course section ids (`targettype = section`).
- Area CSS is always stored through `css_rules::clean()` (form, import, restore). Never read CSS with `PARAM_RAW`.
- Data for JavaScript goes in a `data-config` attribute of the template; modules start with `$PAGE->requires->js_call_amd()`. No inline JavaScript, no `onclick`.
- Capability checks live in the external services (`helper::require_manage()`), and every record is checked against the image map of the course module.
- Only `lang/en` is shipped. Do not add other language folders.
- Validate with `act` (see `CONTRIBUTING.md`) before pushing: code checker and PHPDoc run with zero warnings allowed, and grunt checks that `amd/build` matches `amd/src`.
