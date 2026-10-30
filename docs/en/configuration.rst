Configuration
=============

The plugin works without configuration. The administrator can keep the list of CSS examples offered in the area editor.

CSS examples
------------

Go to *Site administration > Plugins > Activity modules > Image Map* and follow **Manage CSS Examples**. Each example has a name, a type and the CSS code:

* **Active CSS** and **Inactive CSS**: the style of an area whose target is available or not.
* **Active CSS (hover)** and **Inactive CSS (hover)**: the style while the pointer is over the area.

Each card shows a preview of the CSS on a dark and a light background. Examples can be exported to a JSON file and imported on another site; an imported example with the same type and name replaces the existing one.

Allowed CSS
-----------

Area CSS is cleaned on the server when it is saved, imported or restored. Only these properties are kept: ``filter``, ``opacity``, ``transform``, ``transition``, ``border`` (and ``border-color``, ``-width``, ``-style``, ``-radius``), ``outline`` (and ``outline-color``, ``-width``, ``-style``, ``-offset``), ``box-shadow``, ``background-color`` and ``mix-blend-mode``. Values may use letters, numbers, ``#``, ``%``, ``.``, ``,``, parentheses, ``+`` and ``-``; anything with ``url()``, ``expression()``, quotes, braces or comments is dropped. A bare filter such as ``grayscale(1)`` is read as ``filter: grayscale(1)``.

Capabilities
------------

* ``mod/imagemap:addinstance``: add an image map to a course (editing teachers and managers).
* ``mod/imagemap:view``: see the image map.
* ``mod/imagemap:manage``: edit the areas and lines (editing teachers and managers). Users with this capability see every area as active.
