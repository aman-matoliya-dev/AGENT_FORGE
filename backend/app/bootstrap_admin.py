import sys
from getpass import getpass

from app.services import db
from app.services.auth import bootstrap_admin


def main() -> None:
    if not sys.stdin.isatty():
        raise SystemExit("Run administrator bootstrap from an interactive terminal.")
    db.require_current_schema()
    email = input("Administrator email: ")
    display_name = input("Administrator display name: ")
    password = getpass("Administrator password (12-1024 characters): ")
    confirmation = getpass("Confirm administrator password: ")
    if password != confirmation:
        raise SystemExit("Passwords did not match; no administrator was created.")
    try:
        bootstrap_admin(email, display_name, password)
    except (RuntimeError, ValueError) as error:
        raise SystemExit(str(error)) from error
    print("Administrator bootstrap completed.")


if __name__ == "__main__":
    main()
