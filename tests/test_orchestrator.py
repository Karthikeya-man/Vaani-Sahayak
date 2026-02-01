"""
Unit tests for the Vaani-Sahayak Lambda Orchestrator.

Tests the main Lambda handler functionality including event source detection
and routing logic for different input channels.
"""

import json
import pytest
import base64
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from hypothesis import given, strategies as st, assume, settings
from hypothesis.strategies import composite

from vaani_sahayak.orchestrator import VaaniOrchestrator, lambda_handler
from vaani_sahayak.core.models import ChannelType, AudioFormat, ProcessingStatus
from vaani_sahayak.core.exceptions import AudioProcessingError, StorageError, ErrorCodes


class TestVaaniOrchestrator:
    """Test cases for VaaniOrchestrator class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        with patch('vaani_sahayak.orchestrator.get_aws_config'):
            self.orchestrator = VaaniOrchestrator()
        self.mock_context = Mock()
        self.mock_context.aws_request_id = "test-request-123"
        
        # Mock S3 client
        self.mock_s3_client = Mock()
        self.orchestrator.s3_client = self.mock_s3_client
    
    def test_detect_kinesis_input_source(self):
        """Test detection of Kinesis event source."""
        kinesis_event = {
            "Records": [{
                "eventSource": "aws:kinesis",
                "kinesis": {
                    "data": "base64_encoded_audio",
                    "partitionKey": "+919876543210"
                }
            }]
        }
        
        source = self.orchestrator._detect_input_source(kinesis_event)
        assert source == "kinesis"
    
    def test_detect_s3_input_source(self):
        """Test detection of S3 event source."""
        s3_event = {
            "Records": [{
                "eventSource": "aws:s3",
                "s3": {
                    "bucket": {"name": "vaani-user-inputs"},
                    "object": {"key": "audio_files/+919876543210/1234567890.opus"}
                }
            }]
        }
        
        source = self.orchestrator._detect_input_source(s3_event)
        assert source == "s3"
    
    def test_detect_direct_kinesis_format(self):
        """Test detection of direct Kinesis Video format."""
        kinesis_video_event = {
            "kinesisVideo": {
                "streamName": "vaani-audio-stream",
                "fragmentNumber": "12345"
            }
        }
        
        source = self.orchestrator._detect_input_source(kinesis_video_event)
        assert source == "kinesis"
    
    def test_detect_api_gateway_event(self):
        """Test detection of API Gateway event (web channel)."""
        api_gateway_event = {
            "httpMethod": "POST",
            "requestContext": {
                "requestId": "test-123"
            }
        }
        
        source = self.orchestrator._detect_input_source(api_gateway_event)
        assert source == "s3"
    
    def test_detect_unknown_event_source(self):
        """Test handling of unknown event source."""
        unknown_event = {
            "unknownField": "unknown_value"
        }
        
        with pytest.raises(AudioProcessingError) as exc_info:
            self.orchestrator._detect_input_source(unknown_event)
        
        assert exc_info.value.error.error_code == ErrorCodes.INVALID_AUDIO
    
    def test_extract_kinesis_audio_basic(self):
        """Test basic Kinesis audio extraction."""
        # Create valid base64 encoded audio data
        sample_audio = b"OggS" + b"sample_opus_data" * 100  # Make it large enough
        encoded_audio = base64.b64encode(sample_audio).decode('utf-8')
        
        kinesis_event = {
            "Records": [{
                "eventSource": "aws:kinesis",
                "kinesis": {
                    "data": encoded_audio,
                    "partitionKey": "+919876543210",
                    "sequenceNumber": "12345"
                }
            }]
        }
        
        audio_input = self.orchestrator._extract_kinesis_audio(kinesis_event)
        
        assert audio_input.source_channel == ChannelType.PSTN
        assert audio_input.phone_number == "+919876543210"
        assert audio_input.format == AudioFormat.OPUS
        assert audio_input.session_id.startswith("kinesis_")
        assert len(audio_input.audio_data) > 1024  # Should be larger than 1KB
    
    def test_extract_kinesis_audio_no_records(self):
        """Test Kinesis audio extraction with no records."""
        empty_event = {"Records": []}
        
        with pytest.raises(AudioProcessingError) as exc_info:
            self.orchestrator._extract_kinesis_audio(empty_event)
        
        assert exc_info.value.error.error_code == ErrorCodes.INVALID_AUDIO
    
    def test_extract_s3_audio_basic(self):
        """Test basic S3 audio extraction."""
        # Mock S3 response with proper structure
        sample_audio = b"ID3" + b"sample_mp3_data" * 200  # Make it large enough
        mock_body = Mock()
        mock_body.read.return_value = sample_audio
        self.mock_s3_client.get_object.return_value = {'Body': mock_body}
        
        s3_event = {
            "Records": [{
                "eventSource": "aws:s3",
                "s3": {
                    "bucket": {"name": "vaani-user-inputs"},
                    "object": {
                        "key": "audio_files/+919876543210/1234567890.opus",
                        "size": 12345
                    }
                }
            }]
        }
        
        audio_input = self.orchestrator._extract_s3_audio(s3_event)
        
        assert audio_input.source_channel == ChannelType.WEB
        assert audio_input.phone_number == "+919876543210"
        assert audio_input.format == AudioFormat.OPUS
        assert audio_input.session_id.startswith("s3_")
        assert len(audio_input.audio_data) > 1024  # Should be larger than 1KB
    
    def test_extract_s3_audio_different_formats(self):
        """Test S3 audio extraction with different file formats."""
        formats = ["mp3", "wav", "opus"]
        
        for fmt in formats:
            # Create format-specific audio data
            if fmt == "mp3":
                audio_data = b"ID3" + b"mp3_data" * 200
            elif fmt == "wav":
                audio_data = b"RIFF" + b"wav_data" * 200
            else:  # opus
                audio_data = b"OggS" + b"opus_data" * 200
            
            # Mock S3 response
            mock_body = Mock()
            mock_body.read.return_value = audio_data
            self.mock_s3_client.get_object.return_value = {'Body': mock_body}
            
            s3_event = {
                "Records": [{
                    "eventSource": "aws:s3",
                    "s3": {
                        "bucket": {"name": "vaani-user-inputs"},
                        "object": {
                            "key": f"audio_files/+919876543210/test.{fmt}",
                            "size": 12345
                        }
                    }
                }]
            }
            
            audio_input = self.orchestrator._extract_s3_audio(s3_event)
            assert audio_input.format == AudioFormat(fmt)
    
    def test_extract_s3_audio_no_records(self):
        """Test S3 audio extraction with no records."""
        empty_event = {"Records": []}
        
        with pytest.raises(AudioProcessingError) as exc_info:
            self.orchestrator._extract_s3_audio(empty_event)
        
        assert exc_info.value.error.error_code == ErrorCodes.INVALID_AUDIO
    
    def test_process_streaming_audio_placeholder(self):
        """Test streaming audio processing (placeholder implementation)."""
        # Create valid base64 encoded audio data
        sample_audio = b"OggS" + b"sample_opus_data" * 200
        encoded_audio = base64.b64encode(sample_audio).decode('utf-8')
        
        kinesis_event = {
            "Records": [{
                "eventSource": "aws:kinesis",
                "kinesis": {
                    "data": encoded_audio,
                    "partitionKey": "+919876543210"
                }
            }]
        }
        
        result = self.orchestrator._process_streaming_audio(kinesis_event, self.mock_context)
        
        assert result.status == ProcessingStatus.PENDING
        assert "[Placeholder]" in result.transcribed_text
        assert "[Placeholder]" in result.generated_response
        assert result.processing_time_ms >= 0
    
    def test_process_uploaded_audio_placeholder(self):
        """Test uploaded audio processing (placeholder implementation)."""
        # Mock S3 response
        sample_audio = b"OggS" + b"sample_opus_data" * 200
        mock_body = Mock()
        mock_body.read.return_value = sample_audio
        self.mock_s3_client.get_object.return_value = {'Body': mock_body}
        
        s3_event = {
            "Records": [{
                "eventSource": "aws:s3",
                "s3": {
                    "bucket": {"name": "vaani-user-inputs"},
                    "object": {"key": "audio_files/+919876543210/test.opus"}
                }
            }]
        }
        
        result = self.orchestrator._process_uploaded_audio(s3_event, self.mock_context)
        
        assert result.status == ProcessingStatus.PENDING
        assert "[Placeholder]" in result.transcribed_text
        assert "[Placeholder]" in result.generated_response
        assert result.processing_time_ms >= 0
    
    def test_lambda_handler_kinesis_success(self):
        """Test successful Lambda handler execution with Kinesis event."""
        # Create valid base64 encoded audio data
        sample_audio = b"OggS" + b"sample_opus_data" * 200
        encoded_audio = base64.b64encode(sample_audio).decode('utf-8')
        
        kinesis_event = {
            "Records": [{
                "eventSource": "aws:kinesis",
                "kinesis": {
                    "data": encoded_audio,
                    "partitionKey": "+919876543210"
                }
            }]
        }
        
        response = self.orchestrator.lambda_handler(kinesis_event, self.mock_context)
        
        assert response["statusCode"] == 200
        body = json.loads(response["body"])
        assert body["success"] is True
        assert "result" in body
    
    def test_lambda_handler_s3_success(self):
        """Test successful Lambda handler execution with S3 event."""
        # Mock S3 response
        sample_audio = b"OggS" + b"sample_opus_data" * 200
        mock_body = Mock()
        mock_body.read.return_value = sample_audio
        self.mock_s3_client.get_object.return_value = {'Body': mock_body}
        
        s3_event = {
            "Records": [{
                "eventSource": "aws:s3",
                "s3": {
                    "bucket": {"name": "vaani-user-inputs"},
                    "object": {"key": "audio_files/+919876543210/test.opus"}
                }
            }]
        }
        
        response = self.orchestrator.lambda_handler(s3_event, self.mock_context)
        
        assert response["statusCode"] == 200
        body = json.loads(response["body"])
        assert body["success"] is True
        assert "result" in body
    
    def test_lambda_handler_unknown_source_error(self):
        """Test Lambda handler with unknown event source."""
        unknown_event = {"unknown": "event"}
        
        response = self.orchestrator.lambda_handler(unknown_event, self.mock_context)
        
        assert response["statusCode"] == 500
        body = json.loads(response["body"])
        assert body["success"] is False
        assert "error" in body
    
    def test_lambda_handler_unexpected_error(self):
        """Test Lambda handler with unexpected error."""
        # Mock an unexpected error during processing
        with patch.object(self.orchestrator, '_detect_input_source', side_effect=ValueError("Unexpected error")):
            response = self.orchestrator.lambda_handler({}, self.mock_context)
            
            assert response["statusCode"] == 500
            body = json.loads(response["body"])
            assert body["success"] is False
            assert body["error"]["error_code"] == ErrorCodes.INTERNAL_ERROR


class TestLambdaHandlerFunction:
    """Test cases for the module-level lambda_handler function."""
    
    def test_lambda_handler_function_delegates_correctly(self):
        """Test that module-level lambda_handler delegates to orchestrator."""
        # Create valid base64 encoded audio data
        sample_audio = b"OggS" + b"sample_opus_data" * 200
        encoded_audio = base64.b64encode(sample_audio).decode('utf-8')
        
        kinesis_event = {
            "Records": [{
                "eventSource": "aws:kinesis",
                "kinesis": {
                    "data": encoded_audio,
                    "partitionKey": "+919876543210"
                }
            }]
        }
        
        mock_context = Mock()
        mock_context.aws_request_id = "test-request-456"
        
        with patch('vaani_sahayak.orchestrator.get_aws_config'):
            response = lambda_handler(kinesis_event, mock_context)
        
        assert response["statusCode"] == 200
        body = json.loads(response["body"])
        assert body["success"] is True


class TestEventSourceDetectionEdgeCases:
    """Test edge cases for event source detection."""
    
    def setup_method(self):
        """Set up test fixtures."""
        with patch('vaani_sahayak.orchestrator.get_aws_config'):
            self.orchestrator = VaaniOrchestrator()
    
    def test_empty_records_array(self):
        """Test handling of empty Records array."""
        empty_records_event = {"Records": []}
        
        with pytest.raises(AudioProcessingError):
            self.orchestrator._detect_input_source(empty_records_event)
    
    def test_malformed_kinesis_event(self):
        """Test handling of malformed Kinesis event."""
        malformed_event = {
            "Records": [{
                "eventSource": "aws:kinesis"
                # Missing kinesis data
            }]
        }
        
        source = self.orchestrator._detect_input_source(malformed_event)
        assert source == "kinesis"  # Should still detect as kinesis
    
    def test_malformed_s3_event(self):
        """Test handling of malformed S3 event."""
        malformed_event = {
            "Records": [{
                "eventSource": "aws:s3"
                # Missing s3 data
            }]
        }
        
        source = self.orchestrator._detect_input_source(malformed_event)
        assert source == "s3"  # Should still detect as s3
    
    def test_mixed_event_sources(self):
        """Test handling of mixed event sources (should use first record)."""
        mixed_event = {
            "Records": [
                {"eventSource": "aws:kinesis"},
                {"eventSource": "aws:s3"}
            ]
        }
        
        source = self.orchestrator._detect_input_source(mixed_event)
        assert source == "kinesis"  # Should use first record


class TestAudioDataExtraction:
    """Test cases for audio data extraction functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        with patch('vaani_sahayak.orchestrator.get_aws_config'):
            self.orchestrator = VaaniOrchestrator()
        
        # Mock S3 client
        self.mock_s3_client = Mock()
        self.orchestrator.s3_client = self.mock_s3_client
    
    def test_extract_kinesis_audio_single_chunk(self):
        """Test Kinesis audio extraction with single audio chunk."""
        # Create sample audio data
        sample_audio = b"OggS" + b"sample_opus_audio_data" * 100  # ~2KB
        encoded_audio = base64.b64encode(sample_audio).decode('utf-8')
        
        kinesis_event = {
            "Records": [{
                "eventSource": "aws:kinesis",
                "kinesis": {
                    "data": encoded_audio,
                    "partitionKey": "+919876543210",
                    "sequenceNumber": "12345"
                }
            }]
        }
        
        audio_input = self.orchestrator._extract_kinesis_audio(kinesis_event)
        
        assert audio_input.source_channel == ChannelType.PSTN
        assert audio_input.phone_number == "+919876543210"
        assert audio_input.format == AudioFormat.OPUS
        assert audio_input.audio_data == sample_audio
        assert audio_input.duration_seconds > 0
        assert "kinesis_+919876543210" in audio_input.session_id
    
    def test_extract_kinesis_audio_multiple_chunks(self):
        """Test Kinesis audio extraction with multiple audio chunks."""
        # Create multiple audio chunks
        chunk1 = b"OggS" + b"chunk1_data" * 50
        chunk2 = b"chunk2_data" * 50
        chunk3 = b"chunk3_data" * 50
        
        kinesis_event = {
            "Records": [
                {
                    "eventSource": "aws:kinesis",
                    "kinesis": {
                        "data": base64.b64encode(chunk1).decode('utf-8'),
                        "partitionKey": "+919876543210",
                        "sequenceNumber": "12345"
                    }
                },
                {
                    "eventSource": "aws:kinesis", 
                    "kinesis": {
                        "data": base64.b64encode(chunk2).decode('utf-8'),
                        "partitionKey": "+919876543210",
                        "sequenceNumber": "12346"
                    }
                },
                {
                    "eventSource": "aws:kinesis",
                    "kinesis": {
                        "data": base64.b64encode(chunk3).decode('utf-8'),
                        "partitionKey": "+919876543210", 
                        "sequenceNumber": "12347"
                    }
                }
            ]
        }
        
        audio_input = self.orchestrator._extract_kinesis_audio(kinesis_event)
        
        expected_combined = chunk1 + chunk2 + chunk3
        assert audio_input.audio_data == expected_combined
        assert len(audio_input.audio_data) == len(expected_combined)
    
    def test_extract_kinesis_audio_invalid_base64(self):
        """Test Kinesis audio extraction with invalid base64 data."""
        kinesis_event = {
            "Records": [
                {
                    "eventSource": "aws:kinesis",
                    "kinesis": {
                        "data": "invalid_base64_data!!!",
                        "partitionKey": "+919876543210",
                        "sequenceNumber": "12345"
                    }
                },
                {
                    "eventSource": "aws:kinesis",
                    "kinesis": {
                        "data": base64.b64encode(b"OggS" + b"valid_data" * 200).decode('utf-8'),  # Make it larger
                        "partitionKey": "+919876543210",
                        "sequenceNumber": "12346"
                    }
                }
            ]
        }
        
        # Should skip invalid chunk and process valid one
        audio_input = self.orchestrator._extract_kinesis_audio(kinesis_event)
        assert len(audio_input.audio_data) > 1024  # Should be larger than 1KB
        assert audio_input.phone_number == "+919876543210"
    
    def test_extract_kinesis_audio_no_valid_chunks(self):
        """Test Kinesis audio extraction with no valid audio chunks."""
        kinesis_event = {
            "Records": [{
                "eventSource": "aws:kinesis",
                "kinesis": {
                    "data": "",  # Empty data
                    "partitionKey": "+919876543210",
                    "sequenceNumber": "12345"
                }
            }]
        }
        
        with pytest.raises(AudioProcessingError) as exc_info:
            self.orchestrator._extract_kinesis_audio(kinesis_event)
        
        assert exc_info.value.error.error_code == ErrorCodes.INVALID_AUDIO
        assert "No valid audio data found" in exc_info.value.error.error_message
    
    def test_extract_s3_audio_success(self):
        """Test successful S3 audio extraction."""
        # Mock S3 response
        sample_audio = b"ID3" + b"sample_mp3_audio_data" * 200  # ~4KB MP3
        mock_response = {
            'Body': Mock()
        }
        mock_response['Body'].read.return_value = sample_audio
        self.mock_s3_client.get_object.return_value = mock_response
        
        s3_event = {
            "Records": [{
                "eventSource": "aws:s3",
                "s3": {
                    "bucket": {"name": "vaani-user-inputs"},
                    "object": {
                        "key": "audio_files/+919876543210/1234567890.mp3",
                        "size": len(sample_audio)
                    }
                }
            }]
        }
        
        audio_input = self.orchestrator._extract_s3_audio(s3_event)
        
        assert audio_input.source_channel == ChannelType.WEB
        assert audio_input.phone_number == "+919876543210"
        assert audio_input.format == AudioFormat.MP3
        assert audio_input.audio_data == sample_audio
        assert audio_input.duration_seconds > 0
        assert "s3_+919876543210" in audio_input.session_id
        
        # Verify S3 client was called correctly
        self.mock_s3_client.get_object.assert_called_once_with(
            Bucket="vaani-user-inputs",
            Key="audio_files/+919876543210/1234567890.mp3"
        )
    
    def test_extract_s3_audio_different_formats(self):
        """Test S3 audio extraction with different file formats."""
        formats_and_headers = [
            ("mp3", b"ID3" + b"mp3_data" * 200),  # Make larger than 1KB
            ("opus", b"OggS" + b"opus_data" * 200),
            ("wav", b"RIFF" + b"wav_data" * 200)
        ]
        
        for fmt, audio_data in formats_and_headers:
            # Mock S3 response
            mock_response = {'Body': Mock()}
            mock_response['Body'].read.return_value = audio_data
            self.mock_s3_client.get_object.return_value = mock_response
            
            s3_event = {
                "Records": [{
                    "eventSource": "aws:s3",
                    "s3": {
                        "bucket": {"name": "vaani-user-inputs"},
                        "object": {
                            "key": f"audio_files/+919876543210/test.{fmt}",
                            "size": len(audio_data)
                        }
                    }
                }]
            }
            
            audio_input = self.orchestrator._extract_s3_audio(s3_event)
            assert audio_input.format == AudioFormat(fmt)
            assert audio_input.audio_data == audio_data
    
    def test_extract_s3_audio_invalid_key_format(self):
        """Test S3 audio extraction with invalid object key format."""
        s3_event = {
            "Records": [{
                "eventSource": "aws:s3",
                "s3": {
                    "bucket": {"name": "vaani-user-inputs"},
                    "object": {
                        "key": "invalid_key_format.mp3",  # Missing phone number path
                        "size": 1000
                    }
                }
            }]
        }
        
        with pytest.raises(AudioProcessingError) as exc_info:
            self.orchestrator._extract_s3_audio(s3_event)
        
        assert exc_info.value.error.error_code == ErrorCodes.INVALID_AUDIO
        assert "Invalid S3 object key format" in exc_info.value.error.error_message
    
    def test_extract_s3_audio_missing_bucket_info(self):
        """Test S3 audio extraction with missing bucket information."""
        s3_event = {
            "Records": [{
                "eventSource": "aws:s3",
                "s3": {
                    "bucket": {},  # Missing name
                    "object": {
                        "key": "audio_files/+919876543210/test.mp3",
                        "size": 1000
                    }
                }
            }]
        }
        
        with pytest.raises(AudioProcessingError) as exc_info:
            self.orchestrator._extract_s3_audio(s3_event)
        
        assert exc_info.value.error.error_code == ErrorCodes.INVALID_AUDIO
        assert "Missing bucket name or object key" in exc_info.value.error.error_message
    
    def test_download_s3_audio_success(self):
        """Test successful S3 audio download."""
        sample_audio = b"sample_audio_data" * 100
        mock_response = {'Body': Mock()}
        mock_response['Body'].read.return_value = sample_audio
        self.mock_s3_client.get_object.return_value = mock_response
        
        result = self.orchestrator._download_s3_audio("test-bucket", "test-key")
        
        assert result == sample_audio
        self.mock_s3_client.get_object.assert_called_once_with(
            Bucket="test-bucket",
            Key="test-key"
        )
    
    def test_download_s3_audio_failure(self):
        """Test S3 audio download failure."""
        self.mock_s3_client.get_object.side_effect = Exception("S3 error")
        
        with pytest.raises(StorageError) as exc_info:
            self.orchestrator._download_s3_audio("test-bucket", "test-key")
        
        assert exc_info.value.error.error_code == ErrorCodes.S3_ERROR
    
    def test_validate_audio_data_success(self):
        """Test successful audio data validation."""
        # Valid MP3 data (starts with ID3)
        valid_mp3 = b"ID3" + b"valid_mp3_data" * 100
        
        # Should not raise exception
        self.orchestrator._validate_audio_data(valid_mp3, AudioFormat.MP3)
    
    def test_validate_audio_data_too_small(self):
        """Test audio data validation with too small file."""
        small_audio = b"small"  # Less than 1KB
        
        with pytest.raises(AudioProcessingError) as exc_info:
            self.orchestrator._validate_audio_data(small_audio, AudioFormat.MP3)
        
        assert exc_info.value.error.error_code == ErrorCodes.AUDIO_TOO_SHORT
    
    def test_validate_audio_data_too_large(self):
        """Test audio data validation with too large file."""
        large_audio = b"x" * (11 * 1024 * 1024)  # 11MB, over limit
        
        with pytest.raises(AudioProcessingError) as exc_info:
            self.orchestrator._validate_audio_data(large_audio, AudioFormat.MP3)
        
        assert exc_info.value.error.error_code == ErrorCodes.AUDIO_TOO_LONG
    
    def test_validate_audio_data_wrong_format_header(self):
        """Test audio data validation with wrong format header (should warn, not fail)."""
        # MP3 data with WAV header
        wrong_header_audio = b"RIFF" + b"not_really_wav_data" * 100
        
        # Should not raise exception, just log warning
        self.orchestrator._validate_audio_data(wrong_header_audio, AudioFormat.MP3)
    
    def test_estimate_audio_duration(self):
        """Test audio duration estimation for different formats."""
        test_cases = [
            (AudioFormat.MP3, 16000, 1.0),    # 16KB MP3 = ~1 second
            (AudioFormat.OPUS, 4000, 1.0),    # 4KB Opus = ~1 second  
            (AudioFormat.WAV, 32000, 1.0),    # 32KB WAV = ~1 second
        ]
        
        for audio_format, data_size, expected_duration in test_cases:
            audio_data = b"x" * data_size
            duration = self.orchestrator._estimate_audio_duration(audio_data, audio_format)
            assert abs(duration - expected_duration) < 0.1  # Allow small variance
    
    def test_estimate_audio_duration_bounds(self):
        """Test audio duration estimation respects bounds."""
        # Very small file should be at least 1 second
        tiny_audio = b"x" * 100
        duration = self.orchestrator._estimate_audio_duration(tiny_audio, AudioFormat.MP3)
        assert duration >= 1.0
        
        # Very large file should be capped at 5 minutes (300 seconds)
        huge_audio = b"x" * (10 * 1024 * 1024)  # 10MB
        duration = self.orchestrator._estimate_audio_duration(huge_audio, AudioFormat.MP3)
        assert duration <= 300.0

    # Additional tests for task 2.4 requirements
    
    def test_kinesis_event_parsing_with_sample_events(self):
        """Test Kinesis event parsing with various sample event structures."""
        # Test case 1: Standard Kinesis Data Streams event
        sample_audio = b"OggS" + b"kinesis_sample_data" * 100
        encoded_audio = base64.b64encode(sample_audio).decode('utf-8')
        
        kinesis_data_event = {
            "Records": [{
                "eventSource": "aws:kinesis",
                "eventSourceARN": "arn:aws:kinesis:us-east-1:123456789012:stream/vaani-audio-stream",
                "eventName": "aws:kinesis:record",
                "kinesis": {
                    "kinesisSchemaVersion": "1.0",
                    "partitionKey": "+919876543210",
                    "sequenceNumber": "49590338271490256608559692538361571095921575989136588802",
                    "data": encoded_audio,
                    "approximateArrivalTimestamp": 1428537600
                }
            }]
        }
        
        audio_input = self.orchestrator._extract_kinesis_audio(kinesis_data_event)
        assert audio_input.source_channel == ChannelType.PSTN
        assert audio_input.phone_number == "+919876543210"
        assert audio_input.format == AudioFormat.OPUS
        assert len(audio_input.audio_data) > 1024
        
        # Test case 2: Kinesis Video Streams event format
        kinesis_video_event = {
            "Records": [{
                "eventSource": "aws:kinesis",
                "eventName": "aws:kinesis:record",
                "kinesis": {
                    "data": encoded_audio,
                    "partitionKey": "+918765432109",
                    "sequenceNumber": "12345678901234567890"
                },
                "eventSourceARN": "arn:aws:kinesisvideo:us-east-1:123456789012:stream/vaani-video-stream"
            }]
        }
        
        audio_input = self.orchestrator._extract_kinesis_audio(kinesis_video_event)
        assert audio_input.phone_number == "+918765432109"
        assert audio_input.source_channel == ChannelType.PSTN
        
        # Test case 3: Multiple records with different partition keys (should use first)
        multi_partition_event = {
            "Records": [
                {
                    "eventSource": "aws:kinesis",
                    "kinesis": {
                        "data": base64.b64encode(b"OggS" + b"chunk1" * 100).decode('utf-8'),
                        "partitionKey": "+919111111111",
                        "sequenceNumber": "001"
                    }
                },
                {
                    "eventSource": "aws:kinesis",
                    "kinesis": {
                        "data": base64.b64encode(b"chunk2" * 100).decode('utf-8'),
                        "partitionKey": "+919222222222",  # Different partition key
                        "sequenceNumber": "002"
                    }
                }
            ]
        }
        
        audio_input = self.orchestrator._extract_kinesis_audio(multi_partition_event)
        assert audio_input.phone_number == "+919111111111"  # Should use first partition key
    
    def test_s3_file_download_with_various_audio_formats(self):
        """Test S3 file download with various audio formats and edge cases."""
        # Test case 1: MP3 format with ID3 header
        mp3_data = b"ID3\x03\x00\x00\x00" + b"mp3_audio_content" * 200
        mock_response = {'Body': Mock()}
        mock_response['Body'].read.return_value = mp3_data
        self.mock_s3_client.get_object.return_value = mock_response
        
        s3_event_mp3 = {
            "Records": [{
                "eventSource": "aws:s3",
                "eventName": "ObjectCreated:Put",
                "s3": {
                    "bucket": {"name": "vaani-user-inputs"},
                    "object": {
                        "key": "audio_files/+919876543210/1640995200.mp3",
                        "size": len(mp3_data)
                    }
                }
            }]
        }
        
        audio_input = self.orchestrator._extract_s3_audio(s3_event_mp3)
        assert audio_input.format == AudioFormat.MP3
        assert audio_input.audio_data == mp3_data
        assert audio_input.source_channel == ChannelType.WEB
        
        # Test case 2: WAV format with RIFF header
        wav_data = b"RIFF" + b"\x00\x00\x00\x00" + b"WAVE" + b"wav_content" * 200
        mock_response['Body'].read.return_value = wav_data
        self.mock_s3_client.get_object.return_value = mock_response
        
        s3_event_wav = {
            "Records": [{
                "eventSource": "aws:s3",
                "s3": {
                    "bucket": {"name": "vaani-user-inputs"},
                    "object": {
                        "key": "audio_files/+919876543210/1640995300.wav",
                        "size": len(wav_data)
                    }
                }
            }]
        }
        
        audio_input = self.orchestrator._extract_s3_audio(s3_event_wav)
        assert audio_input.format == AudioFormat.WAV
        assert audio_input.audio_data == wav_data
        
        # Test case 3: Opus format in Ogg container
        opus_data = b"OggS\x00\x02\x00\x00" + b"opus_content" * 200
        mock_response['Body'].read.return_value = opus_data
        self.mock_s3_client.get_object.return_value = mock_response
        
        s3_event_opus = {
            "Records": [{
                "eventSource": "aws:s3",
                "s3": {
                    "bucket": {"name": "vaani-user-inputs"},
                    "object": {
                        "key": "audio_files/+919876543210/1640995400.opus",
                        "size": len(opus_data)
                    }
                }
            }]
        }
        
        audio_input = self.orchestrator._extract_s3_audio(s3_event_opus)
        assert audio_input.format == AudioFormat.OPUS
        assert audio_input.audio_data == opus_data
        
        # Test case 4: Unknown format (should default to OPUS)
        unknown_data = b"UNKN" + b"unknown_format_content" * 200
        mock_response['Body'].read.return_value = unknown_data
        self.mock_s3_client.get_object.return_value = mock_response
        
        s3_event_unknown = {
            "Records": [{
                "eventSource": "aws:s3",
                "s3": {
                    "bucket": {"name": "vaani-user-inputs"},
                    "object": {
                        "key": "audio_files/+919876543210/1640995500.xyz",
                        "size": len(unknown_data)
                    }
                }
            }]
        }
        
        audio_input = self.orchestrator._extract_s3_audio(s3_event_unknown)
        assert audio_input.format == AudioFormat.OPUS  # Should default to OPUS
        
        # Test case 5: Large file download
        large_data = b"ID3" + b"large_file_content" * 5000  # ~80KB
        mock_response['Body'].read.return_value = large_data
        self.mock_s3_client.get_object.return_value = mock_response
        
        s3_event_large = {
            "Records": [{
                "eventSource": "aws:s3",
                "s3": {
                    "bucket": {"name": "vaani-user-inputs"},
                    "object": {
                        "key": "audio_files/+919876543210/1640995600.mp3",
                        "size": len(large_data)
                    }
                }
            }]
        }
        
        audio_input = self.orchestrator._extract_s3_audio(s3_event_large)
        assert len(audio_input.audio_data) == len(large_data)
        assert audio_input.duration_seconds > 1.0  # Should estimate reasonable duration
    
    def test_error_handling_for_malformed_events(self):
        """Test comprehensive error handling for various malformed event structures."""
        # Test case 1: Completely empty event
        with pytest.raises(AudioProcessingError) as exc_info:
            self.orchestrator._extract_kinesis_audio({})
        assert exc_info.value.error.error_code == ErrorCodes.INVALID_AUDIO
        
        # Test case 2: Event with Records but empty array
        with pytest.raises(AudioProcessingError) as exc_info:
            self.orchestrator._extract_kinesis_audio({"Records": []})
        assert exc_info.value.error.error_code == ErrorCodes.INVALID_AUDIO
        
        # Test case 3: Kinesis event missing kinesis data
        malformed_kinesis = {
            "Records": [{
                "eventSource": "aws:kinesis"
                # Missing kinesis field
            }]
        }
        with pytest.raises(AudioProcessingError):
            self.orchestrator._extract_kinesis_audio(malformed_kinesis)
        
        # Test case 4: Kinesis event with corrupted base64 data
        corrupted_kinesis = {
            "Records": [{
                "eventSource": "aws:kinesis",
                "kinesis": {
                    "data": "corrupted_base64_data_that_cannot_be_decoded!!!",
                    "partitionKey": "+919876543210",
                    "sequenceNumber": "12345"
                }
            }]
        }
        with pytest.raises(AudioProcessingError) as exc_info:
            self.orchestrator._extract_kinesis_audio(corrupted_kinesis)
        assert "No valid audio data found" in exc_info.value.error.error_message
        
        # Test case 5: S3 event missing bucket information
        malformed_s3_bucket = {
            "Records": [{
                "eventSource": "aws:s3",
                "s3": {
                    "bucket": {},  # Missing name
                    "object": {"key": "audio_files/+919876543210/test.mp3"}
                }
            }]
        }
        with pytest.raises(AudioProcessingError) as exc_info:
            self.orchestrator._extract_s3_audio(malformed_s3_bucket)
        assert "Missing bucket name or object key" in exc_info.value.error.error_message
        
        # Test case 6: S3 event missing object information
        malformed_s3_object = {
            "Records": [{
                "eventSource": "aws:s3",
                "s3": {
                    "bucket": {"name": "vaani-user-inputs"},
                    "object": {}  # Missing key
                }
            }]
        }
        with pytest.raises(AudioProcessingError) as exc_info:
            self.orchestrator._extract_s3_audio(malformed_s3_object)
        assert "Missing bucket name or object key" in exc_info.value.error.error_message
        
        # Test case 7: S3 event with invalid object key format
        invalid_key_s3 = {
            "Records": [{
                "eventSource": "aws:s3",
                "s3": {
                    "bucket": {"name": "vaani-user-inputs"},
                    "object": {"key": "invalid/key.mp3"}  # Missing phone number segment
                }
            }]
        }
        with pytest.raises(AudioProcessingError) as exc_info:
            self.orchestrator._extract_s3_audio(invalid_key_s3)
        assert "Invalid S3 object key format" in exc_info.value.error.error_message
        
        # Test case 8: S3 download failure
        self.mock_s3_client.get_object.side_effect = Exception("Network error")
        
        valid_s3_event = {
            "Records": [{
                "eventSource": "aws:s3",
                "s3": {
                    "bucket": {"name": "vaani-user-inputs"},
                    "object": {"key": "audio_files/+919876543210/test.mp3"}
                }
            }]
        }
        
        with pytest.raises(StorageError) as exc_info:
            self.orchestrator._extract_s3_audio(valid_s3_event)
        assert exc_info.value.error.error_code == ErrorCodes.S3_ERROR
        
        # Reset mock for other tests
        self.mock_s3_client.get_object.side_effect = None
        
        # Test case 9: Audio validation failure - file too small
        small_audio = b"tiny"  # Less than 1KB
        mock_response = {'Body': Mock()}
        mock_response['Body'].read.return_value = small_audio
        self.mock_s3_client.get_object.return_value = mock_response
        
        with pytest.raises(AudioProcessingError) as exc_info:
            self.orchestrator._extract_s3_audio(valid_s3_event)
        assert exc_info.value.error.error_code == ErrorCodes.AUDIO_TOO_SHORT
        
        # Test case 10: Audio validation failure - file too large
        huge_audio = b"x" * (11 * 1024 * 1024)  # 11MB, over limit
        mock_response['Body'].read.return_value = huge_audio
        self.mock_s3_client.get_object.return_value = mock_response
        
        with pytest.raises(AudioProcessingError) as exc_info:
            self.orchestrator._extract_s3_audio(valid_s3_event)
        assert exc_info.value.error.error_code == ErrorCodes.AUDIO_TOO_LONG
    
    def test_kinesis_audio_extraction_edge_cases(self):
        """Test edge cases in Kinesis audio extraction."""
        # Test case 1: Mixed valid and invalid chunks
        mixed_chunks_event = {
            "Records": [
                {
                    "eventSource": "aws:kinesis",
                    "kinesis": {
                        "data": "",  # Empty data
                        "partitionKey": "+919876543210",
                        "sequenceNumber": "001"
                    }
                },
                {
                    "eventSource": "aws:kinesis", 
                    "kinesis": {
                        "data": "invalid_base64!!!",  # Invalid base64
                        "partitionKey": "+919876543210",
                        "sequenceNumber": "002"
                    }
                },
                {
                    "eventSource": "aws:kinesis",
                    "kinesis": {
                        "data": base64.b64encode(b"OggS" + b"valid_chunk" * 200).decode('utf-8'),
                        "partitionKey": "+919876543210",
                        "sequenceNumber": "003"
                    }
                }
            ]
        }
        
        # Should successfully extract the valid chunk
        audio_input = self.orchestrator._extract_kinesis_audio(mixed_chunks_event)
        assert len(audio_input.audio_data) > 1024
        assert audio_input.phone_number == "+919876543210"
        
        # Test case 2: Records with missing kinesis data
        missing_data_event = {
            "Records": [
                {
                    "eventSource": "aws:kinesis",
                    "kinesis": {
                        "partitionKey": "+919876543210",
                        "sequenceNumber": "001"
                        # Missing data field
                    }
                },
                {
                    "eventSource": "aws:kinesis",
                    "kinesis": {
                        "data": base64.b64encode(b"OggS" + b"recovery_chunk" * 200).decode('utf-8'),
                        "partitionKey": "+919876543210",
                        "sequenceNumber": "002"
                    }
                }
            ]
        }
        
        # Should recover and process the valid record
        audio_input = self.orchestrator._extract_kinesis_audio(missing_data_event)
        assert len(audio_input.audio_data) > 1024
    
    def test_s3_audio_extraction_edge_cases(self):
        """Test edge cases in S3 audio extraction."""
        # Test case 1: Nested folder structure
        nested_path_event = {
            "Records": [{
                "eventSource": "aws:s3",
                "s3": {
                    "bucket": {"name": "vaani-user-inputs"},
                    "object": {
                        "key": "audio_files/+919876543210/subfolder/nested/audio.mp3",
                        "size": 5000
                    }
                }
            }]
        }
        
        sample_audio = b"ID3" + b"nested_audio_content" * 200
        mock_response = {'Body': Mock()}
        mock_response['Body'].read.return_value = sample_audio
        self.mock_s3_client.get_object.return_value = mock_response
        
        audio_input = self.orchestrator._extract_s3_audio(nested_path_event)
        assert audio_input.phone_number == "+919876543210"
        assert audio_input.format == AudioFormat.MP3
        
        # Test case 2: Special characters in phone number
        special_phone_event = {
            "Records": [{
                "eventSource": "aws:s3",
                "s3": {
                    "bucket": {"name": "vaani-user-inputs"},
                    "object": {
                        "key": "audio_files/+91-987-654-3210/audio.opus",
                        "size": 5000
                    }
                }
            }]
        }
        
        opus_audio = b"OggS" + b"special_phone_audio" * 200
        mock_response['Body'].read.return_value = opus_audio
        self.mock_s3_client.get_object.return_value = mock_response
        
        audio_input = self.orchestrator._extract_s3_audio(special_phone_event)
        assert audio_input.phone_number == "+91-987-654-3210"
        assert audio_input.format == AudioFormat.OPUS


