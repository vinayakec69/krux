# KRUX Token Economics

## Overview

KRUX is the in-app utility token that rewards users for recycling plastic waste.
All minting and burning operations happen server-side via the `krux_ledger` table —
the client shows optimistic UI only.

---

## 1. Mint Rates (Scan Rewards)

| Plastic Type | Base KRUX | Notes |
|---|---|---|
| PET  | 15 | Water/beverage bottles — high recyclability |
| HDPE | 20 | Milk jugs, detergent — valuable recycling stream |
| PP   | 12 | Yogurt cups, bottle caps |
| LDPE | 10 | Plastic bags, film |
| PVC  | 8  | Lower recyclability |
| PS   | 7  | Polystyrene — often non-recyclable but tracked |
| OTHER| 5  | Mixed/unidentified |

### Confidence Multiplier

Reward is scaled by the ML model's confidence:

```
krux_earned = round(base × (0.5 + confidence × 1.5))
```

- Confidence 40% → ×1.1 (minimal reward)
- Confidence 70% → ×1.55
- Confidence 95% → ×1.925

### Streak Bonus

| Streak | Multiplier |
|---|---|
| 1–6 days   | ×1.0 |
| 7–29 days  | ×2.0 |
| 30+ days   | ×3.0 |

---

## 2. Daily Caps (Anti-inflation)

| Limit | Value |
|---|---|
| Max KRUX per day per user | 200 |
| Max scans per day per user | 20 |
| Max scans per hour per user | 5 |

The server enforces all caps. The client displays a warning when approaching the limit.

---

## 3. Burn Mechanisms

| Event | Cost (KRUX) |
|---|---|
| Marketplace purchase | Product price (varies) |
| Streak Freeze | 50 |
| Spin Wheel (premium) | 20 |

---

## 4. Bonus Minting Events

| Event | KRUX |
|---|---|
| Daily login | 5 |
| Referral (new user signs up) | 100 |
| Referred user first scan | +50 to referrer |
| Challenge completion | 50–200 (varies) |
| Spin Wheel win | 0–500 (probability weighted) |

---

## 5. Anti-Inflation Measures

1. **Daily cap:** max 200 KRUX/user/day prevents farming.
2. **Confidence multiplier:** lower-confidence scans earn less.
3. **Duplicate detection:** perceptual hash prevents same-image reuse (Hamming < 5).
4. **Fraud detection:** GPS velocity, device fingerprint, rate limiting.
5. **Ledger integrity:** balance is always derived from `SUM(krux_ledger.amount)`.
   The `profiles.krux_balance` is a denormalised cache; any discrepancy is correctable.
6. **Auto-ban:** 5+ fraud flags/week triggers account suspension.

---

## 6. Balance Invariant

```
profiles.krux_balance = SUM(krux_ledger.amount WHERE user_id = profiles.id)
```

Every balance change creates a `krux_ledger` entry with `balance_after` for auditability.
Admins can reconstruct any user's full history from the ledger alone.
