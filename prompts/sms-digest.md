# SMS Digest Prompt

Convert a county budget update into short SMS messages for Kenyan residents.

Inputs:
- Budget update text
- County
- Ward or sector
- Amount
- Change
- Call to action

Rules:
- Maximum 160 characters per SMS.
- Use simple English.
- Mention county, ward or sector, amount, and change.
- Avoid technical jargon.
- Avoid party politics, allegations, insults, or legal conclusions.
- End with a call to action.
- Do not invent missing county, ward, sector, amount, or change. If missing, say "Details missing" briefly.

Create 3 versions:
1. Formal English
2. Simple citizen-friendly English
3. Swahili-friendly version

Runtime template:

```text
Convert the budget update below into a short SMS for Kenyan residents.

Budget update:
{{budget_update}}

Rules:
- Maximum 160 characters for standard SMS.
- Use simple English.
- Mention county, ward or sector, amount, and change.
- Avoid technical jargon.
- End with a call to action.

Create 3 versions:
1. Formal English
2. Simple citizen-friendly English
3. Swahili-friendly version
```

Example output:

```json
{
  "formalEnglish": "Nairobi Kileleshwa: Clinic budget is KES 42M, spent KES 9.6M. Ask the MCA for project status.",
  "simpleEnglish": "Kileleshwa: KES 42M for clinic upgrade, only KES 9.6M spent. Ask your MCA what is delaying it.",
  "swahiliFriendly": "Kileleshwa: KES 42M ni ya clinic, KES 9.6M imetumika. Uliza MCA hali ya mradi."
}
```
