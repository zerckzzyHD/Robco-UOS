# RobCo — North Star Inventory

**Created:** 2026-08-02 (post-Round-5). **Canonical home:** app repo, beside QUEUE.md.
**Authority:** derived from QUEUE.md @ `f1bc034` (the post-Round-5 reconciliation), the Round 5 synthesis, Round 4, and standing memory. Verdicts trace to canonical IDs (`SL-*`, `AB1`–`AB8`, `EXP1`–`EXP9`) in QUEUE.md.
**Cross-references VERIFIED 2026-08-02** against `QUEUE.md` at HEAD: every `SL-*`, `AB1`–`AB8`, `EXP1`–`EXP9`, `PX1` and `P16` reference in this file resolves to a real entry there. ⚠ **Six shorthand runs were expanded to their canonical `SL-` forms in the same pass** (`SL-K1/K3/K5`, `K2/K5`, `SL-D1/D2/D6`, the §7 overlap list, and a bare `G1`) — **no verdict, status or judgment was changed.** The prefix is load-bearing: a bare slate letter resolves to a _different_ live queue item (bare `G1` is the owner-greenlit CP5 witness, bare `A4` is the shipped Firestore round-trip test, bare `G4` is the retired DG2 counter).

> **This is a mirror, not a second roadmap.** QUEUE.md remains the executable plan. This document exists to name the _directional commitments_ the queue serves, honestly separate the genuinely adopted ones from exciting phrases, and expose their real relationships. If this document and QUEUE.md ever disagree, QUEUE.md wins and this file is stale.

---

## The adoption bar (so the label doesn't inflate)

A **North Star** is a durable directional commitment, not a feature and not a slogan. To be tagged **ADOPTED** it must meet all three:

1. the owner has affirmed the direction (or it is a hard project constraint);
2. more than one _surviving_ primitive already serves it (built or greenlit), and
3. it passed the Round 5 Last Gate as SURVIVES / SURVIVES-WITH-CONTAINMENT, or it is an already-built invariant.

Everything else is labelled honestly: **PARTIALLY-BUILT** (adopted direction, primitives incomplete) · **QUEUED** (committed, not yet serving) · **NEEDS-EVIDENCE** (real but gated on a decisive experiment) · **SPECULATIVE** (named, not committed) · **NARROWED / SUPERSEDED** (an earlier grand phrasing cut down to a defensible core) · **MERGED** (absorbed into another North Star or abstraction) · **REJECTED** (named and killed; kept here to prevent re-inflation).

Status legend for the tables: ✅ adopted · 🟡 partially-built · ⏳ queued · 🔬 needs-evidence · 💭 speculative · ✂️ narrowed/superseded · ⛔ rejected.

---

## The apex

**NS-F1 — The bounded-mission software factory.** ✅ ADOPTED (apex).

> _RobCo accepts one owner-authorized bounded mission, lets replaceable AI contractors attempt it, prevents a claim from becoming completion, preserves state through interruption or provider replacement, verifies exact postconditions within declared scope, exposes missing evidence and silent obligations, declassifies only an exact allowed public bundle, and reconstructs the same honest state after recovery — without granting AI canonical authority._

Source: Round 5 synthesis §2 + GPT final ruling. This is the one everything else serves; every other control-plane / AI / continuity / archive North Star below is a child of it. It is the disciplined survivor of Round 4's grander "sovereign proof-bearing software factory" phrasing (see NS-S3). Supporting primitives: all eight abstractions, led by AB3 (Bounded Mission Runtime). Downstream consumers: the entire control-plane roadmap; the signature demo is its acceptance test. Evidence still required: EXP4 (manifest mission / kill-and-resume) is the make-or-break; until it passes, the apex is a _direction with a spine_, not a demonstrated capability.

---

## 1. Product North Stars (the RobCo U.O.S. game / PWA)

These are the oldest and most stable; the control-plane rounds did not touch them, but they are the reason the whole apparatus exists.

