"""
Structured logging configuration for Vaani-Sahayak.

This module provides centralized logging configuration with structured
JSON logging for better observability and monitoring in AWS environments.
"""

import logging
import json
import os
import sys
from datetime import datetime
from typing import Dict, Any, Optional
from pythonjsonlogger import jsonlogger


class VaaniJSONFormatter(jsonlogger.JsonFormatter):
    """Custom JSON formatter for Vaani-Sahayak logs."""
    
    def add_fields(self, log_record: Dict[str, Any], record: logging.LogRecord, message_dict: Dict[str, Any]) -> None:
        """Add custom fields to log records."""
        super().add_fields(log_record, record, message_dict)
        
        # Add timestamp in ISO format
        log_record['timestamp'] = datetime.utcnow().isoformat() + 'Z'
        
        # Add service information
        log_record['service'] = 'vaani-sahayak'
        log_record['version'] = os.getenv('SERVICE_VERSION', '0.1.0')
        
        # Add AWS Lambda context if available
        if hasattr(record, 'aws_request_id'):
            log_record['aws_request_id'] = record.aws_request_id
        
        # Add correlation ID for request tracing
        if hasattr(record, 'correlation_id'):
            log_record['correlation_id'] = record.correlation_id
        
        # Add user context if available
        if hasattr(record, 'phone_number'):
            log_record['phone_number'] = record.phone_number
        
        if hasattr(record, 'session_id'):
            log_record['session_id'] = record.session_id
        
        # Add processing metrics if available
        if hasattr(record, 'processing_time_ms'):
            log_record['processing_time_ms'] = record.processing_time_ms
        
        if hasattr(record, 'audio_duration_seconds'):
            log_record['audio_duration_seconds'] = record.audio_duration_seconds


class ContextFilter(logging.Filter):
    """Filter to add contextual information to log records."""
    
    def __init__(self):
        super().__init__()
        self.context = {}
    
    def filter(self, record: logging.LogRecord) -> bool:
        """Add context information to log record."""
        for key, value in self.context.items():
            setattr(record, key, value)
        return True
    
    def set_context(self, **kwargs) -> None:
        """Set context information for subsequent log records."""
        self.context.update(kwargs)
    
    def clear_context(self) -> None:
        """Clear all context information."""
        self.context.clear()


# Global context filter instance
_context_filter = ContextFilter()


def setup_logging(log_level: str = None, 
                 enable_console: bool = True,
                 enable_cloudwatch: bool = None) -> logging.Logger:
    """Set up structured logging for Vaani-Sahayak.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        enable_console: Whether to enable console logging
        enable_cloudwatch: Whether to enable CloudWatch logging (auto-detected if None)
        
    Returns:
        Configured logger instance
    """
    # Determine log level
    if log_level is None:
        log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    
    # Auto-detect CloudWatch environment
    if enable_cloudwatch is None:
        enable_cloudwatch = bool(os.getenv('AWS_LAMBDA_FUNCTION_NAME'))
    
    # Get root logger
    logger = logging.getLogger('vaani_sahayak')
    logger.setLevel(getattr(logging, log_level))
    
    # Clear existing handlers
    logger.handlers.clear()
    
    # Create JSON formatter
    formatter = VaaniJSONFormatter(
        fmt='%(timestamp)s %(level)s %(name)s %(message)s'
    )
    
    # Console handler (for local development and Lambda)
    if enable_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        console_handler.addFilter(_context_filter)
        logger.addHandler(console_handler)
    
    # CloudWatch handler (if in AWS Lambda environment)
    if enable_cloudwatch:
        try:
            import watchtower
            cloudwatch_handler = watchtower.CloudWatchLogsHandler(
                log_group=f"/aws/lambda/{os.getenv('AWS_LAMBDA_FUNCTION_NAME', 'vaani-sahayak')}",
                stream_name=f"{datetime.now().strftime('%Y/%m/%d')}/[{os.getenv('AWS_LAMBDA_LOG_STREAM_NAME', 'local')}]"
            )
            cloudwatch_handler.setFormatter(formatter)
            cloudwatch_handler.addFilter(_context_filter)
            logger.addHandler(cloudwatch_handler)
        except ImportError:
            # watchtower not available, skip CloudWatch logging
            pass
    
    # Prevent propagation to root logger
    logger.propagate = False
    
    return logger


def get_logger(name: str = None) -> logging.Logger:
    """Get a logger instance for a specific module.
    
    Args:
        name: Logger name (usually __name__)
        
    Returns:
        Logger instance
    """
    if name is None:
        name = 'vaani_sahayak'
    elif not name.startswith('vaani_sahayak'):
        name = f'vaani_sahayak.{name}'
    
    return logging.getLogger(name)


def set_correlation_id(correlation_id: str) -> None:
    """Set correlation ID for request tracing.
    
    Args:
        correlation_id: Unique identifier for request correlation
    """
    _context_filter.set_context(correlation_id=correlation_id)


def set_user_context(phone_number: str, session_id: str = None) -> None:
    """Set user context for logging.
    
    Args:
        phone_number: User's phone number
        session_id: Session identifier
    """
    context = {'phone_number': phone_number}
    if session_id:
        context['session_id'] = session_id
    _context_filter.set_context(**context)


def set_processing_metrics(processing_time_ms: int = None, 
                         audio_duration_seconds: float = None) -> None:
    """Set processing metrics for logging.
    
    Args:
        processing_time_ms: Processing time in milliseconds
        audio_duration_seconds: Audio duration in seconds
    """
    context = {}
    if processing_time_ms is not None:
        context['processing_time_ms'] = processing_time_ms
    if audio_duration_seconds is not None:
        context['audio_duration_seconds'] = audio_duration_seconds
    _context_filter.set_context(**context)


def clear_context() -> None:
    """Clear all logging context."""
    _context_filter.clear_context()


def log_error(logger: logging.Logger, 
              error: Exception, 
              context: Optional[Dict[str, Any]] = None) -> None:
    """Log an error with structured information.
    
    Args:
        logger: Logger instance
        error: Exception to log
        context: Additional context information
    """
    error_info = {
        'error_type': type(error).__name__,
        'error_message': str(error)
    }
    
    if hasattr(error, 'error') and hasattr(error.error, 'to_dict'):
        # VaaniBaseException with structured error
        error_info.update(error.error.to_dict())
    
    if context:
        error_info.update(context)
    
    logger.error("Error occurred", extra=error_info)


def log_performance_metric(logger: logging.Logger,
                         metric_name: str,
                         value: float,
                         unit: str = 'ms',
                         context: Optional[Dict[str, Any]] = None) -> None:
    """Log a performance metric.
    
    Args:
        logger: Logger instance
        metric_name: Name of the metric
        value: Metric value
        unit: Unit of measurement
        context: Additional context information
    """
    metric_info = {
        'metric_name': metric_name,
        'metric_value': value,
        'metric_unit': unit
    }
    
    if context:
        metric_info.update(context)
    
    logger.info("Performance metric", extra=metric_info)


# Initialize default logger
default_logger = setup_logging()