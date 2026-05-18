# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Fixed
- Inbox no longer stays empty after all emails are archived or deleted: sync now checks visible (non-archived, non-deleted) email count instead of total DB count.
- AI thread summary errors now correctly propagate as `isError: true` instead of silently rendering the fallback text as a real summary.

## [0.1.0] - Unreleased
### Added
- Initial project structure and repository bootstrap.
