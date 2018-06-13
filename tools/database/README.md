Database Abstraction Layer
==========================
The Database Abstraction Layer isolates the mechanics of persisting the data, and standardizes how it is accessed, validated, persisted, checked, how errors are reported, etc.

The queries are separated from the logic and the data, so the can be easily swapped for a different set. Queries can include substitutions not supported by the database (such as types or table names) and support currying.
