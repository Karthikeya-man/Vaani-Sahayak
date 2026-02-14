# Requirements Document

## Introduction

Vaani-Sahayak is a Hybrid Omni-Channel Voice Assistant designed specifically for rural India, built on three core architecture pillars. The system serves farmers and villagers through both Nokia feature phones (via GSM/PSTN telephony using Amazon Connect) and smartphones (via Streamlit/Lite App), providing intelligent agricultural assistance through advanced RAG-based scheme intelligence and real-time ONDC market intelligence. The core philosophy is "Write Once, Serve Everyone" with a unified backend that seamlessly handles multiple input channels while delivering contextually aware responses.

## Core Architecture Pillars

### Pillar 1: Hybrid Interface
- **GSM/PSTN Telephony**: Amazon Connect integration for Nokia feature phones
- **Streamlit/Lite App**: Lightweight smartphone application for enhanced user experience
- **Universal Voice Entry**: Seamless speech-to-text processing regardless of device type

### Pillar 2: Scheme Intelligence (RAG)
- **Bedrock Knowledge Bases**: Advanced retrieval-augmented generation for government scheme information
- **S3 Document Repository**: Comprehensive storage of government PDF documents and eligibility criteria
- **Auto-enrollment Capability**: Intelligent slot-filling for scheme applications and form generation

### Pillar 3: ONDC Market Intelligence (Real-time APIs)
- **ONDC Buyer App (BAP)**: Integration as a certified ONDC Buyer Application Platform
- **Real-time Price Discovery**: Live Mandi prices and market intelligence through ONDC search protocols
- **Farmer-Buyer Matching**: Direct connection between farmers and wholesalers via ONDC select APIs

## Glossary

- **Vaani_Sahayak**: The complete voice assistant system with three-pillar architecture
- **PSTN_Channel**: Public Switched Telephone Network input channel for Nokia feature phone users
- **Streamlit_App**: Progressive Web App input channel for smartphone users
- **AWS_Amplify**: Frontend management layer coordinating web and mobile entry points
- **Language_Router**: Lambda function routing speech processing between Bhashini API and AWS services
- **Bhashini_API**: Government of India's multilingual AI platform supporting 22 Indian languages
- **Orchestrator**: Central AWS Lambda function coordinating all system components and action groups
- **Gram_Didi**: The empathetic rural village sister persona used by the AI assistant
- **Bedrock_Agent**: Amazon Bedrock Agent managing specialized action groups for schemes and ONDC
- **Bedrock_Guardrails**: Safety filters ensuring rural-appropriate and sensitive responses
- **ActionGroup_Schemes**: Bedrock action group handling government scheme queries via Knowledge Bases
- **ActionGroup_ONDC**: Bedrock action group managing ONDC market intelligence via API connectors
- **ActionGroup_Visual**: Bedrock action group handling crop disease detection and form OCR via Rekognition
- **Knowledge_Base**: Amazon Bedrock Knowledge Base with S3 + OpenSearch Serverless for scheme documents
- **ONDC_Gateway**: Network gateway interface for ONDC search/select protocol APIs
- **ElastiCache_Layer**: Redis-based caching layer for FAQs, market prices, and scheme details
- **IMD_Weather**: India Meteorological Department API for real-time weather data
- **SMS_Gateway**: Amazon SNS service for offline notifications to Nokia phone users
- **User_Profile**: Stored user information including name, crop type, location, and language preference
- **User_Session**: Active session tracking with conversation state and context
- **Government_Form**: Digitized government scheme application forms with OCR metadata
- **Feedback_Analytics**: User interaction metrics and satisfaction data for analytics
- **Conversation_History**: Record of previous interactions for context-aware responses
- **Audio_Chunk**: Streaming audio data from phone calls via Amazon Connect
- **Audio_File**: Compressed audio upload from Streamlit app users

## Requirements

### Requirement 1: Universal Voice Entry

**User Story:** As a rural user, I want to interact with the voice assistant through either my Nokia feature phone or smartphone with seamless speech-to-text processing, so that I can access assistance regardless of my device type.

#### Acceptance Criteria

1. WHEN a user dials the toll-free number from a Nokia phone, THE Vaani_Sahayak SHALL accept the call through Amazon Connect and stream audio to the backend
2. WHEN a user records audio in the Streamlit app, THE Vaani_Sahayak SHALL accept compressed audio uploads and process them through the same backend
3. WHEN audio is received from either channel, THE Orchestrator SHALL detect the input source and route it appropriately to the Bedrock Agent
4. WHEN processing audio from PSTN_Channel, THE Vaani_Sahayak SHALL handle real-time streaming audio chunks with minimal latency
5. WHEN processing audio from Streamlit_App, THE Vaani_Sahayak SHALL handle uploaded audio files from S3 with optimized compression

