## [Unreleased]<!-- Cache: robco-terminal-v2.8.5-r56 -->

### Added

- A single "spine" file at the project root that holds, once, the facts every agent instruction file used to repeat: which folder is which repository on GitHub, whether each is public or private (measured, with the date), the handful of principles everything else follows from, and where the planning, memory and reference files actually live. A survey on September 3rd found that map written in six places, disagreeing about which sites were public. From now on the instruction files point at the spine instead of restating it, so there is one place to correct and nothing left to drift. The owner ruled the shape on August 14th and the placement, one spine per project inside its own repository, on September 3rd; Mist got its own the same day.
- A hand-written, tracked instruction file for the Codex coding helper, replacing a machine-made word-swap copy of the Claude rulebook that had sat untracked since August 11th and described a backup reminder that no longer works that way. The new file is short and points: at the spine for the shared facts, at the rulebook's own retrieval map for everything else, plus the handful of rules that bind a Codex worker here. Nothing internal is in it, and it is now versioned and reviewed like the rest.

### Fixed

- The developer's private reports page said "newest first" and was not: it sorted the file names alphabetically backwards, so a report from August 24th sat at the top while the September 1st one was sixth. It now orders by the date written into each report's name, newest at the top, and a report with no date in its name takes its place by when the file was last written. A test now holds the order.
- Two places said the local development server does not survive a reboot or the machine sleeping. Neither has been true for a while: a logon trigger brings it back after a reboot, and this machine's sleep keeps the process running and only drops the network. Both descriptions now say what actually ends it (hibernation, or stopping it by hand) and what merely breaks the address while it lives.
- The private queue page's "need you" number was counting the wrong thing. It printed how many items on the board carried a warning flag in their heading, under a label that promised the number of decisions waiting on the owner. Measured on the live board: sixteen flagged items, two of which were decisions, while the project's own decision census listed twenty-nine — wrong in both directions at once. The tile now runs that census (the one the board already keeps, with a stated rule) and prints its fraction, names the rule, shows the date the declared list was last edited so the number visibly ages, lists every counted decision with the evidence for it, and flags any decision-shaped item the census has not yet ruled on. The flag count is still shown, under its honest name. When the census cannot be run the tile says so instead of showing a zero.
- Written down, in the one place someone would look for it, that asking the development server for `/index.html` sends you into the terminal app rather than the landing page. That is the web tooling's own behaviour, not a rule of ours, and it is harmless; it just was not documented.
- The developer tools were missing from the phone-testable development site. The terminal's built-in developer panel — the one holding every test trigger, inspector and reset — decides whether to appear by asking "am I on a development build?", and the only ways it could answer yes were a marker stamped into the private staging build, or the address being one of three names on a list. That list was written before the phone-testable address existed, so on the machine itself the panel appeared and over the phone address it did not — from the same server, on the same branch, sending byte-for-byte identical pages. Nothing was stale and nothing had been stripped; the panel had simply never been visible there. The development server now stamps the same marker the staging build already uses, so the question becomes "was this page sent by a development server?" rather than "is this address on a list" — which is both the thing actually being asked and, unlike a list of trusted names, one that covers every future address on its own. Measured after the fix: all 186 tools now present over the phone address, identical to the machine. The public site is untouched and cannot inherit this — the marker exists only in what a running development server sends, never in the project's own files, and a test now fails if anyone ever writes it into them.
- Your installed development app stopped being the app. On 3 September the terminal moved off the top level of the development address so that address could become an index page — and an installed app is permanently tied to the address it was installed from. So the icon on your home screen kept opening the address it was told to, which is now the index, and the clean-up worker that shipped in the same change cleared the cache it had been using. Nothing announced this, and it does not look broken: it looks like an app that opens to the wrong page. The app itself was never damaged and is installable exactly as before at its new address, which was confirmed against the browser's own installation checks — but nothing can move an existing installation from the outside, so it has to be installed again from the new address. The index page now explains this, and only to someone who arrives there from an installed icon; anyone opening it in a normal browser tab sees nothing new.
- The development app and the published app were impossible to tell apart once both were installed. They are separate addresses, so they install separately with their own storage — which is what you want — but they were reading the same identity file, so both arrived on the home screen with the same name and the same green icon. Opening the wrong one and not realising is the whole problem: every conclusion you draw afterwards is about the wrong copy. The development one is now called "RobCo DEV" and has an amber icon. The published app is untouched and its identity file is unchanged, so nothing about the real app changes for anyone; the difference exists only in what the development server hands out.
- The automated check on the developer worktree tools had failed on this project's own Windows continuous-integration machine, and only there, on every single run since it was added — while the identical check passed on Linux and on the developer's own Windows PC. The suspected cause was a clock quirk on a freshly-started cloud machine; it was not, and that was measured rather than argued. Those tools answer "is another session already working in this folder?" partly by comparing the folder path a session wrote down against the folder path the version-control tool reports, and the two were being compared as plain text. On that particular machine the same folder is spelled two different ways — a short DOS-era abbreviation on one side, the full name on the other — so letter by letter they read as two different folders, every session in the folder was filtered out, and the tool confidently answered "nobody else is working here". That is the one answer it must never get wrong, because its entire purpose is to stop one piece of work trampling another's. Paths are now resolved to their true form before being compared, so a folder reached by a shortcut, a link, or an abbreviated name is recognised as the same folder. A new test, which fails without the fix, now holds it. No effect on anything you see or do in the app.

### Under the Hood

- Tightened the terminal's own internal documentation self-check so it catches a class of stale reference it used to miss. The automated check that keeps the developer docs honest now verifies every code file a rule note or architecture page names — whether it's spelled out as a full folder path or just a bare filename — against the files that actually exist, and it cross-checks the map that says "which rule note covers which part of the code" against each note's own "read me when you touch this" header so the two can never quietly disagree. Turning it on immediately shook out one genuinely stale reference — a stylesheet that had been broken up into several smaller files but was still written about as if it were a single file — which was corrected in the same change. No effect on anything you see or do in the app.
- Made the pre-save safety checks safe to run when two pieces of work are happening in the same project folder at once. The automated code-quality check that runs before every save used to re-scan _every_ file sitting in the folder — including throwaway scratch files a completely separate task might be part-way through — so one task's unfinished file could make an unrelated task's save fail for no real reason. It now looks only at the files actually going into the commit, which is both the correct thing to check and immune to whatever else is lying around. The matching end-of-task tidy-up was hardened the same way: it now only removes files it created itself and simply reports anything else it finds, so it can never delete another live task's work. No effect on anything you see or do in the app.
- Added a "release receipt" check that confirms the LIVE site is actually serving the version that was just published — closing a real gap where an update could quietly fail to reach you. Every existing check answers "is the code correct?"; none answered "did the update actually go out?", and those two have disagreed before — once a background updater silently failed to install and people sat on an old copy while everything looked fine. The new check fetches the live site after a release and compares its version and cache stamp against what was published; if they don't match, it says so loudly instead of pretending all is well. It also spells out the few things only a real device can confirm — that an installed app actually upgraded, that a saved campaign survived it, and that sign-in still works — and leaves those to a human rather than faking a thumbs-up. It runs on demand after a deploy, so it changes nothing in normal use.
- Added an on-demand, real-database version of the cloud-save safety check the terminal already runs before every save. The existing check models the cloud database's write rules in code; this new one spins up a local, offline copy of the real cloud database and pushes a real campaign through the true save → sync → load path, then confirms every field survived intact. It proved itself in both directions — a deliberately broken save is correctly rejected, and a clean one comes back identical — and in the process it caught one place where the modeled check had the real database's behavior slightly wrong (a missing value is rejected outright rather than quietly dropped, which is actually the safer outcome), corrected in the same pass. It needs one-time extra developer setup, so it isn't part of the automatic pre-save checks — those are unaffected and keep running on every save exactly as before. No effect on anything you see or do in the app.
- The developer-facing test catalog is now generated automatically instead of hand-typed. It's produced fresh from the test suite's own build notes every time, and the pre-save safety checks now confirm it's actually up to date before letting a change through, so it can no longer quietly drift out of sync the way it twice had before. No effect on anything you see or do in the app.
- Closed two more gaps in the same documentation self-check: the project's roadmap file and its shipped-work archive can no longer link to each other with a broken reference, and the roadmap's own item labels are checked to make sure none of them accidentally repeats a label already in use. Also added a check that catches the app's cache-version marker and its published release notes ever quietly falling out of step with each other. No effect on anything you see or do in the app.
- Fixed a couple of small inconsistencies found while extending those checks: the project readme stated two different device-capability counts in two different places (the correct count is nine, not eight), and one piece of internal developer reference material still described a tool as "not yet built" that had since shipped. No effect on anything you see or do in the app.
- The project's architecture reference document now generates its own table of contents directly from the document's real section headings, instead of a hand-typed list — closing the exact kind of drift that let an earlier version of that same list quietly fall twenty sections behind reality before anyone noticed. The pre-save safety checks now confirm the list is current every time. No effect on anything you see or do in the app.
- Cleaned up a batch of stale test-count numbers left over in the architecture reference document from a bookkeeping habit retired everywhere else in the project earlier this year — the descriptive notes stay, just without the numbers that used to need constant hand-updating. No effect on anything you see or do in the app.
- Extended the terminal's own documentation self-check to catch four more small ways its internal reference docs could quietly go stale: a new source file shipping without ever being mentioned in the architecture map, a changelog entry's categories landing in the wrong order, the readme's stylesheet-file count drifting from the real count, and the readme's stated version number falling out of step with the published release notes. Building the first of these immediately turned up a real gap — about a dozen small helper scripts and test files that had never been added to the architecture map — which is now corrected in the same pass. Also removed a third, redundant copy of the script-loading-order list from the readme, since the terminal already keeps one authoritative copy that's checked automatically; the readme now points at that copy instead of risking a second one quietly drifting out of sync. No effect on anything you see or do in the app.
- Sped up the pre-publish safety checks for changes that only touch documentation. The full set of checks that runs before anything is published includes several that launch a real browser to confirm the app still boots, renders, and works offline — they take a few minutes and exist to protect the app itself, so they give a planning-note or changelog edit no real protection. The checks now look at exactly what a push changes: if every changed file is documentation, the slow browser checks are skipped and the quick ones (code style, the full test suite, the internal doc self-checks) still run; if a push touches even one piece of app code — or a renamed, moved, or deleted one, or if there's any doubt at all about what changed — the complete set runs exactly as before. It's deliberately cautious: it only ever takes the fast path when it can positively prove the change is documentation, and it defaults to the full checks otherwise. This removes the main reason someone was tempted to skip the checks by hand on a docs-only update. No effect on anything you see or do in the app.
- Started routing this project's own pushes through the behind-the-scenes workflow "control plane," so a push now leaves a verified receipt behind and advances a counter toward a future safety feature. Until now every push went straight to the server and bypassed that machinery entirely, which meant the counter that will one day unlock an automatic "was this push actually completed properly?" guard could never start moving. A new developer command routes a push through a wrapper that takes a short lock so two pushes can't collide, records what it's about to do _before_ it pushes, independently re-checks with the server afterward that the exact change actually arrived, files a receipt, and reports how many clean pushes have accumulated so far. It deliberately cooperates with the recently-added documentation-only fast path: it hands the actual pre-publish checks to this project's existing pre-push checks rather than running them a second time, so a docs-only push still skips the slow browser checks exactly as before instead of being forced through the full set twice. This only _adds_ a new way to push — a plain push still works unchanged, and nothing is blocked or refused. No effect on anything you see or do in the app.
- Turned on the push-safety guard that the receipt-counter above was building toward. Now that ten real pushes have gone cleanly through the new wrapper, a plain "raw" push that skips the wrapper is refused, with a message pointing to the correct command — so a push can't accidentally bypass the lock-and-verify machinery that keeps two pieces of work from colliding on the server. It's wired so it can never lock the developer out of their own project: it only ever engages on the machine that actually has the private workflow tooling (a plain public copy is untouched), and there are two documented emergency ways to push anyway if the tooling itself ever breaks — one that's fully recorded in the workflow log, and an absolute last resort built into the version-control tool itself. In the same session the second half landed too: the private tooling's own separate repository now runs its full test suite through that same wrapper before every push and refuses the push if the tests fail — so a push to that repo is now both forced down the safe path _and_ actually checked, not just routed. No effect on anything you see or do in the app.
- Strengthened the internal messaging system the terminal's own parts use to tell each other something happened — levelling up, a save being written, health dropping critical, and about twenty more. It could only ever add a listener; there was no way to remove one, no way to say "tell me the next time this happens and then forget me", and no protection against the same listener being added twice and reacting twice to a single event. All three now exist. The biggest change is to how a misbehaving listener is handled: one that crashed was already prevented from taking the others down with it, but it was silenced completely, so a broken reaction would just quietly stop working with nothing to show for it. A crash is now reported, naming which event and which listener, while the remaining listeners still run exactly as before. Building that turned up a real trap worth recording — the obvious way to write that report would itself crash in the terminal's own test environment, which has nowhere to write to, turning the one thing that must never fail into the one thing that always fails; the reporting is written so it can never do that, and a test now locks it that way. The messaging system also now takes a safe snapshot before delivering an event, so a listener that adds or removes another listener mid-delivery can't cause one to be skipped or fired twice. This is groundwork laid ahead of the next round of features, which will lean on this system much more heavily — nothing you see or do in the app behaves differently today.
- Settled a naming clash between this project's two codebases before it could become one. The terminal itself and the behind-the-scenes workflow tooling are separate programs that share a project name, and both had come to use the word "events" for something — in the terminal it's the internal messages its own parts send each other; in the workflow tooling it's the permanent written record of what happened, kept on disk. Nothing was actually broken: neither side had ever borrowed the other's word. But "events" already meant two different things depending on which program you were reading, and the cheapest moment to fix that is before either side builds on the confusion. There is now a single short list saying which vocabulary belongs to which program — and, just as importantly, which words they're both allowed to keep using, because several of them overlap perfectly innocently and always have. Each program's own pre-save checks read that list and check only its own code, so neither depends on the other being installed. Both checks are written to prove they actually work rather than just always passing: each one is run against a deliberately-wrong sample and must catch it, and each is run against the shared words and must let them through — so the day someone over-reserves a common word and accidentally outlaws a feature that's been shipping for months, the checks go red instead of quietly banning it. Nothing was renamed; the existing names are what's being protected. No effect on anything you see or do in the app.

- Made the terminal tell you which part failed when it fails to start, instead of coming up blank. Starting the terminal runs through about fifty separate steps — restoring your campaign, painting the screens, wiring up the sound, restoring your preferences, and so on. Until now all fifty sat inside a single safety net: if any one of them hit a problem, every step after it was silently abandoned, and the only record was a note in a developer console you would never see. That is the mechanism behind the worst kind of report — the screen comes up blank or half-built and there is no way to tell what went wrong. Each step now stands on its own. A step that fails but is not essential — a sound channel, a suggestion list, a saved preference — no longer stops the ones after it; the terminal carries on without it and says so plainly in the transcript, naming the part that did not start, and the fault is filed in the same place the FAULT lamp and the service console already read from. A step that genuinely cannot be worked around — restoring your campaign, drawing the screens, or opening the screen you were last on — now stops with a full-screen failure notice that names the part that failed, shows the fault, lists anything else that was already degraded, and offers a RETRY BOOT button, instead of a black screen with no explanation. That notice is built to survive the very failure it is reporting: it uses no stylesheet, no saved settings, and nothing the failed step could have been responsible for. Only those three steps are treated as unrecoverable, and each was chosen from what the code actually does rather than how important it sounds. Nothing about the normal startup changed — the same steps run in the same order, and a healthy start is completely silent as always.