| ID    | North Star                                                                                                                                        | Status | Notes                                                                                                                                                                                                                                                                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NS-P1 | **Player sovereignty** — the player has full authority; AI is opt-in, never authoritative.                                                        | ✅     | Source: `player-control-principle`. Primitives: opt-in AI command, no auto-authoritative writes to player state. Consumers: every game feature. **Cross-class resonance:** this is the _same principle_ as NS-A1 (AI-as-contractor) applied to the product instead of the control plane — owner/player is sovereign, AI is opt-in. Parent: NS-F1's "no AI canonical authority." |
| NS-P2 | **OS-first device fidelity** — authentic per-game device forms (NV terminal · FO3 Pip-Boy · FO4 Mark IV), mobile-first, schematic-view direction. | ✅     | Source: `robco-os-architecture`, `per-game-device-form`, `bezel-fidelity-pass`. Primitives: the device shells. Consumers: all UI. Constraint: reskin-don't-rearrange; app device shells only.                                                                                                                                                                                   |
| NS-P3 | **Free forever / BYO-key / no required subscription** (≤ $10 one-time).                                                                           | ✅     | Hard constraint. Source: `project-must-stay-free`. Consumers: every infra decision; kills paid-infra proposals. Shared verbatim with the control plane's hard constraints.                                                                                                                                                                                                      |
| NS-P4 | **Works fully offline / native features need zero network.**                                                                                      | ✅     | Source: VATS/offline audit, PWA discipline. Primitive: service worker cache-first. Consumer: every native feature.                                                                                                                                                                                                                                                              |

Product North Stars are not in scope for the Round 5 cull; they are recorded for completeness and to anchor the cross-class resonances (NS-P1 ↔ NS-A1).

---

## 2. Control-plane North Stars

| ID    | North Star                                                                                                                             | Status             | Serving primitives (canonical IDs)                                                                                                                                                                    | Consumers                                 | Evidence still needed                                                                          |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| NS-C1 | **Proof-of-execution** — the plane can _prove_ it operated correctly, not merely record that it did.                                   | 🟡 partially-built | Replay Bench (`SL-A1` tier a, adopted) · pure detectors + complete ledger · Kani bounded proof (`SL-A1` tier b, 🔬 NDE) · zk (`SL-A1` tier c, ⏳ deferred) → all under **AB6 Replay & Assurance Lab** | EXP3, EXP4, every assurance claim         | Replay Bench built; EXP3 passes; Kani experiment catches a seeded defect                       |
| NS-C2 | **Epistemic-everywhere** — CLAIMED never renders as complete; every claim is typed at its evidence ceiling.                            | 🟡 partially-built | Operator-CLI epistemic types (built) · Guarantee-Ceiling Gate (`SL-A6`) · Assurance Envelope (**AB2**) · epistemic-state-as-code (`SL-G1`)                                                            | all surfaces (generated from one catalog) | one catalog → all renderers; extend beyond the single shipped action                           |
| NS-C3 | **Completeness · liveness · scope** — silence is distinguishable from health, and every "clean" result names the exact set it checked. | 🟡 partially-built | **AB1 Signal/Event/Obligation Kernel** · coverage certificates (`SL-A2`) · obligation registry (`SL-I5`) · external observer                                                                          | EXP2, EXP3, the three founding fixes      | EXP2 (external liveness) — the single highest-priority assurance gap after the public boundary |
| NS-C4 | ~~Ledger IS the OS / filesystem is a projection~~ → **Ledger as canonical audit journal for governed transitions.**                    | ✂️ narrowed        | `SL-B1` UNPROVABLE-AS-STATED → narrowed core survives                                                                                                                                                 | AB1                                       | —                                                                                              |

**NS-C3 is the sharpest genuinely-new North Star to come out of Round 5.** All three reviewers independently reached it: a valid hash chain proves non-rewrite, never non-omission; the whole assurance case turns on an _expectation source that does not share the recorder's failure_. It is why the second founding fix (kill silent death) outranks almost everything else.

**NS-C4 is a deliberate example of the inflation this document guards against.** "Ledger is the OS" was an exciting phrase; it contradicts NS-K1 (honest continuity needs Git, filesystem, secrets, and manifests — not just the journal), which is exactly why Round 5 narrowed it. Recorded so it is not re-crowned.

---

## 3. AI North Stars

| ID    | North Star                                                                                                                                                             | Status            | Serving primitives                                                                                                                                                                                            | Consumers                         | Notes                                                                                                                                                                                                                                            |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| NS-A1 | **AI as a replaceable, evidence-calibrated CONTRACTOR** — never canonical authority, never an approver, never a suppressor of a deterministic alarm.                   | ✅                | AB3 mission runtime · AB4 capability capsule · Assurance Gate (`SL-F6`) · no-credentials boundary · the effective-TCB rule (ranking/attention/context selection count as authority even without a write edge) | all AI use, incl. Dispatch itself | Parent of NS-A2. The R5-sharpened form adds the _effective TCB_ insight: a read-only advisory that controls what the owner sees first IS authority.                                                                                              |
| NS-A2 | **The Learned Scout Contract** — learning stays DERIVED, batch, read-only, provenance/expiry/abstention-carrying, behind a legibility gate; no standing learned plane. | 🔬 needs-evidence | `SL-K1`/`SL-K3`/`SL-K5` (contained) · AB6 Replay Lab · AB2 envelope · EXP9 (learning-legibility gate)                                                                                                         | any future learned work           | Child of NS-A1. Nothing learned ships unless a shadow scout beats a cheap deterministic baseline on release-separated data (EXP9). `SL-K2`/`SL-K5` must use _weighted non-exchangeable_ conformal, not vanilla (the ledger is not exchangeable). |
| NS-A3 | ~~Governed Learning Plane / Derived Intelligence Plane / "proof-carrying predictions" as a standalone plane~~                                                          | ⛔/MERGED         | absorbed into NS-A2 + AB2                                                                                                                                                                                     | —                                 | Rejected AS A PLANE (ceremonial complexity on a dataset that is not yet a dataset), merged AS a contract. GPT flagged its own ancestry: shared-source agreement is not an independent vote. Kept here to prevent re-inflation.                   |

