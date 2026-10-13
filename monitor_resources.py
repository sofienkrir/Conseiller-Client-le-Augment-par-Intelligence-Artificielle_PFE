"""
monitor_resources.py — Échantillonne CPU/RAM pendant un test de charge Locust.

Affiche, toutes les 2 secondes :
  - CPU global (%) et RAM globale (%)
  - CPU/RAM agrégés du backend (process uvicorn/python servant api.app)
Et garde la trace des pics. Optionnellement, écrit un CSV.

Usage:
  pip install psutil
  python monitor_resources.py                 # tourne jusqu'à Ctrl+C
  python monitor_resources.py --duration 200  # ~ durée d'un test 3 min + marge
  python monitor_resources.py --csv usage_50.csv

Lance-le dans un 3e terminal, EN MÊME TEMPS que Locust, puis Ctrl+C à la fin
pour afficher le résumé (pics CPU/RAM à reporter dans le rapport).
"""

import argparse
import time
from datetime import datetime

try:
    import psutil
except ImportError:
    raise SystemExit("psutil manquant. Installe-le:  pip install psutil")


def find_backend_procs():
    """Process du backend FastAPI (uvicorn api.app / python ... api.app)."""
    procs = []
    for p in psutil.process_iter(["pid", "name", "cmdline"]):
        try:
            cmdline = " ".join(p.info.get("cmdline") or [])
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
        low = cmdline.lower()
        if "api.app" in low or ("uvicorn" in low and "app" in low):
            procs.append(p)
    return procs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--interval", type=float, default=2.0, help="Intervalle (s)")
    ap.add_argument("--duration", type=float, default=0, help="Durée totale (s), 0 = infini")
    ap.add_argument("--csv", type=str, default="", help="Fichier CSV de sortie")
    args = ap.parse_args()

    backend = find_backend_procs()
    if backend:
        pids = ", ".join(str(p.pid) for p in backend)
        print(f"[monitor] Backend détecté (PID: {pids})")
    else:
        print("[monitor] ATTENTION: aucun process backend 'api.app' détecté. "
              "Seules les mesures globales seront fiables.")

    # Amorçage des compteurs cpu_percent (le 1er appel renvoie 0.0).
    psutil.cpu_percent(interval=None)
    for p in backend:
        try:
            p.cpu_percent(interval=None)
        except psutil.Error:
            pass

    ncpu = psutil.cpu_count() or 1
    peak_cpu = peak_ram = peak_proc_cpu = peak_proc_ram = 0.0

    csv_f = open(args.csv, "w", encoding="utf-8") if args.csv else None
    if csv_f:
        csv_f.write("timestamp,cpu_global_pct,ram_global_pct,backend_cpu_pct,backend_ram_mb\n")

    print(f"\n{'heure':<10} {'CPU%':>7} {'RAM%':>7} {'API_CPU%':>9} {'API_RAM_MB':>11}")
    print("-" * 48)

    start = time.time()
    try:
        while True:
            time.sleep(args.interval)

            cpu = psutil.cpu_percent(interval=None)
            ram = psutil.virtual_memory().percent

            proc_cpu = 0.0
            proc_ram_mb = 0.0
            for p in list(backend):
                try:
                    # cpu_percent peut dépasser 100 (multi-cœur) → normalisé /ncpu.
                    proc_cpu += p.cpu_percent(interval=None) / ncpu
                    proc_ram_mb += p.memory_info().rss / (1024 * 1024)
                except psutil.Error:
                    backend.remove(p)

            peak_cpu = max(peak_cpu, cpu)
            peak_ram = max(peak_ram, ram)
            peak_proc_cpu = max(peak_proc_cpu, proc_cpu)
            peak_proc_ram = max(peak_proc_ram, proc_ram_mb)

            ts = datetime.now().strftime("%H:%M:%S")
            print(f"{ts:<10} {cpu:>7.1f} {ram:>7.1f} {proc_cpu:>9.1f} {proc_ram_mb:>11.1f}")
            if csv_f:
                csv_f.write(f"{ts},{cpu:.1f},{ram:.1f},{proc_cpu:.1f},{proc_ram_mb:.1f}\n")
                csv_f.flush()

            if args.duration and (time.time() - start) >= args.duration:
                break
    except KeyboardInterrupt:
        pass
    finally:
        if csv_f:
            csv_f.close()

    print("\n" + "=" * 48)
    print("RÉSUMÉ (valeurs à reporter dans le rapport) :")
    print(f"  Pic CPU global      : {peak_cpu:.1f} %")
    print(f"  Pic RAM global      : {peak_ram:.1f} %")
    print(f"  Pic CPU backend API : {peak_proc_cpu:.1f} %")
    print(f"  Pic RAM backend API : {peak_proc_ram:.1f} Mo")
    print("=" * 48)


if __name__ == "__main__":
    main()
