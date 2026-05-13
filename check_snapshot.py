import json
f = open('C:/Users/jack/Claude Projects/oms/drizzle/meta/0014_snapshot.json')
d = json.load(f)
print(list(d.get('tables', {}).keys()))
