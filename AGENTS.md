# Alarkive development constraints

- Alarkive V0.1 is a single-user personal learning document tool.
- Do not implement or call an AI API in V0.1.
- Do not implement multi-user accounts, community, Explore, online Fork, payments, recommendations, or collaboration.
- Markdown is the canonical content format.
- Keep page components modular; `page.tsx` must not contain an entire page implementation.
- Prefer reusing focused components, but avoid abstractions without a current use case.
- Keep `main` buildable. After changes, run formatting checks, lint, TypeScript checks, and a production build.
- Continue the existing stack unless a change is explicitly justified.
- Do not refactor code unrelated to the current task.
- Use shared types and fixtures rather than duplicating page data.
- Preserve the product wireframes under `docs/design/`.