- Corrected three places where the terminal's own documentation described things more confidently than the code actually delivers. An outside review read all five of this project's codebases from scratch and checked every claim against what is really there; most held up, and these did not. The readme said your AI key was "stored locally, never exposed", which was reassuring and not quite honest — the key does live on your device and is never published anywhere, but it is of course sent to Google every time you ask the AI for something, and it can also be synced to your own private cloud record if you switch that on. That entry now says all four of those things plainly, because "never exposed" is the kind of phrase someone might reasonably lean on when deciding whether to paste in a key. A developer rule claimed a broken online feature gets switched off "immediately and automatically" after a bad release; in reality the switch is genuinely instant and needs no update to be pushed out — but a person has to go and flip it, and nothing automated exists to do that. The rule now says so, and keeps the promise it can actually keep. And a planning document still described a set of decisions as "pending" that had in fact been decided the day before. Nothing about the app changed — this is the documentation being brought back in line with the code, which this project treats as the same class of fix as any other.
- Fixed the private roadmap reader so it stops printing raw formatting marks in the middle of sentences. The developer-only tool that turns the build queue into a phone-readable page had a naive rule for bold text: it accepted a bold passage only if there was no asterisk anywhere inside it. That sounds harmless until you notice the roadmap is written in exactly the style that breaks it — a bold sentence with one emphasised word inside it, or a bold heading with a bolded phrase nested in it. Those passages did not just fail to go bold; the stranded marks then paired up with the _next_ bold passage further down, so the bolding came out inverted from that point on and stray asterisks appeared in the text. It affected 85 of the page's 407 blocks. The tool now pairs the marks the way a real markdown reader does — each closing mark matches the nearest unclosed opening one — which handles emphasis inside bold and bold inside bold alike, while keeping two separate bold phrases in a sentence properly separate. It also understands single-asterisk emphasis, which it previously ignored, and if the roadmap itself is missing a closing mark (it is missing two) the page simply ends the bold at the end of that paragraph rather than showing the marks. This tool is not part of the app and nothing you see or use is affected.
- Fixed the private roadmap reader silently hiding items from its own board. The developer-only tool that turns the build queue into a phone-readable page recognises each piece of work by the short label at the head of its heading, but the rule it used to spot those labels could not express a label that ends in a letter after its number — a shape the queue started using when one piece of work was split into two halves. Those items did not fail loudly; they were simply not recognised as items at all and disappeared from the board with no warning and no mention, so the page quietly showed two fewer than the queue actually held. The rule now understands that shape. More importantly, it is now written down in exactly one place and shared by everything that needs it, instead of being re-typed by each piece of code separately — which is how two copies of it had drifted apart in the first place. A new check counts the items the tool finds and compares that against a direct count of the source document, and fails if the two ever disagree again, so an entire class of item can no longer vanish unnoticed. The same page also learned three status markers the queue had begun using — deferred, parked, and open-question — which previously matched nothing at all; around twenty items carrying them could not be filtered and were stuck permanently on screen. The page's status colours and filters are now generated from that one list of statuses rather than spelled out by hand for each, so the next marker the queue invents takes one edit instead of four. No effect on anything you see or do in the app.
- The project's private build queue now holds only work that is still open. When something finishes, its full write-up moves word-for-word into the companion archive file and leaves a one-line pointer behind, so the queue stops growing without limit and stays quick to read on a phone. That was already the written rule, and it had quietly slipped three times — eight finished items were still carrying their entire write-ups in the queue, adding hundreds of lines nobody needed to scroll past. All eight have now been moved and each one was checked afterwards, character by character, against the version in source control to prove nothing was altered in transit. From here the rule is enforced automatically rather than remembered: by a check in the pre-save safety checks, and — for the first time ever — by a check inside the private archive itself, which is where that file actually lives, so the rule is now enforced in the same place as the thing it governs. Two checks that had been written around specific items in the queue were also rebuilt to stop naming them, since a finished item moving out is normal and should never make the safety checks fail. No effect on anything you see or do in the app.
- Fixed the safety check that watches over the private roadmap board, which could pass in two situations where it should have raised a flag. The board is a phone-readable summary generated from the build queue, and it is built to refuse rather than guess: if it cannot fully trust what it read, it publishes a page that says so instead of a partial list that would look perfectly healthy. Because that refusal is deliberately silent everywhere else, this one check is the only thing that ever turns it into a visible warning — which makes a wrongly-clean result here unusually costly, since it does not hide one problem, it hides the whole design. It was passing when the board was missing entirely, reporting that there was nothing to verify, so deleting the file was a way to make its own check come up clean. It was also passing when the board was out of date: the page records a fingerprint of the queue it was built from, and nothing ever compared that against the queue as it currently stands, so a summary built from a version weeks old read exactly like a current one. Both now raise a flag, along with a page that has been hand-edited past recognition. Care was taken not to overcorrect: a copy of the project that legitimately has no build queue at all still passes quietly as before, and the stamp recording which version of the app produced the board is treated as a note rather than as evidence of freshness, so ordinary day-to-day work can never trip it. Each of the two original faults was reproduced first — proven to raise a flag only after the fix, not merely assumed to. No effect on anything you see or do in the app.
- Made the private roadmap board readable again by stopping it printing out the entire backlog. The board is a phone-readable summary generated from the build queue, and the design always said the backlog should appear as a single number — everything not yet started, counted rather than listed. The generator listed all 148 of them instead, which was about sixty per cent of the page, so the summary had quietly turned back into the very thing it was built to replace: a long document nobody scrolls to the end of. The backlog is now one line giving the count and pointing back at the queue for the detail, which took the board from 247 lines down to 100. The sections that matter day to day — what is in progress, what is ready to start, what needs attention, what is waiting or paused — are all still listed in full, because naming those items is the entire point of them. Two things were deliberately protected. Anything the board could not confidently sort into a section is still listed one by one and never shortened, since something it failed to recognise is exactly what most needs looking at; a safety check now insists on both rules together, so nobody can later apply the shortening idea to the wrong section. And counting rather than listing does not weaken the board's ability to notice a missing item — that has always been checked by comparing totals against the queue itself, which is untouched. No effect on anything you see or do in the app.

- Fixed the private roadmap reader mis-reading bold that starts in the middle of a word, and re-pointed a queue self-check that had been asserting the wrong thing. The developer-only tool that turns the build queue into a phone-readable page decides where bold starts and stops using a shortened version of the standard markdown rule. The short version gets one case wrong: a phrase like "known-**unelevated**", where the bold opens straight after a hyphen rather than after a space. It read that opening mark as a closing one, which ended the surrounding bold early, threw the rest of the paragraph's bolding out of step, and left a stray pair of asterisks on the page. The tool now uses the full rule, punctuation clause and all. Two passages were affected, and only one of them was visible — the other had been quietly rendering its bold inverted with no stray marks to give it away, which is why the check that only looks for stray marks never caught it; the new tests check the shape of the result, not just the absence of a symptom. Separately, a structural check on the queue was pinned to two specific work items still being listed as open. Both have since shipped, and the project's own rules require a finished item's write-up to move out of the queue into the archive log — so the check was, in effect, demanding the opposite of the rule it sits next to. It now verifies the thing it was really there to protect (that no item is ever silently lost when the queue is read) across both the queue and the archive log, so an item moving between them stays covered instead of falling out of the net. Neither change affects anything you see or do in the app.
- Taught the private roadmap reader what a block of example code is, after one turned up in the queue and quietly wrecked the entry around it. The developer-only tool that turns the build queue into a phone-readable page had no notion of a fenced-off code block. When the first one appeared, the three marks that open it were mistaken for an ordinary inline code snippet: two were used up and the third left dangling, which put every code snippet after it one mark out of step. Whole runs of writing were swallowed into what the page believed was code, bold stopped working, and eventually a stray pair of asterisks fell out onto the page in plain sight. The reader now recognises a code block as a code block, sets it out on its own in a panel that scrolls sideways on a phone rather than squashing long lines, and never lets what is inside it affect the writing around it. While proving that fix, the cause underneath turned out to be wider than the one symptom: the tool only knew how to pair up code marks in runs of exactly one or two, so any other length went wrong. It now pairs an opening run with a closing run of the same length, which is the real rule. The whole queue was rendered before and after to check the blast radius — the change touches only the entries that actually contain a code block, plus two more that it repairs, one of which had been silently losing its bold with nothing on the page to show for it, and leaves every other entry identical character for character. Nothing you see or do in the app changes.
- Closed a way the terminal's own developer tools could destroy a file they were in the middle of rewriting. Eight small tools here rewrite a file in place — the architecture reference, the code map, the test catalog, the roadmap board, the phone queue page, and two of the safety-check baselines. Every one of them used the ordinary way of writing a file, which empties the file first and then writes the new contents into it. That gap is not a split-second at the end; it is the whole stretch between emptying and finishing, and anything that interrupts it — a crash, a full disk, the process being killed — leaves the file empty or half-written with nothing left to recover from. This is not hypothetical: the project's private build queue, a two-megabyte document, was wiped to nothing exactly this way last year, and was only saved because a backup happened to have been taken twelve minutes earlier. The private side of the project built a fix for itself at the time, but that fix lives in a different repository and could never see this one, so the same hazard sat here untouched. All eight now write to a temporary file alongside the real one and swap it into place only once it is complete and safely on disk — so the real file holds either its old contents or its new ones, and never nothing. Two of the eight were worse than the one originally reported: they read a file, change it, and write it back to itself, so a failure would have destroyed the only copy of what it was reading. The new checks run the writes for real rather than just reading the code for the old pattern — they deliberately break a write halfway through and confirm the file survives intact, and they include a side-by-side demonstration of the old way losing everything and the new way losing nothing. One check also runs the real roadmap tool with a fault injected into it, so if anyone ever puts the old pattern back, it fails loudly instead of passing on a technicality. A last check makes sure any new file-writing tool added later has to declare whether what it writes is worth protecting. No effect on anything you see or do in the app.
- Fixed the private roadmap reader printing a stray pair of asterisks when a bold marker has nothing to pair with. The developer-only tool that turns the build queue into a phone-readable page already repaired one half of this: a bold passage the author opened and never closed is simply bolded to the end of that paragraph rather than showing the marks. The mirror case had no such repair — a stray closing mark, with no opening one anywhere before it, matched nothing and fell through onto the page as raw text. It surfaced on a newly-filed queue item that ends a quoted passage with exactly that slip. The half that made it easy to miss is that every obvious version of the mistake already rendered correctly, because the existing repair covered them; the gap only showed in the one arrangement where the mark has no text after it at all. Both remaining ways a mark can end up pairing with nothing are now dropped rather than printed, and the tests pin the shape rather than that one item's wording, so the next person to make the same slip in different prose is covered too. Deliberately not fixed by editing the queue: the document is the author's, the tool is ours, and a reader that falls over on a typo is the thing that was wrong. The trade-off is recorded in the code — a pair of asterisks genuinely meant as literal text now disappears instead of showing, which is accepted because such a pair outside a code snippet was already treated as a fault, and asterisks inside code snippets are untouched and still render exactly as written. This tool is not part of the app and nothing you see or use is affected.
- Corrected a developer rule that listed which files require a cache refresh, and had been quietly missing one. The terminal keeps a cached copy of itself so it loads instantly and works offline, and any change to a file it caches has to come with a new cache stamp — otherwise people who already have the app installed keep running the old copy and never see the update. An automated check enforces that at save time, and it was right; the written rule beside it was wrong. The rule listed the cached files by hand and had copied that list from the wrong place, so it omitted the release notes file — which the terminal does cache, at load time rather than install time, for the in-app "what changed" viewer. The gap is quiet and plausible: someone editing only the release notes reads the list, sees nothing that looks cached, skips the stamp, and ships an update installed users never receive. Rather than correct the hand-typed list to match today's code — which is precisely how it drifted in the first place — the list now exists in exactly one place and is checked automatically against the code that actually does the classifying, in both directions: a file the code treats as cached but the docs omit fails, and so does a file the docs claim is cached when the code would not catch it. A second check makes sure the deleted copy stays deleted, since the cheapest future "fix" is someone helpfully pasting the old list back where it used to be. All three failure modes were reproduced first to prove the checks actually go red. One deliberate exclusion is recorded: the separate list that says which rule document covers which part of the code is a different question with a different answer, and the two are meant to differ. No effect on anything you see or do in the app.
- Made the private build-roadmap board readable at a glance. The board is generated automatically from the developer's own build notes, and it used to list each piece of work as a short code plus the heading that piece of work was filed under — headings written in shorthand for somebody who already knew what the code meant. In practice that made the board unreadable to the one person who uses it to decide what to work on next. Every listed row now carries a plain-English line underneath saying what the work actually is and what finishing it looks like, pulled straight out of the notes for that piece of work rather than written by the generator. Where a piece of work genuinely doesn't describe itself anywhere, the row says so in as many words instead of guessing — a made-up description that reads convincingly is worse than an admitted gap, because there's no way to tell it apart from a real one afterwards. The board also now reports, for each section, how many rows it could describe and how many it couldn't, so the gaps are a to-do list rather than a mystery. No effect on anything you see or do in the app.
- Fixed two ways the private build-roadmap board could describe a piece of work wrongly. Both were spotted by reading the board rather than by any automated check, and both matter more than a row that simply says nothing: a row admitting it has no description is honest, while a row carrying a confident but wrong one reads exactly like a correct row. First, a long piece of work can contain a smaller piece nested inside it, and the board was sometimes describing the whole thing by that nested detail while its own description sat further down. The board now prefers the item's own description, falling back to the nested one only when there genuinely isn't another, so no row loses its line. Second, and worse: when a piece of work has been partly finished, the notes cross out the finished parts — and the board was pulling the crossed-out text through, striking and all, right where the remaining work should have appeared. A reader could reasonably have concluded nothing was left to do. Finished parts are now dropped whole, so what shows is what is actually still outstanding; if crossing-out leaves nothing readable behind, the row says so rather than quietly borrowing a description from somewhere else in the item. Where a description is explicitly scoped to one part of a larger item, that scope is now shown alongside it instead of being silently dropped. No effect on anything you see or do in the app.
- Added a phone-readable view of the private build reports, served by the local development server only. The overnight and morning write-ups were plain text files that were painful to read on a phone; they are now rendered as proper web pages on demand — real headings with a tappable contents list, a comfortable line length, code blocks and wide tables that scroll on their own instead of pushing the whole page sideways, and light or dark to match the phone. The reports themselves deliberately do not live in this repository and are never copied into it: they are read from outside it at the moment a page is requested, rendered in memory, and never written to disk, so there is nothing for a commit or a publish step to pick up by accident. The page is reachable only from the owner's own private network, never the public internet. No effect on anything you see or do in the app.
- Fixed a flaw in the shared markdown renderer that could lock it up completely. The renderer treats certain line types as belonging to a specialist handler, but for top-level headings no handler actually claimed them — so on any document containing one it would spin forever on the same line instead of moving on, pinning a processor core. It had never been hit because the only thing being rendered was a kind of text that never contains those headings, and it would have triggered the first time anything else was rendered. Headings now render properly, and the loop is guaranteed to move forward on any line whatsoever, so this class of lock-up cannot come back through some other line type later. Tables are now rendered as real tables too, which also tidies up a hundred or so places in the private queue view where they previously came out as a run of stray pipe characters. No effect on anything you see or do in the app.
- Made the development server's status command admit its own shelf life. That server is what puts the terminal and the private reports on the owner's phone, and it is a plain background process, not a proper service — it dies on a reboot, when the handheld sleeps, or if the private network drops. It had always said so, but only at the moment it was started, to whoever was already sitting at the keyboard. Asking whether it was up said nothing about it, which is precisely when somebody needs to know. Now the status output carries that warning every time, and when nothing is actually serving it says so bluntly and names the one command that brings it back. This came out of a real incident: the server was interrupted a few minutes after being checked, and the phone showed the terminal with no styling at all — the browser still had part of the page saved and everything else it asked for failed, which looks far more like a broken app than a stopped server. No effect on anything you see or do in the app.
- The development server now starts itself when you log in, so the terminal and the private reports are simply there on your phone instead of waiting for someone to remember to start them. It is deliberately the smallest thing that achieves that: one trigger, at logon, which runs a single command and then exits. It is not a timer, it does not poll, and it will never resurrect a server you stopped on purpose — a thing that keeps restarting itself is worse than one that stays down, because it overrides your decision. It cannot interfere with a server you started by hand either: if something is already using the port it stands aside and says so, rather than taking it. It gains no new permissions of any kind, it does not change anything about how the machine is reachable from outside, and it starts the same locally-bound server as before. Turning it off is a single command, documented inside the file it installs, so anyone who finds it can undo it without hunting for this project first. Whether it is switched on is now reported by the ordinary status command, because machine settings you cannot see from the place you would naturally look are settings people forget they enabled. No effect on anything you see or do in the app.
- Corrected the development server's own warning about what it survives, which the change above made partly untrue. It used to state flatly that the server does not come back after a reboot; with the logon trigger installed, it does. The warning is now worked out from whether that trigger is actually installed, and it names the cases that remain uncovered individually rather than rounding them off: waking the handheld from sleep does not bring it back, because no logon happens; stopping it by hand does not, deliberately; and the private network dropping breaks the phone link even though the server itself is fine. A stale warning is worse than none at all, because it gets believed. No effect on anything you see or do in the app.
- The private reports page now opens with the roadmap. It is the thing being opened first, so it is the headline rather than a link: a strip of counts answers "how much is left" in the first screen — how many are in flight, how many are waiting on a decision from you, how many are ready to start, and how many are filed for later. Underneath, the whole board is present, band by band, with every count exactly as the board states it. The two bands you can act on right now open by themselves; the longer, quieter ones start collapsed with their true size showing and expand in one tap, so nothing is hidden or shortened — the page just does not put thirty screens of it in front of you before you have asked. It also reports one number the board itself does not: how many items already say somewhere in their own text that the work is finished while still being filed as open, which is the honest part of the answer, with the list of which ones. The board is read from disk every single time the page loads and never cached, because it is regenerated as work closes and a remembered copy would show you a stale picture while presenting it as current; the page prints when it was last rebuilt so you can judge that yourself. No effect on anything you see or do in the app.
- Reworked the roadmap page after using it on a phone. There is now a small menu at the top that jumps straight between the roadmap and the reports, so reaching the reports no longer means scrolling the entire board to get there. The back arrow in the corner used to appear on the roadmap page too, where it pointed at the page you were already on and so did nothing at all; it is now only on the individual reports, where it goes somewhere real — a control that does nothing is worse than no control. And every section of the board now starts closed rather than opening the first two for you, which takes the page from roughly seventeen phone screens down to two: the counts that answer "how much is left" are the first thing you see, each section still shows its own true number while closed, and any of them opens with one tap. No effect on anything you see or do in the app.
- Made it impossible to accidentally commit a credentials file to this repository. The project's code is public, and a secret that gets pushed cannot be taken back — deleting it afterwards leaves it in the history and in every copy anyone has already downloaded, so the only cheap moment to stop it is before the first commit. The usual shapes those files take — environment files, private keys, certificates, SSH keys, credential JSON — are now refused outright. Checked before adding them that nothing of that shape was already committed, because an ignore rule added over a file that is already in the history looks like a fix while changing nothing at all. The automated check asks git directly whether it would accept such a file, rather than reading the ignore list and assuming the two agree, and it also proves ordinary files are still committable — otherwise a rule that ignored the entire project would have passed as a success. No effect on anything you see or do in the app.
- Added two read-only pages to the local development server: one showing the current operational status, and one giving a window onto the activity logs. The status page leads with how old its data is, in plain words, because the file it reads is produced on a schedule rather than continuously — reading it fresh makes the reading current, not the data, and a page that presented a stale snapshot as live would be worse than no page at all. Every field is printed whether or not it has a value, since a missing row and a healthy row look identical once the row is gone, and where the source itself reports that it could not measure something, its own stated reason is carried through rather than replaced. The activity log view deliberately shows only the end of a file and says so on the page: the full set is far too large to load, and "the log contains no errors" is a very different claim from "the end of the log contains no errors". Both are strictly read-only — the logs are append-only and chained, so a write from a viewer would break the verifiability of every earlier entry, and the reader has no way to write at all. No effect on anything you see or do in the app.
- Fixed the development server serving one of the new pages' data reader from memory instead of from disk. The dev routes deliberately re-read their page code on every request, so that editing a page shows the change immediately rather than after a restart — but the module that actually reads the data was left out of that list, so it alone kept being served from a stale copy. The effect was the worst kind: the page kept answering, at the same status, with entirely plausible content, while reporting from code that no longer existed on disk. It was caught when a setting was deliberately removed, the tests agreed it was gone, and the running server carried on using it anyway. No effect on anything you see or do in the app.
- Made the status page answer the question it is actually opened to answer, and gave every developer-only page a way back to the start page. The status page had turned into a field-by-field dump: it opened with a list of raw internal field names, right-aligned, running off the side of a phone screen — and in one case it printed a paragraph of explanatory text in the slot where a value goes, so a written definition of a word was sitting in a column that reads as current state. It now opens with a short plain answer — how old the reading is, whether enforcement is armed, and whether anything is flagged as needing attention — followed by anything that could not be measured, then anything the reading merely counted, with the complete field-by-field detail collapsed underneath for when it is actually wanted. Nothing was removed to achieve that: every field is still on the page, which matters because showing less to look calmer is exactly the fault that was found in this page last week. Explanatory prose and file locations are now kept out of the one-line summaries automatically, by their shape rather than by a list of which fields to watch, so a new one added later is handled without anyone remembering to. Field names are made readable by splitting them into words — deliberately a mechanical change and not a glossary, because an honest page cannot explain what a field means when the underlying reading never says. A new row reports the last phone alert the notification service itself confirmed delivering, which is a stricter thing than an alert having been attempted; if no confirmed delivery can be found it says so plainly rather than showing a blank or a zero, since "none found" and "none sent" are different facts. And the link back to the start page is now produced in one shared place instead of being copied by hand into each page, which is why five of the eight pages did not have one at all. No effect on anything you see or do in the app.
- Connected the two new developer-only pages to the start page, and stopped the status page quietly leaving most of itself out. The start page had been announcing, under "Not built yet", that a live-status page and a run-history page did not exist — both had in fact been built and were serving. The cause is worth naming, because it is the failure that hides: the list of what does not exist was written inside the page itself, so building a thing could not possibly update it, and unlike a broken link there was nothing to tap and discover it was wrong. Absences are now handed to the page along with everything else, so they are corrected in the one place a destination is decided. Both pages are now linked, each saying on the tile what it is — the status tile carries how old the reading is and calls it a snapshot rather than a live view, and the history tile says up front that opening one shows the end of a file rather than all of it. Separately, the status page was printing "every field below is printed whether or not it has a value" while showing nine of the twenty-four things the underlying reading actually contains; the other fifteen were absent with nothing to indicate they existed, which is the exact confusion that page was built to prevent, since a missing row and a healthy one look the same once the row is gone. It now works out what it has not shown from the reading itself rather than from a list kept alongside it, and names each one underneath — so something added later cannot silently go missing here. Those extra entries are deliberately listed by name only and cannot show their contents: a few of them record file locations, and a page that simply printed whatever was left over would put those on screen and go on doing so for anything added in future, with nobody deciding it should. None of this is part of the app and nothing you see or do in it changes.
- Taught the developer status page to tell you when it has stopped hearing from the system, instead of only telling you how old its information is. The page reads a file that a separate background process writes on a schedule, and it has always led with the age of that file — but it only had one way of sounding concerned, which it used from fifteen minutes onwards: "old enough to be worth double-checking". That sentence is the right one when a reading is a little behind and the wrong one when the thing producing it has simply stopped, and the two were indistinguishable. It turned out to matter: the file had not been updated in four days, the page said exactly what it says at sixteen minutes, and the gap went unnoticed for three of those days by someone who was reading the number. Past an hour the page now leads with the plain fact — "this page has heard nothing for 4 days" — above everything else on it, restates every figure underneath as a description of how things stood back then rather than now, and stamps the summary box itself so it cannot be read as current. It also now answers the question that decides what to do about it, by looking at whether anything else in the same place is still being written to: a stale reading beside a busy folder means the machine is running and one thing on it has died, while a stale reading beside a silent folder means the machine itself has not been running. If that cannot be checked it says nothing at all rather than guessing, because "nobody looked" and "nothing happened" are different facts. The start page carries the same warning on its tile, and that tile stopped calling itself "Live status" — a name that claimed something the page could not deliver, with the correction printed underneath it where it was read second. It is now "Control plane status". Throughout, the page still refuses to say whether the system is healthy: it reports only what has and has not reached it. Developer tooling only — no effect on anything you see or do in the app.
- Made the developer build-board pages say whether the board is still up to date, and made the check that is supposed to police that able to fail. The build board is generated from a private planning document, and both places that display it used to report when the board FILE was last written — "Rebuilt 13:04", "Updated 44 minutes ago". Both were true, and neither answered the question a reader is actually asking, which is whether what they are looking at still matches reality. On the 1st of September the board was 59 items out of date — 307 shown against 366 that exist — and both pages carried on reporting a recent timestamp in a reassuring tone. They now lead with the answer: it matches the queue, it is OUT OF DATE and here is what that means, or whether it matches could not be established — that last one kept deliberately separate, because a board nobody could check is not a board that is fine. Separately, the command that verifies the board before every save had a real hole. It compared a fingerprint of the source document, which answers "was this built from the current queue?" but can never answer "is this what the generator actually produces?" — so a board produced by an older version of the generator, or edited by hand, passed. That was written down as a permanent limitation on the grounds that the board carries a stamp which legitimately changes on every unrelated change, making a full comparison impossible. It turned out that reasoning was true of the stamp and not of the document: the stamp is one line, so it is now held aside and everything else is rebuilt and compared exactly. Proven by running it against a real board with one item quietly deleted, whose fingerprint still matched perfectly: the old check passed it, the new one fails it and names the line. Developer tooling only — no effect on anything you see or do in the app.
- Closed a way the local development server could keep answering from code that was no longer on disk. That server runs for days at a time, and the language it is written in keeps a copy of every loaded file in memory for the life of the process — so an edit can be perfectly correct on disk and completely invisible to the running server, which keeps serving plausible pages with nothing anywhere reporting a problem. There was already a list of files to re-read on every request to prevent exactly this, but it was policed by FILENAME: anything whose name did not fit the pattern was outside the guard. Two files were, including the one that decides which files get read at all — so a freshly re-read page could still be asking a stale copy of that. The rule is now "everything the re-read files themselves depend on", which cannot be escaped by what a file happens to be called. Developer tooling only — no effect on anything you see or do in the app.
- Made the command that rebuilds the developer build board say what it just threw away. There is a checkpoint routine that rebuilds the board and then verifies it, in that order — which cannot catch anything, because the thing being verified was replaced a moment earlier. The tempting fix is to make the verification stricter until it fails there, and that turns out to be incoherent: once the board has just been rebuilt it genuinely IS up to date, so any honest check must agree, and one that disagreed would simply be wrong. The real damage was never that a check passed — it was that rebuilding quietly destroyed the evidence of how far behind the board had been, so nobody ever learned that 59 items had been missing for days. The rebuild now reports it: how many items behind the board it replaced was, which ones have appeared since, and honestly where that list stops short (one section of the board is a running count rather than a list, so items that land there move the totals but cannot be named). The order of the two commands no longer matters, which means nobody can lose the measurement by tidying them back together. Developer tooling only — no effect on anything you see or do in the app.
- The terminal can now tell you the difference between "you are disconnected" and "the terminal's own host is not answering" — which it could not, and that cost real time. Someone opened the terminal, found it unresponsive, and concluded the machine serving it had gone down; the actual cause was that their VPN tunnel had dropped. The terminal showed the same thing for both, so that was a perfectly reasonable conclusion to reach, and it sent them to check the wrong system. It now checks two separate things and says which it found: if the device itself reports no network, it says so plainly; if the device has a network but the terminal's host did not answer, it says that instead — and it deliberately does NOT guess between "the host is down" and "your route to it broke", because a browser genuinely cannot tell those apart and guessing wrong is exactly what happened last time. Both are named, neither is blamed. If it cannot establish the answer at all it says so rather than implying all is well, and when the link is healthy it shows nothing — an all-clear message is a claim that goes stale the moment it is painted. Checked once when the terminal starts (the case that caused this: a terminal that opened perfectly from its offline cache while its host was unreachable, with nothing on screen saying so) and again whenever the connection changes, so a warning clears itself once things recover.
- Fixed the backup reminder, which was answering the wrong question and had gone quiet on work that genuinely was not backed up. Several kinds of file on this machine exist nowhere else — the developer reference docs, the planning tree, and the assistant's own memory — and a small check runs before every save to remind whoever is working that they need copying to the private backup. It decided whether to speak up by comparing file timestamps against when the backup repository was last written to, which means ANY write to that repository silenced it, even one that copied nothing across. No fault was needed for that to go wrong — two people working at once and an ordinary clock were enough. It was caught with three real files unbacked while the reminder said nothing was owed, one of them a note written that same day for the express purpose of not losing something. The obvious repair — check the file is in the backup — would have been just as quiet, because one of the three WAS in the backup and simply out of date. It now compares the actual contents, byte for byte. Just as importantly it now always says something: that it checked and everything matches, or what does not match, or that it could not tell, or that there is no backup configured on this machine — because a check that says nothing when all is well is indistinguishable from one that has stopped working, and that was the whole failure. It still cannot block anyone's work; it only informs. Developer tooling only — no effect on anything you see or do in the app.

