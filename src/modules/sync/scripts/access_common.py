import os
from pathlib import Path
from typing import Optional


def get_repo_root() -> Path:
    """Devuelve la raíz del proyecto backend."""
    return Path(__file__).resolve().parents[4]


def get_default_access_db_path() -> str:
    """Obtiene la ruta por defecto del archivo Access."""
    env_path = os.getenv("ACCESS_DB_PATH")
    if env_path:
        return env_path

    repo_root = get_repo_root()
    default_candidates = [
        repo_root / "dowtown.mdb",
        repo_root / "src" / "modules" / "sync" / "dowtown.mdb",
        Path(r"c:\develop\gym-backend\dowtown.mdb"),
        Path("dowtown.mdb"),
    ]

    for candidate in default_candidates:
        if candidate.exists():
            return str(candidate.resolve())

    return str((repo_root / "dowtown.mdb").resolve())


def resolve_access_db_path(explicit_path: Optional[str] = None, default_path: Optional[str] = None, cwd: Optional[str] = None) -> str:
    """Resuelve una ruta de base de datos Access desde argumentos o valores por defecto."""
    cwd_path = Path(cwd or os.getcwd()).resolve()

    if explicit_path:
        expanded = os.path.expanduser(explicit_path)
        if os.path.isabs(expanded):
            return expanded

        candidate = (cwd_path / expanded).resolve()
        return str(candidate)

    if default_path:
        expanded = os.path.expanduser(default_path)
        if os.path.isabs(expanded):
            return expanded
        candidate = (cwd_path / expanded).resolve()
        return str(candidate)

    return get_default_access_db_path()


def build_access_connection_string(db_path: str) -> str:
    """Construye la cadena de conexión compatible con pyodbc para Access."""
    return f"Driver={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={db_path};"