### Requirement 2: Multilingual Speech Recognition and Processing

**User Story:** As a rural user speaking in any of 22 Indian languages, I want my voice to be accurately transcribed with intelligent language routing, so that the system can understand my queries in my preferred language.

#### Acceptance Criteria

1. WHEN audio input is received, THE Language_Router SHALL detect the language and route to Bhashini API as the primary ASR service
2. WHEN Bhashini API is unavailable or fails, THE Language_Router SHALL automatically fallback to Amazon Transcribe with appropriate language code
3. WHEN transcription is complete, THE Vaani_Sahayak SHALL pass the text to the intelligence layer for processing
4. WHEN transcription fails or produces empty results, THE Vaani_Sahayak SHALL handle the error gracefully and request the user to repeat
5. WHEN audio quality is poor, THE Vaani_Sahayak SHALL attempt transcription and provide feedback if unsuccessful
6. THE Language_Router SHALL support all 22 scheduled Indian languages through Bhashini API integration
7. THE Transcription_Service SHALL preserve the original meaning and context of regional speech patterns and dialects

### Requirement 3: Scheme Intelligence with RAG

**User Story:** As a farmer seeking government assistance, I want accurate information about scheme eligibility and automatic enrollment support, so that I can access benefits without complex paperwork.

#### Acceptance Criteria

1. WHEN a user asks about government schemes, THE ActionGroup_Schemes SHALL query the Bedrock Knowledge Base for relevant scheme information
2. WHEN scheme information is retrieved, THE Vaani_Sahayak SHALL provide accurate eligibility criteria and application procedures from government PDF documents
3. WHEN a user expresses interest in applying, THE ActionGroup_Schemes SHALL initiate intelligent slot-filling to collect required information
4. WHEN sufficient information is collected, THE Vaani_Sahayak SHALL generate pre-filled application forms and store them in S3
5. WHEN scheme documents are updated in S3, THE Knowledge_Base SHALL automatically re-index the content for accurate retrieval

### Requirement 4: ONDC Market Intelligence

**User Story:** As a farmer wanting to sell my crops, I want real-time market prices and direct buyer connections, so that I can get the best prices for my produce.

#### Acceptance Criteria

1. WHEN a user asks about crop prices, THE ActionGroup_ONDC SHALL query ONDC Network Gateways for real-time Mandi prices
2. WHEN market data is retrieved, THE Vaani_Sahayak SHALL provide current prices, trends, and nearby market information
3. WHEN a user wants to sell crops, THE ActionGroup_ONDC SHALL search for potential buyers using ONDC search protocols
4. WHEN buyers are found, THE Vaani_Sahayak SHALL facilitate connections using ONDC select APIs for direct farmer-buyer matching
5. WHEN ONDC services are unavailable, THE Vaani_Sahayak SHALL provide cached market data and alternative suggestions

### Requirement 5: Intent Classification and Routing

**User Story:** As a user with different types of queries, I want the system to understand my intent and route me to the appropriate service, so that I get relevant and accurate responses.

#### Acceptance Criteria

1. WHEN transcribed text is received, THE Bedrock_Agent SHALL classify the intent as either 'Market/Price' or 'Scheme/Form' related
2. WHEN intent is classified as 'Market/Price', THE Bedrock_Agent SHALL trigger ActionGroup_ONDC for market intelligence processing
3. WHEN intent is classified as 'Scheme/Form', THE Bedrock_Agent SHALL trigger ActionGroup_Schemes for knowledge base retrieval
4. WHEN intent is ambiguous, THE Vaani_Sahayak SHALL ask clarifying questions to determine the appropriate action group
5. WHEN processing is complete, THE Vaani_Sahayak SHALL generate contextually appropriate responses using the Gram_Didi persona

### Requirement 6: User Context Management

**User Story:** As a returning user, I want the system to remember my information and previous conversations across both scheme and market queries, so that I don't have to repeat basic details every time.

#### Acceptance Criteria

1. WHEN a user calls or uses the app, THE Vaani_Sahayak SHALL identify them by phone number and load their complete profile
2. WHEN a new user interacts with the system, THE Vaani_Sahayak SHALL create a User_Profile with phone number, location, and crop preferences
3. WHEN user information is provided during scheme enrollment, THE Vaani_Sahayak SHALL store personal details for future auto-filling
4. WHEN generating responses from either action group, THE Vaani_Sahayak SHALL retrieve and use stored User_Profile and Conversation_History
5. WHEN a conversation ends, THE Vaani_Sahayak SHALL update the Conversation_History with interaction type (scheme/market) for future context

