# Contributing to Work Dashboard

Thank you for your interest in contributing to Work Dashboard! This document provides guidelines and information to help you contribute effectively.

## 🚀 Quick Start

1. **Fork** this repository
2. **Clone** your fork locally
3. **Install** dependencies: `npm install`
4. **Build** the project: `npm run build`
5. **Start** the development server: `npm run start`
6. Open `http://127.0.0.1:8000` in your browser

## 🛠️ Development Setup

### Prerequisites

- **Node.js** 18+ and npm
- A modern web browser
- Text editor with TypeScript support (VS Code recommended)

### Local Development

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/work-dashboard.git
cd work-dashboard

# Install dependencies
npm install

# Build TypeScript files
npm run build

# Start local development server
npm run start

# For active development, run TypeScript in watch mode
npm run watch
```

### Configuration

Create a local configuration file to test your changes:

```bash
cp config.example.json config.json
# Edit config.json with your preferred settings
```

## 📝 Code Style Guidelines

### General Principles

- **Minimal changes**: Make the smallest possible changes to achieve your goal
- **Consistency**: Follow existing patterns and conventions in the codebase
- **Readability**: Write clear, self-documenting code
- **Performance**: Consider the impact of your changes on load time and responsiveness

### TypeScript/JavaScript

- Use TypeScript for new code
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Prefer `const` over `let` where possible
- Use modern ES6+ features appropriately

### CSS

- Follow existing CSS patterns and variable usage
- Consider dark/light theme compatibility
- Test responsive behavior across different screen sizes
- Maintain accessibility standards

### File Organization

- Keep main application files (`index.html`, `styles.css`, `app.js`) in the root
- Place TypeScript source files in `src/`
- Add documentation to `docs/`
- Configuration examples go in the root (e.g., `config.example.json`)

## 🧪 Testing Your Changes

### Manual Testing

1. **Build and run** locally: `npm run build && npm run start`
2. **Test core functionality**:
   - Quick launcher (Ctrl/Cmd+K)
   - Theme switching
   - Background cycling (if enabled)
   - Configuration loading
3. **Cross-browser testing**: Chrome, Firefox, Safari
4. **Responsive testing**: Desktop, tablet, mobile viewports
5. **Accessibility testing**: Keyboard navigation, screen reader compatibility

### Configuration Testing

Test your changes with different configurations:
- Empty configuration (`{}`)
- Minimal configuration with just a few links
- Full configuration with all features enabled

## 📋 Pull Request Process

### Before Submitting

- [ ] Code builds successfully (`npm run build`)
- [ ] Changes work in multiple browsers
- [ ] No console errors or warnings
- [ ] Documentation updated if necessary
- [ ] Commit messages are clear and descriptive

### PR Guidelines

1. **Create a focused PR**: One feature or fix per pull request
2. **Use descriptive titles**: Clearly describe what the PR does
3. **Fill out the PR template**: Provide context and testing instructions
4. **Link related issues**: Use "Fixes #123" or "Closes #123"
5. **Add screenshots**: For UI changes, include before/after screenshots
6. **Keep changes minimal**: Avoid refactoring unrelated code

### PR Template

When creating a PR, please include:

- **Description**: What does this PR do?
- **Motivation**: Why is this change needed?
- **Testing**: How did you test this change?
- **Screenshots**: For UI changes, include visual evidence
- **Breaking changes**: Any breaking changes or migration notes?

## 🐛 Reporting Issues

### Bug Reports

Use the **Bug Report** template and include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS information
- Configuration (if relevant)
- Screenshots or error messages

### Feature Requests

Use the **Feature Request** template and include:

- Clear description of the desired feature
- Use cases and motivation
- Potential implementation approach
- Examples from other applications (if relevant)

### Questions

Use the **Question** template for:

- Configuration help
- Usage questions
- Clarifications about behavior
- General discussion

## 🎯 Good First Issues

Look for issues labeled `good first issue` if you're new to the project. These are typically:

- Documentation improvements
- Small feature additions
- Bug fixes with clear reproduction steps
- Code cleanup tasks

## 📚 Code Architecture

### Key Files

- `src/app.ts`: Main application logic
- `src/sw.ts`: Service worker for PWA functionality
- `config-loader.js`: Configuration loading and merging
- `index.html`: Main HTML structure
- `styles.css`: All styling and CSS variables

### Key Concepts

- **Configuration system**: Layered config loading (defaults → examples → user config)
- **Command DSL**: Flexible command parsing and URL templating
- **Theme system**: CSS custom properties for light/dark modes
- **Background cycling**: Automatic wallpaper rotation with accessibility considerations
- **PWA features**: Service worker, manifest, offline capability

## 📋 Code Review Guidelines

### For Contributors

- Be responsive to feedback
- Ask questions if review comments are unclear
- Update your PR based on feedback
- Keep discussions focused and constructive

### For Reviewers

- Be kind and constructive
- Focus on code quality and project goals
- Suggest specific improvements
- Approve when ready, or clearly request changes

## 🔐 Security

- Report security vulnerabilities privately via the SECURITY.md file
- Don't commit sensitive information (API keys, credentials, etc.)
- Consider security implications of new features
- Test with various configurations to avoid XSS or other vulnerabilities

## ❓ Questions?

- Check existing [documentation](docs/)
- Search existing [issues](https://github.com/AccursedGalaxy/work-dashboard/issues)
- Create a new issue with the **Question** template
- Join discussions in existing PRs and issues

## 🙏 Recognition

All contributors will be recognized in the project. Thank you for helping make Work Dashboard better!

---

*This guide is based on established open-source contribution patterns and will evolve as the project grows.*