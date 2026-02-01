# Contributing to Vaani-Sahayak

Thank you for your interest in contributing to Vaani-Sahayak! This project aims to bridge the digital divide for rural India through AI-powered voice assistance. Every contribution helps make technology more accessible to farmers and villagers.

## 🌟 Ways to Contribute

- **Code**: Implement features, fix bugs, improve performance
- **Documentation**: Improve docs, add examples, create tutorials
- **Testing**: Write tests, report bugs, validate rural use cases
- **Design**: UI/UX improvements, accessibility enhancements
- **Translation**: Hindi language improvements, regional dialect support
- **Research**: Rural connectivity optimization, user experience studies

## 🚀 Getting Started

### Prerequisites

- Python 3.9+
- AWS Account (for testing cloud integrations)
- Git and GitHub account
- Basic understanding of voice processing and AI services

### Development Setup

1. **Fork and Clone**:
```bash
git clone https://github.com/YOUR_USERNAME/Vaani-Sahayak.git
cd Vaani-Sahayak
```

2. **Create Virtual Environment**:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install Dependencies**:
```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

4. **Set Up Pre-commit Hooks**:
```bash
pre-commit install
```

5. **Configure Environment**:
```bash
cp .env.example .env
# Edit .env with your test configuration
```

6. **Run Tests**:
```bash
pytest tests/
```

## 📋 Development Workflow

### 1. Choose an Issue

- Browse [open issues](https://github.com/Karthikeya-man/Vaani-Sahayak/issues)
- Look for `good first issue` or `help wanted` labels
- Comment on the issue to indicate you're working on it

### 2. Create a Branch

```bash
git checkout -b feature/issue-number-description
# Examples:
# git checkout -b feature/123-ondc-integration
# git checkout -b bugfix/456-audio-processing
# git checkout -b docs/789-api-documentation
```

### 3. Make Changes

- Follow the existing code style and patterns
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass locally

### 4. Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add ONDC market price integration"
git commit -m "fix: resolve audio transcription timeout issue"
git commit -m "docs: update API documentation for Bedrock Agent"
git commit -m "test: add property tests for user context management"
```

**Commit Types**:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Maintenance tasks

### 5. Push and Create PR

```bash
git push origin feature/your-branch-name
```

Then create a Pull Request on GitHub with:
- Clear title and description
- Reference to related issues
- Screenshots/demos if applicable
- Test results and coverage

## 🧪 Testing Guidelines

### Test Types

1. **Unit Tests**: Test individual functions and classes
```python
def test_transcribe_hindi_audio():
    # Test specific functionality
    pass
```

2. **Property-Based Tests**: Test universal properties
```python
@given(audio_input=audio_strategy())
def test_audio_processing_property(audio_input):
    # Test properties that should hold for all inputs
    pass
```

3. **Integration Tests**: Test component interactions
```python
def test_end_to_end_voice_processing():
    # Test complete workflows
    pass
```

### Running Tests

```bash
# All tests
pytest

# Specific test file
pytest tests/test_orchestrator.py

# With coverage
pytest --cov=vaani_sahayak

# Property-based tests with statistics
pytest --hypothesis-show-statistics
```

### Test Requirements

- All new features must include tests
- Maintain or improve test coverage
- Tests should be fast and reliable
- Mock external services (AWS, ONDC) in unit tests

## 📝 Code Style

### Python Style Guide

- Follow [PEP 8](https://pep8.org/)
- Use [Black](https://black.readthedocs.io/) for formatting
- Use [isort](https://pycqa.github.io/isort/) for import sorting
- Use type hints where appropriate

```python
from typing import Optional, Dict, Any

def process_audio(
    audio_data: bytes, 
    user_context: Optional[Dict[str, Any]] = None
) -> ProcessingResult:
    """Process audio input with user context.
    
    Args:
        audio_data: Raw audio bytes
        user_context: Optional user profile and history
        
    Returns:
        ProcessingResult with transcription and response
    """
    pass
```

### Documentation Style

- Use clear, concise language
- Include code examples
- Document all public APIs
- Use docstrings for functions and classes

## 🌍 Rural India Focus

When contributing, keep in mind our target users:

### User Considerations
- **Limited Connectivity**: Optimize for low bandwidth
- **Device Constraints**: Support Nokia feature phones and basic smartphones
- **Language Preferences**: Hindi with rural dialect understanding
- **Technical Literacy**: Simple, intuitive interfaces
- **Economic Constraints**: Cost-effective solutions

### Technical Considerations
- **Offline Capability**: PWA features for intermittent connectivity
- **Audio Optimization**: Compressed formats for data efficiency
- **Error Handling**: Graceful degradation and clear feedback
- **Performance**: Fast response times for real-time conversations
- **Accessibility**: Voice-first interface design

## 🔍 Code Review Process

### For Contributors

- Ensure all tests pass
- Update documentation
- Follow the style guide
- Write clear commit messages
- Respond to review feedback promptly

### For Reviewers

- Focus on functionality and user impact
- Check test coverage and quality
- Verify documentation updates
- Consider rural use case implications
- Be constructive and helpful

## 🐛 Bug Reports

When reporting bugs, include:

1. **Environment**: OS, Python version, dependencies
2. **Steps to Reproduce**: Clear, minimal example
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Audio Samples**: If audio-related (anonymized)
6. **Logs**: Relevant error messages or logs

Use the bug report template:

```markdown
**Environment**
- OS: [e.g., Ubuntu 20.04]
- Python: [e.g., 3.9.7]
- Vaani-Sahayak: [e.g., v1.2.0]

**Bug Description**
A clear description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. See error

**Expected Behavior**
What you expected to happen.

**Screenshots/Logs**
If applicable, add screenshots or logs.
```

## 💡 Feature Requests

For new features, consider:

1. **Rural Impact**: How does this help rural users?
2. **Technical Feasibility**: Is it implementable with current architecture?
3. **Resource Requirements**: What's the cost/complexity?
4. **User Experience**: How does it fit the voice-first interface?

Use the feature request template and discuss in [GitHub Discussions](https://github.com/Karthikeya-man/Vaani-Sahayak/discussions) first.

## 📚 Resources

### Learning Materials
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Amazon Connect Developer Guide](https://docs.aws.amazon.com/connect/)
- [ONDC Network Documentation](https://ondc.org/developers)
- [Streamlit Documentation](https://docs.streamlit.io/)
- [Property-Based Testing with Hypothesis](https://hypothesis.readthedocs.io/)

### Project-Specific
- [Architecture Overview](/.kiro/specs/vaani-sahayak/design.md)
- [Requirements Document](/.kiro/specs/vaani-sahayak/requirements.md)
- [Implementation Tasks](/.kiro/specs/vaani-sahayak/tasks.md)

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- Annual contributor appreciation posts

## 📞 Getting Help

- **GitHub Discussions**: For questions and ideas
- **GitHub Issues**: For bugs and feature requests
- **Code Review**: Tag maintainers for urgent reviews
- **Email**: maintainers@vaani-sahayak.com for sensitive issues

## 📜 Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you agree to uphold this code.

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

---

**Thank you for contributing to Vaani-Sahayak!** 

Together, we're building technology that truly serves rural India. Every line of code, every test, every documentation improvement brings us closer to bridging the digital divide.

*Made with ❤️ for Rural India*