### Requirement 7: Multilingual Response Delivery with Intelligent Routing

**User Story:** As a user on either Nokia phone or smartphone, I want to receive audio responses in my preferred language with optimized delivery, so that I have a seamless experience regardless of my technology access.

#### Acceptance Criteria

1. WHEN responding to PSTN_Channel users, THE Vaani_Sahayak SHALL stream audio directly back into the active Amazon Connect call
2. WHEN responding to Streamlit_App users, THE Vaani_Sahayak SHALL store the audio file in S3 and provide a presigned URL for playback
3. WHEN generating audio responses, THE Language_Router SHALL prioritize Bhashini API for TTS in 22 Indian languages
4. WHEN Bhashini TTS is unavailable, THE Language_Router SHALL fallback to Amazon Polly with neural voices
5. WHEN delivering responses, THE Vaani_Sahayak SHALL ensure audio quality is optimized for Nokia phones and smartphone speakers
6. WHEN a response is ready, THE Vaani_Sahayak SHALL deliver it within acceptable latency limits for real-time conversation flow
7. WHEN response delivery fails, THE Vaani_Sahayak SHALL retry delivery through alternative methods or provide appropriate error handling
8. THE Language_Router SHALL maintain consistent voice characteristics across sessions for the same user's preferred language

### Requirement 8: Streamlit Application Interface

**User Story:** As a smartphone user with limited data, I want a lightweight Streamlit app that works efficiently on slow connections, so that I can use the voice assistant without consuming excessive data.

#### Acceptance Criteria

1. THE Streamlit_App SHALL function as a Progressive Web App (PWA) with offline capability for basic functions
2. WHEN recording audio, THE Streamlit_App SHALL compress audio to Opus or MP3 format before upload to minimize data usage
3. WHEN uploading audio, THE Streamlit_App SHALL use S3 signed URLs for secure and direct upload without server intermediation
4. WHEN receiving responses, THE Streamlit_App SHALL play back audio files efficiently with minimal buffering and data consumption
5. THE Streamlit_App SHALL work reliably on low-bandwidth connections typical in rural areas with progressive loading

### Requirement 9: Data Privacy and Security

**User Story:** As a user concerned about privacy, I want my personal conversations, scheme applications, and market queries to be handled securely and not stored longer than necessary.

#### Acceptance Criteria

1. WHEN audio files are uploaded to S3, THE Vaani_Sahayak SHALL implement lifecycle policies to delete them after 24 hours
2. WHEN accessing AWS services and ONDC APIs, THE Vaani_Sahayak SHALL use appropriate IAM roles with minimal required permissions
3. WHEN storing user data and scheme information in DynamoDB, THE Vaani_Sahayak SHALL encrypt sensitive information at rest
4. WHEN transmitting data between services and ONDC gateways, THE Vaani_Sahayak SHALL use encrypted connections (HTTPS/TLS)
5. WHEN handling phone numbers and personal details, THE Vaani_Sahayak SHALL treat them as PII with appropriate protection and compliance

### Requirement 10: System Integration and Orchestration

**User Story:** As a system administrator, I want all components including Bedrock Agent, Knowledge Bases, and ONDC connectors to work together seamlessly, so that users have a consistent experience regardless of their query type.

#### Acceptance Criteria

1. WHEN an S3 upload event occurs, THE API_Gateway SHALL trigger the Orchestrator Lambda function with proper event routing
2. WHEN Kinesis receives audio streams from Amazon Connect, THE Vaani_Sahayak SHALL route them to the Orchestrator for processing
3. WHEN the Orchestrator receives input, THE Bedrock_Agent SHALL coordinate ActionGroup_Schemes and ActionGroup_ONDC based on intent classification
4. WHEN any service fails, THE Orchestrator SHALL implement appropriate error handling and recovery mechanisms with fallback options
5. THE Orchestrator SHALL maintain consistent processing logic and persona regardless of input channel or action group selection

### Requirement 11: Error Handling and Resilience

**User Story:** As a user in an area with unreliable connectivity, I want the system to handle interruptions gracefully and provide clear feedback when issues occur with either scheme or market services.

#### Acceptance Criteria

