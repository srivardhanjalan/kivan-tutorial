"""The search key the users table's NameSearchIndex prefix-matches on."""


def name_lowercase(first_name: str | None, last_name: str | None) -> str:
    """Lowercased "first last" for the typeahead prefix search. Derived in one
    place so provisioning (the initial write) and a profile name change can
    never spell the search key two different ways — a mismatch would drop a
    renamed user out of search until their next edit.
    """
    return f"{first_name or ''} {last_name or ''}".strip().lower()
