# Project: TRISUTRO WhatsApp Abandoned Cart Recovery

## Objective
Implement automated WhatsApp reminders for customers who add items to cart but don't complete order via WhatsApp.

## Business Context
- **Business:** TRISUTRO — Unstitched Luxury (Pakistani-inspired 3-piece sets)
- **Current flow:** Website catalog → "Add to Bag" + "Order via WhatsApp" (pre-filled message)
- **Pain point:** No recovery for abandoned carts; 70% industry abandonment rate
- **Opportunity:** WhatsApp 98% open rate, 90% read within 3 min; 20-30% recovery benchmark

## Feasibility Review Summary (2025-10-29)
**Website Infrastructure Gap (Verified):**
- NO cart persistence (localStorage/sessionStorage/IndexedDB) — "Add to Bag" only updates UI
- NO customer contact capture — phone/email never collected on site
- NO event tracking — no analytics, no webhook endpoints, no abandoned cart detection
- NO Supabase/backend — static React site only

**Meta WhatsApp Business Platform Requirements (Verified):**
- Business verification MANDATORY for >250 conversations/day & template approval
- Service conversations: FREE (unlimited) from Nov 2024
- Marketing/Utility/Authentication: per-message pricing (~$0.007/msg Bangladesh)
- ALL templates require Meta approval (1-3 days each)
- Explicit opt-in REQUIRED for business-initiated Marketing/Utility messages
- Customer clicking wa.me link = initiates chat = 24hr service window (free-form allowed)

**Compliance Gap:**
- No customer phone capture → cannot send business-initiated messages without explicit opt-in + phone
- Cart abandonment tracking requires cookie consent (GDPR/ePrivacy) + privacy policy update
- Template category: Cart recovery = Marketing (safer) or Utility (strictly transactional only)

## Recommended Two-Phase Approach

### Phase 0: Manual WhatsApp Follow-up (START HERE — Zero Cost, Zero Dependencies)
**Workflow:**
1. Add `localStorage` cart persistence to website (5 min dev): store product_id, design_code, name, color, price, url, timestamp on "Add to Bag" click
2. Daily manual check: Partner/Owner reviews abandoned carts via browser DevTools → Application → Local Storage
3. Manual WhatsApp message via WhatsApp Web/App using pre-written Bengali templates
4. **Advantages:** No Meta verification, no template approval, no API cost, fully compliant (customer clicked WhatsApp = service window), start TODAY
5. **Validation goal:** Measure actual abandonment rate & recovery % over 2 weeks before investing in automation

**Manual Templates (Free-form, within 24hr service window):**
```
Template 1 (T+30min): হ্যালো! আপনার কার্টে [পণ্য] অপেক্ষা করছে। অর্ডার করতে এখানে ক্লিক করুন: [wa.me link with product details]
Template 2 (T+3hr): আপনার পছন্দের [পণ্য] এখনও আছে। COD + ৪৮ঘন্টা এক্সচেঞ্জ + ডোরস্টেপ ইনспекশন। অর্ডার: [link]
Template 3 (T+24hr): [পণ্য] রিজার্ভ রেখেছি। আজ ডেলিভারি ফ্রি! অর্ডার: [link]
```

### Phase 1: Automated WhatsApp Recovery (CONDITIONAL — Only After Phase 0 Proves ROI)
**Prerequisites (ALL must be met):**
- [ ] Phase 0 validates >15% abandonment rate AND >10% manual recovery
- [ ] Meta Business verification complete (trade license, bank statement, utility bill, exact name match)
- [ ] 3 templates approved by Meta (Marketing category recommended for cart recovery)
- [ ] Website: cart persistence + customer phone capture (login/prompt) + opt-in checkbox
- [ ] Webhook endpoint deployed (Cloudflare Workers / Vercel Functions)
- [ ] Frontend emits cart events with all required data fields

**Implementation Steps (from original spec, updated):**
1. Meta Business Verification — Submit docs, verify phone +8801709833722
2. Create WhatsApp Business Account in Meta Business Manager
3. Submit Message Templates for approval (Marketing category, 3 templates)
4. Develop Webhook Endpoint (serverless: Cloudflare Workers/Vercel/Netlify)
5. Integrate Frontend — data attributes on buttons, emit event on click
6. Test in Sandbox with Meta test numbers
7. Go Live — Monitor first 50 abandonments

