# Program-Enforced VRF Settlement (Solana + Switchboard)

## 1) Request Round (client tx)
Client calls `request_round(round_id, tier, direction)`.

Program:
- creates Round PDA (status=Pending)
- requests Switchboard randomness (CPI)
- embeds callback to `settle_round` with required accounts

## 2) Fulfillment (oracle)
Switchboard fulfills randomness and calls back into `settle_round`.

Program:
- validates fulfillment source (TODO)
- stores randomness receipt in Round
- derives outcome deterministically (hash mapping)
- updates PlayerProfile points + streak

UI:
- displays results by reading Round + PlayerProfile (not local simulation)