# Property-based test strategies for generating test data
@composite
def kinesis_event_strategy(draw):
    """Generate valid Kinesis events for property testing."""
    # Generate phone number
    phone_number = draw(st.text(min_size=10, max_size=15, alphabet="0123456789+"))
    
    # Generate audio data (make it large enough to pass validation)
    audio_size = draw(st.integers(min_value=1024, max_value=10000))  # 1KB to 10KB
    audio_data = draw(st.binary(min_size=audio_size, max_size=audio_size))
    
    # Ensure it starts with Opus header for validation
    if not audio_data.startswith(b"OggS"):
        audio_data = b"OggS" + audio_data[4:]
    
    encoded_audio = base64.b64encode(audio_data).decode('utf-8')
    
    # Generate sequence number
    sequence_number = draw(st.text(min_size=1, max_size=20, alphabet="0123456789"))
    
    return {
        "Records": [{
            "eventSource": "aws:kinesis",
            "kinesis": {
                "data": encoded_audio,
                "partitionKey": phone_number,
                "sequenceNumber": sequence_number
            }
        }]
    }


@composite
def s3_event_strategy(draw):
    """Generate valid S3 events for property testing."""
    # Generate phone number
    phone_number = draw(st.text(min_size=10, max_size=15, alphabet="0123456789+"))
    
    # Generate timestamp
    timestamp = draw(st.integers(min_value=1000000000, max_value=9999999999))
    
    # Generate audio format
    audio_format = draw(st.sampled_from(["mp3", "opus", "wav"]))
    
    # Generate bucket name
    bucket_name = draw(st.text(min_size=5, max_size=50, alphabet="abcdefghijklmnopqrstuvwxyz0123456789-"))
    
    # Generate file size
    file_size = draw(st.integers(min_value=1024, max_value=1000000))
    
    return {
        "Records": [{
            "eventSource": "aws:s3",
            "s3": {
                "bucket": {"name": bucket_name},
                "object": {
                    "key": f"audio_files/{phone_number}/{timestamp}.{audio_format}",
                    "size": file_size
                }
            }
        }]
    }


