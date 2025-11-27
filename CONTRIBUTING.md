# Contributing to Shopee-Amazon Automation Platform

Thank you for your interest in contributing! We welcome contributions from the community.

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/AUTOMATION.git
   cd AUTOMATION
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/AUTOMATION.git
   ```

## 🔧 Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

3. **Run database migrations**:
   ```bash
   cd apps/api
   npx prisma migrate dev
   ```

4. **Start development servers**:
   ```bash
   # Terminal 1 - Frontend
   cd apps/web
   npm run dev

   # Terminal 2 - API
   cd apps/api
   npm run dev
   ```

## 📝 Making Changes

1. **Create a branch** for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

2. **Make your changes** following our code style:
   - Use TypeScript for type safety
   - Follow existing code formatting
   - Add comments for complex logic
   - Update translations in both `en` and `ja` if adding UI text

3. **Test your changes**:
   ```bash
   npm test
   npm run build  # Ensure no build errors
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

   **Commit Message Format**:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Adding tests
   - `chore:` - Maintenance tasks

## 🔍 Code Guidelines

### TypeScript
- Use strict type checking
- Avoid `any` types when possible
- Define interfaces for complex objects

### React Components
- Use functional components with hooks
- Keep components small and focused
- Use proper prop types

### Internationalization
- Always use translation keys, never hardcode text
- Add translations to both `en/common.json` and `ja/common.json`
- Use descriptive key names (e.g., `orders.table.status`)

### API Routes
- Follow RESTful conventions
- Add proper error handling
- Document endpoints with comments
- Validate input data

### Database
- Use Prisma for all database operations
- Create migrations for schema changes
- Add indexes for frequently queried fields

## 🧪 Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Aim for >80% code coverage

```bash
npm test                    # Run tests
npm run test:coverage       # Check coverage
```

## 📤 Submitting Changes

1. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request**:
   - Go to the original repository on GitHub
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill in the PR template with:
     - Description of changes
     - Related issue numbers
     - Screenshots (if UI changes)
     - Testing done

3. **Wait for review**:
   - Maintainers will review your PR
   - Address any feedback
   - Make requested changes
   - Push updates to your branch

## 🐛 Reporting Bugs

1. **Check existing issues** to avoid duplicates
2. **Create a new issue** with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots/logs if applicable
   - Environment details (OS, Node version, etc.)

## 💡 Feature Requests

1. **Check existing issues** for similar requests
2. **Create a new issue** describing:
   - The problem you're trying to solve
   - Proposed solution
   - Alternative solutions considered
   - How it benefits users

## 📋 Pull Request Checklist

Before submitting, ensure:

- [ ] Code follows project style guidelines
- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Translations added for both English and Japanese
- [ ] Documentation updated if needed
- [ ] Commit messages follow conventional format
- [ ] No console.log statements in production code
- [ ] No commented-out code
- [ ] No merge conflicts with main branch

## 🤝 Code Review Process

1. **Automated checks** must pass:
   - Build successful
   - Tests passing
   - Linting passed

2. **Manual review** by maintainers:
   - Code quality
   - Adherence to guidelines
   - Test coverage
   - Documentation

3. **Feedback addressed**:
   - Make requested changes
   - Respond to comments
   - Update PR description if needed

4. **Approval and merge**:
   - At least one maintainer approval required
   - Squash and merge preferred
   - Delete branch after merge

## 🎯 Best Practices

### Performance
- Optimize images and assets
- Use lazy loading where appropriate
- Minimize bundle size
- Cache API responses when possible

### Security
- Never commit secrets or credentials
- Validate all user input
- Use parameterized queries
- Follow OWASP guidelines

### Accessibility
- Add aria-labels to interactive elements
- Ensure keyboard navigation works
- Use semantic HTML
- Test with screen readers

### Documentation
- Document complex logic with comments
- Update README for new features
- Add JSDoc comments to functions
- Keep documentation in sync with code

## 📞 Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Create an issue with "bug" label
- **Security**: Email security@example.com (do not create public issue)

## 🙏 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation

## 📜 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Provide constructive feedback
- Focus on what's best for the project

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

Thank you for contributing to make this project better! 🎉