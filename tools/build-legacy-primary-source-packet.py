#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import tempfile
import zipfile
from pathlib import Path, PurePosixPath
from typing import Iterable

SOURCE_REPOSITORY = "TakashiSasaki/scan.moukaeritai.work"
SOURCE_COMMIT = "a41267a7d79417706fd8f57b42fa67635a8de3b4"
DESTINATION_REPOSITORY = "TakashiSasaki/scan3"
DESTINATION_BASELINE = "c10f1be62c970cffd0d2c43c965beefdfb2beb37"
PACKET_ID = "legacy-primary-source-a41267a7"
PACKET_NAME = "scan3-source-packet-legacy-primary-source-a41267a7"

ENTRYPOINTS = {
    "src/App.tsx",
}

ADDITIONAL_RUNTIME_FILES = {
    "src/index.css",
}

REFERENCE_CANDIDATES = {
    "src/main.tsx",
    "package.json",
    "package-lock.json",
    "index.html",
    "tsconfig.json",
    "vite.config.ts",
    "firebase.json",
    "firebase-blueprint.json",
    "firestore.rules",
    "storage.rules",
    ".env.example",
}

# These surfaces have already been assigned to /demo or /test and must not be
# ingested into the legacy runtime source set.
EXCLUDED_EXACT = {
    "src/components/DemoScreen.tsx",
    "src/components/LibraryDemoScreen.tsx",
    "src/components/TestScreen.tsx",
}
EXCLUDED_PREFIXES = (
    "src/components/demos/",
    "src/components/demo/",
    "src/components/libraryDemos/",
    "src/components/library-demos/",
    "src/components/tests/",
)

CODE_SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}
RESOLUTION_SUFFIXES = (
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".json",
    ".css",
    ".svg",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
)

IMPORT_PATTERNS = (
    re.compile(r"(?:import|export)\s+(?:type\s+)?(?:[^;]*?\s+from\s+)?[\"']([^\"']+)[\"']", re.MULTILINE),
    re.compile(r"import\s*\(\s*[\"']([^\"']+)[\"']\s*\)"),
    re.compile(r"require\s*\(\s*[\"']([^\"']+)[\"']\s*\)"),
    re.compile(r"new\s+URL\s*\(\s*[\"']([^\"']+)[\"']\s*,\s*import\.meta\.url\s*\)"),
)
CSS_IMPORT_RE = re.compile(r"@import\s+(?:url\()?\s*[\"']([^\"']+)[\"']\s*\)?")
CSS_URL_RE = re.compile(r"url\(\s*[\"']?([^\"')]+)[\"']?\s*\)")


