# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



## [0.1.3](https://github.com/rokucommunity/sgRouter/compare/0.1.2...v0.1.3) - 2026-06-08
### Added
 - Add required Security Audit gate job to workflow ([#103](https://github.com/rokucommunity/sgRouter/pull/103))
 - Add checkpoint support ([#93](https://github.com/rokucommunity/sgRouter/pull/93))
### Changed
 - Use routeConfig instead of routeParams check for component reuse ([#107](https://github.com/rokucommunity/sgRouter/pull/107))
 - Update minimum audit threshold ([#105](https://github.com/rokucommunity/sgRouter/pull/105))
 - Accept GHSA-w5hq-g745-h8pq (uuid <11.1.1) advisory ([#104](https://github.com/rokucommunity/sgRouter/pull/104))
 - Update community deps and remove npm overrides ([#102](https://github.com/rokucommunity/sgRouter/pull/102))
 - Security enhancements ([#101](https://github.com/rokucommunity/sgRouter/pull/101))
 - Cache CreateObject("roDeviceInfo") ([#98](https://github.com/rokucommunity/sgRouter/pull/98))
 - upgrade to [brighterscript@0.72.4](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0724---2026-05-29). Notable changes since 0.70.3:
     - Add parameter name inlay hints ([#1703](https://github.com/rokucommunity/brighterscript/pull/1703))
     - Update minimum audit threshold ([#1723](https://github.com/rokucommunity/brighterscript/pull/1723))
     - Accept GHSA-w5hq-g745-h8pq (uuid <11.1.1) advisory ([#1722](https://github.com/rokucommunity/brighterscript/pull/1722))
     - Add security-audit-required gate job to security-audit workflow ([#1720](https://github.com/rokucommunity/brighterscript/pull/1720))
     - Security Audit workflow ([#1718](https://github.com/rokucommunity/brighterscript/pull/1718))
     - Security enhancements ([#1714](https://github.com/rokucommunity/brighterscript/pull/1714))
     - Recover from mismatched loop terminators with quick fixes ([#1696](https://github.com/rokucommunity/brighterscript/pull/1696))
     - Add diagnosticReporter config option ([#1701](https://github.com/rokucommunity/brighterscript/pull/1701))
     - Diagnose reserved BrightScript builtins used as values ([#1697](https://github.com/rokucommunity/brighterscript/pull/1697))
     - Add bs:disable / bs:enable block directives and diagnostic suppression quick fixes ([#1699](https://github.com/rokucommunity/brighterscript/pull/1699))
     - feat: add `validate` bsconfig flag to skip validation phase ([#1687](https://github.com/rokucommunity/brighterscript/pull/1687))
     - feat: allow line continuation in .brs files when minFirmwareVersion >= 15.3 ([#1693](https://github.com/rokucommunity/brighterscript/pull/1693))
     - Reload projects when manifest file changes ([#1700](https://github.com/rokucommunity/brighterscript/pull/1700))
     - Set up Copilot coding agent instructions ([#1695](https://github.com/rokucommunity/brighterscript/pull/1695))
     - Bump diff from 4.0.2 to 4.0.4 in /benchmarks ([#1610](https://github.com/rokucommunity/brighterscript/pull/1610))
     - Add `relativeSourceMaps` option for portable sourcemaps ([#1624](https://github.com/rokucommunity/brighterscript/pull/1624))
     - Auto-update imports when files are renamed ([#1688](https://github.com/rokucommunity/brighterscript/pull/1688))
     - Support minFirmwareVersion in bsconfig.json ([#1678](https://github.com/rokucommunity/brighterscript/pull/1678))
     - added source fix all code action support ([#1659](https://github.com/rokucommunity/brighterscript/pull/1659))
     - Limit project activation concurrency ([#1627](https://github.com/rokucommunity/brighterscript/pull/1627))
     - Share per-file namespace data via lazy ScopeNamespaceLookup view ([#1684](https://github.com/rokucommunity/brighterscript/pull/1684))
     - Lazy-allocate NamespaceContainer's optional fields ([#1683](https://github.com/rokucommunity/brighterscript/pull/1683))
     - Share BscSymbol references in SymbolTable.mergeSymbolTable ([#1682](https://github.com/rokucommunity/brighterscript/pull/1682))
     - Chain prebuild sourcemaps through BrighterScript transpile ([#1676](https://github.com/rokucommunity/brighterscript/pull/1676))
     - added selection range provider support to lsp capabilities ([#1657](https://github.com/rokucommunity/brighterscript/pull/1657))
     - Report const cycle diagnostic per node to match class convention ([#1681](https://github.com/rokucommunity/brighterscript/pull/1681))
     - Support line continuation ([#1667](https://github.com/rokucommunity/brighterscript/pull/1667))
     - Fix cross-file const inlining and flag const cycles ([#1680](https://github.com/rokucommunity/brighterscript/pull/1680))
     - Bump postcss from 8.4.31 to 8.5.10 ([#1679](https://github.com/rokucommunity/brighterscript/pull/1679))
     - Bump lodash from 4.17.23 to 4.18.1 ([#1673](https://github.com/rokucommunity/brighterscript/pull/1673))
     - Bump follow-redirects from 1.15.6 to 1.16.0 ([#1672](https://github.com/rokucommunity/brighterscript/pull/1672))
     - Bump lodash from 4.17.23 to 4.18.1 in /benchmarks ([#1670](https://github.com/rokucommunity/brighterscript/pull/1670))
     - Bump brace-expansion in /benchmarks ([#1666](https://github.com/rokucommunity/brighterscript/pull/1666))
     - Feature/more quick fixes ([#1662](https://github.com/rokucommunity/brighterscript/pull/1662))
     - bugfix/small perf improvements ([#1663](https://github.com/rokucommunity/brighterscript/pull/1663))
     - Bump picomatch from 2.3.1 to 2.3.2 ([#1661](https://github.com/rokucommunity/brighterscript/pull/1661))
     - Bump picomatch from 2.3.1 to 2.3.2 in /benchmarks ([#1660](https://github.com/rokucommunity/brighterscript/pull/1660))
     - Add computed property names (compile-time support only) ([#1658](https://github.com/rokucommunity/brighterscript/pull/1658))
     - Add AI agent instructions ([#1654](https://github.com/rokucommunity/brighterscript/pull/1654))
     - Bump flatted from 3.2.2 to 3.4.2 ([#1653](https://github.com/rokucommunity/brighterscript/pull/1653))
     - Set up comprehensive Copilot coding agent instructions ([#1650](https://github.com/rokucommunity/brighterscript/pull/1650))
     - perf(ProjectManager): cache PathCollection per project in flushDocumentChanges ([#1628](https://github.com/rokucommunity/brighterscript/pull/1628))
     - Fixes issue with running tests on newer node versions ([#1644](https://github.com/rokucommunity/brighterscript/pull/1644))
     - feat(LanguageServer): debounce onDidChangeWatchedFiles events ([#1626](https://github.com/rokucommunity/brighterscript/pull/1626))
     - Bump minimatch in /benchmarks ([#1640](https://github.com/rokucommunity/brighterscript/pull/1640))
     - Ensure we have consistent line endings ([#1642](https://github.com/rokucommunity/brighterscript/pull/1642))
     - Typedef namespace param fix ([#1641](https://github.com/rokucommunity/brighterscript/pull/1641))
     - Bump minimatch from 3.1.2 to 3.1.5 ([#1639](https://github.com/rokucommunity/brighterscript/pull/1639))
     - Backport V1 Typed function type syntax to v0 ([#1623](https://github.com/rokucommunity/brighterscript/pull/1623))
     - spelling fix ([#1621](https://github.com/rokucommunity/brighterscript/pull/1621))
     - Backport `for each` type syntax from V1 -> V0 ([#1617](https://github.com/rokucommunity/brighterscript/pull/1617))
     - Back ports intersection type and grouped type expressions ([#1608](https://github.com/rokucommunity/brighterscript/pull/1608))
     - Bump lodash from 4.17.21 to 4.17.23 ([#1611](https://github.com/rokucommunity/brighterscript/pull/1611))
     - Bump lodash from 4.17.21 to 4.17.23 in /benchmarks ([#1612](https://github.com/rokucommunity/brighterscript/pull/1612))
     - Add TKSS Software Inc logo to README ([#1604](https://github.com/rokucommunity/brighterscript/pull/1604))
     - Backports TypeStatement syntax from v1 to v0 ([#1600](https://github.com/rokucommunity/brighterscript/pull/1600))
     - Backported v1 inline interface syntax ([#1592](https://github.com/rokucommunity/brighterscript/pull/1592))
     - Add definition provider for import statement ([#1595](https://github.com/rokucommunity/brighterscript/pull/1595))
     - Fix confusing diagnostic when dottedGet follows function call in ExpressionStatement ([#1598](https://github.com/rokucommunity/brighterscript/pull/1598))
     - Bump glob from 10.2.1 to 10.5.0 in /benchmarks ([#1593](https://github.com/rokucommunity/brighterscript/pull/1593))
 - upgrade to [rooibos-roku@5.16.3](https://github.com/rokucommunity/rooibos/blob/master/CHANGELOG.md#5163---2026-05-20). Notable changes since 5.15.7:
     - Update ropm to 0.11.7 and remove lodash override ([#391](https://github.com/rokucommunity/rooibos/pull/391))
     - Security enhancements ([#390](https://github.com/rokucommunity/rooibos/pull/390))
     - Bump fast-uri from 3.1.0 to 3.1.2 ([#388](https://github.com/rokucommunity/rooibos/pull/388))
     - fix: expectCalled/expectNotCalled broken for node tests since v5.15 ([#384](https://github.com/rokucommunity/rooibos/pull/384))
     - Bump ip-address and socks ([#386](https://github.com/rokucommunity/rooibos/pull/386))
     - Bump minimatch ([#373](https://github.com/rokucommunity/rooibos/pull/373))
     - Bump basic-ftp from 5.0.5 to 5.2.2 ([#379](https://github.com/rokucommunity/rooibos/pull/379))
     - Upgrade brighterscript to 0.71.1 and fix tests ([#381](https://github.com/rokucommunity/rooibos/pull/381))
     - Bump brace-expansion from 1.1.11 to 1.1.13 ([#377](https://github.com/rokucommunity/rooibos/pull/377))
     - Bump picomatch from 2.3.1 to 2.3.2 ([#376](https://github.com/rokucommunity/rooibos/pull/376))
     - Bump flatted from 3.2.2 to 3.4.2 ([#374](https://github.com/rokucommunity/rooibos/pull/374))
     - Add a node creator for generated test nodes ([#367](https://github.com/rokucommunity/rooibos/pull/367))
     - Bump js-yaml ([#357](https://github.com/rokucommunity/rooibos/pull/357))
     - chore: Support dispatch workflows ([#350](https://github.com/rokucommunity/rooibos/pull/350))
     - chore: Make `getTestFunctionContents` test helper more flexible for later bsc version usage ([#360](https://github.com/rokucommunity/rooibos/pull/360))
     - Fix method creation bug when bsc version is newer than version from rooibos ([#358](https://github.com/rokucommunity/rooibos/pull/358))
     - chore: add warning in docs on SceneGraph mocking limitations ([#359](https://github.com/rokucommunity/rooibos/pull/359))
     - chore: support OIDC ([#356](https://github.com/rokucommunity/rooibos/pull/356))
     - missing floating point precision and incorrect failure states ([#352](https://github.com/rokucommunity/rooibos/pull/352))
     - chore: Shared CI remove merged check on publish releases ([#348](https://github.com/rokucommunity/rooibos/pull/348))
     - Enable stricter linting for TypeScript ([#343](https://github.com/rokucommunity/rooibos/pull/343))
     - Fixed a crash when searching for assertions to rewrite ([#347](https://github.com/rokucommunity/rooibos/pull/347))
     - Fixed a runtime crash in the mocha reporting when generating diffs ([#345](https://github.com/rokucommunity/rooibos/pull/345))
     - Add and implement linting rules ([#338](https://github.com/rokucommunity/rooibos/pull/338))
     - Shared CI Support Prerelease ([#341](https://github.com/rokucommunity/rooibos/pull/341))
     - Shared CI Support Prerelease ([#339](https://github.com/rokucommunity/rooibos/pull/339))
 - upgrade to [ropm@0.11.8](https://github.com/rokucommunity/ropm/blob/master/CHANGELOG.md#0118---2026-05-30). Notable changes since 0.11.4:
     - Add --rootDir flag support to copy/install/clean commands ([#143](https://github.com/rokucommunity/ropm/pull/143))
     - Update minimum audit threshold ([#142](https://github.com/rokucommunity/ropm/pull/142))
     - Accept GHSA-w5hq-g745-h8pq (uuid <11.1.1) advisory ([#141](https://github.com/rokucommunity/ropm/pull/141))
     - Add security-audit-required job to security-audit workflow ([#140](https://github.com/rokucommunity/ropm/pull/140))
     - Replace @xml-tools/ast with in-repo shim ([#138](https://github.com/rokucommunity/ropm/pull/138))
     - Security enhancements ([#137](https://github.com/rokucommunity/ropm/pull/137))
     - Bump brace-expansion from 1.1.12 to 1.1.14 ([#136](https://github.com/rokucommunity/ropm/pull/136))
     - Bump picomatch from 2.3.1 to 2.3.2 ([#134](https://github.com/rokucommunity/ropm/pull/134))
     - Bump flatted from 3.3.1 to 3.4.2 ([#132](https://github.com/rokucommunity/ropm/pull/132))
     - Bump minimatch ([#128](https://github.com/rokucommunity/ropm/pull/128))
     - Bump ajv from 6.12.6 to 6.14.0 ([#127](https://github.com/rokucommunity/ropm/pull/127))



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