1. WHEN network connectivity is lost during a call, THE Vaani_Sahayak SHALL attempt to maintain the session and resume when possible
2. WHEN any AWS service or ONDC gateway is temporarily unavailable, THE Vaani_Sahayak SHALL provide appropriate error messages and fallback options
3. WHEN audio processing fails, THE Vaani_Sahayak SHALL request the user to repeat their input with helpful guidance
4. WHEN the system encounters unexpected errors in either action group, THE Vaani_Sahayak SHALL log error details while providing user-friendly feedback
5. THE Vaani_Sahayak SHALL implement retry mechanisms for transient failures in AWS services and ONDC API calls with exponential backoff

### Requirement 12: Performance Optimization with Caching

**User Story:** As a frequent user asking common questions about schemes and market prices, I want fast responses without delays, so that I can get information quickly even during peak usage times.

#### Acceptance Criteria

1. WHEN a user asks frequently asked questions, THE ElastiCache_Layer SHALL serve cached responses without querying backend services
2. WHEN market price data is requested, THE Vaani_Sahayak SHALL cache ONDC responses in Redis with a 6-hour TTL
3. WHEN scheme information is retrieved, THE Vaani_Sahayak SHALL cache Knowledge Base results with a 24-hour TTL
4. WHEN FAQ responses are generated, THE Vaani_Sahayak SHALL cache them with a 24-hour TTL
5. WHEN cached data expires, THE Vaani_Sahayak SHALL refresh the cache asynchronously during the next query
6. THE ElastiCache_Layer SHALL implement cache invalidation strategies for time-sensitive data updates
7. THE Vaani_Sahayak SHALL monitor cache hit rates and optimize caching strategies based on usage patterns

### Requirement 13: Visual Intelligence for Agriculture

**User Story:** As a farmer with crop disease concerns or physical government forms, I want to upload images for analysis and digitization, so that I can get expert diagnosis and avoid manual form filling.

#### Acceptance Criteria

1. WHEN a user uploads a crop image via Streamlit_App, THE ActionGroup_Visual SHALL analyze it using Amazon Rekognition for disease detection
2. WHEN crop disease is detected, THE Vaani_Sahayak SHALL provide disease identification, severity assessment, and treatment recommendations
3. WHEN a user uploads a government form image, THE ActionGroup_Visual SHALL perform OCR using Amazon Rekognition to extract form fields
4. WHEN form data is extracted, THE Vaani_Sahayak SHALL pre-fill the digital form and store it in the government_forms table
5. WHEN visual analysis fails, THE Vaani_Sahayak SHALL provide clear error messages and request image re-upload with quality guidelines
6. THE ActionGroup_Visual SHALL support common image formats (JPEG, PNG) and handle images up to 5MB in size
7. THE Vaani_Sahayak SHALL store analyzed images in S3 with appropriate metadata and lifecycle policies

### Requirement 14: Content Safety and Rural Sensitivity

**User Story:** As a rural user with cultural sensitivities, I want the AI assistant to provide appropriate, safe, and culturally sensitive responses, so that I feel respected and comfortable using the service.

#### Acceptance Criteria

1. WHEN the Bedrock_Agent generates responses, THE Bedrock_Guardrails SHALL filter content for appropriateness and rural sensitivity
2. WHEN potentially harmful or inappropriate content is detected, THE Bedrock_Guardrails SHALL block the response and generate a safe alternative
3. WHEN discussing sensitive topics like finances or personal information, THE Bedrock_Guardrails SHALL ensure privacy-conscious language
4. WHEN providing agricultural advice, THE Bedrock_Guardrails SHALL ensure recommendations are scientifically sound and region-appropriate
5. THE Bedrock_Guardrails SHALL maintain a blocklist of inappropriate terms and topics for rural contexts
6. THE Bedrock_Guardrails SHALL log all filtered responses for continuous improvement and policy refinement
7. THE Vaani_Sahayak SHALL maintain the Gram_Didi persona's empathetic and respectful tone across all interactions

### Requirement 15: Real-time Weather Integration

**User Story:** As a farmer planning agricultural activities, I want real-time weather information for my location, so that I can make informed decisions about planting, harvesting, and crop protection.

#### Acceptance Criteria

1. WHEN a user asks about weather, THE Vaani_Sahayak SHALL query the IMD Weather API for real-time data based on user location
2. WHEN weather data is retrieved, THE Vaani_Sahayak SHALL provide current conditions, forecasts, and agricultural advisories
3. WHEN severe weather alerts exist, THE Vaani_Sahayak SHALL proactively inform users and suggest protective measures
4. WHEN IMD API is unavailable, THE Vaani_Sahayak SHALL provide cached weather data with appropriate staleness warnings
5. THE Vaani_Sahayak SHALL cache weather data in ElastiCache with a 1-hour TTL for frequently requested locations
6. THE Vaani_Sahayak SHALL correlate weather data with crop types to provide personalized agricultural recommendations

