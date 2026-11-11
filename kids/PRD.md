# Kids: PRD and build prompts

Ten small educational games for a 7-year-old, built as static pages under `kids/`.
Seven are in Spanish (maths, time, money, spelling, reading, logic). Three teach English, and one of those is about spelling.

- Date: 2026-11-11
- Status: Prompt 0 (kit and hub) and Prompt 1 (`cohete-calculo`) are built. Prompts 2 to 10 are not built yet.
- Builder: Claude Sonnet, one session per prompt

## 0. How to use this file

1. Run **Prompt 0** once. It builds the shared kit and the hub page that every game depends on.
2. Run **Prompts 1 to 10** one per session, each started at the repo root. Any order works.
3. Every prompt tells Sonnet to read sections 1 and 2 of this file first. If a session has no access to the repo, paste sections 1 and 2 above the prompt.
4. Run the prompts one after another, or each in its own branch. Every game edits one line of `kids/games.js`, so two sessions in the same working tree can overwrite each other.

Suggested order: Prompt 0, then 8 (Spelling Bee), 2 (Tablas) and 7 (Robot). Let her play those three before building the rest, and adjust the shared rules with what you see.

## 1. Shared rules (apply to every game)

### Player
- A girl aged 7, in 2º de Primaria in Spain. Native Spanish speaker who reads simple Spanish on her own.
- English is at beginner school level. Use British English for spelling and voice (colour, grey, en-GB).
- The site is public. Never put a child's name, photo or any personal data in the code or content.

### Language
- All interface text is in Spanish from Spain, using "tú", in short sentences with correct accents and opening ¿ and ¡.
- In the English games, instructions and help stay in Spanish. Only the learning content is in English.
- Standard labels: "Jugar", "Comprobar", "Siguiente", "Otra vez", "Salir", "Pronto".
- Never use negative wording. A miss is "¡Casi!" followed by the right answer.

### Session shape
- A round is 10 items and takes 3 to 5 minutes, unless the game's prompt says otherwise.
- Screens: start screen (level or theme choice), round, result screen.
- No lives, no countdown timers and no penalties.
- Right answer: green state with a ✓ icon, the `ok` sound and a short praise line.
- Wrong answer: red state with a ✗ icon, the `ko` sound, then show the correct answer. The missed item comes back once later in the same round. The repeat does not count towards the score.
- Score is the number of items answered right at the first try. Stars: 3 for 90% or more, 2 for 70% or more, otherwise 1. Finishing always earns at least 1 star.
- Colour is never the only signal. Always pair it with an icon or text.

### Device and layout
- Touch first (tablet and phone). Mouse and physical keyboard must also work.
- The play screen fits the viewport with no scrolling at 360×640, 768×1024, 1024×768 and 1280×800.
- Touch targets are at least 56px with 8px gaps. Body text is at least 20px and answer text at least 28px.
- Prefer taps to drags. If a drag is used, a tap-then-tap alternative must exist.
- Nothing depends on hover. Use `touch-action: manipulation` and disable text selection on game elements.
- Respect `prefers-reduced-motion`. Use real `<button>` elements with a visible focus state.

### Audio and pictures
- Speech uses the kit (`Kit.speak`). Every instruction has a 🔊 button that reads it aloud.
- Sound effects come from the kit (`Kit.sfx`). Do not add audio files.
- Pictures are emoji. Do not add image files or icon libraries.
- Where a game depends on the English voice, it must still be playable when `Kit.canSpeak('en')` is false. Each prompt says how.

### Technical
- One file per game: `kids/<slug>/index.html` with inline `<style>` and `<script>`.
- Load `../shared/kit.css` and `../shared/kit.js`. Vanilla JS only: no frameworks, no CDN scripts, no build step, no npm.
- Put the learning content in one clearly marked `const DATA = …` block at the top of the script, so a parent can edit it.
- Save progress only through `Kit.store` and `Kit.deck`. No network calls, analytics, ads or external links.
- Do not edit anything in `kids/shared/`. If the kit lacks something, implement it inside the game and say so in the final report.
- Outside its own folder a game changes one thing only: its entry in `kids/games.js` goes from `ready: false` to `ready: true`.
- Do not push. Commit only if the user asks.

