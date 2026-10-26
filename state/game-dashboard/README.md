# Play Room Games Dashboard

Local implementation checkpoint, October 26, 2026.

## Implemented behavior

The play lounge has one dashboard containing Blackjack, Word Guess, Mini Crosswords, Snake, 2048, Sudoku, and noughts and crosses. The arcade, console, controller, and content button open its game library; the tabletop pieces open noughts and crosses within the same dashboard. The former inline game board is removed.

Blackjack includes a shuffled 52-card deck, adaptive ace totals, natural blackjacks, hidden dealer cards, hit/stand controls, result feedback, and a session record. The dealer stands on all 17s. Hands do not use wagers.

Word Guess offers six guesses, curated five-letter answers, local dictionary validation, duplicate-letter scoring, an on-screen keyboard, and keyboard input. The validation dictionary's source and MIT license are preserved in `assets/data/`. Mini Crosswords provides three original 5×5 puzzles, intersecting Across/Down clues, keyboard navigation, letter checks, reveals, clear, and next-puzzle controls.

Each game retains its state when switching games, returning to the library, closing the modal, or revisiting the room. State lasts for the current page visit. Snake pauses on panel changes, modal closure, hidden pages, focus loss, and deactivation. Escape returns from a game to the library; a second Escape closes the dialog. Phone layouts use a compact game selector. The All games control remains available while scrolling.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Source and HTTP server suite | 190 passed | `source-check.txt` |
| Syntax and local references | 81 modules passed | `source-check.txt` |
| New game regressions | 11 passed | `game-check.txt` |
| DOM and camera integration | All five modes passed | `integration-check.txt` |
| Desktop, 1280×720 | Eight game/library views; no horizontal overflow or automated WCAG A/AA violations | `desktop-audit.json` |
| Simulated portrait, 390×844 | Eight game/library views; no horizontal overflow or automated WCAG A/AA violations | `portrait-audit.json` |
| Simulated landscape, 844×390 | Eight game/library views; no horizontal overflow or automated WCAG A/AA violations | `landscape-audit.json` |

Native browser review exercised all seven games, Blackjack hit/stand and reveal, physical and on-screen Word Guess input, crossword entry/check/reveal/next-puzzle controls, Snake pause, 2048 keyboard movement, Sudoku feedback, and the computer reply in noughts and crosses. Phone review also submitted a second guess through letter buttons and switched games through the native selector. Production warnings and errors are recorded in `console.json` alongside the separate QA-tab logs.

The production console is clear. The iframe QA tabs logged separate `MutationObserver` initialization errors whose source was not established. Error handlers on the preview page and its child report no runtime errors during the final activity audits; all 24 view checks complete successfully. The raw console diagnostics are retained rather than discarded.

`dashboard-desktop.png`, `blackjack-desktop.png`, `word-guess-desktop.png`, and `crossword-desktop.png` show the production page. `word-guess-portrait.png` shows the phone-sized iframe and audit output inside the desktop browser; its screenshot is limited by the outer browser viewport.

The responsive checks use Chromium viewport simulations. They do not establish physical-phone, Safari, or other-engine behavior. Automated accessibility checks supplement manual keyboard and screen-reader testing.

## Reproduction

Run `npm run check` and `npm test`. Serve the repository locally, then open:

```text
/scripts/penthouse-preview.html?activity=arcade&width=1280&height=720&audit=1
/scripts/penthouse-preview.html?activity=arcade&width=390&height=844&audit=1&game=wordle
/scripts/penthouse-preview.html?activity=arcade&width=844&height=390&audit=1&game=crossword
```

The local audit uses the installed `axe-core` development dependency. Production games use no external API or runtime dependency.
