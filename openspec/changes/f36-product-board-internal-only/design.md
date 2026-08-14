# Design — F36 Product Board internal-only navigation

## Existing behavior

`demo/index.html` renders a global header action linking directly to `/demo/dash/dashgpt-product/`. Historical F9 intentionally required this discoverability.

The Product Board itself is implemented as a saved Semantic Dash and has compatibility code, repository-backed data and verification scripts. Removing all of that would be a separate migration with a much larger blast radius.

## New boundary

The personal dashboard SHALL not advertise Product Board in global navigation. Product Board remains reachable only when its internal/compatibility URL is known or used by project-maintenance tooling.

This separates two concerns:

- **personal DashGPT UX:** Cards, Dashes, search, capture, storage and continuation;
- **DashGPT project maintenance:** OpenSpec/repository evidence and optional legacy Product Board compatibility surface.

## Implementation

Remove only the header anchor with class `dash-nav-link` and target `/demo/dash/dashgpt-product/` from `demo/index.html`.

Do not delete Product Board modules, repository data, route handling or historical F9 artifacts in this change. That keeps old direct links stable and avoids mixing a navigation decision with a data/code retirement migration.

## Regression boundary

Automated verification SHALL assert that the normal demo header does not contain a Product Board link or the canonical Product Board path, while existing Product Board verification continues to cover its direct compatibility route.

## Responsive behavior

Removing a header action reduces horizontal pressure on desktop and mobile. No new mobile layout rule is required; preview acceptance checks the existing header at desktop and 360/390px widths.
