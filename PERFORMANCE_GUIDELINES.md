# HRMS Performance and Scalability Guidelines

To ensure the HRMS remains performant as the database grows, all current and future developers must adhere to these guidelines:

## 1. Database Indexing
- **Always index foreign keys:** Any column used as a `ForeignKey` must have `index=True`.
- **Index filterable columns:** Columns frequently used in `filter()`, `order_by()`, or `WHERE` clauses (e.g., `year`, `status`, `cnic`, `name`, `officer_official`) must have `index=True`.
- **Avoid over-indexing:** Do not index columns that are rarely searched or updated frequently.

## 2. Query Optimization (Avoiding N+1 Problems)
- **Use Joined Loading:** When fetching related data (e.g., Employees with ACR reports, or Employees with Leaves), ALWAYS use `sqlalchemy.orm.joinedload` to fetch related data in a single query.
- **Selective Fetching:** Only select the columns you need if the table has very wide rows (many columns). Use `db.query(models.Model.col1, models.Model.col2)`.
- **Filter Early:** Apply filters (`.filter()`) in the database query before calling `.all()` or `.first()`. Never filter the entire dataset in Python.

## 3. Future Section Development
- **New Modules:** When adding a new module (e.g., Document Management), define models with appropriate indexing immediately.
- **Async Operations:** For any long-running task (Excel sync, PDF generation), use FastAPI `BackgroundTasks`.

## 4. Code Structure
- Keep `models.py` clean.
- Ensure all logic related to complex filtering is handled at the database level.
