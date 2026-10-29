import pandas as pd

df = pd.read_csv('district_v_validation_test.csv', encoding='utf-8-sig', nrows=1)
print('Columns:', list(df.columns))

KEYWORD_MAPPINGS = {
    "barangay": ["barangay", "community", "jurisdiction", "name", "target", "area", "brgy"],
    "avg_monthly_income_php": ["income", "monthly_income", "salary", "earnings"],
    "pct_employed_head": ["employ", "head_employ", "working_head"],
    "pct_informal_settlers": ["informal", "settler", "tenure"],
    "pct_with_access_to_electricity": ["electr", "power", "grid"],
    "pct_with_safe_water_access": ["water", "potable", "drinking"],
    "pct_with_sanitary_toilet": ["toilet", "sanitary", "latrine"],
    "net_enrollment_rate": ["enroll", "school_attending", "student"],
    "pct_permanent_house_material": ["permanent", "housing", "house_material", "concrete"],
    "pct_completed_secondary_education": ["secondary", "high_school", "high school", "educat"],
    "avg_family_size": ["family", "household_size", "size", "members"],
}

normalized_cols = {
    str(c).replace("\ufeff", "").replace('"', "").replace("'", "").strip().lower(): c
    for c in df.columns
}
print("Normalized cols:", normalized_cols)

col_map = {}
for canon_field, keywords in KEYWORD_MAPPINGS.items():
    matched = None
    for norm_c, orig_c in normalized_cols.items():
        if norm_c == canon_field:
            matched = orig_c
            break
    if not matched:
        for norm_c, orig_c in normalized_cols.items():
            for kw in keywords:
                if kw in norm_c:
                    matched = orig_c
                    print(f"  Matched '{canon_field}' via keyword '{kw}' in col '{norm_c}'")
                    break
            if matched:
                break
    if matched:
        col_map[canon_field] = matched
    else:
        print(f"  MISSING: '{canon_field}' - no match found")

missing = [f for f in KEYWORD_MAPPINGS.keys() if f not in col_map]
print("Missing:", missing)
print("col_map:", col_map)