### Requirement 16: Offline Notification System

**User Story:** As a Nokia phone user without constant internet access, I want to receive important updates via SMS, so that I stay informed about scheme deadlines, market opportunities, and weather alerts.

#### Acceptance Criteria

1. WHEN important scheme deadlines approach, THE SMS_Gateway SHALL send reminder notifications to registered Nokia phone users
2. WHEN favorable market prices are detected for user's crops, THE SMS_Gateway SHALL send price alert notifications
3. WHEN severe weather warnings are issued, THE SMS_Gateway SHALL send emergency alerts to affected users
4. WHEN a scheme application status changes, THE SMS_Gateway SHALL notify the user via SMS
5. THE SMS_Gateway SHALL use Amazon SNS to deliver messages with delivery confirmation tracking
6. THE Vaani_Sahayak SHALL respect user notification preferences and allow opt-in/opt-out for different alert types
7. THE SMS_Gateway SHALL format messages in the user's preferred language using concise, actionable text

### Requirement 17: Frontend Management with AWS Amplify

**User Story:** As a user accessing the system through web or mobile, I want a unified, responsive interface with seamless authentication and data synchronization, so that I have a consistent experience across devices.

#### Acceptance Criteria

1. WHEN a user accesses the Streamlit_App, THE AWS_Amplify SHALL manage frontend hosting, authentication, and API routing
2. WHEN a user authenticates, THE AWS_Amplify SHALL handle phone number-based authentication with OTP verification
3. WHEN user data changes, THE AWS_Amplify SHALL synchronize state across web and mobile interfaces in real-time
4. WHEN offline, THE AWS_Amplify SHALL enable offline data access and queue actions for sync when connectivity returns
5. THE AWS_Amplify SHALL manage environment-specific configurations for development, staging, and production
6. THE AWS_Amplify SHALL provide analytics integration for tracking user engagement and feature usage
7. THE AWS_Amplify SHALL implement progressive web app features for installability and offline capability

### Requirement 18: Comprehensive Observability and Analytics

**User Story:** As a system administrator and product manager, I want detailed insights into system performance, user behavior, and service quality, so that I can optimize the platform and improve user satisfaction.

#### Acceptance Criteria

1. WHEN any system component processes a request, THE Amazon_CloudWatch SHALL log structured events with correlation IDs
2. WHEN errors occur, THE Amazon_CloudWatch SHALL capture error details, stack traces, and contextual information
3. WHEN requests flow through the system, THE AWS_X-Ray SHALL trace end-to-end execution paths and identify bottlenecks
4. WHEN users provide feedback, THE Vaani_Sahayak SHALL store ratings and comments in the feedback_analytics table
5. WHEN analyzing user behavior, THE Amazon_QuickSight SHALL provide dashboards for user engagement, satisfaction, and feature adoption
6. THE Amazon_CloudWatch SHALL monitor key metrics including response latency, error rates, cache hit ratios, and API success rates
7. THE Amazon_QuickSight SHALL generate reports on language usage, regional adoption, scheme application success rates, and market transaction volumes
8. THE Vaani_Sahayak SHALL implement custom CloudWatch metrics for business KPIs specific to rural agricultural assistance

### Requirement 19: Enhanced Database Schema for Enterprise Operations

**User Story:** As the system handling complex user interactions and analytics, I need a comprehensive database schema that supports sessions, forms, profiles, and feedback, so that I can provide personalized, stateful experiences and data-driven improvements.

#### Acceptance Criteria

1. WHEN a user initiates a conversation, THE Vaani_Sahayak SHALL create a record in the user_sessions table with session state and context
2. WHEN government forms are processed, THE Vaani_Sahayak SHALL store form data, OCR metadata, and submission status in the government_forms table
3. WHEN user information is collected, THE Vaani_Sahayak SHALL maintain comprehensive profiles in the user_profiles table with preferences and history
4. WHEN users provide feedback, THE Vaani_Sahayak SHALL record ratings, comments, and interaction metadata in the feedback_analytics table
5. THE user_sessions table SHALL support session resumption across disconnections and channel switches
6. THE government_forms table SHALL track form lifecycle from creation through submission and approval
7. THE user_profiles table SHALL enable personalization based on crop types, location, language, and interaction patterns
8. THE feedback_analytics table SHALL enable sentiment analysis and trend identification for continuous improvement