- Added two small guard scripts for the Codex desktop app's worktree feature, so the checks a coding helper used to redo by hand every time it started — and stop on, eight times in one day — become printed facts instead. The first runs when Codex creates a fresh working copy and reports where the code stands: which commit it is on, whether it matches the copy on GitHub, whether anything is edited but not saved (edited files and brand-new files counted separately), and whether another session is already working in the same project. It only reports; it can never block. The second runs just before Codex deletes a working copy and refuses to let it go while unsaved work is still inside — naming every file — after first copying that work to a safe place outside the project, because a real case was found this week: a forgotten working copy holding sixteen changed files and a fully drafted commit message that nobody was watching. Both are read-only towards the project (the way they ask git for status cannot leave behind the stuck lock file they are looking for), and both are proven red-before-green by the test gate. The vendor's settings box gets one line pointing at each script, so the logic stays versioned and reviewable rather than typed into a text box with no history. Whether Codex actually honours a refusal from the second script is not yet known — its own header says so plainly, and explains how to find out. (Suite 266.)
- Fixed the first of those two scripts reporting sessions that had died with the previous reboot as live writers. Found the same afternoon, right after a restart: two session records from before the boot named process numbers that Windows now refused to open, and the script read "refused" as "present". A record older than the machine's last boot is now reported as stale and never counted, and an ambiguous answer from Windows is called inconclusive rather than alive. Locked by two more Suite 266 checks against a fixture store.

---

## [v2.8.5] — Foundations & Fidelity<!-- Date: 2026-07-22 | Cache: robco-terminal-v2.8.5-r6 -->

### Hotfix

- Installing the terminal as an app on your phone or desktop is now easy to find. When your browser supports it, a slim banner appears across the top offering a one-tap INSTALL — which runs the terminal fullscreen and offline, like a real app, instead of a browser tab. It only shows when installing is genuinely possible and you haven't installed yet, and tapping its ✕ dismisses it for good so it never nags. The original installer button under Security & Configuration is still there if you dismiss the banner and change your mind later. The installed app itself never shows the banner.
- If you installed the app to your home screen before the Fallout 3 Pip-Boy rotation fix shipped, the terminal now helps you recover it. A one-time tip appears — only inside the installed app, only during a Fallout 3 campaign — reminding you to rotate sideways for the Pip-Boy landscape screen, and, if it won't rotate, walking you through the reinstall that fixes it: remove the app, reopen the site in your browser, and tap INSTALL. It gives you a COPY SITE LINK button so that when you reopen in your browser you're taken straight to the highlighted INSTALL button — and that highlight survives the "Reboot Terminal" update step, so you never lose your place mid-reinstall. The tip is shown once and never nags, and it never appears in a browser tab or in New Vegas.

### Added

- Rotating your phone sideways during a Fallout 3 campaign now opens a true-to-the-game Pip-Boy 3000 device screen, built from the ground up to look and behave like the real hardware instead of a re-coloured New Vegas layout. It's framed in a dark, weathered-metal casing: a left column carries an embossed nameplate, a working system-status gauge with a needle and metal ring, and the AI radio knob whose pointer swings as you tune in; a right column carries the settings toggle switch with a real lever; and the three main screens sit above as glowing STATS, ITEMS, and DATA lamps, with each screen's sub-sections (STATUS, SPECIAL, SKILLS, and so on) as a row of tabs on the glass that remembers which one you last had open. The character screen centres on an original, hand-inked Vault Boy figure flanked by your five body-part health toggles — each sitting right beside the exact part it controls — with your health, radiation, and active effects merged around it so you see everything without scrolling, plus small up/down steppers to adjust health and radiation without opening the number field; a crippled part turns its outline dashed and reads CRIPPLED (a crippled head also takes on a distressed face), matching the real damage screen exactly and with no colour change. S.P.E.C.I.A.L. shows all seven attributes as plain rows with a stepper, and your skills, perks, and cargo read as a scrolling list on the left with the selected item's full details and actions on the right, just like flipping through pages on a real Pip-Boy — cargo actions (equip, use, adjust quantity, drop) live in that details pane. Your mission clock, position, faction standing, and karma read out as plain boxed panels. The whole screen renders in one consistent phosphor green — no leftover amber or red accents — and fills the display edge to edge, scrolling entirely within its own bounds so the controls never hide anything. Portrait mode keeps today's layout and Fallout: New Vegas is untouched. This is a foundations pass: the deeper physical dressing — indicator sway, a detented knob — comes in a later update.
- Your saved campaigns are now much harder for a phone to lose. The terminal asks your browser to keep your data instead of quietly clearing it under low-storage pressure, and if the browser won't guarantee that, a small dismissable banner tells you so and reminds you to export a backup. And if the browser has already reclaimed your local data, the next startup shows a clear warning explaining what happened and pointing you at your surviving cold-storage save slots and backups — rather than silently starting you over like a brand-new visitor. It's deliberately conservative about false alarms: a genuinely new visitor, a first install after closing the tab early, or a slow device never sees it.
- Your active, in-progress campaign is now protected against the one storage failure that could still lose recent play. On phones, the browser can quietly reclaim the terminal's fast local storage when the device is low on space — your save slots and automatic backups already survive that, but the campaign you're playing right now did not, so anything since your last automatic backup could be lost. The terminal now keeps a continuously-updated duplicate of your live campaign in a second, sturdier storage area and automatically restores from it on the next startup if the fast storage is ever wiped, instead of starting you over. The duplicate refreshes as you play and again whenever you switch away or close the terminal — the moment a phone is most likely to reclaim memory — and the restore is strictly one-directional: it only ever happens when the live campaign is genuinely missing, so a saved-behind duplicate can never overwrite newer progress. If your device has no second storage area, nothing changes.
- If your save data ever can't be read at startup — storage corruption, rare but real — it's now set aside whole and recoverable instead of being silently wiped. A warning banner tells you what happened, and a QUARANTINED RECORD entry appears in the saves list with an EXPORT button to download the set-aside data for recovery and a PURGE button to permanently discard it behind a confirmation step. The warning returns every startup until you resolve it, so a lost campaign can never slip by unnoticed. Loading a healthy save is completely unaffected.
- Saving to a slot now tells you when only one of the terminal's two storage systems actually held the save — a one-time notice per session says whether the slot is held in local memory only or in cold storage only, so a quietly failing device can't pile up under-protected saves without you knowing. A healthy save stays exactly as quiet as before, and a fully failed save stays exactly as loud.
- The Fallout 3 Karma Center now shows your character's actual in-game karma title — like "Vault Guardian" at level 1 with good karma, or "Messiah" at level 30 — alongside your karma standing, updating live as your karma or level changes and covering all 90 titles from the real game.
- The Fallout 3 Karma Center gained a tappable list of real, in-game karma-changing actions — donating to a church, saving a captive, stealing from a locked container, and dozens more — each a clear bordered button with its karma value in its own badge (green for good, orange for evil). Tapping one applies its exact karma value and flashes a brief confirmation in the corner, the same way changing location does. A handful of actions the game itself never gives an exact number for are shown but can't be tapped, clearly marked as unconfirmed rather than guessed. The karma slider is still there for manual adjustments or overriding these actions.
- The plain, flat "schematic" list in Security & Configuration — the no-frills alternative to the hardware bay, for when you just want a list of switches — now actually lists everything. It had quietly fallen behind as the hardware boards grew: your fourteen sound channels had collapsed to a single dead line of text (with the count wrong, because it was typed in by hand), and your AI access key, engine picker, handshake button, campaign-log export, and app installer had no entry at all. Every one of those is now a real, working row, and the sound channels are counted from the actual hardware, so the list can never fall out of step again.
- The flat schematic list now speaks in each machine's own voice — a RobCo field service schematic for a salvaged unit in Fallout: New Vegas, and a Vault-Tec maintenance diagram for the Pip-Boy 3000 in Fallout 3. The controls, their names, and their slot numbers are deliberately identical in both, since they refer to the same real hardware and renaming them per game would only make the two views disagree.

### Fixed

