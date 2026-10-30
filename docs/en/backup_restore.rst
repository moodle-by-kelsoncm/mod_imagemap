Backup and restore
==================

Image maps are included in course backups, imports and in the duplication of activities, with their image, description files, areas and lines.

* When the whole course is restored, each area points to the copy of its activity or section in the new course, whatever their order in the course.
* When only the image map is restored or duplicated, areas that point to items of the same course keep them; areas that point to items outside the backup lose their target and must be linked again.
* The CSS of the areas is cleaned again on restore (see :doc:`configuration`).
* The CSS examples of the source site travel with the backup and are added to the target site when an example with the same type and name does not exist yet.

Privacy
-------

The plugin stores no personal data: areas, lines and CSS examples are course and site content. It implements the Privacy API as a null provider.
