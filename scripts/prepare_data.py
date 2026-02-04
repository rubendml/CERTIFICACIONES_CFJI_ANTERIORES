import argparse
import hashlib
from pathlib import Path

import pandas as pd


COLUMNS_MAP = {
    "Cédula": "cedula",
    "Nombre": "nombre",
    "Cargo": "cargo",
    "Tratamiento": "tratamiento",
    "Especialidad": "especialidad",
    "Curso de Formación Judicial": "curso_formacion",
    "Convocatoria": "convocatoria",
    "Resolución": "resolucion",
    "Puntaje": "puntaje",
}


def normalize_str(value: object) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value).strip()
    return text if text else None


def normalize_cedula(value: object) -> str | None:
    text = normalize_str(value)
    if text is None:
        return None
    text = text.replace(".0", "")
    digits = "".join(ch for ch in text if ch.isdigit())
    return digits or None


def build_row_hash(row: dict, keys: list[str]) -> str:
    raw = "|".join((str(row.get(key) or "").strip()) for key in keys)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description="Preparar datos CFJI desde Excel.")
    parser.add_argument(
        "--excel",
        default=str(Path(__file__).resolve().parents[1] / "Información curso concursos - Actualizada con cargos y especialidad.xlsx"),
        help="Ruta al archivo Excel.",
    )
    parser.add_argument(
        "--sheet",
        default="GENERAL",
        help="Nombre de la hoja a procesar (por defecto: GENERAL).",
    )
    parser.add_argument(
        "--out",
        default=str(Path(__file__).resolve().parents[1] / "data" / "certificados_general.csv"),
        help="Ruta del CSV de salida.",
    )
    args = parser.parse_args()

    df = pd.read_excel(args.excel, sheet_name=args.sheet, dtype=str)
    df = df[list(COLUMNS_MAP.keys())].rename(columns=COLUMNS_MAP)

    df["cedula"] = df["cedula"].apply(normalize_cedula)
    for col in [
        "nombre",
        "cargo",
        "tratamiento",
        "especialidad",
        "curso_formacion",
        "convocatoria",
        "resolucion",
    ]:
        df[col] = df[col].apply(normalize_str)

    df["puntaje"] = pd.to_numeric(df["puntaje"], errors="coerce")

    hash_keys = [
        "cedula",
        "nombre",
        "cargo",
        "tratamiento",
        "especialidad",
        "curso_formacion",
        "convocatoria",
        "resolucion",
        "puntaje",
    ]
    df["registro_hash"] = df.apply(lambda row: build_row_hash(row.to_dict(), hash_keys), axis=1)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_path, index=False)

    print(f"Archivo generado: {out_path}")
    print(f"Filas exportadas: {len(df)}")


if __name__ == "__main__":
    main()
