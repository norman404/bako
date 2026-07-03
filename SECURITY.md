# Security Policy

## Supported Versions

Bako is under active development. Security updates are applied only to the
versions listed below.

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2.0 | :x:                |

## Reporting a Vulnerability

**Do NOT open a public GitHub issue to report a security vulnerability.**

Public issues disclose the vulnerability to everyone, including bad actors,
before a fix can be prepared and shipped. Please report vulnerabilities
responsibly through one of the private channels below.

### Private reporting channels

1. **GitHub Security Advisories (preferred).**
   Open a private advisory using the "Report a vulnerability" button on the
   repo's Security tab, or go directly to:

   https://github.com/norman404/bako/security/advisories/new

2. **Private email.**
   If you cannot use GitHub Security Advisories, send a private email to the
   maintainer at [norman.torres.mx@gmail.com](mailto:norman.torres.mx@gmail.com)
   describing the issue.

### Response timeline

| Stage                          | Expected time      |
| ------------------------------ | ------------------ |
| Acknowledge receipt of report  | Within 48 hours    |
| Initial evaluation & triage    | Within 7 days      |
| Fix / patch release            | Best effort, coordinated with reporter |

If the timeline above cannot be met (e.g. the fix is complex), you will be
kept informed of progress and the revised estimate.

### Disclosure policy

Bako follows **coordinated disclosure**.

- The vulnerability is not made public until a fix is available and shipped
  to users, unless the reporter explicitly requests otherwise or the issue is
  already being actively exploited in the wild.
- Once a fix is released, we credit the reporter (with their permission) in
  the security advisory and release notes.
- If the report turns out not to be a valid vulnerability, we will explain
  why and close the advisory.

### What to include in your report

Please include as much of the following as possible so we can triage and
reproduce quickly:

- A clear description of the vulnerability and its impact.
- Step-by-step instructions to reproduce the issue.
- The Bako version and platform (OS + architecture) where it was observed.
- Whether the issue can be exploited by an attacker without user interaction.
- Any known workaround or mitigation.
- Your preferred contact channel and whether you wish to be credited.

## Security Measures

Bako is a local-first desktop POS. Some of the measures we take:

- **Local data.** All business data is stored in an embedded SQLite database
  on the user's machine via the Tauri SQL plugin. Bako does not transmit
  sales, customer, or business data to external servers.
- **Cryptographically signed updates.** Releases are signed with a minisign
  keypair. The updater verifies each release signature against the public key
  embedded in the installed binary before applying it. A release whose
  signature does not validate is rejected.
- **Content Security Policy (CSP).** A strict CSP is planned for the
  Tauri webview. It is currently set to `null` (in development) and will be
  tightened before stable releases. Hardening the CSP is tracked as ongoing
  work.

## Scope

### In scope

- Vulnerabilities in Bako's own application code (frontend and Tauri/Rust
  backend).
- Vulnerabilities in the build and release process, including signing and
  packaging.
- Vulnerabilities in the Tauri auto-updater flow (signature validation,
  download, replacement of the installed binary).
- Security regressions introduced by Bako-specific configuration of Tauri
  plugins.

### Out of scope

- Vulnerabilities in third-party dependencies themselves. These should be
  reported upstream to the maintainer of the affected package. Once a fix is
  available upstream, open a regular (non-security) issue so we can bump the
  dependency.
- Exposure of secrets or sensitive data caused by the user's own
  misconfiguration of their environment.
- Issues that require already having full, authenticated local access to the
  machine running Bako (i.e. issues whose impact is equivalent to "I can read
  my own local files").
- Self-XSS or social engineering attacks that require the victim to manually
  paste/execute malicious content.

If you are unsure whether your finding is in scope, report it privately
anyway — we will triage and let you know.

## Recognition

We are grateful to everyone who takes the time to report security issues
responsibly. Reporters who follow coordinated disclosure will be credited
(by name/handle or anonymously, as they prefer) in the published security
advisory and the corresponding release notes.

Thank you for helping keep Bako and its users safe.