- Deleting, selling, scrapping, using up, or having the Director replace an equipped weapon or piece of armor no longer leaves your bio-metrics readout showing gear you don't actually have anymore — it now correctly clears to "Nothing equipped" (or shows whatever you still have on) the moment the item is gone. A save from before this fix self-heals the first time it's loaded.
- Fixed the new Fallout 3 Pip-Boy screen being unreachable once the app was installed to a home screen — the installed app was locked to portrait at the phone level, so rotating sideways could never reveal it. Rotation is now unlocked in both orientations. If you already installed the app, remove it from your home screen, reload the site once in your browser, then add it again to pick up the fix.
- Fixed a rare case where interrupting a health, experience, or radiation drag gesture — an incoming call, or switching apps mid-drag — could leave the drag stuck active, silently changing that value on your next unrelated tap anywhere on the page. Affects both games.
- Fixed a handful of narrow number fields — the calendar year, radiation exposure, and the crafting and scrapping quantity boxes — clipping their own value by a couple of digits on phones, so a four-digit year could show cut off. Affects both games.
- Fixed the bottom navigation dock on phones covering the last row or two of several screens until you scrolled — the S.P.E.C.I.A.L. attributes, the cargo drawer and its search controls, and the quest and databank search boxes could all start out hidden behind it. Every screen's content now lives in its own bounded, scrolling area that stops right above the dock, so nothing renders behind it at any scroll position. Affects both games on phones; desktop is unchanged.
- Fixed the quest log's cycle-status and remove buttons being nearly unreadable against their own background colour. Affects both games.
- Fixed the location, item, quest, and perk suggestion boxes — and everything else that looks things up for you, including what the AI itself sees — sometimes showing the other game's content, such as a Fallout 3 campaign suggesting New Vegas locations. This only happened right after loading a save slot that held a campaign for a different game than the one you were currently playing; loading now properly restarts the terminal into that game, so every suggestion and lookup matches the game you're actually in. Affects both games, in either direction.
- Fixed re-importing an older save file sometimes leaving a couple of settings — like your map view size, or your standing with a long-retired faction — stuck on their old values instead of being brought up to date, the way loading a cloud save or a save slot already does. No campaign data was ever lost by this; it only affected a small number of settings staying stale.
- Fixed the Fallout 3 Karma Center warning about a hit-squad faction that doesn't actually exist in the game — it now correctly warns about the Regulators once your karma turns evil, or Talon Company once it turns good, matching the real game, instead of a made-up threat that only ever showed up at the most extreme evil karma and never warned good-karma characters at all, even though good karma gets you hunted too.
- Fixed three companions showing the wrong karma requirement in the Fallout 3 Karma Center: Dogmeat and Charon never actually required any particular karma to recruit, and Butch DeLoria (who does require neutral karma) was missing from the list entirely. All eight companions and their real requirements now show correctly.
- Fixed the Fallout 3 perk list containing six perks that don't exist in the game — three made-up "companion" perks and three weapon-damage perks that are really from New Vegas (Laser Commander among them) — corrected a perk misnamed "Scavenger" that should read "Scrounger", and fixed roughly half of the list's level requirements (Cannibal, for instance, now correctly unlocks at level 12 rather than 6), so the ELIGIBLE PERKS lookup reports the real level each perk becomes available.
- Corrected two Fallout 3 bobblehead locations that pointed at the wrong place: the Explosives bobblehead is at the WKML Broadcast Station, in its sealed cistern, not Minefield, and the Unarmed bobblehead is in the unmarked Rockopolis cave, not the Tepid Sewers. Both were checked against the Fallout wiki.
- Corrected the entire Fallout 3 weapon list against the official Fallout wiki: dozens of weapons had wrong damage, critical-hit, fire-rate, weight, or value numbers — the sniper rifle was listed as worth 3,500 caps instead of 300, and the 10mm pistol fired far slower than it really does — and the explosives had been left on old placeholder attack speeds and critical-hit behaviour (grenades and mines were even marked as unable to land a critical hit, when they actually can). Every weapon and each explosive's blast damage was checked page by page rather than guessed, and four "weapons" that aren't in the game at all — a Bumper Sword, a Golf Club, a Plunger, and a Tin Grenade — were removed. So barter prices, carry weight, the threat-assessment and weapon-lookup readouts, and the AI's own understanding of your arsenal are all accurate now. New Vegas is unaffected.
- Corrected the New Vegas weapon list against the official Fallout wiki the same way. Dozens of weapons had inflated or just-wrong prices, fire-rates, damage, weight, or critical-hit numbers — the Bozar was listed at 75,000 caps instead of 20,000 and the CZ57 Avenger at 62,000 instead of 8,500, while the Medicine Stick was too cheap at 5,000 instead of 20,000 — and every weapon and each explosive's blast damage was re-checked one at a time. Four entries that aren't New Vegas weapons ("Rebound", which is a chem; a Pump-Action Shotgun; a Golf Club; and a non-existent "Vance's Lucky Hat Knife") were removed, and the "Rocket Launcher" was renamed to its real in-game name, the Missile Launcher. Fallout 3 is unaffected.
- Fixed two wrong New Vegas snow-globe entries. The "Test Site" globe pointed players to Crescent Canyon West, where there is no globe at all — it's actually behind the cash register in the Lucky 38 Cocktail Lounge — and a seventh globe listed under the made-up name "Lucky 38" is really "The Strip", found in Sarah's locked bedroom in Vault 21, so it's now named and located correctly.
- Corrected the New Vegas armor and clothing against the official Fallout wiki — the last tables in the file still carrying unverified numbers, including the hats and helmets whose stats live on a separate wiki page. Combat armor was priced at 3,900 caps instead of 6,500, most chems were listed with weight when they're actually weightless, and many armors had the wrong damage threshold or value, so buying, selling, and encumbrance are now accurate. A fake "Whiskey Rose" drink (really a companion perk you get from Cass) and a "Vault Utility Suit" that no New Vegas item goes by were removed, two duplicate NCR Ranger combat armor rows were merged with a behind-the-scenes alias so either old name still looks up the right stats, the "Wasteland Wanderer Outfit" turned out to be a real item and was corrected rather than removed, and the Chinese Stealth Armor's description no longer wrongly claims it turns you invisible. Fallout 3 is unaffected.
- Fixed a hidden defect where a bug in one of the startup save-upgrade helpers could have deleted a perfectly healthy save: the "is this save readable?" check accidentally covered more than the actual reading step, so a helper failing for its own reasons was mistaken for a corrupt save and erased it. Those helpers now fail gracefully — the save loads untouched, and the fault is quietly logged for diagnosis instead.
- Fixed your cloud saves list showing "NO ARCHIVES ON FILE" — as if your account had none — when the app simply couldn't reach the cloud. A genuine connection failure now shows a clear "ARCHIVE LINK FAILED" message instead, so a network hiccup can never be mistaken for your saves being gone.
- Fixed the "SYNC COMPLETE" message appearing even when some of your saves failed to upload. If any save doesn't make it, the summary now says so plainly — how many failed, and to retry — instead of falsely reporting a clean finish.
- Fixed a failed Google sign-in showing nothing at all — you'd tap SIGN IN and, if it failed for a real reason like a blocked popup, no connection, or a provider error, nothing visible would happen. A clear "SIGN-IN FAILED" notice now appears so you know to check your connection or popup blocker and try again. Simply closing the sign-in popup yourself stays silent, as before.
- Fixed a healthy older save being wrongly set aside as "unreadable" when the real problem was that the app couldn't re-store the upgraded copy, for example when device storage is full. The terminal now tells the difference: a save it genuinely can't read is quarantined and recoverable, but a save it read perfectly and simply couldn't re-store is left exactly where it was — untouched and still loadable next time — while a small warning tells you the write didn't go through and to free up space or export a backup. Your loaded campaign stays fully usable for the rest of the session either way.
- The Director can no longer silently erase what you've earned. Before, a turn where the AI reported an empty or shortened list — which could happen after something that changed nothing, like a failed armor repair or an aborted craft — would quietly wipe items, companions, perks, quests, active effects, ammo, or collectible, trait, skill-book and magazine progress you actually had, with no warning and no way to undo it (one campaign lost a looted 10mm pistol exactly this way). Now the AI's lists are treated as a proposal, not the final word: anything it adds still appears instantly, so picking up loot during the story works exactly as before, but anything it tries to remove or reduce now asks you to confirm first, using the same kind of pop-up the terminal already shows before a level-up. Choosing KEEP leaves everything untouched, and anything the AI simply doesn't mention is always left exactly as it is. Ammo counts and status effects, which change constantly during normal play, still update freely — they just can't be wiped all at once by a bad turn — and faction reputation was already safe.
- The terminal and the AI Director now address you by the right character for the game you're playing — the "Lone Wanderer" in a Fallout 3 campaign instead of the New Vegas "Courier" that used to greet everyone regardless of game. The wake message and the removal-confirmation pop-up use the correct name too.
- A message that fails to send and automatically retries no longer floods the screen with a fresh copy of your message and a new status line for every attempt. Your message now appears once and gains a small relay-hop marker as it retries, with a single status line underneath counting the attempts (1/3 → 2/3 → 3/3) — replaced by the reply on success, or by the error if it gives up.
- A brief, recoverable network hiccup while reaching the AI no longer reads as a red "FATAL EXCEPTION", as if the app had crashed. It now shows a calmer "SIGNAL LOST" message that reminds you the terminal is fully usable offline and to just send again. Genuine hard faults — a bad access key, an unreadable reply — still show the fatal framing, because for those it's accurate.
- Fixed the "COURIER RETURNED" wake message occasionally printing twice in a row when the app was quickly tabbed away from and back, common on phones where the keyboard sliding in and out can trigger it — it now prints once.
- The downloaded campaign log is now a truthful record of what was actually on screen. It used to save only the conversation text and silently leave out every pop-up, including the confirmation dialogs the terminal raises before it changes anything — so a log could look like the AI had quietly done something drastic when it had in fact asked first and been told no. Pop-ups and confirmations now appear in the log in the right place, with the answer you gave, in all three download formats.
- Choosing the flat schematic list now genuinely sticks. The terminal was correctly recording which of the two views you last picked and then ignoring it on the next startup, so if you preferred the flat list you were handed the hardware bay again every single time you reopened the app. Your choice is now honoured on startup, whichever one you picked.
- The controls in the flat schematic list are now properly sized and stay in sync. The print-rate slider had been only four pixels tall — a nearly impossible target to hit with a fingertip — and the access-key field and tick boxes sat under the terminal's own minimum touch size; all are now full-size, and the tick boxes are phosphor-green rather than the browser's default blue. Dragging the print-rate slider also no longer leaves the hardware bay's copy showing the old position until you reload — the two views always agree now, in both directions.

### Changed

- The AI no longer throws you out of the conversation when it changes something. Previously any stat or inventory change switched you away to whichever panel had changed, interrupting you mid-exchange and losing your place. Now you stay on the terminal and each change announces itself as a small card in the corner, the same way arriving at a new location already does. The panel that changed is still opened for you in the background, ready whenever you go and look, and several changes at once queue up one after another rather than overwriting each other.
- Levelling up is now entirely yours. The Director can still notice when you've earned a level and tell you so, but it can no longer set your level itself, in either direction — levelling spends real choices (a perk, your skill points), and those belong to you, not the AI. When the Director says you've earned a promotion you now get a note offering to open the LEVEL UP terminal right then or leave it for later; either way your level doesn't move until you choose it, and the advance goes through the same LEVEL UP button, level cap, and skill-point award as always. Asking the Director to "level me up" still works as a request — it just prompts you instead of doing it for you. This also closes a real hole: the Director could previously set your level to anything at all, including lowering it, with nothing asking you first.

### Improved

- Screen-reader users now hear what each field on the terminal is for. Every text box, number field, dropdown, and file picker — your health and level, caps, new inventory and ammo rows, status effects, field notes, the trait filter, the API key and model pickers, the command line, and the loot-image and save-file pickers — now announces its purpose out loud instead of being read as a blank, unlabeled control. Nothing looks any different on screen; this only adds the spoken labels assistive tech relies on.
- The terminal now downloads about 204 KB less on your first visit — a developer-only diagnostic console that players can never open is no longer shipped in the public build, so the site loads a little lighter, especially on mobile. Nothing you can see or do changes.
- The buttons in confirmation pop-ups — level-up, wipe terminal, the AI's remove-item confirmation, the screenshot-scan dialog — along with the REBOOT TERMINAL and subsystem-directory buttons, are no longer bright blue rectangles that clashed with the terminal's green-and-amber look. They now match the rest of the interface: rounded, outlined "pill" buttons that fill in when tapped or hovered, the same modern style as the OVERSEER control and the round +, ?, and send buttons.
- Thinned the AI channel's ambient chatter so it reads as background texture instead of noise. The "PIP-BOY DATA SYNCED" confirmation no longer prints after every single message (the quiet sync tone still confirms each one), the rotating diagnostic status blips appear less often, and a turn where nothing you actually care about changed no longer prints a bare clock-tick line.

### Under the Hood