---

## 4. Continuity & Recovery North Stars

| ID    | North Star                                                                                                                                                             | Status             | Serving primitives                                                                           | Evidence needed                                                                                                               |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| NS-K1 | **Honest continuity** — recover data + obligations + policies + evidence ancestry, then _explicitly re-establish trust_. Restored ≠ re-verified.                       | 🟡 partially-built | `SL-J1` (SURV-C) · **AB8 Witness & Continuity Capsule** · daily mirror + weekly restore test | EXP6 (off-machine-only resurrection incl. privacy-policy recovery)                                                            |
| NS-K2 | **Provider-exit / substrate independence** — a frozen mission continues with a replacement worker/provider from the portable capsule alone.                            | 🔬 needs-evidence  | `SL-J4` (NDE) · AB3 mission capsule · AB8                                                    | EXP6 — if continuation depends on the original provider/conversation, this narrows to a mere artifact-export claim            |
| NS-K3 | **Independent observation** — corroboration counts independent _failure domains_, not checks; a witness must be semantically independent, not just a separate process. | ✅ (principle)     | `SL-E4` (SURV, required annotation on every layer) · `SL-E1` witness (SURV-C)                | EXP8 (witness semantic-independence). The multi-device Covenant/pool (`SL-E3`) is ⏳ DEFERRED — do not inflate NS-K3 into it. |

---

## 5. Archive / Exhibit North Stars

| ID    | North Star                                                                                                                                            | Status                                         | Serving primitives                                                                                             | Notes                                                                                                                  |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| NS-X1 | **The self-maintaining system is the museum's SUBJECT** — every measure that maintains the workflow, told as failure→lesson→measure→improvement arcs. | ✅                                             | the archive raw-capture corpus · `museum-core-thesis`                                                          | The museum's thesis. The North-Star room proposed below is a direct expression of it.                                  |
| NS-X2 | **Fail-closed declassification** — nothing becomes public without a positive allow-list + exact-set scan + lineage + owner diff.                      | 🟡 partially-built (currently the FROZEN gate) | **AB7 Declassification Pipeline** · PX1 (queue head) · P16 (contained) · `SL-D1`/`SL-D2`/`SL-D6` · honeytokens | The most operationally urgent Archive/Exhibit North Star. Museum publishing is FROZEN until PX1 lands AND EXP1 passes. |
| NS-X3 | **Provable museum↔archive binding + selective disclosure** — the public exhibit provably descends from the private archive without revealing it.      | ⏳ queued                                      | `SL-D3` (SURV-C) · AB7 · AB5 Provenance Graph                                                                  | Proves byte/ancestry relations, not truth of private claims.                                                           |
| NS-X4 | **The museum has its own visual identity** — no bezel, not fully in-theme; interactive-station form.                                                  | ✅ (design direction)                          | `museum-has-its-own-visual-identity`, `museum-interactive-station-template`                                    | Terminal look belongs to the exhibits, not the walls.                                                                  |

---

## 6. Sovereign Foundry North Stars

| ID    | North Star                                                                                                                                       | Status                                                           | Notes                                                                                                                                                                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NS-S1 | **The bounded-mission software factory**                                                                                                         | ✅                                                               | = **NS-F1**, the apex. Listed here as its home class.                                                                                                                                                                                                         |
| NS-S2 | **Sovereign Campaigns / Mission Fabric** — phone-authorized bounded outcomes; AI-free law admits each stage; replaceable contractors do tactics. | ✅-with-containment                                              | `SL-F1` → AB3. The operating-model instantiation of NS-F1. Start with one mission class, not a general workflow language. Gate: EXP4.                                                                                                                         |
| NS-S3 | ~~"Sovereign proof-bearing software factory"~~ (Round 4 unifying thesis)                                                                         | ✂️ narrowed → NS-F1                                              | Round 4's grand framing. Round 5 pruned it to the disciplined NS-F1. Recorded as the ancestor, not a live separate North Star.                                                                                                                                |
| NS-S4 | The convergent "holy shit" demo                                                                                                                  | (not a North Star) — ✅ as an **acceptance test** + museum story | One phone tap → AI claims done → gate rejects it → repair within budget → witness signs → scrubbed exhibit auto-publishes. SURVIVES-WITH-CONTAINMENT as the acceptance scenario for NS-F1, never as proof of the whole doctrine. Prime NS-X1 museum material. |

