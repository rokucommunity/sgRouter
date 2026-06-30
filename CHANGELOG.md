# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



## [0.1.4](https://github.com/rokucommunity/sgRouter/compare/0.1.3...v0.1.4) - 2026-06-30
### Changed
 - 110 add suspendmode support ([#111](https://github.com/rokucommunity/sgRouter/pull/111))
 - Security enhancements ([#112](https://github.com/rokucommunity/sgRouter/pull/112))
 - readme fix ([#109](https://github.com/rokucommunity/sgRouter/pull/109))
 - upgrade to [brighterscript@0.73.0](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0730---2026-06-29). Notable changes since 0.72.4:
     - Validate eval/rsg_version against firmware lifecycle ([#1698](https://github.com/rokucommunity/brighterscript/pull/1698))
     - Remove more prod deps: (drop array-flat-polyfill/readline, consolidate minimatch into micromatch) ([#1737](https://github.com/rokucommunity/brighterscript/pull/1737))
     - Replace single-use deps with util/formatUtils helpers ([#1736](https://github.com/rokucommunity/brighterscript/pull/1736))
     - chore: remove dead production dependencies ([#1735](https://github.com/rokucommunity/brighterscript/pull/1735))
     - Bump form-data from 2.5.5 to 2.5.6 ([#1733](https://github.com/rokucommunity/brighterscript/pull/1733))
 - upgrade to [rooibos-roku@5.16.4](https://github.com/rokucommunity/rooibos/blob/master/CHANGELOG.md#5164---2026-06-10). Notable changes since 5.16.3:
     - Make tests less brittle - removes full transpile string checks ([#396](https://github.com/rokucommunity/rooibos/pull/396))
     - Update minimum audit threshold ([#397](https://github.com/rokucommunity/rooibos/pull/397))
     - Accept GHSA-w5hq-g745-h8pq (uuid <11.1.1) advisory ([#395](https://github.com/rokucommunity/rooibos/pull/395))
     - Add security-audit-required job to security-audit workflow ([#393](https://github.com/rokucommunity/rooibos/pull/393))
 - upgrade to [ropm@0.11.9](https://github.com/rokucommunity/ropm/blob/master/CHANGELOG.md#0119---2026-06-10). Notable changes since 0.11.8:



## [0.1.3](https://github.com/rokucommunity/sgRouter/compare/0.1.2...v0.1.3) - 2026-06-08
### Added
 - Add checkpoint support ([#93](https://github.com/rokucommunity/sgRouter/pull/93))
### Changed
 - Cache CreateObject("roDeviceInfo") ([#98](https://github.com/rokucommunity/sgRouter/pull/98))
 - Chore: Add required Security Audit gate job to workflow ([#103](https://github.com/rokucommunity/sgRouter/pull/103))
 - Chore: Update minimum audit threshold ([#105](https://github.com/rokucommunity/sgRouter/pull/105))
 - Chore: Accept GHSA-w5hq-g745-h8pq (uuid <11.1.1) advisory ([#104](https://github.com/rokucommunity/sgRouter/pull/104))
 - Chore: Update community deps and remove npm overrides ([#102](https://github.com/rokucommunity/sgRouter/pull/102))
 - Chore: Security enhancements ([#101](https://github.com/rokucommunity/sgRouter/pull/101))
 - upgrade to [brighterscript@0.72.4](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0724---2026-05-29). Notable changes since 0.70.3:
 - upgrade to [rooibos-roku@5.16.3](https://github.com/rokucommunity/rooibos/blob/master/CHANGELOG.md#5163---2026-05-20). Notable changes since 5.15.7:
 - upgrade to [ropm@0.11.8](https://github.com/rokucommunity/ropm/blob/master/CHANGELOG.md#0118---2026-05-30). Notable changes since 0.11.4:
### Fixed
 - Use routeConfig instead of routeParams check for component reuse ([#107](https://github.com/rokucommunity/sgRouter/pull/107))


## [0.1.2](https://github.com/rokucommunity/sgRouter/compare/0.1.1...v0.1.2) - 2026-03-13
### Added
 - Add FAQ ([#89](https://github.com/rokucommunity/sgRouter/pull/89))
### Changed
 - Update npm package links in README ([#88](https://github.com/rokucommunity/sgRouter/pull/88))
### Fixed
 - fix onSuspend bug ([#90](https://github.com/rokucommunity/sgRouter/pull/90))



## [0.1.1](https://github.com/rokucommunity/sgRouter/compare/0.1.0...v0.1.1) - 2026-03-12
### Changed
 - Use the correct npm name ([#86](https://github.com/rokucommunity/sgRouter/pull/86))



## [0.1.0](https://github.com/rokucommunity/sgRouter/compare/0.0.0-packages...v0.1.0) - 2026-03-12
- initial release
