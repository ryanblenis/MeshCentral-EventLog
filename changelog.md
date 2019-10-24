# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Known Issues]
- Endpoints don't start periodically polling for event data until another eventlog action, or the device is viewed in the admin console, occurs.
-- Note: this can be alleviated by adding `require('entrylog')` to the start of the `createMeshCore` function in the meshcore file.

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
