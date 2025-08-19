# Contributing to Work Dashboard

Thank you for your interest in contributing to Work Dashboard! We welcome contributions from the community.

## Development Setup

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn package manager

### Getting Started

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/work-dashboard.git
   cd work-dashboard
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Project**
   ```bash
   npm run build
   ```

4. **Start Development Server**
   ```bash
   npm run start
   ```

5. **Development Workflow**
   - Use `npm run watch` for continuous TypeScript compilation
   - The app will be available at `http://localhost:8000`

## Project Structure

- **`src/`** - TypeScript source files
- **`docs/`** - Documentation
- **`scripts/`** - Build and utility scripts
- **`config/`** - Configuration examples
- **Root files** - Built application files and configuration

## Code Style

### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow existing code patterns and naming conventions
- Use meaningful variable and function names
- Add comments for complex logic

### Configuration
- Use consistent indentation (2 spaces)
- Follow existing JSON/YAML structure patterns
- Document configuration options thoroughly

## Pull Request Process

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Write clear, concise commit messages
   - Keep changes focused and atomic
   - Test your changes thoroughly

3. **Build and Test**
   ```bash
   npm run build
   npm run start
   ```
   - Verify the application builds successfully
   - Test functionality in the browser
   - Check that no existing features are broken

4. **Submit Pull Request**
   - Use the provided PR template
   - Include screenshots for UI changes
   - Link to related issues
   - Provide clear description of changes

### Pull Request Guidelines

- **Title**: Use descriptive titles (e.g., "Add keyboard shortcuts for theme switching")
- **Description**: Explain what changes were made and why
- **Screenshots**: Include before/after screenshots for UI changes
- **Testing**: Describe how changes were tested
- **Breaking Changes**: Clearly document any breaking changes

## Issue Reporting

### Bug Reports
- Use the bug report template
- Include steps to reproduce
- Provide browser/OS information
- Include relevant error messages or console output

### Feature Requests
- Use the feature request template
- Explain the use case and motivation
- Consider implementation complexity
- Discuss alternatives if applicable

### Questions
- Check existing documentation first
- Search existing issues for similar questions
- Use the question template for general inquiries

## Code Quality

### Before Submitting
- [ ] Code builds successfully (`npm run build`)
- [ ] Application runs without errors (`npm run start`)
- [ ] Changes are tested in the browser
- [ ] No console errors or warnings introduced
- [ ] Code follows existing patterns and style

### Documentation
- Update documentation for new features
- Keep README.md current with any setup changes
- Add inline comments for complex logic
- Update configuration examples if needed

## Community Guidelines

- Be respectful and constructive in discussions
- Help newcomers and answer questions when possible
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md)
- Focus on the technical merit of contributions

## Getting Help

- **Documentation**: Check the `docs/` directory
- **Issues**: Search existing issues or create a new one
- **Discussions**: Use GitHub Discussions for general questions

Thank you for contributing to Work Dashboard! 🚀