import chromadb

client = chromadb.PersistentClient(path="./chroma_db")
col = client.get_collection("attijari")

results = col.get(where={"source": "banque_distance"}, limit=20)

print(f"Found: {len(results['ids'])} docs")
for m in results['metadatas']:
    print(f"  - {m.get('titre') or m.get('theme', '?')}")

# add to check_db.py and run
results = col.get(where={"source": "banque_distance"}, limit=20)
for m in results['metadatas']:
    print(f"titre: {m.get('titre')} | url: {m.get('url')} | theme: {m.get('theme')}")    