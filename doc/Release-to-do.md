# Things to do before release

The things to do before releasing a new version are:

* `README.md`
  * Update the version number and release date in the 1st line
  * Update the features

* `scanner/main.py`
	* Update `parser.add_argument("--version"...` to the new version number

* `scanner/Options.py`
	* Update `version` to the new version number
  * Update `json_version` value (if needed)

* `doc/Changelog.md`
  * Update the version number and the changes
