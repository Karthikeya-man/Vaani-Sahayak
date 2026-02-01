"""
Lambda Orchestrator for Vaani-Sahayak voice assistant system.

This module implements the main Lambda handler that coordinates all system components
and processes audio inputs from both PSTN and web channels.
"""

import json
import logging
import base64
from typing import Dict, Any, Optional, Tuple
from datetime import datetime

from .core.models import (
    AudioInput, 
    ProcessingResult, 
    ChannelType, 
    AudioFormat,
    ProcessingStatus
)
from .core.exceptions import (
    VaaniBaseException,
    AudioProcessingError,
    ConfigurationError,
    StorageError,
    ErrorCodes,
    create_error,
    ErrorSeverity
)
from .utils.logging_config import get_logger
from .core.aws_config import get_aws_config


logger = get_logger(__name__)


class VaaniOrchestrator:
    """
    Main orchestrator class that handles Lambda events and coordinates
    the complete audio processing pipeline.
    """
    
    def __init__(self):
        """Initialize the orchestrator with required services."""
        self.logger = logger
        self.aws_config = get_aws_config()
        self.s3_client = self.aws_config.get_s3_client()
        
    def lambda_handler(self, event: Dict[str, Any], context: Any) -> Dict[str, Any]:
        """
        Main Lambda handler entry point for all audio processing.
        
        Args:
            event: Lambda event data (Kinesis or S3)
            context: Lambda context object
            
        Returns:
            Response dictionary with processing results
        """
        try:
            self.logger.info("Lambda handler invoked", extra={
                "event_type": type(event).__name__,
                "request_id": getattr(context, 'aws_request_id', 'unknown')
            })
            
            # Detect input source and route appropriately
            input_source = self._detect_input_source(event)
            self.logger.info(f"Detected input source: {input_source}")
            
            if input_source == "kinesis":
                result = self._process_streaming_audio(event, context)
            elif input_source == "s3":
                result = self._process_uploaded_audio(event, context)
            else:
                raise AudioProcessingError(
                    create_error(
                        ErrorCodes.INVALID_AUDIO,
                        f"Unknown event source: {input_source}",
                        ErrorSeverity.HIGH,
                        {"event": event}
                    )
                )
            
            self.logger.info("Processing completed successfully", extra={
                "processing_time_ms": result.processing_time_ms,
                "confidence_score": result.confidence_score
            })
            
            return {
                "statusCode": 200,
                "body": json.dumps({
                    "success": True,
                    "result": result.to_dict()
                })
            }
            
        except VaaniBaseException as e:
            self.logger.error(f"Vaani processing error: {e}", extra={
                "error_code": e.error.error_code,
                "error_context": e.error.context
            })
            
            return {
                "statusCode": 500,
                "body": json.dumps({
                    "success": False,
                    "error": e.error.to_dict()
                })
            }
            
        except Exception as e:
            self.logger.error(f"Unexpected error in Lambda handler: {e}", exc_info=True)
            
            error = create_error(
                ErrorCodes.INTERNAL_ERROR,
                f"Unexpected error: {str(e)}",
                ErrorSeverity.CRITICAL,
                {"exception_type": type(e).__name__}
            )
            
            return {
                "statusCode": 500,
                "body": json.dumps({
                    "success": False,
                    "error": error.to_dict()
                })
            }
    
    def _detect_input_source(self, event: Dict[str, Any]) -> str:
        """
        Detect whether the event comes from Kinesis (PSTN) or S3 (web).
        
        Args:
            event: Lambda event data
            
        Returns:
            Input source type: "kinesis" or "s3"
            
        Raises:
            AudioProcessingError: If event source cannot be determined
        """
        try:
            # Check for Kinesis Video Streams event (PSTN channel)
            if "Records" in event:
                records = event["Records"]
                if records and len(records) > 0:
                    first_record = records[0]
                    
                    # Kinesis event structure
                    if first_record.get("eventSource") == "aws:kinesis":
                        self.logger.debug("Detected Kinesis event source")
                        return "kinesis"
                    
                    # S3 event structure
                    elif first_record.get("eventSource") == "aws:s3":
                        self.logger.debug("Detected S3 event source")
                        return "s3"
            
            # Check for direct Kinesis Video Streams format
            if "kinesis" in event or "kinesisVideo" in event:
                self.logger.debug("Detected direct Kinesis Video event")
                return "kinesis"
            
            # Check for API Gateway event (web channel)
            if "httpMethod" in event or "requestContext" in event:
                self.logger.debug("Detected API Gateway event (treating as S3)")
                return "s3"
            
            # If we can't determine the source, log the event structure for debugging
            self.logger.warning("Unable to determine event source", extra={
                "event_keys": list(event.keys()),
                "event_sample": {k: str(v)[:100] for k, v in event.items()}
            })
            
            raise AudioProcessingError(
                create_error(
                    ErrorCodes.INVALID_AUDIO,
                    "Unable to determine event source type",
                    ErrorSeverity.HIGH,
                    {"event_keys": list(event.keys())}
                )
            )
            
        except Exception as e:
            if isinstance(e, VaaniBaseException):
                raise
            
            raise AudioProcessingError(
                create_error(
                    ErrorCodes.INTERNAL_ERROR,
                    f"Error detecting input source: {str(e)}",
                    ErrorSeverity.HIGH,
                    {"exception_type": type(e).__name__}
                )
            )
    
    def _process_streaming_audio(self, event: Dict[str, Any], context: Any) -> ProcessingResult:
        """
        Handle real-time audio from phone calls via Kinesis.
        
        Args:
            event: Kinesis event data
            context: Lambda context
            
        Returns:
            Processing result
        """
        start_time = datetime.now()
        
        try:
            self.logger.info("Processing streaming audio from PSTN channel")
            
            # Extract audio data from Kinesis event
            audio_input = self._extract_kinesis_audio(event)
            
            # TODO: Implement complete processing pipeline
            # This is a placeholder implementation for subtask 2.1
            result = ProcessingResult(
                transcribed_text="[Placeholder] Audio received from PSTN",
                generated_response="[Placeholder] Response for PSTN user",
                status=ProcessingStatus.PENDING,
                processing_time_ms=int((datetime.now() - start_time).total_seconds() * 1000)
            )
            
            self.logger.info("Streaming audio processing initiated", extra={
                "channel": audio_input.source_channel.value,
                "session_id": audio_input.session_id,
                "audio_duration": audio_input.duration_seconds
            })
            
            return result
            
        except Exception as e:
            if isinstance(e, VaaniBaseException):
                raise
            
            raise AudioProcessingError(
                create_error(
                    ErrorCodes.AUDIO_001,
                    f"Error processing streaming audio: {str(e)}",
                    ErrorSeverity.HIGH,
                    {"context_request_id": getattr(context, 'aws_request_id', 'unknown')}
                )
            )
    
    def _process_uploaded_audio(self, event: Dict[str, Any], context: Any) -> ProcessingResult:
        """
        Handle uploaded audio files from web app via S3.
        
        Args:
            event: S3 event data
            context: Lambda context
            
        Returns:
            Processing result
        """
        start_time = datetime.now()
        
        try:
            self.logger.info("Processing uploaded audio from web channel")
            
            # Extract audio data from S3 event
            audio_input = self._extract_s3_audio(event)
            
            # TODO: Implement complete processing pipeline
            # This is a placeholder implementation for subtask 2.1
            result = ProcessingResult(
                transcribed_text="[Placeholder] Audio received from web",
                generated_response="[Placeholder] Response for web user",
                status=ProcessingStatus.PENDING,
                processing_time_ms=int((datetime.now() - start_time).total_seconds() * 1000)
            )
            
            self.logger.info("Uploaded audio processing initiated", extra={
                "channel": audio_input.source_channel.value,
                "session_id": audio_input.session_id,
                "audio_duration": audio_input.duration_seconds
            })
            
            return result
            
        except Exception as e:
            if isinstance(e, VaaniBaseException):
                raise
            
            raise AudioProcessingError(
                create_error(
                    ErrorCodes.AUDIO_001,
                    f"Error processing uploaded audio: {str(e)}",
                    ErrorSeverity.HIGH,
                    {"context_request_id": getattr(context, 'aws_request_id', 'unknown')}
                )
            )
    
    def _extract_kinesis_audio(self, event: Dict[str, Any]) -> AudioInput:
        """
        Extract audio data from Kinesis Video Streams event.
        
        Args:
            event: Kinesis event data
            
        Returns:
            AudioInput object with extracted data
        """
        try:
            # Extract basic information from Kinesis event
            records = event.get("Records", [])
            if not records:
                raise AudioProcessingError(
                    create_error(
                        ErrorCodes.INVALID_AUDIO,
                        "No records found in Kinesis event",
                        ErrorSeverity.HIGH
                    )
                )
            
            # Process all records to accumulate audio chunks
            audio_chunks = []
            phone_number = "unknown"
            session_id = None
            
            for record in records:
                kinesis_data = record.get("kinesis", {})
                
                # Extract phone number from partition key (first record)
                if phone_number == "unknown":
                    phone_number = kinesis_data.get("partitionKey", "unknown")
                    session_id = f"kinesis_{phone_number}_{datetime.now().timestamp()}"
                
                # Extract and decode audio data
                encoded_data = kinesis_data.get("data", "")
                if encoded_data:
                    try:
                        # Decode base64 audio chunk
                        audio_chunk = base64.b64decode(encoded_data)
                        audio_chunks.append(audio_chunk)
                        
                        self.logger.debug(f"Extracted audio chunk: {len(audio_chunk)} bytes", extra={
                            "sequence_number": kinesis_data.get("sequenceNumber"),
                            "partition_key": kinesis_data.get("partitionKey")
                        })
                        
                    except Exception as decode_error:
                        self.logger.warning(f"Failed to decode audio chunk: {decode_error}")
                        continue
            
            if not audio_chunks:
                raise AudioProcessingError(
                    create_error(
                        ErrorCodes.INVALID_AUDIO,
                        "No valid audio data found in Kinesis records",
                        ErrorSeverity.HIGH,
                        {"total_records": len(records)}
                    )
                )
            
            # Combine all audio chunks
            combined_audio = b"".join(audio_chunks)
            
            # Estimate duration (rough calculation for Opus at 16kHz)
            # Opus typically compresses to ~32kbps, so 4KB per second
            estimated_duration = len(combined_audio) / 4096.0
            
            # Validate audio data
            self._validate_audio_data(combined_audio, AudioFormat.OPUS)
            
            return AudioInput(
                source_channel=ChannelType.PSTN,
                phone_number=phone_number,
                audio_data=combined_audio,
                format=AudioFormat.OPUS,  # Kinesis streams typically use Opus
                duration_seconds=estimated_duration,
                session_id=session_id or f"kinesis_{datetime.now().timestamp()}"
            )
            
        except Exception as e:
            if isinstance(e, VaaniBaseException):
                raise
            
            raise AudioProcessingError(
                create_error(
                    ErrorCodes.INVALID_AUDIO,
                    f"Error extracting Kinesis audio data: {str(e)}",
                    ErrorSeverity.HIGH,
                    {"event_structure": list(event.keys())}
                )
            )
    
    def _extract_s3_audio(self, event: Dict[str, Any]) -> AudioInput:
        """
        Extract audio data from S3 upload event.
        
        Args:
            event: S3 event data
            
        Returns:
            AudioInput object with extracted data
        """
        try:
            # Extract basic information from S3 event
            records = event.get("Records", [])
            if not records:
                raise AudioProcessingError(
                    create_error(
                        ErrorCodes.INVALID_AUDIO,
                        "No records found in S3 event",
                        ErrorSeverity.HIGH
                    )
                )
            
            first_record = records[0]
            s3_data = first_record.get("s3", {})
            bucket_info = s3_data.get("bucket", {})
            object_info = s3_data.get("object", {})
            
            bucket_name = bucket_info.get("name", "")
            object_key = object_info.get("key", "")
            object_size = object_info.get("size", 0)
            
            if not bucket_name or not object_key:
                raise AudioProcessingError(
                    create_error(
                        ErrorCodes.INVALID_AUDIO,
                        "Missing bucket name or object key in S3 event",
                        ErrorSeverity.HIGH,
                        {"bucket": bucket_name, "key": object_key}
                    )
                )
            
            # Extract phone number and format from object key
            # Expected format: audio_files/{phone_number}/{timestamp}.{format}
            key_parts = object_key.split("/")
            if len(key_parts) < 3:
                raise AudioProcessingError(
                    create_error(
                        ErrorCodes.INVALID_AUDIO,
                        f"Invalid S3 object key format: {object_key}",
                        ErrorSeverity.HIGH,
                        {"expected_format": "audio_files/{phone_number}/{timestamp}.{format}"}
                    )
                )
            
            phone_number = key_parts[1]
            filename = key_parts[-1]
            
            # Determine audio format from file extension
            file_extension = filename.split(".")[-1].lower()
            audio_format = AudioFormat.OPUS  # Default
            
            if file_extension in ["mp3", "opus", "wav"]:
                audio_format = AudioFormat(file_extension)
            else:
                self.logger.warning(f"Unknown audio format: {file_extension}, defaulting to Opus")
            
            # Download audio file from S3
            audio_data = self._download_s3_audio(bucket_name, object_key)
            
            # Validate audio data
            self._validate_audio_data(audio_data, audio_format)
            
            # Estimate duration based on file size and format
            duration_seconds = self._estimate_audio_duration(audio_data, audio_format)
            
            session_id = f"s3_{phone_number}_{datetime.now().timestamp()}"
            
            self.logger.info("Successfully extracted S3 audio", extra={
                "bucket": bucket_name,
                "key": object_key,
                "size_bytes": len(audio_data),
                "format": audio_format.value,
                "duration_seconds": duration_seconds,
                "phone_number": phone_number
            })
            
            return AudioInput(
                source_channel=ChannelType.WEB,
                phone_number=phone_number,
                audio_data=audio_data,
                format=audio_format,
                duration_seconds=duration_seconds,
                session_id=session_id
            )
            
        except Exception as e:
            if isinstance(e, VaaniBaseException):
                raise
            
            raise AudioProcessingError(
                create_error(
                    ErrorCodes.INVALID_AUDIO,
                    f"Error extracting S3 audio data: {str(e)}",
                    ErrorSeverity.HIGH,
                    {"event_structure": list(event.keys())}
                )
            )
    
    def _download_s3_audio(self, bucket_name: str, object_key: str) -> bytes:
        """
        Download audio file from S3.
        
        Args:
            bucket_name: S3 bucket name
            object_key: S3 object key
            
        Returns:
            Audio data as bytes
        """
        try:
            self.logger.debug(f"Downloading audio from S3: s3://{bucket_name}/{object_key}")
            
            response = self.s3_client.get_object(Bucket=bucket_name, Key=object_key)
            audio_data = response['Body'].read()
            
            self.logger.debug(f"Downloaded {len(audio_data)} bytes from S3")
            return audio_data
            
        except Exception as e:
            raise StorageError(
                create_error(
                    ErrorCodes.S3_ERROR,
                    f"Failed to download audio from S3: {str(e)}",
                    ErrorSeverity.HIGH,
                    {"bucket": bucket_name, "key": object_key}
                ),
                e
            )
    
    def _validate_audio_data(self, audio_data: bytes, audio_format: AudioFormat) -> None:
        """
        Validate audio data for basic requirements.
        
        Args:
            audio_data: Audio data to validate
            audio_format: Expected audio format
            
        Raises:
            AudioProcessingError: If audio data is invalid
        """
        # Check minimum size (at least 1KB)
        if len(audio_data) < 1024:
            raise AudioProcessingError(
                create_error(
                    ErrorCodes.AUDIO_TOO_SHORT,
                    f"Audio data too small: {len(audio_data)} bytes",
                    ErrorSeverity.MEDIUM,
                    {"size_bytes": len(audio_data), "format": audio_format.value}
                )
            )
        
        # Check maximum size (10MB limit for reasonable processing)
        max_size = 10 * 1024 * 1024  # 10MB
        if len(audio_data) > max_size:
            raise AudioProcessingError(
                create_error(
                    ErrorCodes.AUDIO_TOO_LONG,
                    f"Audio data too large: {len(audio_data)} bytes",
                    ErrorSeverity.MEDIUM,
                    {"size_bytes": len(audio_data), "max_size": max_size, "format": audio_format.value}
                )
            )
        
        # Basic format validation based on file headers
        format_headers = {
            AudioFormat.MP3: [b'ID3', b'\xff\xfb', b'\xff\xf3', b'\xff\xf2'],
            AudioFormat.WAV: [b'RIFF'],
            AudioFormat.OPUS: [b'OggS']  # Opus is typically in Ogg container
        }
        
        if audio_format in format_headers:
            headers = format_headers[audio_format]
            if not any(audio_data.startswith(header) for header in headers):
                self.logger.warning(f"Audio data may not match expected format {audio_format.value}")
                # Don't raise error, just log warning as format detection can be unreliable
    
    def _estimate_audio_duration(self, audio_data: bytes, audio_format: AudioFormat) -> float:
        """
        Estimate audio duration based on file size and format.
        
        Args:
            audio_data: Audio data
            audio_format: Audio format
            
        Returns:
            Estimated duration in seconds
        """
        # Rough estimates based on typical compression rates
        # These are approximations for planning purposes
        bytes_per_second = {
            AudioFormat.MP3: 16000,    # ~128kbps
            AudioFormat.OPUS: 4000,    # ~32kbps (highly compressed)
            AudioFormat.WAV: 32000     # ~256kbps (uncompressed 16-bit mono)
        }
        
        rate = bytes_per_second.get(audio_format, 8000)  # Default conservative estimate
        duration = len(audio_data) / rate
        
        # Reasonable bounds (1 second to 5 minutes)
        duration = max(1.0, min(duration, 300.0))
        
        return duration


# Lambda handler function for AWS Lambda deployment
def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda entry point.
    
    Args:
        event: Lambda event data
        context: Lambda context object
        
    Returns:
        Response dictionary
    """
    orchestrator = VaaniOrchestrator()
    return orchestrator.lambda_handler(event, context)