Installation
============

Requirements
------------

* Moodle 4.5 LTS or 5.3 LTS.
* PHP supported by your Moodle version.

From a ZIP file
---------------

1. Download ``mod_imagemap-<version>.zip`` from the `releases <https://github.com/moodle-by-kelsoncm/mod_imagemap/releases>`_ or from the Moodle Marketplace.
2. Go to *Site administration > Plugins > Install plugins*, upload the ZIP and follow the steps.
3. Finish the upgrade at *Site administration > Notifications*.

From the source code
--------------------

Copy the repository to ``mod/imagemap`` (``public/mod/imagemap`` on Moodle 5.1 and later) and visit *Site administration > Notifications*:

.. code-block:: bash

   git clone https://github.com/moodle-by-kelsoncm/mod_imagemap.git public/mod/imagemap

Languages
---------

The package ships the English strings only. Other languages, including Brazilian Portuguese, come from the Moodle translation tool (AMOS) through the language packs.