### Verification (every prompt)
- Serve from the repo root with `python3 -m http.server` and open `http://localhost:8000/kids/<slug>/`.
- If Playwright is available, script these checks. Otherwise do them by hand and say so.
  - A full round with every answer right ends on the result screen with 3 stars.
  - A round with mistakes shows the correct answer and repeats each missed item once.
  - Progress survives a page reload.
  - No console errors (a blocked font request can be ignored).
  - No horizontal scroll at 360px wide, and no vertical scroll during play at 360×640 and 1024×768.
  - Screenshots of the start, play and result screens, saved outside the repo.
- Final report: files changed, how to test, checks passed or failed, and any deviation from this PRD.

## 2. Kit contract (built by Prompt 0, used by every game)

Files: `kids/shared/kit.css`, `kids/shared/kit.js` (one global, `Kit`), `kids/shared/demo.html`, `kids/games.js`, `kids/index.html`.

### kit.js

| API | Behaviour |
|---|---|
| `Kit.ready` | Promise. Resolves when speech voices have loaded, or after 1 second. |
| `Kit.mount({ slug, title })` | Fills `<header id="k-header">` with a back link to `../`, the title, the game's best stars and a mute toggle. Sets `--accent` and `--on-accent` from the game's entry in `games.js`. |
| `Kit.speak(text, lang = 'es', { rate = 0.9 } = {})` | Returns a Promise. `'es'` uses an es-ES voice. `'en'` prefers en-GB, then any English voice. Cancels the previous utterance. Resolves at once when muted or when no voice exists. |
| `Kit.canSpeak(lang)` | `true` when a voice for that language exists. |
| `Kit.sfx(name)` | `'tap'`, `'ok'`, `'ko'` or `'win'`. Made with WebAudio. Respects mute. |
| `Kit.store(slug)` | `{ get(defaults), set(obj) }`. JSON in `localStorage['kids.<slug>.v1']`. Every access is in try/catch and the game works without storage. |
| `Kit.deck(slug, ids)` | Leitner boxes 1 to 3, saved in the store. `next(n)` returns `n` ids, unseen and low boxes first, random within a box, never the same id twice in a row. `mark(id, ok)` moves the id up one box or back to box 1. `stats()` returns `{ seen, mastered, total }`, where mastered means box 3. |
| `Kit.stars.award(slug, score, total)` | Applies the star rule, saves the best result, returns 1 to 3. |
| `Kit.stars.get(slug)` | `{ best, rounds }`. |
| `Kit.result({ slug, score, total, onAgain })` | Draws the standard result screen with stars, a message and the "Otra vez" and "Salir" buttons. Plays `win` and confetti. Calls `Kit.stars.award`. |
| `Kit.confetti()` | Short confetti burst. Skipped under reduced motion. |
| `Kit.praise()`, `Kit.encourage()` | Random Spanish lines such as "¡Muy bien!" and "¡Casi!". |
| `Kit.shuffle(arr)`, `Kit.sample(arr, n)`, `Kit.randInt(a, b)` | Helpers. `shuffle` returns a new array. |

Speech and audio are unlocked on the first `pointerdown` or `keydown`, which iOS requires.

**As built (differences and additions to the table above):**
- `kit.js` loads `../games.js` by itself when a page has not already included it. `Kit.ready` also waits for it, and `Kit.mount` returns a Promise that resolves once the accent colours are applied.
- `Kit.result` returns the stars earned (1 to 3). It also takes optional `extra` (a DOM node shown above the stars), `message` (replaces the default line) and `actions` (`[{ label, onClick, primary }]`, extra buttons between "Otra vez" and "Salir").
- Extra helpers: `Kit.stars.calc(score, total)` (the star rule without saving), `Kit.stars.el(n, max)` (a stars element), `Kit.isMuted()` and `Kit.setMuted(bool)`.
- `Kit.store(slug).set(obj)` shallow-merges into the saved object, so a game's own keys and the kit's `stars` and `deck` keys coexist.
- `Kit.deck` treats an unseen id as box 0, so unseen ids come before box 1. A first right answer on an unseen id moves it to box 2.
- Markup for `.k-progress` is ten `<i>` elements with `is-done`, `is-miss` or `is-current`. `.k-numpad` holds 12 buttons, with `.k-numpad__del` and `.k-numpad__go` on the last row.

