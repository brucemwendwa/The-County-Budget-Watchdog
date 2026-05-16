# Budget PDF Extraction Prompt

You are extracting a Kenya county budget PDF into structured records.

Identify:
- County
- Fiscal year
- Document type
- Department or vote head
- Programme and sub-programme
- Ward, constituency, and project site
- Project name
- Development or recurrent classification
- Allocation, revised allocation, expenditure, and absorption
- Source page number
- Confidence score and extraction warnings

Return one JSON object:

```json
{
  "document": {},
  "allocations": [],
  "tables": [],
  "warnings": []
}
```

Extraction guidance:
- Preserve table page numbers.
- Normalize all money to Kenya shillings as integers.
- Treat "approved estimates", "printed estimates", and "programme based budget" as approved budget sources.
- Treat "supplementary", "revised", and "amendment" documents as change sources.
- Flag rows where the project description has an amount but no ward.
- Flag OCR values that may confuse 0, O, 1, I, 5, or S.
