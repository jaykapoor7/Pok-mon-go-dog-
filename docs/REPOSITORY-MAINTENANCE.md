# Repository maintenance policy

The repository hosts working product code, database definitions, tests and enough documentation to maintain the platform. A professional repository should be trustworthy before it is visually polished.

## What belongs here

- Versioned source, migration files, tests and configuration essential to build and audit the product.
- Current setup, architecture, security and release documentation.
- Small reproducible fixtures with invented data, relevant licensing notices and correctly attributed third-party code or assets.

## What must stay out

- Environment files, credentials, private keys, service-role access and third-party tokens.
- Real reporter identities, individual case photographs, private conversations and unapproved partner material.
- Generated browser traces, screenshots, local database dumps, raw test logs and temporary build artifacts unless specifically curated as necessary evidence.
- Unverified traction claims, fabricated testimonials and unsupported statements of municipal acceptance.

## Review before removal

Historical reports, migrations, asset packs, third-party skills and video assets may carry reproducibility or licence obligations. Check imports, references and CI workflows before deleting or moving them. If they are obsolete, retain the identifying commit or release reference and mark the relevant documentation as historical.

Never rewrite commit authorship to imply work was performed by someone else. New commits should use a real configured author and should omit irrelevant session transcripts or promotional boilerplate. Treat past activity as historical record.

## Branch, deploy and incident policy

Production changes should arrive through a reviewed PR and checks; prevent direct pushes to the deployment branch through GitHub repository rules where available. Keep database changes separately reviewed and backed up. Confirm the current production deployment SHA before and after shipping. See [release recovery](../REVERT.md).

Git history may retain deleted sensitive content; removal from the current tree is not remediation. If credentials have been committed, revoke or rotate them immediately, scope the exposure and arrange appropriate history remediation only after evaluating forks, clones and the deployment impact.