### kit.css

- Tokens: `--bg`, `--card`, `--ink`, `--muted`, `--ok`, `--ko`, `--accent`, `--on-accent`, `--radius`, `--gap`.
- Classes: `.k-app`, `.k-header`, `.k-screen`, `.k-card`, `.k-btn`, `.k-btn--big`, `.k-choice` (with `.is-ok` and `.is-ko`), `.k-tile`, `.k-progress` (10 dots), `.k-stars`, `.k-numpad`.
- Look: bright and friendly, light background, rounded cards, dark ink. A rounded font from Google Fonts (Nunito) with a system fallback.

### games.js

`window.KIDS_GAMES` is an array of `{ slug, title, emoji, color, onAccent, desc, ready }`, in the order of section 3. Every entry starts with `ready: false`.

## 3. Game catalogue

| # | Slug | Title | Emoji | Accent | On accent | Subject |
|---|---|---|---|---|---|---|
| 1 | `cohete-calculo` | Cohete de cálculo | 🚀 | `#FF6B4A` | `#FFFFFF` | Sumas y restas hasta 100 |
| 2 | `tablas` | Tablas mágicas | ✨ | `#8E5BE8` | `#FFFFFF` | Tablas de multiplicar |
| 3 | `reloj` | ¿Qué hora es? | 🕒 | `#3D7DE0` | `#FFFFFF` | Leer el reloj |
| 4 | `la-tienda` | La tienda | 🛒 | `#2E9E5B` | `#FFFFFF` | Monedas y billetes de euro |
| 5 | `detective-letras` | Detective de letras | 🔍 | `#F2994A` | `#1F2933` | Ortografía |
| 6 | `mini-cuentos` | Minicuentos | 📖 | `#EB5E9A` | `#FFFFFF` | Comprensión lectora |
| 7 | `robot` | Robot explorador | 🤖 | `#00A3B4` | `#FFFFFF` | Lógica y programación |
| 8 | `spelling-bee` | Spelling Bee | 🐝 | `#F2C200` | `#1F2933` | Inglés: deletrear |
| 9 | `word-safari` | Word Safari | 🦁 | `#9BBF2E` | `#1F2933` | Inglés: vocabulario y escucha |
| 10 | `sentence-train` | Sentence Train | 🚂 | `#E0564B` | `#FFFFFF` | Inglés: construir frases |

## 4. Prompts

### Prompt 0: shared kit and hub (run first)

```text
You are working in the repo `my-projects`: small static web apps served by GitHub Pages, no build step.
Read `kids/PRD.md` sections 1, 2 and 3 before writing code. They are the spec for this task.

Build the foundation for the kids games. Do not build any game.

Create:
1. `kids/shared/kit.js` and `kids/shared/kit.css`, exactly to the contract in section 2.
2. `kids/games.js` with the ten entries from section 3, all `ready: false`.
3. `kids/index.html`, the hub. Title "Juegos para aprender". A grid of ten large cards built from
   `window.KIDS_GAMES`: emoji, title, one-line description, best stars. A ready card links to
   `<slug>/`. A card that is not ready is greyed out, not clickable, and shows "Pronto".
   Small "< volver" link to `../`. Two columns on phones, more on wider screens.
4. `kids/shared/demo.html`, a test page with one button per kit API: speak in Spanish, speak in
   English, each sound, confetti, a deck of five ids with next and mark, store get and set,
   and the result screen. It shows whether Spanish and English voices were found.
5. Add a `kids/` entry to the root `index.html` list and to the project list in `README.md`,
   following the existing entries. Do not restyle the root page.

Requirements:
- `Kit.speak` picks voices by `lang` prefix, prefers local voices, and handles voices that load late
  (`voiceschanged`). It must never throw and never leave a Promise pending.
- Mute state is saved in `localStorage['kids.kit.v1']` and applies to speech and sounds.
- `Kit.deck` must work with any list of string ids and tolerate ids added or removed later.
- The kit has no dependencies and no network calls apart from the font stylesheet in `kit.css`.

Verify with Playwright if available: hub renders ten "Pronto" cards with no console errors;
flipping one entry to `ready: true` makes that card a link; every button on `demo.html` runs
without errors; deck boxes and mute survive a reload; no horizontal scroll at 360px.
Flip the entry back to `ready: false` when done.
Report the files created, the final `Kit` API as built, and any difference from section 2.
```

