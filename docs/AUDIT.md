# Repository Audit

Audit date: 2026-07-27

## Scope

The repository contains 23 downloaded HTML pages. The original download did not include local copies of the remote stylesheets, scripts, fonts, or media referenced by those pages, so this pass localizes those references to offline placeholders and local stubs under `public/offline-assets/`. Backend code lives under `src/server`, database code under `src/db`, and the minimal frontend wiring layer under `public/assets`.

## Page inventory

| Archive page | Local route(s) | Dynamic root(s) | Backend feature |
| --- | --- | --- | --- |
| `boblox - signup.html` | `/`, `/signup` | `react-landing-container` | signup/authentication |
| `Log in to Roblox.html` | `/login`, `/Login`, `/newlogin` | `react-login-web-app` | login/password reset/session |
| `Log in to boblox.html` | filename route | `react-login-web-app` | cleaned alternate login |
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
- page-specific empty app root where the original React bundle would hydrate content

The landing/signup page is a separate unauthenticated shell. The newsroom, Creator Hub, and Amazon pages have separate layouts and asset dependencies.

## Repair pass performed

- Removed Internet Archive toolbar/injected scripts/styles/comments from the archived pages.
- Replaced every remote URL in archived HTML attributes with local routes or local offline asset placeholders.
- Replaced API/event-stream style remote URLs embedded in inline scripts with local inert endpoints.
- Added local offline script, stylesheet, image, and font placeholders under `public/offline-assets/`.
- Added `/api/local-compat` for harmless compatibility requests.
- Added a route fallback so archived internal links resolve locally instead of returning a browser/network failure.
- Added `scripts/validate-site.js` to validate all archived pages, all discovered local links, forbidden domain removal, and auth flows.

## Repository organization

```txt
archive/pages/          preserved and cleaned downloaded HTML pages
src/server/             Express server, routing, APIs, page serving
src/db/                 relational schema and sql.js database adapter
public/assets/          local frontend support script
public/offline-assets/  local placeholder CSS/JS/image/font resources
scripts/                database initialization and validation scripts
docs/                   audit and reconstruction documentation
```

## Validation targets

- No forbidden remote platform domains or Internet Archive markers remain.
- No HTML `href`, `src`, or `action` attribute points to an external host.
- Every discovered local route returns a non-error response.
- Login, signup, logout, session cookies, and core APIs are validated by `npm run test:site`.