@composite
def kinesis_video_event_strategy(draw):
    """Generate direct Kinesis Video events for property testing."""
    stream_name = draw(st.text(min_size=5, max_size=50, alphabet="abcdefghijklmnopqrstuvwxyz0123456789-"))
    fragment_number = draw(st.text(min_size=1, max_size=20, alphabet="0123456789"))
    
    return {
        "kinesisVideo": {
            "streamName": stream_name,
            "fragmentNumber": fragment_number
        }
    }


@composite
def api_gateway_event_strategy(draw):
    """Generate API Gateway events for property testing."""
    http_method = draw(st.sampled_from(["GET", "POST", "PUT", "DELETE"]))
    request_id = draw(st.text(min_size=10, max_size=50, alphabet="abcdefghijklmnopqrstuvwxyz0123456789-"))
    
    return {
        "httpMethod": http_method,
        "requestContext": {
            "requestId": request_id
        }
    }


@composite
def unknown_event_strategy(draw):
    """Generate unknown/invalid events for property testing."""
    # Generate random keys that don't match known patterns
    key1 = draw(st.text(min_size=5, max_size=20, alphabet="abcdefghijklmnopqrstuvwxyz"))
    key2 = draw(st.text(min_size=5, max_size=20, alphabet="abcdefghijklmnopqrstuvwxyz"))
    value1 = draw(st.text(min_size=1, max_size=50))
    value2 = draw(st.integers())
    
    # Ensure we don't accidentally create valid event patterns
    assume(key1 not in ["Records", "kinesis", "kinesisVideo", "httpMethod", "requestContext"])
    assume(key2 not in ["Records", "kinesis", "kinesisVideo", "httpMethod", "requestContext"])
    
    return {
        key1: value1,
        key2: value2
    }