### Prompt 1: Cohete de cálculo (sumas y restas)

```text
You are working in the repo `my-projects`. Read `kids/PRD.md` sections 1 and 2, and the source of
`kids/shared/kit.js`, before writing code. Follow the shared rules exactly.

Build `kids/cohete-calculo/index.html`: mental addition and subtraction for a 7-year-old.

Levels (the start screen shows all five, with locked ones marked):
1. Sums and subtractions within 10.
2. Within 20, crossing ten (8 + 7, 15 - 9).
3. Two-digit numbers without carrying or borrowing (23 + 14, 48 - 25).
4. Two-digit numbers with carrying or borrowing (27 + 15, 43 - 18). Results stay between 0 and 100.
5. Missing number (7 + ? = 12, ? - 4 = 9), using the ranges of levels 1 and 2.

Play:
- Questions are generated at random within the level rules. Never a negative result. No repeats
  within a round.
- She types the answer on an on-screen number pad (0 to 9, borrar, comprobar). Physical digit keys,
  Backspace and Enter also work.
- A rocket moves up one step per first-try correct answer. On the result screen it launches.
- On a miss, show the full correct operation. For levels 1 and 2, also show it as two rows of dots
  grouped in fives.
- A level unlocks when the previous one is finished with 2 stars or more. Level 1 is open.

Storage: unlocked levels and best stars per level.
Extra checks: generate 2,000 questions per level in a test and assert every one obeys the level
rules, including "carrying happens" for level 4 and "no carrying" for level 3.
Set `ready: true` for `cohete-calculo` in `kids/games.js`.
```

### Prompt 2: Tablas mágicas (tablas de multiplicar)

```text
You are working in the repo `my-projects`. Read `kids/PRD.md` sections 1 and 2, and the source of
`kids/shared/kit.js`, before writing code. Follow the shared rules exactly.

Build `kids/tablas/index.html`: learning and practising the multiplication tables 1 to 10.

Start screen: ten table buttons, shown in the teaching order 2, 5, 10, 4, 3, 6, 9, 8, 7, 1. Each
shows its mastery as 0 to 3 stars, from the share of its facts in deck box 3. She can select one or
several tables, then choose "Aprender" or "Practicar".

Aprender (one table at a time):
- Step through 1 to 10. Each step shows the fact, for example "3 × 4 = 12", and a grid of
  3 rows of 4 dots that builds up as she taps "Siguiente".
- Speak each fact in Spanish ("tres por cuatro, doce").
- End with the whole table on screen and a "Practicar" button.

Practicar:
- Ten questions from the selected tables, chosen with `Kit.deck`. Fact ids look like "3x4",
  where the first number is the table.
- Answer with the on-screen number pad. Physical keys also work.
- On a miss, show the dot grid for that fact and the answer.

Storage: the deck only. Mastery on the start screen is derived from it.
Extra checks: every one of the 100 facts can appear; the dot grid always has rows × columns dots.
Set `ready: true` for `tablas` in `kids/games.js`.
```

### Prompt 3: ¿Qué hora es? (el reloj)