## Cost Estimate (Corrected)
| Phase | Setup Cost | Ongoing Cost |
|-------|------------|--------------|
| **Phase 0 (Manual)** | ৳০ (existing tools only) | ৳০ (human time only) |
| **Phase 1 (Automated)** | ~৳15,000-30,000 (dev time) | Marketing/Utility: ~৳0.6/msg (Bangladesh rate). Service: FREE unlimited. |

**Note:** "Free 1,000 conversations/month" is OUTDATED. Current model: Service conversations FREE unlimited; Marketing/Utility/Authentication pay-per-message by country.

## Risks & Mitigations (Updated)
| Risk | Mitigation |
|------|------------|
| Meta template rejection | Use Marketing category for cart recovery; test in sandbox first; avoid promotional language |
| CoD orders need manual confirmation | Template includes "Reply to confirm" CTA; human follow-up for CoD |
| Customer annoyance | Strict 3-message max; clear opt-out; stop on purchase |
| No customer phone capture (Phase 0) | Manual follow-up only within 24hr service window (customer clicked WhatsApp = initiated) |
| Meta verification rejection | Ensure legal name EXACTLY matches trade license/bank statement; use utility bill <3 months |
| No cart infrastructure (Phase 1) | Phase 0 validates demand FIRST; only then invest in localStorage + webhook + phone capture |

## Success Criteria

### Phase 0 (Manual) — 2 Week Test
- [ ] localStorage cart persistence implemented on trisutro.bond
- [ ] Daily manual review of abandoned carts
- [ ] Manual WhatsApp follow-up sent for abandonments >30 min
- [ ] Track: abandonment count, manual messages sent, recovery count, conversion rate
- [ ] **Go/No-Go threshold:** >15% abandonment rate AND >10% recovery rate → proceed to Phase 1

### Phase 1 (Automated) — Conditional
- [ ] Meta Business verification approved
- [ ] 3 Marketing templates approved
- [ ] Webhook receives "Add to Bag" events
- [ ] 3-message sequence fires correctly
- [ ] At least 1 cart recovered in first 20 abandonments
- [ ] No spam complaints
- [ ] Cost per recovered order < 20% of AOV

## Next Actions
### Immediate (Phase 0):
1. [ ] Add localStorage cart persistence to trisutro.bond (5 min code change)
2. [ ] Create manual follow-up template document
3. [ ] Begin daily manual review & follow-up
4. [ ] Track metrics in simple spreadsheet
5. [ ] After 2 weeks: evaluate Phase 1 go/no-go

### Conditional (Phase 1):
1. [ ] Gather business documents for Meta verification (trade license, bank statement, utility bill)
2. [ ] Set up Meta Business Manager account
3. [ ] Submit 3 Marketing templates for approval
4. [ ] Develop webhook (Cloudflare Workers / Vercel Functions)
5. [ ] Update trisutro.bond frontend: cart persistence + phone capture + opt-in + event emission
6. [ ] Test end-to-end in Meta sandbox
7. [ ] Deploy and monitor

## References
- Ngital: "Abandoned Cart Recovery Playbook Bangladesh" (2026)
- Meseji: "WhatsApp Abandoned Cart Recovery Complete Guide" (2026)
- BengalTech: "WhatsApp Business API Automation Bangladesh" (2024)
- GetGabs: WhatsApp 98% open rate, 90% read within 3 min
- Meta WhatsApp Business API docs: developers.facebook.com/docs/whatsapp
- App-ening Bangladesh: Meta Business Verification guide (2026)
- Qiscus: WhatsApp Business API Pricing 2024 (service free, marketing/utility paid)

## Status
**Phase 0: READY TO START — Zero dependencies, start today**
**Phase 1: CONDITIONAL — Requires Phase 0 validation + Meta verification + infrastructure**
**Created:** 2025-10-29
**Last Updated:** 2025-10-29 (Feasibility review applied)
**Owner:** Partner (Virtual CEO)
**Assigned to:** Partner (Phase 0 manual), Coding Agent (Phase 1 if/when operational)
