import argparse
import os
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client


BATCH_SIZE = 500


def main() -> None:
    parser = argparse.ArgumentParser(description="Cargar CSV de certificados en Supabase.")
    parser.add_argument(
        "--csv",
        default=str(Path(__file__).resolve().parents[1] / "data" / "certificados_general.csv"),
        help="Ruta al CSV a cargar.",
    )
    parser.add_argument(
        "--table",
        default="certificados_cfji",
        help="Nombre de la tabla en Supabase.",
    )
    args = parser.parse_args()

    load_dotenv()
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        raise SystemExit("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.")

    supabase = create_client(supabase_url, supabase_key)

    df = pd.read_csv(args.csv)
    if "registro_hash" in df.columns:
        df = df.drop_duplicates(subset=["registro_hash"])
    df = df.astype(object).where(pd.notnull(df), None)
    records = df.to_dict(orient="records")

    for record in records:
        for key, value in record.items():
            if isinstance(value, float) and pd.isna(value):
                record[key] = None

    for start in range(0, len(records), BATCH_SIZE):
        chunk = records[start : start + BATCH_SIZE]
        try:
            supabase.table(args.table).upsert(chunk, on_conflict="registro_hash").execute()
        except Exception as exc:  # noqa: BLE001
            raise SystemExit(f"Error cargando datos: {exc}")
        print(f"Cargadas filas {start + 1} - {start + len(chunk)}")


if __name__ == "__main__":
    main()