```text
You are working in the repo `my-projects`. Read `kids/PRD.md` sections 1 and 2, and the source of
`kids/shared/kit.js`, before writing code. Follow the shared rules exactly.

Build `kids/reloj/index.html`: reading and setting an analogue clock, in Spanish.

Clock: an SVG drawn in code with the numbers 1 to 12, minute ticks, a short hour hand and a long
minute hand in different colours. The hour hand moves in proportion to the minutes: at 3:30 it sits
halfway between 3 and 4.

Levels:
1. En punto.
2. Y media.
3. Y cuarto and menos cuarto.
4. Five-minute steps (y cinco, y diez, y veinte, y veinticinco, menos veinticinco, menos veinte,
   menos diez, menos cinco).
5. Match the analogue clock with a digital time such as 3:45.

Two question types, mixed in every round:
- Leer: the clock shows a time and she picks the right sentence out of four.
- Poner: a sentence such as "Pon las cuatro menos cuarto" and she sets the clock. Two pairs of
  large buttons move the time by 5 minutes and by 1 hour, forwards and backwards. Dragging the minute
  hand also works. She confirms with "Comprobar".

Spanish time phrases must be exactly right:
- "Es la una …" for one o'clock, "Son las …" for every other hour.
- Up to and including 30 minutes: "y cinco", "y cuarto", "y media". "En punto" for :00.
- After 30 minutes, use the next hour with "menos": 2:45 is "Son las tres menos cuarto",
  12:45 is "Es la una menos cuarto".
- Write hours as words, 1 to 12.
Wrong options in "Leer" must be plausible: same hour with other minutes, or the common mistake of
swapping the two hands.

Storage: unlocked levels and best stars per level. A level unlocks at 2 stars on the previous one.
Extra checks: a unit test of the time-to-sentence function for all 144 five-minute times; hand
angles for 3:00, 3:30 and 9:45.
Set `ready: true` for `reloj` in `kids/games.js`.
```

### Prompt 4: La tienda (monedas y billetes)

```text
You are working in the repo `my-projects`. Read `kids/PRD.md` sections 1 and 2, and the source of
`kids/shared/kit.js`, before writing code. Follow the shared rules exactly.

Build `kids/la-tienda/index.html`: paying with euro coins and notes in a small shop.

Money pieces, drawn with CSS, sized and coloured like the real ones: 1, 2 and 5 céntimos (copper),
10, 20 and 50 céntimos (gold), 1 € and 2 € (two-tone), and the 5 € and 10 € notes.
Do all arithmetic in whole céntimos. Show prices the Spanish way: "1,35 €" and "45 cts".

Each item: a product emoji with a price. She taps pieces in her purse to move them to the counter,
and taps a piece on the counter to take it back. "Pagar" checks the total.
Any combination that adds up to the target is correct.

Levels:
1. Prices up to 50 céntimos, coins up to 50 céntimos. The running total is shown.
2. Prices up to 2 €, all coins. The running total is shown.
3. Prices up to 10 €, coins and notes. The total is hidden until she presses "Pagar".
4. Giving change: the customer pays with a 2 €, 5 € or 10 € piece and she builds the change.
   The total is hidden until she presses "Pagar".

On a miss, show her total, the target, and whether she gave too much or too little, then show one
correct combination using the fewest pieces.
The purse always has enough of every piece allowed in the level.

Content: at least 30 products with emoji and realistic prices for a child (fruit, bread, sweets,
stickers, a notebook, a toy).
Storage: unlocked levels and best stars per level. A level unlocks at 2 stars on the previous one.
Extra checks: totals are exact for 1,000 random combinations (no floating point drift); the
fewest-pieces solution is correct for every amount from 1 to 1,000 céntimos; price formatting.
Set `ready: true` for `la-tienda` in `kids/games.js`.
```

### Prompt 5: Detective de letras (ortografía)

