#!/usr/bin/env python3
"""
Script pour nettoyer les marqueurs de conflit Git dans un projet.

Utilisation:
    python clean_git_conflicts.py          # Mode dry-run (prévisualisation)
    python clean_git_conflicts.py --fix    # Applique les corrections

Stratégie: garde le code HEAD (version locale) et supprime la version "incoming".
"""

import os
import sys
import re
import shutil
from pathlib import Path

# Extensions de fichiers à scanner
EXTENSIONS = {".py", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".md", ".txt", ".json"}

# Dossiers à ignorer
IGNORE_DIRS = {
    "node_modules", ".git", "__pycache__", ".venv", "venv", "env",
    "chroma_db", "chroma_shared", "chroma_uploads", "models",
    "dist", "build", ".next", ".claude",
}

# Pattern de détection
CONFLICT_PATTERN = re.compile(
    r"<<<<<<< HEAD\n(.*?)=======\n(.*?)>>>>>>> [a-f0-9]+.*?\n",
    re.DOTALL
)

# Pattern pour détecter les marqueurs seuls (cas où ils sont orphelins)
ORPHAN_MARKERS = [
    re.compile(r"^<<<<<<< HEAD\s*$", re.MULTILINE),
    re.compile(r"^=======\s*$", re.MULTILINE),
    re.compile(r"^>>>>>>> [a-f0-9]+.*?$", re.MULTILINE),
]


def find_conflict_files(root_dir):
    """Trouve tous les fichiers avec des marqueurs de conflit."""
    conflict_files = []
    root = Path(root_dir)
    
    for path in root.rglob("*"):
        # Ignorer les dossiers listés
        if any(part in IGNORE_DIRS for part in path.parts):
            continue
        
        # Uniquement les fichiers avec extensions ciblées
        if not path.is_file() or path.suffix not in EXTENSIONS:
            continue
        
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            
            # Vérifier la présence de marqueurs
            has_conflict = (
                "<<<<<<< HEAD" in content
                or "=======" in content and ">>>>>>> " in content
                or re.search(r">>>>>>> [a-f0-9]{7,40}", content)
            )
            
            if has_conflict:
                # Compter les conflits
                count = len(re.findall(r"<<<<<<< HEAD", content))
                orphans = len(re.findall(r">>>>>>> [a-f0-9]{7,40}", content))
                conflict_files.append({
                    "path": path,
                    "conflicts": count,
                    "orphan_markers": orphans,
                })
        except Exception as e:
            print(f"⚠️  Erreur lecture {path}: {e}")
    
    return conflict_files


def clean_content(content):
    """
    Nettoie le contenu en gardant la version HEAD et en supprimant l'incoming.
    Retourne le contenu nettoyé et le nombre de conflits résolus.
    """
    original = content
    resolved = 0
    
    # Résoudre les conflits complets: garder HEAD, supprimer incoming
    def replace_conflict(match):
        nonlocal resolved
        resolved += 1
        head_code = match.group(1)
        # On garde la version HEAD (locale)
        return head_code
    
    content = CONFLICT_PATTERN.sub(replace_conflict, content)
    
    # Nettoyer les marqueurs orphelins restants (au cas où)
    for pattern in ORPHAN_MARKERS:
        content = pattern.sub("", content)
    
    # Nettoyer les lignes vides multiples créées par le nettoyage
    content = re.sub(r"\n{4,}", "\n\n\n", content)
    
    return content, resolved


def main():
    fix_mode = "--fix" in sys.argv
    root_dir = os.path.dirname(os.path.abspath(__file__))
    
    print(f"\n🔍 Scanning {root_dir} for Git conflict markers...\n")
    
    conflicts = find_conflict_files(root_dir)
    
    if not conflicts:
        print("✅ Aucun marqueur de conflit trouvé. Tout est propre!")
        return
    
    print(f"🚨 {len(conflicts)} fichier(s) avec conflits:\n")
    for item in conflicts:
        rel_path = item["path"].relative_to(root_dir)
        print(f"  • {rel_path}")
        print(f"    - {item['conflicts']} conflit(s) complet(s)")
        print(f"    - {item['orphan_markers']} marqueur(s) orphelin(s)")
    
    if not fix_mode:
        print("\n💡 Mode DRY-RUN. Pour appliquer les corrections, lance:")
        print(f"    python {os.path.basename(__file__)} --fix")
        return
    
    # Mode fix
    print("\n🔧 Application des corrections...\n")
    
    backup_dir = Path(root_dir) / "backup_before_conflict_cleanup"
    backup_dir.mkdir(exist_ok=True)
    
    total_resolved = 0
    for item in conflicts:
        path = item["path"]
        rel_path = path.relative_to(root_dir)
        
        # Backup
        backup_path = backup_dir / str(rel_path).replace("\\", "_").replace("/", "_")
        shutil.copy2(path, backup_path)
        
        # Lire, nettoyer, écrire
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            
            cleaned, resolved = clean_content(content)
            
            with open(path, "w", encoding="utf-8") as f:
                f.write(cleaned)
            
            print(f"  ✓ {rel_path} — {resolved} conflit(s) résolu(s)")
            total_resolved += resolved
        except Exception as e:
            print(f"  ❌ {rel_path}: {e}")
    
    print(f"\n✅ Total: {total_resolved} conflit(s) résolu(s) dans {len(conflicts)} fichier(s).")
    print(f"📦 Sauvegarde: {backup_dir}")
    print("\n💡 Redémarre uvicorn maintenant:")
    print("    uvicorn api.app:app --reload")


if __name__ == "__main__":
    main()