# ADR-001: Stay SemVer, Ship T008 as v1.0.0

**Status**: ACCEPTED
**Date**: 2026-03-26
**Decision Method**: 9-expert business panel debate + vote
**Deciders**: Christensen, Porter, Drucker, Godin, Kim & Mauborgne, Collins, Taleb, Meadows, Doumont

---

## Context

VersionGuard is at v0.9.0, about to ship a breaking change (T008: strict-by-default validation). Two questions needed answering:

1. Should VG switch from SemVer to CalVer for its own npm packaging?
2. Should T008 ship as v1.0.0?

## Decision

**Question 1: Stay SemVer. Vote: 9-0 unanimous.**

**Question 2: Ship as v1.0.0. Vote: 9-0 unanimous.**

## Panel Arguments

### Question 1: SemVer vs CalVer

#### Clayton Christensen (Disruption Theory)
CalVer on npm is structurally incompatible with the value network. When a user writes `@codluv/versionguard@^2026.3.0`, npm interprets that as "any version up to but not including 2027.0.0" — a time-based window, not a compatibility window. The range operator is repurposed in a way that violates user expectations. This is not innovation — this is friction.

Dogfooding is about proving the feature works for your customers' use cases, not about proving it works for an npm package. Customers use CalVer for Python projects, Go modules, mobile apps with release trains. You dogfood CalVer enforcement by testing against those use cases.

#### Seth Godin (Marketing & Tribe Builder)
"VersionGuard uses CalVer on npm and it kind of breaks range semantics" is not a remark your tribe wants to spread. It is a remark your detractors will spread. The remark you want is: "VersionGuard is the only tool that enforces both SemVer AND CalVer correctly." That is remarkable and positive.

The dogfooding story is compelling in a conference talk. It is a nightmare in a GitHub issue titled "why does npm update pull in a breaking change."

#### Nassim Nicholas Taleb (Risk & Uncertainty)
The downside is asymmetric and the upside is trivial.

Tail risks of CalVer on npm:
1. **Silent breaking changes.** In CalVer, `2026.3.0` to `2026.4.0` could be a trivial patch or a complete API rewrite. You have eliminated the only signal that protects downstream consumers. For a tool whose raison d'etre is versioning discipline, this is antifragility in reverse.
2. **npm tooling breakage.** Dependabot, Renovate, and every automated dependency tool will misinterpret your versions. These are guaranteed mechanical failures.
3. **Irreversibility.** Once you publish `2026.3.0`, you cannot go back to `1.0.0`. npm sees `1.0.0 < 2026.3.0`, so SemVer versions will never be installed by anyone who previously used the CalVer version.

The upside is cosmetic ("communicates recency"). The downside is structural and irreversible.

#### Michael Porter (Competitive Strategy)
The tool's credibility as a SemVer enforcer is partially signaled by its own adherence to SemVer conventions. If VersionGuard ships CalVer on npm, the implicit message is: "SemVer is not good enough for us, even though we enforce it for you." That creates cognitive dissonance in the value proposition.

By moving to CalVer, you voluntarily step outside the ecosystem's structural advantages.

#### Kim & Mauborgne (Blue Ocean Strategy)
The debate assumes a binary: SemVer or CalVer. You can dogfood CalVer by maintaining a CalVer-versioned test fixture project, by having CI validate CalVer workflows, by using CalVer in documentation examples. You do not need to sacrifice npm compatibility.

The factor to create is something nobody has mentioned: a version format recommendation engine. That is a blue ocean feature. Do not fight a red ocean battle over your own version number.

#### Jim Collins (Organizational Excellence)
The Hedgehog Concept: VersionGuard can be best in the world at multi-scheme versioning enforcement. Not at using CalVer on npm.

The flywheel: Ship reliable enforcement → developers adopt and trust → trust generates word-of-mouth → more users reveal edge cases → fixing edge cases improves reliability. CalVer introduces friction into adoption (step 2) and trust (step 3). It is flywheel drag, not a push.

#### Donella Meadows (Systems Thinking)
When you introduce CalVer into npm's balancing feedback loop, users will pin to exact versions. Pinning defeats the version range system entirely. The unintended consequence is fewer automatic security patches and bug fixes — the opposite of what a healthy dependency ecosystem wants.

#### Peter Drucker (Management Philosophy)
The customer of VersionGuard's version number is the developer who writes `npm install -D @codluv/versionguard`. That customer values predictability. `^1.0.0` means "give me non-breaking updates." CalVer cannot provide this guarantee on npm.

You dogfood CalVer by ensuring your CalVer enforcement engine is flawless, not by imposing CalVer on a distribution channel structurally incompatible with it.

#### Jean-luc Doumont (Communication Systems)
CalVer communicates **when** a release happened. SemVer communicates **what kind of change** a release contains. For a dependency in `package.json`, the "what kind of change" message is orders of magnitude more important.

### Question 2: Should T008 be v1.0.0?

All 9 experts voted yes. Key arguments:

- **Christensen**: The feature set is coherent. "Is 1.0 premature?" is a fear-based question, not evidence-based.
- **Taleb**: Beta perception risk outweighs premature commitment risk. But publish a clear stability policy alongside.
- **Godin**: "VersionGuard hits 1.0 with strict-by-default validation" is a story worth telling. "v0.10.0" is nothing.
- **Collins**: Confront the brutal facts: 248 tests, 94%+ coverage, real dogfooding, coherent feature set. Ship 1.0.
- **Meadows**: 1.0 changes how ecosystem tools (Dependabot, Renovate) interact with the package structurally.

## Consequences

1. T008 ships as v1.0.0
2. Stability policy published alongside: "1.x maintains backward compatibility for CLI commands and configuration formats. Breaking changes only in 2.0+."
3. CalVer remains fully supported for users' projects — just not for VG's own packaging
4. Dogfood CalVer through enforcement quality (test fixtures, CI validation), not self-application
5. This decision is permanent unless VG leaves the npm ecosystem entirely

## Vote Tally

| Expert | Q1: SemVer or CalVer? | Q2: v1.0.0? |
|--------|----------------------|-------------|
| Christensen | **Stay SemVer** | **v1.0.0** |
| Porter | **Stay SemVer** | **v1.0.0** |
| Drucker | **Stay SemVer** | **v1.0.0** |
| Godin | **Stay SemVer** | **v1.0.0** |
| Kim & Mauborgne | **Stay SemVer** | **v1.0.0** |
| Collins | **Stay SemVer** | **v1.0.0** |
| Taleb | **Stay SemVer** | **v1.0.0** |
| Meadows | **Stay SemVer** | **v1.0.0** |
| Doumont | **Stay SemVer** | **v1.0.0** |
| **Result** | **9-0 SemVer** | **9-0 v1.0.0** |