```text
You are working in the repo `my-projects`. Read `kids/PRD.md` sections 1 and 2, and the source of
`kids/shared/kit.js`, before writing code. Follow the shared rules exactly.

Build `kids/detective-letras/index.html`: Spanish spelling for 2º de Primaria.

Each item shows a word with a gap, for example "ca_allo", an emoji when one fits, and two or three
large buttons with the candidate letters. After she answers, show the complete word, read it aloud
in Spanish, and show the rule in one short child-friendly sentence.

Rule families. The start screen lists them, plus "Mezcla" which mixes all of them:
1. c / qu (casa, queso)
2. c / z (cielo, zapato)
3. g / gu / gü (gato, guitarra, pingüino)
4. g / j before e and i (gente, jirafa)
5. r / rr (ratón, perro)
6. m before p and b (campo, bombero)
7. b / v in common words
8. Words with h and without h (huevo, hielo, ola)
9. ll / y (lluvia, yogur)
10. Capital letters: names of people and places, and the first word of a sentence. Here the item
    is a short sentence and she picks the correctly written version out of two.

Content: at least 20 items per family, all everyday words a 7-year-old knows. Every word must be
spelled as in the RAE dictionary. Check each one twice and leave out any word you are not certain
of. Avoid words where both candidate letters give a real word.
Selection uses `Kit.deck` with one id per item.

Storage: the deck. The start screen shows mastery per family.
Extra checks: a test that every item has exactly one gap, that the correct letter is among its
candidates, and that the completed word equals the stored full word.
Set `ready: true` for `detective-letras` in `kids/games.js`.
```

### Prompt 6: Minicuentos (comprensión lectora)

```text
You are working in the repo `my-projects`. Read `kids/PRD.md` sections 1 and 2, and the source of
`kids/shared/kit.js`, before writing code. Follow the shared rules exactly.

Build `kids/mini-cuentos/index.html`: reading comprehension with very short original stories in
Spanish.

A round is one story and its five questions (this replaces the 10-item round). Stars: 3 for five
right at the first try, 2 for four, otherwise 1.

Flow:
1. The story appears in large type with a row of three or four emoji as its illustration.
   She reads it herself. An "Escuchar" button reads it aloud sentence by sentence and highlights the
   sentence being read.
2. "Ya lo he leído" starts the questions, one at a time, with three options each.
3. A "Volver a leer" button is always available during the questions. Using it costs nothing.
4. On a miss, highlight the sentence in the story that holds the answer.

Content: 24 original stories in three lengths, eight of each: 30 to 40 words, 50 to 60 words and
70 to 90 words. Simple vocabulary, short sentences, present or simple past tense.
Varied themes: animals, school, family, nature, space, sport, food. Kind and calm in tone. No brands,
no existing characters, nothing frightening.
Each story has exactly five questions, one of each kind:
- Literal: who, what or where.
- Order: what happened first, or what happened next.
- Reason: why something happened.
- Feeling: how a character felt.
- Vocabulary: what a word from the story means.
Every answer must be supported by the text. Wrong options must be clearly wrong on a careful read.

Start screen: three length levels. Stories she has not read come first. Show how many are done.
Storage: stories read and best stars per story.
Extra checks: a test of word counts per length band, five questions per story, one of each kind,
and three options with exactly one marked correct.
Set `ready: true` for `mini-cuentos` in `kids/games.js`.
```

### Prompt 7: Robot explorador (lógica y programación)