class TestEventSourceDetectionProperties:
    """Property-based tests for event source detection functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        with patch('vaani_sahayak.orchestrator.get_aws_config'):
            self.orchestrator = VaaniOrchestrator()
    
    @given(kinesis_event_strategy())
    @settings(max_examples=50, deadline=5000)
    def test_property_kinesis_event_detection_consistency(self, kinesis_event):
        """
        Feature: vaani-sahayak, Property 8: Event-Driven Architecture Consistency
        
        **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
        
        For any valid Kinesis event, the orchestrator should consistently detect it as 
        "kinesis" source and maintain the same processing logic regardless of the 
        specific event content.
        """
        # Test that all valid Kinesis events are detected as "kinesis"
        detected_source = self.orchestrator._detect_input_source(kinesis_event)
        assert detected_source == "kinesis", f"Kinesis event not detected correctly: {kinesis_event}"
        
        # Test that the detection is consistent across multiple calls
        second_detection = self.orchestrator._detect_input_source(kinesis_event)
        assert detected_source == second_detection, "Inconsistent detection across calls"
    
    @given(s3_event_strategy())
    @settings(max_examples=50, deadline=5000)
    def test_property_s3_event_detection_consistency(self, s3_event):
        """
        Feature: vaani-sahayak, Property 8: Event-Driven Architecture Consistency
        
        **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
        
        For any valid S3 event, the orchestrator should consistently detect it as 
        "s3" source and maintain the same processing logic regardless of the 
        specific event content.
        """
        # Test that all valid S3 events are detected as "s3"
        detected_source = self.orchestrator._detect_input_source(s3_event)
        assert detected_source == "s3", f"S3 event not detected correctly: {s3_event}"
        
        # Test that the detection is consistent across multiple calls
        second_detection = self.orchestrator._detect_input_source(s3_event)
        assert detected_source == second_detection, "Inconsistent detection across calls"
    
    @given(kinesis_video_event_strategy())
    @settings(max_examples=30, deadline=5000)
    def test_property_kinesis_video_event_detection_consistency(self, kinesis_video_event):
        """
        Feature: vaani-sahayak, Property 8: Event-Driven Architecture Consistency
        
        **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
        
        For any direct Kinesis Video event, the orchestrator should consistently 
        detect it as "kinesis" source.
        """
        detected_source = self.orchestrator._detect_input_source(kinesis_video_event)
        assert detected_source == "kinesis", f"Kinesis Video event not detected correctly: {kinesis_video_event}"
    
    @given(api_gateway_event_strategy())
    @settings(max_examples=30, deadline=5000)
    def test_property_api_gateway_event_detection_consistency(self, api_gateway_event):
        """
        Feature: vaani-sahayak, Property 8: Event-Driven Architecture Consistency
        
        **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
        
        For any API Gateway event (web channel), the orchestrator should consistently 
        detect it as "s3" source (since web uploads go through S3).
        """
        detected_source = self.orchestrator._detect_input_source(api_gateway_event)
        assert detected_source == "s3", f"API Gateway event not detected correctly: {api_gateway_event}"
    
    @given(unknown_event_strategy())
    @settings(max_examples=30, deadline=5000)
    def test_property_unknown_event_handling_consistency(self, unknown_event):
        """
        Feature: vaani-sahayak, Property 8: Event-Driven Architecture Consistency
        
        **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
        
        For any unknown/invalid event, the orchestrator should consistently raise 
        AudioProcessingError with appropriate error code.
        """
        with pytest.raises(AudioProcessingError) as exc_info:
            self.orchestrator._detect_input_source(unknown_event)
        
        # Verify consistent error handling
        assert exc_info.value.error.error_code == ErrorCodes.INVALID_AUDIO
        assert "Unable to determine event source" in exc_info.value.error.error_message
    
    @given(st.one_of(kinesis_event_strategy(), s3_event_strategy()))
    @settings(max_examples=100, deadline=10000)
    def test_property_event_driven_architecture_consistency(self, event):
        """
        Feature: vaani-sahayak, Property 8: Event-Driven Architecture Consistency
        
        **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
        
        For any valid system event (Kinesis or S3), the orchestrator should:
        1. Properly detect the input source
        2. Maintain consistent processing logic regardless of input channel
        3. Route events to appropriate processing methods
        4. Preserve event-driven architecture principles
        """
        # Test 1: Proper input source detection
        detected_source = self.orchestrator._detect_input_source(event)
        assert detected_source in ["kinesis", "s3"], f"Invalid source detected: {detected_source}"
        
        # Test 2: Consistent detection across multiple calls
        second_detection = self.orchestrator._detect_input_source(event)
        assert detected_source == second_detection, "Inconsistent detection across calls"
        
        # Test 3: Verify source matches event type
        if "Records" in event and event["Records"]:
            first_record = event["Records"][0]
            if first_record.get("eventSource") == "aws:kinesis":
                assert detected_source == "kinesis", "Kinesis event not routed to kinesis processing"
            elif first_record.get("eventSource") == "aws:s3":
                assert detected_source == "s3", "S3 event not routed to s3 processing"
        elif "kinesisVideo" in event:
            assert detected_source == "kinesis", "Kinesis Video event not routed to kinesis processing"
        elif "httpMethod" in event or "requestContext" in event:
            assert detected_source == "s3", "API Gateway event not routed to s3 processing"
        
        # Test 4: Event-driven architecture consistency - the same backend logic
        # should be triggered regardless of input channel
        # This is verified by ensuring the detection logic is deterministic and consistent