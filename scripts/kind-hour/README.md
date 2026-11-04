# Kind Hour historical register importer

The importer lives in `../import-kind-hour.mjs`. The partner-supplied rescue ledger and its derived values **must be kept in approved private storage**, not in this source repository.

Set `KIND_HOUR_IMPORT_DIR` to a protected local directory containing:

- `rescue-register.csv`: the original reviewed source extract
- `ledger-values.json`: its financial-value transcription
- `places.json`: validated locality-resolution metadata

Also set `KIND_HOUR_SOURCE_FILE_ID` to the original source document identifier so provenance references are preserved.

```bash
KIND_HOUR_IMPORT_DIR=/private/path KIND_HOUR_SOURCE_FILE_ID='<approved source ID>' \
  node scripts/import-kind-hour.mjs --audit
```

Only use `--apply` with approved credentials and after checking the source checksum, date range, permissions, duplicates and staging results. Existing database records are not modified by this repository change.

**Privacy note:** previous versions of this public Git repository contained the source files. Deleting them from the current tree does not remove historical Git objects, forks, clones or cached copies. Review source-sharing permissions and data sensitivity before deciding whether a coordinated history-remediation procedure is needed.
