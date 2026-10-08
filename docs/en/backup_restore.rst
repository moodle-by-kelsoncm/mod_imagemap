Backup and Restore
==================

Compatibility with Moodle Backup/Restore
----------------------------------------

The `mod_imagemap` plugin implements Moodle's backup and restore API:

- Image metadata and mapped area coordinates are serialized into the backup file (`.mbz`).
- During restore to a new course or new site, internal links to activities in the same course are automatically remapped to the new module IDs.
