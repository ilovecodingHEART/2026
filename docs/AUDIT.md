# Repository Audit

Audit date: 2026-07-27

## Scope

The repository contains 23 downloaded HTML pages and no separately downloaded first-party CSS, JavaScript, image, or font files outside the HTML files and the new application support files. The downloaded pages reference Roblox CDN assets (`css.rbxcdn.com`, `js.rbxcdn.com`, `images.rbxcdn.com`, `static.rbxcdn.com`, `tr.rbxcdn.com`), Creator Hub CDN assets, Amazon media assets, and newsroom media assets. Local application resources now live in `public/assets` and backend/database code lives under `src`.

## Page inventory

| Archive page | Local route(s) | Dynamic root(s) | Backend feature |
| --- | --- | --- | --- |
| `boblox - signup.html` | `/`, `/signup` | `react-landing-container` | signup/authentication |
| `Log in to Roblox.html` | `/login`, `/Login`, `/newlogin` | `react-login-web-app` | login/password reset/session |
| `Log in to boblox.html` | filename route | `react-login-web-app` | Wayback-cleaned alternate login |
| `Home - boblox.html` | `/home` | `places-list-web-app` | game recommendations/play |
| `Top Roblox Games.html` | `/charts`, `/games`, `/discover`, `/games/:id/...` | `game-carousel-web-app` | games/play |
| `Catalog.html` | `/catalog`, `/catalog/...`, `/marketplace` | `catalog-react-container` | marketplace/purchase |
| `Avatar - Roblox.html` | `/avatar`, `/my/avatar` | `avatar-web-app` | inventory-backed avatar placeholder |
| `Inventory - Roblox.html` | `/inventory`, `/users/inventory`, `/users/:id/inventory` | `inventory-container` | inventory |
| `Friends - Roblox.html` | `/friends`, `/users/friends` | `friends-web-app` | friends/friend requests |
| `Roblox - messages.html` | `/messages`, `/my/messages` | `private-message-web-app` | private messages |
| `My Transactions - Roblox.html` | `/transactions`, `/my/transactions`, `/my/money` | `transactions-web-app` | transactions |
| `Trade - Roblox.html` | `/trade`, `/trades` | `trades-web-app` | trades |
| `Settings - Roblox.html` | `/settings`, `/my/account` | `notification-settings` | account settings |
| `Buy Robux.html` | `/upgrades/robux`, `/robux` | `robux-redesign-page`, `robux-container-base` | Robux purchase simulation |
| `Redeem Roblox Gift Cards and Codes.html` | `/redeem`, `/redeem-gift-card` | `redeem-gift-card-container`, `redeem-gift-card` | gift card redemption |
| `Roblox Gift Cards.html` | `/giftcards`, `/giftcards-us`, `/gift-cards` | `MasterContainer` | gift card landing page |
| `Roblox Subscription.html` | `/subscription`, `/premium/membership` | `roblox-subscription-container` | subscription landing page |
| `groups- Roblox.html` | `/groups`, `/groups/:id/...` | `group-container` | groups/join |
| `profile - Roblox.html` | `/users/:id/profile` | profile sections | profile data |
| `Help & Safety - Roblox.html` | `/help`, `/help-safety`, `/help-and-safety`, `/terms`, `/privacy`, `/accessibility`, `/safety` | `safety-support-page-web-app` | support/static policy routes |
| `Roblox Creator Hub.html` | `/develop`, `/create`, `/creator-hub` | Next static root | creator hub/static route |
| `Newsroom _ Robloxakablog.html` | `/news`, `/newsroom`, `/blog`, `/impact`, `/leadership`, `/values`, `/podcast`, `/education`, `/contact`, `/press-kit`, `/publications`, `/careers`, `/brands`, `/research`, `/investors` | newsroom layout | newsroom/static corporate routes |
| `Amazon.com_ BOBLOX.html` | `/amazon` plus Amazon-like local paths | Amazon store layout | static store page |

## Shared layout/components discovered

Most Roblox account pages share the same downloaded shell:

- fixed `rbx-header` navigation with `/home`, `/charts`, `/catalog`, `/develop`
- left navigation container
- account/security/contact/verification modal containers
- footer container
- chat container on authenticated pages
- cookie banner container
- page-specific empty app root where the original Roblox React bundle would hydrate content

The landing/signup page is a separate unauthenticated shell. The newsroom, Creator Hub, and Amazon pages have separate layouts and asset dependencies.

## Cleanup performed from the audit

- Removed Wayback Machine toolbar/injected scripts/styles/comments from the two Internet Archive pages.
- Unwrapped Wayback `web.archive.org/web/...` asset URLs back to their original Roblox CDN URLs.
- Converted internal Roblox navigation links from absolute Roblox URLs to local project routes.
- Converted `about.roblox.com`, `careers.roblox.com`, `brands.roblox.com`, `research.roblox.com`, `education.roblox.com`, `ir.roblox.com`, `create.roblox.com`, and `en.help.roblox.com` navigation links to local routes.
- Left CDN asset references intact when they are stylesheets, scripts, images, or fonts required for the archived visual appearance.

## Repository organization after refactor

```txt
archive/pages/          preserved and cleaned downloaded HTML pages
src/server/             Express server, routing, APIs, page serving
src/db/                 relational schema and sql.js database adapter
public/assets/          local frontend support script
scripts/                maintenance and database initialization scripts
docs/                   audit and reconstruction documentation
```

## Validation targets

- No `web.archive.org`, `web-static.archive.org`, Wayback toolbar, `__wm`, or `wombat` markers remain in archived pages.
- No `href` or `action` attribute navigates to an internal Roblox-owned web property; these now resolve locally.
- CDN references remain external only when they are resources needed to preserve the downloaded frontend.
