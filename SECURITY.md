# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest `main` | ✅ |

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Report privately via email: Alberto.Licea@pinkzebrahome.com

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

You'll receive a response within 48 hours. Once confirmed and patched, we'll credit you in the release notes unless you prefer anonymity.

## Scope

This is a static client-side app. All emoji data is fetched from public CDNs. There is no backend, no authentication, and no user data stored.

Relevant attack surfaces:
- XSS via emoji metadata rendered in the DOM
- Malicious CDN responses (supply chain)
- ZIP generation with crafted filenames
