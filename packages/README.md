# Reserved package destinations

These directories are migration destinations, not package owners. A directory
must not gain `package.json` or production source until its source repository is
frozen by an explicit cutover and the ownership ledger is changed in the same
accepted slice.

The authoritative inventory is `architecture/package-inventory.json`.