---

## 7. Relationship map (parent/child · overlaps · contradictions)

- **Apex:** NS-F1 is the parent of NS-A1, NS-C1, NS-C2, NS-C3, NS-K1, NS-X2, and NS-S2.
- **Cross-class resonance:** NS-P1 (player sovereignty) and NS-A1 (AI-as-contractor) are the _same_ "human sovereign, AI opt-in, never authoritative" principle applied to the product and the control plane respectively. Worth showing as a single spine crossing the product/meta boundary.
- **Child chains:** NS-A2 (Learned Scout Contract) is a child of NS-A1; NS-S2 (Sovereign Campaigns) is the operating instantiation of NS-F1; NS-C1's three tiers (replay/Kani/zk) are a ladder, not equals — no tier inherits another's claim.
- **Overlap → merged:** NS-A3 (learning plane) overlapped `SL-F2`/`SL-F4`/`SL-F6`/`SL-F7`/Replay-Bench/`SL-A4`/`SL-G4`/`SL-I3` → merged into NS-A2 + the abstractions.
- **Contradiction (resolved):** NS-C4 ("ledger is the OS") contradicted NS-K1 (honest continuity needs Git/FS/secrets/manifests, not just the journal). Round 5 resolved it by narrowing NS-C4. This is the clearest worked example of the inflation guard.
- **Dependency ordering:** NS-X2 (declassification) and NS-C3 (completeness/liveness) are the two founding fixes — they gate everything downstream. NS-F1's demonstration (NS-S4) depends on NS-A1 + NS-C1 + NS-C2 + NS-X2 + NS-K1 all holding at once.

---

## 8. What becomes possible if the adopted set holds

- If **NS-C3** holds: the project can, for the first time, tell the difference between "quiet and healthy" and "dead" — the precondition for trusting any automation overnight.
- If **NS-X2** holds: the museum can publish without a human remembering to exclude the right files — the leak becomes structurally impossible, not merely un-triggered.
- If **NS-F1 + NS-A1 + NS-K1** hold together: the owner can authorize work from a phone, have an AI attempt it, and trust that a false "done" is caught, a crash is survivable, and a provider swap doesn't lose the mission — the actual phase change from "control plane around sessions" to "governed engine in which work lives."

---

## 9. Museum / Exhibit audit — PROPOSED requirements (Dispatch's judgment: justified)

Both proposals below are **PROPOSED** and **gated behind the museum publish freeze** (they cannot ship until AB7/PX1 lands and EXP1 passes, and they route through the same fail-closed declassification pipeline). They are recorded here and should be filed in QUEUE.md under the museum track, not adopted silently.

**MX-1 — A dedicated North-Star room.** Justified: the North Stars _are_ the project's thesis, and NS-X1 (the self-maintaining-system museum subject) is literally the story of the measures that serve them. The room shows each adopted North Star with the failure→lesson→measure arcs that earned it, and shows the pruned/narrowed/rejected phrases beside them as honest evidence that the project culls its own excitement. Human-facing narrative, curated — not a status dashboard.

**MX-2 — North Stars in the visual graph, generated from canonical references.** Justified: the planned visual graph should render North Stars as nodes and their _real_ relationships (serving primitives, gating experiments, parent/child, contradictions) as edges. **Hard requirement: the graph is generated from canonical references — this file's structured cross-refs (`SL-*`/`AB*`/`EXP*`) plus QUEUE.md — and is never hand-maintained.** A hand-drawn graph would drift into a second roadmap; a generated one stays honest by construction and simply breaks (loudly) if a reference stops resolving.

**Standing guardrail (both):** the Museum/Exhibit remains human-facing output. It may _reflect_ the roadmap; it must never _become_ a competing planning authority. Planning lives in QUEUE.md; this inventory mirrors it; the museum renders a curated, scrubbed projection of it.

---

## 10. Open items folded in this pass

The seven Round-5-held items (BR1, BR4, BR14, BR19, BR21, BR23, HA5) are adjudicated in QUEUE_LOG under the North Star pass and reflected here only where one turns out to be North-Star-relevant. (Adjudication pending Dispatch ruling — see the reconciliation session's surfaced text.)