```text
You are working in the repo `my-projects`. Read `kids/PRD.md` sections 1 and 2, and the source of
`kids/shared/kit.js`, before writing code. Follow the shared rules exactly.

Build `kids/robot/index.html`: a first programming game. She writes a list of commands that takes
a robot to a star on a grid.

This game uses levels instead of 10-item rounds.

Board: a grid from 5×5 to 7×7 with the robot 🤖, a star ⭐, walls and, in later levels, gems 💎.
Commands: four arrows (arriba, abajo, izquierda, derecha), each moving one square. From level 11
there is also a "Repetir" block that holds commands and a count from 2 to 5.
She taps a command to add it to the program, taps a command in the program to remove it, and has
a "Borrar todo" button. No drag is needed.
"Probar" runs the program one step at a time, about 400 ms per step, highlighting the current
command. Hitting a wall or the edge stops the run with a small bump, and the square where it
stopped stays marked so she can fix her program. Reaching the star, with every gem collected,
wins.

Levels: 20, designed by hand, in four groups of five.
- 1 to 5: straight lines and one turn.
- 6 to 10: several turns around walls.
- 11 to 15: "Repetir" is introduced and a command limit makes it necessary.
- 16 to 20: gems to collect, with "Repetir".
Each level stores its shortest solution length as `par`. Stars: 3 for a program no longer than
par, 2 for par plus two, otherwise 1. A "Repetir" block counts as one command plus its contents.

Start screen: a map of the 20 levels with stars earned. A level unlocks when the previous one is
solved. On the win screen offer "Siguiente nivel" and "Otra vez".
Storage: stars per level.
Extra checks: write a breadth-first solver in the test and assert that every level is solvable and
that `par` equals the true shortest program for levels 1 to 10. For levels 11 to 20, assert that a
stored reference program solves the level within the command limit.
Set `ready: true` for `robot` in `kids/games.js`.
```

### Prompt 8: Spelling Bee (inglés: deletrear)

```text
You are working in the repo `my-projects`. Read `kids/PRD.md` sections 1 and 2, and the source of
`kids/shared/kit.js`, before writing code. Follow the shared rules exactly.

Build `kids/spelling-bee/index.html`: English spelling for a Spanish 7-year-old who is a beginner
in English. Instructions are in Spanish. Words are in British English.

A round is 8 words (this replaces the 10-item round).

Each word shows its emoji and its Spanish meaning in small text, and is spoken in English when it
appears. Two buttons replay it: 🔊 at normal speed and 🐢 slowly (rate 0.6).

Three levels, by how she writes the word:
1. Letter tiles: exactly the letters of the word, shuffled. Words of 3 and 4 letters.
2. Letter tiles: the letters of the word plus three extra letters. Words of 4 and 5 letters.
3. A full on-screen QWERTY keyboard with no hints. Longer and trickier words.
In every level a physical keyboard also works, with Backspace to delete and Enter to check.

Checking uses "look, cover, write, check":
- Right: turn the tiles green, say the word, then spell it aloud letter by letter in English.
- Wrong: mark each letter right or wrong in place. Show the correct spelling for three seconds,
  hide it, and ask her to write the word again. The second attempt does not count for the score.

Content: at least 120 words, about 40 per level, each with an emoji and a Spanish translation.
- Level 1: short regular words (cat, dog, sun, hat, bed, pig, red, bus, pen, box).
- Level 2: common words with ch, sh, ck, oo, ee (fish, ship, duck, book, moon, tree, frog, star,
  milk, blue).
- Level 3: school vocabulary and common tricky words (school, friend, house, water, apple, yellow,
  purple, monkey, mother, sister, the days of the week, numbers one to twenty).
Use British spelling. Leave out any word without a clear emoji or with two common spellings.
Selection uses `Kit.deck` with one id per word.

If `Kit.canSpeak('en')` is false: show the Spanish word in large type as the prompt, hide the
replay buttons, and show a one-line note for parents saying the device has no English voice.

Storage: the deck and best stars per level. Show mastered words per level on the start screen.
Extra checks: every word is lowercase letters only (days of the week keep their capital and the
check ignores case); level-1 tiles are an exact anagram of the word; level-2 extras never allow a
second valid word from the list; the wrong-answer flow shows, hides and re-asks.
Set `ready: true` for `spelling-bee` in `kids/games.js`.
```

### Prompt 9: Word Safari (inglés: vocabulario y escucha)

