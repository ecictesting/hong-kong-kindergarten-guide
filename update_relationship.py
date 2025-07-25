import csv, json

# 讀取 CSV，把「一條龍」的幼稚園名稱標記為有關係
relationship_map = {}
with open('Xia-Zai.csv', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        name = row['幼稚園／學校名稱'].strip()
        relationship_map[name] = '有關係' if row['一條龍模式'].strip() == '一條龍' else ''

# 讀取原 merged.json（或你現行的 merged.json）
with open('merged.json', encoding='utf-8') as f:
    data = json.load(f)

# 清空 primarySchool/secondarySchool，並根據 CSV 設定 relationship
for k in data:
    k['primarySchool'] = ''
    k['secondarySchool'] = ''
    k['relationship'] = relationship_map.get(k['chineseName'], '')

# 輸出新版 merged_updated.json
with open('merged_updated.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print('merged_updated.json 已生成，共 %d 筆資料' % len(data))
