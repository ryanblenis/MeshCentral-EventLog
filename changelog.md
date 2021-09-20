# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Known Issues]
- None. Please feel free to submit an issue via [GitHub](https://github.com/ryanblenis/MeshCentral-EventLog) if you find anything.

## [0.0.24] - 2021-09-19
### Fixed
- Compatibility with MeshCentral > 0.9.7

## [0.0.23] - 2020-03-10
### Fixed
- Detect PowerShell major version <= 2 and disable periodic updates for endpoint (requires 3+)

## [0.0.22] - 2020-02-10
### Fixed
- Add more reliable tmp file tracking and cleanup

## [0.0.21] - 2020-01-08
### Fixed
- Cleanup console messages for non-windows clients

## [0.0.20] - 2020-01-02
### Fixed
- Update Mongo call from count() (deprecated) to countDocuments()

## [0.0.19] - 2019-12-26
### Fixed
- Update plugin hook call to be compatible with 0.4.6-p+

## [0.0.18] - 2019-12-15
### Fixed
- Safety check the existence of the plugin page for non-windows devices (was producing an error in javascript)

## [0.0.17] - 2019-12-02
### Fixed
- Config Comparisons failing for NeDB users fixed
- Saving event log configuration sets for NeDB users no longer breaks
- Config set reverting to "Default" after update with MongoDB (now stays current value)

## [0.0.16] - 2019-12-02
### Added
- Better support for plugin tabs (tab now does not display for non-Windows devices)

## [0.0.15] - 2019-11-28
### Fixed
- Plugin was rewriting entire plugin-designated area. Made it more "plugin friendly".

## [0.0.14] - 2019-11-27
### Fixed
- Upon upgrading from 0.0.12 to 0.0.13, history entries were lost. They are now brought back.

## [0.0.13] - 2019-11-25
### Added
- Admin interface
- Ability to create different event log collection sets and assign them to nodes/meshes
- Support for MeshCentral GUI plugin installation / upgrades
### Changed
- The way event types are stored in the database. Now Integer (e.g. 3), was String (e.g. "Info")

## [0.0.12] - 2019-10-28
### Fixed
- Striping when filtering and changing log types

## [0.0.11] - 2019-10-28
### Added
- MongoDB support (prior versions were NeDB only)
### Fixed
- Endpoints now start polling for event log data and transmitting back to the server immediately, without having to view the device in the web UI first.

## [0.0.10] - 2019-10-25
### Fixed
- Sort order / striping issue after filtering event logs

## [0.0.9] - 2019-10-24
### Fixed
- Only open relay for live logs to nodes that are online

## [0.0.8] - 2019-10-24
### Added
- Ability to filter event logs via text search

## [0.0.7] - 2019-10-24
### Added
- Ability to view historical events (when collected from endpoints)

## [0.0.6] - 2019-10-23
### Added
- Updated styles for better readability and navigation. 
- New tab for event log history (if enabled on the endpoints). Currently a placeholder but will be added to output soon.

## [0.0.5] - 2019-10-23
### Fixed
- Live event logs weren't pulling from endpoints since MeshCentral 0.4.2-l due to new security. This has been fixed.

## [0.0.4] - 2019-10-15
### Fixed
- Switching from one device to another caused live event data not to load for that device. Next device viewed would work as expected. This should be consistent now.

## [0.0.3] - 2019-10-15
### Added
- Periodic log poller for each endpoint. Submits event log data to server to be parsed and stored.
- Added Changelog to project

### Fixed
- Event log querier (Powershell) to have better support for multiple logs  (types/names), errant data, and transportation of data.

## [0.0.2] - 2019-10-13
### Added
- New UI in Plugins subsection

## [0.0.1] - 2019-10-09
### Added
- Released initial version