def run(
    args: list[str],
    *,
    cwd: Path | None = None,
    check: bool = True,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=str(cwd) if cwd else None,
        check=check,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def is_excluded(path: str) -> bool:
    return path in EXCLUDED_EXACT or any(path.startswith(prefix) for prefix in EXCLUDED_PREFIXES)


def normalize_repo_path(path: Path) -> str:
    return PurePosixPath(path.as_posix()).as_posix()


def local_specifiers(path: Path, text: str) -> set[str]:
    found: set[str] = set()
    if path.suffix in CODE_SUFFIXES:
        for pattern in IMPORT_PATTERNS:
            found.update(pattern.findall(text))
    elif path.suffix == ".css":
        found.update(CSS_IMPORT_RE.findall(text))
        for value in CSS_URL_RE.findall(text):
            if not value.startswith(("data:", "http:", "https:", "#")):
                found.add(value)
    return found


def resolve_local_import(source_root: Path, importer: str, specifier: str) -> str | None:
    if not specifier.startswith("."):
        return None

    importer_parent = PurePosixPath(importer).parent
    raw_candidate = importer_parent.joinpath(PurePosixPath(specifier))
    normalized = PurePosixPath(os.path.normpath(raw_candidate.as_posix()))
    if normalized.is_absolute() or ".." in normalized.parts:
        raise RuntimeError(f"Local import escapes repository root: {importer} -> {specifier}")

    candidates: list[PurePosixPath] = [normalized]
    if normalized.suffix == "":
        candidates.extend(PurePosixPath(f"{normalized}{suffix}") for suffix in RESOLUTION_SUFFIXES)
        candidates.extend(normalized / f"index{suffix}" for suffix in RESOLUTION_SUFFIXES)

    for candidate in candidates:
        candidate_text = candidate.as_posix()
        if (source_root / candidate_text).is_file():
            return candidate_text
    return ""


def collect_runtime_closure(source_root: Path) -> tuple[set[str], list[dict], list[dict], set[str]]:
    selected: set[str] = set()
    pending = list(sorted(ENTRYPOINTS | ADDITIONAL_RUNTIME_FILES))
    excluded_imports: list[dict] = []
    unresolved_imports: list[dict] = []
    external_specifiers: set[str] = set()

    while pending:
        path = pending.pop()
        if path in selected:
            continue
        if is_excluded(path):
            raise RuntimeError(f"Excluded path was selected as an entrypoint: {path}")

        absolute = source_root / path
        if not absolute.is_file():
            raise RuntimeError(f"Selected historical file does not exist: {path}")
        if absolute.is_symlink():
            raise RuntimeError(f"Historical source file is a symlink: {path}")

        selected.add(path)
        if absolute.suffix not in CODE_SUFFIXES and absolute.suffix != ".css":
            continue

        text = absolute.read_text(encoding="utf-8")
        for specifier in sorted(local_specifiers(absolute, text)):
            if not specifier.startswith("."):
                external_specifiers.add(specifier)
                continue

            resolved = resolve_local_import(source_root, path, specifier)
            if resolved is None:
                continue
            if resolved == "":
                unresolved_imports.append({"importer": path, "specifier": specifier})
                continue
            if is_excluded(resolved):
                excluded_imports.append(
                    {"importer": path, "specifier": specifier, "resolvedPath": resolved}
                )
                continue
            if resolved not in selected:
                pending.append(resolved)

    return selected, excluded_imports, unresolved_imports, external_specifiers


def git_blob_sha(source_root: Path, path: str) -> str:
    result = run(["git", "rev-parse", f"{SOURCE_COMMIT}:{path}"], cwd=source_root)
    return result.stdout.strip()


def working_tree_blob_sha(source_root: Path, path: str) -> str:
    result = run(["git", "hash-object", path], cwd=source_root)
    return result.stdout.strip()


def intended_destination(path: str) -> str:
    if not path.startswith("src/"):
        raise ValueError(f"Runtime restore path must be under src/: {path}")
    relative = path.removeprefix("src/")
    return f"src/app/surfaces/legacy/historical/{relative}"


def create_manifest_and_payload(
    source_root: Path,
    packet_root: Path,
    runtime_files: set[str],
    reference_files: set[str],
) -> tuple[dict, list[dict]]:
    payload_root = packet_root / "payload"
    payload_root.mkdir(parents=True, exist_ok=True)

    file_entries: list[dict] = []
    inventory: list[dict] = []

    for path in sorted(runtime_files | reference_files):
        source_path = source_root / path
        data = source_path.read_bytes()
        expected_blob = git_blob_sha(source_root, path)
        actual_blob = working_tree_blob_sha(source_root, path)
        if actual_blob != expected_blob:
            raise RuntimeError(
                f"Git blob mismatch for {path}: expected {expected_blob}, got {actual_blob}"
            )

        payload_path = payload_root / PurePosixPath(path)
        payload_path.parent.mkdir(parents=True, exist_ok=True)
        payload_path.write_bytes(data)

        is_runtime = path in runtime_files
        disposition = "restore" if is_runtime else "reference"
        destination = intended_destination(path) if is_runtime else None
        notes = (
            "Exact historical runtime source selected by local-import dependency closure. "
            "Restore only into the isolated legacy historical subtree; adaptation is required "
            "before activation, and Firebase connectivity must not be activated without owner approval."
            if is_runtime
            else "Historical configuration, entrypoint, or dependency context only. Do not overwrite scan3 root files."
        )

        entry = {
            "sourcePath": path,
            "payloadPath": path,
            "sha256": sha256_bytes(data),
            "sizeBytes": len(data),
            "disposition": disposition,
            "intendedDestination": destination,
            "notes": notes,
        }
        file_entries.append(entry)
        inventory.append(
            {
                **entry,
                "gitBlobSha1": actual_blob,
            }
        )

    manifest = {
        "formatVersion": "1.0",
        "packetId": PACKET_ID,
        "purpose": (
            "Provide an exact, selectively bounded primary historical source set for reconstructing "
            "the legacy routes under /app/legacy. Runtime files are staged under an isolated historical "
            "subtree; demo, library-demo, and test surfaces are intentionally excluded. This packet does "
            "not assert that the historical repository or all pre-redesign fixes are complete, and it does "
            "not authorize Firebase activation, migration, dual-write, fallback, or new EFP runtime work."
        ),
        "source": {
            "repository": SOURCE_REPOSITORY,
            "commit": SOURCE_COMMIT,
        },
        "destination": {
            "repository": DESTINATION_REPOSITORY,
            "baselineCommit": DESTINATION_BASELINE,
        },
        "files": file_entries,
        "ownerDecisions": [],
    }
    (packet_root / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    return manifest, inventory


def deterministic_zip(packet_root: Path, zip_path: Path) -> None:
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(packet_root.rglob("*")):
            if not path.is_file():
                continue
            archive_path = (Path(PACKET_NAME) / path.relative_to(packet_root)).as_posix()
            info = zipfile.ZipInfo(archive_path, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            archive.writestr(info, path.read_bytes())


def validate_packet(repo_root: Path, packet_root: Path) -> dict:
    result = run(
        ["node", str(repo_root / "scripts/validate-source-packet.cjs"), str(packet_root)],
        cwd=repo_root,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(
            "Official source-packet validator failed\n"
            f"stdout:\n{result.stdout}\n"
            f"stderr:\n{result.stderr}\n"
            f"exitStatus: {result.returncode}"
        )
    return {
        "status": "PASS",
        "stdout": result.stdout,
        "stderr": result.stderr,
        "exitStatus": result.returncode,
    }


def validate_archive_structure(zip_path: Path) -> dict:
    with zipfile.ZipFile(zip_path, "r") as archive:
        names = archive.namelist()
        if not names:
            raise RuntimeError("Generated ZIP is empty")
        top_levels = {PurePosixPath(name).parts[0] for name in names}
        if top_levels != {PACKET_NAME}:
            raise RuntimeError(f"Unexpected ZIP top-level entries: {sorted(top_levels)}")
        for info in archive.infolist():
            path = PurePosixPath(info.filename)
            if path.is_absolute() or ".." in path.parts:
                raise RuntimeError(f"Unsafe ZIP path: {info.filename}")
            mode = (info.external_attr >> 16) & 0xFFFF
            if stat.S_ISLNK(mode):
                raise RuntimeError(f"ZIP contains symlink: {info.filename}")
    return {"status": "PASS", "entryCount": len(names), "topLevel": PACKET_NAME}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--repository", required=True, type=Path)
    args = parser.parse_args()

    source_root = args.source.resolve()
    repo_root = args.repository.resolve()
    output_dir = repo_root / "source-packets"
    output_dir.mkdir(parents=True, exist_ok=True)

    actual_commit = run(["git", "rev-parse", "HEAD"], cwd=source_root).stdout.strip()
    if actual_commit != SOURCE_COMMIT:
        raise RuntimeError(f"Unexpected source checkout: {actual_commit}")

    runtime_files, excluded_imports, unresolved_imports, external_specifiers = collect_runtime_closure(source_root)
    if unresolved_imports:
        raise RuntimeError(
            "Unresolved local imports prevent a closed source set:\n"
            + json.dumps(unresolved_imports, ensure_ascii=False, indent=2)
        )

    reference_files = {
        path for path in REFERENCE_CANDIDATES if (source_root / path).is_file()
    }
    missing_reference_candidates = sorted(REFERENCE_CANDIDATES - reference_files)

    with tempfile.TemporaryDirectory(prefix="scan3-legacy-primary-") as temp_name:
        temp_root = Path(temp_name)
        packet_root = temp_root / PACKET_NAME
        packet_root.mkdir(parents=True)
        manifest, inventory = create_manifest_and_payload(
            source_root, packet_root, runtime_files, reference_files
        )

        pre_zip_validation = validate_packet(repo_root, packet_root)

        zip_path = output_dir / f"{PACKET_NAME}.zip"
        sidecar_path = output_dir / f"{PACKET_NAME}.zip.sha256"
        report_path = output_dir / f"{PACKET_NAME}-validation-report.json"
        for path in (zip_path, sidecar_path, report_path):
            if path.exists():
                path.unlink()

        deterministic_zip(packet_root, zip_path)
        archive_structure = validate_archive_structure(zip_path)
        zip_sha256 = sha256_bytes(zip_path.read_bytes())
        sidecar_path.write_text(
            f"{zip_sha256}  {zip_path.name}\n",
            encoding="utf-8",
            newline="\n",
        )

        extracted_root = temp_root / "extracted"
        extracted_root.mkdir()
        with zipfile.ZipFile(zip_path, "r") as archive:
            archive.extractall(extracted_root)
        post_zip_validation = validate_packet(repo_root, extracted_root / PACKET_NAME)

        sidecar_value = sidecar_path.read_text(encoding="utf-8").split()[0]
        if sidecar_value != sha256_bytes(zip_path.read_bytes()):
            raise RuntimeError("ZIP SHA-256 sidecar verification failed")

        report = {
            "packet": PACKET_NAME,
            "packetId": PACKET_ID,
            "scope": (
                "Selective primary historical source closure for legacy routes; not a complete "
                "historical repository restoration and not proof that all supplemental fixes are included."
            ),
            "source": manifest["source"],
            "destination": manifest["destination"],
            "selection": {
                "entrypoints": sorted(ENTRYPOINTS),
                "additionalRuntimeFiles": sorted(ADDITIONAL_RUNTIME_FILES),
                "runtimeFiles": sorted(runtime_files),
                "referenceFiles": sorted(reference_files),
                "excludedExactPaths": sorted(EXCLUDED_EXACT),
                "excludedPrefixes": list(EXCLUDED_PREFIXES),
                "excludedImports": excluded_imports,
                "unresolvedImports": unresolved_imports,
                "externalSpecifiers": sorted(external_specifiers),
                "missingOptionalReferenceCandidates": missing_reference_candidates,
            },
            "files": inventory,
            "validation": {
                "sourceCheckoutCommit": actual_commit,
                "gitBlobSha1": "PASS",
                "localImportClosure": "PASS",
                "officialNodeValidatorBeforeZip": pre_zip_validation,
                "archiveStructure": archive_structure,
                "zipSha256": "PASS",
                "officialNodeValidatorAfterExtraction": post_zip_validation,
            },
            "zip": {
                "filename": zip_path.name,
                "sha256": zip_sha256,
                "sizeBytes": zip_path.stat().st_size,
            },
            "limitations": [
                "Demo, library-demo, and test surfaces are intentionally excluded.",
                "The historical App.tsx still contains imports and routes for excluded surfaces; adaptation is required before activation.",
                "The packet stages exact source under src/app/surfaces/legacy/historical and does not activate it.",
                "Firebase connectivity and production operations remain prohibited without explicit owner approval.",
                "The primary candidate commit is not asserted to contain every pre-redesign fix.",
            ],
        }
        report_path.write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
            newline="\n",
        )

    print(json.dumps({
        "packet": PACKET_NAME,
        "runtimeFileCount": len(runtime_files),
        "referenceFileCount": len(reference_files),
        "zipSha256": zip_sha256,
        "output": str(output_dir),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