- Reorganized the app's front-end code from a few very large catch-all files into many smaller ones grouped by what each actually does — navigation, the AI presence, the device-status screen, the settings hardware, the command layer, each on-screen panel, and the AI conversation's separate network, instruction, apply-to-campaign, and offline-command halves — and sorted the whole code folder into labelled subfolders by role, with the largest stylesheet split into twelve smaller files in their original load order. Added plain-English "what this file is and how it fits together" headers and signposting throughout. Purely an internal filing exercise — every screen, button, and behaviour works exactly as before.
- Converted dozens of the safety checks that guard your campaign from merely scanning the code to actually running it — the save round-trip and cloud safeguards, the offline V.A.T.S. math, the offline typed commands (sleep and wait, barter pricing, the quick-log shortcuts), the AI-response import, the cargo quantity steppers and equip control, the map's "you've been here" memory, and the S.P.E.C.I.A.L. clamp among them — each proven by breaking the real behaviour, watching the right test fail, then undoing it. A text-scan check can pass even when the behaviour it describes is broken; these can't.
- Added deep new automated coverage: a save-survival boot test that runs real save files (current, densely-packed, very old, and deliberately broken) through the app's actual startup and import steps and confirms nothing in your campaign ever quietly disappears; an offline-boot test that cuts the network, reloads, and confirms the terminal still starts from its cache and its native tools still work; a screen-integrity sweep that loads every screen across twelve size-and-game combinations and confirms nothing is hidden, clipped, too faint, or unreachable; and an all-green colour guard for the Fallout 3 Pip-Boy screen. Each was proven to catch a real break before being trusted.
- Drove the accessibility-warning count the build tolerates from an accepted baseline of forty — a stale figure left over from a much smaller, year-old version of the site — all the way to zero, by giving every form field a proper spoken label (see Improved above) and then tightening the build to accept no unlabeled control at all, reading the page directly rather than checking only the handful of fields on the very first screen.
- Stopped instructing the AI to resend your whole inventory, perks, quests, and faction lists on every turn — it now reports only what actually changed. This removes the root cause of the silent-deletion bug fixed above (a full list could come back short or empty and overwrite everything) and cuts roughly 500-plus characters from every message, lowering the per-message cost for anyone playing with their own AI key. Removed five more stale instructions for jobs the terminal now does entirely on its own (including an experience-point formula that no longer matched the app's own) and a dead recipe table the AI was being handed with every message. A permanent build guard now fails the tests if the old "overwrite the whole list from the AI" shortcut is ever reintroduced for any of these fields.
- Every Fallout 3 karma and perk fact — hit-squad thresholds, companion requirements, karma titles, event values, and each perk's level — now carries a note pointing at the exact wiki page it came from, and the build fails if a new one is ever added without one (or if a companion-type perk, which the game has no system for, sneaks back in). This is what caught and fixed the invented hit-squad, companion, and perk mistakes above. The cross-game stale-data window behind the suggestion-box fix was also closed a second, more permanent way, so it stays closed even if some future change reopens the first one.
- The automated checks now run on both Linux and Windows on the current long-term-support toolchain — pinned in one place so the local machine and the automated checks can never quietly drift apart — print a per-step timing breakdown at the end of every run, and, when a browser check fails, capture a full-page screenshot, that screen's console messages, and a per-check log, briefly freezing the screen's continuous motion first so the shot is reliable on slower cloud machines. The safeguard that reminds the developer to refresh the offline-cache stamp was repaired too — it had quietly been comparing against the wrong reference point and always passing.
- Restructured the development rulebook the AI assistants follow into a short set of always-apply rules plus ten focused notes pulled in only when the relevant part of the app is touched, so the important rules no longer compete with dozens of irrelevant ones (which had twice let genuinely contradictory instructions sit side by side unnoticed). Nothing was removed — every rule still exists in exactly one place — a few rules whose risk was gone were retired, and how a rule is allowed to be removed at all was written down for the first time. The default was flipped from "prove it by reading the code" to "prove it by running it". New build guards now fail on a duplicated rule, a missing note, a dead rule cross-reference, or a boot-order list that has drifted from the real code.
- Added a "where does this feature live" code map and a quick-reference index so a working session can find any subsystem without guessing, plus a build check that fails if their file references ever go stale. Audited the project's private reference notes against the actual code and corrected several that had drifted, and gave the reusable quick-start primer a real home inside the project — rewritten as a pointer to the real rules rather than a second copy that could silently disagree with them.
- Turned a long-standing internal layering rule into one the build enforces: the screen-drawing code only draws, only the save code writes saves, the game data is read-only, and the online-services code can't reach up and redraw the screen. Today's existing boundary crossings are locked in as an accepted ceiling so the tally can't grow — any brand-new crossing fails the build and names the file — while the existing ones are left to be untangled properly in a later dedicated pass. Proven by adding one new crossing, watching the build fail and name it, then undoing it.
- Ran three read-only audits, all of which came back clean. A phone load-performance measurement confirmed the app's own code is already lean and isn't what you wait on. A full sweep for hidden internet reliance confirmed the offline promise is airtight — every part of starting up, every screen, and every on-device tool loads only from your own device, and the only networked features (the AI Director, cloud saves and sign-in, and the screenshot scanner's optional AI fallback) are cleanly walled off. And a dependency and security-hygiene check reported zero known vulnerabilities, with both pieces of outside code the live site loads pinned to fixed versions and user, AI, and imported text confirmed to be cleaned before it's shown.
- Did a housekeeping pass over the code and internal records: removed dead code and developer print-outs, deleted a redundant second test runner that ran about thirteen times slower and caught nothing the main suite didn't, moved the Karma Center's companion list into game data, and dropped hand-kept figures (a stale test count that had to be copied into eight files, and outdated file sizes) that only described inventory and just rot over time. Nothing about how thoroughly the app is tested changed — the full suite still has to pass cleanly before anything ships.
- Fixed the private staging test site freezing on an old build so new work never appeared and the "Reboot Terminal" prompt did nothing — its offline-caching step was choking on a home page the staging host redirects, which browsers refuse to cache, and because that step is all-or-nothing the single bad entry aborted the whole update. The live production site was never affected. Separately, made backing up the developer-only notes and design files automatic rather than something anyone has to remember, put the outstanding Firebase App Check security work on the roadmap in writing, and added an automatic cloud-save safety check that reads the real list of saved fields straight from the code and flags any the cloud database couldn't store faithfully. The installed app's public address is deliberately unchanged, so nothing about the app on anyone's phone is affected.

---

## [v2.8.0] — The Physical Machine<!-- Date: 2026-07-10 | Tests: 2951/2951 | Cache: robco-terminal-v2.8.0-r4 -->

### Hotfix

- Fixed the LEVEL UP button unexpectedly jumping the screen down when tapped. Leveling up now stays exactly where you were on the page — you'll still see how many skill points you've earned and that they're waiting for you in SKILL MATRIX.
- Fixed the site's automatic publishing step so it no longer stalls before reaching the live site. Infrastructure only — nothing you can see changed.
- Fixed the CHASSIS system status screen showing only 6 of your 8 feature switches. All 8 now show up with their correct on/off state, including the two for the on-device screenshot scanner.
- Internal only: corrected several stale references in the developer documentation (a couple of renamed behind-the-scenes functions and the startup script list) and added an automated check that fails the build if the docs ever again name a file or function that no longer exists. Nothing you can see changed.

### Added

- A living power core on the CHASSIS screen — a reactive reactor with tumbling 3D rings that responds to what's actually happening. It beats gently while idle, spins up and glows while the Director is thinking, flashes on a level-up, pulses on every save, warms from green toward red the longer it works, ripples when your connection returns, collapses to a point when powered down, and shows a red ring whenever an error is logged, among many other reactions. A second synthesized hum plays alongside it, and a mirror of the core sits in the terminal's top casing so you can watch it react from any screen. Tap it for a cosmetic kick, or press and hold to charge it up; tap its "?" for a plain-language guide to every behavior.
- Feedback you can see and feel, all over the terminal. Leveling up pops a Vault-Boy card; a faction crossing into Vilified or Idolized slams down an ink stamp; completing a directive punches its slot; discovering a location pings the map with an expanding radar ring; taking damage tears a flicker of static across your vitals; gaining XP floats a "+N XP" note; and using a chem, crafting, trading, sleeping, healing, equipping gear, and dozens of other actions each get their own touch. If one happens while you're on a different screen, a small readout at the top of the terminal announces it — tap it to jump straight to the screen that reacted. Everything respects reduce-motion and your Immersion setting.
- A Tool Deck beside the message box. A diamond button raises a compact panel with one-tap access to THREAT, V.A.T.S., TRADE, LOOT, CONSULT, and the V.A.T.S. calculator, so none of them need to sit permanently on screen. The old blind D-Pad shortcuts became a Quick-Draw Holster whose four gear slots visibly show what's bound to them, fire with a single tap, and can be rebound to a different item right there.
- A MODE switch on the Comm-Link message box. A pill beside the help button flips between OVERSEER (the AI narrator) and TERMINAL (typed commands handled instantly on your device, no AI call). In TERMINAL mode, natural one-liners like "killed 3 raiders", "+50 caps", "arrived Novac", or "rep NCR up" record straight to the right tracker — comma-separate several on one line to log them all at once — and you can set or nudge any stat, S.P.E.C.I.A.L. attribute, or skill directly ("hp 80", "str 8", "guns 45", "+2 luck", "level up"). Start a message with `/` to send it to TERMINAL just that once, or put `@` anywhere to ping OVERSEER with the text after it. Matching command and quick-log suggestions appear as you type.
- A LEVEL UP button under your XP bar. It lights up once you've earned enough and raises your level by one with a tap, all the way to level 50 — no need to ask the AI. Leveling up also tells you exactly how many skill points you have to spend and jumps you to your skills so you can assign them yourself.
- Setting your location and fast-travelling from the map. Open a location on the cartography table and a TRAVEL HERE button sits beside MARK SURVEYED — tap it and that spot instantly becomes your current position, with the map updating right away, no AI round-trip. A confirmation card slides in at the top-right whenever you move somewhere, however you got there, and clears itself a couple of seconds later.
- New offline commands. Typing [GPS] or [MAP] jumps straight to your cartography table, and [PERKS] lists every perk you already qualify for at your current level, pulled from the game's own records. Instant, offline, no AI.
- Save version history and full backups. Each save slot — and each cloud save — keeps up to five earlier versions; a "VER" button lets you view when each was saved and restore any of them, confirm-gated and with a safety backup of your current campaign taken first. A new EXPORT FULL BACKUP bundles your entire history — your live campaign, all three slots with their version history, and your automatic backups — into one portable file, and IMPORT SAVE restores it automatically after an integrity check (a corrupted or edited file is refused with nothing changed). IMPORT SAVE still accepts a single save file too.
- Offline cloud saving. Tapping "Save to Cloud" while offline queues that save on your device and uploads it automatically the moment you reconnect, instead of just failing. Only saves you chose to push are ever retried — nothing uploads on its own, and cloud saving stays a manual button.
- OVERWRITE and DELETE controls on every save. Each save in your list — local slot or cloud — has an OVERWRITE option that replaces its contents while keeping its name, and a DELETE option, both confirm-gated. Overwriting a local slot still keeps the version it replaced recoverable in its history.
- An IMMERSION setting (Full / Balanced / Minimal) for how much of the terminal's ambient atmosphere is switched on, remembered on your device. The terminal also visibly settles when you step away — the display dims after a couple of idle minutes with a small "reducing phosphor wear" note, and deepens into a slow breathing standby when you switch tabs — and clears the instant you touch anything again.
- Ceremonial moments. Starting a new campaign runs a short, skippable commissioning sequence that ends with the Director's greeting instead of two plain reset lines; the Director greets you the first time you open the Uplink each session; the first boot after an update calls it out during startup with a nameplate glint and a highlighted revision-log button; and coming back after a few days away adds a brief "recalibrating" boot line.
- A dedicated SETTINGS section — a sixth hardware button gathering your Account, the Module Bay, your Save Archive, and your Campaign Configs in one place.
- An INCIDENT LOG — a "big moments" view of your campaign showing just the milestones (level-ups, faction shifts, quest outcomes), separate from the fuller CROSSROADS RECORD that lists every recorded event.
- Smaller additions: THREAT warns you outright when a fight would burn more ammo than you're actually carrying; you can nudge a companion's rapport with you up or down right from their squad card; a level cap (50) and a scaling XP cap hold typed-in values to what's actually possible; your radiation reading can be dragged to set it directly, like your HP and XP bars; and a live one-line status preview shows on every board even while it's collapsed.

### Fixed

- Closed a data-safety gap where an unusual or corrupted response from the AI could silently turn one of your character's core stats into an invalid value — it's now safely ignored instead, so your character sheet can't be corrupted this way.
- Faction reputation alerts now fire in Fallout 3 as well. Crossing into Vilified or Idolized standing with any faction reliably shows the on-screen alert in both games; previously the alert only recognized New Vegas faction names, so Fallout 3 campaigns silently never triggered it.
- The inventory filter no longer offers a "Mods" filter in Fallout 3, where weapon mods don't exist and it could never show anything.
- Your radiation reading is now capped at the level where radiation actually becomes fatal, whether you type it in yourself or the AI reports it — previously it had no upper limit and could be pushed past that point.
- Confirmation dialogs no longer show two separate "cancel" buttons that did the same thing — every one is now a clear CONTINUE and a clear CANCEL. And wiping the terminal while Complete RNG is armed now warns you up front that doing so locks it on permanently, instead of finding out afterward.
- Cleared a burst of harmless "audio blocked" warnings from the browser console right after opening the terminal — the background hum and warning tones now wait for your first tap, exactly like the boot sound already did.

### Changed

- The terminal now looks and feels like a physical RobCo device. A casing with brand plating and status lamps frames the screen, and the plain tab bar is replaced by a row of illuminated hardware buttons — OPERATOR (your stats), OPERATIONS (inventory and crafting), DATABANK (quests, the map, and records), UPLINK (the AI comm-link), and CHASSIS (device status). Number keys 1–5 jump between sections exactly as before, a new DIRECTORY button (or the 0 key) opens a plain list for anyone who prefers it, and each section now remembers exactly where you'd scrolled to. The casing's PWR, UPLINK, and FAULT lamps are functional — powering the terminal off, jumping to your AI settings when the link is live, and opening the error log. On a desktop the casing has real framed depth; on a phone it stays a clean, compact edge with the hardware buttons docked at the bottom.
- Your OPERATOR screen is rebuilt as hardware. Health, level, and radiation read out as glowing patient-monitor traces you can drag or type to set; S.P.E.C.I.A.L. is a row of draggable sliders with stepper buttons; and your limbs are a tappable anatomical diagram that blinks where you're hurt. Skills are lit signal-level meters you can drag, status effects are colour-coded indicator lamps with tick countdowns, faction standing is one shared reputation console with a channel selector (major and minor factions grouped), and karma is an EVIL–GOOD swing needle. Your perks, traits, skill books, magazines, and collectibles all get matching hardware boards — the curio archive shows each collectible as its real object behind glass. Everything is still editable exactly as before.
- Your OPERATIONS screen is a quartermaster's freight console. A load-cell weigh bridge shows your carry weight as a physical beam that sags the more you carry, turning amber near your limit and locking red with a SEIZED stamp when you go over. Your inventory is six pull-out drawers (Weapons, Apparel, Aid, Mods, Misc, Ammo) with a live count and search on each, and the drawer you last opened is remembered. Every item has a quantity stepper, weapons and armor can be equipped straight from their row, and the crafting bench shows a fill meter for every ingredient. Bottle caps and carry weight moved onto the weigh bridge alongside the rest of your cargo.
- Your DATABANK screen is an archival cartography station. The world map is rebuilt as a real spatial chart — surveyed locations glow as points connected by the routes you've actually travelled, with a rotating survey sweep, a blinking "you are here" marker, and uncollected snow globes, bobbleheads, and Lincoln memorabilia shown as distinct signal-return symbols. Your quest log is a numbered directive rack with status lamps, filterable and searchable, and each quest has a CYCLE button to advance its status yourself. The search panel, campaign record, notes, and session stats all got matching makeovers.
- The Comm-Link is now a living Director Uplink. An oscilloscope-style waveform above your conversation reacts to what's happening — a calm hum while listening, a jagged trace while your message sends, a steady pulse while a reply arrives, and a flat line when there's no key or no connection — and names the game you're playing. The whole view got a modern, messenger-style redesign: your conversation and typing box are one rounded card with the photo, mode, help, and send controls in a single row, every line reads left-to-right at full width with a tag naming who's speaking, and on a phone the Uplink is a compact self-contained view with a small strip on every other screen so the Director never fully disappears.
- Security & Configuration is now a Module Bay. Open a service hatch once and your settings appear as labelled hardware boards — a phosphor tube rack for screen colour, a sonic processor board for sound, a power cell bay, an atmospheric regulator dial for immersion, an AI uplink board for your key, and a maintenance tray — instead of a flat list of toggles. Installing or ejecting hardware gives a tactile click or thunk and a brief settle, and a "Schematic View" button always gives you the old flat list. Every setting does exactly what it did before, in the same one tap.
- The CHASSIS section is its own SYSTEM STATUS screen, showing your device's uptime, firmware, connection, and feature availability across labelled boards, plus an error log — alongside the living power core described above. Your campaign kill/caps/damage stats moved into their own CAMPAIGN LOG in DATABANK, so device information and campaign information are no longer mixed together.
- Your Campaign Configs look and feel like hardware. The game you're playing is a stacked pile of program cartridges with the active one on top; your playstyle is a two-way switch; your playthrough type is a rotary dial you drag, tap, or arrow through with its full name and description always shown; and Complete RNG is a breaker switch under a safety cover with a clear Safe / Armed / Sealed status. Swapping games now asks you to confirm first, since it reboots into that game's own separate campaign.
- Using an item now works instantly and offline. A Stimpak, RadAway, chem, or food applies its actual effect right away — healing, removing radiation, mending a crippled limb, clearing an addiction or poison, or granting a timed buff — instead of sending a message to the Director and waiting for it to narrate the outcome. The USE button only appears on items that can actually be used, and a line in your log confirms exactly what happened.
- Visual Upload reads your screenshot on your own device by default. Attach a screenshot and it scans the image itself, with no round-trip to the Director, and works fully offline once you've used it at least once. It still shows you exactly what it found on a review screen to correct or leave out before anything is added to your campaign, and it quietly hands off to Director vision if the on-device scan can't run — or on request, with a TRY AI VISION button.
- Your Campaign Notes are now purely your own manual notebook. Automatic event entries (level-ups, faction changes, quest updates, and more — now including collectibles, crafting, trading, and resting) live in the campaign's event history, shown in CROSSROADS RECORD and the new INCIDENT LOG, instead of being mixed into your typed notes. The AI can no longer overwrite your notebook — your written notes are yours alone — and recorded events now show a real in-game date and time instead of a cryptic tick count.
- Your ACCOUNT status now reflects reality instead of a mostly-fixed message. Signing in or out, and your connection dropping or coming back, update it immediately — no reload needed — showing whether an operator is on record and whether your archives are syncing to the cloud.
- Your saves list now only shows saves for the game you're currently playing, keeping New Vegas and Fallout 3 saves apart. An older save that predates this change is still shown, since there's no way to tell which game it belongs to.
- Smaller changes: the four separate transcript-export buttons became one EJECT HOLOTAPE control with a TXT/MD/HTML format picker, and the always-visible quick-command row and D-Pad below the message box are gone, replaced by the Tool Deck.
- Removed three unused or redundant features: the Projected Timeline (which never generated anything), the TERMLINK console (the Tool Deck already reaches everything it launched), and the typed CROSSROADS command (its panel is always open anyway). Everything they reached still works exactly as before.

### Improved

- On a phone, the boards across every screen sit a little closer together — tighter spacing, trimmed headers, and less padding — so you scroll noticeably less, while every control stays comfortably large enough to tap and desktop looks exactly as before.
- The databank lookup now also searches your collectibles, skill books, magazines, traits, and Lincoln memorabilia, and surfaces a few previously-hidden details when it finds a match, like a quest item's purpose or a creature's experience yield.
- Confirmation prompts and status messages now appear as in-terminal pop-ups that match the rest of the interface, instead of your browser's plain "OK/Cancel" dialog boxes.
- Your current-session time now reads in a friendlier format (like "2h 15m") instead of a raw minute count.

### Under the Hood

- Built a single "living machine" engine that drives the terminal's ambient atmosphere from one place, tracking what the device is doing (starting up, active, idle, standby, shutting down) and enforcing your Immersion setting so every ambient effect honours it. It fails safe — if it can't start, the terminal behaves exactly as before — and never touches your campaign.
- Moved your saved games, automatic backups, and device settings onto larger, more durable browser storage, lifting the old size ceiling that could make a big save fail. Existing data is copied over safely in the background, everything falls back to the old storage if the new one is ever unavailable, and device settings are now self-healing from a durable backup if the browser ever clears one.
- Rebuilt the campaign's event history into one structured record that CROSSROADS RECORD and the new INCIDENT LOG are simple filtered views of; existing saves convert on load without touching your own written notes. Key moments (level-ups, faction thresholds, critical health) now flow through one internal messaging system, which is what made the Fallout 3 faction-alert fix and the expanded event history possible without duplicating logic.
- Consolidated every confirmation and pop-up onto one shared in-terminal system in place of the browser's native boxes, and routed all device settings through one consistent internal pathway with a check that they can never mix with your campaign save.
- Gave each supported game a much richer internal "identity" profile (its device look, personality, boot style, and Director flavour) in one place, so future updates can build a game's whole appearance from data; a design-only Fallout 4 profile was added purely to prove the system scales and changes nothing you can see.
- Built a staging-only DIAGNOSTIC SHELL — a floating developer console, never visible on the live site, with live engine readouts, an on-demand trigger for every ambient animation and boot variation, and test scenarios — and laid the groundwork for a future in-game hacking minigame to one day unlock a safe, read-only version of it. A new project rule requires every hard-to-reproduce feature to ship with its own on-demand trigger.
- Restructured the AI's instruction assembly and the app's startup routine into smaller, clearly-named pieces, each verified to behave identically — a safety check confirms the AI receives word-for-word the same instructions as before, and a full mobile/desktop check confirms startup is unchanged.
- Restructured the on-device screenshot scanner so Visual Upload can read images locally, and added a much deeper automatic test that runs the character-sheet import code against dozens of broken and hostile inputs — which is what caught the data-safety gap noted above.
- Wired up the terminal's bot-protection layer with its real public site key, testable on staging without ever affecting the public site (only a public identifier is involved, and the app stays fully usable if the layer is unreachable).
- Sped up and de-duplicated the test gate — the browser checks now share one browser instead of launching four, the suites no longer run twice to read back their count, and a release no longer re-tests an already-tested commit — tidied the Node test runner, and added a fast developer-only pre-check.
- Removed dead and duplicated code paths (an unused effect, leftover helpers, and copy-pasted timers and renderers now merged into single shared ones), tidied the repo layout, documented where the two games' reference data genuinely differs, and locked every change in with new automated tests.

---

## [v2.7.0] — Native Systems & Two Wastelands<!-- Date: 2026-06-30 | Tests: 1557/1557 | Cache: robco-terminal-v2.7.0-r5 -->

### Hotfix

- Tapping [TRADE] reliably opens the BARTER UPLINK trading panel and brings it into view. Previously the panel opened correctly but was left off-screen below the other inventory panels, so the button looked like it did nothing.
- Opening the TERMLINK console — or running any built-in command — no longer pops up your phone's on-screen keyboard. The keyboard stays down until you actually tap the typing field, while on a desktop the cursor still returns to the command line so you can keep typing.
- Strengthened the retro CRT texture of the HIGH-LUMEN OPTICS high-contrast mode: its scanline overlay reads more clearly while text stays just as crisp and legible. Normal display mode is unchanged.
- Added quick panel navigation from the Comm-Link. Type a panel's name or a common nickname — "inventory", "stats", "skills", "perks", "quests", "factions", "map", "crafting", "barter", "status", "health", "log", "settings", or "databank" — and that panel opens instantly and offline, with no AI. Anything that isn't a panel name still goes to the Director, so a full "consult deathclaw" lookup keeps working.
- Clarified in the project documentation how each game's full data tables reach the AI and power the offline tools. Documentation only — no change to the app.

### Added

- Six built-in offline terminals that give real Fallout answers on your own device, with no AI call and no network — the headline of this release. A BARTER UPLINK trading screen (INV tab, or the [TRADE] button) where you pick a vendor and buy from their stock or sell from your pack at real barter prices driven by your Barter skill, with a vendor only paying up to the caps in its purse. A CONSULT databank (a typed command, a Comm-Link button, or a persistent DATABANK panel on the DATA tab) that looks up any item, perk, quest, location, companion, or creature from the game's own data and says "NO ENTRY IN DATABANK" rather than inventing anything. A BIO-SCAN medical advisory that reads out your health, radiation, and each limb's condition and recommends the right healing, rad-removal, or addiction treatment. And a LOOT salvage picker that searches the item database and adds anything to your pack at its real value. Every transaction is confirm-gated and never auto-syncs to the cloud.
- A TERMLINK command console — a single launcher (a Comm-Link button or the [TERMLINK] command) that lists all six offline tools with a one-line description each, so any of them is one tap away. Works the same in either game.
- A "?" help button on the save menu that opens a plain-language field manual for every save tool — Export, Import, Restore Backup, the A/B/C slots, cloud save and load, and how auto-save works.
- A SUSTAINED POWER CELL option (Power Management) that keeps your screen from dimming or sleeping while the terminal is open — handy for reading on a phone. Off by default, re-asserts itself when you switch away and back, and quietly disables itself with a note on devices that can't keep the screen awake.
- A HAPTIC SOLENOID option that gives your phone a brief buzz on key moments — a pulse on level-up, a double-buzz when a faction flips to Vilified or Idolized, and a warning buzz when your health drops into the critical zone. Off by default, disables itself on devices without a vibration motor, and stays silent if your system asks to reduce motion.
- An EJECT HOLOTAPE button that hands your Comm-Link transcript to your device's share sheet — a one-tap send to Messages, email, or any app — falling back to copying it to your clipboard, then to saving a text file, if sharing isn't available.
- A directive count badge on the installed app icon showing your unresolved quests while the app is in the background, cleared the moment you open the terminal. Appears automatically on platforms that support app-icon badges; does nothing elsewhere.
- An OVERSEER'S LOG panel (DATA tab) — a maintenance read-out of your time in the terminal: current session uptime (live), longest single session, total power-on time, and boot count. Quiet flavour that builds over time, stored only on your device and never uploaded.
- A HIGH-LUMEN OPTICS high-contrast display mode for bright rooms or low vision: a pure-black background, no phosphor glow, every dimmed label lifted to full strength, and a quieter scanline — all while keeping your chosen optics colour. Turns on automatically if your operating system already asks for higher contrast, and is remembered on your device.
- A PIP-BOY RADIO station (Audio Systems) — a soft bed of static, a warm drifting carrier tone, and a slow trickle of gentle synthesized beeps, all generated live in your browser, so it adds zero download size and contains no copyrighted music. Off by default, respects Master Mute, and only ever starts on a tap or keypress.
- More character in the boot-up sequence. The very first power-on runs a longer "cold start" self-test with a BIOS banner and a counting memory check, and once in a while any launch boots in a rare "degraded tube" mode where the screen flickers like a cold CRT warming up before it settles. Purely cosmetic — every boot lands you in the same terminal, and the flicker holds still if you've asked your device to reduce motion.
- A LOG VISIT button on the world map. Any location you haven't reached yet can be marked visited straight from the map, flipping it from [UNKNOWN] to [VISITED] permanently — so you can record somewhere you'd been on your own, not just where the story moved you. A one-way mark, saved on your device, never contacts the AI.
- Its own colour and identity for each game. New Vegas boots in the classic bright RobCo green and Fallout 3 in a distinct, duller Pip-Boy green, applied automatically when you switch (still overridable from the OPTICS picker, which now offers Pip-Boy green to either game; a colour you pick by hand sticks across both games). The boot screen also names your Pip-Boy and region — "MOJAVE WASTELAND UPLINK" versus "CAPITAL WASTELAND UPLINK" — and the SAVE menu's archive list carries a matching banner. Flavour only, entirely offline.

### Fixed

- Loading a saved game now actually loads it. Importing a save file, restoring a backup, or loading a cloud save could appear to do nothing — the terminal kept showing your current data — because a routine "save on exit" step fired during the reload and overwrote the loaded save with your old data first. All three load paths now load correctly, including older and reconstructed saves.
- The "REBOOT TERMINAL" update prompt now reliably appears after a new version deploys — in a browser tab and, especially, in the installed app, where the device usually resumes the terminal from the background instead of reloading it. The terminal re-checks for a waiting update whenever you return to or focus it, so a freshly-deployed version no longer sits unseen in the background. Brand-new first-time installs correctly stay silent, since there is nothing to update from.
- The world map permanently remembers everywhere you've been. Moving from one location to another used to flip the place you left back to "UNKNOWN" — only the AI could mark somewhere visited — so setting your location by hand never recorded it. True to Fallout fog-of-war, anywhere you've been now stays "VISITED" across reloads.
- The terminal no longer occasionally loads the full desktop layout on a phone (most often on the first launch after an update, until a manual reload). The fixed two-column desktop layout is now locked to actual desktops with a mouse, so a touch phone or tablet always gets the mobile layout even in the brief moment the browser mis-measures the screen after an update.
- Quest, item, and perk name autocomplete now works in Fallout 3 campaigns. The autocomplete helper previously only loaded for New Vegas, leaving all three inputs silent in Fallout 3.
- Fixed a batch of mobile text-wrapping and layout glitches on narrow screens: config labels, map names, the region collectible badge, inventory type tags, the macro command buttons, and the COMPLETE RNG label no longer break mid-word, stack into vertical single-character columns, or overflow. Map names wrap or truncate cleanly with the full name in the tooltip, and the inventory USE button is compact with a proper tap-target height.
- The power-on hum no longer plays detached mid-session. Browsers won't let any sound play until your first tap, so if you didn't touch anything during boot the hum used to fire awkwardly later, the first time you opened a menu. It now only plays while boot is still in progress, or not at all.
- The BARTER UPLINK trading screen now refreshes when you switch vendors, updating the vendor's purse and the buy and sell lists in place instead of leaving the previous vendor's details on screen.
- Corrected a batch of game data against the Fallout wiki so autocomplete no longer suggests fakes and the AI gets accurate stats. Removed entries that aren't real (a non-existent "Fires of Anchorage" quest, a duplicate "Strictly Business", a fabricated "O'cta Brain" weapon, and a New Vegas armor that had leaked into the Fallout 3 database), added the two real Operation: Anchorage quests that were missing, fixed several wrong armor stats (the Mysterious Stranger Outfit, 1st Recon armor, and others), and renamed mislabeled map locations (two regions both called "Vault 92", and a made-up "Vault 92 South" now correctly "Bethesda Offices East").
- Fixed two private-test-build glitches — the in-app changelog showing "CHANGELOG NOT FOUND", and the offline engine failing to update — both host-configuration issues on the staging preview that never affected the public site.

### Changed

- None of the six built-in tools — V.A.T.S., THREAT, TRADE, CONSULT, BIO-SCAN, and LOOT — contacts the AI anymore. Each reads the game's own data and computes its result on your device, instantly, offline, and identically every time.
- The V.A.T.S. calculator became a fully offline, deterministic tool instead of deferring to the AI. It reads your equipped weapon, SPECIAL, skills, and active chem buffs and shows an estimated hit chance per body part, your critical-hit bonus (+5% in New Vegas, +15% in Fallout 3), and — for melee and unarmed weapons — an exact strike optimiser (how many strikes your Action Points afford, damage per strike after the target's armour, and the best body part to hit), with a TARGET DT field for the enemy's armour. Ranged hit chance stays a clearly-labelled estimate, since the exact per-weapon spread isn't published game data. It also correctly recognises each game's full weapon-skill set, so a Fallout 3 character built around Big Guns is no longer ignored.
- The THREAT assessment became a fully offline, deterministic tool instead of asking the AI to size up an enemy. Name a creature and the terminal looks it up in its bestiary and shows a stat card — health, damage threshold, attack damage and rate, resistances, and its weakness — then, against your equipped weapon, estimates the time and ammo (or strikes) to bring it down. If the creature isn't in the bestiary it says so plainly rather than inventing stats.
- The in-app changelog viewer was redesigned into a clean, readable "FIRMWARE REVISION LOG" — one version at a time with a dropdown to any past release, notes grouped into collapsible Added/Fixed/Changed/Removed sections (newest open), tagged and bulleted in the terminal's voice, held to a comfortable reading column on wide screens and full-width on phones, with an EXPAND ALL / COLLAPSE ALL button. The window stays a fixed size as you open and close sections — the notes scroll inside it — so it never jumps around.
- Gave the whole interface one consistent in-world terminal voice. Input prompts and empty-state messages are terse and uppercase, the account panel speaks in "uplink" terms, the update notice reads "FIRMWARE UPDATE STAGED", and the assistant's error messages speak as the in-world Director Link rather than naming "the AI" or the underlying service. The install prompt and app shortcuts also drop the real game name so the app reads as a generic wasteland terminal. Only the wording changed — sign-in, your key-entry field, and every screen-reader label are exactly as before.
- Brought the in-terminal command reference (the "?" / [FEATURES] menu) back in line with what the terminal actually does. The six offline tools are grouped under a clear "NATIVE TERMINALS — OFFLINE, NO AI" heading with accurate descriptions and shortcuts, and a pile of commands that no longer exist were removed, so the menu only shows things that actually work. It's now kept honest automatically so it can't silently drift out of date again.
- Folded the Session Statistics panel into the Overseer's Log so all your run-time figures sit in one place, under two clearly labelled sections — device telemetry (power-on time, longest session, boot count) and campaign figures (kills, caps earned, damage dealt, play-time, location visits, collectibles). The two different "time" figures are now labelled distinctly so they're never confused, and a button still zeroes the campaign counters.
- Your optic colour is remembered per game instead of across the whole app. A colour you pick while playing New Vegas sticks for New Vegas, and Fallout 3 keeps its own separate choice, each restoring on switch (or that game's default if you never changed it). The OPTICS picker marks the current game's default with "(Default)".

### Under the Hood

- Made the two games' behaviour fully data-driven so a future Fallout title can be added by dropping in its data instead of editing logic — the new-campaign seed items, game-switching, faction lookups, and the choice of which data to load at startup all read from a single per-game manifest now.
- Locked the built-in tools onto verified, canon-accurate Fallout numbers (prices, V.A.T.S. accuracy, ammo use) taken straight from the wiki, so each computes a real in-game result offline. The one honest exception is recorded in the open: an exact ranged hit-chance can't be reproduced because the per-weapon spread figures aren't published anywhere, so that number is flagged as an estimate. Retiring the old AI trade screen in the process, a caps bug was caught and fixed — a trade updated your caps but a later save could restore the old total.
- Hardened data safety on load. Saves are defensively cleaned on import so a corrupted or hand-edited file can't carry bad tracker or reputation data into your campaign, and a full cloud round-trip is now tested to prove every tracker and faction standing survives a save-and-restore untouched.
- Repaired and guarded against symbol corruption — garbled dashes, arrows, and special characters that a bad text-encoding write had introduced into the AI's instructions and the docs, which showed up as mojibake in the in-app changelog. The build now fails on any such corruption in a source or doc file.
- Made the terminal only rebuild panels whose data actually changed on each AI response (and skip the world map entirely when it isn't on screen), and built the AI's engine list and settings reads more efficiently — all with no visible change.
- Closed a couple of potential cross-site-scripting holes by safely escaping externally-sourced text (such as an AI model name) before it's shown, with a build check that fails if any externally-sourced value is ever placed on the page unescaped.
- Taught the in-app changelog whether it's running on the private test build or the public site — staging shows in-progress notes, the public site only released ones, defaulting to public whenever it can't tell — and gated the public site to publish only on an actual release, never on ordinary work.
- Removed dead and duplicated code (an unused effect, leftover helpers, and copy-pasted timers and renderers now merged into single shared ones — including one shared renderer behind both skill-tracker panels), and tightened the boundary between cloud-sync and campaign data, all locked in with tests.
- Added a nightly automated test run and automatic private-staging deploys, restored the on-screen "DEV BUILD" badge on staging (guaranteed never to reach the public site), converted two dormant on-screen banners into reusable hidden templates, refreshed and automated the in-browser test page, and added live build/test/deploy status badges to the README.
- Tidied the repo (planning docs moved to a private folder, the internal test runners renamed) and added standing project rules and build checks so game-specific hardcoding, symbol corruption, changelog heading mistakes, stray junk files, and test drift all fail the build going forward.

---

## [v2.6.0] — Content, Crafting & Trackers<!-- Date: 2026-06-28 | Tests: 1078/1078 | Cache: robco-terminal-v2.6.0-r1 -->

### Added

- Skill Books and Skill Magazines trackers. A SKILL BOOKS panel tracks all 13 skill books for the active game (New Vegas or Fallout 3), and a SKILL MAGAZINES panel tracks all 14 New Vegas magazines, each split into live READ and UNREAD lists you move items between with a tap, showing the skill each raises or boosts. Both are individually collapsible and remember their state across reloads, and the AI knows what you've read.
- A Craft panel (INV tab). Pick a recipe from a station-grouped list — workbench, campfire, or reloading bench — and see live have/need ingredient checks, a skill indicator, and batch crafting with a MAX button, with a matching Scrap/Breakdown picker beside it. Crafting and scrapping consume and produce real inventory behind a confirmation prompt, local only and never auto-synced. It's backed by structured Fallout data: 25 New Vegas recipes, 12 breakdown entries, and 7 Fallout 3 schematics.
- A Traits subsection under the Perks panel (New Vegas only — Fallout 3 has no traits). All 16 traits with their benefit and penalty; mark which your Courier took at character creation, see the count against the usual limit of 2, and filter by name. Picking a third trait is blocked with a clear message, though deselecting always works.
- A Lincoln Memorabilia tracker (Fallout 3, in the Collectibles panel). Track each of the 9 Head-of-State artifacts: mark items found, then record who you gave them to — Hannibal Hamlin, Leroy Walker, or Abraham Washington — with a running tally per buyer and location hints for missing items.
- Collectibles now mark their region on the world map. Every New Vegas Snow Globe and Fallout 3 Bobblehead is linked to its map cell, so the grid highlights any region where an uncollected one is waiting; Fallout 3 Bobbleheads had never appeared on the map before, and a few mis-placed New Vegas globes were corrected. Fallout 3 Lincoln Memorabilia likewise flags its museum region until collected.
- The Vault 13 Canteen is placed in your inventory automatically when you start a brand-new New Vegas campaign. It never appears in Fallout 3, never duplicates on reload, and never fires for a save that already has progress.
- A large expansion of each game's reference data, all sourced from the Fallout wiki, so the AI knows more items and autocomplete suggests more of them: Fallout 3's quest catalog grew to cover every add-on's quests, its armor and quest-item lists roughly doubled, and its location list expanded to 90 sites; New Vegas gained dozens more consumables, 25 more vendors, 41 unique apparel entries (including Benny's Suit, the Suave Gambler Hat, and the Vault 13 Canteen), and 22 more minor map locations.

### Fixed

- The S.P.E.C.I.A.L. fields no longer fight you while typing. Clearing a field to retype it used to snap it back to 1 on every keystroke; the field is now free to edit and only validates when you leave it — blank or invalid reverts to your last saved value, out-of-range numbers clamp to 1–10, and derived stats update right after. Values can never be saved above 10.
- Faction reputation no longer jumps straight to Idolized or Vilified. The Fame and Infamy buttons move 5 points at a time instead of 50, so a single click no longer skips past every intermediate standing, and the tier thresholds were corrected to canonical New Vegas values — NCR, Caesar's Legion, and the Brotherhood of Steel each have their own breakpoints, and every other faction uses the standard scheme.
- Several panels now show the data for the game you're actually playing. The Skills panel shows Fallout 3's Big Guns and Small Guns (hiding the New Vegas-only skills), and the location autocomplete lists the active game's places instead of a fixed New Vegas list that used to show up in Fallout 3 campaigns.
- Switching between New Vegas and Fallout 3 now sticks after a reload. The choice used to revert silently on every reload because the old game overwrote the new one on the way out.
- The AI can now un-equip weapons and armor. A cleared slot used to be treated as "no instruction" and the old item kept; it now clears correctly.
- The AI's returned data is validated before it reaches your campaign. Invented collectibles are filtered against the game's own catalog so phantom entries can't appear in your tracker, and status-effect types are normalized to a clean BUFF / DEBUFF / NEUTRAL label.
- The in-app patch notes viewer shows the current release notes instead of an empty placeholder section, skipping the unreleased block and hiding the header comments.
- The home-screen shortcut icons fill the tile edge-to-edge with a clean green glyph and no gray ring or baked-in label, matching each other on Android and iOS.
- Lincoln Memorabilia polish: clicking a missing item whose name contains an apostrophe no longer throws a "SYSTEM FAULT", the buyer tally updates immediately when you assign an item, and the redundant "Other" disposition was removed (anything saved as "Other" becomes "Found", so no data is lost).
- Corrected a couple of catalog errors — a duplicate "Strictly Business" quest and a "Georgetown West" spelling — and added a safeguard that blocks duplicate catalog entries going forward, while still allowing a shared name across genuinely different item types.
- Small layout fixes: the OPTICS label no longer wraps to a second line on desktop, and the Bobbleheads and Snow Globes header no longer appears twice.

### Changed

- The trackers were tightened into a compact one-line format — status tag, name, and detail all on one row — and the Traits, Bobbleheads/Snow Globes, and Lincoln Memorabilia lists each became individually collapsible, defaulting to collapsed and remembering their state across reloads (stored separately from your save, so it never touches your character data).
- A lone last faction card is centered on its row instead of left-aligned with blank space beside it — most visibly Mr. House when there's an odd number of major factions on mobile's two-column layout.
- The update prompt became a full-screen blocking reboot dialog that must be acknowledged with REBOOT TERMINAL; it can't be dismissed any other way, and only appears when an update is genuinely waiting.
- All your saves — local slots and cloud saves — are listed together in one place under Security & Configuration, each clearly labelled [LOCAL] or [CLOUD] and consistently styled, with the Account panel focused on sign-in and identity.
- Saving to the cloud creates a new named save each time (you pick the name) instead of overwriting a fixed slot, automatically deduplicates identical saves, and warns you when loading if you have a more recent local save.

### Removed

- The old "Push Cloud Save" / "Pull Cloud Save" buttons and the Courier Save ID field were replaced by the unified save list and the new "Save to Cloud" button.

---

## [v2.5.0] — Living Operating System<!-- Date: 2026-06-27 | Tests: 747/747 | Cache: robco-terminal-v2.5.0-r1 -->

### Added

- Accounts and Google sign-in: sign in with Google to back up your campaigns to the cloud. Works in a normal mobile browser and in the installed app. You can also keep using the terminal fully offline without signing in.
- Cloud saves: save a campaign to your account and load it on any device. Uploading never overwrites an existing save, and loading or deleting a cloud save always asks you to confirm. Existing local saves can be moved up to the cloud.
- Optional Gemini key sync: when signed in, you can choose to store your Gemini API key on your account so it follows you between devices. Off by default; your key never leaves your device while it's off or you're signed out. A "GET A FREE GEMINI KEY" link points straight to Google AI Studio.
- App shortcuts with custom icons: on Android, long-press the installed app icon to jump straight to Comm-Link, Inventory, Stats, or New Campaign — each with its own Fallout-style icon. (iOS doesn't support app shortcuts.)
- New app logo: refreshed the terminal's icon.
- In-app error log: the new [LOGS] command opens a panel of recent errors the app caught, with a clear-all button. Stored only on your device, never sent anywhere.
- Privacy policy: a plain-English page explaining exactly what the app stores and where, confirming no ads, analytics, or third-party tracking.

### Fixed

- Loading a save with long item or quest names no longer stretches or clips the page on a phone — long text wraps to fit.
- The cloud save list no longer shows the date twice or hides the save name behind the buttons.
- A malformed or cut-off AI response can no longer corrupt your game — a bad response leaves your data untouched with a clear message.

### Improved

- A failing AI request retries a few times with increasing delays instead of looping forever, and rate-limit, network, and server problems each show a clear, specific message.
- An invalid or rejected Gemini key reports "KEY REJECTED" immediately and is never saved or synced.

### Under the Hood

- Save protection: every save is checksummed and version-stamped; loading verifies it, warns if a save looks damaged or newer-than-supported, and keeps three automatic backups before any load so an accidental load can be undone.
- Remote safety controls: cloud and AI features can be paused remotely without an update, each with a graceful fallback; a feature that keeps failing pauses itself for the session; the app always starts even if these checks can't be reached.
- Security hardening: stronger prompt-injection resistance, input-length limits, a strict content-security policy, a pinned Firebase library, locked-down database rules, and an automatic secret-scan on commit.
- Quality gates: a large automated test suite plus accessibility, start-up, and mobile-layout checks run before every release; a deploy check now ensures all published assets actually ship. Standard project files (license, security policy, dependency updates) added.
- Maintainability: the largest interface file was split into focused modules and the old start-up loader was modernized — no change to behavior.

---

## [v2.0.1] — Map Readability, Audio Depth & Campaign Intelligence<!-- Date: 2026-06-26 | Tests: 258/258 | Cache: robco-terminal-v2.0.1-r23 -->

### Added

- A Campaign Status Panel showing quest counts (total, active, completed, and failed), active-effect counts with an expiring callout, notable faction standings, and your 20 most recent crossroads decisions.
- The CROSSROADS command draws directly from your live save — current location, recent quests, the last several log entries, and faction changes — instead of the AI's memory, which could be stale or wrong.
- A redesigned world map with compass labels, a glowing border on your current zone, dashed borders for visited zones, amber badges for zones with uncollected items, and a tap-through detail view of sub-locations. Long zone names are abbreviated to fit, and a back button returns to the grid.
- Effects with one or two ticks left are highlighted amber with a blinking EXPIRING badge; permanent effects show an infinity symbol instead of a tick count.
- Automatic alerts when radiation crosses a danger threshold, the time of day shifts, or a chem is about to expire, plus a boot briefing that now includes active quests, notable standings, and expiring chems.
- A bar on each faction card showing the balance between Fame and Infamy, with threshold markers, and faction buttons sized to meet the phone tap-target minimum.
- Three new audio cues, each with its own toggle: a chime when a quest completes, a tone when a quest fails, and a beep when a faction reaches Idolized or Vilified.
- A full-map toggle button that stays visible regardless of screen width.

### Fixed

- The "new version available" notice became an amber bar across the top of the screen instead of a browser pop-up dialog, which mobile browsers can silently block. Tapping the bar applies the update and reloads — which previously did nothing — and the header's version number updates correctly afterward.
- The SEND button ("TRANSMIT PROTOCOL"), accidentally removed when the interface was rebuilt, is back — sending works by tapping it or with Ctrl+Enter — and a regression test guards against it silently vanishing again.
- A black screen on boot right after launch was corrected in a hotfix; the app's code had been accidentally removed and was restored immediately.
- Fixed a batch of world-map glitches on phones: cells render roughly square instead of thin slivers, the compact view loads correctly the first time the panel opens, switching tabs no longer resets your compact/full choice (which now persists across reloads and location changes), the map updates the moment you change location, and only the single best-matching zone is marked CURRENT — a location no longer flags another just because their names share letters.
- Fixed several mobile overflow and sizing issues: the world map (including the full 6×6 grid) no longer scrolls the page sideways or past the right edge, the character panel's number fields no longer stretch too wide or leave a stray vertical green line, and faction buttons stay compact in a row instead of stacking full-width.
- Tapping any input on iOS or Android no longer zooms the page in and leaves it zoomed. Input font sizes below 16px were the trigger — and because the zoom persisted across reloads, the page looked fine on a fresh visit but clipped the right side on every reload afterward. All inputs now render at 16px on phones.
- Reloading a saved game no longer stretches the character screen off the right edge — a long unbroken run of characters in saved chat, like a pasted link, now wraps inside its bubble. A fresh start never showed the problem because there was no saved chat yet.

### Improved

- First mobile layout pass: header and boot text wrap instead of overflowing, tab buttons stack when needed, input fields expand to fill available space, the faction grid uses two columns on narrow screens, and images and tables are capped at screen width.
- Added two extra overflow guards on phones: the page root element (in addition to the page body) now clips horizontal overflow, and status-effect animations that could shear content off the right edge are disabled on narrow screens.

### Under the Hood

- Strengthened the release safety net: the commit gate now blocks any release that forgets to bump the offline-cache version or tries to lower it, and both test runners were brought to parity after the Windows one had been silently skipping many tests.
- Added dozens of automated tests around the map fixes, layout invariants, and service-worker rules, plus an optional mobile-overflow render check, so none of them can quietly regress.
- Closed two ways a crafted save or AI response could inject code — companion numeric fields are coerced to integers before display, and the trade window no longer embeds item names into the page's script.
- The terminal warns you when a save approaches the browser's storage limit so you can export first, caps free-text inputs so an oversized entry can't bloat your save, and survives a corrupt save file by setting it aside and starting fresh instead of showing a blank screen.
- Fixed a broken data row in the Fallout 3 weapon database (the Fat Man had a stray extra field), normalized line endings across the project, and expanded the engineering rules and the plain-English changelog style guide — restyling the whole changelog to match.

---

## [v2.0.0] — The Universal Fallout Companion OS<!-- Date: 2026-06-25 | Tests: 206/206 | Cache: robco-terminal-v2.0.0-r13 -->

### Added

- The app is organized into four tabs — Stats, Inventory, Data, and Campaign — with keyboard shortcuts 1 through 4. Chat and the Tactical Dashboard remain visible across all tabs.
- Full Fallout 3 support: its own faction list, skill list, AI knowledge, item database, and a map of the Capital Wasteland. Selecting Fallout 3 in the Campaign tab switches all systems automatically.
- Save data lives in separate containers for Fallout: New Vegas and Fallout 3, so the two games never share or overwrite each other's data. Old saves migrate automatically on first load, with your original save kept as a backup.
- A V.A.T.S. overlay that calculates hit percentages for all body regions using your actual character stats.
- Point-of-no-return warnings from the AI before major story events, faction lockouts, or irreversible quest branches. Fallout 3 mode covers its own key story moments.
- Skills boosted by an active chem or magazine glow green while the effect is running, and clear automatically when it expires.
- Fallout 3 mode replaces the Faction Standing panel with a Karma panel showing your current karma tier, threshold labels, and companion availability notes.
- Collectibles tracking: 7 Snow Globes for Fallout: New Vegas, 20 Bobbleheads for Fallout 3. A panel badge shows how many you have collected.
- A Regional Zone Map: a 6×6 grid with a blinking cursor on your current location, breadcrumb markers for visited zones, and amber markers for zones with uncollected items. Clicking any zone zooms to a detail view with sub-locations. On narrow screens the map shows 16 central zones by default, with a FULL MAP button to expand.
- An in-game Calendar showing the current in-game date in a readable format (for example, OCT 19, 2281) using each game's accurate starting date.
- A New Campaign flow: a Wipe Terminal button with a double-confirmation step that resets all data and prompts for game selection.
- Save slots now display which game they belong to. Loading a save from the wrong game shows a warning before proceeding.
- When the AI updates something in a tab you are not currently viewing, the app switches to that tab and opens the correct panel automatically.
- Five new audio cues: a click when opening or closing a panel or switching tabs, a hum that shifts pitch while waiting for the AI, a three-note chime on level-up, a slow heartbeat below 25% HP, and a power-on drone on your first interaction after boot.
- API errors display as fictional RobCo exception codes rather than raw error text.
- Collectibles count shown in the session statistics panel.

### Fixed

- Switching games now fully reloads the app so no stale data from the previous game bleeds through.
- The AI can no longer accidentally switch your active game by returning the wrong game context.
- Undo now works correctly for both AI-synced state and manually imported saves.
- Cloud sync now transfers data for both games in a single push or pull.
- Map cells shortened slightly so the full 6×6 grid fits on desktop without scrolling.
- Calendar inputs now use real month, day, and year fields; they sync in both directions.
- The draggable XP bar syncs correctly when you change levels.
- A white-flash HP warning on iOS was replaced with a proper colored overlay.
- Wipe Terminal now actually resets your data.
- The XP formula corrected to match the actual Fallout engine values.
- The Complete RNG mode gained a third "locked" state: wiping the terminal while RNG is active locks it permanently for that campaign.
- Faction tier assignments corrected for several factions to match the intended UI layout.

---

## [v1.6.8] — Pre-Release Architecture<!-- Date: 2026-06-24 | Tests: 206/206 | Cache: robco-terminal-v1.6.8-r22 -->

### Added

- A Campaign tab (keyboard shortcut 4) was added to hold game context, playthrough type, Complete RNG mode, Wipe Terminal, and the Timeline display. Security and Config now covers only API key, display settings, audio, cloud sync, and saves.
- Complete RNG mode: a checkbox in the Campaign tab that, when on, shows a green banner and instructs the AI to make randomized narrative decisions. It is independent from Playthrough Type — any combination works.
- Perks now have delete buttons, matching quests and campaign notes.
- Clicking ACQUIRED or MISSING on a collectible now toggles it immediately without reloading the page.
- The help reference now shows all available commands in a formatted grid.
- The TIMELINE command now sends its output directly into the Campaign tab's Timeline panel instead of a pop-up overlay.
- Clicking any zone on the world map zooms in to a detail view listing every sub-location with visit and collectible markers. A back button returns to the grid. Tap targets were enlarged for mobile.

### Fixed

- The tab bar on phones now sticks to the top of the screen when you scroll down. Previously it scrolled out of sight.
- Playthrough Type is now saved with your character data and travels with exports, imports, cloud pushes, and cloud pulls. Previously it was stored only on the current device and lost on any transfer.
- Wipe Terminal now correctly resets all campaign data.
- Faction button clicks no longer collapse the Minor Factions section.
- RNG mode and Playthrough Type were originally merged into a single dropdown making combinations impossible. They are now a separate checkbox and selector; existing saves migrate cleanly.

### Changed

- Faction Fame and Infamy are now tracked as fully independent numbers, matching how Fallout: New Vegas handles them. Faction cards show Fame and Infamy separately instead of a single net score. Your standing is determined by the combination of both ranks.

---

## [v1.6.8] — Implementation Polish: Notes, Status, Squad, and UI Enhancements

<!-- Date: 2026-06-23 | Tests: 165/165 | Cache: robco-terminal-v1.6.8-r5 -->

### Added

- Campaign Notes gained individual delete buttons; auto-logged notes are visually distinct from manual ones; a manual add form was added.
- Quest changes are now automatically added to Campaign Notes with a timestamp.
- The Status Effects panel gained an add form with a tick counter and delete buttons per effect.
- The Squad panel gained a companion add form with autocomplete and remove buttons.
- The command quick-reference moved to a small button next to the token budget display.
- The D-Pad control is now collapsible to save vertical space.

### Fixed

- The Status Effects badge now counts permanent effects (zero ticks) instead of ignoring them.
- Number input widths increased so short placeholder labels are not clipped.

### Changed

- The Tactical Dashboard now uses a grid layout so combat buttons fill the available space when the D-Pad is collapsed.

---

## [v1.6.7] — Ammo Sub-Panel & Data Expansion

<!-- Date: 2026-06-22 | Tests: 137/137 | Cache: robco-terminal-v1.6.7-r4 -->

### Added

- Ammo now lives in its own collapsible sub-panel inside Inventory. You can add ammo with caliber autocomplete, delete entries, and track ammo separately from regular items.
- Each inventory item now shows a colored type tag (weapon, armor, aid, ammo, or misc). Adding ammo via the search field routes it to the ammo sub-panel automatically.
- The Inventory badge now shows the combined count of regular items and ammo calibers.
- The stat update summary after an AI sync now includes ammo changes.

### Fixed

- Adding an item that already exists at zero weight now corrects its weight using the real database value.
- Carry weight no longer includes ammo items.
- If the AI places ammo in regular inventory, it is silently rerouted to the ammo tracker.

### Changed

- The standalone Ammo badge was replaced by the combined Inventory badge showing regular items and ammo calibers together.

### Under the Hood

- Item database expanded substantially: weapons coverage grew to about 170 entries covering the full base game, armor to about 68, chems to about 45 including food and drinks.
- An unused save-state field was removed; old saves with this field are cleaned automatically on load.
- The changelog was renamed from a plain text file to a Markdown document.

---

## [v1.6.6] — THREAT Fix & Database Population

<!-- Date: 2026-06-22 | Tests: 138/138 | Cache: robco-terminal-v1.6.6-r5 -->

### Fixed

- The THREAT command was silently omitting the item database from its payload every time, making the AI's damage and survival calculations unreliable. Fixed.
- The THREAT command now sends your equipped weapon, armor, and ammo to the AI for accurate damage and time-to-kill math.

### Changed

- The item database is now always included in the AI's starting context, so it is available from the first turn of every session.

### Under the Hood

- Enemy database expanded from 4 to 63 entries covering the full Fallout: New Vegas roster.
- Weapon entries grew from 6 to 51; ammo subtypes from 7 to 47; armor from 4 to 19; chems from 4 to 20; misc items from 4 to 18; recipes from 1 to 10; quest items added (19 entries); vendors from 2 to 14.

---

## [v1.6.5] — Fallout Data Registry & Autocomplete

<!-- Date: 2026-06-22 | Tests: 119/119 | Cache: robco-terminal-v1.6.5-r2 -->

### Added

- Autocomplete dropdowns on quest name and item name inputs. Pulls from game wiki data, appears after two characters, and is keyboard-navigable.

### Under the Hood

- Registry data added: 130 quests, about 90 perks, about 120 locations, and all 10 companions.

---

## [v1.6.4] — Systems Architecture Update

<!-- Date: 2026-06-22 | Tests: N/A | Cache: robco-terminal-v1.6.4 -->

### Added

- Quest Log: track name, status (active, completed, or failed), objective, and faction involvement. The AI updates quest status automatically during play.
- Equipped item slots: your current weapon, armor, and headgear shown in the character panel.
- Three save slots (A, B, C) with full save and load buttons. Each stores your complete character state.
- Session statistics: kills, caps earned, damage dealt, and elapsed time. The AI returns stat changes each turn.
- Token budget display: estimated usage shown below the chat input, color-coded by how full the budget is.
- Item type selector when adding inventory items: weapon, armor, aid, ammo, or misc.
- Keyboard shortcuts: number keys to toggle panels; a shortcut to focus the chat input.
- Radiation alert in the character panel when rads reach a danger level, with a count of RadAway doses on hand.
- Status effects auto-decrement each AI sync; expired effects post a chat notice.
- A subtle blue tint during in-game night hours.
- Count badges on the Perks, Inventory, Squad, Status, and Notes panels.
- A chat notice when any faction hits Idolized or Vilified.
- A brief screen-edge glow when karma changes by a large amount in one sync.
- A red background flash when HP drops below 25%.
- Panel open/closed states remembered across sessions.
- Command history: Up and Down arrows cycle through previously sent commands.
- A two-note tone after every successful AI sync.
- Each inventory item has a USE button that sends the use command automatically.
- Skill checks in AI narrative are highlighted green or red for pass or fail, and the relevant skill input briefly highlights.
- Squad members with an affinity value show a 0–100% bar.
- Typewriter speed slider in Audio settings (0.25× to 3×).
- One silent auto-retry on transient connection errors after a short delay.
- Last 10 distinct locations tracked in your save.
- Campaign log export in Markdown and HTML formats.
- A Perks panel; the AI updates your perks on level-up events.
- Item value field (caps value) shown next to each inventory item.
- A draggable XP bar showing progress within the current level.
- A single master mute toggle that silences all audio; individual controls remain independent.
- A status summary posted to chat on boot when a save exists.
- A stat change summary after every AI sync listing every stat that changed.
- Radiation debuff display: stat inputs turn red when radiation debuffs apply, with a tooltip showing which ones.

### Fixed

- The API key is now sent in the request header rather than the URL, so it no longer appears in browser history or server logs.

### Changed

- The transmit button becomes a Cancel button during API calls, with a 45-second automatic timeout.
- Cloud saves now include a timestamp; pulling warns if the cloud data is older than your local save.
- Fame and infamy changes from each AI sync are auto-logged to campaign notes.

### Under the Hood

- The import function was rewritten with explicit typed field-mapping and range validation on all stat values, replacing a recursive approach that had no depth limit.

---

## [v1.6.3] — Faction Network Update

<!-- Date: Unknown | Tests: N/A | Cache: robco-terminal-v1.6.5 -->

### Added

- 14 factions are now tracked: 6 major factions in a 3-column grid, 8 minor factions in a collapsible sub-section.
- Cloud sync now includes chat history and playthrough type, enabling full session restore from any device.

### Changed

- Faction data restructured so each faction tracks Fame and Infamy independently. Old saves migrate automatically.
- Save exports now include the full chat history in a versioned format. Old saves without chat history still import correctly.
- The tick system clarified in AI instructions: ticks are a pacing guide, not an action lock. The Courier can act at any time.

---

## [v1.6.2] — Character Sheet Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- All 13 Fallout: New Vegas skills tracked and shown to the AI every turn. Skill checks and calculations use your actual values.
- A crippled head now triggers a two-layer audio effect — concussive thud followed by ringing.
- Tinnitus activates at very high radiation or a crippled head, and requires both conditions to clear before it stops.
- Status Effects panel: the AI was already writing effects to your save — now they are visible in the UI.
- Campaign Notes panel: the AI's auto-logged tactical decisions shown as a bullet list.
- Faction Standing panel: NCR, Legion, and Strip standings with color-coded labels.
- A game-time clock next to the TICKS field showing day and time in hours and minutes.
- A keyboard shortcut to send a message without clicking the button.
- Undo last sync: one click restores the full state from before the previous AI response. Reappears after every sync.
- Separate mute controls for limb trauma sounds and the tab-return tone.

### Fixed

- The FEATURES command now shows the real command list instead of invented commands.
- The dim overlay during tab return now holds for the correct duration so messages appear against a dark screen.

### Changed

- A full state snapshot is taken before every AI sync. Undo restores it in one step.
- Skill values returned by the AI are now clamped to valid ranges.

---

## [v1.6.1] — The Living Machine Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Geiger counter audio: procedural clicking sounds scaling from slow clicks at low radiation to continuous static at extreme levels.
- Tinnitus audio: a barely-audible high tone at high radiation that randomly swells.
- CRT hum: a persistent low hum throughout the session; shifts pitch at high radiation and briefly cuts out when a limb is crippled.
- When the AI updates a stat, the previous value briefly rises and fades from that input field.
- The Inventory panel subtly sags at high carry weight and jitters at maximum.
- Typewriter speed now reacts to the narrative: faster during combat, slower during rest.
- Switching tabs dims the terminal; returning plays a tone and shows a return message.
- Crippling a limb plays a distinct sound; restoring one plays a recovery sound.
- A live session uptime clock in the header; a memory cycle message every 15 minutes.
- The terminal background warms to amber during AI calls and cools on response.
- A button to view the changelog from the Configuration panel.

### Fixed

- All AI narrative text is now escaped before display, closing a path where a malformed AI response could have run injected script.
- Changelog display correctly extracts only the most recent version block.

### Changed

- Typewriter animation overhauled to eliminate a slow re-parsing pattern that caused performance issues in long sessions.
- State is written to storage at most once every 500 milliseconds, and flushed when the tab closes.
- Audio mute checks now read from an in-memory object instead of storage on every audio tick.
- Inventory and squad lists built as single strings and assigned in one operation.
- In-memory chat capped at 200 messages.

---

## [v1.6.0] — PWA, Mobile & Visual Overhaul

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Playstyle toggle: switch between Any Weapon and Melee or Unarmed Only. Blocked if incompatible perks are already acquired.
- The app can now be installed to iOS, Android, and desktop home screens. An install button appears when the browser confirms eligibility.
- New terminal color presets: Legion Red, Ghoul Green, and Neon Purple.
- A live HP bar below the HP inputs that transitions from green through amber to red.
- The radiation field changes color and pulses at danger thresholds; at extreme levels it triggers full-screen distortion.
- A 1.5-second cold-boot animation on every page load.
- All stat fields briefly glow after each AI sync.
- Crippled limb buttons periodically blink and jitter.
- Stat change arrows animate in from above or below.
- The HP bar is interactive: click or drag to set your HP. Touch-compatible.
- The title in the header breathes slowly.

### Fixed

- Cloud sync no longer fires automatically on every stat change. Cloud sync is now manual only.

### Changed

- CRT scanlines made heavier for a more authentic look.
- Button hover replaced a harsh white flash with a smooth brightness boost.
- The phosphor sweep bar uses the active terminal color.
- Panel headers gained slight letter-spacing.
- The custom scrollbar uses the active terminal color.

---

## [v1.5.9] — Immersion & Tactics Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Terminal color options: RobCo Green, New Vegas Amber, and Vault-Tec Blue.
- Audio mute toggle for typing sounds.
- Clicking a map cell automatically sends a move command to that location.
- Location autocomplete using all major Mojave locations.
- Campaign log download as a text file.

---

## [v1.5.8] — PWA & Mobile UX Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Service worker and PWA support: all assets cached for faster loads, and a "REBOOT TERMINAL" prompt fires automatically when a new version is available.
- All UI sections are now collapsible panels — closed by default on mobile, open by default on desktop.
- A manual cloud sync button for an immediate push in addition to auto-save.
- The latest patch notes are shown automatically after an update.

---

## [v1.5.7] — Mobile UX & Gamification

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Tactical D-Pad: an 8-way directional pad and quick-action buttons for common commands, designed for mobile.
- Tapping map commands opens an interactive grid; tapping trade commands shows Buy and Sell buttons.
- Squad tracker: companions shown with health, condition, and ammo.
- Cloud sync framework: cross-device save architecture.
- An animated scan effect and audio loop during image uploads.
- CRT scanlines with flicker animation.

---

## [v1.5.6] — Modular Architecture & System Hardening

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Keyboard click sounds generated in-browser with no audio files required.
- CRT overlay with scanlines and flicker.
- Tick clock: ticks tracked in save state and sent to the AI; buffs and debuffs expire by tick count.

### Fixed

- Fixed a bug where the AI's token-saving logic could accidentally drop the full inventory during looting or crafting.

### Under the Hood

- The app was split from a single HTML file into separate files for state, UI, AI, database, and styling.
- All AI instructions unified into a single system prompt.
- Item database now only injected into AI context when the command actually needs it, saving about 1,500 tokens per standard turn.

---

## [v1.5.5] — Native Web App & AI Memory

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- List-based AI responses now open in a pop-up overlay instead of appearing in the chat.
- Campaign notes memory: the AI can write tactical decisions to a persistent notes field. Notes are saved with your state and re-injected every turn, giving the AI persistent memory without extra context tokens.

### Changed

- The AI response format expanded to three parts: narrative text, state changes, and an optional overlay trigger.
- The AI's temperature locked at 0.2 to reduce hallucinations. The full Gem persona embedded into the system instructions.

---

## [v1.5.4] — Stability Patch

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Fixed

- AI narrative now outputs as a list of strings, preventing crashes from unescaped line breaks in the AI's text.
- Full templates for all custom commands are now hardcoded into the system instructions so the AI can render them accurately.
- Fixed a layout issue where the terminal stretched infinitely downward instead of scrolling.

### Changed

- The AI's full strategic logic from the original version was merged back into the system instructions.
- Temperature locked at 0.2.

---

## [v1.5.3] — Stability & Customization Patch

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- A dedicated section for customizing the FEATURES command output that will not be overwritten by framework updates.

### Fixed

- AI narrative mandated as a list of strings to prevent line-break-induced crashes. Chat rendering updated accordingly.

---

## [v1.5.2] — Website Architectural Overhaul

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Token triage: inventory data is stripped from the AI payload during non-inventory commands to reduce token cost.

### Fixed

- The AI now retains full conversation history: every request includes the complete chat history so the AI remembers what happened earlier in the session.
- The UI is locked during AI calls to prevent stat changes from overwriting state while the AI is calculating.
- Typing "help," "menu," or "commands" correctly routes to the FEATURES command instead of breaking the AI's persona.

### Changed

- The AI is locked into outputting strict JSON, eliminating crashes from free-form text responses.

---

## [v1.5.1] — Engine, Optics & Stability

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- A live dropdown that fetches available AI models on startup.
- API key sanitization: invisible characters are stripped from pasted keys, fixing common connection errors.
- Auth failures and rate limits are printed to the chat display.
- Image upload: attach a screenshot for AI visual analysis.

### Fixed

- Every stat change now writes to storage immediately.
- Corrupted chat history now resets gracefully instead of crashing.
- File import no longer gets overwritten immediately by default form values.

### Changed

- Inventory data is stripped from the AI payload during non-inventory commands. Carry weight and maximum AP are now calculated in the browser; the AI handles only narrative and lookups.

---

## [v1.5.0] — Comm-Link API Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Live AI integration: your character state is automatically attached to every prompt, and AI responses update your stats directly. No more copy-pasting.
- API key stored only in the browser — never in the repository.
- The app can now be installed as a standalone offline app.
- Widescreen dual-column layout.
- Persistent chat: survives tab closure and browser restart. A PURGE LOGS command clears it.
- S.P.E.C.I.A.L. values clamped 1–10 in the UI.

### Changed

- The AI is now instructed to treat the browser UI's state as the source of truth for math, and to stop generating tables for things the UI handles natively.

---

## [v1.4.7] — Beta: Web Architecture Transition

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Client-side state tracking: inventory, S.P.E.C.I.A.L., wealth, and character data tracked in the browser to reduce AI token cost and prevent stat drift.
- A parser that auto-maps AI responses with unexpected key formats.
- AI integration directly in the terminal.
- PWA installation; state saves on every keystroke.
- A chem and trauma matrix in the UI.

---

## [v1.4.6]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Changed

- Stasis Protocol: inventory management, gear swaps, and using items no longer advance the in-game clock. Time only moves during combat, travel, or deliberate wait or sleep.
- Armor condition formula: active damage reduction now scales with how close your armor's condition is to its minimum threshold.
- If a companion runs out of custom ammo mid-combat, the engine resolves the custom ammo damage first, then switches to their default ammo for the rest of the turn.

---

## [v1.4.5]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- The SYNC command now bypasses addiction cascade warnings.
- Melee and Unarmed characters recover additional action points per combat round during extended combat simulations.

### Fixed

- Crafting: yielded items are added to carry weight after consumed ingredients are removed.
- Visual VATS: hit percentages from screenshots are taken as-is; crippled limb penalties are not applied a second time.

---

## [v1.4.4]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- A BIND command to assign consumables to D-Pad directions explicitly.
- Level cap set to 50; XP tracking stops permanently at that level.
- EXCESS command shows your top 5 most valuable items per category; append FULL for the complete list.
- Visual VATS: extracts hit percentages from screenshots and converts them to action point and damage math.

---

## [v1.4.3]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Fixed

- TRADE now enforces vendor cap limits. You can no longer drain a vendor into negative caps.
- Maximum action points now use the correct formula.
- Items moved to a stash are removed from the backpack at the same time.
- If a companion runs out of custom ammo mid-combat, the engine switches to their default weapon and recalculates.

---

## [v1.4.2]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Fixed

- XP formula hardcoded so the AI always calculates level-up thresholds correctly.
- The viewport mode (mobile or desktop) is stamped in every response footer to prevent the AI from drifting to the wrong width in long sessions.

### Changed

- Radiation now applies the correct debuffs at each danger threshold. RadAway and Rad-X formulas hardcoded.
- Heavy inventory lists render in a two-column layout in desktop mode.

---

## [v1.4.1]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Diagonal D-Pad directions recognized.
- Footer borders scale to match the active viewport width.

### Changed

- All companions fully heal and clear crippled limbs after successful combat.
- TRADE enforces a buy/sell margin so sell prices must fall below the vendor's purchase price.
- STASH shows your top 5 items per category; append FULL for the complete list.
- AI output sequencing standardized: stat changes first, then tables, then footer.

---

## [v1.4.0] — Telemetry Dashboard Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- A new dual-line boxed dashboard footer that stays on one line without wrapping on phones.
- VIEW DESKTOP and VIEW MOBILE commands to switch between wide and narrow rendering modes.
- Using a chem or medical item via shorthand or D-Pad always removes exactly one from inventory.
- Ammo quantities shown in inventory output.

---

## [v1.3.9]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Quiet Mode modifier: suppresses narrative and shows only the stat changes. Faster for multi-turn combat on mobile.
- Stealth modifier: applies the weapon crit multiplier to the first strike.
- TRAVEL CLUSTER advances ticks proportionally to distance.
- Short two-letter aliases for common commands.
- Command chaining: run two commands in one turn.
- Pre-emptive Scanning parameter restored to prevent skill check bottlenecks.

### Changed

- All table borders replaced with Unicode box-drawing characters.
- All AI-generated UI capped at a consistent width for phones.
- NCR and Legion currency shown continuously in the footer.

---

## [v1.3.8]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- VATS SIM supports targeting a specific limb for anatomical damage calculations.
- TRADE applies Barter skill and reputation math automatically.
- XP earned after combat is proposed for confirmation before being added.
- STASH shows a visual condition bar using block characters.

### Changed

- Action points fully restore after successful combat. Stimpaks heal instantly; chem timers use tick counters.
- Items auto-unequip and show a warning when their condition reaches zero.

---

## [v1.3.7]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- SYNC command: a high-speed bulk state update that skips narrative and shows only stat changes.
- If a command lacks enough context for accurate math, the AI is required to show an INSUFFICIENT TELEMETRY warning instead of guessing.
- Batch Sync and D-Pad commands added to the FEATURES menu.

---

## [v1.3.6]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- D-Pad directional commands instantly use or equip the item bound to that direction.
- Karma values mapped to descriptive title labels from the game.
- Using a recipe removes the consumed ingredients from your backpack immediately.
- Companion carry capacity capped at the game limit.
- Re-dosing a chem from the same family resets its timer instead of stacking a ghost withdrawal.

### Changed

- Stat change arrows changed to solid block characters for a more authentic look.
- All stat outputs clamped to valid ranges.

---

## [v1.3.5]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- A new database for junk, crafting components, and currencies. Carry weight now references real item weights from this data.

### Fixed

- Visual Upload now requires specifying a category so it only overwrites that item type, not everything.
- Ammo and chems are treated as weightless when missing from the database.
- Visual uploads can no longer overwrite condition percentages tracked by the combat engine.

---

## [v1.3.4]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Carry weight recalculates automatically on every inventory transaction using real item weights.

### Fixed

- Visual Upload now fully rebuilds inventory from the image, preventing ghost duplicates of dropped items.

---

## [v1.3.3]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Under the Hood

- Developer documentation for action point allocation in unarmed and melee combat updated.
- Visual VATS interface card template added to the AI's templates.

---

## [v1.3.2]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- The footer now tracks ticks, fame, infamy, and karma to prevent them from drifting between turns.
- Jury Rigging repair formula hardcoded in the AI's instructions.
- A WAIT command to advance time without a bed. A SLEEP command fully heals HP, radiation, and limbs.

### Changed

- Item database fields expanded to cover XP yield, item value, and ammo type — prevents the AI from guessing on those fields.

---

## [v1.3.1]

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Fixed

- The FEATURES menu now correctly lists the WAIT command.

### Changed

- Changelog removed from the AI's active context to save tokens.
- Wait and Sleep separated into distinct commands.
- Multi-page commands merged into a single paginated command.

---

## [v1.3.0] — Systems Update

<!-- Date: Unknown | Tests: N/A | Cache: N/A -->

### Added

- Level-up protocol: the AI recognizes XP thresholds, allocates the correct skill points per level, and locks perks to even levels.
- Companion logistics: companions use infinite ammo for their default weapons; custom ammo is actually consumed. Companions go unconscious instead of dying permanently on Normal difficulty.
- A WAIT command to fast-forward time without a bed. Advancing time cycles vendor restocks.

### Changed

- Carry weight formula hardcoded. Condition repair scales with the Repair skill.

---

## [v1.2.5]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Fixed

- A fictional context wrapper was added to the top of the AI system prompt to prevent false-positive content flags on authentic Fallout terminology.
- Authentic Fallout terminology restored after it was replaced with clinical language in the previous version.
- Bracket formatting fix from the previous version preserved.

---

## [v1.2.4]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Changed

- Curly braces in the response footer were replaced with standard brackets to prevent conflicts with the JSON parser. The stat change summary prefix was updated accordingly.

---

## [v1.2.3]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Changed

- Seven system alert icons explicitly mapped to their alert types so the AI always picks the correct one.
- Backtick formatting syntax restored in the formatting guide.

---

## [v1.2.2]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Added

- COMM LINK command: temporarily steps out of the RobCo persona to let you speak directly with a game character in their own voice. Entry and exit are marked with distinct cards.

---

## [v1.2.1]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Added

- Crafting engine: the CRAFT command checks your inventory against the recipe database and enforces skill gates before allowing a craft. A UI template shows available recipes and missing components.

---

## [v1.2.0]

<!-- Date: 2026-05-19 | Tests: N/A | Cache: N/A -->

### Added

- Every AI response now opens with a one-line summary of exactly what changed before the narrative.
- Fame and Infamy tracked independently per faction, matching the real Fallout: New Vegas game. Economy math updated for mixed standings.
- GPS and MAP commands draw a compass with local threats and the nearest safehouse.

### Changed

- The response footer changed from a text summary to a compact data block — fewer tokens per turn, less stat drift.
- Condition bars upgraded to solid block format.

---

> All game data sourced from [fallout.wiki](https://fallout.wiki) (CC-BY-SA 4.0).
