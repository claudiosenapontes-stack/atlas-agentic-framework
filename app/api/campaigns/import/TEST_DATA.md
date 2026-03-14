# Import Pipeline Test Data

## Test CSV 1: Valid Data
```csv
date,campaign_name,spend,leads,impressions,clicks
2026-03-13,Spring Lead Gen 2026,145.50,18,45230,342
2026-03-13,Retargeting Warm Audiences,89.25,8,28400,210
2026-03-12,Spring Lead Gen 2026,167.80,24,48900,378
2026-03-12,Retargeting Warm Audiences,91.25,11,31200,245
```

## Test CSV 2: With Duplicates
```csv
date,campaign_name,spend,leads
2026-03-13,Spring Lead Gen 2026,100.00,10
2026-03-13,Spring Lead Gen 2026,100.00,10
2026-03-13,Spring Lead Gen 2026,50.00,5
```
Expected: 1 row after dedup with spend=250, leads=15

## Test CSV 3: With Quarantine Triggers
```csv
date,campaign_name,spend,leads
2026-03-13,,100.00,10
2026-03-13,Test Campaign,-50.00,5
,Spring Lead Gen 2026,100.00,10
2026-03-14,Future Campaign,100.00,10
```
Expected: 
- Row 2: MISSING_CAMPAIGN
- Row 3: NEGATIVE_SPEND
- Row 4: MISSING_DATE
- Row 5: FUTURE_DATE

## Test CSV 4: Case/Whitespace Normalization
```csv
date,campaign_name,spend,leads
2026-03-13,SPRING LEAD GEN 2026,100.00,10
2026-03-13,spring lead gen 2026,50.00,5
2026-03-13,  Spring Lead Gen 2026  ,25.00,3
```
Expected: 1 campaign "Spring Lead Gen 2026" with spend=175, leads=18

## curl Test Command
```bash
curl -X POST http://localhost:3000/api/campaigns/import \
  -F "csv_file=@test.csv" \
  -F "company_id=arqia-uuid-placeholder"
```
