# Agent Rules

- **Project Construction Flow**: If the user instructs the agent to build any project (for example, "please build a calculator app with python, html, css and js in E:\My Creation\PYTHON\Projects\AI\coding\test"):
  1. The agent must first build a detailed implementation plan, including the proposed directory structure, component details, and file lists.
  2. The agent must stop and wait for explicit user approval/authentication.
  3. Only after the user approves/authenticates the plan should the agent proceed with building the project.

- **Project Standards, Aesthetics, and Documentation**: When asked to build a project/app, the agent must ensure it meets the highest standards:
  1. **Visual Design & Quality**: The project/app must be beautiful, gorgeous, colorful, professional, and industry-grade. For web projects, utilize modern design practices like responsive layouts, sleek dark/light modes, elegant gradients, customized typography, glassmorphism, and micro-animations or hover states.
  2. **Comprehensive Documentation**: A detailed and fully explained `README.md` must be built. It should document the project overview, directory structure, setup/installation instructions, usage, and architectural/design decisions.
  3. **Dependency Management**: A complete `requirements.txt` (or equivalent dependency file) must be created listing all external packages and dependencies with appropriate versions.

- **Pending Task (OmniRoute Integration)**: The user wants to introduce two LLM configuration options: "Local Qwen" (Ollama) and "OmniRoute" (Local Gateway). The plan is documented in the brain artifacts directory. When the user returns and mentions they are ready to proceed with OmniRoute, retrieve the plan and implement the changes to `llm_client.py`, `index.html`, and `app.js`.