```text
You are working in the repo `my-projects`. Read `kids/PRD.md` sections 1 and 2, and the source of
`kids/shared/kit.js`, before writing code. Follow the shared rules exactly.

Build `kids/word-safari/index.html`: English vocabulary and listening for a Spanish 7-year-old
beginner. Instructions are in Spanish. Words are in British English.

Themes, 12 words each: colours, numbers 1 to 12, animals, food, family, body, clothes, school,
house, weather, actions (run, jump, swim) and toys. Each word has an emoji and a Spanish
translation. Colours are shown as a painted swatch and numbers as a large numeral, since emoji do
not show them well.

Start screen: the themes as cards with their mastery. Each theme offers "Aprender" and "Jugar".

Aprender: flashcards for the theme, one at a time. Picture, English word, Spanish word, and the
English audio on appearing and on tap. Arrows to move forwards and back.

Jugar: ten items from the theme, chosen with `Kit.deck`. The kind of question depends on the
word's deck box:
- Box 1, escuchar: the word is spoken and she taps the right picture out of four.
- Box 2, leer: a picture is shown and she taps the right written English word out of four.
- Box 3, traducir: the Spanish word is shown and she taps the English word out of four.
After every answer, say the English word and show picture, English and Spanish together.
Wrong options come from the same theme.

If `Kit.canSpeak('en')` is false: replace "escuchar" questions with "leer" questions and show a
one-line note for parents saying the device has no English voice.

Storage: the deck. Theme mastery on the start screen is derived from it.
Extra checks: every theme has 12 words with no duplicates across themes; the four options are
always different and include the right one; question kind follows the deck box.
Set `ready: true` for `word-safari` in `kids/games.js`.
```

### Prompt 10: Sentence Train (inglés: construir frases)

```text
You are working in the repo `my-projects`. Read `kids/PRD.md` sections 1 and 2, and the source of
`kids/shared/kit.js`, before writing code. Follow the shared rules exactly.

Build `kids/sentence-train/index.html`: building simple English sentences from word tiles, for a
Spanish 7-year-old beginner. Instructions are in Spanish. Sentences are in British English.

A round is 8 sentences (this replaces the 10-item round).

Each item shows an emoji scene and the Spanish translation, and the English sentence is spoken.
A 🔊 button replays it. The words are shuffled tiles drawn as train wagons. She taps a tile to add
it to the train and taps a wagon to send it back. "Comprobar" checks the order.

Levels, by sentence pattern, with at least 12 sentences each:
1. "It is" and "I am" with a noun or adjective (It is a red ball. I am happy.)
2. "I like" and "I don't like" with food and animals.
3. "have got" and "has got" (I have got a dog. She has got a blue bike.)
4. "can" and "can't" (The bird can fly. I can't swim.)
5. Places with in, on and under (The cat is on the table.)
6. Questions (What is your name? How old are you? Do you like apples?)
7. Actions happening now (She is reading. They are playing football.)

Hints: in levels 1 to 3 the first word keeps its capital letter and the last tile carries the full
stop. From level 4 the tiles are lowercase with no punctuation, except "I" and names.
From level 5 add one extra tile that does not belong in the sentence.

Only the target order is correct, so every sentence must have a single natural word order. Leave
out any sentence where two orders are valid.
Wrong: wagons in the wrong place shake and stay. After two failed checks, show the correct
sentence, say it, and bring the item back once later.
Right: say the sentence and show the English and the Spanish together.

If `Kit.canSpeak('en')` is false the game is still playable from the Spanish translation. Hide
the replay button and show a one-line note for parents saying the device has no English voice.

Storage: unlocked levels, best stars per level, and a deck with one id per sentence. A level
unlocks at 2 stars on the previous one.
Extra checks: every sentence splits into 3 to 7 tiles; no sentence has two identical tiles unless
the check treats them as interchangeable; the extra tile never makes a second valid sentence;
both hint modes render correctly.
Set `ready: true` for `sentence-train` in `kids/games.js`.
```

## 5. Assumptions and later ideas

Assumptions made in this plan. Change them here before running the prompts if they are wrong.
- School level is 2º de Primaria.
- English is at beginner level, and British English is the target.
- She plays mostly on a tablet or phone.

Left for later:
- A parents' page with progress per game.
- A map game of Spain's comunidades autónomas. It needs an accurate SVG map, which should come from a real source and not be drawn by a model.
- Installing the hub on the tablet home screen and playing offline.
