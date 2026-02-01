#!/usr/bin/env python3
"""
Validation script for Vaani-Sahayak project setup.

This script validates that all core components are properly set up
and can be imported and used correctly.
"""

def validate_core_models():
    """Validate core data models."""
    from vaani_sahayak.core.models import (
        UserProfile, ConversationEntry, AudioInput, ProcessingResult,
        UserContext, ChannelType, AudioFormat, ProcessingStatus
    )
    from datetime import datetime
    
    # Test UserProfile
    profile = UserProfile(
        name="राम कुमार",
        phone_number="+919876543210",
        crop_type="wheat"
    )
    assert profile.name == "राम कुमार"
    assert profile.language == "hi-IN"
    
    # Test UserContext
    context = UserContext(
        phone_number="+919876543210",
        user_profile=profile
    )
    
    entry = ConversationEntry(
        timestamp=datetime.now(),
        user_input="test input",
        assistant_response="test response",
        session_id="session_123"
    )
    
    context.add_conversation(entry)
    assert context.total_interactions == 1
    
    print("✓ Core models validation passed")


def validate_exceptions():
    """Validate exception handling framework."""
    from vaani_sahayak.core.exceptions import (
        ErrorCodes, create_error, VaaniBaseException,
        TranscriptionError, ErrorSeverity
    )
    
    # Test error creation
    error = create_error(
        ErrorCodes.TRANSCRIPTION_FAILED,
        "Test transcription error",
        ErrorSeverity.HIGH
    )
    
    assert error.error_code == ErrorCodes.TRANSCRIPTION_FAILED
    assert error.severity == ErrorSeverity.HIGH
    
    # Test exception creation
    exception = TranscriptionError(error)
    assert str(exception).startswith("[TRANS_001]")
    
    print("✓ Exception handling validation passed")


def validate_aws_config():
    """Validate AWS configuration."""
    from vaani_sahayak.core.aws_config import AWSConfig, get_aws_config
    
    # Test configuration creation (without actual AWS credentials)
    try:
        config = AWSConfig()
        assert config.region_name == "ap-south-1"  # default region
        print("✓ AWS config validation passed")
    except Exception as e:
        # Expected if no AWS credentials are configured
        if "credentials" in str(e).lower():
            print("✓ AWS config validation passed (no credentials configured)")
        else:
            raise


def validate_logging():
    """Validate logging configuration."""
    from vaani_sahayak.utils.logging_config import (
        setup_logging, get_logger, set_correlation_id
    )
    
    # Test logger setup
    logger = setup_logging(log_level="INFO", enable_console=True, enable_cloudwatch=False)
    assert logger is not None
    
    # Test logger retrieval
    test_logger = get_logger("test_module")
    assert test_logger is not None
    
    # Test context setting
    set_correlation_id("test-correlation-123")
    
    print("✓ Logging configuration validation passed")


def validate_configuration():
    """Validate system configuration."""
    from vaani_sahayak.config import Config, config
    
    # Test configuration access
    assert Config.AWS_REGION == "ap-south-1"
    assert Config.SERVICE_NAME == "vaani-sahayak"
    assert Config.TRANSCRIBE_LANGUAGE_CODE == "hi-IN"
    
    # Test configuration methods
    aws_config = Config.get_aws_config()
    assert "region_name" in aws_config
    assert "transcribe" in aws_config
    
    storage_config = Config.get_storage_config()
    assert "user_context_table" in storage_config
    
    print("✓ Configuration validation passed")


def validate_interfaces():
    """Validate core interfaces."""
    from vaani_sahayak.core.interfaces import (
        AudioProcessor, TranscriptionService, IntelligenceService,
        TextToSpeechService, UserContextRepository
    )
    
    # Test that interfaces can be imported
    assert AudioProcessor is not None
    assert TranscriptionService is not None
    
    print("✓ Interface definitions validation passed")


def main():
    """Run all validation tests."""
    print("Validating Vaani-Sahayak project setup...")
    print("=" * 50)
    
    try:
        validate_core_models()
        validate_exceptions()
        validate_aws_config()
        validate_logging()
        validate_configuration()
        validate_interfaces()
        
        print("=" * 50)
        print("🎉 All validations passed! Project setup is complete.")
        print("\nProject structure created:")
        print("- Core data models and interfaces")
        print("- Exception handling framework")
        print("- AWS SDK configuration")
        print("- Structured logging system")
        print("- Configuration management")
        print("\nReady for implementation of subsequent tasks!")
        
    except Exception as e:
        print(f"❌ Validation failed: {e}")
        raise


if __name__ == "__main__":
    main()